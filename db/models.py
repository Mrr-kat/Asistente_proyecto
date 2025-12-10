# db/models.py
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime, timedelta
import os
import random
from dotenv import load_dotenv

load_dotenv()

# Configuración de la base de datos (Railway usa DATABASE_URL)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///asistente_virtual.db")

# Manejar correctamente las URLs de PostgreSQL
if DATABASE_URL.startswith("postgresql://"):
    # Convertir postgresql:// a postgresql+psycopg2:// para SQLAlchemy
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

# Configurar motor según el tipo de base de datos
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL, 
        connect_args={"check_same_thread": False},
        echo=False  # Desactivar logs en producción
    )
else:
    # Para PostgreSQL en Railway
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,  # Reciclar conexiones cada 5 minutos
        echo=False
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Usuario(Base):
    __tablename__ = "usuarios"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre_completo = Column(String(200), nullable=False)
    usuario = Column(String(100), unique=True, nullable=False, index=True)
    correo = Column(String(150), unique=True, nullable=False)
    contraseña = Column(String(200), nullable=False)
    fecha_registro = Column(DateTime, default=datetime.now)
    activo = Column(Boolean, default=True)
    
    # Relación con el historial
    historial = relationship("HistorialInteraccion", back_populates="usuario", cascade="all, delete-orphan")
    recuperaciones = relationship("RecuperacionContraseña", back_populates="usuario", cascade="all, delete-orphan")
    estadisticas = relationship("EstadisticasUsuario", back_populates="usuario", cascade="all, delete-orphan")

class RecuperacionContraseña(Base):
    __tablename__ = "recuperaciones_contraseña"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    codigo = Column(String(6), nullable=False)
    fecha_creacion = Column(DateTime, default=datetime.now)
    expiracion = Column(DateTime, default=lambda: datetime.now() + timedelta(hours=1))
    utilizado = Column(Boolean, default=False)
    
    usuario = relationship("Usuario", back_populates="recuperaciones")

class HistorialInteraccion(Base):
    __tablename__ = "historial_interacciones"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=True)
    comando_usuario = Column(String(500), nullable=False)
    comando_ejecutado = Column(String(100), nullable=False)
    respuesta_asistente = Column(Text, nullable=False)
    fecha_hora = Column(DateTime, default=datetime.now, index=True)  # Agregado índice
    activo = Column(Boolean, default=True)
    
    # Relación con el usuario
    usuario = relationship("Usuario", back_populates="historial")
    
    def to_dict(self):
        return {
            "id": self.id,
            "usuario_id": self.usuario_id,
            "comando_usuario": self.comando_usuario,
            "comando_ejecutado": self.comando_ejecutado,
            "respuesta_asistente": self.respuesta_asistente,
            "fecha_hora": self.fecha_hora.strftime("%d/%m/%Y %I:%M%p"),
            "activo": self.activo
        }

class EstadisticasUsuario(Base):
    __tablename__ = "estadisticas_usuario"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    fecha = Column(DateTime, default=datetime.now, index=True)  # Agregado índice
    comandos_ejecutados = Column(Integer, default=0)
    tiempo_uso_minutos = Column(Integer, default=0)
    comandos_exitosos = Column(Integer, default=0)
    comandos_fallidos = Column(Integer, default=0)
    
    usuario = relationship("Usuario", back_populates="estadisticas")

def init_db():
    """Inicializar base de datos (llamar al inicio de la app)"""
    try:
        # Crear todas las tablas
        Base.metadata.create_all(bind=engine)
        print("✅ Base de datos inicializada correctamente")
    except Exception as e:
        print(f"❌ Error inicializando base de datos: {e}")
        raise

# Inicializar base de datos al importar
init_db()

def get_db():
    """Dependencia para obtener sesión de base de datos"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()