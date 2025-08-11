# backend/bll/auth_bll.py

from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import jwt
from config import JWT_SECRET_KEY, JWT_ALGORITHM, JWT_EXPIRE_MINUTES
from dal.usuarios_dal import UsuariosDAL
from fastapi import HTTPException

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
