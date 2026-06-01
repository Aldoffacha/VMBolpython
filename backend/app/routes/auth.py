from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.user_schema import UserRegister, UserLogin, UserLoginAuto, UserResponse
from app.services.auth_service import create_user, login_user, login_user_auto
from app.utils.jwt import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse)
def register(user: UserRegister, db: Session = Depends(get_db)):
    new_user = create_user(db, user)
    if not new_user:
        raise HTTPException(status_code=400, detail="Correo ya registrado")
    return new_user


@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    """
    Body esperado:
    {
        "correo": "user@example.com",
        "contrasena": "secreto123",
        "tipo_usuario": "clientes" | "empleados" | "administradores"
    }
    """
    tipos_validos = ["clientes", "empleados", "administradores"]
    if user.tipo_usuario not in tipos_validos:
        raise HTTPException(status_code=400, detail="Tipo de usuario inválido")

    auth_user = login_user(db, user.correo, user.contrasena, user.tipo_usuario)

    if not auth_user:
        raise HTTPException(
            status_code=401,
            detail="Credenciales incorrectas o usuario inactivo"
        )

    # Generar JWT con los datos del usuario
    token = create_access_token(data={
        "sub": str(auth_user["id"]),
        "nombre": auth_user["nombre"],
        "correo": auth_user["correo"],
        "tipo_usuario": auth_user["tipo_usuario"],
    })

    redirect_map = {
        "administrador": "/admin/dashboard",
        "empleado": "/empleado/dashboard",
        "cliente": "/cliente/dashboard",
    }

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": auth_user,
        "redirect": redirect_map.get(auth_user["tipo_usuario"], "/")
    }


@router.post("/login/auto")
def login_auto(
    user: UserLoginAuto,
    db: Session = Depends(get_db)
):
    """
    Login automático: detecta el rol del usuario
    probando cliente → empleado → administrador.
    """
    auth_user = login_user_auto(db, user.correo, user.contrasena)

    if not auth_user:
        raise HTTPException(
            status_code=401,
            detail="Credenciales incorrectas o usuario inactivo"
        )

    token = create_access_token(data={
        "sub": str(auth_user["id"]),
        "nombre": auth_user["nombre"],
        "correo": auth_user["correo"],
        "tipo_usuario": auth_user["tipo_usuario"],
    })

    redirect_map = {
        "administrador": "/admin/dashboard",
        "empleado": "/empleado/dashboard",
        "cliente": "/cliente/dashboard",
    }

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": auth_user,
        "redirect": redirect_map.get(auth_user["tipo_usuario"], "/")
    }