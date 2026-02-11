from langchain_text_splitters import RecursiveCharacterTextSplitter
from copy import deepcopy


def _merge_small_chunks(chunks, min_length=300):
    """
    Gộp các chunk quá ngắn vào chunk trước đó
    để giữ trọn vẹn concept / ý nghĩa.
    """
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


def chunk_documents(documents, mode="rag"):
    """
    mode:
      - rag       : dùng cho chat hỏi đáp
      - flashcard : sinh flashcard
      - exam      : sinh câu hỏi thi
    """

    # ---------------- Chunk config theo use case ----------------
    if mode == "flashcard":
        chunk_size = 400
        chunk_overlap = 80
        min_chunk_length = 200
    elif mode == "exam":
        chunk_size = 1000
        chunk_overlap = 200
        min_chunk_length = 350
    else:  # rag
        chunk_size = 800
        chunk_overlap = 150
        min_chunk_length = 300

    # ---------------- Semantic-first splitter ----------------
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=[
            "\n\n",  # đoạn
            "\n",    # dòng
            ". ",    # câu
            "; ",
            ", ",
            " "
        ]
    )

    raw_chunks = splitter.split_documents(documents)

    # ---------------- Merge chunk vụn ----------------
    merged_chunks = _merge_small_chunks(
        raw_chunks,
        min_length=min_chunk_length
    )

    # ---------------- Metadata enrichment ----------------
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
