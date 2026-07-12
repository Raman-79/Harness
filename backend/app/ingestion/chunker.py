from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.config import settings

def chunk_text(pages: list[dict]):
    """
    Takes a list of dictionaries: [{"page": 1, "text": "..."}]
    Returns a list of chunks with metadata: 
    [{"text": "...", "metadata": {"page": 1, "chunk_index": 0}}]
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.CHUNK_SIZE,
        chunk_overlap=settings.CHUNK_OVERLAP
    )
    
    chunks = []
    chunk_index = 0
    for page_data in pages:
        page_num = page_data.get("page")
        text = page_data.get("text", "")
        
        splits = splitter.create_documents([text])
        for split in splits:
            chunks.append({
                "text": split.page_content,
                "metadata": {
                    "page": page_num,
                    "chunk_index": chunk_index,
                }
            })
            chunk_index += 1
            
    return chunks
