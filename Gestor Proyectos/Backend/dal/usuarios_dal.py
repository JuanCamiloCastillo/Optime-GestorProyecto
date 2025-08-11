from config import get_connection
import traceback
from fastapi import HTTPException

class UsuariosDAL:
    @staticmethod
    def crud_usuario(
        accion,
        usuario_id=None,
        correo=None,
        clave_hash=None,
        nombre_completo=None,
        rol_id=None,
        participacion=None,
        tasaHora=None
    ):
        """
        Ejecuta el procedimiento almacenado SP_CRUD_Usuario.
        Solo hace fetchall si la acción es obtener/listar.
        """
        conn = get_connection()
        cursor = None
        try:
            cursor = conn.cursor()
            print("----------- [DAL] Ejecutando SP_CRUD_Usuario -----------")
            print(f"accion         : {accion}")
            print(f"usuario_id     : {usuario_id}")
            print(f"correo         : {correo}")
            print(f"clave_hash     : {clave_hash}")
            print(f"nombre_completo: {nombre_completo}")
            print(f"rol_id         : {rol_id}")
            print(f"participacion  : {participacion}")
            print(f"tasaHora       : {tasaHora}")

            cursor.execute(
                "EXEC dbo.SP_CRUD_Usuario ?, ?, ?, ?, ?, ?, ?, ?",
                (
                    accion,
                    usuario_id,
                    correo,
                    clave_hash,
                    nombre_completo,
                    rol_id,
                    participacion,
                    tasaHora,
                )
            )

            if accion in (1, 2, 3):
                conn.commit()
                print("[DAL] Commit realizado para INSERT/UPDATE/DELETE")
                return []  # No devuelve nada, no hace fetch

            # Solo fetch si es listar/obtener
            cols = []
            rows = []
            if cursor.description:
                cols = [col[0] for col in cursor.description]
                rows = cursor.fetchall()

            print(f"[DAL] Columnas devueltas: {cols}")
            print(f"[DAL] Filas devueltas: {rows}")

            return [dict(zip(cols, row)) for row in rows] if rows else []

        except Exception as e:
            print(f"[DAL] ERROR ejecutando SP_CRUD_Usuario: {str(e)}")
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Error DAL: {str(e)}")

        finally:
            if cursor:
                cursor.close()
            conn.close()

    @staticmethod
    def get_por_correo(correo):
        """
        Obtiene un usuario por correo con JOIN a Rol para traer NombreRol.
        """
        conn = get_connection()
        cursor = None
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT 
                    u.UsuarioID,
                    u.Correo,
                    u.ClaveHash,
                    u.NombreCompleto,
                    u.RolID,
                    r.NombreRol
                FROM Usuario u
                JOIN Rol r ON u.RolID = r.RolID
                WHERE u.Correo = ?
                """,
                (correo,)
            )
            row = cursor.fetchone()
            if not row:
                return None

            return {
                "UsuarioID": row[0],
                "Correo": row[1],
                "ClaveHash": row[2],
                "NombreCompleto": row[3],
                "RolID": row[4],
                "NombreRol": row[5]
            }

        finally:
            if cursor:
                cursor.close()
            conn.close()
