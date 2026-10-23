"""Backend runtime configuration boundary.

RAG-specific configuration lives in rag_core.config; database and API settings
belong here as the backend grows.
"""

import os

API_PREFIX = "/api"
DATABASE_URL = os.getenv("DATABASE_URL", "")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
