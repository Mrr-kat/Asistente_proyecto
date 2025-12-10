# Asistente Virtual con FastAPI
**Sistema de asistente virtual con reconocimiento de voz, dashboard interactivo y gestión de historial**

##  Características Principales

###  **Reconocimiento de Voz**
- Grabación de audio en tiempo real
- Transcripción a texto con SpeechRecognition
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


### Tecnologías Utilizadas

#### Backend
- **FastAPI 0.104.1**: Framework web moderno y rápido
- **SQLAlchemy 2.0.23**: ORM para interacción con base de datos
- **SpeechRecognition 3.10.0**: Librería para transcripción de voz
- **ReportLab 4.0.9**: Generación de reportes PDF
- **WebSockets 12.0**: Comunicación bidireccional en tiempo real

#### Frontend
- **HTML5/CSS3**: Estructura y estilos responsivos
- **JavaScript ES6+**: Lógica del cliente
- **Chart.js 4.4.0**: Gráficos estadísticos interactivos
- **Socket.IO 4.5.0**: Cliente WebSocket
- **Boxicons 2.1.4**: Iconografía moderna

#### Base de Datos y Hosting
- **PostgreSQL 15**: Base de datos relacional
- **Railway.app**: Plataforma de despliegue
- **Docker**: Contenerización de la aplicación


###  **Comandos Disponibles**
```bash
"reproduce [música]"       # Busca en YouTube
"busca en youtube [texto]" # Búsqueda específica
"hora"                     # Hora actual
"busca en [texto]"         # Búsqueda en Google
"dime [tema]"              # Información en Wikipedia
