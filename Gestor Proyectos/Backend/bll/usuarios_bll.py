# backend/bll/usuarios_bll.py

from fastapi import HTTPException
from dal.usuarios_dal import UsuariosDAL
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UsuariosBLL:
    @staticmethod
    def listar_usuarios():
        return UsuariosDAL.crud_usuario(4)

    @staticmethod
    def obtener_usuario(usuario_id: int):
        result = UsuariosDAL.crud_usuario(5, usuario_id=usuario_id)
        if not result:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        return result[0]

    @staticmethod
    def crear_usuario(data):
        # Verifica si existe
        existente = UsuariosDAL.get_por_correo(data.correo)
        if existente:
            raise HTTPException(status_code=400, detail="Correo ya existe.")

        # 🔑 Hashear SIEMPRE con bcrypt
        clave_hashed = pwd_context.hash(data.clave_hash)

        UsuariosDAL.crud_usuario(
            1,
            correo=data.correo,
            clave_hash=clave_hashed,
            nombre_completo=data.nombre_completo,
            rol_id=data.rol_id,
            participacion=data.participacion,
            tasaHora=data.tasaHora
        )

        return {"mensaje": "Usuario creado correctamente"}

    @staticmethod
    def actualizar_usuario(usuario_id: int, data):
        clave_hashed = pwd_context.hash(data.clave_hash)

        UsuariosDAL.crud_usuario(
            2,
            usuario_id=usuario_id,
            correo=data.correo,
            clave_hash=clave_hashed,
            nombre_completo=data.nombre_completo,
            rol_id=data.rol_id,
            participacion=data.participacion,
            tasaHora=data.tasaHora
        )

        return {"mensaje": "Usuario actualizado correctamente"}

    @staticmethod
    def eliminar_usuario(usuario_id: int):
        UsuariosDAL.crud_usuario(3, usuario_id=usuario_id)
        return {"mensaje": "Usuario eliminado correctamente"}
