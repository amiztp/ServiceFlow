# ServiceFlow

**AI-Assisted Service Business Management System**

ServiceFlow is a web platform that combines a public service marketplace with independent business workspaces for service providers. Clients discover providers, submit service requests, approve quotations, and track jobs. Provider companies run their full operation — requests, quotations, scheduling, worker assignment, invoicing, documents, and statistics — with an AI assistant that answers questions over business data and company documents.

Built by a four-member team.

---

## Features

**Marketplace**
- Public service directory with search and filtering
- Provider profiles: services, areas served, ratings, reviews, policies
- Client accounts: submit/track requests, approve quotations, view invoices, rate providers

**Provider workspaces**
- Company or individual registration with admin verification
- Request inbox, quotation builder, Kanban job pipeline, scheduling calendar
- Worker management: invite, activate/deactivate, internal job assignment
- Invoice generation and payment recording
- Document management feeding a per-provider AI knowledge base
- Business statistics: revenue, jobs, ratings, worker performance
- Individual → company upgrade path (admin-approved, history preserved)

**AI assistance (Flow AI)**
- **Natural-language data queries** — ask questions about business data; Gemini generates SQL against predefined read-only views, validated and executed under a read-only DB role with server-injected tenant scoping
- **RAG document Q&A** — providers upload policy documents; LlamaIndex + pgvector retrieval with per-provider isolation and source citations

**Platform admin**
- Provider verification queue, user/role management, service catalog
- Cross-provider job oversight, dispute handling, platform reports

---

## Tech Stack

| Layer      | Technology |
|------------|------------|
| Frontend   | React + Vite + TypeScript + Tailwind CSS |
| Backend    | Python + FastAPI + SQLAlchemy |
| Database   | PostgreSQL + pgvector (relational data + embeddings in one DB) |
| AI / RAG   | LlamaIndex + Google Gemini API |
| Auth       | JWT, bcrypt, role-based access control |
| DevOps     | Docker, GitHub Actions, Vercel (frontend), Render (backend + DB) |

---

## Project Structure

```
serviceflow/
├── frontend/                  # React + Vite + TS + Tailwind
│   └── src/
│       ├── app/               # Router, providers, layouts
│       ├── components/        # ui/ (design system), layout/, domain/
│       ├── features/          # auth, requests, quotations, jobs, invoices,
│       │                      # providers, documents, stats, admin, ai
│       └── pages/             # public/, client/, worker/, company/, admin/
├── backend/
│   └── app/
│       ├── core/              # config, security, database
│       ├── models/            # SQLAlchemy models (17 tables)
│       ├── schemas/           # Pydantic schemas
│       ├── api/v1/            # Routers: auth, providers, workers, requests,
│       │                      # quotations, jobs, invoices, documents,
│       │                      # reviews, stats, notifications, admin, ai
│       ├── services/          # Business logic + verification workflow
│       ├── ai/
│       │   ├── rag/           # ingestion.py, retrieval.py, prompts.py
│       │   └── nlq/           # views.py, generator.py, validator.py
│       └── tests/             # incl. test_ai_safety.py
├── docker/                    # postgres-init (pgvector), compose files
├── docs/                      # architecture, API contract, style guide
└── uploads/                   # documents/, profiles/, jobs/ (gitignored)
```

---

## Getting Started

### Prerequisites

- Node.js 20+, Python 3.11+, Docker
- A Google Gemini API key ([Google AI Studio](https://aistudio.google.com))

### 1. Clone and configure

```bash
git clone https://github.com/<org>/serviceflow.git
cd serviceflow
cp backend/.env.example backend/.env   # fill in values below
```

Required environment variables (`backend/.env`):

```
DATABASE_URL=postgresql+psycopg://serviceflow:secret@localhost:5432/serviceflow
GEMINI_API_KEY=your-gemini-api-key
JWT_SECRET=change-me-in-production
UPLOAD_DIR=./uploads
```

### 2. Start PostgreSQL with pgvector

```bash
docker compose -f docker/docker-compose.dev.yml up -d
```

This starts PostgreSQL 16 with the pgvector extension and creates the database.

### 3. Run the backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head          # run migrations
uvicorn app.main:app --reload # http://localhost:8000
```

API docs (auto-generated): http://localhost:8000/docs

### 4. Run the frontend

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

### 5. Seed demo data (optional)

```bash
cd backend && python -m app.seed  # admin, sample providers, services, jobs
```

Default admin login after seeding: `admin@serviceflow.lk` / `admin123` (change immediately).

---

## AI Setup Notes

- **Embeddings model:** Gemini `text-embedding-004` (768 dimensions — matches the `vector(768)` column on `document_chunks`)
- **Generation model:** Gemini flash-tier model for answers and text-to-SQL
- **RAG ingestion:** upload a PDF via Documents → the backend extracts, chunks (~512 tokens, page-preserving), embeds, and stores chunks tagged with `provider_id`
- **Tenant isolation:** retrieval always filters on `provider_id` from the JWT; the NL-to-SQL validator injects scoping filters server-side and executes under a read-only DB role
- **Safety tests:** `pytest backend/app/tests/test_ai_safety.py` — adversarial prompts must be refused or safely scoped

---

## Team

| Member   | Area | Scope |
|----------|------|-------|
| Member 1 | Frontend — Client & Public | Design system, public pages, auth UI, client pages |
| Member 2 | Frontend — Provider & Admin | Worker views, company pages, admin pages, Flow AI panel |
| Member 3 | Backend — Core platform | Models, auth, domain APIs, verification, stats |
| Member 4 | Backend — AI & deployment | RAG, NL-to-SQL, AI endpoints, Docker, CI/CD |

See `docs/` for the API contract, architecture notes, and the UI style guide.

---

## Roadmap

**In scope (MVP):** marketplace, full job lifecycle, worker management, documents + RAG, NL-to-SQL, notifications, admin verification, deployment.

**Future expansion:** subscription tiers with PayHere billing (`providers.plan` reserved from day one), WhatsApp automation via n8n, automatic technician assignment, AI-generated quotations, predictive maintenance, mobile apps, Sinhala/Tamil support.

---

## License

TBD — add a license before public release.
