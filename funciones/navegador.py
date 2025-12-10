# funciones/navegador.py
import webbrowser

def abrir_en_navegador(url: str):
    """Versión simplificada para web - sin psutil"""
    try:
        # En Railway/entorno web, no podemos detectar navegadores abiertos
        # Simplemente retornamos la URL para que el frontend la maneje
        print(f"URL para abrir: {url}")
        
        # En desarrollo local, podemos intentar abrir
        # En producción web, el frontend manejará la apertura
        return url
        
    except Exception as e:
        print(f"Error en abrir_en_navegador: {e}")
        return url