from config import get_connection

class NotificacionesDAL:

    @staticmethod
    def listar_pendientes():
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("EXEC dbo.SP_ListarNotificacionesPendientes")
        cols = [c[0] for c in cursor.description]
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        return [dict(zip(cols, row)) for row in rows]

    @staticmethod
    def marcar_enviada(id_notificacion):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("EXEC dbo.SP_MarcarNotificacionEnviada ?", id_notificacion)
        conn.commit()
        cursor.close()
        conn.close()
