import smtplib
from email.mime.text import MIMEText

# CONFIGURA ESTOS VALORES
SMTP_USER = "notificaciones.rpa@sgnpl.com"
SMTP_PASS = "Bogota2025++"
DESTINATARIO = "juancamilocast10@gmail.com"  # Cambia esto

# MENSAJE DE PRUEBA
msg = MIMEText("Hola,\n\nEste es un correo de prueba SMTP enviado desde Python.\n\nSaludos.")
msg['Subject'] = "✅ Prueba de envío SMTP"
msg['From'] = SMTP_USER
msg['To'] = DESTINATARIO

try:
    with smtplib.SMTP("smtp.office365.com", 587) as smtp:
        smtp.starttls()
        smtp.login(SMTP_USER, SMTP_PASS)
        smtp.send_message(msg)
    print("✅ Correo enviado correctamente a", DESTINATARIO)
except Exception as e:
    print("❌ Error al enviar el correo:")
    print(e)
