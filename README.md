# ServiceFlow starter structure

This is a dependency and directory template for the reduced one-month release. It does not contain a working application yet. Member 4 owns jobs, scheduling, invoices, policy AI and deployment. Member 3 coordinates the shared schema and authentication.

Read docs/PROJECT_STRUCTURE.md for ownership and integration rules.

## Backend setup

From the repository root on macOS/Linux:

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements-dev.txt
cp .env.example .env
```

On Windows, create the environment with `py -3.11 -m venv .venv` and activate it in PowerShell with `.venv\Scripts\Activate.ps1`.

The dependency files are intentionally unpinned starter lists. Their combined installation has not been tested here. After the team validates installation and integration in a clean virtual environment, run `python -m pip check`, then `python -m pip freeze > requirements-lock.txt` and commit that lock. The deployed environment should use the tested lock rather than resolve new versions on every deploy.

PostgreSQL, its server-side pgvector extension, Docker and the frontend Node environment are separate from Python packages. Install/enable pgvector in the PostgreSQL environment and create the `vector` extension through a reviewed migration. The Python pgvector package alone does not install that extension.

Frontend packages belong in frontend/package.json, not requirements.txt. Members 1 and 2 should initialize one shared React/Vite/TypeScript app and commit package.json plus its lockfile. Do not initialize separate frontend apps per member.

Once app/main.py exists and exports a FastAPI object named app, start it from backend with `uvicorn app.main:app --reload`. That command is not runnable against the empty scaffold alone. Initialize Alembic once, configure metadata and DATABASE_URL, and use reviewed migrations.

The AI design uses LlamaIndex core/chunking and Gemini adapters, with SQLAlchemy/pgvector for persistence and retrieval. Explicitly configure the Gemini LLM and embedding adapters; do not rely on default providers. No NL-to-SQL, agent tools, payment gateway, OCR or maps packages are included.

The .env.example values are configuration names for the team to implement, not evidence that settings parsing already exists. Pin an embedding model and dimension during integration; changing either may require re-embedding policies and a migration.
