from config import get_connection

class BitacoraTareaDAL:
    @staticmethod
    def crud_bitacora_tarea(accion, registro_id=None, tarea_id=None, estado_anterior=None, estado_nuevo=None):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "EXEC dbo.SP_CRUD_BitacoraTarea ?, ?, ?, ?, ?",
            (accion, registro_id, tarea_id, estado_anterior, estado_nuevo)
        )
        cols = [c[0] for c in cursor.description]
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        return [dict(zip(cols, row)) for row in rows]