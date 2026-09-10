"""
Teacher/Admin management API for the "Fun Games" module.

This is the missing management side of the existing EvaluationGame/GameResult
system (see app/models/lms.py). The student-facing routes already exist and
are left completely untouched:
    GET  /student/games              (app/api/v1/student.py)
    POST /student/games/{id}/submit  (app/api/v1/student.py)

Mounted with NO prefix here -- every route below spells out its own "/games"
path, exactly like app/api/v1/announcements.py does for "/announcements". The
central router (app/api/v1/router.py) includes this module without a prefix.

NOTE ON "OWNERSHIP": `Course.created_by_id` (app/models/course.py) is now a
real access-control field, enforced here the same way app/api/v1/teacher.py
enforces it for module/lesson/assignment CRUD: a TEACHER may only
create/update/delete a game on a course they created (or an orphaned course
with no recorded creator, per the fallback in
app/services/course_ownership.py); ADMIN is unrestricted. Reading games
(list/get) stays school-wide, matching every other route in this codebase.
"""

from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_school_id, get_current_user, require_roles
from app.core.database import get_db
from app.models.course import Course, Lesson, Module
from app.models.lms import EvaluationGame, GameResult
from app.models.user import User, UserRole
from app.schemas.lms import GameCreate, GameResponse, GameUpdate
from app.services.course_ownership import can_manage_course

TEACHING_ROLES = [UserRole.TEACHER, UserRole.ADMIN]
ALLOWED_GAME_TYPES = ["quiz_match", "trivia", "flashcard", "memory", "matching", "puzzle"]

router = APIRouter(dependencies=[Depends(require_roles(TEACHING_ROLES))])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _first_present(d: dict, *keys):
    for k in keys:
        if k in d and d[k] is not None:
            return d[k]
    return None


def _get_owned_course(db: Session, course_id: str, school_id: str) -> Course:
    course = db.query(Course).filter(Course.id == course_id, Course.school_id == school_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found or access denied")
    return course


def _validate_lesson_in_course(db: Session, lesson_id: Optional[str], course_id: str) -> Optional[Lesson]:
    if not lesson_id:
        return None
    lesson = (
        db.query(Lesson)
        .join(Module, Lesson.module_id == Module.id)
        .filter(Lesson.id == lesson_id, Module.course_id == course_id)
        .first()
    )
    if not lesson:
        raise HTTPException(status_code=400, detail="lesson_id does not belong to the given course")
    return lesson


def _validate_config(game_type: str, config: Any) -> dict:
    """
    Validates config shape per game_type with plain dict/list checks. Raises
    HTTPException(400) on anything malformed. Returns the (possibly
    defaulted) config dict to persist.
    """
    if config is None:
        config = {}
    if not isinstance(config, dict):
        raise HTTPException(status_code=400, detail="config must be a JSON object")

    if game_type in ("quiz_match", "trivia"):
        questions = config.get("questions")
        if not isinstance(questions, list) or len(questions) < 1:
            raise HTTPException(
                status_code=400,
                detail="config.questions must be a non-empty list of {question, options, correct_index}",
            )
        for i, q in enumerate(questions):
            if not isinstance(q, dict):
                raise HTTPException(status_code=400, detail=f"questions[{i}] must be an object")
            question_text = q.get("question")
            options = q.get("options")
            correct_index = _first_present(q, "correct_index", "correctIndex")
            if not isinstance(question_text, str) or not question_text.strip():
                raise HTTPException(status_code=400, detail=f"questions[{i}].question is required")
            if not isinstance(options, list) or len(options) < 2:
                raise HTTPException(status_code=400, detail=f"questions[{i}].options must have at least 2 choices")
            if not isinstance(correct_index, int) or not (0 <= correct_index < len(options)):
                raise HTTPException(
                    status_code=400,
                    detail=f"questions[{i}].correct_index must be an int index into options",
                )

    elif game_type == "flashcard":
        cards = config.get("cards")
        if not isinstance(cards, list) or len(cards) < 1:
            raise HTTPException(status_code=400, detail="config.cards must be a non-empty list of {front, back}")
        for i, c in enumerate(cards):
            if not isinstance(c, dict) or not str(c.get("front") or "").strip() or not str(c.get("back") or "").strip():
                raise HTTPException(status_code=400, detail=f"cards[{i}] needs non-empty front and back")

    elif game_type == "memory":
        pairs = config.get("pairs")
        if not isinstance(pairs, list) or len(pairs) < 4:
            raise HTTPException(
                status_code=400, detail="config.pairs must have at least 4 {term, match} pairs for a memory game"
            )
        for i, p in enumerate(pairs):
            if not isinstance(p, dict) or not str(p.get("term") or "").strip() or not str(p.get("match") or "").strip():
                raise HTTPException(status_code=400, detail=f"pairs[{i}] needs non-empty term and match")

    elif game_type == "matching":
        pairs = config.get("pairs")
        if not isinstance(pairs, list) or len(pairs) < 4:
            raise HTTPException(
                status_code=400, detail="config.pairs must have at least 4 {left, right} pairs for a matching game"
            )
        for i, p in enumerate(pairs):
            if not isinstance(p, dict) or not str(p.get("left") or "").strip() or not str(p.get("right") or "").strip():
                raise HTTPException(status_code=400, detail=f"pairs[{i}] needs non-empty left and right")

    elif game_type == "puzzle":
        words = config.get("words")
        if not isinstance(words, list) or len(words) < 4 or not all(isinstance(w, str) and w.strip() for w in words):
            raise HTTPException(status_code=400, detail="config.words must have at least 4 non-empty strings")
        puzzle_type = _first_present(config, "puzzle_type", "puzzleType") or "word_scramble"
        if puzzle_type not in ("word_scramble", "word_search"):
            raise HTTPException(status_code=400, detail="config.puzzle_type must be 'word_scramble' or 'word_search'")
        config = {**config, "puzzle_type": puzzle_type}

    return config


def _to_response(db: Session, game: EvaluationGame) -> GameResponse:
    results = db.query(GameResult).filter(GameResult.game_id == game.id).all()
    attempt_count = len(results)
    average_score = (sum(r.score for r in results) / attempt_count) if attempt_count else None
    resp = GameResponse.model_validate(game)
    resp.attempt_count = attempt_count
    resp.average_score = average_score
    return resp


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/games", response_model=GameResponse)
def create_game(
    payload: GameCreate,
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db),
):
    if not payload.title or not payload.title.strip():
        raise HTTPException(status_code=400, detail="title is required")

    game_type = payload.game_type or "quiz_match"
    if game_type not in ALLOWED_GAME_TYPES:
        raise HTTPException(status_code=400, detail=f"game_type must be one of {ALLOWED_GAME_TYPES}")

    if not payload.course_id:
        raise HTTPException(status_code=400, detail="course_id is required")

    course = _get_owned_course(db, payload.course_id, school_id)
    if not can_manage_course(db, course, current_user):
        raise HTTPException(status_code=403, detail="Only the course's teacher or a school admin can do this")
    _validate_lesson_in_course(db, payload.lesson_id, course.id)
    config = _validate_config(game_type, payload.config)

    game = EvaluationGame(
        school_id=school_id,
        course_id=course.id,
        lesson_id=payload.lesson_id or None,
        title=payload.title.strip(),
        game_type=game_type,
        config=config,
        is_published=payload.is_published if payload.is_published is not None else True,
    )
    db.add(game)
    db.commit()
    db.refresh(game)
    return _to_response(db, game)


