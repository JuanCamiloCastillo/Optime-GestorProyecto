from config import get_connection

class EstadosDAL:
    @staticmethod
    def crud_estado(accion, idEstado=None, nombreBD=None, estadoFront=None, etiqueta=None, colorHex=None):
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            "EXEC dbo.SP_CRUD_EstadosTarea ?,?,?,?,?,?",
            (
                accion,         # @Accion
                idEstado,       # @idEstado
                nombreBD,       # @nombreBD
                estadoFront,    # @estadoFront
                etiqueta,       # @etiqueta
                colorHex        # @colorHex
            )
        )
        rows = []
        if cur.description:
            cols = [c[0] for c in cur.description]
            for r in cur.fetchall():
                rows.append(dict(zip(cols, r)))
        conn.commit()
        cur.close()
        conn.close()
        return rows
