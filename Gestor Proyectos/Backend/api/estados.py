from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from bll.estados_bll import EstadosBLL

router = APIRouter(prefix="/estados-tarea", tags=["EstadosTarea"])

class EstadoIn(BaseModel):
    nombreBD: str
    estadoFront: str
    etiqueta: Optional[str] = None
    colorHex: Optional[str] = None

@router.get("/", response_model=List[dict])
async def listar_estados():
    return EstadosBLL.listar_estados()

@router.get("/{idEstado}", response_model=dict)
async def obtener_estado(idEstado: int):
    return EstadosBLL.obtener_estado(idEstado)

@router.post("/", response_model=dict)
async def crear_estado(payload: EstadoIn):
    return EstadosBLL.crear_estado(payload)

@router.put("/{idEstado}", response_model=dict)
async def actualizar_estado(idEstado: int, payload: EstadoIn):
    return EstadosBLL.actualizar_estado(idEstado, payload)

@router.delete("/{idEstado}", response_model=dict)
async def eliminar_estado(idEstado: int):
    return EstadosBLL.eliminar_estado(idEstado)
