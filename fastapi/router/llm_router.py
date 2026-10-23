import os
import re
from typing import Dict, List, Optional, Tuple

from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI
try:
    from schemas.models import ModelSpec
except ImportError:
    from . import __name__  # fallback
    from fastapi.schemas.models import ModelSpec


SUPPORTED_MODELS: Dict[str, ModelSpec] = {
    "gemini-3.1-pro-preview": ModelSpec(
        id="gemini-3.1-pro-preview",
        provider="google_gemini",
        display_name="Gemini 3.1 Pro (Deep Architecture & Code Review)",
        category="reasoning",
        recommended_for=["code_review", "architecture_audit", "multi_agent"],
    ),
    "gemini-flash-latest": ModelSpec(
        id="gemini-flash-latest",
        provider="google_gemini",
        display_name="Gemini 3 Flash (Fast RAG & Context Compression)",
        category="fast",
        recommended_for=["rag_chat", "context_compression", "flashcards", "exam"],
    ),
    "llama-3.3-70b-versatile": ModelSpec(
        id="llama-3.3-70b-versatile",
        provider="groq",
        display_name="Groq · Llama 3.3 70B Versatile",
        category="balanced",
        recommended_for=["rag_chat", "code_review", "flashcards", "exam"],
    ),
    "deepseek-r1-distill-llama-70b": ModelSpec(
        id="deepseek-r1-distill-llama-70b",
        provider="groq",
        display_name="Groq · DeepSeek R1 Distill Llama 70B (Reasoning)",
        category="reasoning",
        recommended_for=["code_review", "security_audit", "bug_analysis"],
    ),
    "mixtral-8x7b-32768": ModelSpec(
        id="mixtral-8x7b-32768",
        provider="groq",
        display_name="Groq · Mixtral 8x7B (32K Context)",
        category="fast",
        recommended_for=["rag_chat", "context_compression"],
    ),
}


class MultiModelRouter:
    """
    Unified LLM Router & Provider Factory supporting dynamic per-request switching
    between Google Gemini and Groq models.
    """

    @staticmethod
    def list_models() -> List[ModelSpec]:
        gemini_key = bool(os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"))
        groq_key = bool(os.getenv("GROQ_API_KEY"))

        result: List[ModelSpec] = []
        for spec in SUPPORTED_MODELS.values():
            item = spec.model_copy()
            if item.provider == "google_gemini":
                item.available = gemini_key
            elif item.provider == "groq":
                item.available = groq_key
            result.append(item)
        return result

    @staticmethod
    def get_llm(model_id: Optional[str] = None, temperature: float = 0.2):
        resolved_id = model_id if model_id in SUPPORTED_MODELS else "llama-3.3-70b-versatile"
        spec = SUPPORTED_MODELS[resolved_id]

        if spec.provider == "google_gemini":
            api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
            if not api_key and os.getenv("GROQ_API_KEY"):
                # Smart fallback to Groq if Gemini key is not configured
                resolved_id = "llama-3.3-70b-versatile"
                spec = SUPPORTED_MODELS[resolved_id]
            else:
                return (
                    ChatGoogleGenerativeAI(
                        model=resolved_id,
                        google_api_key=api_key,
                        temperature=temperature,
                    ),
                    spec,
                )

        groq_key = os.getenv("GROQ_API_KEY")
        return (
            ChatGroq(
                groq_api_key=groq_key,
                model_name=resolved_id,
                temperature=temperature,
            ),
            spec,
        )

    @staticmethod
    def extract_thinking_trace(raw_text: str) -> Tuple[str, Optional[str]]:
        """
        Extracts <think>...</think> blocks produced by reasoning models like DeepSeek R1
        so the UI can toggle 'Hide Thinking' cleanly.
        """
        match = re.search(r"<think>(.*?)</think>", raw_text, flags=re.DOTALL)
        if not match:
            return raw_text.strip(), None
        reasoning = match.group(1).strip()
        cleaned = re.sub(r"<think>.*?</think>", "", raw_text, flags=re.DOTALL).strip()
        return cleaned, reasoning
