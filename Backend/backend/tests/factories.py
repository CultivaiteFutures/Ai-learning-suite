"""
Tiny factory helpers shared by the test modules -- build just enough of the
real object graph (School -> Grade/Course -> User/Enrollment) for each test,
using the real models so a schema drift breaks tests instead of Postgres.
"""
import uuid

from app.core.security import get_password_hash, create_access_token
from app.models.school import School
from app.models.user import User, UserRole
from app.models.lms import Grade, Enrollment, ParentStudentLink
from app.models.course import Course, Module, Lesson


def make_school(db, name="Test School"):
    school = School(name=name)
    db.add(school)
    db.commit()
    db.refresh(school)
    return school


def make_grade(db, school, name="Grade 7"):
    grade = Grade(school_id=school.id, name=name)
    db.add(grade)
    db.commit()
    db.refresh(grade)
    return grade


def make_user(db, school, role, grade=None, email=None, password="Password@123"):
    email = email or f"{role.value.lower()}-{uuid.uuid4().hex[:8]}@test.school"
    user = User(
        email=email,
        hashed_password=get_password_hash(password),
        full_name=f"Test {role.value.title()}",
        role=role,
        school_id=school.id if school else None,
        grade_id=grade.id if grade else None,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def make_course(db, school, teacher=None, title="Test Course"):
    course = Course(
        school_id=school.id,
        title=title,
        created_by_id=teacher.id if teacher else None,
        is_published=True,
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


def enroll(db, school, student, course):
    enrollment = Enrollment(school_id=school.id, student_id=student.id, course_id=course.id)
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return enrollment


def auth_headers(user):
    token = create_access_token(subject=user.id, role=user.role.value, school_id=user.school_id)
    return {"Authorization": f"Bearer {token}"}

def link_parent(db, school, parent, student):
    link = ParentStudentLink(school_id=school.id, parent_id=parent.id, student_id=student.id)
    db.add(link)
    db.commit()
    db.refresh(link)
    return link

def make_lesson(db, course, title="Test Lesson"):
    module = Module(course_id=course.id, title="Test Module")
    db.add(module)
    db.commit()
    db.refresh(module)
    lesson = Lesson(module_id=module.id, title=title, content="Lesson content")
    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    return lesson


def make_assignment(db, school, course, title="Test Assignment"):
    from app.models.lms import Assignment
    assignment = Assignment(school_id=school.id, course_id=course.id, title=title)
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


def make_enrollment(db, school, student, course):
    enrollment = Enrollment(school_id=school.id, student_id=student.id, course_id=course.id)
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return enrollment


def make_submission(db, school, assignment, student, grade_points=None):
    from app.models.lms import Submission
    submission = Submission(school_id=school.id, assignment_id=assignment.id, student_id=student.id, grade_points=grade_points)
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission
