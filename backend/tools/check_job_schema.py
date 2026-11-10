"""Read-only compatibility check. Run from backend:
python -m tools.check_job_schema
"""
from sqlalchemy import inspect
from app.database import engine

REQUIRED = {
    "jobs": {
        "id", "request_id", "quotation_id", "provider_id", "assigned_user_id",
        "schedule_date", "schedule_time", "schedule_status", "status",
        "cancellation_reason", "cancelled_at", "cancelled_by", "completed_at",
        "created_at", "updated_at",
    },
    "job_records": {
        "id", "job_id", "record_type", "note", "material_name", "quantity",
        "unit", "file_path", "file_name", "content_type", "created_at",
    },
    "users": {"id", "provider_id", "role", "status"},
    "providers": {"id", "type", "verification_status"},
    "service_requests": {"id", "client_id", "provider_id", "service_id"},
    "services": {"id", "name"},
    "user_skills": {"user_id", "skill_name"},
    "working_hours": {"provider_id", "day_of_week", "start_time", "end_time", "is_closed"},
}


def main():
    inspector = inspect(engine)
    names = set(inspector.get_table_names())
    failed = False
    for table, required in REQUIRED.items():
        if table not in names:
            print(f"FAIL {table}: table missing")
            failed = True
            continue
        actual = {column["name"] for column in inspector.get_columns(table)}
        missing = sorted(required - actual)
        if missing:
            print(f"FAIL {table}: missing columns: {', '.join(missing)}")
            failed = True
        else:
            print(f"PASS {table}: required columns present")
    if failed:
        raise SystemExit("Job schema is not compatible. Compare with current ORM models/migrations.")
    print("PASS core job schema check")
    print("NOTE: this checker is read-only; it does not create migrations or modify data.")
    print("NOTE: required skill is matched case-insensitively to services.name because no service-skill mapping table is in the 19-table schema.")


if __name__ == "__main__":
    main()
