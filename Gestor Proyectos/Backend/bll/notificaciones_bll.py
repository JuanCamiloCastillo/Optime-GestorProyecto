from dal.notificaciones_dal import NotificacionesDAL

class NotificacionesBLL:

    @staticmethod
    def obtener_notificaciones():
        return NotificacionesDAL.listar_pendientes()

    @staticmethod
    def marcar_notificacion_enviada(id_notificacion):
        NotificacionesDAL.marcar_enviada(id_notificacion)
