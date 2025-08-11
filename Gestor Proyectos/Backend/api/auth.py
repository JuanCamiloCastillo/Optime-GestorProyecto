# backend/api/auth.py
from fastapi import APIRouter
from pydantic import BaseModel
from bll.auth_bll import AuthBLL

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
