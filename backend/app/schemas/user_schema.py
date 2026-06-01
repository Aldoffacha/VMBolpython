from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserRegister(BaseModel):
    nombre: str
    correo: EmailStr
    contrasena: str
    telefono: Optional[str] = None
    direccion: Optional[str] = None


class UserLogin(BaseModel):
    correo: EmailStr
    contrasena: str
    tipo_usuario: str  # 'clientes' | 'empleados' | 'administradores'


class UserLoginAuto(BaseModel):
    correo: EmailStr
    contrasena: str


class UserResponse(BaseModel):
    id_cliente: int
    nombre: str
    correo: str
    estado: int
    fecha_registro: Optional[datetime] = None

    class Config:
        from_attributes = True