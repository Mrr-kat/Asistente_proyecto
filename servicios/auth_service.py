# servicios/auth_service.py
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from sqlalchemy.orm import Session
from db.models import Usuario, RecuperacionContraseña
from datetime import datetime, timedelta
import random
import string
from typing import Optional
import os
from dotenv import load_dotenv

# Cargar archivo env
load_dotenv("key/key.env")

class AuthService:
    
    @staticmethod
    def registrar_usuario(db: Session, nombre_completo: str, usuario: str, correo: str, contraseña: str):
        """Registrar un nuevo usuario"""
        # Verificar si el usuario o correo ya existen
        usuario_existente = db.query(Usuario).filter(
            (Usuario.usuario == usuario) | (Usuario.correo == correo)
        ).first()
        
        if usuario_existente:
            if usuario_existente.usuario == usuario:
                raise ValueError("El nombre de usuario ya está en uso")
            else:
                raise ValueError("El correo electrónico ya está registrado")
        
        # Crear nuevo usuario
        nuevo_usuario = Usuario(
            nombre_completo=nombre_completo,
            usuario=usuario,
            correo=correo,
            contraseña=contraseña  # Nota: En producción deberías usar hashing
        )
        
        db.add(nuevo_usuario)
        db.commit()
        db.refresh(nuevo_usuario)
        
        return nuevo_usuario
    
    @staticmethod
    def autenticar_usuario(db: Session, usuario: str, contraseña: str) -> Optional[Usuario]:
        """Autenticar un usuario"""
        usuario_db = db.query(Usuario).filter(
            Usuario.usuario == usuario,
            Usuario.activo == True
        ).first()
        
        if usuario_db and usuario_db.contraseña == contraseña:
            return usuario_db
        
        return None
    
    # Modifica la función generar_codigo_recuperacion
    @staticmethod
    def generar_codigo_recuperacion(db: Session, usuario_o_correo: str):
        """Generar código de recuperación de contraseña"""
        # Buscar usuario
        usuario = db.query(Usuario).filter(
            (Usuario.usuario == usuario_o_correo) | (Usuario.correo == usuario_o_correo),
            Usuario.activo == True
        ).first()
        
        if not usuario:
            raise ValueError("Usuario no encontrado")
        
        # Invalidar códigos anteriores no utilizados
        codigos_anteriores = db.query(RecuperacionContraseña).filter(
            RecuperacionContraseña.usuario_id == usuario.id,
            RecuperacionContraseña.utilizado == False,
            RecuperacionContraseña.expiracion > datetime.now()
        ).all()
        
        for codigo_ant in codigos_anteriores:
            codigo_ant.utilizado = True  # Marcar como utilizado
        
        # Generar nuevo código de 5 dígitos
        codigo = ''.join(random.choices(string.digits, k=5))
        
        # Crear registro de recuperación
        recuperacion = RecuperacionContraseña(
            usuario_id=usuario.id,
            codigo=codigo,
            expiracion=datetime.now() + timedelta(hours=1)
        )
        
        db.add(recuperacion)
        db.commit()
        
        # Enviar correo
        try:
            AuthService.enviar_correo_recuperacion(usuario.correo, usuario.usuario, codigo)
            envio_exitoso = True
        except Exception as e:
            print(f"Error al enviar correo: {e}")
            envio_exitoso = False
        
        return {
            "usuario": usuario.usuario,
            "correo": usuario.correo,
            "codigo": codigo if not envio_exitoso else None,  # Solo devolver en modo desarrollo
            "envio_exitoso": envio_exitoso
        }
    
    @staticmethod
    def enviar_correo_recuperacion(destinatario: str, usuario: str, codigo: str):
        """Enviar correo con código de recuperación"""
        remitente = os.getenv("CORRE_USU", "")
        password = os.getenv("CORREO_CON", "")
        
        if not remitente or not password:
            print("⚠️ Credenciales de correo no configuradas. Modo desarrollo activado.")
            print(f"📧 [MODO DESARROLLO] Código para {usuario} ({destinatario}): {codigo}")
            return True  # Retorna True para simular éxito
        
        try:
            mensaje = MIMEMultipart()
            mensaje["From"] = remitente
            mensaje["To"] = destinatario
            mensaje["Subject"] = "Recuperación de contraseña - Asistente Virtual"
            
            cuerpo = f"""
            <h2>Recuperación de Contraseña</h2>
            <p>Hola <strong>{usuario}</strong>,</p>
            <p>Has solicitado recuperar tu contraseña.</p>
            <p style="font-size: 24px; font-weight: bold; color: #4CAF50; padding: 10px; background: #f1f1f1; border-radius: 5px; text-align: center;">
            {codigo}
            </p>
            <p>Este código expirará en 1 hora.</p>
            <p>Si no solicitaste este código, ignora este mensaje.</p>
            <hr>
            <p style="color: #666; font-size: 12px;">
            Equipo del Asistente Virtual
            </p>
            """
            
            mensaje.attach(MIMEText(cuerpo, "html"))
            
            # Configurar servidor SMTP
            with smtplib.SMTP("smtp.gmail.com", 587) as server:
                server.starttls()
                server.login(remitente, password)
                server.send_message(mensaje)
            
            print(f"✅ Correo enviado a {destinatario}")
            return True
            
        except Exception as e:
            print(f"❌ Error al enviar correo: {e}")
            print(f"📧 [FALLBACK] Código para {usuario}: {codigo}")
            # En Railway, a veces el email falla, pero mostramos el código
            return True  # Retornamos True para continuar el flujo
    
    # Modifica SOLO estas funciones:

    @staticmethod
    def validar_codigo_recuperacion(db: Session, usuario_o_correo: str, codigo: str, marcar_como_utilizado: bool = True):
        """Validar código de recuperación (con opción de no marcarlo como usado)"""
        # Buscar usuario
        usuario = db.query(Usuario).filter(
            (Usuario.usuario == usuario_o_correo) | (Usuario.correo == usuario_o_correo),
            Usuario.activo == True
        ).first()
        
        if not usuario:
            raise ValueError("Usuario no encontrado")
        
        # Buscar código válido
        recuperacion = db.query(RecuperacionContraseña).filter(
            RecuperacionContraseña.usuario_id == usuario.id,
            RecuperacionContraseña.codigo == codigo,
            RecuperacionContraseña.expiracion > datetime.now(),
            RecuperacionContraseña.utilizado == False
        ).first()
        
        if not recuperacion:
            raise ValueError("Código inválido o expirado")
        
        # Marcar como utilizado solo si se indica (por defecto sí)
        if marcar_como_utilizado:
            recuperacion.utilizado = True
            db.commit()
        
        return usuario.id

    @staticmethod
    def cambiar_contraseña(db: Session, usuario_id: int, nueva_contraseña: str, codigo_recuperacion: str = None):
        """Cambiar contraseña de usuario"""
        usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
        
        if not usuario:
            raise ValueError("Usuario no encontrado")
        
        # Si es cambio por recuperación, marcar el código como usado
        if codigo_recuperacion:
            # Buscar y marcar el código como utilizado
            recuperacion = db.query(RecuperacionContraseña).filter(
                RecuperacionContraseña.usuario_id == usuario_id,
                RecuperacionContraseña.codigo == codigo_recuperacion,
                RecuperacionContraseña.expiracion > datetime.now()
            ).first()
            
            if recuperacion and not recuperacion.utilizado:
                recuperacion.utilizado = True
            elif not recuperacion:
                raise ValueError("Código de recuperación no válido")
            # Si ya estaba usado, no hacemos nada (permite reintentos)
        
        usuario.contraseña = nueva_contraseña
        db.commit()
        
        return True
       
    @staticmethod
    def obtener_usuario_por_id(db: Session, usuario_id: int):
        """Obtener usuario por ID"""
        return db.query(Usuario).filter(Usuario.id == usuario_id).first()