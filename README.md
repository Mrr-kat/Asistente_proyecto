# Asistente Virtual con FastAPI
**Sistema de asistente virtual con reconocimiento de voz, dashboard interactivo y gestión de historial**

##  Características Principales

###  **Reconocimiento de Voz**
- Grabación de audio en tiempo real
- Transcripción a texto con SpeechRecognition
- Detección automática de silencio
- Comandos por voz en español

### **Dashboard Interactivo**
- Gráficos estadísticos con Chart.js
- Estadísticas de uso en tiempo real
- Comandos más populares
- Distribución por hora y día
- Reportes descargables en PDF/JSON

###  **Sistema de Autenticación**
- Registro de usuarios
- Inicio de sesión seguro
- Recuperación de contraseña con código
- Cookies HTTP-only
- Middleware de autenticación

###  **Gestión de Historial**
- CRUD completo de interacciones
- Búsqueda por texto
- Exportación a PDF
- Eliminación lógica/física
- Filtros por usuario y fecha

###  **Despliegue en Railway**
URL del Proyecto: https://web-production-186d7.up.railway.app/login

### **Diagrama de clases**
classDiagram
    class Usuario {
        +int id
        +str nombre_completo
        +str usuario
        +str correo
        +str contraseña
        +datetime fecha_registro
        +bool activo
        +list historial
        +list recuperaciones
        +list estadisticas
    }
    
  class HistorialInteraccion {
        +int id
        +int usuario_id
        +str comando_usuario
        +str comando_ejecutado
        +str respuesta_asistente
        +datetime fecha_hora
        +bool activo
        +to_dict()
    }
    
  class RecuperacionContraseña {
        +int id
        +int usuario_id
        +str codigo
        +datetime fecha_creacion
        +datetime expiracion
        +bool utilizado
    }
    
  class EstadisticasUsuario {
        +int id
        +int usuario_id
        +datetime fecha
        +int comandos_ejecutados
        +int tiempo_uso_minutos
        +int comandos_exitosos
        +int comandos_fallidos
    }
    
  Usuario "1" --* "many" HistorialInteraccion
  Usuario "1" --* "many" RecuperacionContraseña
  Usuario "1" --* "many" EstadisticasUsuario

###  **Comandos Disponibles**
```bash
"reproduce [música]"       # Busca en YouTube
"busca en youtube [texto]" # Búsqueda específica
"hora"                     # Hora actual
"busca en [texto]"         # Búsqueda en Google
"dime [tema]"              # Información en Wikipedia
