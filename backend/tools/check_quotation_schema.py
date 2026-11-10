"""Read-only quotation schema validation. Run from backend with: python -m tools.check_quotation_schema"""
from sqlalchemy import inspect
from app.database import engine

REQUIRED = {
    "users": {"id", "provider_id", "role", "status"},
    "providers": {"id", "type", "verification_status"},
    "service_requests": {"id", "client_id", "provider_id", "status"},
    "quotations": {
        "id", "request_id", "status", "subtotal", "total_amount",
        "valid_until", "downpayment_amount", "note", "created_at", "updated_at",
    },
    "quotation_items": {"id", "quotation_id", "description", "quantity", "unit_price"},
    "jobs": {
        "id", "request_id", "quotation_id", "provider_id", "assigned_user_id",
        "schedule_date", "schedule_time", "schedule_status", "status",
    },
}


def _has_unique_index(inspector, table: str, column: str) -> bool:
    for index in inspector.get_indexes(table):
        if index.get("unique") and index.get("column_names") == [column]:
            return True
    for constraint in inspector.get_unique_constraints(table):
        if constraint.get("column_names") == [column]:
            return True
    return False


def _has_active_partial_unique_index(inspector) -> bool:
    for index in inspector.get_indexes("quotations"):
        if not index.get("unique") or index.get("column_names") != ["request_id"]:
            continue
        options = index.get("dialect_options", {}) or {}
        where = str(options.get("postgresql_where", "")).upper()
        if "STATUS" in where and all(value in where for value in ("DRAFT", "SENT", "APPROVED")):
            return True
    return False


def main() -> None:
    inspector = inspect(engine)
    existing = set(inspector.get_table_names())
    failed = False
    for table, required in REQUIRED.items():
        if table not in existing:
            print(f"FAIL {table}: table missing")
            failed = True
            continue
        columns = inspector.get_columns(table)
        actual = {column["name"] for column in columns}
        missing = sorted(required - actual)
        if missing:
            print(f"FAIL {table}: missing columns: {', '.join(missing)}")
            failed = True
        else:
            print(f"PASS {table}: required columns present")

        if table == "quotations":
            by_name = {column["name"]: column for column in columns}
            for optional_name in ("downpayment_amount", "note"):
                column = by_name.get(optional_name)
                if column and not column.get("nullable", True):
                    print(f"FAIL quotations.{optional_name}: proposal defines this field as optional, so it must be nullable")
                    failed = True
            checks = " ".join(str(item.get("sqltext", "")) for item in inspector.get_check_constraints("quotations"))
            if checks and not all(value in checks for value in ("DRAFT", "SENT", "APPROVED", "DECLINED", "EXPIRED")):
                print("WARNING quotations.status check constraint may not include all five proposal statuses")
            if not _has_active_partial_unique_index(inspector):
                print("WARNING no partial unique index for active quotation statuses detected. Do not add a full unique constraint: declined/expired quotations must be replaceable. The service serializes writes by locking the parent request row.")
            supplied = {"request_id", "status", "subtotal", "total_amount", "valid_until", "downpayment_amount", "note", "created_at", "updated_at", "id"}
            for column in columns:
                if (column["name"] not in supplied and not column.get("nullable", True)
                        and column.get("default") is None and column.get("computed") is None
                        and column.get("identity") is None):
                    print(f"FAIL quotations.{column['name']}: unexpected NOT NULL column without a DB default")
                    failed = True

        if table == "quotation_items":
            supplied = {"quotation_id", "description", "quantity", "unit_price", "id"}
            for column in columns:
                if (column["name"] not in supplied and not column.get("nullable", True)
                        and column.get("default") is None and column.get("computed") is None
                        and column.get("identity") is None):
                    print(f"FAIL quotation_items.{column['name']}: unexpected NOT NULL column without a DB default")
                    failed = True

        if table == "jobs":
            by_name = {column["name"]: column for column in columns}
            for name in ("assigned_user_id", "schedule_date", "schedule_time", "schedule_status"):
                column = by_name.get(name)
                if column and not column.get("nullable", True) and column.get("default") is None:
                    print(f"FAIL jobs.{name}: must allow NULL or have a DB default at job creation; scheduling/assignment occurs later")
                    failed = True
            checks = " ".join(str(item.get("sqltext", "")) for item in inspector.get_check_constraints("jobs"))
            if checks and "JOB_CREATED" not in checks:
                print("WARNING jobs.status check constraint does not visibly mention JOB_CREATED; verify its allowed values")
            supplied = {"request_id", "quotation_id", "provider_id", "assigned_user_id", "schedule_date", "schedule_time", "schedule_status", "status", "created_at", "updated_at", "id"}
            for column in columns:
                if (column["name"] not in supplied and not column.get("nullable", True)
                        and column.get("default") is None and column.get("computed") is None
                        and column.get("identity") is None):
                    print(f"FAIL jobs.{column['name']}: unexpected NOT NULL column without a DB default; job creation does not know its initial value")
                    failed = True
            if not _has_unique_index(inspector, "jobs", "quotation_id"):
                print("WARNING jobs.quotation_id is not uniquely constrained; service locks request rows, but a DB unique constraint is recommended")

    if not failed:
        print("PASS core quotation schema check")
        print("NOTE: one-active-quotation-per-request is serialized by SELECT FOR UPDATE on service_requests.")
        print("NOTE: for additional database-level protection, review the optional partial unique index in README.md.")
    else:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
