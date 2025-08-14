# backend/api/auth.py
from fastapi import APIRouter
from typing import Optional
from pydantic import BaseModel, EmailStr
from bll.auth_bll import AuthBLL
from bll.usuarios_bll import UsuariosBLL

router = APIRouter(prefix="/auth", tags=["Autenticación"])

class LoginIn(BaseModel):
    correo: str
    clave: str

class TokenOut(BaseModel):
    access_token: str
    token_type: str
    usuario: str
    rol: str


@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn):
    return AuthBLL.login(payload.correo, payload.clave)


# === Olvidó su contraseña (flujo simple) ===
class ForgotIn(BaseModel):
    correo: EmailStr

@router.post("/forgot-password")
def forgot_password(payload: ForgotIn):
    usuarios = UsuariosBLL.listar_usuarios() or []
    correo_lower = payload.correo.lower()

    user = next(
        (u for u in usuarios if str(u.get("Correo", "")).lower() == correo_lower),
        None
    )
    if not user:
        return {"ok": False, "message": "Correo no encontrado"}

    email_enviado = AuthBLL.enviar_aviso_recuperacion(payload.correo)

    return {
        "ok": True,
        "email_enviado": bool(email_enviado),
        "usuario": {
            "UsuarioID": user.get("UsuarioID"),
            "correo": user.get("Correo"),
            "nombre_completo": user.get("NombreCompleto"),
            "rol_id": user.get("RolID"),
            "participacion": user.get("Participacion", ""),
            "tasaHora": user.get("TasaHora", "")
        }
    }
