from fastapi import APIRouter
from pydantic import BaseModel
from bll.usuarios_bll import UsuariosBLL

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])

class UsuarioIn(BaseModel):
    correo: str
    clave_hash: str
    nombre_completo: str = None
    rol_id: int
    participacion: str
    tasaHora: str

@router.get("/", response_model=list[dict])
async def listar_usuarios():
    return UsuariosBLL.listar_usuarios()

@router.get("/{usuario_id}", response_model=dict)
async def obtener_usuario(usuario_id: int):
    return UsuariosBLL.obtener_usuario(usuario_id)

@router.post("/", response_model=dict)
async def crear_usuario(payload: UsuarioIn):
    return UsuariosBLL.crear_usuario(payload)

@router.put("/{usuario_id}", response_model=dict)
async def actualizar_usuario(usuario_id: int, payload: UsuarioIn):
    return UsuariosBLL.actualizar_usuario(usuario_id, payload)

@router.delete("/{usuario_id}", response_model=dict)
async def eliminar_usuario(usuario_id: int):
    return UsuariosBLL.eliminar_usuario(usuario_id)