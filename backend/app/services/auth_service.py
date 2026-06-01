from sqlalchemy.orm import Session
from app.models.user import Cliente, Empleado, Administrador
from app.utils.security import hash_password, verify_password


def create_user(db: Session, data):
    user = db.query(Cliente).filter(Cliente.correo == data.correo).first()
    if user:
        return None

    new_user = Cliente(
        nombre=data.nombre,
        correo=data.correo,
        contrasena=hash_password(data.contrasena),
        telefono=data.telefono,
        direccion=data.direccion
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


def login_user(db: Session, correo: str, contrasena: str, tipo_usuario: str):
    """
    Autentica un usuario según su tipo.
    tipo_usuario: 'clientes' | 'empleados' | 'administradores'
    Retorna un dict con los datos del usuario o None si falla.
    """

    if tipo_usuario == "clientes":
        user = db.query(Cliente).filter(
            Cliente.correo == correo,
            Cliente.estado == 1
        ).first()

        if not user or not verify_password(contrasena, user.contrasena):
            return None

        return {
            "id": user.id_cliente,
            "nombre": user.nombre,
            "correo": user.correo,
            "tipo_usuario": "cliente"
        }

    elif tipo_usuario == "empleados":
        user = db.query(Empleado).filter(
            Empleado.correo == correo,
            Empleado.estado == 1
        ).first()

        if not user or not verify_password(contrasena, user.contrasena):
            return None

        return {
            "id": user.id_empleado,
            "nombre": user.nombre,
            "correo": user.correo,
            "tipo_usuario": "empleado"
        }

    elif tipo_usuario == "administradores":
        user = db.query(Administrador).filter(
            Administrador.correo == correo,
            Administrador.estado == 1
        ).first()

        if not user or not verify_password(contrasena, user.contrasena):
            return None

        return {
            "id": user.id_admin,
            "nombre": user.nombre,
            "correo": user.correo,
            "tipo_usuario": "administrador"
        }

    return None


def login_user_auto(db: Session, correo: str, contrasena: str):
    for modelo, tipo, id_field in [
        (Cliente, "cliente", "id_cliente"),
        (Empleado, "empleado", "id_empleado"),
        (Administrador, "administrador", "id_admin"),
    ]:
        user = db.query(modelo).filter(
            modelo.correo == correo,
            modelo.estado == 1
        ).first()
        if user and verify_password(contrasena, user.contrasena):
            return {
                "id": getattr(user, id_field),
                "nombre": user.nombre,
                "correo": user.correo,
                "tipo_usuario": tipo,
            }
    return None