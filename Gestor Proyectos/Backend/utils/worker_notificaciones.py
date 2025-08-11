import requests
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
import time

# Configura tu API local y SMTP
API_URL = "http://localhost:8000/notificaciones"
SMTP_SERVER = "smtp.office365.com"
SMTP_PORT = 587
SMTP_USER = "notificaciones.rpa@sgnpl.com"
SMTP_PASS = "Bogota2025++"

def enviar_correo(destinatario, asunto, cuerpo_html, cuerpo_texto):
    print("[DEBUG] Iniciando envío a:", destinatario)
    try:
        msg = MIMEMultipart('related')
        msg['Subject'] = asunto
        msg['From'] = SMTP_USER
        msg['To'] = destinatario

        msg_alternative = MIMEMultipart('alternative')
        msg.attach(msg_alternative)

        msg_text = MIMEText(cuerpo_texto, 'plain')
        msg_alternative.attach(msg_text)
        print("[DEBUG] Parte texto plano añadida")

        msg_html = MIMEText(cuerpo_html, 'html')
        msg_alternative.attach(msg_html)
        print("[DEBUG] Parte HTML añadida")

        try:
            with open("../backend/utils/imgs/logo.png", 'rb') as f:
                mime_image = MIMEImage(f.read())
                mime_image.add_header('Content-ID', '<logo_image>')
                msg.attach(mime_image)
                print("[DEBUG] Imagen embebida adjuntada")
        except Exception as e:
            print(f"[WARNING] Logo no embebido: {e}")

        print("[DEBUG] Conectando a SMTP...")
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as smtp:
            smtp.set_debuglevel(1)  # <-- esto te mostrará el tráfico SMTP en consola
            smtp.starttls()
            smtp.login(SMTP_USER, SMTP_PASS)
            smtp.send_message(msg)
            print(f"[OK] Correo enviado a {destinatario}")
    except Exception as e:
        print(f"[ERROR] Fallo al enviar correo a {destinatario}: {e}")

def procesar_notificaciones():
    try:
        resp = requests.get(f"{API_URL}/pendientes")
        resp.raise_for_status()
    except Exception as e:
        print(f"[WORKER] Error consultando notificaciones: {e}")
        return

    notificaciones = resp.json()
    for n in notificaciones:
        id_notificacion = n["idNotificacion"]
        tipo = n["tipoAccion"]
        tarea_id = n["TareaID"]
        tarea_nombre = n["Tarea"]
        proyecto = n["Proyecto"]
        correo = n["Correo"]
        nombre_usuario = n.get("NombreUsuario", "Usuario")
        estado = n.get("Estado", "Sin estado")
        asignado = n.get("NombreUsuarioAsignado", "Sin asignar")

        # Asunto
        asunto = f"{tipo} - ID Tarea: {tarea_id} en el proyecto {proyecto}"

        # Texto plano
        cuerpo_texto = f"""Buen día, {nombre_usuario}

La tarea {tarea_id} - {tarea_nombre} ha sido {tipo}.
Estado actual: {estado} asignada a: {asignado}
en el proyecto {proyecto}.

Puedes ver más detalles en https://optime.systemgroupglobal.com/"""

        # HTML estilo card con imagen embebida
        cuerpo_html = f"""
<html>
  <body style="background-color: #f5f5f5; padding: 20px;">
    <table align="center" cellpadding="0" cellspacing="0" style="
      max-width: 600px;
      width: 100%;
      background: #ffffff;
      border-radius: 8px;
      padding: 40px;
      font-family: Arial, sans-serif;
      color: #333;
    ">
      <tr>
        <td align="center" style="padding-bottom: 20px;">
          <img src="cid:logo_image" alt="Logo" style="height: 50px;">
        </td>
      </tr>
      <tr>
        <td style="text-align: center; font-size: 16px;">
          <p style="margin: 0 0 20px 0;">Buen día, <strong>{nombre_usuario}</strong></p>

          <p style="margin: 0 0 20px 0;">
            La tarea <strong>{tarea_id} - {tarea_nombre}</strong> ha sido 
            <span style="color: #0055A5; font-weight: bold;">{tipo}</span>.<br>
            Estado actual: <strong>{estado}</strong>, asignada a: <strong>{asignado}</strong><br>
            en el proyecto <strong>{proyecto}</strong>.
          </p>

          <a href="https://optime.systemgroupglobal.com/"
            style="
              display: inline-block;
              padding: 12px 24px;
              background-color: #0055A5;
              color: #ffffff;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
            ">Ver más detalles</a>
        </td>
      </tr>
      <tr>
        <td style="padding-top: 30px; text-align: center; font-size: 12px; color: #999;">
          Este es un mensaje automático enviado por SystemGroup. Por favor no responder a este correo.
        </td>
      </tr>
    </table>
  </body>
</html>
"""

        try:
            enviar_correo(correo, asunto, cuerpo_html, cuerpo_texto)
            print(f"[WORKER] Correo enviado a {correo} para notificación {id_notificacion}")
            requests.put(f"{API_URL}/enviada/{id_notificacion}")
        except Exception as e:
            print(f"[WORKER] Error enviando correo para notificación {id_notificacion}: {e}")

def start_worker():
    import threading

    def run():
        while True:
            procesar_notificaciones()
            time.sleep(20)

    t = threading.Thread(target=run, daemon=True)
    t.start()
