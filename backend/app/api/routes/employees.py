import secrets

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Response,
    status,
)

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db

from app.core.dependencies import get_current_user
from app.core.security import hash_password

from app.models.user import User
from app.models.provider import Provider
from app.models.user_skills import UserSkill

from app.schemas.employee import (
    EmployeeCreateRequest,
    EmployeeCreateResponse,
    EmployeeManagerUpdateRequest,
    EmployeeProfileUpdateRequest,
    EmployeeResponse,
)

from app.schemas.skill import (
    SkillCreateRequest,
    SkillResponse,
)


router = APIRouter(tags=["Employees and Skills"])

MAX_ACTIVE_EMPLOYEES = 4


# --------------------------------------------------
# SHARED AUTHORIZATION HELPERS
# --------------------------------------------------

def get_company_provider(
    current_user: User,
    db: Session,
    lock: bool = False,
):
    if (
        current_user.role != "COMPANY_MANAGER"
        or current_user.provider_id is None
    ):
        raise HTTPException(
            status_code=403,
            detail="Only company managers can access this resource",
        )

    statement = select(Provider).where(
        Provider.id == current_user.provider_id,
        Provider.type == "COMPANY",
    )

    if lock:
        statement = statement.with_for_update()

    provider = db.scalar(statement)

    if provider is None:
        raise HTTPException(
            status_code=403,
            detail="Company provider not found",
        )

    return provider


def require_employee(current_user: User):
    if current_user.role != "EMPLOYEE":
        raise HTTPException(
            status_code=403,
            detail="Employee access required",
        )


def require_password_changed(current_user: User):
    if current_user.must_change_password:
        raise HTTPException(
            status_code=403,
            detail="Please change your initial password first",
        )


# ==================================================
# API 1: LIST COMPANY EMPLOYEES
# GET /company/employees
# ==================================================

