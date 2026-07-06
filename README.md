# ☁️ Enterprise Cloud-Native RAG AI Platform

### _Infrastructure, SRE & Cloud Operations Architecture_

[![Linux & OS Hardening](https://img.shields.io/badge/OS%20Hardening-Debian%20Slim%20%7C%20Non--Root-blue?logo=linux&logoColor=white)](#-security--os-hardening)
[![Infrastructure as Code](https://img.shields.io/badge/IaC-Docker%20Compose%20v2-2496ED?logo=docker&logoColor=white)](#-containerized-deployment-docker--iac---recommended)
[![High Availability & SRE](https://img.shields.io/badge/SRE-Health%20Probes%20%7C%20Log%20Rotation-success?logo=prometheus&logoColor=white)](#-reliability--sre-observability)
[![Python Automation](https://img.shields.io/badge/Automation-Python%203.11%20%7C%20LangChain-3776AB?logo=python&logoColor=white)](#-core-application-features)

---

## 📌 Executive Summary & Engineering Focus

This project implements a production-grade **Retrieval-Augmented Generation (RAG)** platform designed from the ground up with **System Engineering, SRE, and Cloud-Native best practices**. While the application layer delivers advanced AI document interaction and automated study tool generation (Flashcards & Exams), the underlying infrastructure architecture demonstrates robust orchestration of **Compute, Storage, and Networking** resources in modern Linux environments.

Whether deployed on **bare-metal Linux servers, OpenStack Virtual Machines (VMs), or Kubernetes clusters**, this system is architected to ensure high availability, security compliance through **OS hardening**, and seamless operational visibility.

---

## 🏗️ Cloud & Infrastructure Architecture

The platform bridges the gap between software development and core cloud infrastructure by implementing standard enterprise design patterns:

```
+-----------------------------------------------------------------------------------+
|                        EXTERNAL CLIENTS / API CONSUMERS                           |
+-----------------------------------------------------------------------------------+
                                         │  HTTP / HTTPS (Port 8501)
                                         ▼
+-----------------------------------------------------------------------------------+
|               NETWORKING & LOAD BALANCING LAYER (OpenStack Octavia / Nginx)       |
|   • SSL/TLS Termination    • Reverse Proxy Routing    • DDOS Protection           |
+-----------------------------------------------------------------------------------+
                                         │  Internal VPC / Bridge Network
                                         ▼
+-----------------------------------------------------------------------------------+
|                    COMPUTE LAYER (Docker / Linux Container Node)                  |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |  OS HARDENING LAYER: Debian Linux (slim) • Non-Root User (UID 1001)        |  |
|  +-----------------------------------------------------------------------------+  |
|                                        │                                          |
|  +-------------------------------------▼------------------------------------+  |
|  |  APPLICATION RUNTIME: Python 3.11 • Streamlit Server • LangChain Core    |  |
|  +-------------------------------------+------------------------------------+  |
|                                        │                                          |
|  +-------------------------------------▼------------------------------------+  |
|  |  AI & HYBRID RETRIEVAL ENGINE: Dense FAISS Vector Index + BM25 Sparse    |  |
|  +-------------------------------------+------------------------------------+  |
+----------------------------------------┼------------------------------------------+
                                         │  Persistent Volume Mounts (NFS/Cinder)
                                         ▼
+-----------------------------------------------------------------------------------+
|                         STORAGE & DATA PERSISTENCE LAYER                          |
|   • /app/pdfs (Document Storage)          • /app/faiss_index (Vector Indexes)     |
|   • Log Rotation (json-file: 10MB max)    • State Management (Session Cache)      |
+-----------------------------------------------------------------------------------+
```

### 1. ⚡ Compute & Workload Management

- **Inference Orchestration**: Integrates with low-latency LLM endpoints (`ChatGroq / Llama-3.3-70B-Versatile`) and accelerates local embeddings via PyTorch and HuggingFace Transformers.
- **Resource Fencing**: Configured with explicit CPU (`2.0 vCPU limit / 0.5 reserved`) and Memory (`4GB limit / 1GB reserved`) boundaries in Infrastructure-as-Code (IaC) definitions to prevent OOM node crashes and Noisy Neighbor syndromes.

### 2. 💾 Storage & Data Persistence

- **Volume Orchestration**: Uses decoupled storage mounts for raw document ingestion (`./pdfs:/app/pdfs`) and high-speed vector index serialization (`./faiss_index:/app/faiss_index`).
- **Storage Optimization**: Prevents storage node exhaustion through strict Docker logging drivers (`max-size: 10m`, `max-file: 3`), ensuring zero-downtime operations in multi-tenant data centers.

### 3. 🌐 Networking & Service Delivery

- **Port Management**: Services bind cleanly to port `8501`, engineered to sit behind enterprise reverse proxies, load balancers (e.g., OpenStack Octavia, Nginx, Traefik), or Kubernetes Ingress controllers.
- **Network Isolation**: Operates on custom container bridge networks with internal DNS resolution ready for distributed microservice scaling.

### 4. 🛡️ Security & OS Hardening

- **Minimalist Attack Surface**: Built upon `python:3.11-slim` (Debian Linux base), eliminating unnecessary OS packages and vulnerabilities.
- **Principle of Least Privilege**: Enforces **non-root container execution** via a dedicated system group and user (`raggroup:1001 / raguser:1001`), preventing privilege escalation attacks on hypervisors.
- **Secret Injection**: Fully decoupled credentials management using environment variables (`.env`), avoiding hardcoded API tokens in container layers.

### 5. 📊 Reliability & SRE Observability

- **Automated Health Probes**: Implements native Docker `HEALTHCHECK` instructions querying the internal Streamlit status endpoint (`/_stcore/health`).
- **Self-Healing Infrastructure**: Configured with `restart: unless-stopped` policies for automated recovery from transient hardware or network anomalies.

---

## ✨ Core Application Features

- 📄 **Enterprise Document Ingestion**: Multi-format support (PDF/Text) with Linux system-level OCR (`tesseract-ocr`) and PDF rendering (`poppler-utils`).
- ✂️ **Advanced Chunking & Indexing**: Recursive text splitting combined with high-performance vector generation.
- 🔎 **Hybrid Retrieval Engine**: Fuses Dense Vector Search (`FAISS`) and Sparse BM25 scoring for superior contextual accuracy.
- 🤖 **Interactive AI Consultation**: Multi-turn history-aware chatbot with real-time source citation and page tracking.
- 🧠 **Automated EdTech Studio**: One-click generation of structured JSON Flashcards and comprehensive Exam assessments.

---

## 🐳 Containerized Deployment (Docker & IaC - Recommended)

This project provides production-ready Dockerfile and Docker Compose manifests structured according to **Infrastructure as Code (IaC)** best practices.

### Prerequisites

- **Linux Server / VM / Local Host**: Ubuntu 20.04+, Debian 11+, Windows (WSL2), or macOS.
- **Container Engine**: Docker Engine v24.0+ & Docker Compose v2.0+.

### 1️⃣ Clone Repository & Configure Secrets

```bash
git clone <repository_url>
cd RAG_Chatbot

# Create the environment configuration file
cat <<EOF > .env
GROQ_API_KEY="your_groq_api_key_here"
GOOGLE_API_KEY="your_google_api_key_here"
OPENAI_API_KEY="your_openai_api_key_here"
EOF
```

### 2️⃣ Deploy via Infrastructure as Code (Docker Compose)

Launch the containerized stack in background daemon mode:

```bash
docker compose up -d --build
```

### 3️⃣ Verify Infrastructure Health & Observability

Check container status, resource utilization, and health probes:

```bash
# Check running container and automated healthcheck status
docker ps

# Real-time inspection of container operational logs
docker compose logs -f --tail=50

# Inspect live CPU and Memory usage against configured SRE limits
docker stats rag-chatbot-prod
```

🌐 **Access the application interface at:** `http://localhost:8501`

### 4️⃣ Lifecycle & Container Management

```bash
# Execute bash command inside running container (as non-root user for debugging)
docker exec -it rag-chatbot-prod /bin/bash

# Stop services without deleting persistent storage volumes
docker compose stop

# Tear down infrastructure and remove containers/networks
docker compose down
```

---

## ⚙️ Bare-Metal & Linux Server Deployment (Manual / VM)

For Systems Engineers deploying directly onto Linux virtual machines (e.g., OpenStack Compute instances, AWS EC2, or bare-metal hypervisors):

### 1️⃣ Install Linux System Dependencies

The application relies on OS-level C++ libraries for vector processing and image/PDF rendering:

```bash
sudo apt-get update && sudo apt-get install -y \
    build-essential \
    poppler-utils \
    tesseract-ocr \
    curl \
    python3-pip \
    python3-venv
```

### 2️⃣ Initialize Virtual Environment & Install Python Packages

```bash
# Create and activate Python virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Upgrade pip and install dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

### 3️⃣ Run via Systemd or Terminal

```bash
# Export secrets or load via dotenv
export GROQ_API_KEY="your_api_key"

# Launch Streamlit server bound to all network interfaces
streamlit run app.py --server.port=8501 --server.address=0.0.0.0
```

## 📁 Repository Structure

```text
├── Dockerfile                  # Multi-stage Linux build with OS Hardening & non-root user
├── docker-compose.yml          # IaC manifest with SRE resource limits & volume persistence
├── .dockerignore               # Security exclusions for image optimization
├── requirements.txt            # Locked Python dependencies (LangChain, FAISS, PyTorch)
├── app.py                      # Main entrypoint & Streamlit UI orchestration
├── app_local.py                # Local execution alternative
├── domain/                     # Business logic & document chunking algorithms
├── generation/                 # AI generators (Answers, Flashcards, Exams, Context Compression)
├── loaders/                    # Ingestion engines for PDF and text sources
├── retrieval/                  # Dense Vector (FAISS) & Hybrid BM25 retrieval engines
├── ui/                         # Frontend rendering components for study tools
└── utils/                      # Configuration and environment utilities
```
