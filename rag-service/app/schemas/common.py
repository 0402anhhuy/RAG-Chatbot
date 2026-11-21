"""Shared response envelope models."""

from typing import Literal

from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict[str, object] = Field(default_factory=dict)
    request_id: str


class ErrorResponse(BaseModel):
    success: Literal[False] = False
    error: ErrorDetail
