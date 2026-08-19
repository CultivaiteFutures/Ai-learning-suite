import sys
import os

# Add root backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.school import School
from app.models.user import User, UserRole
from app.models.lms import Grade, Enrollment, LessonProgress, Assignment, Submission, StudentStats, EvaluationGame, GameResult
from app.models.course import Course, Module, Lesson
from app.models.platform import Subscription, ActivityLog

def seed_db():
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        print("Seeding ONLY user accounts & school infrastructure (NO sample courses/lessons/assignments)...")

        # Clean existing sample content data if present
        db.query(GameResult).delete()
        db.query(EvaluationGame).delete()
        db.query(Submission).delete()
        db.query(Assignment).delete()
        db.query(LessonProgress).delete()
        db.query(Lesson).delete()
        db.query(Module).delete()
        db.query(Enrollment).delete()
        db.query(Course).delete()
        db.commit()

        # TIER 1: Platform Super Admin & Schools
        super_admin = User(
            id="user-superadmin-id",
            email="superadmin@system.com",
            hashed_password=get_password_hash("password123"),
            full_name="Platform Super Admin",
            role=UserRole.SUPER_ADMIN,
            is_active=True
        )
        db.merge(super_admin)

        school_a = School(
            id="school-a-uuid",
            name="Springfield Academy",
            domain="springfield.edu",
            is_active=True
        )
        db.merge(school_a)

        school_b = School(
            id="school-b-uuid",
            name="Oakridge High",
            domain="oakridge.edu",
            is_active=True
        )
        db.merge(school_b)

        db.flush()

        # TIER 2: Subscriptions & Grades (depends on Schools)
        sub_a = Subscription(
            id="sub-a-id",
            school_id=school_a.id,
            plan="Professional",
            status="active"
        )
        sub_b = Subscription(
            id="sub-b-id",
            school_id=school_b.id,
            plan="Enterprise",
            status="active"
        )
        grade_a = Grade(
            id="grade-a-id",
            school_id=school_a.id,
            name="Grade 10",
            code="G10"
        )
        grade_b = Grade(
            id="grade-b-id",
            school_id=school_b.id,
            name="Grade 11",
            code="G11"
        )
        db.merge(sub_a)
        db.merge(sub_b)
        db.merge(grade_a)
        db.merge(grade_b)

        db.flush()

        # TIER 3: Users (Super Admin, School Admins, Teachers, Students)
        admin_a = User(
            id="user-admin-a-id",
            email="admin.springfield@school.com",
            hashed_password=get_password_hash("password123"),
            full_name="Springfield Admin",
            role=UserRole.ADMIN,
            school_id=school_a.id,
            is_active=True
        )
        teacher_a = User(
            id="user-teacher-a-id",
            email="teacher.springfield@school.com",
            hashed_password=get_password_hash("password123"),
            full_name="Sarah Jenkins",
            role=UserRole.TEACHER,
            school_id=school_a.id,
            is_active=True
        )
        student_a = User(
            id="user-student-a-id",
            email="student.springfield@school.com",
            hashed_password=get_password_hash("password123"),
            full_name="Alex Rivera",
            role=UserRole.STUDENT,
            school_id=school_a.id,
            grade_id=grade_a.id,
            is_active=True
        )

        admin_b = User(
            id="user-admin-b-id",
            email="admin.oakridge@school.com",
            hashed_password=get_password_hash("password123"),
            full_name="Oakridge Admin",
            role=UserRole.ADMIN,
            school_id=school_b.id,
            is_active=True
        )
        teacher_b = User(
            id="user-teacher-b-id",
            email="teacher.oakridge@school.com",
            hashed_password=get_password_hash("password123"),
            full_name="Marcus Vance",
            role=UserRole.TEACHER,
            school_id=school_b.id,
            is_active=True
        )
        student_b = User(
            id="user-student-b-id",
            email="student.oakridge@school.com",
            hashed_password=get_password_hash("password123"),
            full_name="Maya Lin",
            role=UserRole.STUDENT,
            school_id=school_b.id,
            grade_id=grade_b.id,
            is_active=True
        )

        db.merge(admin_a)
        db.merge(teacher_a)
        db.merge(student_a)
        db.merge(admin_b)
        db.merge(teacher_b)
        db.merge(student_b)

        db.commit()
        print("Database successfully seeded with ONLY accounts and school structures (ZERO sample course/LMS data)!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
