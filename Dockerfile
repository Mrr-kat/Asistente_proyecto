# Dockerfile
FROM python:3.11-slim

# 1. Instalar dependencias del sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    python3-dev \
    build-essential \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 2. Establecer directorio de trabajo
WORKDIR /app

# 3. Variables de entorno
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# 4. Copiar requirements primero (para caché)
COPY requirements.txt .

# 5. Instalar dependencias de Python
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 6. Copiar el resto de la aplicación
COPY . .

# 7. Crear usuario no-root (seguridad)
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# 8. Exponer puerto
EXPOSE 8000

# 9. Comando de inicio
CMD ["python", "-m", "uvicorn", "main:app_mount", "--host", "0.0.0.0", "--port", "8000"]
