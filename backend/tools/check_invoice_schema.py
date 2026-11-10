from sqlalchemy import inspect
from app.database import engine

REQUIRED = {
    "invoices": {
        "id", "job_id", "invoice_number", "total_amount",
        "downpayment_amount", "paid_amount", "payment_status",
        "issued_at", "paid_at",
    },
    "payments": {
        "id", "invoice_id", "received_by", "amount", "method",
        "reference", "note", "received_at", "created_at",
    },
}


def main() -> int:
    inspector = inspect(engine)
    existing = set(inspector.get_table_names())
    failed = False
    for table, required in REQUIRED.items():
        if table not in existing:
            print(f"FAIL {table}: table missing")
            failed = True
            continue
        columns = {column["name"] for column in inspector.get_columns(table)}
        missing = required - columns
        if missing:
            print(f"FAIL {table}: missing columns {sorted(missing)}")
            failed = True
        else:
            print(f"PASS {table}: required columns present")
    if not failed:
        print("PASS invoice/payment schema check")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
