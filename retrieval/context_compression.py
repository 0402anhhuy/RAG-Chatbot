from typing import List
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI


compression_prompt = ChatPromptTemplate.from_template(
    """
    You are a context filtering assistant.

    Your task:
    Extract ONLY the information from the text that is relevant to the question.
    - Keep important facts.
    - Remove unrelated details.
    - Do NOT summarize generally.
    - If nothing is relevant, return exactly: NONE

    Text:
    {text}

    Question:
    {question}
    """
)


def compress_context(
    llm: ChatGoogleGenerativeAI,
    docs: List[Document],
    question: str
) -> str:

    compressed_blocks = []

    for doc in docs:
        response = llm.invoke(
            compression_prompt.format(
                text=doc.page_content,
                question=question
            )
        )

        content = response.content.strip()

        if content != "NONE":
            compressed_blocks.append(content)

    return "\n\n".join(compressed_blocks)
