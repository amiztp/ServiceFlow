from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.database import engine

from app.api.routes import auth
from app.api.routes.policies import router as policies_router
from app.api.routes.providers import router as providers_router
from app.api.routes.employees import router as employees_router
from app.api.routes.service_management import router as service_management_router
from app.api.routes.requests import router as requests_router
from app.api.routes.quotations import router as quotations_router
from app.api.routes.jobs import router as jobs_router
from app.api.routes.request_extensions import (
    router as request_extensions_router,
)
from app.api.routes.admin_providers import (
    router as admin_providers_router,
)
from app.api.routes.invoices import router as invoices_router
from app.api.routes.payments import router as payments_router


app = FastAPI(
    title="ServiceFlow API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        # add the Tailscale origin too if the frontend is opened via the
        # machine's Tailscale IP or MagicDNS name, e.g.:
        # "http://100.107.134.80:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register each router exactly once.
app.include_router(
    auth.router,
    prefix="/auth",
    tags=["Authentication"],
)

app.include_router(policies_router)
app.include_router(providers_router)
app.include_router(employees_router)
app.include_router(service_management_router)
app.include_router(requests_router)
app.include_router(quotations_router)
app.include_router(jobs_router)
app.include_router(request_extensions_router)
app.include_router(invoices_router)
app.include_router(payments_router)
app.include_router(admin_providers_router)



@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}


@app.get("/health/db", tags=["Health"])
def database_health_check():
    try:
        with engine.connect() as connection:
            connection.execute(
                text("SELECT 1")
            ).scalar_one()

    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable",
        ) from None

    return {
        "status": "ok",
        "database": "connected",
    }
