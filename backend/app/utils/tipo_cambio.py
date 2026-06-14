from sqlalchemy.orm import Session
from sqlalchemy import text

TIPO_CAMBIO_DEFAULT = 9.17

def get_tipo_cambio(db: Session) -> float:
    try:
        result = db.execute(
            text("SELECT tipo_cambio FROM configuracion LIMIT 1")
        ).scalar()
        if result:
            return float(result)
    except Exception:
        pass
    return TIPO_CAMBIO_DEFAULT
