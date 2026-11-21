"""Root router for versioned endpoints."""

from fastapi import APIRouter

from app.api.v1.chat import router as chat_router
from app.api.v1.documents import router as documents_router
from app.api.v1.health import router as health_router
from app.api.v1.retrieval import router as retrieval_router
from app.api.v1.study import router as study_router

router = APIRouter()
router.include_router(health_router)
router.include_router(chat_router)
router.include_router(documents_router)
router.include_router(retrieval_router)
router.include_router(study_router)
