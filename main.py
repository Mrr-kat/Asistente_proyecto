import os
import struct
import threading
import asyncio
from fastapi import FastAPI, Request, UploadFile, Depends, Form, HTTPException, status, Response
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import socketio
from pydub import AudioSegment
import speech_recognition as sr
from sqlalchemy.orm import Session
from datetime import datetime
from db.models import get_db, SessionLocal, HistorialInteraccion, Usuario
from servicios.historial_service import HistorialService
from servicios.auth_service import AuthService
from servicios.estadisticas_service import EstadisticasService
from funciones.comandos import ejecutar_comando
from funciones.comandos_web import ejecutar_comando_web
from dotenv import load_dotenv


# Configuración de FastAPI
app = FastAPI()
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")

# Cargar variables de entorno
load_dotenv()

# Montar carpeta de templates y estáticos
templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")

# Middleware para verificar autenticación
@app.middleware("http")
async def verificar_autenticacion(request: Request, call_next):
    # Rutas públicas que no requieren autenticación
    rutas_publicas = ["/login", "/registro", "/recuperacion", "/static", "/favicon.ico", "/health"]
    
    if any(request.url.path.startswith(ruta) for ruta in rutas_publicas):
        return await call_next(request)
    
    # Verificar si el usuario está autenticado
    usuario_id = request.cookies.get("usuario_id")
    if not usuario_id:
        return RedirectResponse(url="/login", status_code=status.HTTP_303_SEE_OTHER)
    
    try:
        # Verificar que el usuario existe
        db = next(get_db())
        usuario = AuthService.obtener_usuario_por_id(db, int(usuario_id))
        if not usuario:
            response = RedirectResponse(url="/login", status_code=status.HTTP_303_SEE_OTHER)
            response.delete_cookie("usuario_id")
            return response
    except:
        response = RedirectResponse(url="/login", status_code=status.HTTP_303_SEE_OTHER)
        response.delete_cookie("usuario_id")
        return response
    
    # Agregar usuario_id al estado de la solicitud
    request.state.usuario_id = int(usuario_id)
    return await call_next(request)

# Página principal (requiere autenticación)
@app.get("/asistente", response_class=HTMLResponse)
async def asistente(request: Request, db: Session = Depends(get_db)):
    """Página principal del asistente virtual"""
    usuario_id = request.state.usuario_id
    usuario = AuthService.obtener_usuario_por_id(db, usuario_id)
    
    return templates.TemplateResponse("./Asistente/M.0.1.html", {
        "request": request,
        "usuario": usuario.usuario if usuario else "Invitado"
    })

# Redirigir la raíz al asistente si está autenticado, o al login si no
@app.get("/")
async def raiz(request: Request):
    """Redirigir a la página apropiada"""
    usuario_id = request.cookies.get("usuario_id")
    
    if usuario_id:
        # Usuario autenticado, redirigir al asistente
        return RedirectResponse(url="/asistente", status_code=status.HTTP_303_SEE_OTHER)
    else:
        # No autenticado, redirigir al login
        return RedirectResponse(url="/login", status_code=status.HTTP_303_SEE_OTHER)

# Rutas de autenticación
@app.get("/login", response_class=HTMLResponse)
async def mostrar_login(request: Request, error: str = None, success: str = None):
    return templates.TemplateResponse("login/inicio_sesion.html", {
        "request": request,
        "error": error,
        "success": success
    })

@app.post("/login")
async def iniciar_sesion(
    request: Request,
    usuario: str = Form(...),
    contraseña: str = Form(...),
    db: Session = Depends(get_db)
):
    try:
        usuario_db = AuthService.autenticar_usuario(db, usuario, contraseña)
        
        if not usuario_db:
            return templates.TemplateResponse("login/inicio_sesion.html", {
                "request": request,
                "error": "Usuario o contraseña incorrectos"
            })
        
        # Crear respuesta con redirección y cookie
        response = RedirectResponse(url="/", status_code=status.HTTP_303_SEE_OTHER)
        response.set_cookie(
            key="usuario_id",
            value=str(usuario_db.id),
            httponly=True,
            max_age=86400  # 24 horas
        )
        
        return response
        
    except Exception as e:
        return templates.TemplateResponse("login/inicio_sesion.html", {
            "request": request,
            "error": f"Error al iniciar sesión: {str(e)}"
        })

@app.get("/registro", response_class=HTMLResponse)
async def mostrar_registro(request: Request, error: str = None, success: str = None):
    return templates.TemplateResponse("login/registro.html", {
        "request": request,
        "error": error,
        "success": success
    })

