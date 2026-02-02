from tabulate import tabulate

def print_chunks_table(chunks, max_len=120):
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
    print(tabulate(table, headers=headers, tablefmt="grid"))
