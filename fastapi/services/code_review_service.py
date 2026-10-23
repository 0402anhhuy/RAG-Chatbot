import json
import time
from typing import List

from langchain_core.prompts import ChatPromptTemplate

try:
    from router.llm_router import MultiModelRouter
    from schemas.models import (
        AgentExecutionTrace,
        CodeReviewFinding,
        CodeReviewRequest,
        CodeReviewResponse,
    )
    from services.rag_service import HybridRagService
except ImportError:
    from fastapi.router.llm_router import MultiModelRouter
    from fastapi.schemas.models import (
        AgentExecutionTrace,
        CodeReviewFinding,
        CodeReviewRequest,
        CodeReviewResponse,
    )
    from fastapi.services.rag_service import HybridRagService


AGENT_PROMPTS = {
    "ARCHITECT": """You are the Lead Architecture & Coding Convention Agent.
Review the numbered source code below against the provided Project RAG Standards (if any) and clean architecture principles.
Return ONLY valid JSON with key "findings" (list of objects with: severity [CRITICAL|WARNING|INFO], category="ARCHITECTURE", line_start, line_end, title, description, rag_rule_citation, original_snippet, suggested_fix) and "summary".""",
    "SECURITY": """You are the Application Security Audit Agent (OWASP Top 10, secret exposure, injection, auth/RBAC flaws).
Analyze the numbered source code below for security vulnerabilities.
Return ONLY valid JSON with key "findings" (list of objects with: severity [CRITICAL|WARNING|INFO], category="SECURITY", line_start, line_end, title, description, rag_rule_citation, original_snippet, suggested_fix) and "summary".""",
    "PERFORMANCE": """You are the Performance & Clean Code Agent (algorithmic complexity, N+1 queries, memory leaks, readability).
Analyze the numbered source code below.
Return ONLY valid JSON with key "findings" (list of objects with: severity [CRITICAL|WARNING|INFO], category="PERFORMANCE", line_start, line_end, title, description, rag_rule_citation, original_snippet, suggested_fix) and "summary".""",
}


class MultiAgentCodeReviewService:
    """
    Orchestrates Single-Pass and Multi-Agent Canvas Code Review with:
    1. Dynamic model switching per request or per agent (Gemini 3.1 Pro, Gemini 3 Flash, Groq Llama 3.3, DeepSeek R1, Mixtral)
    2. RAG-grounded verification against uploaded architecture/coding standard documents
    3. Line-by-line findings and suggested code patches
    """

    def __init__(self, rag_service: HybridRagService) -> None:
        self.rag_service = rag_service

    @staticmethod
    def _number_lines(code: str) -> str:
        return "\n".join(f"{idx + 1:4d} | {line}" for idx, line in enumerate(code.splitlines()))

    def _run_specialist_agent(
        self,
        role: str,
        agent_name: str,
        numbered_code: str,
        rag_standards: str,
        model_id: str,
    ) -> tuple[List[CodeReviewFinding], AgentExecutionTrace]:
        start_ts = time.time()
        llm, spec = MultiModelRouter.get_llm(model_id, temperature=0.1)

        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", AGENT_PROMPTS[role]),
                (
                    "human",
                    "### Project RAG Standards:\n{rag_standards}\n\n### Numbered Code:\n{code}",
                ),
            ]
        )

        findings: List[CodeReviewFinding] = []
        summary = f"{agent_name} completed analysis."
        status = "COMPLETED"

        try:
            chain = prompt | llm
            resp = chain.invoke(
                {
                    "rag_standards": rag_standards or "Standard industry best practices.",
                    "code": numbered_code,
                }
            )
            cleaned_text, _ = MultiModelRouter.extract_thinking_trace(resp.content)
            json_start = cleaned_text.find("{")
            json_end = cleaned_text.rfind("}")
            if json_start != -1 and json_end != -1:
                parsed = json.loads(cleaned_text[json_start : json_end + 1])
                summary = parsed.get("summary", summary)
                for idx, item in enumerate(parsed.get("findings", [])):
                    findings.append(
                        CodeReviewFinding(
                            id=f"{role.lower()}-{idx + 1}",
                            severity=item.get("severity", "WARNING"),
                            category=item.get("category", role if role != "ARCHITECT" else "ARCHITECTURE"),
                            line_start=int(item.get("line_start", 1)),
                            line_end=int(item.get("line_end", 1)),
                            title=item.get("title", "Code Review Finding"),
                            description=item.get("description", ""),
                            rag_rule_citation=item.get("rag_rule_citation"),
                            original_snippet=item.get("original_snippet"),
                            suggested_fix=item.get("suggested_fix"),
                        )
                    )
        except Exception as exc:
            status = "ERROR"
            summary = f"Agent execution error: {str(exc)}"

        duration_ms = int((time.time() - start_ts) * 1000)
        trace = AgentExecutionTrace(
            agent_id=f"node-{role.lower()}",
            agent_name=agent_name,
            role=role,
            model_used=spec.id,
            status=status,
            duration_ms=duration_ms,
            findings_count=len(findings),
            summary=summary,
        )
        return findings, trace

    def analyze_code(self, request: CodeReviewRequest) -> CodeReviewResponse:
        numbered_code = self._number_lines(request.code_content)
        rag_context, applied_docs = self.rag_service.retrieve_coding_standards_context(
            query=f"{request.language} {request.filename}\n{request.code_content[:600]}",
            standard_document_ids=request.standard_document_ids,
        )

        agent_models = request.agent_models or {}
        all_findings: List[CodeReviewFinding] = []
        traces: List[AgentExecutionTrace] = []

        if request.execution_mode == "multi_agent_pipeline":
            agents_plan = [
                ("ARCHITECT", "Architecture & RAG Convention Agent"),
                ("SECURITY", "Security & Vulnerability Audit Agent"),
                ("PERFORMANCE", "Performance & Clean Code Agent"),
            ]
        else:
            agents_plan = [("ARCHITECT", "Unified Code Reviewer Agent")]

        for role, name in agents_plan:
            target_model = agent_models.get(role, request.model_id)
            agent_findings, trace = self._run_specialist_agent(
                role=role,
                agent_name=name,
                numbered_code=numbered_code,
                rag_standards=rag_context,
                model_id=target_model,
            )
            all_findings.extend(agent_findings)
            traces.append(trace)

        critical_count = sum(1 for f in all_findings if f.severity == "CRITICAL")
        warning_count = sum(1 for f in all_findings if f.severity == "WARNING")
        info_count = sum(1 for f in all_findings if f.severity == "INFO")

        score = max(0, 100 - (critical_count * 20) - (warning_count * 8) - (info_count * 2))
        grade = (
            "A"
            if score >= 90
            else "B"
            if score >= 80
            else "C"
            if score >= 65
            else "D"
            if score >= 50
            else "F"
        )

        return CodeReviewResponse(
            overall_score=score,
            grade=grade,
            summary=(
                f"Completed {request.execution_mode} review using {request.model_id}. "
                f"Detected {critical_count} critical, {warning_count} warning, and {info_count} informational findings."
            ),
            model_used=request.model_id,
            execution_mode=request.execution_mode,
            rag_standards_applied=applied_docs,
            findings=all_findings,
            agent_traces=traces,
        )
