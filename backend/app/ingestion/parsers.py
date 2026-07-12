import os
import pandas as pd
from pypdf import PdfReader
import docx

class UnsupportedFormatError(Exception):
    pass

def parse_pdf(path: str) -> list[dict]:
    reader = PdfReader(path)
    pages = []
    has_text = False
    
    for i, page in enumerate(reader.pages):
        text = page.extract_text()
        if text and text.strip():
            has_text = True
            pages.append({"page": i + 1, "text": text})
            
    if not has_text:
        raise UnsupportedFormatError("PDF appears to be image-only. Scanned documents are not supported yet.")
        
    return pages

def parse_docx(path: str) -> list[dict]:
    doc = docx.Document(path)
    text = "\n".join([para.text for para in doc.paragraphs])
    return [{"page": 1, "text": text}]

def parse_csv(path: str) -> list[dict]:
    df = pd.read_csv(path)
    text = df.to_string(index=False)
    return [{"page": 1, "text": text}]

def parse_xlsx(path: str) -> list[dict]:
    df = pd.read_excel(path)
    text = df.to_string(index=False)
    return [{"page": 1, "text": text}]

def parse_text(path: str) -> list[dict]:
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    return [{"page": 1, "text": text}]

def parse_file(path: str, mime_type: str) -> list[dict]:
    ext = os.path.splitext(path)[1].lower()
    
    if mime_type == "application/pdf" or ext == ".pdf":
        return parse_pdf(path)
    elif mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document" or ext == ".docx":
        return parse_docx(path)
    elif mime_type == "text/csv" or ext == ".csv":
        return parse_csv(path)
    elif mime_type == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" or ext == ".xlsx":
        return parse_xlsx(path)
    elif mime_type.startswith("text/") or ext in [".txt", ".md"]:
        return parse_text(path)
    else:
        raise UnsupportedFormatError(f"Unsupported file type: {mime_type} ({ext})")
