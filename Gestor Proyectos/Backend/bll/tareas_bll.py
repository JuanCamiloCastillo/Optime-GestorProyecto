from fastapi import HTTPException
from pyodbc import IntegrityError
from dal.tareas_dal import TareasDAL
from dal.estados_dal import EstadosDAL
import json

class TareasBLL:
    @staticmethod
    def listar_tareas():
       """
       Obtiene todas las tareas (acción 4), les añade los IDs asignados
       y normaliza el campo Estado según la tabla EstadosTarea.
       """
       tareas = TareasDAL.crud_tarea(
           4, None, None, None, None, None, None,
           None, None, None, None, None, None
       )
       # Traer todos los estados válidos desde la tabla EstadosTarea
       estados_config = EstadosDAL.crud_estado(4)
       mapa_estados = {
           e['nombreBD'].strip().lower(): e['estadoFront']
           for e in estados_config
       }
       for t in tareas:
           # Obtener usuario_asignados
           tus = TareasDAL.crud_tarea_usuario(5, t["TareaID"], None)
           t["usuario_asignados"] = [u["UsuarioID"] for u in tus]
           # Normalizar estado
           estado_raw = (t.get("Estado") or "").strip().lower()
           t["Estado"] = mapa_estados.get(estado_raw, estado_raw.replace(" ", "_"))
       return tareas

    @staticmethod
    def obtener_tarea(tarea_id: int):
        """
        Obtiene una tarea por ID (acción 5) y su lista de usuarios.
        """
        resultado = TareasDAL.crud_tarea(
            5,      # acción GetById
            tarea_id, None, None, None, None, None,
            None, None, None, None, None, None
        )
        if not resultado:
            raise HTTPException(status_code=404, detail="Tarea no encontrada")
        tarea = resultado[0]
        tus = TareasDAL.crud_tarea_usuario(5, tarea_id, None)
        tarea["usuario_asignados"] = [u["UsuarioID"] for u in tus]
        return tarea

    @staticmethod
    def crear_tarea(data):
        """
        Crea una tarea (acción 1) y luego inserta los vínculos muchos-a-muchos.
        """
        # 1) Inserción de la tarea
        nueva = TareasDAL.crud_tarea(
            1,                      # acción Insert
            None,                   # @TareaID
            data.proyecto_id,
            data.titulo,
            data.descripcion,
            data.estado,
            None,                   # @UsuarioAsignadoID (lo manejamos aparte)
            data.fecha_limite,
            data.porcentaje_avance,
            data.prioridad,
            data.fecha_inicio,
            data.comentarios,
            data.antecesora
        )[0]

        tid = nueva["TareaID"]
        # 2) Inserción de usuarios asignados
        for uid in data.usuario_asignados:
            try:
                TareasDAL.crud_tarea_usuario(1, tid, uid)
            except IntegrityError:
                TareasDAL.crud_tarea_usuario(3, tid, None)
                raise HTTPException(
                    status_code=400,
                    detail=f"UsuarioID inválido o no existe: {uid}"
                )

        nueva["usuario_asignados"] = data.usuario_asignados
        return nueva

    @staticmethod
    def actualizar_tarea(tarea_id: int, data):
        """
        Actualiza la tarea (acción 2) y rehace los vínculos muchos-a-muchos.
        """
        # 1) Actualización de la tarea
        updated = TareasDAL.crud_tarea(
            2,                      # acción Update
            tarea_id,
            data.proyecto_id,
            data.titulo,
            data.descripcion,
            data.estado,
            None,                   # @UsuarioAsignadoID
            data.fecha_limite,
            data.porcentaje_avance,
            data.prioridad,
            data.fecha_inicio,
            data.comentarios,
            data.antecesora
        )[0]

        # 2) Reasignación de usuarios
        TareasDAL.crud_tarea_usuario(3, tarea_id, None)  # elimina todos
        for uid in data.usuario_asignados:
            try:
                TareasDAL.crud_tarea_usuario(1, tarea_id, uid)
            except IntegrityError:
                TareasDAL.crud_tarea_usuario(3, tarea_id, None)
                raise HTTPException(
                    status_code=400,
                    detail=f"UsuarioID inválido o no existe: {uid}"
                )

        updated["usuario_asignados"] = data.usuario_asignados
        return updated

    @staticmethod
    def eliminar_tarea(tarea_id: int):
        """
        Elimina vínculos (acción 3) y luego elimina la tarea (acción 3).
        """
        # Primero limpio asignaciones
        TareasDAL.crud_tarea_usuario(3, tarea_id, None)
        # Luego borro la tarea
        resultado = TareasDAL.crud_tarea(
            3, tarea_id, None, None, None, None, None,
            None, None, None, None, None, None
        )
        return resultado[0] if resultado else {}

    @staticmethod
    def listar_tareasJerarquica(proyecto: int):
        tareas = TareasDAL.crud_tarea(
            6, None, proyecto, None, None, None, None,
            None, None, None, None, None, None
        )
    
        estados_config = EstadosDAL.crud_estado(4)
        mapa_estados = {
            e['nombreBD'].strip().lower(): e['estadoFront']
            for e in estados_config
        }
    
        for t in tareas:
            tus = TareasDAL.crud_tarea_usuario(5, t["TareaID"], None)
            t["usuario_asignados"] = [u["UsuarioID"] for u in tus]
    
            estado_raw = (t.get("Estado") or "").strip().lower()
            t["Estado"] = mapa_estados.get(estado_raw, estado_raw.replace(" ", "_"))
    
            # SOLO intentar parsear si tiene formato JSON
            comentarios = t.get("comentarios")
            if isinstance(comentarios, str) and comentarios.strip().startswith("["):
                try:
                    t["comentarios"] = json.loads(comentarios)
                except json.JSONDecodeError:
                    t["comentarios"] = []  # o mantenlo como string si prefieres
            else:
                t["comentarios"] = []  # o comentarios original si lo quieres ver
    
        return tareas
