from __future__ import annotations

import pytest

from app.core.errors import ApiError
from app.core.principal import (
    Principal,
    ensure_workspace_allowed,
    parse_workspace_scope,
    resolve_principal,
)

WORKSPACE = "6f1d4d9c-2b57-4c1a-9f6e-1a2b3c4d5e6f"
OTHER = "11111111-2222-3333-4444-555555555555"


def test_required_principal_rejects_missing_user() -> None:
    with pytest.raises(ApiError) as raised:
        resolve_principal(None, None, required=True)
    assert raised.value.status_code == 401


def test_missing_principal_is_allowed_when_not_required() -> None:
    principal = resolve_principal(None, None, required=False)
    assert principal.user_id is None
    assert principal.unrestricted


def test_invalid_user_id_is_rejected() -> None:
    with pytest.raises(ApiError) as raised:
        resolve_principal("not-a-uuid", None, required=True)
    assert raised.value.status_code == 401


def test_workspace_scope_restricts_access() -> None:
    principal = resolve_principal(WORKSPACE, WORKSPACE, required=True)

    ensure_workspace_allowed(principal, WORKSPACE)
    with pytest.raises(ApiError) as raised:
        ensure_workspace_allowed(principal, OTHER)
    assert raised.value.status_code == 403


def test_unrestricted_principal_allows_any_workspace() -> None:
    ensure_workspace_allowed(Principal(user_id=WORKSPACE, workspace_ids=None), OTHER)


def test_workspace_scope_parsing() -> None:
    assert parse_workspace_scope(None) is None
    assert parse_workspace_scope("  ") is None
    assert parse_workspace_scope(f"{WORKSPACE},{OTHER}") == frozenset({WORKSPACE, OTHER})

    with pytest.raises(ApiError):
        parse_workspace_scope("not-a-uuid")
