from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.utils.jwt import verify_token

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
) -> dict:
    token = credentials.credentials
    payload = verify_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload


def require_role(rol: str):
    """
    Uso: Depends(require_role("admin"))
    Roles válidos: 'cliente' | 'empleado' | 'administrador'
    """
    def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user.get("tipo_usuario") != rol:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado. Se requiere rol: {rol}"
            )
        return current_user
    return role_checker