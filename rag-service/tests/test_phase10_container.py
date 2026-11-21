from __future__ import annotations

from pathlib import Path

import yaml


def test_compose_stack_defines_service_and_dependencies() -> None:
    compose_path = Path(__file__).resolve().parents[1] / "docker-compose.yml"
    compose = yaml.safe_load(compose_path.read_text(encoding="utf-8"))

    services = compose["services"]
    app = services["rag-service"]
    assert app["build"]["context"] == "."
    assert app["environment"]["APP__HOST"] == "0.0.0.0"
    assert app["environment"]["DATABASE__PATH"] == "/app/data/app.db"
    assert "healthcheck" in app
    assert "redis" in services
    assert "qdrant" in services


def test_dockerfile_uses_non_root_runtime_and_healthcheck() -> None:
    dockerfile = (Path(__file__).resolve().parents[1] / "Dockerfile").read_text(encoding="utf-8")

    assert "FROM python:3.12-slim" in dockerfile
    assert "USER app" in dockerfile
    assert "HEALTHCHECK" in dockerfile
    assert "uvicorn" in dockerfile
