from config import get_connection

class AreasDAL:
    @staticmethod
    def list_areas():
        """
        Devuelve todas las áreas (acción 1).
        """
        conn = get_connection()
        cur = conn.cursor()
        try:
            cur.execute(
                "EXEC dbo.sp_ManageAreas ?,?,?,?,?,?",
                (1, None, None, None, None, None)
            )
            # avanzar hasta SELECT real
            while cur.description is None and cur.nextset():
                pass
            cols = [c[0] for c in cur.description]
            rows = [dict(zip(cols, row)) for row in cur.fetchall()]
            # normalizar fecha
            for r in rows:
                dt = r.get('fechaIntegracion')
                r['fechaIntegracion'] = dt.isoformat() if dt else ''
            return rows
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_area(idArea: int):
        """
        Devuelve una área por ID (acción 2).
        """
        conn = get_connection()
        cur = conn.cursor()
        try:
            cur.execute(
                "EXEC dbo.sp_ManageAreas ?,?,?,?,?,?",
                (2, idArea, None, None, None, None)
            )
            while cur.description is None and cur.nextset():
                pass
            cols = [c[0] for c in cur.description]
            row = cur.fetchone()
            if not row:
                return {}
            result = dict(zip(cols, row))
            dt = result.get('fechaIntegracion')
            result['fechaIntegracion'] = dt.isoformat() if dt else ''
            return result
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def create_area(nombreArea: str, activo: int, parentAreaID: int = None, responsableID: int = None):
        """
        Inserta nueva área (acción 3) y devuelve el registro creado.
        """
        conn = get_connection()
        cur = conn.cursor()
        try:
            cur.execute(
                "EXEC dbo.sp_ManageAreas ?,?,?,?,?,?",
                (3, None, nombreArea, activo, parentAreaID, responsableID)
            )
            while cur.description is None and cur.nextset():
                pass
            cols = [c[0] for c in cur.description]
            row = cur.fetchone()
            conn.commit()
            if not row:
                return {}
            result = dict(zip(cols, row))
            dt = result.get('fechaIntegracion')
            result['fechaIntegracion'] = dt.isoformat() if dt else ''
            return result
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def update_area(idArea: int, nombreArea: str, activo: int, parentAreaID: int = None, responsableID: int = None):
        """
        Actualiza área existente (acción 4) y devuelve el registro actualizado.
        """
        conn = get_connection()
        cur = conn.cursor()
        try:
            cur.execute(
                "EXEC dbo.sp_ManageAreas ?,?,?,?,?,?",
                (4, idArea, nombreArea, activo, parentAreaID, responsableID)
            )
            while cur.description is None and cur.nextset():
                pass
            cols = [c[0] for c in cur.description]
            row = cur.fetchone()
            conn.commit()
            if not row:
                return {}
            result = dict(zip(cols, row))
            dt = result.get('fechaIntegracion')
            result['fechaIntegracion'] = dt.isoformat() if dt else ''
            return result
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def delete_area(idArea: int):
        """
        Elimina un área (acción 5) y devuelve {'deleted': True}.
        """
        conn = get_connection()
        cur = conn.cursor()
        try:
            cur.execute(
                "EXEC dbo.sp_ManageAreas ?,?,?,?,?,?",
                (5, idArea, None, None, None, None)
            )
            conn.commit()
            return {'deleted': True}
        finally:
            cur.close()
            conn.close()