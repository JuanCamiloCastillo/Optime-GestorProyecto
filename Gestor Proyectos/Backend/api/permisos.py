# src/api/jerarquia_acceso_api.py
from fastapi import APIRouter, Query
from typing import Optional, List
from pydantic import BaseModel
from bll.permisos_bll import permisos_bll

router = APIRouter(prefix="/acceso", tags=["Acceso por Jerarquía"])

class ProyectoOut(BaseModel):
    ProyectoID: int
    NombreProyecto: str
    FechaInicio: Optional[str] = None
    FechaFin: Optional[str] = None
    UsuarioPropietarioID: int
    descripcion: Optional[str] = None
    area: Optional[int] = None
    imagen: Optional[str] = None

@router.get("/proyectos-por-jerarquia", response_model=List[ProyectoOut], tags=["Proyectos por Jerarquía"])
async def proyectos_por_jerarquia(
    rol_id: Optional[int] = Query(None),
    area_id: Optional[int] = Query(None),
    usuario_id: Optional[int] = Query(None)
):
    return permisos_bll.proyectos_por_jerarquia(rol_id, area_id, usuario_id)
