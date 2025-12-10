# funciones/comandos_web.py
# Versión compatible con Railway
import json
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from servicios.historial_service import HistorialService

def ejecutar_comando_web(texto: str, db: Optional[Session] = None, usuario_id: Optional[int] = None) -> dict:
    """Ejecuta comandos en modo web (sin voz)"""
    texto = texto.lower()
    respuesta = {"comando": "", "resultado": "", "url": None, "exito": False}
    
    try:
        if "reproduce" in texto:
            musica = texto.replace("reproduce", "").strip()
            respuesta["comando"] = "reproduce"
            respuesta["resultado"] = f"Reproduciendo {musica}"
            respuesta["url"] = f"https://www.youtube.com/results?search_query={musica.replace(' ', '+')}"
            respuesta["exito"] = True
            
        elif "busca en y" in texto or "busca en youtube" in texto:
            if "busca en y" in texto:
                musica = texto.replace("busca en y", "").strip()
            else:
                musica = texto.replace("busca en youtube", "").strip()
            respuesta["comando"] = "busca en youtube"
            respuesta["resultado"] = f"Buscando en YouTube: {musica}"
            respuesta["url"] = f"https://www.youtube.com/results?search_query={musica.replace(' ', '+')}"
            respuesta["exito"] = True

        elif "hora" in texto:
            hora = datetime.now().strftime("%H:%M %p")
            respuesta["comando"] = "hora"
            respuesta["resultado"] = f"La hora actual es: {hora}"
            respuesta["exito"] = True

        elif "busca en" in texto and "youtube" not in texto:
            consulta = texto.replace("busca en", "").replace("google", "").strip()
            respuesta["comando"] = "busca en google"
            respuesta["resultado"] = f"Buscando: {consulta}"
            respuesta["url"] = f"https://www.google.com/search?q={consulta.replace(' ', '+')}"
            respuesta["exito"] = True

        elif "dime" in texto or "qué es" in texto:
            consulta = texto.replace("dime", "").replace("qué es", "").strip()
            respuesta["comando"] = "informacion"
            respuesta["resultado"] = f"Consulta sobre: {consulta}"
            respuesta["url"] = f"https://es.wikipedia.org/wiki/{consulta.replace(' ', '_')}"
            respuesta["exito"] = True
            
        else:
            respuesta["comando"] = "desconocido"
            respuesta["resultado"] = "No entendí el comando"
            respuesta["exito"] = False

        # Registrar en el historial
        if db is not None and respuesta["exito"]:
            try:
                HistorialService.crear_registro(
                    db=db, 
                    comando_usuario=texto, 
                    comando_ejecutado=respuesta["comando"], 
                    respuesta_asistente=respuesta["resultado"],
                    usuario_id=usuario_id
                )
            except Exception as e:
                print(f"Error guardando historial: {e}")
        
    except Exception as e:
        respuesta["comando"] = "error"
        respuesta["resultado"] = f"Error: {str(e)}"
        respuesta["exito"] = False
        
    return respuesta