from dal.estados_dal import EstadosDAL

class EstadosBLL:
    @staticmethod
    def listar_estados():
        return EstadosDAL.crud_estado(4)

    @staticmethod
    def obtener_estado(idEstado: int):
        res = EstadosDAL.crud_estado(5, idEstado=idEstado)
        return res[0] if res else None

    @staticmethod
    def crear_estado(payload):
        res = EstadosDAL.crud_estado(
            1,
            nombreBD=payload.nombreBD,
            estadoFront=payload.estadoFront,
            etiqueta=payload.etiqueta,
            colorHex=payload.colorHex
        )
        return res[0] if res else None

    @staticmethod
    def actualizar_estado(idEstado: int, payload):
        res = EstadosDAL.crud_estado(
            2,
            idEstado=idEstado,
            nombreBD=payload.nombreBD,
            estadoFront=payload.estadoFront,
            etiqueta=payload.etiqueta,
            colorHex=payload.colorHex
        )
        return res[0] if res else None

    @staticmethod
    def eliminar_estado(idEstado: int):
        EstadosDAL.crud_estado(3, idEstado=idEstado)
        return {"detalle": "Eliminado correctamente"}
