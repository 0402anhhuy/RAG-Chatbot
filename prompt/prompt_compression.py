from langchain_core.prompts import ChatPromptTemplate


def compress_context() -> ChatPromptTemplate:
    return ChatPromptTemplate.from_template(
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
