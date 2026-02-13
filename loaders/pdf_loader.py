import os
from langchain_community.document_loaders import PyPDFLoader


def load_pdfs_from_dir(directory: str):
    documents = []

    for file in os.listdir(directory):
        if file.lower().endswith(".pdf"):
            path = os.path.join(directory, file)
            loader = PyPDFLoader(path)
            docs = loader.load()
            documents.extend(docs)

    return documents