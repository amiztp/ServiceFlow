
from fastapi import FastAPI

from app.api.routes.jobs import router


def test_job_router_registers_expected_routes():
    app = FastAPI()
    app.include_router(router)

    # Use OpenAPI instead of directly inspecting app.routes.
    paths = set(app.openapi()["paths"].keys())

    expected = {
        "/jobs",
        "/jobs/{job_id}",
        "/jobs/{job_id}/assign",
        "/jobs/{job_id}/schedule",
        "/jobs/{job_id}/schedule/approve",
        "/jobs/{job_id}/start",
        "/jobs/{job_id}/complete",
        "/jobs/{job_id}/cancel",
        "/jobs/{job_id}/records",
        "/jobs/{job_id}/records/photo",
        "/jobs/{job_id}/records/{record_id}/photo",
    }

    assert expected.issubset(paths)


def test_job_openapi_methods():
    app = FastAPI()
    app.include_router(router)

    paths = app.openapi()["paths"]

    assert "get" in paths["/jobs"]
    assert "get" in paths["/jobs/{job_id}"]
    assert "post" in paths["/jobs/{job_id}/assign"]
    assert "post" in paths["/jobs/{job_id}/schedule"]
    assert "post" in paths["/jobs/{job_id}/schedule/approve"]
    assert "post" in paths["/jobs/{job_id}/start"]
    assert "post" in paths["/jobs/{job_id}/complete"]
    assert "post" in paths["/jobs/{job_id}/cancel"]
    assert "get" in paths["/jobs/{job_id}/records"]
    assert "post" in paths["/jobs/{job_id}/records"]
