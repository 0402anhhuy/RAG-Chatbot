def generate_answer(llm: any, prompt: any, context: str, question: str) -> str:
    chain = prompt | llm

    response = chain.invoke({
        "context": context,
        "question": question
    })

    return response.content