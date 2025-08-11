# src/api/areas_api.py
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
from bll.areas_bll import AreasBLL

router = APIRouter(prefix="/areas", tags=["Áreas"])

class AreaIn(BaseModel):
    nombreArea: str
    activo: int

class AreaOut(BaseModel):
    idArea: int
    nombreArea: str
    activo: int
    fechaIntegracion: str  # siempre vendrá string (o '')

@router.get("/", response_model=List[AreaOut])
async def listar_areas():
    return AreasBLL.listar_areas()

@router.get("/{idArea}", response_model=AreaOut)
async def obtener_area(idArea: int):
    return AreasBLL.obtener_area(idArea)

@router.post("/", response_model=AreaOut)
async def crear_area(payload: AreaIn):
    return AreasBLL.crear_area(payload)

@router.put("/{idArea}", response_model=AreaOut)
async def actualizar_area(idArea: int, payload: AreaIn):
    return AreasBLL.actualizar_area(idArea, payload)

@router.delete("/{idArea}", response_model=dict)
async def eliminar_area(idArea: int):
    return AreasBLL.eliminar_area(idArea)
