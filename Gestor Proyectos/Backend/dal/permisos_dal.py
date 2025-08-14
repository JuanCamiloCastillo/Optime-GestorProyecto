# src/dal/jerarquia_acceso_dal.py
from config import get_connection

class permisos_dal:
    @staticmethod
    def proyectos_por_jerarquia(rol_id: int | None, area_id: int | None, usuario_id: int | None):
        conn = get_connection()
        cur = conn.cursor()
        try:
            cur.execute("EXEC dbo.SP_ProyectosPorJerarquia ?, ?, ?", (rol_id, area_id, usuario_id))
            while cur.description is None and cur.nextset():
                pass
            if cur.description is None:
                return []
            cols = [c[0] for c in cur.description]
            rows = [dict(zip(cols, row)) for row in cur.fetchall()]
            for r in rows:
                for k in ("FechaInicio", "FechaFin"):
                    dt = r.get(k)
                    r[k] = dt.isoformat() if dt else None
            return rows
        finally:
            cur.close()
            conn.close()
