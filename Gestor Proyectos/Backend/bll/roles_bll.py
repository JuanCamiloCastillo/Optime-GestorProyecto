# backend/bll/roles_bll.py

from fastapi import HTTPException
from dal.roles_dal import RolesDAL

class RolesBLL:
    @staticmethod
    def listar_roles():
        return RolesDAL.list_roles()

    @staticmethod
    def obtener_rol(rol_id: int):
        rol = RolesDAL.get_role(rol_id)
        if not rol:
            raise HTTPException(status_code=404, detail="Rol no encontrado")
        return rol

    @staticmethod
    def crear_rol(nombre_rol: str):
        rol = RolesDAL.insert_role(nombre_rol)
        if not rol.get("RolID"):
            raise HTTPException(status_code=400, detail="No se pudo crear el rol")
        return rol

    @staticmethod
    def actualizar_rol(rol_id: int, nombre_rol: str):
        rol = RolesDAL.update_role(rol_id, nombre_rol)
        if not rol.get("RolID"):
            raise HTTPException(status_code=400, detail="No se pudo actualizar el rol")
        return rol

    @staticmethod
    def eliminar_rol(rol_id: int):
        res = RolesDAL.delete_role(rol_id)
        if not res.get("RolID"):
            raise HTTPException(status_code=400, detail="No se pudo eliminar el rol")
        return res