@app.post("/registro")
async def registrar_usuario(
    request: Request,
    nombre_completo: str = Form(...),
    usuario: str = Form(...),
    correo: str = Form(...),
    contraseña: str = Form(...),
    confirmar_contraseña: str = Form(...),
    db: Session = Depends(get_db)
):
    try:
        # Validar que las contraseñas coincidan
        if contraseña != confirmar_contraseña:
            return templates.TemplateResponse("login/registro.html", {
                "request": request,
                "error": "Las contraseñas no coinciden"
            })
        
        # Validar longitud mínima de contraseña
        if len(contraseña) < 6:
            return templates.TemplateResponse("login/registro.html", {
                "request": request,
                "error": "La contraseña debe tener al menos 6 caracteres"
            })
        
        # Registrar usuario
        usuario_db = AuthService.registrar_usuario(db, nombre_completo, usuario, correo, contraseña)
        
        # Iniciar sesión automáticamente después del registro
        response = RedirectResponse(url="/", status_code=status.HTTP_303_SEE_OTHER)
        response.set_cookie(
            key="usuario_id",
            value=str(usuario_db.id),
            httponly=True,
            max_age=86400
        )
        
        return response
        
    except ValueError as e:
        return templates.TemplateResponse("login/registro.html", {
            "request": request,
            "error": str(e)
        })
    except Exception as e:
        return templates.TemplateResponse("login/registro.html", {
            "request": request,
            "error": f"Error al registrar usuario: {str(e)}"
        })

@app.get("/recuperacion", response_class=HTMLResponse)
async def mostrar_recuperacion(
    request: Request, 
    error: str = None, 
    success: str = None, 
    info: str = None,
    usuario: str = None,
    step: int = 1
):
    return templates.TemplateResponse("login/recuperacion.html", {
        "request": request,
        "error": error,
        "success": success,
        "info": info,
        "usuario": usuario,
        "step": step
    })

@app.post("/recuperacion/solicitar")
async def solicitar_recuperacion(
    request: Request,
    usuario_correo: str = Form(...),
    db: Session = Depends(get_db)
):
    try:
        resultado = AuthService.generar_codigo_recuperacion(db, usuario_correo)
        
        # Redirigir al paso 2
        return RedirectResponse(
            url=f"/recuperacion?usuario={usuario_correo}&step=2&info=Código enviado a {resultado['correo']}",
            status_code=status.HTTP_303_SEE_OTHER
        )
        
    except ValueError as e:
        return templates.TemplateResponse("login/recuperacion.html", {
            "request": request,
            "error": str(e)
        })
    except Exception as e:
        return templates.TemplateResponse("login/recuperacion.html", {
            "request": request,
            "error": f"Error al solicitar recuperación: {str(e)}"
        })

@app.post("/recuperacion/verificar")
async def verificar_codigo_recuperacion(
    request: Request,
    usuario_correo: str = Form(...),
    codigo: str = Form(...),
    db: Session = Depends(get_db)
):
    """Verificar código de recuperación"""
    try:
        usuario_id = AuthService.validar_codigo_recuperacion(db, usuario_correo, codigo, marcar_como_utilizado=False)
        
        # Redirigir al paso 3
        return RedirectResponse(
            url=f"/recuperacion?usuario={usuario_correo}&codigo={codigo}&step=3",
            status_code=status.HTTP_303_SEE_OTHER
        )
        
    except ValueError as e:
        return templates.TemplateResponse("login/recuperacion.html", {
            "request": request,
            "error": str(e),
            "usuario": usuario_correo,
            "step": 2
        })
    except Exception as e:
        return templates.TemplateResponse("login/recuperacion.html", {
            "request": request,
            "error": f"Error al verificar código: {str(e)}",
            "usuario": usuario_correo,
            "step": 2
        })

