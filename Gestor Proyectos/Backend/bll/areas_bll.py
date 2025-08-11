# src/bll/areas_bll.py
from fastapi import HTTPException
from pyodbc import IntegrityError
from dal.areas_dal import AreasDAL
from typing import List, Dict

class AreasBLL:

    @staticmethod
    def listar_areas() -> List[Dict]:
        return AreasDAL.list_areas()

    @staticmethod
    def listar_hierarquia() -> List[Dict]:
        flat = AreasDAL.list_areas()
        nodo_map = { a['idArea']: { **a, 'subareas': [] } for a in flat }
        roots = []
        for nodo in nodo_map.values():
            pid = nodo.get('ParentAreaID')
            if pid and pid in nodo_map:
                nodo_map[pid]['subareas'].append(nodo)
            else:
                roots.append(nodo)
        return roots

    @staticmethod
    def obtener_area(idArea: int) -> Dict:
        result = AreasDAL.get_area(idArea)
        if not result:
            raise HTTPException(status_code=404, detail="Área no encontrada")
        return result

    @staticmethod
    def crear_area(data) -> Dict:
        try:
            return AreasDAL.create_area(
                data.nombreArea,
                data.activo,
                getattr(data, 'parentAreaID', None),
                getattr(data, 'responsableID', None)
            )
        except IntegrityError as e:
            raise HTTPException(status_code=400, detail=f"Error al crear área: {e}")

    @staticmethod
    def actualizar_area(idArea: int, data) -> Dict:
        try:
            return AreasDAL.update_area(
                idArea,
                data.nombreArea,
                data.activo,
                getattr(data, 'parentAreaID', None),
                getattr(data, 'responsableID', None)
            )
        except IntegrityError as e:
            raise HTTPException(status_code=400, detail=f"Error al actualizar área: {e}")

    @staticmethod
    def eliminar_area(idArea: int) -> Dict:
        return AreasDAL.delete_area(idArea)
