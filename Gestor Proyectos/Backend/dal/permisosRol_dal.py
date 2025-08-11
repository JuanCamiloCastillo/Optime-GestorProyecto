# backend/dal/permisosRol_dal.py

from config import get_connection
from typing import List, Dict

class PermisosRolDAL:

    @staticmethod
    def list_permisos() -> List[Dict]:
        conn = get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "EXEC SP_CRUD_PermisosPorModuloRol ?, ?, ?, ?, ?, ?, ?, ?",
                (3, None, None, None, None, None, None, None)
            )
            # avanzar hasta el SELECT real
            while cursor.description is None and cursor.nextset():
                pass
            cols = [c[0] for c in cursor.description]
            rows = cursor.fetchall()
            return [dict(zip(cols, row)) for row in rows]
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def get_por_rol(rol_id: int) -> List[Dict]:
        conn = get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "EXEC SP_CRUD_PermisosPorModuloRol ?, ?, ?, ?, ?, ?, ?, ?",
                (4, None, None, rol_id, None, None, None, None)
            )
            while cursor.description is None and cursor.nextset():
                pass
            cols = [c[0] for c in cursor.description]
            rows = cursor.fetchall()
            return [dict(zip(cols, row)) for row in rows]
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def insert_permiso(
        modulo: str,
        rol_id: int,
        crear: bool,
        editar: bool,
        eliminar: bool,
        seleccionar: bool
    ) -> Dict:
        conn = get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "EXEC SP_CRUD_PermisosPorModuloRol ?, ?, ?, ?, ?, ?, ?, ?",
                (1, None, modulo, rol_id, crear, editar, eliminar, seleccionar)
            )
            # avanzar hasta el SELECT de retorno
            while cursor.description is None and cursor.nextset():
                pass
            data = {}
            if cursor.description:
                cols = [c[0] for c in cursor.description]
                row = cursor.fetchone()
                if row:
                    data = dict(zip(cols, row))
            # commit DESPUÉS de fetch para no romper la secuencia
            conn.commit()
            return data
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def update_permiso(
        permiso_modulo_id: int,
        modulo: str,
        rol_id: int,
        crear: bool,
        editar: bool,
        eliminar: bool,
        seleccionar: bool
    ) -> Dict:
        conn = get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "EXEC SP_CRUD_PermisosPorModuloRol ?, ?, ?, ?, ?, ?, ?, ?",
                (2, permiso_modulo_id, modulo, rol_id, crear, editar, eliminar, seleccionar)
            )
            while cursor.description is None and cursor.nextset():
                pass
            data = {}
            if cursor.description:
                cols = [c[0] for c in cursor.description]
                row = cursor.fetchone()
                if row:
                    data = dict(zip(cols, row))
            conn.commit()
            return data
        finally:
            cursor.close()
            conn.close()
