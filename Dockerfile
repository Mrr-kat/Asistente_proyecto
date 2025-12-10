# Dockerfile con gunicorn (MEJOR OPCIÓN)
FROM python:3.11-slim

# Instalar dependencias
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    python3-dev \
    build-essential \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar requirements
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copiar aplicación
COPY . .

# Instalar gunicorn
RUN pip install gunicorn

# Script de inicio
RUN echo '#!/bin/bash\n\
PORT=${PORT:-8000}\n\
WORKERS=${WORKERS:-4}\n\
echo "Starting with $WORKERS workers on port $PORT"\n\
gunicorn main:app_mount \\\n\
  --workers $WORKERS \\\n\
  --worker-class uvicorn.workers.UvicornWorker \\\n\
  --bind 0.0.0.0:$PORT \\\n\
  --timeout 120 \\\n\
  --access-logfile - \\\n\
  --error-logfile -\n' > /app/start.sh && \
chmod +x /app/start.sh

# Usuario no-root
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

CMD ["/app/start.sh"]