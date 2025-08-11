from fastapi import HTTPException
from dal.bitacora_dal import BitacoraTareaDAL

class BitacoraTareaBLL:
    @staticmethod
    def listar_registros():
        return BitacoraTareaDAL.crud_bitacora_tarea(4)

    @staticmethod
    def obtener_registro(registro_id: int):
        result = BitacoraTareaDAL.crud_bitacora_tarea(5, registro_id=registro_id)
        if not result:
            raise HTTPException(status_code=404, detail="Registro no encontrado")
        return result[0]

    @staticmethod
    def crear_registro(data):
        return BitacoraTareaDAL.crud_bitacora_tarea(
            1,
            tarea_id=data.tarea_id,
            estado_anterior=data.estado_anterior,
            estado_nuevo=data.estado_nuevo
        )[0]

    @staticmethod
    def actualizar_registro(registro_id: int, data):
        return BitacoraTareaDAL.crud_bitacora_tarea(
            2,
            registro_id=registro_id,
            tarea_id=data.tarea_id,
            estado_anterior=data.estado_anterior,
            estado_nuevo=data.estado_nuevo
        )[0]

    @staticmethod
    def eliminar_registro(registro_id: int):
        return BitacoraTareaDAL.crud_bitacora_tarea(3, registro_id=registro_id)[0]