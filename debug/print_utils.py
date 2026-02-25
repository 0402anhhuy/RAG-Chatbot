from tabulate import tabulate
from langchain_core.documents import Document


def print_chunks_table(chunks: list[Document], max_len=300):
    table = []

    for i, doc in enumerate(chunks):
        content = doc.page_content.replace("\n", " ")
        if len(content) > max_len:
            content = content[:max_len] + "..."

        table.append([
            i,
            doc.metadata.get("source", ""),
            doc.metadata.get("page", ""),
            content
        ])

    headers = ["#", "Source", "Page", "Chunk Content"]
    print(tabulate(tabular_data=table, headers=headers, tablefmt="grid"))