@app.post("/recuperacion/cambiar")
async def cambiar_contraseña_recuperacion(
    request: Request,
    usuario_correo: str = Form(...),
    codigo: str = Form(...),
    nueva_contraseña: str = Form(...),
    confirmar_nueva_contraseña: str = Form(...),
    db: Session = Depends(get_db)
):
    """Cambiar contraseña después de verificación"""
    try:
        # Validar que las contraseñas coincidan
        if nueva_contraseña != confirmar_nueva_contraseña:
            return templates.TemplateResponse("login/recuperacion.html", {
                "request": request,
                "error": "Las contraseñas no coinciden",
                "usuario": usuario_correo,
                "codigo": codigo,
                "step": 3
            })
        
        # Validar longitud mínima
        if len(nueva_contraseña) < 6:
            return templates.TemplateResponse("login/recuperacion.html", {
                "request": request,
                "error": "La contraseña debe tener al menos 6 caracteres",
                "usuario": usuario_correo,
                "codigo": codigo,
                "step": 3
            })
        
        # Validar el código sin marcarlo como usado
        usuario_id = AuthService.validar_codigo_recuperacion(db, usuario_correo, codigo, marcar_como_utilizado=False)
        
        # Cambiar contraseña y marcar código como usado
        AuthService.cambiar_contraseña(db, usuario_id, nueva_contraseña, codigo)
        
        return RedirectResponse(
            url="/login?success=Contraseña cambiada exitosamente. Ahora puedes iniciar sesión.",
            status_code=status.HTTP_303_SEE_OTHER
        )
        
    except ValueError as e:
        return templates.TemplateResponse("login/recuperacion.html", {
            "request": request,
            "error": str(e),
            "usuario": usuario_correo,
            "codigo": codigo,
            "step": 3
        })
    except Exception as e:
        return templates.TemplateResponse("login/recuperacion.html", {
            "request": request,
            "error": f"Error al cambiar contraseña: {str(e)}",
            "usuario": usuario_correo,
            "codigo": codigo,
            "step": 3
        })

@app.get("/logout")
async def cerrar_sesion():
    response = RedirectResponse(url="/login", status_code=status.HTTP_303_SEE_OTHER)
    response.delete_cookie("usuario_id")
    return response

# Ruta para procesar audio
@app.post("/audio")
async def audio(audio: UploadFile, request: Request, db: Session = Depends(get_db)):
    try:
        if not audio:
            return JSONResponse({"error": "No se envió ningún archivo de audio."}, status_code=400)

        usuario_id = request.state.usuario_id
        
        # Guardar archivo temporal
        temp_dir = "static/temp"
        os.makedirs(temp_dir, exist_ok=True)
        webm_path = os.path.join(temp_dir, f"audio_{datetime.now().timestamp()}.webm")
        
        with open(webm_path, "wb") as f:
            f.write(await audio.read())

        # Convertir de webm a wav usando pydub
        try:
            audio_segment = AudioSegment.from_file(webm_path, format="webm")
            wav_path = webm_path.replace(".webm", ".wav")
            audio_segment.export(wav_path, format="wav")
        except Exception as e:
            # Fallback: intentar procesar directamente
            print(f"Error al convertir audio: {e}")
            wav_path = webm_path

        # Transcribir
        recognizer = sr.Recognizer()
        try:
            with sr.AudioFile(wav_path) as source:
                audio_data = recognizer.record(source)
            text = recognizer.recognize_google(audio_data, language="es-ES")
        except sr.UnknownValueError:
            text = "No se pudo entender el audio"
        except Exception as e:
            print(f"Error en reconocimiento: {e}")
            text = "No se pudo transcribir el audio"

        # Limpiar temporales
        try:
            os.remove(webm_path)
            if os.path.exists(wav_path) and wav_path != webm_path:
                os.remove(wav_path)
        except:
            pass

        # Ejecutar comando si se transcribió
        if text and text != "No se pudo transcribir el audio" and text != "No se pudo entender el audio":
            # Ejecutar en segundo plano
            def ejecutar_en_segundo_plano():
                try:
                    db_local = SessionLocal()
                    try:
                        ejecutar_comando(text, db_local, usuario_id)
                    finally:
                        db_local.close()
                except Exception as e:
                    print(f"Error ejecutando comando: {e}")

            # Usar threading para no bloquear
            thread = threading.Thread(target=ejecutar_en_segundo_plano, daemon=True)
            thread.start()

        return JSONResponse({"text": text}, status_code=200)

    except Exception as e:
        print(f"Error general en /audio: {e}")
        return JSONResponse({"text": "Error procesando audio"}, status_code=200)

# Procesar comando de texto
@app.post("/comando")
async def procesar_comando(request: Request, db: Session = Depends(get_db)):
    """Procesar comando de texto (para modo web)"""
    try:
        data = await request.json()
        texto = data.get("texto", "").strip()
        usuario_id = request.state.usuario_id
        
        if not texto:
            return JSONResponse({"error": "Texto vacío"}, status_code=400)
        
        resultado = ejecutar_comando_web(texto, db, usuario_id)
        
        return JSONResponse(resultado, status_code=200)
        
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

# Endpoint para health check
@app.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

