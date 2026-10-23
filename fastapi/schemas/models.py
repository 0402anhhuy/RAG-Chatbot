from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class ModelSpec(BaseModel):
    id: str = Field(..., description="Unique model identifier")
    provider: Literal["google_gemini", "groq"]
    display_name: str
    category: Literal["reasoning", "balanced", "fast"]
    recommended_for: List[str]
    available: bool = True


class DocumentUploadResponse(BaseModel):
    document_id: str
    filename: str
    collection_type: Literal["study_document", "coding_standard"] = "study_document"
    chunk_count: int
    status: str = "READY"


class RagCitation(BaseModel):
    document_id: str
    filename: str
    page: Any
    score: str
    snippet: str


class RagMessageRequest(BaseModel):
    content: str
    document_id: Optional[str] = None
    model_id: Optional[str] = Field(
        default="llama-3.3-70b-versatile",
        description="Dynamic model ID selected by user (Gemini or Groq)",
    )
    compress_context: bool = True


class RagMessageResponse(BaseModel):
    session_id: str
    role: str = "assistant"
    content: str
    model_used: str
    provider: str
    reasoning_trace: Optional[str] = None
    citations: List[RagCitation] = []


class CodeReviewFinding(BaseModel):
    id: str
    severity: Literal["CRITICAL", "WARNING", "INFO"]
    category: Literal["ARCHITECTURE", "SECURITY", "PERFORMANCE", "CLEAN_CODE"]
    line_start: int
    line_end: int
    title: str
    description: str
    rag_rule_citation: Optional[str] = Field(
        default=None,
        description="Citation from project coding standards / architecture docs in RAG",
    )
    original_snippet: Optional[str] = None
    suggested_fix: Optional[str] = None


class AgentExecutionTrace(BaseModel):
    agent_id: str
    agent_name: str
    role: Literal["ARCHITECT", "SECURITY", "PERFORMANCE", "CONSOLIDATOR"]
    model_used: str
    status: Literal["COMPLETED", "SKIPPED", "ERROR"] = "COMPLETED"
    duration_ms: int
    findings_count: int
    summary: str


class CodeReviewRequest(BaseModel):
    code_content: str = Field(..., description="Source code or unified Git diff to review")
    filename: Optional[str] = "Main.java"
    language: Optional[str] = "java"
    model_id: str = Field(
        default="gemini-3.1-pro-preview",
        description="Primary model ID or default model for review agents",
    )
    execution_mode: Literal["single_pass", "multi_agent_pipeline"] = "multi_agent_pipeline"
    standard_document_ids: List[str] = Field(
        default_factory=list,
        description="Optional list of RAG document IDs containing coding conventions or architecture rules",
    )
    agent_models: Optional[Dict[str, str]] = Field(
        default=None,
        description="Optional per-agent model overrides (e.g. {'ARCHITECT': 'gemini-3.1-pro-preview', 'SECURITY': 'deepseek-r1-distill-llama-70b'})",
    )


class CodeReviewResponse(BaseModel):
    overall_score: int = Field(..., ge=0, le=100)
    grade: Literal["A", "B", "C", "D", "F"]
    summary: str
    model_used: str
    execution_mode: str
    rag_standards_applied: List[str] = []
    findings: List[CodeReviewFinding] = []
    refactored_code: Optional[str] = None
    agent_traces: List[AgentExecutionTrace] = []
