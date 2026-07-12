@echo off
echo Starting Backend...
start cmd /k "cd backend && .\.venv\Scripts\uvicorn app.main:app --port 8000"

echo Starting Frontend...
start cmd /k "cd frontend && npm run dev"

echo Both services started in new windows.