# Rutas para el historial
@app.get("/historial")
async def obtener_historial(
    request: Request,
    db: Session = Depends(get_db), 
    buscar: str = None
):
    """Obtener todo el historial o buscar por texto"""
    usuario_id = request.state.usuario_id
    
    if buscar:
        registros = HistorialService.buscar_por_texto(db, buscar, usuario_id)
    else:
        registros = HistorialService.obtener_todos(db, usuario_id)
    
    return {"registros": [r.to_dict() for r in registros]}

@app.put("/historial/{registro_id}")
async def actualizar_registro(
    registro_id: int, 
    datos: dict, 
    request: Request,
    db: Session = Depends(get_db)
):
    """Actualizar un registro del historial"""
    usuario_id = request.state.usuario_id
    registro = HistorialService.actualizar_registro(
        db, registro_id, 
        datos.get("comando_usuario"), 
        datos.get("respuesta_asistente"),
        usuario_id
    )
    if registro:
        return {"mensaje": "Registro actualizado", "registro": registro.to_dict()}
    return {"error": "Registro no encontrado"}

@app.delete("/historial/{registro_id}")
async def eliminar_registro(
    registro_id: int, 
    request: Request,
    db: Session = Depends(get_db)
):
    """Eliminar un registro (eliminación lógica)"""
    usuario_id = request.state.usuario_id
    if HistorialService.eliminar_registro(db, registro_id, usuario_id):
        return {"mensaje": "Registro eliminado"}
    return {"error": "Registro no encontrado"}

@app.post("/historial/reportes/pdf")
async def generar_reporte_pdf(request: Request, db: Session = Depends(get_db)):
    """Generar reporte en formato PDF"""
    usuario_id = request.state.usuario_id
    usuario = AuthService.obtener_usuario_por_id(db, usuario_id)
    
    ruta_archivo = os.path.join("static", "reportes", f"historial_{usuario.usuario}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf")
    os.makedirs(os.path.dirname(ruta_archivo), exist_ok=True)
    
    archivo_generado = HistorialService.generar_reporte_pdf(db, ruta_archivo, usuario_id)
    
    return {"mensaje": "Reporte PDF generado", "archivo": archivo_generado}

@app.get("/dashboard/estadisticas")
async def obtener_estadisticas_dashboard(request: Request, db: Session = Depends(get_db)):
    """Obtener estadísticas para el dashboard"""
    usuario_id = request.state.usuario_id
    
    estadisticas = EstadisticasService.obtener_estadisticas_generales(db, usuario_id)
    tendencias = EstadisticasService.obtener_tendencias(db, usuario_id)
    
    # Registrar estadística diaria
    EstadisticasService.registrar_estadistica_diaria(db, usuario_id)
    
    return {
        "estadisticas": estadisticas,
        "tendencias": tendencias
    }

@app.get("/dashboard/reporte-detallado")
async def generar_reporte_detallado(request: Request, db: Session = Depends(get_db)):
    """Generar reporte detallado del dashboard"""
    usuario_id = request.state.usuario_id
    
    estadisticas = EstadisticasService.obtener_estadisticas_generales(db, usuario_id)
    tendencias = EstadisticasService.obtener_tendencias(db, usuario_id)
    
    return {
        "reporte": {
            "generado_el": datetime.now().strftime("%d/%m/%Y %I:%M %p"),
            "estadisticas": estadisticas,
            "tendencias": tendencias,
            "resumen": {
                "total_comandos": estadisticas.get("total_comandos", 0),
                "comando_mas_usado": estadisticas.get("comando_mas_usado"),
                "hora_pico": estadisticas.get("hora_pico"),
                "tasa_exito": tendencias.get("tasa_exito", 0)
            }
        }
    }

# WebSocket events
@sio.on("connect")
async def connect(sid, environ):
    print(f"Cliente conectado: {sid}")

@sio.on("disconnect")
async def disconnect(sid):
    print(f"Cliente desconectado: {sid}")

@sio.on("iniciar_grabacion")
async def iniciar_grabacion_socket(sid, data=None):
    print("Iniciando grabación vía WebSocket")
    await sio.emit("iniciar_grabacion", {"message": "Grabación iniciada"})

@sio.on("detener_grabacion")
async def detener_grabacion_socket(sid, data=None):
    print("Deteniendo grabación vía WebSocket")
    await sio.emit("detener_grabacion", {"message": "Grabación detenida"})

# Mount Socket.IO app
app_mount = socketio.ASGIApp(sio, app)

# Main para desarrollo local
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app_mount", host="0.0.0.0", port=int(os.getenv("PORT", 8000)), reload=True)