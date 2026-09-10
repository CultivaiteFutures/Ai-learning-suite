"""
Rubric management (Task #46). A Teacher builds and owns their own rubrics;
an Admin can see and manage every rubric in the school (oversight parity
with everything else Admin can already do), but one teacher can never see
or edit another teacher's rubric.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.api.deps import require_roles, get_current_school_id, get_current_user
from app.models.user import User, UserRole
from app.models.rubric import Rubric, RubricCriterion
from app.models.lms import Assignment
from app.schemas.rubric import RubricCreate, RubricResponse, RubricCriterionResponse

router = APIRouter(dependencies=[Depends(require_roles([UserRole.TEACHER, UserRole.ADMIN]))])


def _to_response(rubric: Rubric) -> RubricResponse:
    criteria = [RubricCriterionResponse.model_validate(c) for c in rubric.criteria]
    return RubricResponse(
        id=rubric.id,
        school_id=rubric.school_id,
        created_by_id=rubric.created_by_id,
        title=rubric.title,
        created_at=rubric.created_at,
        criteria=criteria,
        total_points=sum(c.max_points for c in rubric.criteria),
    )


def _get_owned_rubric(db: Session, rubric_id: str, school_id: str, current_user: User) -> Rubric:
    rubric = db.query(Rubric).filter(Rubric.id == rubric_id, Rubric.school_id == school_id).first()
    if not rubric:
        raise HTTPException(status_code=404, detail="Rubric not found")
    if current_user.role != UserRole.ADMIN and rubric.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have access to this rubric")
    return rubric


@router.post("/rubrics", response_model=RubricResponse)
def create_rubric(
    payload: RubricCreate,
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db),
):
    if not payload.title.strip():
        raise HTTPException(status_code=400, detail="Rubric title is required")
    if not payload.criteria:
        raise HTTPException(status_code=400, detail="A rubric needs at least one criterion")

    rubric = Rubric(school_id=school_id, created_by_id=current_user.id, title=payload.title.strip())
    db.add(rubric)
    db.flush()  # so rubric.id exists for the criteria FK below

    for idx, c in enumerate(payload.criteria):
        db.add(RubricCriterion(
            rubric_id=rubric.id,
            title=c.title.strip(),
            description=c.description,
            max_points=c.max_points,
            order=c.order if c.order else idx,
        ))

    db.commit()
    db.refresh(rubric)
    return _to_response(rubric)


@router.get("/rubrics", response_model=List[RubricResponse])
def list_rubrics(
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db),
):
    query = db.query(Rubric).filter(Rubric.school_id == school_id)
    if current_user.role != UserRole.ADMIN:
        query = query.filter(Rubric.created_by_id == current_user.id)
    rubrics = query.order_by(Rubric.created_at.desc()).all()
    return [_to_response(r) for r in rubrics]


@router.get("/rubrics/{rubric_id}", response_model=RubricResponse)
def get_rubric(
    rubric_id: str,
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db),
):
    rubric = _get_owned_rubric(db, rubric_id, school_id, current_user)
    return _to_response(rubric)


@router.put("/rubrics/{rubric_id}", response_model=RubricResponse)
def update_rubric(
    rubric_id: str,
    payload: RubricCreate,
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db),
):
    rubric = _get_owned_rubric(db, rubric_id, school_id, current_user)
    if not payload.title.strip():
        raise HTTPException(status_code=400, detail="Rubric title is required")
    if not payload.criteria:
        raise HTTPException(status_code=400, detail="A rubric needs at least one criterion")

    rubric.title = payload.title.strip()

    # Replace criteria wholesale -- simplest correct behavior for an edit
    # form that always resubmits the full criteria list, and avoids having
    # to diff/reconcile individual criterion ids client-side.
    db.query(RubricCriterion).filter(RubricCriterion.rubric_id == rubric.id).delete()
    for idx, c in enumerate(payload.criteria):
        db.add(RubricCriterion(
            rubric_id=rubric.id,
            title=c.title.strip(),
            description=c.description,
            max_points=c.max_points,
            order=c.order if c.order else idx,
        ))

    db.commit()
    db.refresh(rubric)
    return _to_response(rubric)


@router.delete("/rubrics/{rubric_id}")
def delete_rubric(
    rubric_id: str,
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db),
):
    rubric = _get_owned_rubric(db, rubric_id, school_id, current_user)

    # Detach from any assignment currently pointing at this rubric before
    # deleting it -- done explicitly here rather than relying on the FK's
    # ON DELETE SET NULL, since not every DB engine this app might run
    # against enforces that pragma by default.
    db.query(Assignment).filter(Assignment.rubric_id == rubric.id).update({"rubric_id": None})
    db.delete(rubric)
    db.commit()
    return {"message": "Rubric deleted"}
