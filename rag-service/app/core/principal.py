"""Request principal and workspace scoping.

The Spring backend performs membership checks and forwards the resolved caller via
trusted headers. RAG still validates the shape of those headers and, when
``security.require_principal`` is enabled, refuses requests that do not carry a
principal or that target a workspace outside the forwarded allowlist.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from fastapi import Request

from app.core.errors import ApiError, ErrorCode


@dataclass(frozen=True, slots=True)
class Principal:
    user_id: str | None
    workspace_ids: frozenset[str] | None

    @property
    def unrestricted(self) -> bool:
        return self.workspace_ids is None


def _normalize_uuid(raw: str | None, *, field: str) -> str | None:
    candidate = (raw or "").strip()
    if not candidate:
        return None
    try:
        return str(uuid.UUID(candidate))
    except ValueError as exc:
        raise ApiError(
            ErrorCode.AUTH_ERROR,
            f"{field} must be a UUID",
            status_code=401,
        ) from exc


def parse_workspace_scope(raw: str | None) -> frozenset[str] | None:
    if raw is None or not raw.strip():
        return None
    workspaces: set[str] = set()
    for part in raw.split(","):
        candidate = part.strip()
        if not candidate:
            continue
        try:
            workspaces.add(str(uuid.UUID(candidate)))
        except ValueError as exc:
            raise ApiError(
                ErrorCode.AUTH_ERROR,
                "workspace scope must contain UUIDs",
                status_code=401,
            ) from exc
    return frozenset(workspaces)


def resolve_principal(
    user_id: str | None,
    workspace_scope: str | None,
    *,
    required: bool,
) -> Principal:
    normalized_user = _normalize_uuid(user_id, field="principal user id")
    if required and normalized_user is None:
        raise ApiError(
            ErrorCode.AUTH_ERROR,
            "An authenticated principal is required",
            status_code=401,
        )
    return Principal(
        user_id=normalized_user,
        workspace_ids=parse_workspace_scope(workspace_scope),
    )


def ensure_workspace_allowed(principal: Principal, workspace_id: str) -> None:
    if principal.workspace_ids is None:
        return
    if workspace_id not in principal.workspace_ids:
        raise ApiError(
            ErrorCode.FORBIDDEN,
            "Workspace access denied",
            status_code=403,
        )


async def get_principal(request: Request) -> Principal:
    security = request.app.state.settings.security
    return resolve_principal(
        request.headers.get(security.principal_header),
        request.headers.get(security.principal_workspaces_header),
        required=security.require_principal,
    )


__all__ = [
    "Principal",
    "ensure_workspace_allowed",
    "get_principal",
    "parse_workspace_scope",
    "resolve_principal",
]
