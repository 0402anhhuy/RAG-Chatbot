from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from copy import deepcopy

def _merge_small_chunks(chunks: list[Document], min_length=300) -> list[Document]:
    merged = []
    buffer = None

    for chunk in chunks:
        if buffer is None:
            buffer = deepcopy(chunk)
            continue

        # Nếu chunk quá ngắn → gộp
        if len(chunk.page_content) < min_length:
            buffer.page_content += "\n\n" + chunk.page_content
        else:
            merged.append(buffer)
            buffer = deepcopy(chunk)

    if buffer:
        merged.append(buffer)

    return merged

def recursive_chunk_documents(documents: list[Document], mode: str):
    if mode == "flashcard":
        chunk_size = 700
        chunk_overlap = 150
        min_chunk_length = 250
    elif mode == "exam":
        chunk_size = 1000
        chunk_overlap = 200
        min_chunk_length = 450
    else:
        chunk_size = 500
        chunk_overlap = 200
        min_chunk_length = 150

    # Tạo bộ chia bằng Recursize characters
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=[
            "\n\n",  # Đoạn
            "\n",    # Dòng
            ". ",    # Câu
            "; ",
            ", ",
            " "
        ]
    )

    raw_chunks = splitter.split_documents(documents)

    merged_chunks = _merge_small_chunks(
        chunks=raw_chunks,
        min_length=min_chunk_length
    )

    """
    - Gắn metadata sau khi chunk
    - Duyệt từng chunk trong merged_chunks (enumerate):
        - idx: index của chunk (0, 1, 2, ...)
        - chunk: [Document] sau khi đã chia nhỏ
            - page_content: nội dung văn bản của chunk
            - metadata: dict chứa thông tin metadata gốc
    """
    final_chunks = []
    for idx, chunk in enumerate(merged_chunks):
        meta = chunk.metadata or {}

        chunk.metadata = {
            **meta,
            "chunk_id": idx,
            "mode": mode,
            "page": meta.get("page", "N/A"),
            "source": meta.get("source", "unknown")
        }

        final_chunks.append(chunk)

    return final_chunks