from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from bll.tareas_bll import TareasBLL

router = APIRouter(prefix="/tareas", tags=["Tareas"])

class TareaIn(BaseModel):
    proyecto_id:       int
    titulo:            str
    descripcion:       Optional[str] = None
    estado:            Optional[str] = None
    usuario_asignados: List[int]    = []    # ahora es lista
    fecha_limite:      Optional[str] = None
    porcentaje_avance: int          = 0
    prioridad:         Optional[int] = None
    fecha_inicio:      Optional[str] = None
    comentarios:       Optional[str] = None
    antecesora:        Optional[int] = None

@router.get("/", response_model=List[dict])
async def listar_tareas():
    tareas = TareasBLL.listar_tareas()

    estados_mapeo = {
        'pendiente': 'pendiente',
        'en curso': 'en_progreso',
        'detenido': 'detenido',
        'completado': 'terminado',
        'en_progreso': 'en_progreso',  # por si ya viene así
        'terminado': 'terminado'
    }

    prioridad_mapeo = {
        'baja': 'Baja',
        'media': 'Media',
        'alta': 'Alta',
        'crítica': 'Crítica',
        'critica': 'Crítica'
    }

    for t in tareas:
        # Normalizar estado
        estado_original = t.get('Estado') or t.get('estado')
        if estado_original:
            t['Estado'] = estados_mapeo.get(estado_original.strip().lower(), estado_original.strip().lower().replace(' ', '_'))

        # Normalizar prioridad
        prioridad_original = t.get('prioridad')
        if isinstance(prioridad_original, str):
            t['prioridad'] = prioridad_mapeo.get(prioridad_original.strip().lower(), prioridad_original.strip())

    return tareas


@router.get("/{tarea_id}", response_model=dict)
async def obtener_tarea(tarea_id: int):
    return TareasBLL.obtener_tarea(tarea_id)

@router.post("/", response_model=dict)
async def crear_tarea(payload: TareaIn):
    return TareasBLL.crear_tarea(payload)

@router.put("/{tarea_id}", response_model=dict)
async def actualizar_tarea(tarea_id: int, payload: TareaIn):
    return TareasBLL.actualizar_tarea(tarea_id, payload)

@router.delete("/{tarea_id}", response_model=dict)
async def eliminar_tarea(tarea_id: int):
    return TareasBLL.eliminar_tarea(tarea_id)

@router.get("/por-orden/{proyecto_id}", response_model=dict)
async def listar_tareasJerarquica(proyecto_id: int):
    tareas = TareasBLL.listar_tareasJerarquica(proyecto_id) 
    print(tareas)
    return {"tareas": TareasBLL.listar_tareasJerarquica(proyecto_id)}

