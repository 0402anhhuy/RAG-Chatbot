from langchain_google_genai import ChatGoogleGenerativeAI

from loaders.pdf_loader import load_pdfs_from_dir
from domain.chunking import chunk_documents
from retrieval.retriever import build_vectorstore, get_retriever
from generation.prompt import get_rag_prompt
from generation.answer import generate_answer
from debug.print_utils import print_chunks_table
from utils.config import CHAT_MODEL, GOOGLE_API_KEY


def main():
    pdf_dir = r"D:\AnhHuy\Code\Project\RAG_Chatbot\data\pdfs"

    # INGESTION
    print("📄 Loading PDFs...")
    documents = load_pdfs_from_dir(pdf_dir)

    chunks = chunk_documents(documents)
    print_chunks_table(chunks)
    
    print("📦 Building vector database...")
    vectorstore = build_vectorstore(chunks)
    retriever = get_retriever(vectorstore)
    
    # LLM
    llm = ChatGoogleGenerativeAI(
        model=CHAT_MODEL,
        google_api_key=GOOGLE_API_KEY,
        temperature=0.2
    )

    prompt = get_rag_prompt()

    print("\nRAG chatbot ready. Type 'exit' to quit.\n")

    # CHAT LOOP
    while True:
        question = input("🧑 You: ")
        if question.lower() in ["exit", "quit"]:
            break

        docs = retriever.invoke(question)
        context = "\n\n".join(d.page_content for d in docs)

        answer = generate_answer(
            llm=llm,
            prompt=prompt,
            context=context,
            question=question
        )

        print("\n🤖 Assistant:")
        print(answer)

        pages = sorted(set(d.metadata.get("page", "N/A") for d in docs))
        print(f"\n📚 Sources: pages {pages}")
        print("-" * 60)


if __name__ == "__main__":
    main()
