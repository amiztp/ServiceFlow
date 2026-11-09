"""SNIPPET ONLY — do not overwrite your existing app/main.py with this file.

Place the import with other router imports and the include call after `app` is
created, alongside your other include_router calls.
"""

from app.api.routes.requests import router as requests_router

# After `app = FastAPI(...)`:
# app.include_router(requests_router)

# OPTIONAL: enable only after the team approves these additional endpoints.
# from app.api.routes.request_extensions import router as request_extensions_router
# app.include_router(request_extensions_router)
