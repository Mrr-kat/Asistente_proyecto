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
            codigo_ant.utilizado = True
        
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
        
        # EN RAILWAY: Mostrar siempre el código en logs
        print("=" * 60)
        print("📧 RECUPERACIÓN DE CONTRASEÑA")
        print("=" * 60)
        print(f"Usuario: {usuario.usuario}")
        print(f"Correo del usuario: {usuario.correo}")
        print(f"Código generado: {codigo}")
        print(f"Expira en: 1 hora")
        print("=" * 60)
        
        # Intentar enviar correo si hay configuración
        envio_exitoso = AuthService._intentar_enviar_correo(usuario.correo, usuario.usuario, codigo)
        
        # Enmascarar correo para mostrar al usuario
        correo_parts = usuario.correo.split('@')
        if len(correo_parts) == 2:
            username = correo_parts[0]
            domain = correo_parts[1]
            if len(username) > 2:
                masked_email = f"{username[0]}***{username[-1]}@{domain}"
            else:
                masked_email = f"***@{domain}"
        else:
            masked_email = usuario.correo
        
        return {
            "usuario": usuario.usuario,
            "correo": masked_email,
            "envio_exitoso": envio_exitoso
        }
    
    @staticmethod
    def _intentar_enviar_correo(destinatario: str, usuario: str, codigo: str) -> bool:
        """Intentar enviar correo usando diferentes métodos"""
        # 1. Intentar con Resend si está configurado
        resend_api_key = os.getenv("RESEND_API_KEY")
        if resend_api_key:
            try:
                import resend
                resend.api_key = resend_api_key
                
                params = {
                    "from": "hohayod@gmail.com",
                    "to": [destinatario],
                    "subject": "Código de recuperación - Asistente Virtual",
                    "html": f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333; background: #f4f4f4; padding: 20px; border-radius: 10px 10px 0 0;">
                            🔐 Recuperación de Contraseña
                        </h2>
                        <div style="padding: 30px; background: white; border: 1px solid #ddd;">
                            <p>Hola <strong>{usuario}</strong>,</p>
                            <p>Has solicitado recuperar tu contraseña en el Asistente Virtual.</p>
                            <div style="background: #f9f9f9; padding: 25px; text-align: center; margin: 20px 0; border-radius: 8px; border: 2px dashed #4CAF50;">
                                <div style="font-size: 36px; font-weight: bold; color: #333; letter-spacing: 10px;">
                                    {codigo}
                                </div>
                            </div>
                            <p>Este código expirará en <strong>1 hora</strong>.</p>
                            <p>Si no solicitaste este código, ignora este mensaje.</p>
                            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
                                <p>Equipo del Asistente Virtual</p>
                            </div>
                        </div>
                    </div>
                    """
                }
                
                resend.Emails.send(params)
                print(f"✅ Correo enviado via Resend desde hohayod@gmail.com a {destinatario}")
                return True
                
            except Exception as e:
                print(f"⚠️ Resend falló: {e}")
        
        # 2. Intentar con SMTP tradicional
        remitente = os.getenv("CORRE_USU", "")
        password = os.getenv("CORREO_CON", "")
        
        if remitente and password:
            try:
                mensaje = MIMEMultipart()
                mensaje["From"] = "Asistente Virtual <hohayod@gmail.com>"
                mensaje["To"] = destinatario
                mensaje["Subject"] = "Código de recuperación - Asistente Virtual"
                
                cuerpo = f"""
                <h3>🔐 Recuperación de Contraseña</h3>
                <p>Hola <strong>{usuario}</strong>,</p>
                <p>Tu código de recuperación es:</p>
                <p style="font-size: 24px; font-weight: bold; color: #4CAF50;">{codigo}</p>
                <p>Válido por 1 hora.</p>
                <p>Equipo del Asistente Virtual</p>
                """
                
                mensaje.attach(MIMEText(cuerpo, "html"))
                
                with smtplib.SMTP("smtp.gmail.com", 587, timeout=10) as server:
                    server.starttls()
                    server.login(remitente, password)
                    server.send_message(mensaje)
                
                print(f"✅ Correo enviado via Gmail SMTP a {destinatario}")
                return True
                
            except Exception as e:
                print(f"⚠️ SMTP Gmail falló: {e}")
        
        # 3. Si todo falla, solo mostrar en logs (modo desarrollo)
        print(f"📧 [MODO DESARROLLO] El código {codigo} fue mostrado en logs para {usuario}")
        return False
    
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