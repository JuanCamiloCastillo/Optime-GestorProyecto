from fastapi import APIRouter
from pydantic import BaseModel
from bll.roles_bll import RolesBLL

router = APIRouter(prefix="/roles", tags=["Roles"])

class RolIn(BaseModel):
    nombre_rol: str

@router.get("/", response_model=list[dict])
async def listar_roles():
    return RolesBLL.listar_roles()

@router.get("/{rol_id}", response_model=dict)
async def obtener_rol(rol_id: int):
    return RolesBLL.obtener_rol(rol_id)

@router.post("/", response_model=dict)
async def crear_rol(payload: RolIn):
    return RolesBLL.crear_rol(payload.nombre_rol)

@router.put("/{rol_id}", response_model=dict)
async def actualizar_rol(rol_id: int, payload: RolIn):
    return RolesBLL.actualizar_rol(rol_id, payload.nombre_rol)

@router.delete("/{rol_id}", response_model=dict)
async def eliminar_rol(rol_id: int):
    return RolesBLL.eliminar_rol(rol_id)