# backend/bll/permisosRol_bll.py

from fastapi import HTTPException
from dal.permisosRol_dal import PermisosRolDAL
from typing import Dict, List

class PermisosRolBLL:

    @staticmethod
    def listar() -> List[Dict]:
        return PermisosRolDAL.list_permisos()

    @staticmethod
    def obtener_por_rol(rol_id: int) -> List[Dict]:
        permisos = PermisosRolDAL.get_por_rol(rol_id)
        if not permisos:
            raise HTTPException(status_code=404, detail="Permisos no encontrados")
        return permisos

    @staticmethod
    def crear(payload) -> Dict:
        nuevo = PermisosRolDAL.insert_permiso(
            payload.modulo,
            payload.rol_id,
            payload.crear,
            payload.editar,
            payload.eliminar,
            payload.seleccionar
        )
        if not nuevo.get("PermisoModuloID"):
            raise HTTPException(status_code=400, detail="No se pudo crear el permiso")
        return nuevo

    @staticmethod
    def actualizar(permiso_id: int, payload) -> Dict:
        actualizado = PermisosRolDAL.update_permiso(
            permiso_id,
            payload.modulo,
            payload.rol_id,
            payload.crear,
            payload.editar,
            payload.eliminar,
            payload.seleccionar
        )
        if not actualizado.get("PermisoModuloID"):
            raise HTTPException(status_code=400, detail="No se pudo actualizar el permiso")
        return actualizado
