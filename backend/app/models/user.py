from sqlalchemy import (
    Column, Integer, SmallInteger, String, Text, Numeric,
    DateTime, Date, Boolean, Double, Float, ForeignKey, Index
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


# ─────────────────────────────────────────────
#  USUARIOS
# ─────────────────────────────────────────────

class Administrador(Base):
    __tablename__ = "administradores"

    id_admin        = Column(Integer, primary_key=True, index=True)
    nombre          = Column(String(100), nullable=False)
    correo          = Column(String(100), unique=True, nullable=False)
    contrasena      = Column(String(255), nullable=False)
    estado          = Column(SmallInteger, default=1)
    fecha_registro  = Column(DateTime, server_default=func.now())


class Empleado(Base):
    __tablename__ = "empleados"

    id_empleado     = Column(Integer, primary_key=True, index=True)
    nombre          = Column(String(100), nullable=False)
    correo          = Column(String(100), unique=True, nullable=False)
    contrasena      = Column(String(255), nullable=False)
    telefono        = Column(String(20))
    estado          = Column(SmallInteger, default=1)
    fecha_registro  = Column(DateTime, server_default=func.now())

    pedidos_asignados   = relationship("PedidoEmpleado", back_populates="empleado")
    seguimientos        = relationship("PedidoSeguimiento", back_populates="empleado")
    ubicaciones         = relationship("UbicacionEmpleado", back_populates="empleado")
    ubicacion_temporal  = relationship("UbicacionEmpleadoTemporal", back_populates="empleado")
    tracking            = relationship("EmpleadoUbicacionTracking", back_populates="empleado")


class Cliente(Base):
    __tablename__ = "clientes"

    id_cliente      = Column(Integer, primary_key=True, index=True)
    nombre          = Column(String(100), nullable=False)
    correo          = Column(String(100), unique=True, nullable=False)
    contrasena      = Column(String(255), nullable=False)
    telefono        = Column(String(20))
    direccion       = Column(String(200))
    estado          = Column(SmallInteger, default=1)
    fecha_registro  = Column(DateTime, server_default=func.now())
    foto_perfil     = Column(String(255), nullable=True)

    pedidos             = relationship("Pedido", back_populates="cliente")
    carrito             = relationship("Carrito", back_populates="cliente")
    carrito_externo     = relationship("CarritoExterno", back_populates="cliente")
    cotizaciones        = relationship("Cotizacion", back_populates="cliente")
    productos_externos  = relationship("ProductoExterno", back_populates="cliente")
    ubicaciones_entrega = relationship("UbicacionEntrega", back_populates="cliente")


# ─────────────────────────────────────────────
#  PRODUCTOS
# ─────────────────────────────────────────────

class Producto(Base):
    __tablename__ = "productos"

    id_producto     = Column(Integer, primary_key=True, index=True)
    nombre          = Column(String(150), nullable=False)
    descripcion     = Column(Text)
    precio          = Column(Numeric(10, 2), nullable=False)
    stock           = Column(Integer, nullable=False, default=0)
    imagen          = Column(String(200))
    estado          = Column(SmallInteger, default=1)
    fecha_registro  = Column(DateTime, server_default=func.now())
    categoria       = Column(String(50), default="otros")
    tipo_cambio     = Column(Float, default=9.17)

    carrito         = relationship("Carrito", back_populates="producto")
    inventario      = relationship("Inventario", back_populates="producto")
    ofertas         = relationship("Oferta", back_populates="producto")
    pedido_detalles = relationship("PedidoDetalle", back_populates="producto")


class ProductoExterior(Base):
    """Productos importados que el admin agrega manualmente."""
    __tablename__ = "productos_exterior"

    id_producto_exterior = Column(Integer, primary_key=True, index=True)
    nombre               = Column(String(255), nullable=False)
    descripcion          = Column(Text)
    precio               = Column(Numeric(10, 2), nullable=False)
    categoria            = Column(String(50), nullable=False)
    plataforma           = Column(String(20), nullable=False)
    enlace               = Column(Text, nullable=False)
    imagen               = Column(Text)
    peso                 = Column(Numeric(5, 2), default=0.50)
    estado               = Column(Integer, default=1)
    destacado            = Column(Integer, default=1)
    fecha_agregado       = Column(DateTime, server_default=func.now())
    fecha_actualizacion  = Column(DateTime, server_default=func.now(), onupdate=func.now())
    tipo_cambio          = Column(Float, default=9.17)


class ProductoExterno(Base):
    """Productos que los clientes importan desde tiendas USA."""
    __tablename__ = "productos_externos"

    id_producto_externo = Column(Integer, primary_key=True, index=True)
    id_cliente          = Column(Integer, ForeignKey("clientes.id_cliente"), nullable=False)
    id_tienda           = Column(Integer, ForeignKey("tiendas_usa.id_tienda"), nullable=False)
    nombre              = Column(String(255), nullable=False)
    descripcion         = Column(Text)
    precio              = Column(Numeric(10, 2), nullable=False)
    precio_original     = Column(Numeric(10, 2), nullable=False)
    categoria           = Column(String(50), nullable=False)
    plataforma          = Column(String(20), nullable=False)
    imagen              = Column(String(500))
    enlace              = Column(String(1000), nullable=False)
    peso                = Column(Numeric(8, 2), default=0.5)
    stock               = Column(Integer, default=1)
    estado              = Column(SmallInteger, default=1)
    fecha_registro      = Column(DateTime, server_default=func.now())

    cliente = relationship("Cliente", back_populates="productos_externos")
    tienda  = relationship("TiendaUSA", back_populates="productos_externos")


# ─────────────────────────────────────────────
#  TIENDAS & DEPÓSITOS
# ─────────────────────────────────────────────

class TiendaUSA(Base):
    __tablename__ = "tiendas_usa"

    id_tienda       = Column(Integer, primary_key=True, index=True)
    nombre_tienda   = Column(String(100), nullable=False)
    url_tienda      = Column(String(255))
    tipo            = Column(String(7), nullable=False)
    api_key         = Column(String(255))
    estado          = Column(SmallInteger, default=1)
    fecha_registro  = Column(DateTime, server_default=func.now())

    productos_externos = relationship("ProductoExterno", back_populates="tienda")


class DepositoMiami(Base):
    __tablename__ = "depositos_miami"

    id_deposito     = Column(Integer, primary_key=True, index=True)
    nombre_deposito = Column(String(100), nullable=False)
    direccion       = Column(Text, nullable=False)
    telefono        = Column(String(20))
    contacto        = Column(String(100))
    estado          = Column(SmallInteger, default=1)
    fecha_registro  = Column(DateTime, server_default=func.now())

    inventario = relationship("Inventario", back_populates="deposito")


# ─────────────────────────────────────────────
#  INVENTARIO & OFERTAS
# ─────────────────────────────────────────────

class Inventario(Base):
    __tablename__ = "inventario"

    id_inventario       = Column(Integer, primary_key=True, index=True)
    id_producto         = Column(Integer, ForeignKey("productos.id_producto"), nullable=False)
    id_deposito         = Column(Integer, ForeignKey("depositos_miami.id_deposito"), nullable=False)
    cantidad            = Column(Integer, nullable=False, default=0)
    cantidad_minima     = Column(Integer, default=5)
    ubicacion           = Column(String(100))
    fecha_actualizacion = Column(DateTime, server_default=func.now(), onupdate=func.now())

    producto = relationship("Producto", back_populates="inventario")
    deposito = relationship("DepositoMiami", back_populates="inventario")


class Oferta(Base):
    __tablename__ = "ofertas"

    id_oferta              = Column(Integer, primary_key=True, index=True)
    id_producto            = Column(Integer, ForeignKey("productos.id_producto"), nullable=False)
    porcentaje_descuento   = Column(Numeric(5, 2), nullable=False)
    fecha_inicio           = Column(Date, nullable=False)
    fecha_fin              = Column(Date, nullable=False)
    estado                 = Column(SmallInteger, default=1)

    producto = relationship("Producto", back_populates="ofertas")


# ─────────────────────────────────────────────
#  CARRITO
# ─────────────────────────────────────────────

class Carrito(Base):
    __tablename__ = "carrito"

    id_carrito          = Column(Integer, primary_key=True, index=True)
    id_cliente          = Column(Integer, ForeignKey("clientes.id_cliente"), nullable=False)
    id_producto         = Column(Integer, ForeignKey("productos.id_producto"), nullable=True)
    cantidad            = Column(Integer, nullable=False, default=1)
    fecha_agregado      = Column(DateTime, server_default=func.now())
    es_externo          = Column(SmallInteger, default=0)
    url_externo         = Column(Text)
    nombre_externo      = Column(String(255))
    id_producto_externo = Column(Integer, nullable=True)
    tipo_producto       = Column(String(10), default="local")

    cliente  = relationship("Cliente", back_populates="carrito")
    producto = relationship("Producto", back_populates="carrito")


class CarritoExterno(Base):
    __tablename__ = "carrito_externo"

    id_carrito_externo  = Column(Integer, primary_key=True, index=True)
    id_cliente          = Column(Integer, ForeignKey("clientes.id_cliente"), nullable=False)
    id_producto_externo = Column(String(100), nullable=False)
    nombre              = Column(String(255), nullable=False)
    precio              = Column(Numeric(10, 2), nullable=False)
    peso                = Column(Numeric(5, 2), nullable=False, default=0.50)
    categoria           = Column(String(50), nullable=False)
    plataforma          = Column(String(20), nullable=False)
    url                 = Column(Text, nullable=False)
    cantidad            = Column(Integer, nullable=False, default=1)
    estado              = Column(String(9), default="pendiente")
    fecha_agregado      = Column(DateTime, server_default=func.now())

    cliente = relationship("Cliente", back_populates="carrito_externo")


# ─────────────────────────────────────────────
#  PEDIDOS
# ─────────────────────────────────────────────

class Pedido(Base):
    __tablename__ = "pedidos"

    id_pedido       = Column(Integer, primary_key=True, index=True)
    id_cliente      = Column(Integer, ForeignKey("clientes.id_cliente"), nullable=False)
    total           = Column(Numeric(10, 2), nullable=False)
    estado          = Column(String(9), default="pendiente")
    fecha           = Column(DateTime, server_default=func.now())
    tipo_pedido     = Column(String(10), default="local")
    estado_entrega  = Column(String(20), default="sin_asignar")
    tipo_cambio     = Column(Float, default=9.17)

    cliente             = relationship("Cliente", back_populates="pedidos")
    detalles            = relationship("PedidoDetalle", back_populates="pedido")
    pagos               = relationship("Pago", back_populates="pedido")
    envio               = relationship("EnvioImportacion", back_populates="pedido")
    empleados_asignados = relationship("PedidoEmpleado", back_populates="pedido")
    seguimiento         = relationship("PedidoSeguimiento", back_populates="pedido")
    ubicacion_entrega   = relationship("UbicacionEntrega", back_populates="pedido", uselist=False)
    ubicaciones_empleado = relationship("UbicacionEmpleado", back_populates="pedido")
    tracking            = relationship("EmpleadoUbicacionTracking", back_populates="pedido")


class PedidoDetalle(Base):
    __tablename__ = "pedido_detalles"

    id_detalle      = Column(Integer, primary_key=True, index=True)
    id_pedido       = Column(Integer, ForeignKey("pedidos.id_pedido"), nullable=False)
    id_producto     = Column(Integer, ForeignKey("productos.id_producto"), nullable=True)
    cantidad        = Column(Integer, nullable=False)
    precio          = Column(Numeric(10, 2), nullable=False)
    tipo_producto   = Column(String(10), default="local")
    datos_externos  = Column(Text)

    pedido  = relationship("Pedido", back_populates="detalles")
    producto = relationship("Producto", back_populates="pedido_detalles")


class PedidoEmpleado(Base):
    __tablename__ = "pedido_empleado"

    id               = Column(Integer, primary_key=True, index=True)
    id_pedido        = Column(Integer, ForeignKey("pedidos.id_pedido"), nullable=False)
    id_empleado      = Column(Integer, ForeignKey("empleados.id_empleado"), nullable=False)
    estado           = Column(String(15), default="asignado")
    fecha_asignacion = Column(DateTime, server_default=func.now())

    pedido   = relationship("Pedido", back_populates="empleados_asignados")
    empleado = relationship("Empleado", back_populates="pedidos_asignados")


class PedidoSeguimiento(Base):
    __tablename__ = "pedido_seguimiento"

    id_seguimiento  = Column(Integer, primary_key=True, index=True)
    id_pedido       = Column(Integer, ForeignKey("pedidos.id_pedido"), nullable=False)
    id_empleado     = Column(Integer, ForeignKey("empleados.id_empleado"), nullable=True)
    estado_entrega  = Column(String(20), default="aceptado")
    fecha_inicio    = Column(DateTime, server_default=func.now())
    fecha_entrega   = Column(DateTime, nullable=True)

    pedido   = relationship("Pedido", back_populates="seguimiento")
    empleado = relationship("Empleado", back_populates="seguimientos")


# ─────────────────────────────────────────────
#  PAGOS & ENVÍOS
# ─────────────────────────────────────────────

class Pago(Base):
    __tablename__ = "pagos"

    id_pago     = Column(Integer, primary_key=True, index=True)
    id_pedido   = Column(Integer, ForeignKey("pedidos.id_pedido"), nullable=False)
    monto       = Column(Numeric(10, 2), nullable=False)
    metodo      = Column(String(13), nullable=False)
    codigo_qr   = Column(String(255))
    fecha_pago  = Column(DateTime, server_default=func.now())
    estado      = Column(String(10), default="pendiente")
    comprobante = Column(String(255))

    pedido = relationship("Pedido", back_populates="pagos")


class EnvioImportacion(Base):
    __tablename__ = "envios_importacion"

    id_envio                = Column(Integer, primary_key=True, index=True)
    id_pedido               = Column(Integer, ForeignKey("pedidos.id_pedido"), nullable=False)
    guia_aerea              = Column(String(100))
    fecha_salida_miami      = Column(Date)
    fecha_llegada_bolivia   = Column(Date)
    fecha_entrega_cliente   = Column(Date)
    aerolinea               = Column(String(100))
    peso_total              = Column(Numeric(10, 2))
    estado                  = Column(String(11), default="en_miami")
    observaciones           = Column(Text)

    pedido = relationship("Pedido", back_populates="envio")


# ─────────────────────────────────────────────
#  COTIZACIONES
# ─────────────────────────────────────────────

class Cotizacion(Base):
    __tablename__ = "cotizaciones"

    id_cotizacion   = Column(Integer, primary_key=True, index=True)
    id_cliente      = Column(Integer, ForeignKey("clientes.id_cliente"), nullable=False)
    nombre_producto = Column(String(200), nullable=False)
    precio_base     = Column(Numeric(10, 2), nullable=False)
    peso            = Column(Numeric(10, 2), nullable=False)
    categoria       = Column(String(50), nullable=False)
    tamano          = Column(String(50), nullable=False)
    costo_flete     = Column(Numeric(10, 2), nullable=False)
    costo_aduana    = Column(Numeric(10, 2), nullable=False)
    costo_almacen   = Column(Numeric(10, 2), nullable=False)
    costo_seguro    = Column(Numeric(10, 2), nullable=False)
    costo_total     = Column(Numeric(10, 2), nullable=False)
    estado          = Column(String(9), default="pendiente")
    fecha           = Column(DateTime, server_default=func.now())

    cliente = relationship("Cliente", back_populates="cotizaciones")


# ─────────────────────────────────────────────
#  UBICACIONES
# ─────────────────────────────────────────────

class UbicacionEntrega(Base):
    __tablename__ = "ubicacion_entrega"

    id                  = Column(Integer, primary_key=True, index=True)
    id_pedido           = Column(Integer, ForeignKey("pedidos.id_pedido"), unique=True, nullable=False)
    id_cliente          = Column(Integer, ForeignKey("clientes.id_cliente"), nullable=False)
    direccion_entrega   = Column(Text, nullable=False)
    latitud             = Column(Double, nullable=False)
    longitud            = Column(Double, nullable=False)
    referencia          = Column(Text)
    nombre_receptor     = Column(String(100))
    telefono_receptor   = Column(String(20))
    fecha_creacion      = Column(DateTime, server_default=func.now())

    pedido  = relationship("Pedido", back_populates="ubicacion_entrega")
    cliente = relationship("Cliente", back_populates="ubicaciones_entrega")


class UbicacionEmpleado(Base):
    __tablename__ = "ubicacion_empleado"

    id                  = Column(Integer, primary_key=True, index=True)
    id_empleado         = Column(Integer, ForeignKey("empleados.id_empleado"), nullable=False)
    id_pedido           = Column(Integer, ForeignKey("pedidos.id_pedido"), nullable=False)
    latitud             = Column(Double)
    longitud            = Column(Double)
    activo              = Column(Boolean, default=False)
    fecha               = Column(DateTime, server_default=func.now())
    velocidad           = Column(Double, default=0)
    direccion_movimiento = Column(Double)
    precision_gps       = Column(Double)
    bateria             = Column(Integer)

    empleado = relationship("Empleado", back_populates="ubicaciones")
    pedido   = relationship("Pedido", back_populates="ubicaciones_empleado")


class UbicacionEmpleadoTemporal(Base):
    __tablename__ = "ubicacion_empleado_temporal"

    id                  = Column(Integer, primary_key=True, index=True)
    id_empleado         = Column(Integer, ForeignKey("empleados.id_empleado"), nullable=False)
    latitud             = Column(Double, nullable=False)
    longitud            = Column(Double, nullable=False)
    fecha_actualizacion = Column(DateTime, server_default=func.now())

    empleado = relationship("Empleado", back_populates="ubicacion_temporal")


class EmpleadoUbicacionTracking(Base):
    __tablename__ = "empleado_ubicaciones_tracking"

    id_tracking = Column(Integer, primary_key=True, index=True)
    id_empleado = Column(Integer, ForeignKey("empleados.id_empleado"), nullable=False)
    id_pedido   = Column(Integer, ForeignKey("pedidos.id_pedido"), nullable=False)
    latitud     = Column(Numeric(10, 8), nullable=False)
    longitud    = Column(Numeric(11, 8), nullable=False)
    fecha_hora  = Column(DateTime, server_default=func.now())

    empleado = relationship("Empleado", back_populates="tracking")
    pedido   = relationship("Pedido", back_populates="tracking")


# ─────────────────────────────────────────────
#  AUDITORÍA & LOGS
# ─────────────────────────────────────────────

class Auditoria(Base):
    __tablename__ = "auditoria"

    id_auditoria    = Column(Integer, primary_key=True, index=True)
    tabla_afectada  = Column(String(50), nullable=False)
    id_registro     = Column(Integer, nullable=False)
    accion          = Column(String(6), nullable=False)
    datos_anteriores = Column(Text)
    datos_nuevos    = Column(Text)
    id_usuario      = Column(Integer)
    tipo_usuario    = Column(String(20))
    fecha_auditoria = Column(DateTime, server_default=func.now())
    ip_address      = Column(String(45))


class Login(Base):
    __tablename__ = "logins"

    id          = Column(Integer, primary_key=True, index=True)
    usuario_id  = Column(String(50))
    correo      = Column(String(255))
    tipo_usuario = Column(String(20))
    ip_address  = Column(String(45))
    equipo      = Column(String(100))
    user_agent  = Column(Text)
    fecha_login = Column(DateTime)


# ─────────────────────────────────────────────
#  NOTIFICACIONES & CONFIGURACIÓN
# ─────────────────────────────────────────────

class Notificacion(Base):
    __tablename__ = "notificaciones"

    id_notificacion = Column(Integer, primary_key=True, index=True)
    id_usuario      = Column(Integer, nullable=False)
    tipo_usuario    = Column(String(20), nullable=False)
    titulo          = Column(String(255), nullable=False)
    mensaje         = Column(Text, nullable=False)
    tipo            = Column(String(20), nullable=False)
    leido           = Column(Boolean, default=False)
    fecha_creacion  = Column(DateTime, server_default=func.now())
    enlace          = Column(String(255))
    meta_data       = Column("metadata", JSONB)


class MensajeChat(Base):
    __tablename__ = "mensajes_chat"

    id              = Column(Integer, primary_key=True, index=True)
    id_pedido       = Column(Integer, ForeignKey("pedidos.id_pedido"), nullable=False)
    remitente_id    = Column(Integer, nullable=False)
    remitente_tipo  = Column(String(20), nullable=False)
    mensaje         = Column(Text, nullable=False)
    fecha_creacion  = Column(DateTime, server_default=func.now())
    leido           = Column(Boolean, default=False)


class Configuracion(Base):
    __tablename__ = "configuracion"

    id                  = Column(Integer, primary_key=True, default=1)
    nombre_empresa      = Column(String(255), nullable=False, default="VMBol en Red")
    email_contacto      = Column(String(255), nullable=False, default="info@vmbol.com")
    telefono_contacto   = Column(String(50), nullable=False, default="+591 777 12345")
    moneda              = Column(String(10), nullable=False, default="USD")
    tipo_cambio         = Column(Float, default=9.17)
    tipo_cambio_actualizacion = Column(DateTime, nullable=True)
    fecha_actualizacion = Column(DateTime, server_default=func.now(), onupdate=func.now())
    qr_filename         = Column(String(255))