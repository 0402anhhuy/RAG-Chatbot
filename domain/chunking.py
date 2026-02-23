from langchain_text_splitters import RecursiveCharacterTextSplitter
from copy import deepcopy


def _merge_small_chunks(chunks: list, min_length=300):
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

"""
---------------- Main API ----------------
- Hàm chunk_documents() được gọi để chia nhỏ document thành các chunk
    Args:
        documents: list các Document sau khi load (List[Document])
        mode: "rag" | "flashcard" | "exam"
"""
def chunk_documents(documents: list, mode="rag"):
    if mode == "flashcard":
        chunk_size = 400
        chunk_overlap = 80
        min_chunk_length = 200
    elif mode == "exam":
        chunk_size = 1000
        chunk_overlap = 200
        min_chunk_length = 350
    else:
        chunk_size = 850
        chunk_overlap = 200
        min_chunk_length = 300

    # Tạo công cụ chia nhỏ văn bản → splitter (Dùng RecursiveCharacterTextSplitter)
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

    # Chia nhỏ document thành các chunk vụn → List[Document]
    raw_chunks = splitter.split_documents(documents)

    # Merge các chunk quá ngắn vào chunk trước đó → List[Document]
    merged_chunks = _merge_small_chunks(
        chunks=raw_chunks,
        min_length=min_chunk_length
    )

    """
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
