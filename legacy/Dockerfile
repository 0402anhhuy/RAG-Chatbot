# ==============================================================================
# Cloud-Native RAG AI Platform - Dockerfile
# Optimized for Linux Containers, Security Hardening, and High Availability
# ==============================================================================

# Step 1: Use a minimal, secure Linux base image (Debian-based)
FROM python:3.11-slim as base

# Set environment variables for Python optimization & standard logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PORT=8501

# Set working directory inside the container
WORKDIR /app

# Step 2: Install system-level Linux dependencies (Compute & Document OCR support)
# - build-essential: C++ compilers for vector search indexing (FAISS/numpy)
# - poppler-utils & tesseract-ocr: PDF conversion and OCR processing
# - curl: Required for container health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    poppler-utils \
    tesseract-ocr \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Step 3: Create a non-root system user for OS Security Hardening (Principle of Least Privilege)
RUN groupadd -r raggroup && useradd -r -g raggroup -u 1001 raguser

# Step 4: Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Step 5: Copy application source code and assign ownership to non-root user
COPY --chown=raguser:raggroup legacy /app/legacy
COPY --chown=raguser:raggroup rag_core /app/rag_core
RUN mkdir -p /app/data/uploads /app/data/vector_store && \
    chown -R raguser:raggroup /app/data

# Step 6: Switch to non-root user
USER raguser

# Step 7: Expose application networking port
EXPOSE 8501

# Step 8: Configure Healthcheck for SRE observability & Load Balancer probes
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl --fail http://localhost:8501/_stcore/health || exit 1

# Step 9: Define the startup execution command
ENTRYPOINT ["streamlit", "run", "legacy/app.py", "--server.port=8501", "--server.address=0.0.0.0"]