@router.get("/games", response_model=List[GameResponse])
def list_games(
    course_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db),
):
    query = db.query(EvaluationGame).filter(EvaluationGame.school_id == school_id)
    if course_id:
        _get_owned_course(db, course_id, school_id)  # 404s if the course isn't in this school
        query = query.filter(EvaluationGame.course_id == course_id)

    games = query.order_by(EvaluationGame.created_at.desc()).all()
    return [_to_response(db, g) for g in games]


@router.get("/games/{game_id}", response_model=GameResponse)
def get_game(
    game_id: str,
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db),
):
    game = db.query(EvaluationGame).filter(EvaluationGame.id == game_id, EvaluationGame.school_id == school_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found or access denied")
    return _to_response(db, game)


@router.put("/games/{game_id}", response_model=GameResponse)
def update_game(
    game_id: str,
    payload: GameUpdate,
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db),
):
    game = db.query(EvaluationGame).filter(EvaluationGame.id == game_id, EvaluationGame.school_id == school_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found or access denied")

    current_course = _get_owned_course(db, game.course_id, school_id)
    if not can_manage_course(db, current_course, current_user):
        raise HTTPException(status_code=403, detail="Only the course's teacher or a school admin can do this")

    game_type = payload.game_type or game.game_type
    if game_type not in ALLOWED_GAME_TYPES:
        raise HTTPException(status_code=400, detail=f"game_type must be one of {ALLOWED_GAME_TYPES}")

    if payload.course_id and payload.course_id != game.course_id:
        course = _get_owned_course(db, payload.course_id, school_id)
        game.course_id = course.id

    if payload.lesson_id is not None:
        if payload.lesson_id:
            _validate_lesson_in_course(db, payload.lesson_id, game.course_id)
            game.lesson_id = payload.lesson_id
        else:
            game.lesson_id = None

    config_input = payload.config if payload.config is not None else (game.config or {})
    config = _validate_config(game_type, config_input)

    if payload.title and payload.title.strip():
        game.title = payload.title.strip()
    game.game_type = game_type
    game.config = config
    if payload.is_published is not None:
        game.is_published = payload.is_published

    db.commit()
    db.refresh(game)
    return _to_response(db, game)


@router.delete("/games/{game_id}")
def delete_game(
    game_id: str,
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db),
):
    game = db.query(EvaluationGame).filter(EvaluationGame.id == game_id, EvaluationGame.school_id == school_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found or access denied")
    course = _get_owned_course(db, game.course_id, school_id)
    if not can_manage_course(db, course, current_user):
        raise HTTPException(status_code=403, detail="Only the course's teacher or a school admin can do this")
    db.delete(game)
    db.commit()
    return {"message": "Game deleted", "id": game_id}
