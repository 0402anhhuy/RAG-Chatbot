from __future__ import annotations

import json
import logging
import uuid
from pathlib import Path

from fastapi import Depends
from fastapi.testclient import TestClient

from app.core.errors import ErrorCode, error_payload
from app.core.logging import JsonFormatter
from app.core.security import require_api_key
from app.main import create_app
from config.settings import AppSettings, DatabaseSettings, RateLimitSettings, SecuritySettings, Settings


def make_settings(
    tmp_path: Path,
    *,
    security: SecuritySettings | None = None,
    rate_limit: RateLimitSettings | None = None,
) -> Settings:
    return Settings(
        _env_file=None,
        app=AppSettings(env="test"),
        security=security or SecuritySettings(api_key="test-key"),
        rate_limit=rate_limit or RateLimitSettings(),
        database=DatabaseSettings(path=str(tmp_path / "app.db")),
    )


def test_health_probes_and_request_id_header(tmp_path: Path) -> None:
    app = create_app(make_settings(tmp_path))

    with TestClient(app) as client:
        response = client.get("/api/v1/health/readiness")
        supplied_id = str(uuid.uuid4())
        correlated = client.get("/api/v1/health/liveness", headers={"X-Request-ID": supplied_id})

    assert response.status_code == 200
    assert response.json() == {"status": "ready"}
    assert uuid.UUID(correlated.headers["X-Request-ID"]) == uuid.UUID(supplied_id)


def test_invalid_request_id_is_replaced_with_uuid(tmp_path: Path) -> None:
    app = create_app(make_settings(tmp_path))

    with TestClient(app) as client:
        response = client.get("/api/v1/health/liveness", headers={"X-Request-ID": "malformed"})

    assert response.status_code == 200
    uuid.UUID(response.headers["X-Request-ID"])


def test_auth_dependency_uses_constant_key_set_and_error_envelope(tmp_path: Path) -> None:
    app = create_app(
        make_settings(
            tmp_path,
            security=SecuritySettings(api_keys={"internal": "test-key"}),
        )
    )

    @app.get("/api/v1/protected", dependencies=[Depends(require_api_key)])
    async def protected() -> dict[str, str]:
        return {"status": "ok"}

    with TestClient(app) as client:
        rejected = client.get("/api/v1/protected")
        accepted = client.get("/api/v1/protected", headers={"X-API-Key": "test-key"})

    assert rejected.status_code == 401
    assert rejected.json()["success"] is False
    assert rejected.json()["error"]["code"] == ErrorCode.AUTH_ERROR.value
    assert uuid.UUID(rejected.json()["error"]["request_id"])
    assert accepted.status_code == 200


def test_auth_can_only_be_disabled_in_development_or_test(tmp_path: Path) -> None:
    app = create_app(
        make_settings(
            tmp_path,
            security=SecuritySettings(enabled=False),
        )
    )

    @app.get("/api/v1/protected", dependencies=[Depends(require_api_key)])
    async def protected() -> dict[str, str]:
        return {"status": "ok"}

    with TestClient(app) as client:
        response = client.get("/api/v1/protected")

    assert response.status_code == 200


def test_rate_limit_returns_documented_envelope(tmp_path: Path) -> None:
    app = create_app(
        make_settings(
            tmp_path,
            rate_limit=RateLimitSettings(enabled=True, requests=1, window_seconds=60),
        )
    )
    app.get("/api/v1/probe")(lambda: {"status": "ok"})

    with TestClient(app) as client:
        first = client.get("/api/v1/probe")
        second = client.get("/api/v1/probe")

    assert first.status_code == 200
    assert second.status_code == 429
    assert second.json()["error"]["code"] == ErrorCode.RATE_LIMITED.value
    assert int(second.headers["Retry-After"]) >= 1


def test_unexpected_error_does_not_expose_exception_details(tmp_path: Path) -> None:
    app = create_app(make_settings(tmp_path))

    @app.get("/api/v1/raises")
    async def raises() -> None:
        raise RuntimeError("sensitive document content")

    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.get("/api/v1/raises")

    assert response.status_code == 500
    assert "sensitive document content" not in response.text
    assert uuid.UUID(response.json()["error"]["request_id"])


def test_json_formatter_redacts_secrets_from_fields_and_message() -> None:
    record = logging.LogRecord(
        name="test",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg="request uses sk-1234567890abcdef",
        args=(),
        exc_info=None,
    )
    record.extra_fields = {"api_key": "do-not-log-this", "count": 2}

    payload = json.loads(JsonFormatter().format(record))

    assert payload["event"] == "request uses [REDACTED]"
    assert payload["api_key"] == "[REDACTED]"
    assert payload["count"] == 2
    assert "do-not-log-this" not in json.dumps(payload)


def test_error_payload_has_consistent_shape() -> None:
    payload = error_payload(ErrorCode.NOT_FOUND, "Not found")

    assert payload["success"] is False
    assert payload["error"]["code"] == "NOT_FOUND"
    assert "request_id" in payload["error"]
