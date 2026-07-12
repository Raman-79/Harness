import chromadb
from langchain_cloudflare.embeddings import CloudflareWorkersAIEmbeddings
from app.config import settings

chroma_client = chromadb.PersistentClient(path=settings.CHROMA_DIR)
collection = chroma_client.get_or_create_collection("forge_files")

embeddings_model = CloudflareWorkersAIEmbeddings(
    account_id=settings.CLOUDFLARE_ACCOUNT_ID,
    api_token=settings.CLOUDFLARE_API_KEY,
    model_name="@cf/baai/bge-small-en-v1.5" # standard text embedding model
)

async def embed_and_store(chunks: list[dict], file_id: str, filename: str):
    if not chunks:
        return
        
    texts = [c["text"] for c in chunks]
    metadatas = [
        {
            "file_id": file_id,
            "filename": filename,
            "page": c["metadata"].get("page", 0) if c["metadata"].get("page") else 0,
            "chunk_index": c["metadata"].get("chunk_index", 0)
        }
        for c in chunks
    ]
    ids = [f"{file_id}_{i}" for i in range(len(chunks))]
    
    # Generate embeddings
    embeddings = await embeddings_model.aembed_documents(texts)
    
    # Store in Chroma
    collection.upsert(
        ids=ids,
        embeddings=embeddings,
        metadatas=metadatas,
        documents=texts
    )
