from fastapi import FastAPI

from app.api.routes.invoices import router as invoices_router
from app.api.routes.payments import router as payments_router


def test_invoice_payment_routes_are_registered_in_openapi():
    app = FastAPI()
    app.include_router(invoices_router)
    app.include_router(payments_router)
    paths = app.openapi()["paths"]

    assert "/invoices" in paths
    assert "/invoices/{invoice_id}" in paths
    assert "/invoices/{invoice_id}/payments" in paths
    assert "/invoices/{invoice_id}/pdf" in paths
    assert "/payments/{payment_id}" in paths

    assert "get" in paths["/invoices"]
    assert "get" in paths["/invoices/{invoice_id}"]
    assert "get" in paths["/invoices/{invoice_id}/payments"]
    assert "post" in paths["/invoices/{invoice_id}/payments"]
    assert "get" in paths["/invoices/{invoice_id}/pdf"]
    assert "get" in paths["/payments/{payment_id}"]
