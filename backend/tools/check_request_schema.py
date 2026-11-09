"""Run from backend/: python tools/check_request_schema.py

Read-only schema inspection. Never runs migrations or modifies data.
"""
from sqlalchemy import inspect
from app.database import engine

REQUIRED = {
    "providers": {"id", "verification_status", "accepting_requests"},
    "services": {"id", "is_active"},
    "provider_services": {"provider_id", "service_id", "is_active"},
    "service_requests": {
        "id", "client_id", "provider_id", "service_id", "description",
        "preferred_date", "preferred_time", "address", "latitude", "longitude",
        "status", "created_at", "updated_at",
    },
    "request_messages": {"id", "request_id", "sender_user_id", "message_text", "created_at"},
    "request_attachments": {"id", "request_id", "file_path", "file_name", "content_type", "created_at"},
    "quotations": {"id", "request_id", "status"},
    "jobs": {"id", "request_id", "status"},
}


def main():
    inspector = inspect(engine)
    names = set(inspector.get_table_names())
    failed = False
    for name, required in REQUIRED.items():
        if name not in names:
            print(f"FAIL {name}: table is missing")
            failed = True
            continue
        columns = inspector.get_columns(name)
        actual = {c["name"] for c in columns}
        missing = sorted(required - actual)
        if missing:
            print(f"FAIL {name}: missing columns {', '.join(missing)}")
            failed = True
        else:
            print(f"PASS {name}: required columns found")
        if name in {"service_requests", "request_messages", "request_attachments"}:
            # Flag columns that an INSERT must supply but this feature does not know about.
            supplied = {
                "service_requests": {"client_id", "provider_id", "service_id", "description",
                                     "preferred_date", "preferred_time", "address", "latitude",
                                     "longitude", "status"},
                "request_messages": {"request_id", "sender_user_id", "message_text"},
                "request_attachments": {"request_id", "file_path", "file_name", "content_type"},
            }[name]
            for col in columns:
                if (col["name"] not in supplied | {"id"}
                        and not col.get("nullable", True)
                        and col.get("default") is None
                        and col.get("computed") is None
                        and col.get("identity") is None):
                    print(f"WARNING {name}.{col['name']}: NOT NULL without a DB default; inserts may fail")
            # SQLAlchemy Core reflection does not recover Python-side ORM defaults.
            for col in columns:
                if col["name"] in {"created_at", "updated_at"} and col.get("default") is None:
                    print(f"WARNING {name}.{col['name']}: no DB-side default detected; inserts may fail")
        if name == "service_requests":
            for kind, candidates in {
                "rejection reason": {"rejection_reason", "reject_reason"},
                "cancellation reason": {"cancellation_reason", "cancel_reason"},
            }.items():
                if not candidates & actual:
                    print(f"WARNING service_requests: no {kind} column; reasoned actions cannot persist a reason")
    if failed:
        print("Schema mismatch: compare with existing models/migrations; do not blindly overwrite tables.")
        raise SystemExit(1)
    print("Core request schema compatible. No Alembic migration generated.")


if __name__ == "__main__":
    main()
