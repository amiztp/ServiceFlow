from fastapi import FastAPI, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from app.api.routes import auth
from app.api.routes.requests import router as requests_router

from app.database import engine
from app.api.routes.policies import router as policies_router
from app.api.routes.providers import router as providers_router
from app.api.routes.employees import router as employees_router
from app.api.routes.service_management import router as service_management_router

app = FastAPI(
    title="ServiceFlow API",
    version="0.1.0",
)
app.include_router(policies_router)

app.include_router(
    auth.router,
    prefix="/auth",
    tags=["Authentication"],
)


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}


@app.get("/health/db", tags=["Health"])
def database_health_check():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1")).scalar_one()
    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable",
        ) from None

    return {"status": "ok", "database": "connected"}


app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(policies_router)
app.include_router(providers_router)
app.include_router(employees_router)
app.include_router(service_management_router)
app.include_router(requests_router)