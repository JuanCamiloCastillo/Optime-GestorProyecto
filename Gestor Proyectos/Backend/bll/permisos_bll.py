# src/bll/jerarquia_acceso_bll.py
from dal.permisos_dal import permisos_dal
from fastapi import HTTPException
from typing import List, Dict

class permisos_bll:

    @staticmethod
    def proyectos_por_jerarquia(rol_id, area_id, usuario_id):
        if rol_id is None and area_id is None and usuario_id is None:
            # exigimos al menos uno (en este flujo usuario_id debería venir)
            raise HTTPException(status_code=400, detail="Envíe rol_id, area_id o usuario_id.")
        return permisos_dal.proyectos_por_jerarquia(rol_id, area_id, usuario_id)
