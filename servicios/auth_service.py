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

# Intentar importar Resend (opcional)
try:
    import resend
    RESEND_AVAILABLE = True
except ImportError:
    RESEND_AVAILABLE = False
    print("⚠️ Resend no está instalado. Usando modo desarrollo.")

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
        
        # Enviar correo usando Resend si está disponible
        envio_exitoso = False
        resend_api_key = os.getenv("RESEND_API_KEY")
        
        if RESEND_AVAILABLE and resend_api_key:
            try:
                envio_exitoso = AuthService._enviar_con_resend(usuario.correo, usuario.usuario, codigo, resend_api_key)
            except Exception as e:
                print(f"❌ Error enviando con Resend: {e}")
                envio_exitoso = False
        
        # Si Resend falló o no está configurado, intentar con SMTP tradicional
        if not envio_exitoso:
            envio_exitoso = AuthService._enviar_con_smtp(usuario.correo, usuario.usuario, codigo)
        
        # Si todo falla, mostrar el código en consola (modo desarrollo)
        if not envio_exitoso:
            print(f"📧 [MODO DESARROLLO] Para: {usuario.usuario} ({usuario.correo})")
            print(f"📧 [MODO DESARROLLO] Código: {codigo}")
            print(f"📧 [MODO DESARROLLO] Expira en: 1 hora")
        
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
            "codigo": codigo if not envio_exitoso else None,
            "envio_exitoso": envio_exitoso
        }
    
    @staticmethod
def _enviar_con_resend(destinatario: str, usuario: str, codigo: str, api_key: str) -> bool:
    """Enviar correo usando Resend API"""
    try:
        resend.api_key = api_key
        
        params = {
            "from": "Asistente Virtual <hohayod@gmail.com>",  
            "to": [destinatario],
            "subject": "Código de recuperación - Asistente Virtual",
            "html": f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
                    .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                    .code {{ font-size: 32px; font-weight: bold; color: #4CAF50; text-align: center; padding: 20px; background: white; border-radius: 8px; margin: 20px 0; letter-spacing: 10px; }}
                    .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔐 Recuperación de Contraseña</h1>
                    </div>
                    <div class="content">
                        <p>Hola <strong>{usuario}</strong>,</p>
                        <p>Has solicitado recuperar tu contraseña en el Asistente Virtual.</p>
                        <p>Usa el siguiente código para continuar:</p>
                        
                        <div class="code">{codigo}</div>
                        
                        <p>Este código expirará en <strong>1 hora</strong>.</p>
                        <p>Si no solicitaste este código, puedes ignorar este mensaje de manera segura.</p>
                        <p>Para tu seguridad, no compartas este código con nadie.</p>
                        
                        <div class="footer">
                            <p>Equipo del Asistente Virtual</p>
                            <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """
        }
        
        response = resend.Emails.send(params)
        print(f"✅ Correo enviado desde hohayod@gmail.com a {destinatario}")
        return True
        
    except Exception as e:
        print(f"❌ Error con Resend: {e}")
        return False
    
    @staticmethod
    def _enviar_con_smtp(destinatario: str, usuario: str, codigo: str) -> bool:
        """Enviar correo usando SMTP tradicional"""
        remitente = os.getenv("CORRE_USU", "")
        password = os.getenv("CORREO_CON", "")
        smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        
        if not remitente or not password:
            print("⚠️ Credenciales SMTP no configuradas")
            return False
        
        try:
            mensaje = MIMEMultipart()
            mensaje["From"] = remitente
            mensaje["To"] = destinatario
            mensaje["Subject"] = "Código de recuperación - Asistente Virtual"
            
            cuerpo = f"""
            <h2>🔐 Recuperación de Contraseña</h2>
            <p>Hola <strong>{usuario}</strong>,</p>
            <p>Has solicitado recuperar tu contraseña.</p>
            <p style="font-size: 32px; font-weight: bold; color: #4CAF50; padding: 20px; background: #f1f1f1; border-radius: 10px; text-align: center; letter-spacing: 10px;">
            {codigo}
            </p>
            <p>Este código expirará en <strong>1 hora</strong>.</p>
            <p>Si no solicitaste este código, ignora este mensaje.</p>
            <hr>
            <p style="color: #666; font-size: 12px;">
            Equipo del Asistente Virtual
            </p>
            """
            
            mensaje.attach(MIMEText(cuerpo, "html"))
            
            # Intentar conexión SMTP con timeout
            with smtplib.SMTP(smtp_server, smtp_port, timeout=10) as server:
                server.starttls()
                server.login(remitente, password)
                server.send_message(mensaje)
            
            print(f"✅ Correo enviado via SMTP a {destinatario}")
            return True
            
        except Exception as e:
            print(f"❌ Error con SMTP: {e}")
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