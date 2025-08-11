from config import get_connection
import pyodbc

class ProyectosDAL:
    @staticmethod
    def crud_proyecto(
        accion,
        proyecto_id=None,
        nombre_proyecto=None,
        fecha_inicio=None,
        fecha_fin=None,
        usuario_propietario_id=None,
        descripcion=None,
        area=None,
        imagen=None
    ):
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute(
            "EXEC dbo.SP_CRUD_Proyecto ?, ?, ?, ?, ?, ?, ?, ?, ?",
            (
                accion,
                proyecto_id,
                nombre_proyecto,
                fecha_inicio,
                fecha_fin,
                usuario_propietario_id,
                descripcion,
                area,
                imagen
            )
        )
        if accion in (1, 2, 3):
            conn.commit()

        cols, rows = [], []
        try:
            while True:
                if cursor.description:
                    cols = [c[0] for c in cursor.description]
                    rows = cursor.fetchall()
                    break
                if not cursor.nextset():
                    break
        except pyodbc.ProgrammingError:
            rows = []
        except pyodbc.Error:
            rows = []

        cursor.close()
        conn.close()

        return [dict(zip(cols, row)) for row in rows] if rows else [{"status": "ok"}]
    
    # dal/proyectos_dal.py
    @staticmethod
    def proyectos_por_usuario(usuario_id: int):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("EXEC dbo.SP_VerProyectosPorUsuario ?", (usuario_id,))
        rows = cursor.fetchall()
        cursor.close()
        conn.close()    

        return [row[0] for row in rows]  # ← extrae solo ProyectoID 
