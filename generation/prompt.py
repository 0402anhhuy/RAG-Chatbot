from langchain_core.prompts import ChatPromptTemplate


def get_rag_prompt():
    return ChatPromptTemplate.from_template(
        """
        You are a helpful AI assistant.
        Answer the question ONLY using the context below.
        If the answer is not in the context, say you don't know.

        Context: {context}

        Question: {question}
        """
    )
