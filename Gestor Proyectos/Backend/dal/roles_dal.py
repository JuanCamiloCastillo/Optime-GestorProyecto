# backend/dal/roles_dal.py

from config import get_connection
from typing import List, Dict

class RolesDAL:

    @staticmethod
    def insert_role(nombre_rol: str) -> Dict:
        conn = get_connection()
        cursor = conn.cursor()
        try:
            # 1) Ejecutar el SP
            cursor.execute(
                "EXEC dbo.SP_CRUD_Rol ?, ?, ?",
                (1, None, nombre_rol)
            )

            # 2) Avanzar hasta el paquete con columnas
            while cursor.description is None and cursor.nextset():
                pass

            # 3) Leer la fila
            data = {}
            if cursor.description:
                cols = [c[0] for c in cursor.description]
                try:
                    row = cursor.fetchone()
                except pyodbc.Error:
                    row = None
                if row:
                    data = dict(zip(cols, row))

            # 4) Commit después de leer
            conn.commit()

            return data
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def update_role(rol_id: int, nombre_rol: str) -> Dict:
        conn = get_connection()
        cursor = conn.cursor()
        try:
            # Acción 2: Update
            cursor.execute(
                "EXEC dbo.SP_CRUD_Rol ?, ?, ?",
                (2, rol_id, nombre_rol)
            )
            conn.commit()
            while cursor.description is None and cursor.nextset():
                pass
            if cursor.description:
                cols = [c[0] for c in cursor.description]
                row = cursor.fetchone()
                return dict(zip(cols, row)) if row else {}
            return {}
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def delete_role(rol_id: int) -> Dict:
        conn = get_connection()
        cursor = conn.cursor()
        try:
            # Acción 3: Delete
            cursor.execute(
                "EXEC dbo.SP_CRUD_Rol ?, ?, ?",
                (3, rol_id, None)
            )
            conn.commit()
            # Su SP quizá no retorne filas; devolvemos al menos el ID
            return {"RolID": rol_id}
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def list_roles() -> List[Dict]:
        conn = get_connection()
        cursor = conn.cursor()
        try:
            # Acción 4: Select all
            cursor.execute(
                "EXEC dbo.SP_CRUD_Rol ?, ?, ?",
                (4, None, None)
            )
            # No commit para selects
            while cursor.description is None and cursor.nextset():
                pass
            cols = [c[0] for c in cursor.description]
            rows = cursor.fetchall()
            return [dict(zip(cols, row)) for row in rows]
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def get_role(rol_id: int) -> Dict:
        conn = get_connection()
        cursor = conn.cursor()
        try:
            # Acción 5: Select by ID
            cursor.execute(
                "EXEC dbo.SP_CRUD_Rol ?, ?, ?",
                (5, rol_id, None)
            )
            while cursor.description is None and cursor.nextset():
                pass
            if cursor.description:
                cols = [c[0] for c in cursor.description]
                row = cursor.fetchone()
                return dict(zip(cols, row)) if row else {}
            return {}
        finally:
            cursor.close()
            conn.close()