@router.get(
    "/company/employees",
    response_model=list[EmployeeResponse],
)
def list_company_employees(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    provider = get_company_provider(current_user, db)

    employees = db.scalars(
        select(User)
        .where(
            User.provider_id == provider.id,
            User.role == "EMPLOYEE",
        )
        .order_by(User.id.asc())
    ).all()

    return employees


# ==================================================
# API 2: CREATE EMPLOYEE
# POST /company/employees
# ==================================================

@router.post(
    "/company/employees",
    response_model=EmployeeCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_employee(
    data: EmployeeCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Lock provider to serialize employee creation.
    provider = get_company_provider(
        current_user,
        db,
        lock=True,
    )

    if provider.verification_status != "APPROVED":
        raise HTTPException(
            status_code=403,
            detail="Company must be approved before creating employees",
        )

    email = str(data.email).lower()

    existing_user = db.scalar(
        select(User).where(
            func.lower(User.email) == email
        )
    )

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists",
        )

    active_count = db.scalar(
        select(func.count(User.id)).where(
            User.provider_id == provider.id,
            User.role == "EMPLOYEE",
            User.status == "ACTIVE",
        )
    ) or 0

    if active_count >= MAX_ACTIVE_EMPLOYEES:
        raise HTTPException(
            status_code=409,
            detail="Company already has four active employees",
        )

    # Generate a secure initial password.
    initial_password = secrets.token_urlsafe(18)

    employee = User(
        provider_id=provider.id,
        name=data.name.strip(),
        email=email,
        phone=data.phone.strip(),
        password_hash=hash_password(initial_password),
        role="EMPLOYEE",
        status="ACTIVE",
        must_change_password=True,
    )

    try:
        db.add(employee)
        db.commit()
        db.refresh(employee)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Employee registration conflicts with existing data",
        )

    except Exception:
        db.rollback()
        raise

    employee_data = EmployeeResponse.model_validate(
        employee
    ).model_dump()

    return EmployeeCreateResponse(
        **employee_data,
        initial_password=initial_password,
    )


# ==================================================
# API 3: UPDATE EMPLOYEE EMAIL OR STATUS
# PATCH /company/employees/{id}
# ==================================================

@router.patch(
    "/company/employees/{id}",
    response_model=EmployeeResponse,
)
def update_employee(
    id: int,
    data: EmployeeManagerUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    provider = get_company_provider(
        current_user,
        db,
        lock=True,
    )

    employee = db.scalar(
        select(User)
        .where(
            User.id == id,
            User.provider_id == provider.id,
            User.role == "EMPLOYEE",
        )
        .with_for_update()
    )

    if employee is None:
        raise HTTPException(
            status_code=404,
            detail="Employee not found",
        )

    updates = data.model_dump(exclude_unset=True)

    if not updates or any(value is None for value in updates.values()):
        raise HTTPException(
            status_code=422,
            detail="Provide a valid email or status",
        )

    try:
        if "email" in updates:
            email = str(updates["email"]).lower()

            existing_user = db.scalar(
                select(User).where(
                    func.lower(User.email) == email,
                    User.id != employee.id,
                )
            )

            if existing_user:
                raise HTTPException(
                    status_code=409,
                    detail="Email is already registered",
                )

            if email != employee.email.lower():
                employee.email = email

                # Previous email verification is no longer valid.
                employee.email_verified_at = None
                employee.verification_token_hash = None
                employee.verification_token_expires_at = None

        if "status" in updates:
            new_status = updates["status"]

            if (
                new_status == "ACTIVE"
                and employee.status != "ACTIVE"
            ):
                if provider.verification_status != "APPROVED":
                    raise HTTPException(
                        status_code=403,
                        detail="Company must be approved to activate employees",
                    )

                active_count = db.scalar(
                    select(func.count(User.id)).where(
                        User.provider_id == provider.id,
                        User.role == "EMPLOYEE",
                        User.status == "ACTIVE",
                        User.id != employee.id,
                    )
                ) or 0

                if active_count >= MAX_ACTIVE_EMPLOYEES:
                    raise HTTPException(
                        status_code=409,
                        detail="Company already has four active employees",
                    )

            employee.status = new_status

        db.commit()
        db.refresh(employee)

    except HTTPException:
        db.rollback()
        raise

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Employee update conflicts with existing data",
        )

    except Exception:
        db.rollback()
        raise

    return employee


# ==================================================
# API 4: GET OWN EMPLOYEE PROFILE
# GET /employee/me
# ==================================================

@router.get(
    "/employee/me",
    response_model=EmployeeResponse,
)
def get_employee_profile(
    current_user: User = Depends(get_current_user),
):
    require_employee(current_user)

    return current_user


# ==================================================
# API 5: UPDATE OWN EMPLOYEE PROFILE
# PATCH /employee/me
# ==================================================

@router.patch(
    "/employee/me",
    response_model=EmployeeResponse,
)
def update_employee_profile(
    data: EmployeeProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_employee(current_user)
    require_password_changed(current_user)

    updates = data.model_dump(exclude_unset=True)

    if not updates or any(value is None for value in updates.values()):
        raise HTTPException(
            status_code=422,
            detail="Provide a valid name or phone",
        )

    try:
        for field, value in updates.items():
            setattr(current_user, field, value)

        db.commit()
        db.refresh(current_user)

    except Exception:
        db.rollback()
        raise

    return current_user


# ==================================================
# API 6: LIST OWN SKILLS
# GET /employee/me/skills
# ==================================================

@router.get(
    "/employee/me/skills",
    response_model=list[SkillResponse],
)
def get_employee_skills(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_employee(current_user)
    require_password_changed(current_user)

    skills = db.scalars(
        select(UserSkill)
        .where(UserSkill.user_id == current_user.id)
        .order_by(UserSkill.skill_name.asc())
    ).all()

    return skills


# ==================================================
# API 7: ADD OWN SKILL
# POST /employee/me/skills
# ==================================================

@router.post(
    "/employee/me/skills",
    response_model=SkillResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_employee_skill(
    data: SkillCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_employee(current_user)
    require_password_changed(current_user)

    skill_name = data.skill_name.strip()

    existing_skill = db.scalar(
        select(UserSkill).where(
            UserSkill.user_id == current_user.id,
            func.lower(UserSkill.skill_name) == skill_name.lower(),
        )
    )

    if existing_skill:
        raise HTTPException(
            status_code=409,
            detail="This skill already exists",
        )

    skill = UserSkill(
        user_id=current_user.id,
        skill_name=skill_name,
    )

    try:
        db.add(skill)
        db.commit()
        db.refresh(skill)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="This skill already exists",
        )

    except Exception:
        db.rollback()
        raise

    return skill


# ==================================================
# API 8: DELETE OWN SKILL
# DELETE /employee/me/skills/{id}
# ==================================================

@router.delete(
    "/employee/me/skills/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_employee_skill(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_employee(current_user)
    require_password_changed(current_user)

    skill = db.scalar(
        select(UserSkill).where(
            UserSkill.id == id,
            UserSkill.user_id == current_user.id,
        )
    )

    if skill is None:
        raise HTTPException(
            status_code=404,
            detail="Skill not found",
        )

    db.delete(skill)
    db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)