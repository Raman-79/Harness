# Implementation Plan: Personal Agentic Harness ("Forge")

> Based on [agentic_harness_prd.md](file:///c:/Users/Sam/Harness/agentic_harness_prd.md)

---

## Technology Validation Results

All core technologies referenced in the PRD have been validated:

| Technology | Status | Version | Notes |
|---|---|---|---|
| `deepagents` | ✅ Confirmed | v0.6.12 (Jun 2026) | `create_deep_agent`, `FilesystemBackend`, `SkillsMiddleware`, sandbox backends, HITL — all exist |
| `langchain-mcp-adapters` | ✅ Confirmed | v0.3.0 (Jun 2026) | `MultiServerMCPClient`, `streamable_http` transport, auth support |
| `langchain-cloudflare` | ✅ Confirmed | v0.3.5 (Jun 2026) | `ChatCloudflareWorkersAI` with tool calling support |
| `@cf/moonshotai/kimi-k2.6` | ✅ Confirmed | — | 262k context, tool calling, vision, reasoning. Also: `kimi-k2.7-code` variant |
| Sandpack | ✅ Confirmed | v2.20.0 | React 19 support, in-browser bundling via Nodebox, `static` template for HTML/SVG |
| Figma MCP Server | ✅ Official | — | `https://mcp.figma.com/mcp`, OAuth2, 12+ tools (design context, assets, creation) |
| Agent Skills Spec | ✅ Live | — | `https://agentskills.io/specification` — open standard, SKILL.md format |

> [!NOTE]
> The PRD's architecture and code examples are well-grounded. The implementation plan below follows the PRD's design closely, adding specific file breakdowns and implementation details.

---

## Resolved Decisions

| Decision | Resolution |
|----------|------------|
| **Cloudflare credentials** | ✅ Available (account ID + API key) |
| **Model variant** | `@cf/moonshotai/kimi-k2.6` (general-purpose) |
| **Sandbox approach** | E2B hosted (no Docker Desktop) — see Phase 3 |
| **Phase 4 connector** | Figma only (Canva dropped — requires paid plan) |
| **Embedding model** | `CloudflareWorkersAIEmbeddings` (hosted, uses existing Cloudflare account) |

> [!TIP]
> **All open questions are resolved.** This plan is ready for execution approval.

---

## Project Directory Structure

```
Harness/
├── docker-compose.yml
├── .env                         # Secrets, API keys (CF, E2B, etc.)
├── .env.example
├── connectors.yaml              # Phase 4: MCP connector registry
│
├── backend/                     # Python: FastAPI + deepagents runtime
│   ├── pyproject.toml
│   ├── alembic/                 # DB migrations
│   │   └── versions/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app entrypoint
│   │   ├── config.py            # Settings (pydantic-settings)
│   │   ├── database.py          # SQLite/Postgres connection
│   │   ├── models.py            # SQLAlchemy ORM models
│   │   │
│   │   ├── api/                 # Route handlers
│   │   │   ├── __init__.py
│   │   │   ├── files.py         # POST /files, GET /files/{id}
│   │   │   ├── chat.py          # WS /chat/stream
│   │   │   ├── conversations.py # GET /conversations/{id}
│   │   │   ├── artifacts.py     # Phase 2: artifact CRUD
│   │   │   ├── skills.py        # Phase 3: skill listing/management
│   │   │   └── connectors.py   # Phase 4: connector management + OAuth
│   │   │
│   │   ├── agent/               # DeepAgents agent runtime
│   │   │   ├── __init__.py
│   │   │   ├── factory.py       # Agent construction via create_deep_agent
│   │   │   ├── prompts.py       # System prompts
│   │   │   ├── tools/
│   │   │   │   ├── __init__.py
│   │   │   │   └── rag.py       # retrieve_from_files tool
│   │   │   └── artifacts/       # Phase 2: artifact extraction
│   │   │       ├── __init__.py
│   │   │       └── detector.py  # Code block detection + classification
│   │   │
│   │   └── ingestion/           # File parsing + embedding pipeline
│   │       ├── __init__.py
│   │       ├── pipeline.py      # Orchestrator
│   │       ├── parsers.py       # PDF, DOCX, CSV, TXT parsers
│   │       ├── chunker.py       # Text chunking
│   │       └── embedder.py      # Embedding + Chroma upsert
│   │
│   ├── skills/                  # Skill definitions (SKILL.md + scripts)
│   │   └── .gitkeep
│   │
│   └── data/                    # Local storage root
│       ├── uploads/             # Raw uploaded files
│       ├── agent-fs/            # Agent working filesystem
│       ├── chroma/              # Chroma vector DB data
│       └── forge.db             # SQLite database
│
└── frontend/                    # Next.js + React + Tailwind
    ├── package.json
    ├── next.config.js
    ├── tsconfig.json
    ├── public/
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx       # Root layout (fonts, theme)
    │   │   ├── page.tsx         # Main chat page
    │   │   └── globals.css
    │   ├── components/
    │   │   ├── ChatPanel.tsx
    │   │   ├── MessageBubble.tsx
    │   │   ├── FileUpload.tsx
    │   │   ├── SourceCitation.tsx
    │   │   ├── ArtifactPanel.tsx     # Phase 2
    │   │   ├── ArtifactRenderer.tsx  # Phase 2: Sandpack/iframe
    │   │   ├── SkillsPanel.tsx       # Phase 3
    │   │   └── ConnectorPicker.tsx   # Phase 4
    │   ├── hooks/
    │   │   ├── useChat.ts       # WebSocket streaming hook
    │   │   └── useFileUpload.ts
    │   ├── lib/
    │   │   ├── api.ts           # REST API client
    │   │   └── types.ts         # Shared TypeScript types
    │   └── store/
    │       └── chatStore.ts     # Zustand state management
    └── tailwind.config.ts
```

> [!NOTE]
> No `sandbox-image/` directory — Phase 3 uses E2B's hosted Firecracker microVMs instead of local Docker.

---

## Phase 1 — Chatbot + File Upload/RAG

**Duration**: ~3 weeks (PRD: 21 days)
**Goal**: Upload files, ask questions, get grounded answers with source citations.

---

### Backend Foundation

#### [NEW] [pyproject.toml](file:///c:/Users/Sam/Harness/backend/pyproject.toml)

Project manifest with Phase 1 dependencies:

```toml
[project]
name = "forge-backend"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.115",
    "uvicorn[standard]>=0.30",
    "websockets>=13.0",
    "python-multipart>=0.0.9",
    "sqlalchemy>=2.0",
    "alembic>=1.13",
    "aiosqlite>=0.20",
    "pydantic-settings>=2.0",
    "deepagents>=0.6,<0.7",
    "langchain-core>=0.3",
    "langchain-cloudflare>=0.3",
    "chromadb>=0.5",
    "pypdf>=4.0",
    "pdfplumber>=0.11",
    "python-docx>=1.1",
    "openpyxl>=3.1",
    "pandas>=2.2",
    "langchain-text-splitters>=0.3",
]
```

#### [NEW] [config.py](file:///c:/Users/Sam/Harness/backend/app/config.py)

Pydantic Settings class reading from `.env`:
- `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_KEY`
- `CLOUDFLARE_MODEL_ID` (default `@cf/moonshotai/kimi-k2.6`)
- `UPLOAD_DIR` (default `./data/uploads`)
- `CHROMA_DIR` (default `./data/chroma`)
- `DATABASE_URL` (default `sqlite+aiosqlite:///./data/forge.db`)
- `MAX_UPLOAD_SIZE_MB` (default 50)
- `CHUNK_SIZE` (default 800), `CHUNK_OVERLAP` (default 100)
- `AGENT_FS_ROOT` (default `./data/agent-fs`)
- `SKILLS_DIRS` (default `["./skills/"]`)
- `E2B_API_KEY` (Phase 3: E2B sandbox API key)

Embeddings use `CloudflareWorkersAIEmbeddings` from `langchain-cloudflare` — no separate embedding model config needed; reuses the existing `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_KEY`.

#### [NEW] [database.py](file:///c:/Users/Sam/Harness/backend/app/database.py)

SQLAlchemy async engine with `aiosqlite`. `create_all()` on startup. Alembic configured for Postgres migration path.

#### [NEW] [models.py](file:///c:/Users/Sam/Harness/backend/app/models.py)

SQLAlchemy ORM models matching PRD §6.2:

| Table | Columns |
|-------|---------|
| `conversations` | `id: UUID`, `title: str`, `created_at: datetime` |
| `messages` | `id: UUID`, `conversation_id: FK`, `role: str`, `content: text`, `citations: JSON`, `created_at` |
| `files` | `id: UUID`, `conversation_id: FK|null`, `filename: str`, `mime_type: str`, `content_hash: str`, `status: enum[uploading,processing,ready,error]`, `uploaded_at`, `size_bytes: int` |
| `file_chunks_meta` | `id: UUID`, `file_id: FK`, `chunk_index: int`, `page: int|null`, `char_start: int`, `char_end: int` |

#### [NEW] [main.py](file:///c:/Users/Sam/Harness/backend/app/main.py)

FastAPI app with:
- CORS middleware (allow `http://localhost:3000`)
- Lifespan handler: init DB, load embedding model, create Chroma client
- Include routers from `api/` submodules
- Health check `GET /health`

---

### File Ingestion Pipeline

#### [NEW] [parsers.py](file:///c:/Users/Sam/Harness/backend/app/ingestion/parsers.py)

MIME-type router dispatching to specialized parsers:
- `parse_pdf(path)` → `pypdf` for text, `pdfplumber` for tables. Returns `List[PageContent(page_num, text)]`. Detects image-only PDFs (empty text) → raises `UnsupportedFormatError` with user-friendly message.
- `parse_docx(path)` → `python-docx`, paragraph + table extraction
- `parse_xlsx(path)` → `openpyxl` via `pandas.read_excel`, sheet-per-"page"
- `parse_csv(path)` → `pandas.read_csv`, entire content as one "page"
- `parse_text(path)` → raw read for `.txt`, `.md`

#### [NEW] [chunker.py](file:///c:/Users/Sam/Harness/backend/app/ingestion/chunker.py)

Wraps `RecursiveCharacterTextSplitter` from `langchain-text-splitters`. Config: 800 tokens, 100 overlap. Returns chunks with metadata `{chunk_index, page, char_start, char_end}`.

#### [NEW] [embedder.py](file:///c:/Users/Sam/Harness/backend/app/ingestion/embedder.py)

- Uses `CloudflareWorkersAIEmbeddings` from `langchain-cloudflare` — reuses existing Cloudflare credentials, no separate model download or local GPU needed
- `embed_and_store(chunks, file_id)` → embeds chunks via Cloudflare Workers AI, upserts into Chroma collection `forge_files` with metadata `{file_id, filename, page, chunk_index}`
- Chroma client: persistent storage at `./data/chroma/`

#### [NEW] [pipeline.py](file:///c:/Users/Sam/Harness/backend/app/ingestion/pipeline.py)

Orchestrator called by `POST /files`:
1. Compute SHA-256 hash → check for duplicate
2. Save raw file to `./data/uploads/{file_id}/`
3. Update `status → processing`
4. Parse → Chunk → Embed
5. Save `file_chunks_meta` records to SQLite
6. Update `status → ready` (or `error` on failure)

Runs as a `BackgroundTasks` job so the upload endpoint returns immediately.

---

### Agent Runtime

#### [NEW] [factory.py](file:///c:/Users/Sam/Harness/backend/app/agent/factory.py)

Constructs the deepagents agent per PRD §6.2:

```python
from deepagents import create_deep_agent
from deepagents.backends.filesystem import FilesystemBackend
from langchain_cloudflare.chat_models import ChatCloudflareWorkersAI

def build_agent(settings):
    backend = FilesystemBackend(root_dir=settings.AGENT_FS_ROOT)
    model = ChatCloudflareWorkersAI(
        model=settings.CLOUDFLARE_MODEL_ID,
        cloudflare_api_key=settings.CLOUDFLARE_API_KEY,
        cloudflare_account_id=settings.CLOUDFLARE_ACCOUNT_ID,
    )

    agent = create_deep_agent(
        model=model,
        backend=backend,
        tools=[retrieve_from_files],
        system_prompt=CHAT_SYSTEM_PROMPT,
    )
    return agent
```

Exposes `async def stream_agent(conversation_id, user_message, file_ids)` that:
- Invokes the agent with `config={"configurable": {"thread_id": conversation_id}}`
- Yields streamed chunks via `agent.astream_events()`
- Persists messages to SQLite after completion

#### [NEW] [rag.py](file:///c:/Users/Sam/Harness/backend/app/agent/tools/rag.py)

LangChain `@tool` function:

```python
@tool
def retrieve_from_files(query: str, file_ids: list[str] | None = None) -> str:
    """Search uploaded files for information relevant to the query.
    Returns matching passages with source citations (filename, page number)."""
    # 1. Query Chroma with optional file_id filter (where clause)
    # 2. Return top-k chunks formatted as:
    #    [Source: report.pdf, Page 3] "relevant text..."
```

#### [NEW] [prompts.py](file:///c:/Users/Sam/Harness/backend/app/agent/prompts.py)

System prompt defining Forge's persona, citation format requirements, and tool usage instructions.

---

### API Routes (Phase 1)

#### [NEW] [files.py](file:///c:/Users/Sam/Harness/backend/app/api/files.py)

| Method | Path | Behavior |
|--------|------|----------|
| `POST` | `/files` | Accept multipart upload, validate MIME type + size, kick off ingestion as background task, return `{file_id, status: "processing"}` |
| `GET` | `/files/{id}` | Return file metadata + status |

Edge cases:
- Reject files > `MAX_UPLOAD_SIZE_MB`
- Detect scanned/image-only PDFs → `status: "error"` with message
- Deduplicate by content hash

#### [NEW] [chat.py](file:///c:/Users/Sam/Harness/backend/app/api/chat.py)

| Method | Path | Behavior |
|--------|------|----------|
| `WS` | `/chat/stream` | Accept `{conversation_id?, text, file_ids}`, stream agent response as JSON frames: `{type: "token"|"citation"|"done"|"error", data: ...}` |

Protocol:
- `conversation_id == null` → create new conversation
- Inject `file_ids` into agent tool context for scoped retrieval
- Auto-generate conversation title on first message
- Block send if referenced file is still `status: processing`

#### [NEW] [conversations.py](file:///c:/Users/Sam/Harness/backend/app/api/conversations.py)

| Method | Path | Behavior |
|--------|------|----------|
| `GET` | `/conversations` | List all conversations (paginated) |
| `GET` | `/conversations/{id}` | Full message history |

---

### Frontend (Phase 1)

#### [NEW] Next.js project — scaffolded with `npx -y create-next-app@latest ./` in `frontend/`

Options: TypeScript, App Router, Tailwind CSS, ESLint, `src/` directory.

#### [NEW] [ChatPanel.tsx](file:///c:/Users/Sam/Harness/frontend/src/components/ChatPanel.tsx)

- Message list with auto-scroll
- Input bar with file upload button
- Streaming message display (tokens appended in real-time)
- Conversation sidebar (list of past conversations)

#### [NEW] [MessageBubble.tsx](file:///c:/Users/Sam/Harness/frontend/src/components/MessageBubble.tsx)

- Markdown rendering via `react-markdown` + `rehype-highlight`
- Code block syntax highlighting
- User vs. assistant styling

#### [NEW] [FileUpload.tsx](file:///c:/Users/Sam/Harness/frontend/src/components/FileUpload.tsx)

- Drag-and-drop zone + file picker
- Upload progress indicator
- File status badge (processing → ready)
- Calls `POST /files`, polls status

#### [NEW] [SourceCitation.tsx](file:///c:/Users/Sam/Harness/frontend/src/components/SourceCitation.tsx)

Inline citation chips `[📄 report.pdf, p.3]` that expand on click to show the source passage.

#### [NEW] [useChat.ts](file:///c:/Users/Sam/Harness/frontend/src/hooks/useChat.ts)

WebSocket hook:
- Connects to `ws://localhost:8000/chat/stream`
- Sends messages as JSON frames
- Accumulates streamed tokens into current assistant message
- Handles reconnection
- Exposes `sendMessage(text, fileIds)`, `messages`, `isStreaming`, `error`

#### [NEW] [chatStore.ts](file:///c:/Users/Sam/Harness/frontend/src/store/chatStore.ts)

Zustand store: `conversations[]`, `activeConversationId`, `messages[]`, `uploadedFiles[]`.

---

### Docker Compose (Phase 1)

#### [NEW] [docker-compose.yml](file:///c:/Users/Sam/Harness/docker-compose.yml)

```yaml
services:
  api:
    build: ./backend
    ports: ["8000:8000"]
    volumes:
      - ./backend/data:/app/data
      - ./backend/skills:/app/skills
    env_file: .env

  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000

  chroma:
    image: chromadb/chroma:latest
    ports: ["8001:8000"]
    volumes:
      - ./backend/data/chroma:/chroma/chroma
```

---

## Phase 2 — Artifacts (Frontend Code Generation & Live Rendering)

**Duration**: ~2 weeks (PRD: 14 days)
**Goal**: Agent-generated code rendered as live, interactive previews beside the chat.

---

### Artifact Detection & Extraction

#### [NEW] [detector.py](file:///c:/Users/Sam/Harness/backend/app/agent/artifacts/detector.py)

Post-processes streamed agent output in real-time:
- Parses fenced code blocks from the markdown stream
- Classifies by language tag:
  - ` ```jsx ` / ` ```tsx ` → `react` artifact
  - ` ```html ` → `html` artifact
  - ` ```svg ` → `svg` artifact
  - Other languages → `code` artifact (display-only)
- Size threshold: only extract if code block > 5 lines
- Emits `artifact_created` WebSocket event mid-stream: `{type: "artifact", artifact_id, artifact_type, title, content}`
- Auto-generates title from first comment or component name

### Data Model Extension

#### [MODIFY] [models.py](file:///c:/Users/Sam/Harness/backend/app/models.py)

Add two tables per PRD §7.3:

| Table | Columns |
|-------|---------|
| `artifacts` | `id: UUID`, `conversation_id: FK`, `message_id: FK`, `type: enum[react,html,svg,md,code]`, `title: str`, `created_at` |
| `artifact_versions` | `id: UUID`, `artifact_id: FK`, `version: int`, `content: text`, `created_at` |

### API Routes (Phase 2)

#### [NEW] [artifacts.py](file:///c:/Users/Sam/Harness/backend/app/api/artifacts.py)

| Method | Path | Behavior |
|--------|------|----------|
| `GET` | `/artifacts/{id}` | Latest version + version history metadata |
| `GET` | `/artifacts/{id}/versions/{v}` | Specific version content |
| `POST` | `/artifacts/{id}/versions` | Save new version (re-generation or manual edit) |

#### [MODIFY] [chat.py](file:///c:/Users/Sam/Harness/backend/app/api/chat.py)

Integrate artifact detector into streaming. WebSocket now emits interleaved events:
- `{type: "token", data: "..."}` — text tokens
- `{type: "artifact", data: {id, type, title, content}}` — extracted artifact
- `{type: "done"}` — stream complete

### Frontend (Phase 2)

#### [NEW] [ArtifactPanel.tsx](file:///c:/Users/Sam/Harness/frontend/src/components/ArtifactPanel.tsx)

Right-side panel (resizable via `react-resizable-panels`):
- Opens automatically on `artifact` WebSocket event
- Tab bar for multiple artifacts
- Version selector dropdown
- "Copy code" and "Edit" buttons

#### [NEW] [ArtifactRenderer.tsx](file:///c:/Users/Sam/Harness/frontend/src/components/ArtifactRenderer.tsx)

Renders based on type:

**React artifacts** (`type: "react"`):
```tsx
import { SandpackProvider, SandpackPreview } from "@codesandbox/sandpack-react";

<SandpackProvider
  template="react"
  files={{ "/App.js": artifactContent }}
  customSetup={{ dependencies: extractedDependencies }}
>
  <SandpackPreview />
</SandpackProvider>
```

Sandpack v2.20 runs Nodebox (in-browser WASM runtime) — no hosted bundler dependency. Use `useSandpack()` hook's `sandpack.updateFile()` for live updates during streaming.

**HTML/SVG artifacts** (`type: "html"` | `"svg"`):
```tsx
<iframe
  sandbox="allow-scripts"
  srcDoc={artifactContent}
  style={{ width: "100%", height: "100%" }}
/>
```

**Code artifacts** (`type: "code"`): syntax-highlighted read-only block (no live execution).

#### [MODIFY] [page.tsx](file:///c:/Users/Sam/Harness/frontend/src/app/page.tsx)

Split-panel layout:
- Left: `ChatPanel` (flex-1)
- Right: `ArtifactPanel` (conditional, resizable)
- Use `react-resizable-panels`

#### Frontend dependency additions:
- `@codesandbox/sandpack-react@^2.20`
- `react-resizable-panels`

---

## Phase 3 — Skills + Code Sandbox (E2B Hosted)

**Duration**: ~3 weeks (PRD: 21 days)
**Goal**: Agent can author, store, and execute reusable Skills in an isolated hosted sandbox.

---

### Skills — deepagents' Native System

Skills are a first-class `deepagents` feature via `SkillsMiddleware`. Per PRD §8.1:

#### [MODIFY] [factory.py](file:///c:/Users/Sam/Harness/backend/app/agent/factory.py)

Wire skills into the agent:

```python
agent = create_deep_agent(
    model=model,
    backend=backend,
    skills=settings.SKILLS_DIRS,  # e.g., ["./skills/"]
    tools=[retrieve_from_files],
    system_prompt=SYSTEM_PROMPT,
)
```

`SkillsMiddleware` handles:
- Scanning skill directories for `SKILL.md` files
- Progressive disclosure: only `name + description` in system prompt at startup
- Full `SKILL.md` loaded on-demand when task matches
- Layerable sources (last wins on name collision)

#### Agent-authored skills

Give the agent filesystem write access to the skills directory (via `FilesystemBackend`). Add system prompt instruction: when the agent solves a novel repeatable task, write a `SKILL.md` + supporting script to `./skills/user/`.

#### Example skill structure (per PRD §8.1):

```
skills/
  pdf-report-generator/
    SKILL.md
    generate.py
    template.html
```

### E2B Hosted Sandbox Backend (Revised — No Local Docker)

Docker Desktop is unavailable on this Windows machine. Instead of building a custom local sandbox, use **E2B** — a hosted sandbox provider running Firecracker microVMs with a ready-made deepagents backend.

**Why E2B:**
- **Free Hobby tier**: one-time $100 usage credit, no credit card required, up to 1-hour sandbox sessions, 20 concurrent sandboxes — comfortably covers solo/personal use
- **Zero local setup**: sandboxes run on E2B's infrastructure — no Docker Desktop, no WSL2, nothing on your Windows machine
- **Stronger isolation than needed**: Firecracker microVMs provide hardware-level isolation (better than Docker containers)
- **First-party deepagents backend**: `langchain_e2b.E2BSandbox` — wiring is a few lines

#### [MODIFY] [factory.py](file:///c:/Users/Sam/Harness/backend/app/agent/factory.py)

Swap the filesystem backend for E2B when executing skills:

```python
from deepagents import create_deep_agent
from e2b import Sandbox
from langchain_e2b import E2BSandbox

e2b_sandbox = Sandbox.create()   # needs E2B_API_KEY in environment
sandbox = E2BSandbox(sandbox=e2b_sandbox)

agent = create_deep_agent(
    model=model,
    backend=sandbox,
    skills=["./skills/"],
    system_prompt=SYSTEM_PROMPT,
)
```

**Setup**: Sign up at [e2b.dev](https://e2b.dev), generate an API key, set `E2B_API_KEY` in `.env`. Nothing runs locally.

**Future migration options** (if you outgrow E2B's limits):
- **Daytona**: similar pricing, ~90ms cold starts, container-based — already has a deepagents backend
- **Modal**: Python-first, GPU-capable, $30/month free credits — already has a deepagents backend
- **LangSmith Sandboxes**: first-party managed, no third-party signup needed if you're already using LangSmith

All are one-line backend swaps, not rewrites.

### HITL for Dangerous Actions

Per PRD §8.3 — use deepagents' built-in `interrupt_on`:

```python
from langgraph.checkpoint.memory import MemorySaver

agent = create_deep_agent(
    model=model,
    backend=sandbox,
    skills=["./skills/"],
    checkpointer=MemorySaver(),
    interrupt_on={
        "execute": {"allowed_decisions": ["approve", "edit", "reject"]},
    },
)
```

The WebSocket handler detects interrupt events and sends approval requests to the frontend.

### Guardrails (Hosted Sandbox Version)

- **Per-skill execution timeout**: enforced in your code and backed by E2B's session cap (Hobby tier caps at 1 hour)
- **No local machine exposure**: sandboxes are separate cloud VMs by construction — nothing from your machine is ever mounted. This guardrail comes for free with a hosted provider.
- **Outbound internet access**: ⚠️ E2B sandboxes have outbound internet by default (unlike the earlier `--network none` Docker plan). This is an acceptable tradeoff for a personal project, but if a specific skill shouldn't make arbitrary outbound calls, restrict egress explicitly rather than assuming sandboxed-by-default.
- **HITL approval**: destructive/sensitive skill actions routed through `interrupt_on` so you approve before execution — same mechanism used for MCP tool approval in Phase 4.

### API Routes (Phase 3)

#### [NEW] [skills.py](file:///c:/Users/Sam/Harness/backend/app/api/skills.py)

| Method | Path | Behavior |
|--------|------|----------|
| `GET` | `/skills` | List all skills (name, description, source directory) |
| `GET` | `/skills/{name}` | Full skill details (SKILL.md content + file listing) |
| `POST` | `/skills` | Manually create/upload a skill |
| `DELETE` | `/skills/{name}` | Remove a user-created skill |

### Frontend (Phase 3)

#### [NEW] [SkillsPanel.tsx](file:///c:/Users/Sam/Harness/frontend/src/components/SkillsPanel.tsx)

- Skills browser: list available skills, view details
- Execution approval modal (HITL): shows code to be executed, approve/edit/reject buttons
- Execution log viewer: sandbox stdout/stderr output

#### [MODIFY] [ChatPanel.tsx](file:///c:/Users/Sam/Harness/frontend/src/components/ChatPanel.tsx)

Handle new WebSocket event types:
- `{type: "approval_request", data: {action, code, skill_name}}` → show HITL modal
- `{type: "execution_result", data: {stdout, stderr, exit_code}}` → inline execution block

### Backend dependency additions (Phase 3):
- `e2b>=1.0` (E2B SDK)
- `langchain-e2b>=0.1` (deepagents E2B backend)

---

## Phase 4 — MCP Connector (Figma)

**Duration**: ~2 weeks (reduced scope — single connector)
**Goal**: Agent connects to Figma via MCP; working end-to-end with OAuth and HITL.

---

### Connector Registry (PRD §9.2)

#### [NEW] [connectors.yaml](file:///c:/Users/Sam/Harness/connectors.yaml)

```yaml
- id: figma
  name: Figma
  transport: streamable_http
  url: https://mcp.figma.com/mcp
  auth: oauth2
  scopes: ["file_read"]
  enabled: false
```

> [!NOTE]
> Additional connectors (Canva, Gmail, Slack) can be added later. Canva requires a paid plan; Gmail/Slack lack first-party MCP servers. All would be config additions to this registry, not code changes.

### MCP Integration (PRD §9.1)

#### [MODIFY] [factory.py](file:///c:/Users/Sam/Harness/backend/app/agent/factory.py)

Integrate `langchain-mcp-adapters`:

```python
from langchain_mcp_adapters.client import MultiServerMCPClient

async def build_agent_with_connectors(settings, enabled_connectors):
    async with MultiServerMCPClient({
        c.id: {
            "transport": c.transport,
            "url": c.url,
            "headers": {"Authorization": f"Bearer {get_token(c.id)}"},
        }
        for c in enabled_connectors
    }) as mcp_client:
        mcp_tools = mcp_client.get_tools()

        agent = create_deep_agent(
            model=model,
            backend=backend,
            skills=["./skills/"],
            tools=[retrieve_from_files, *mcp_tools],
            checkpointer=checkpointer,
            interrupt_on={
                # Gate destructive Figma actions behind approval
                "generate_figma_design": {"allowed_decisions": ["approve", "edit", "reject"]},
                "create_new_file": {"allowed_decisions": ["approve", "reject"]},
            },
        )
        return agent
```

> [!NOTE]
> Use `streamable_http` (underscore, not hyphen) — `langchain-mcp-adapters` raises `ValueError` on `streamable-http`.

### OAuth Flow (PRD §9.3)

#### [NEW] [connectors.py](file:///c:/Users/Sam/Harness/backend/app/api/connectors.py)

| Method | Path | Behavior |
|--------|------|----------|
| `GET` | `/connectors` | List all connectors with enabled/connected status |
| `POST` | `/connectors/{id}/connect` | Initiate OAuth flow → redirect to provider |
| `GET` | `/connectors/{id}/callback` | OAuth callback → exchange code, store encrypted tokens |
| `POST` | `/connectors/{id}/disconnect` | Revoke tokens, mark disconnected |

Token storage:
- Encrypt at rest with `cryptography.Fernet` (key from `FORGE_ENCRYPTION_KEY` env var)
- SQLite table: `connector_tokens(connector_id, access_token_enc, refresh_token_enc, token_type, expires_at, scopes, created_at, updated_at)`
- Transparent token refresh via custom `httpx.Auth` subclass passed to `MultiServerMCPClient`

### Data Model Extension

#### [MODIFY] [models.py](file:///c:/Users/Sam/Harness/backend/app/models.py)

| Table | Columns |
|-------|---------|
| `connector_tokens` | `id: UUID`, `connector_id: str`, `access_token_enc: bytes`, `refresh_token_enc: bytes`, `token_type: str`, `expires_at: datetime`, `scopes: str`, `created_at`, `updated_at` |

### Figma MCP — Verified Tools Available

The Figma MCP server exposes 12+ tools across 4 categories:

| Category | Tools |
|----------|-------|
| **Design Context** | `get_design_context`, `get_metadata`, `get_variable_defs`, `get_screenshot` |
| **Code Connect** | `add_code_connect_map`, `get_code_connect_map`, `get_code_connect_suggestions`, `get_context_for_code_connect` |
| **Assets** | `download_assets`, `get_libraries` |
| **Creation** | `create_new_file`, `generate_figma_design`, `generate_diagram` |

### Frontend (Phase 4)

#### [NEW] [ConnectorPicker.tsx](file:///c:/Users/Sam/Harness/frontend/src/components/ConnectorPicker.tsx)

- Grid of available connectors with icons and status badges
- "Connect" button → opens OAuth popup/redirect
- "Disconnect" button with confirmation
- Connected status and last-used timestamp

#### [MODIFY] [ChatPanel.tsx](file:///c:/Users/Sam/Harness/frontend/src/components/ChatPanel.tsx)

- Connector context badges showing active connectors
- Reuse Phase 3 HITL approval modal for sensitive connector actions

### Backend dependency additions (Phase 4):
- `langchain-mcp-adapters>=0.3`
- `cryptography>=43.0`
- `httpx>=0.27`

---

## Verification Plan

### Phase 1

**Automated Tests:**
```bash
cd backend && python -m pytest tests/ -v
python -m pytest tests/test_ingestion.py -v   # file parsing + embedding
python -m pytest tests/test_rag.py -v          # retrieval tool
python -m pytest tests/test_chat.py -v         # WebSocket endpoint
```

**Manual Verification:**
1. Upload a multi-page PDF → verify `processing` → `ready` transition
2. Ask about the PDF → verify grounded answer with correct page citations
3. Upload CSV → ask data questions → verify accuracy
4. Upload duplicate → verify deduplication (same hash → no re-embedding)
5. Upload scanned PDF → verify graceful error message
6. Verify streaming: tokens appear incrementally, not as bulk dump
7. Refresh page → re-open conversation → verify history persists

### Phase 2

1. Ask for "a React component that shows a bar chart" → artifact panel opens, Sandpack renders live
2. Ask "make it dark theme" → new version created, old version in dropdown
3. Ask for plain HTML page → renders in sandboxed iframe
4. Ask for SVG illustration → renders inline
5. Version navigation works (select v1, v2, etc.)

### Phase 3

1. Place a skill in `./skills/`, restart → verify `GET /skills` lists it
2. Ask the agent to use the skill → verify full SKILL.md read + correct execution in E2B
3. HITL: code execution triggers approval prompt before running
4. Ask agent to create a new skill → verify SKILL.md + script written to `./skills/user/`
5. Verify E2B sandbox: code runs remotely, no local filesystem exposure
6. Timeout: long-running script killed after configured limit
7. Verify outbound network awareness: document which skills need internet vs. not

### Phase 4

1. Connect Figma → list components from a real Figma file
2. Use `get_design_context` to read a design, `generate_figma_design` to create one
3. HITL: `generate_figma_design` / `create_new_file` → approval required
4. OAuth: connect → disconnect → reconnect works cleanly
5. Token refresh: wait for expiry → confirm transparent refresh

### End-to-End Smoke Test

```bash
docker compose up --build
curl http://localhost:8000/health      # API healthy
curl http://localhost:3000             # Frontend serves
```

---

## Risk Mitigations

| Risk | Mitigation |
|------|------------|
| **Cloudflare model tool calling issues** | Test tool calling in Phase 1 week 1. Fallback: switch to `kimi-k2.7-code` or another provider via LangChain's model abstraction |
| **E2B sandbox outbound internet** | E2B sandboxes have outbound access by default (unlike `--network none` Docker). Acceptable for personal use; restrict egress explicitly for sensitive skills |
| **E2B Hobby tier limits** | 1-hour sessions, 20 concurrent sandboxes, $100 credit. Sufficient for solo use. If exceeded: swap to Daytona or Modal (one-line backend change) |
| **Sandpack initial load latency** | Show loading spinner. Nodebox (in-browser WASM) is more reliable than old hosted bundler |
| **Single-connector Phase 4** | Only Figma for MVP. Additional connectors (Canva, Gmail, Slack) are config additions when needed |
| **Scope creep** | Each phase ships a working demo before the next begins |
| **Embedding quality** | Using `CloudflareWorkersAIEmbeddings` (hosted). If retrieval quality is insufficient, swap to a higher-quality provider (e.g., `voyage-3`) — config change, not rewrite |
| **`deepagents` pre-1.0 breaking changes** | Pin to `>=0.6,<0.7` in pyproject.toml; monitor release notes |
