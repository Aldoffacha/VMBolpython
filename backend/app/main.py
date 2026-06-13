from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# 👇 routers
from app.routes.auth import router as auth_router
from app.routes.admin import router as admin_router
from app.routes.productos import router as productos_router
from app.routes.pagos import router as pagos_router
from app.routes.pedidos import router as pedidos_router
from app.routes.reportes import router as reportes_router
from app.routes.auditoria import router as auditoria_router
from app.routes.configuracion import router as configuracion_router
from app.routes.cliente import router as cliente_router
from app.routes.notificaciones import router as notificaciones_router
from app.routes.admin_productos_externos import router as admin_productos_externos_router
from app.routes.recomendaciones import router as recomendaciones_router
from app.routes.publico import router as publico_router
from app.routes.empleado import router as empleado_router
from app.routes.chat import router as chat_router

# ✅ SOLO UNA VEZ
app = FastAPI(title="VMBol en Red API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ routers
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(productos_router)
app.include_router(pagos_router)
app.include_router(pedidos_router)
app.include_router(reportes_router)
app.include_router(auditoria_router)
app.include_router(configuracion_router)
app.include_router(cliente_router)
app.include_router(notificaciones_router)
app.include_router(admin_productos_externos_router)
app.include_router(recomendaciones_router)
app.include_router(publico_router)
app.include_router(empleado_router)
app.include_router(chat_router)

# ✅ archivos estáticos
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/uploads/payments", StaticFiles(directory="uploads/payments"), name="payments")
app.mount("/uploads/qr", StaticFiles(directory="uploads/qr"), name="qr")

# ✅ test
@app.get("/")
def root():
    return {"message": "API VMBol en Red funcionando"}