from typing import List
from fastapi import APIRouter
from pydantic import BaseModel
from bll.permisosRol_bll import PermisosRolBLL

router = APIRouter(prefix="/permisos-rol", tags=["PermisosRol"])

class PermisoModuloIn(BaseModel):
    modulo: str
    rol_id: int
    crear: bool
    editar: bool
    eliminar: bool
    seleccionar: bool

class PermisoModuloOut(BaseModel):
    PermisoModuloID: int
    Modulo: str
    RolID: int
    Crear: bool
    Editar: bool
    Eliminar: bool
    Seleccionar: bool

    class Config:
        orm_mode = True

@router.get("/", response_model=List[PermisoModuloOut])
def listar():
    """
    Devuelve todos los permisos por módulo y rol.
    """
    return PermisosRolBLL.listar()

@router.get("/{rol_id}", response_model=List[PermisoModuloOut])
def por_rol(rol_id: int):
    """
    Devuelve los permisos de un rol específico.
    """
    return PermisosRolBLL.obtener_por_rol(rol_id)

@router.post("/", response_model=PermisoModuloOut)
def crear(p: PermisoModuloIn):
    """
    Crea un nuevo permiso para un módulo y rol dados.
    """
    return PermisosRolBLL.crear(p)

@router.put("/{permiso_id}", response_model=PermisoModuloOut)
def actualizar(permiso_id: int, p: PermisoModuloIn):
    """
    Actualiza un permiso existente identificado por permiso_id.
    """
    return PermisosRolBLL.actualizar(permiso_id, p)
