from langchain_core.tools import tool
from app.ingestion.embedder import collection


@tool
def retrieve_from_files(query: str, file_ids: list[str] | None = None) -> str:
    """Search uploaded files for information relevant to the query.
    Returns matching passages with source citations (filename, page number).
    The caller may scope retrieval by passing a list of file_ids; otherwise
    the tool searches across every uploaded file.
    """
    where_clause = None
    if file_ids:
        if len(file_ids) == 1:
            where_clause = {"file_id": file_ids[0]}
        else:
            where_clause = {"file_id": {"$in": file_ids}}

    results = collection.query(
        query_texts=[query], n_results=5, where=where_clause
    )

    if not results or not results.get("documents") or not results["documents"][0]:
        return "No relevant information found in the files."

    formatted_results = []
    for doc, meta in zip(results["documents"][0], results["metadatas"][0]):
        filename = meta.get("filename", "Unknown")
        page = meta.get("page", 0)
        page_str = f", Page {page}" if page else ""
        formatted_results.append(f"[Source: {filename}{page_str}] {doc}")

    return "\n\n".join(formatted_results)
