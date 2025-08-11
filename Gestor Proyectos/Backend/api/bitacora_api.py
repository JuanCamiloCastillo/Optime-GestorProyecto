from fastapi import APIRouter
from pydantic import BaseModel
from bll.bitacora_bll import BitacoraTareaBLL

router = APIRouter(prefix="/bitacora", tags=["BitacoraTarea"])

class BitacoraIn(BaseModel):
    tarea_id: int
    estado_anterior: str = None
    estado_nuevo: str

@router.get("/", response_model=list[dict])
async def listar_bitacora():
    return BitacoraTareaBLL.listar_registros()

@router.get("/{registro_id}", response_model=dict)
async def obtener_bitacora(registro_id: int):
    return BitacoraTareaBLL.obtener_registro(registro_id)

@router.post("/", response_model=dict)
async def crear_bitacora(payload: BitacoraIn):
    return BitacoraTareaBLL.crear_registro(payload)

@router.put("/{registro_id}", response_model=dict)
async def actualizar_bitacora(registro_id: int, payload: BitacoraIn):
    return BitacoraTareaBLL.actualizar_registro(registro_id, payload)

@router.delete("/{registro_id}", response_model=dict)
async def eliminar_bitacora(registro_id: int):
    return BitacoraTareaBLL.eliminar_registro(registro_id)
