from fastapi import APIRouter, HTTPException, Body
import requests
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from bll.notificaciones_bll import NotificacionesBLL

router = APIRouter(prefix="/notificaciones", tags=["Notificaciones"])
logger = logging.getLogger("uvicorn.error")

SMTP_SERVER = "smtp.office365.com"
SMTP_PORT = 587
SMTP_USER = "notificaciones.rpa@sgnpl.com"
SMTP_PASS = "Bogota2025++"

@router.get("/pendientes")
def listar_pendientes():
    return NotificacionesBLL.obtener_notificaciones()

@router.put("/enviada/{id_notificacion}")
def marcar_como_enviada(id_notificacion: int):
    try:
        NotificacionesBLL.marcar_notificacion_enviada(id_notificacion)
        return {"mensaje": f"Notificación {id_notificacion} marcada como enviada"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/recordatorio")
def enviar_recordatorio(
    usuarios: list[int] = Body(...),
    mensaje: str = Body(...),
    tareas: list[dict] = Body(...),
    con_copia: list[str] = Body(default=[])  # <-- Campo opcional
):
    """
    Envía un recordatorio por correo con diseño HTML estilo tarjeta.
    """
    for usuario_id in usuarios:
        # Obtener datos del usuario
        resp = requests.get(f"http://localhost:8000/usuarios/{usuario_id}")
        if resp.status_code != 200:
            logger.warning(f"Usuario {usuario_id} no encontrado.")
            continue

        usuario = resp.json()
        correo = usuario.get("Correo") or usuario.get("correo")
        nombre = usuario.get("nombre_completo", "Usuario")

        if not correo:
            logger.warning(f"Usuario {usuario_id} no tiene correo.")
            continue

        # Armar cuerpo texto
        tareas_texto = "\n".join([f"- {t['titulo']}" for t in tareas])
        cuerpo_texto = f"""Hola {nombre},

Estas son tus tareas asignadas:
{tareas_texto}

{mensaje}
"""

        # Armar cuerpo HTML estilo tarjeta
        tareas_html = "".join([f"<li>{t['titulo']}</li>" for t in tareas])
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
          <p style="margin: 0 0 20px 0;">Hola <strong>{nombre}</strong>,</p>

          <p style="margin: 0 0 10px 0;">Estas son tus tareas asignadas:</p>
          <ul style="text-align: left;">{tareas_html}</ul>

          <p style="margin-top: 20px;">{mensaje}</p>

          <a href="https://optime.systemgroupglobal.com/"
            style="
              display: inline-block;
              padding: 12px 24px;
              background-color: #0055A5;
              color: #ffffff;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
              margin-top: 20px;
            ">Ver plataforma</a>
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

        # Enviar correo con diseño moderno
        try:
            msg = MIMEMultipart('related')
            msg['Subject'] = "Recordatorio de tareas"
            msg['From'] = SMTP_USER
            msg['To'] = correo
            if con_copia:
                msg['Cc'] = ", ".join(con_copia)

            alt = MIMEMultipart('alternative')
            msg.attach(alt)
            alt.attach(MIMEText(cuerpo_texto, 'plain'))
            alt.attach(MIMEText(cuerpo_html, 'html'))

            try:
                with open("utils/imgs/logo.png", 'rb') as f:
                    img = MIMEImage(f.read())
                    img.add_header('Content-ID', '<logo_image>')
                    msg.attach(img)
            except Exception as e:
                logger.warning(f"No se pudo cargar el logo: {e}")

            with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as smtp:
                smtp.starttls()
                smtp.login(SMTP_USER, SMTP_PASS)
                smtp.send_message(msg)

            logger.info(f"[OK] Correo enviado a {correo}")

        except Exception as e:
            logger.error(f"[ERROR] Fallo al enviar correo a {correo}: {e}")
            raise HTTPException(status_code=500, detail=f"No se pudo enviar el correo a {correo}")

    return {"mensaje": "Recordatorios enviados"}
