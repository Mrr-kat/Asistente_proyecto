# Dockerfile
FROM python:3.11-slim

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    python3-dev \
    build-essential \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Variables de entorno
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# Copiar requirements
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copiar aplicación
COPY . .

# Script de inicio para Railway
RUN echo '#!/bin/bash\n\
PORT=${PORT:-8000}\n\
echo "Starting on port: $PORT"\n\
uvicorn main:app_mount --host 0.0.0.0 --port $PORT\n' > /app/start.sh && \
chmod +x /app/start.sh

# Usuario no-root
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

CMD ["/app/start.sh"]