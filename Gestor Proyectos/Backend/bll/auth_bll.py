# backend/bll/auth_bll.py

from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import jwt
from config import JWT_SECRET_KEY, JWT_ALGORITHM, JWT_EXPIRE_MINUTES
from dal.usuarios_dal import UsuariosDAL
from fastapi import HTTPException
import os, smtplib, ssl
from email.mime.text import MIMEText

SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.office365.com")
SMTP_PORT   = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER   = os.getenv("SMTP_USER", "notificaciones.rpa@sgnpl.com")
SMTP_PASS   = os.getenv("SMTP_PASS", "Bogota2025++")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
class AuthBLL:

    @staticmethod
    def verificar_clave(plain, hashed):
        return pwd_context.verify(plain, hashed)

    @staticmethod
    def crear_token(data: dict):
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=JWT_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

    @staticmethod
    def login(correo: str, clave: str):
        usuario = UsuariosDAL.get_por_correo(correo)
        if not usuario:
            raise HTTPException(status_code=401, detail="Usuario o clave inválidos")

        if not AuthBLL.verificar_clave(clave, usuario["ClaveHash"]):
            raise HTTPException(status_code=401, detail="Usuario o clave inválidos")

        token_data = {
            "sub": str(usuario["UsuarioID"]),
            "rol": usuario["RolID"]
        }
        token = AuthBLL.crear_token(token_data)

        return {
            "access_token": token,
            "token_type": "bearer",
            "usuario": usuario["NombreCompleto"] + " - " + usuario["Correo"],
            "rol": str(usuario["RolID"]) + " - "+usuario["NombreRol"],
            
        }

    @staticmethod
    def enviar_aviso_recuperacion(correo: str) -> bool:
        """
        Envía un correo de aviso de recuperación.
        - Usa SSLContext (TLS 1.2+)
        - Maneja excepciones para NO romper el endpoint
        """
        subject = "Solicitud de cambio de contraseña"
        html = f"""
        <html>
          <body style="font-family: Arial, sans-serif;">
            <h2>Solicitud de cambio de contraseña</h2>
            <p>Se ha solicitado cambiar la contraseña de tu cuenta asociada a <b>{correo}</b>.</p>
            <p>Si fuiste tú, vuelve a la aplicación y completa el cambio.</p>
            <p>Si no fuiste tú, ignora este mensaje.</p>
          </body>
        </html>
        """
        msg = MIMEText(html, "html", "utf-8")
        msg["Subject"] = subject
        msg["From"] = os.getenv("SMTP_USER", "notificaciones.rpa@sgnpl.com")
        msg["To"] = correo

        smtp_server = os.getenv("SMTP_SERVER", "smtp.office365.com")
        smtp_port   = int(os.getenv("SMTP_PORT", "587"))
        smtp_user   = os.getenv("SMTP_USER", "notificaciones.rpa@sgnpl.com")
        smtp_pass   = os.getenv("SMTP_PASS", "Bogota2025++")

        try:
            context = ssl.create_default_context()  # TLS 1.2+
            with smtplib.SMTP(smtp_server, smtp_port, timeout=30) as server:
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()
                server.login(smtp_user, smtp_pass)
                server.sendmail(smtp_user, [correo], msg.as_string())
            return True
        except Exception as e:
            # No rompas el flujo si el correo falla
            print(f"[WARN] SMTP aviso recuperación falló: {e}")
            return False