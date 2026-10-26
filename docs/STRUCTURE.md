# ServiceFlow project structure and ownership

The ZIP contains this folder skeleton, requirements files and configuration examples. Files marked planned below still need implementation; empty directories do not implement routes or features.

```text
serviceflow/
├── README.md
├── .gitignore
├── frontend/                         Members 1 and 2
│   ├── public/
│   └── src/
│       ├── app/                      Routing, providers and application setup
│       ├── components/
│       │   ├── ui/                   Shared components; Member 1 owns
│       │   └── layout/               Shared shells and navigation
│       ├── features/
│       │   ├── auth/                 Member 1
│       │   ├── marketplace/          Member 1
│       │   ├── client/               Member 1
│       │   ├── manager/              Member 2
│       │   ├── employee/             Member 2
│       │   ├── admin/                Member 2
│       │   └── ai/                   Shared panel; Member 2 builds, Member 1 reuses
│       ├── lib/                      Shared API client and utilities
│       ├── types/                    Shared TypeScript API types
│       └── styles/                   Design tokens; Member 1 owns
├── backend/
│   ├── requirements.txt              Runtime packages
│   ├── requirements-dev.txt          Runtime plus tests/lint
│   ├── .env.example                  Names/placeholders only
│   ├── app/
│   │   ├── main.py                   Planned FastAPI entry point
│   │   ├── core/                     Settings, auth dependencies, errors; Member 3
│   │   ├── db/                       Sessions, metadata, seed support; Member 3
│   │   ├── models/                   Shared SQLAlchemy models
│   │   └── modules/
│   │       ├── auth/                 Member 3
│   │       ├── companies/            Member 3, including employees
│   │       ├── services/             Member 3, catalog and offerings
│   │       ├── requests/             Member 3
│   │       ├── quotations/           Member 3
│   │       ├── admin/                Member 3
│   │       ├── jobs/                 Member 4
│   │       ├── scheduling/           Member 4
│   │       ├── invoices/             Member 4, full payment recording
│   │       ├── policies/             Member 4, upload and indexing
│   │       └── ai/                   Member 4, policy questions only
│   ├── alembic/
│   │   └── versions/                 One shared migration history
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── ai/
│   └── storage/                      Local development policy files; ignored
├── docker/                           Member 4; Dockerfiles/Compose planned
├── .github/
│   └── workflows/                    Member 4; CI workflows planned
└── docs/
    ├── PROJECT_STRUCTURE.md
    ├── api/                          Request/response examples
    ├── database/                     Schema and migration decisions
    └── testing/                      Test evidence and AI evaluation
```

## Use the same pattern inside backend modules

Each module will normally contain router.py, schemas.py and service.py, plus __init__.py where needed. Routers handle HTTP, schemas validate data and service functions enforce business rules. Database models stay in app/models to keep one discoverable schema.

For AI, add ingestion.py, retrieval.py, generation.py and citations.py only when needed. Keep this small; do not create unused abstractions. Policies owns validated files and indexing lifecycle; ai owns question routing and grounded responses. Both are Member 4 responsibilities.

## Critical handoffs

1. Member 3 exposes verified user, role/company scope and shared database session handling to Member 4.
2. Quotation approval calls Member 4 job-creation service inside the same transaction. Both approval and exactly one job succeed together or roll back.
3. Job completion, event creation and invoice generation use one transaction with database uniqueness protection.
4. Scheduling rechecks availability on the server and protects reservations against concurrent requests. Availability shown by the frontend is not authorization or a guaranteed reservation.
5. Member 3 coordinates migrations; Member 4 designs and reviews fields for jobs, scheduling, invoices, policies and policy_chunks. Do not create two independent migration histories.
6. Members 1 and 2 use the same API client, types, design tokens and components. Member 2 exports one AI panel for both frontends.

## Core database records

users, companies, services, company_services, service_requests, quotations, quotation_items, jobs, job_events, invoices, policies and policy_chunks. This is a planning baseline, not generated model code.

## Limits of this release

Company providers only; one employee per job; one-hour weekday appointments between 09:00 and 17:00 Asia/Colombo; one invoice and full offline payment only. AI retrieves from one active public policy PDF per company, with page citations. Keep operational records out of AI retrieval. No natural-language-to-SQL pipeline is planned.

## Dependency references

- Google Gemini with LlamaIndex: https://ai.google.dev/gemini-api/docs/llama-index
- Modular LlamaIndex installation: https://developers.llamaindex.ai/python/framework/getting_started/installation/
- Google Gen AI SDK: https://github.com/googleapis/python-genai
- pgvector Python integration: https://github.com/pgvector/pgvector-python

These references identify the intended packages and integrations. A successful clean installation and application tests are still needed before the team adopts an exact version lock.
