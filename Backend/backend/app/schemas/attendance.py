from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from typing import Optional, List
from datetime import date as date_type, datetime


class BaseSchema(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


class AttendanceMarkEntry(BaseSchema):
    student_id: str
    status: str  # "present" | "absent" | "late" | "excused"
    notes: Optional[str] = None


class AttendanceMarkRequest(BaseSchema):
    course_id: str
    date: date_type
    records: List[AttendanceMarkEntry]


class AttendanceRosterEntry(BaseSchema):
    student_id: str
    student_name: str
    status: Optional[str] = None
    notes: Optional[str] = None


class AttendanceSummaryEntry(BaseSchema):
    student_id: str
    student_name: str
    present_count: int
    absent_count: int
    late_count: int
    excused_count: int
    total_days: int
    attendance_rate: float


class StudentAttendanceRecord(BaseSchema):
    id: str
    course_id: str
    course_name: str
    date: date_type
    status: str
    notes: Optional[str] = None


class StudentCourseAttendanceSummary(BaseSchema):
    course_id: str
    course_name: str
    present_count: int
    absent_count: int
    late_count: int
    excused_count: int
    total_days: int
    attendance_rate: float


class StudentAttendanceResponse(BaseSchema):
    records: List[StudentAttendanceRecord]
    summary: List[StudentCourseAttendanceSummary]
