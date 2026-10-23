from typing import Any, List
from langchain_core.documents import Document
from prompt.prompt_compression import compression_context

def compress_context(
    llm: Any,
    docs: List[Document],
    question: str
) -> str:

    compressed_blocks = []

    context = compression_context()

    for doc in docs:
        response = llm.invoke(
            context.format(
                text=doc.page_content,
                question=question
            )
        )

        content = getattr(response, "content", str(response)).strip()

        if content != "NONE":
            compressed_blocks.append(content)

    return "\n\n".join(compressed_blocks)
