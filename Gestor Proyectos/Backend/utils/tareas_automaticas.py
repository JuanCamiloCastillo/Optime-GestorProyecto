import threading
import time
from datetime import datetime
from config import get_connection  # Asegúrate que esta función retorna la conexión activa

# Solo probar una tarea específica
MODO_PRUEBA = True
ID_TAREA_PRUEBA = 80

def calcular_prioridad(urgencia, avance, esfuerzo_restante):
    if urgencia <= 0 or esfuerzo_restante >= 16:
        return 1  # Alta
    elif urgencia <= 2:
        return 2  # Media-Alta
    elif urgencia <= 5:
        return 3  # Media
    else:
        return 4  # Baja

def determinar_estado(avance, vencida):
    if avance == 0 and vencida:
        return "Bloqueada"
    elif avance == 0:
        return "Pendiente"
    elif 0 < avance < 100:
        return "En progreso"
    elif avance == 100:
        return "En revisión"
    return None

def ejecutar_revision_automatica():
    conn = get_connection()

    if MODO_PRUEBA:
        query = f"""
            SELECT t.TareaID, t.FechaLimite, t.PorcentajeAvance, t.Estado, t.prioridad,
                   u.tasaHora, u.participacion
            FROM Tarea t
            LEFT JOIN Usuario u ON u.UsuarioID = t.UsuarioAsignadoID
            WHERE t.TareaID = {ID_TAREA_PRUEBA}
        """
    else:
        query = """
            SELECT t.TareaID, t.FechaLimite, t.PorcentajeAvance, t.Estado, t.prioridad,
                   u.tasaHora, u.participacion
            FROM Tarea t
            LEFT JOIN Usuario u ON u.UsuarioID = t.UsuarioAsignadoID
            WHERE t.Estado NOT IN ('Completada', 'Cancelada')
              AND t.PorcentajeAvance < 100
        """

    tareas = conn.execute(query).fetchall()

    for tarea in tareas:
        tarea_id, fecha_limite, avance, estado_actual, prioridad_actual, tasa_hora, participacion = tarea

        if not fecha_limite:
            continue

        urgencia = (fecha_limite - datetime.now().date()).days
        avance_ratio = avance / 100.0

        try:
            tasa = float(str(tasa_hora).replace(',', '.')) if tasa_hora else 1.0
            participacion_val = float(str(participacion).replace(',', '.')) if participacion else 1.0
        except:
            tasa = participacion_val = 1.0

        esfuerzo_total = tasa * participacion_val
        esfuerzo_restante = esfuerzo_total * (1 - avance_ratio)

        nueva_prioridad = calcular_prioridad(urgencia, avance_ratio, esfuerzo_restante)
        nuevo_estado = determinar_estado(avance, urgencia < 0)

        if nueva_prioridad != prioridad_actual or nuevo_estado != estado_actual:
            update = """
                UPDATE Tarea
                SET Estado = ?, prioridad = ?
                WHERE TareaID = ?
            """
            conn.execute(update, (nuevo_estado, nueva_prioridad, tarea_id))
            conn.commit()
            print(f"[{datetime.now()}] ✅ Tarea {tarea_id} actualizada: Estado='{nuevo_estado}', Prioridad={nueva_prioridad}")
        else:
            print(f"[{datetime.now()}] 🔍 Tarea {tarea_id} revisada, sin cambios.")

def loop():
    while True:
        try:
            ejecutar_revision_automatica()
        except Exception as e:
            print(f"[ERROR] Fallo en revisión automática: {e}")
        time.sleep(5)

def run():
    threading.Thread(target=loop, daemon=True).start()
