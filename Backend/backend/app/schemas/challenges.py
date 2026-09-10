from pydantic import BaseModel, ConfigDict, model_validator
from pydantic.alias_generators import to_camel
from typing import Optional, List
from datetime import datetime


class BaseSchema(BaseModel):
    """
    Same camelCase-serializing base used by every other schema module in
    this app (app/schemas/lms.py, app/schemas/course.py, ...). Every schema
    below inherits from this -- NOT from plain pydantic.BaseModel -- so
    responses serialize as camelCase like the rest of the API, and requests
    can be sent either camelCase or snake_case.
    """
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


class ChallengeQuestion(BaseSchema):
    """
    One auto-graded quiz question. `id` is caller-supplied (the frontend
    generates a stable client-side id per question so answers can be matched
    back up) -- the server fills one in if it's ever left blank.

    correct_index/correct_answer are the answer key: present on the
    Admin/Teacher "full detail" response and on a student's post-submission
    results, but stripped out of the response a student gets while the quiz
    is still in progress (see _sanitize_question in the router).
    """
    id: Optional[str] = None
    text: str
    type: str = "mcq"  # "mcq" | "true_false"
    options: Optional[List[str]] = None  # required for mcq
    correct_index: Optional[int] = None  # present when authoring/reviewing; None on the sanitized pre-submission view
    correct_answer: Optional[bool] = None  # present when authoring/reviewing; None on the sanitized pre-submission view
    points: int = 1

    @model_validator(mode="after")
    def check_shape(self):
        """
        Structural checks only -- NOT "does this question have a graded
        answer key", since this same schema also represents the sanitized
        view a student gets before submitting (see _sanitize_question in
        app/api/v1/challenges.py), which deliberately omits correct_index/
        correct_answer. Whether the answer key itself is present and valid
        is checked separately by check_answer_key(), called explicitly by
        create_challenge/update_challenge -- never implicitly here, or the
        sanitized view would fail to even construct.
        """
        if self.type not in ("mcq", "true_false"):
            raise ValueError("Each question's type must be 'mcq' or 'true_false'")
        if self.type == "mcq" and (not self.options or len(self.options) < 2):
            raise ValueError("Multiple-choice questions need at least 2 options")
        if self.points < 1:
            raise ValueError("Points must be at least 1")
        if not self.text or not self.text.strip():
            raise ValueError("Question text is required")
        return self


def check_answer_key(q: "ChallengeQuestion") -> None:
    """
    The "does this question actually have a correct answer set" check,
    split out of ChallengeQuestion's own validator (see check_shape's
    docstring) so it can be enforced when authoring a challenge without also
    rejecting the answer-key-stripped shape used for the student
    pre-submission view. Raises ValueError -- callers turn that into an
    HTTPException.
    """
    if q.type == "mcq":
        if q.correct_index is None or not q.options or not (0 <= q.correct_index < len(q.options)):
            raise ValueError(f"\"{q.text}\": select a valid correct option")
    elif q.type == "true_false" and q.correct_answer is None:
        raise ValueError(f"\"{q.text}\": select True or False as the correct answer")


class ChallengeCreate(BaseSchema):
    title: str
    description: Optional[str] = None
    subject: Optional[str] = None
    # Grades this challenge targets (Grade.id values from this school).
    # Empty list = every grade in the school.
    target_grade_ids: List[str] = []
    start_date: datetime
    end_date: datetime
    bonus_xp: int = 20
    badge_name: Optional[str] = None
    questions: List[ChallengeQuestion] = []

    @model_validator(mode="after")
    def check_challenge(self):
        if self.end_date <= self.start_date:
            raise ValueError("end_date must be after start_date")
        if not self.title.strip():
            raise ValueError("Title is required")
        if not self.questions:
            raise ValueError("At least one question is required")
        return self


class ChallengeResponse(BaseSchema):
    id: str
    school_id: str
    created_by_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    subject: Optional[str] = None
    target_grade_ids: List[str] = []
    # Computed by the router from target_grade_ids so the frontend never
    # needs a second grades lookup just to show "Grades 7, 8, 9, 10" (or
    # "All grades" when target_grade_ids is empty) on a list/detail view.
    target_grade_names: List[str] = []
    start_date: datetime
    end_date: datetime
    bonus_xp: int
    badge_name: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None
    # Computed, not stored -- "upcoming" | "active" | "ended", based on now vs
    # start_date/end_date, populated by the router (not derivable from the ORM
    # object alone since it depends on wall-clock time at request time).
    status: str = "upcoming"
    participant_count: int = 0
    question_count: int = 0
    # For a STUDENT caller only: has this student already submitted this
    # quiz? Always False for a Teacher/Admin caller (submission doesn't
    # apply to them). Lets the student list page show "Completed" instead
    # of a "Take Quiz" button without a second round-trip per challenge.
    has_submitted: bool = False
    my_score: Optional[int] = None
    # Full question content, WITH the answer key, included only on the
    # single-challenge detail response (GET /challenges/{id}) for
    # Admin/Teacher callers, or for a Student who has already submitted.
    # Omitted (None) everywhere else -- most importantly, never sent to a
    # student who hasn't taken the quiz yet.
    questions: Optional[List[ChallengeQuestion]] = None


class ChallengeAnswer(BaseSchema):
    question_id: str
    selected_index: Optional[int] = None
    selected_answer: Optional[bool] = None


class ChallengeSubmitRequest(BaseSchema):
    answers: List[ChallengeAnswer] = []


class ChallengeQuestionResult(BaseSchema):
    question_id: str
    correct: bool
    points_earned: int
    points_possible: int
    correct_index: Optional[int] = None
    correct_answer: Optional[bool] = None
    selected_index: Optional[int] = None
    selected_answer: Optional[bool] = None


class ChallengeSubmitResponse(BaseSchema):
    score: int
    max_score: int
    correct_count: int
    total_questions: int
    bonus_xp_awarded: int
    results: List[ChallengeQuestionResult] = []


class ChallengeParticipantResponse(BaseSchema):
    id: str
    challenge_id: str
    student_id: str
    joined_at: Optional[datetime] = None
    score: Optional[int] = None
    completed_at: Optional[datetime] = None
    bonus_awarded: bool = False


class ChallengeLeaderboardEntry(BaseSchema):
    rank: int
    student_id: str
    full_name: str
    score: Optional[int] = None
    completed_at: Optional[datetime] = None
    is_current_user: bool = False


class ChallengeLeaderboardResponse(BaseSchema):
    entries: List[ChallengeLeaderboardEntry] = []
    # The requesting student's own entry, included even when they fall
    # outside the top-N cut (mirrors GET /student/leaderboard's shape).
    # None for a teacher/admin caller, or a student who hasn't submitted.
    current_student: Optional[ChallengeLeaderboardEntry] = None
