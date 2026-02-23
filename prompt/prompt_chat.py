from langchain_core.prompts import ChatPromptTemplate


def get_chat_prompt():
    return ChatPromptTemplate.from_template(
        """
        You are a helpful AI assistant.

        Use ONLY the provided context to answer the question.
        If the context contains enough information to infer the answer, explain it clearly.
        If the context does not contain sufficient information, say "I don't know."

        Answer in a concise and clear way.

        Context:
        {context}

        Question:
        {question}
        """
    )
