import re

def detect_artifacts(text: str) -> list[dict]:
    """
    Parse fenced code blocks from markdown text.
    Returns a list of dictionaries with language and content.
    """
    artifacts = []
    
    # Regex to match fenced code blocks: ```lang\ncontent\n```
    pattern = r"```([a-zA-Z0-9_+-]+)\n(.*?)```"
    matches = re.finditer(pattern, text, re.DOTALL)
    
    for match in matches:
        language = match.group(1).lower()
        content = match.group(2).strip()
        
        # Only extract if size > 5 lines
        if len(content.split('\n')) > 5:
            # Normalize language tag
            if language in ['jsx', 'tsx', 'javascript', 'typescript']:
                language = 'react'
            
            artifacts.append({
                "language": language,
                "content": content
            })
            
    return artifacts
