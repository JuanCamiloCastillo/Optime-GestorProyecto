from config import get_connection

class TareasDAL:
    @staticmethod
    def crud_tarea(
        accion,
        tarea_id=None,
        proyecto_id=None,
        titulo=None,
        descripcion=None,
        estado=None,
        usuario_asignado_id=None,   # ← aunque no lo uses
        fecha_limite=None,
        porcentaje_avance=None,
        prioridad=None,
        fecha_inicio=None,
        comentarios=None,
        antecesora=None
    ):
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            # 12 signos: 1 por cada parámetro del SP
            "EXEC dbo.SP_CRUD_Tarea ?,?,?,?,?,?,?,?,?,?,?,?,?",
            (
                accion,               # @Accion
                tarea_id,             # @TareaID
                proyecto_id,          # @ProyectoID
                titulo,               # @Titulo
                descripcion,          # @Descripcion
                estado,               # @Estado
                usuario_asignado_id,  # @UsuarioAsignadoID
                fecha_limite,         # @FechaLimite
                porcentaje_avance,    # @PorcentajeAvance
                prioridad,            # @prioridad
                fecha_inicio,         # @FechaInicio
                comentarios,           # @comentarios
                antecesora
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
    

    @staticmethod
    def crud_tarea_usuario(accion, tarea_id=None, usuario_id=None):
        """
        Llama al SP_CRUD_TareaUsuario:
         1=Insert,2=Del vínculo,3=Del todos de tarea,
         4=GetAll,5=GetByTarea,6=GetByUsuario
        """
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            "EXEC dbo.SP_CRUD_TareaUsuario ?,?,?",
            (accion, tarea_id, usuario_id)
        )
        # Sólo los SELECT devuelven filas
        result = []
        if cur.description:
            cols = [c[0] for c in cur.description]
            rows = cur.fetchall()
            result = [dict(zip(cols, r)) for r in rows]
        conn.commit()
        cur.close()
        conn.close()
        return result
