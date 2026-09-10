from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel
from typing import Optional, List
from datetime import datetime


class BaseSchema(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


class RubricCriterionCreate(BaseSchema):
    title: str
    description: Optional[str] = None
    max_points: int = Field(gt=0, default=10)
    order: int = 0


class RubricCriterionResponse(RubricCriterionCreate):
    id: str


class RubricCreate(BaseSchema):
    title: str
    criteria: List[RubricCriterionCreate] = []


class RubricResponse(BaseSchema):
    id: str
    school_id: str
    created_by_id: Optional[str] = None
    title: str
    created_at: Optional[datetime] = None
    criteria: List[RubricCriterionResponse] = []
    total_points: int = 0


class RubricScoreEntry(BaseSchema):
    criterion_id: str
    points_awarded: float = Field(ge=0)
    comment: Optional[str] = None
