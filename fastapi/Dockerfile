FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY domain ./domain
COPY generation ./generation
COPY loaders ./loaders
COPY prompt ./prompt
COPY retrieval ./retrieval
COPY utils ./utils
COPY fastapi ./fastapi

EXPOSE 8000

CMD ["uvicorn", "fastapi.main:app", "--host", "0.0.0.0", "--port", "8000"]
