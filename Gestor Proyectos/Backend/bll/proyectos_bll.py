from fastapi import HTTPException
from dal.proyectos_dal import ProyectosDAL

class ProyectosBLL:
    @staticmethod
    def listar_proyectos():
        return ProyectosDAL.crud_proyecto(4)

    @staticmethod
    def obtener_proyecto(proyecto_id: int):
        result = ProyectosDAL.crud_proyecto(5, proyecto_id=proyecto_id)
        if not result:
            raise HTTPException(status_code=404, detail="Proyecto no encontrado")
        return result[0]

    @staticmethod
    def crear_proyecto(data):
        return ProyectosDAL.crud_proyecto(
            1,
            None,
            data.nombre_proyecto,
            data.fecha_inicio,
            data.fecha_fin,
            data.usuario_propietario_id,
            data.descripcion,
            data.area_id,          # ← aquí
            data.imagen
        )[0]
    
    @staticmethod
    def actualizar_proyecto(proyecto_id: int, data):
        return ProyectosDAL.crud_proyecto(
                2,
                proyecto_id,
                data.nombre_proyecto,
                data.fecha_inicio,
                data.fecha_fin,
                data.usuario_propietario_id,
                data.descripcion,
                data.area_id,          # ← y aquí
                data.imagen
            )[0]
    
    @staticmethod
    def eliminar_proyecto(proyecto_id: int):
        return ProyectosDAL.crud_proyecto(3, proyecto_id=proyecto_id)[0]
    
    # bll/proyectos_bll.py
    @staticmethod
    def proyectos_por_usuario(usuario_id: int):
        return ProyectosDAL.proyectos_por_usuario(usuario_id)
    