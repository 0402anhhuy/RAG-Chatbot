import streamlit as st
import tempfile
import os

from langchain_google_genai import ChatGoogleGenerativeAI

from loaders.pdf_loader import load_pdfs_from_dir
from domain.chunking import chunk_documents
from retrieval.retriever import build_vectorstore, get_retriever
from generation.prompt import get_rag_prompt
from generation.answer import generate_answer
from utils.config import CHAT_MODEL, GOOGLE_API_KEY


st.set_page_config(
    page_title="RAG PDF Chatbot",
    layout="wide"
)

st.title("RAG Chatbot (PDF)")
st.caption("Upload a PDF and ask questions about its content")

# ---- Upload PDF ----
uploaded_file = st.file_uploader(
    "Upload a PDF file",
    type=["pdf"]
)

if uploaded_file:
    with st.spinner("Processing PDF..."):
        with tempfile.TemporaryDirectory() as tmpdir:
            pdf_path = os.path.join(tmpdir, uploaded_file.name)
            with open(pdf_path, "wb") as f:
                f.write(uploaded_file.read())

            documents = load_pdfs_from_dir(tmpdir)
            chunks = chunk_documents(documents)

            vectorstore = build_vectorstore(chunks)
            retriever = get_retriever(vectorstore)

            st.success("PDF indexed successfully!")

    # ---- LLM ----
    llm = ChatGoogleGenerativeAI(
        model=CHAT_MODEL,
        google_api_key=GOOGLE_API_KEY,
        temperature=0.2
    )

    prompt = get_rag_prompt()

    # ---- Chat ----
    question = st.text_input("Ask a question about the document")

    if question:
        with st.spinner("Thinking..."):
            docs = retriever.invoke(question)
            context = "\n\n".join(d.page_content for d in docs)

            answer = generate_answer(
                llm=llm,
                prompt=prompt,
                context=context,
                question=question
            )

        st.markdown("### Answer")
        st.write(answer)

        pages = sorted(set(d.metadata.get("page", "N/A") for d in docs))
        st.markdown(f"📚 **Sources:** pages {pages}")
