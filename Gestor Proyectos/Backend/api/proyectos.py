# backend/api/proyectos.py
import os
from uuid import uuid4
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from config import get_connection
from bll.proyectos_bll import ProyectosBLL

router = APIRouter(prefix="/proyectos", tags=["Proyectos"])

# Donde guardas las imágenes (ajusta la ruta según tu estructura)
IMAGES_DIR = os.path.join(os.getcwd(), "..", "frontend", "public", "assets", "imagenes")
os.makedirs(IMAGES_DIR, exist_ok=True)

class ProyectoIn(BaseModel):
    nombre_proyecto: str
    fecha_inicio: str
    fecha_fin: str | None = None
    usuario_propietario_id: int
    descripcion: str
    area_id: int
    imagen: str | None = None

@router.get("/", response_model=list[dict])
async def listar_proyectos():
    return ProyectosBLL.listar_proyectos()

@router.get("/{proyecto_id}", response_model=dict)
async def obtener_proyecto(proyecto_id: int):
    return ProyectosBLL.obtener_proyecto(proyecto_id)

@router.post("/", response_model=dict)
async def crear_proyecto(payload: ProyectoIn):
    return ProyectosBLL.crear_proyecto(payload)

@router.put("/{proyecto_id}", response_model=dict)
async def actualizar_proyecto(proyecto_id: int, payload: ProyectoIn):
    return ProyectosBLL.actualizar_proyecto(proyecto_id, payload)

@router.delete("/{proyecto_id}", response_model=dict)
async def eliminar_proyecto(proyecto_id: int):
    return ProyectosBLL.eliminar_proyecto(proyecto_id)


@router.get("/ver-proyectos/{usuario_id}", response_model=list[int])
async def ver_proyectos_usuario(usuario_id: int):
    return ProyectosBLL.proyectos_por_usuario(usuario_id)


# ----------------------------
# ENDPOINT PARA SUBIR IMAGEN
# ----------------------------
@router.post("/upload", response_model=dict)
async def upload_imagen(
    proyecto_id: int = Form(...),
    file: UploadFile = File(...)
):
    # Validar extensión
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in {".jpg", ".jpeg", ".png", ".gif"}:
        raise HTTPException(400, detail="Formato de imagen no soportado")

    # Generar nombre único
    new_name = f"{uuid4().hex}{ext}"
    save_path = os.path.join(IMAGES_DIR, new_name)

    # Guardar archivo en disco
    with open(save_path, "wb") as buffer:
        buffer.write(await file.read())

    # Ruta relativa que guardarás en la BD
    ruta_relativa = f"/assets/imagenes/{new_name}"

    # Guardar en la tabla Proyecto
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE Proyecto SET imagen = ? WHERE ProyectoID = ?",
        (ruta_relativa, proyecto_id)
    )
    conn.commit()
    cur.close()
    conn.close()

    # Retornar la nueva ruta para que el frontend la use inmediatamente
    return {"imagen": ruta_relativa}
