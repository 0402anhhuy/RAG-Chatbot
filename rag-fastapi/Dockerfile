FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PORT=8000

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    poppler-utils \
    tesseract-ocr \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/requirements.txt

COPY rag-fastapi /app/rag-fastapi
COPY rag_core /app/rag_core
COPY data /app/data
COPY .env.example /app/.env.example

RUN groupadd -r raggroup && useradd -r -g raggroup -u 1001 raguser && \
    mkdir -p /app/data/uploads /app/data/vector_store && \
    chown -R raguser:raggroup /app

USER raguser
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl --fail http://localhost:8000/api/health || exit 1

CMD ["python", "-m", "uvicorn", "rag-fastapi.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
