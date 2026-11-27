"""FastAPI application factory and process lifecycle."""

from __future__ import annotations

import asyncio
import logging
import sqlite3
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import router as api_router
from app.core.backend_client import BackendRegistry
from app.core.errors import install_error_handlers
from app.core.logging import setup_logging
from app.core.metrics import METRICS, MetricsMiddleware
from app.core.middleware import RequestContextMiddleware
from app.core.ratelimit import MemoryRateLimitStore, RateLimitMiddleware, RateLimitStore, RedisRateLimitStore
from app.core.runtime import WorkGate
from app.rag.embedding_cache import EmbeddingCache
from app.rag.factories.embedding_factory import EmbeddingFactory
from app.rag.ingest_service import DurableIngestQueue
from app.rag.ingest_worker import DocumentIngestWorker
from app.rag.provider_config import ProviderConfigClient
from app.rag.retrievers.bm25 import BM25Index
from app.rag.retrievers.service import HybridRetriever
from app.rag.stores.store_factory import create_vector_store
from config.settings import Settings, get_settings

logger = logging.getLogger(__name__)


def _build_rate_limit_store(settings: Settings) -> RateLimitStore:
    if settings.rate_limit.enabled and settings.rate_limit.backend == "redis":
        return RedisRateLimitStore(settings.rate_limit.redis_url)
    return MemoryRateLimitStore()


def create_app(settings: Settings | None = None) -> FastAPI:
    resolved_settings = settings or get_settings()
    rate_limit_store = _build_rate_limit_store(resolved_settings)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        app.state.ready = False
        METRICS.reset()
        setup_logging(resolved_settings.app.log_level, resolved_settings.app.log_format)
        app.state.work_gate = WorkGate(resolved_settings.app.max_concurrent_requests)
        registry = BackendRegistry(
            resolved_settings.backend.base_url,
            api_key=resolved_settings.backend.api_key.get_secret_value(),
            timeout=resolved_settings.backend.timeout_seconds,
        )
        try:
            upload_dir = Path(resolved_settings.upload.directory).expanduser()
            upload_dir.mkdir(parents=True, exist_ok=True)
            queue = DurableIngestQueue(
                registry,
                worker_timeout_seconds=resolved_settings.ingest.worker_timeout_seconds,
                max_attempts=resolved_settings.ingest.max_attempts,
                dedup_strategy=resolved_settings.ingest.dedup_strategy,
            )
            bm25_index = BM25Index(
                resolved_settings.bm25.persist_path,
                rebuild_on_boot=resolved_settings.bm25.rebuild_on_boot,
                strip_diacritics=resolved_settings.bm25.strip_diacritics,
                expand_compounds=resolved_settings.bm25.expand_compounds,
                index_version=resolved_settings.retrieval.index_version,
            )
            embedding_model_name = (
                "text-embedding-3-small"
                if resolved_settings.embedding.provider == "openai"
                and resolved_settings.embedding.model == "sentence-transformers/all-MiniLM-L6-v2"
                else resolved_settings.embedding.model
            )
            embedding_model = EmbeddingFactory.create(
                resolved_settings.embedding.provider,
                model_name=embedding_model_name,
                device=resolved_settings.embedding.device,
                normalize=resolved_settings.embedding.normalize,
                api_key=resolved_settings.embedding.api_key.get_secret_value(),
                base_url=resolved_settings.embedding.base_url,
                dimension=resolved_settings.embedding.dimension,
            )
            embedding_cache: EmbeddingCache | None
            try:
                embedding_cache = EmbeddingCache(
                    resolved_settings.embedding.cache_path,
                    namespace=(
                        f"{resolved_settings.embedding.provider}:{embedding_model_name}:"
                        f"{resolved_settings.embedding.normalize}:{resolved_settings.embedding.dimension}"
                    ),
                    enabled=resolved_settings.embedding.cache_enabled,
                )
            except (sqlite3.Error, OSError):
                logger.exception("embedding_cache_unavailable")
                embedding_cache = None
            vector_store = create_vector_store(
                resolved_settings.vector_store.backend,
                collection_name=resolved_settings.vector_store.collection,
                url=resolved_settings.vector_store.url,
                api_key=resolved_settings.vector_store.api_key.get_secret_value(),
                persist_path=resolved_settings.vector_store.persist_path,
                vector_size=resolved_settings.vector_store.vector_size,
                distance=resolved_settings.vector_store.distance,
                timeout=resolved_settings.vector_store.timeout_seconds,
            )
            worker = DocumentIngestWorker(
                queue,
                registry,
                bm25_index,
                resolved_settings,
                embedding_model,
                vector_store,
                embedding_cache=embedding_cache,
            )
            if resolved_settings.ingest.worker_enabled:
                await worker.prepare()
            else:
                # Shadow/read-only hosts serve the persisted corpus without running
                # ingest jobs, so they still need indexes rebuilt from stored chunks.
                await worker.rebuild_indexes()
            retriever = HybridRetriever(
                bm25_index=bm25_index,
                vector_store=vector_store,
                embedding_model=embedding_model,
                retrieval_settings=resolved_settings.retrieval,
                reranker_settings=resolved_settings.reranker,
            )
            stop_worker = asyncio.Event()
            worker_task = (
                asyncio.create_task(worker.run(stop_worker)) if resolved_settings.ingest.worker_enabled else None
            )
            provider_config = ProviderConfigClient(resolved_settings.provider_config)
            app.state.backend = registry
            app.state.provider_config = provider_config
            app.state.ingest_queue = queue
            app.state.bm25_index = bm25_index
            app.state.embedding_model = embedding_model
            app.state.embedding_cache = embedding_cache
            app.state.vector_store = vector_store
            app.state.retriever = retriever
            app.state.ingest_worker = worker
            app.state.upload_dir = upload_dir
            app.state.ready = True
            logger.info("service_started", extra={"extra_fields": {"environment": resolved_settings.app.env}})
            try:
                yield
            finally:
                stop_worker.set()
                if worker_task is not None:
                    await worker_task
                await asyncio.to_thread(vector_store.close)
                if embedding_cache is not None:
                    embedding_cache.close()
                provider_config.close()
        finally:
            app.state.ready = False
            await asyncio.to_thread(registry.close)
            await rate_limit_store.close()
            logger.info("service_stopped")

    app = FastAPI(
        title=resolved_settings.app.name,
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs" if resolved_settings.app.env != "production" else None,
        redoc_url=None,
    )
    app.state.settings = resolved_settings
    app.state.ready = False
    app.state.rate_limit_store = rate_limit_store
    app.state.documents = {}
    app.state.jobs = {}
    app.state.upload_dir = "./data/uploads"

    app.add_middleware(
        CORSMiddleware,
        allow_origins=resolved_settings.app.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-API-Key", resolved_settings.app.request_id_header],
    )
    app.add_middleware(
        RateLimitMiddleware,
        settings=resolved_settings.rate_limit,
        store=rate_limit_store,
    )
    app.add_middleware(MetricsMiddleware)
    app.add_middleware(RequestContextMiddleware, header_name=resolved_settings.app.request_id_header)
    install_error_handlers(app)
    app.include_router(api_router, prefix="/api/v1")
    return app


app = create_app()
