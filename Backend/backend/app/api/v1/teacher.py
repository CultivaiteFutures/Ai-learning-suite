from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.api.deps import require_roles, get_current_school_id, get_current_user
from app.models.user import User, UserRole
from app.models.course import Course, Module, Lesson
from app.models.lms import Assignment, Submission, Enrollment, StudentStats, Grade
from app.models.platform import ActivityLog
from app.schemas.course import CourseCreate, CourseResponse, ModuleCreate, ModuleResponse, LessonCreate, LessonResponse
from app.schemas.lms import AssignmentCreate, AssignmentResponse, SubmissionResponse

router = APIRouter(dependencies=[Depends(require_roles([UserRole.TEACHER, UserRole.ADMIN]))])

@router.get("/courses", response_model=List[CourseResponse])
def get_teacher_courses(
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    return db.query(Course).filter(Course.school_id == school_id).all()


@router.get("/courses/{course_id}", response_model=CourseResponse)
def get_course_detail(
    course_id: str,
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id, Course.school_id == school_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")
    return course


@router.post("/courses", response_model=CourseResponse)
def create_course(
    payload: CourseCreate,
    school_id: str = Depends(get_current_school_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    course = Course(
        school_id=school_id,
        title=payload.title,
        description=payload.description,
        subject=payload.subject,
        grade_level=payload.grade_level,
        language=payload.language or "English",
        difficulty=payload.difficulty or "Medium",
        is_published=False,
        created_by_id=current_user.id
    )
    db.add(course)
    db.commit()
    db.refresh(course)

    for m_idx, m_data in enumerate(payload.modules or []):
        module = Module(course_id=course.id, title=m_data.title, description=m_data.description, order=m_idx)
        db.add(module)
        db.commit()
        db.refresh(module)

        for l_idx, l_data in enumerate(m_data.lessons or []):
            lesson = Lesson(
                module_id=module.id,
                title=l_data.title,
                content=l_data.content,
                summary=l_data.summary,
                duration_minutes=l_data.duration_minutes,
                order=l_idx,
                activities=l_data.activities,
                homework=l_data.homework,
                quiz=l_data.quiz
            )
            db.add(lesson)

    log = ActivityLog(school_id=school_id, user_id=current_user.id, user_name=current_user.full_name, action="COURSE_CREATED", details=f"Course: {course.title}")
    db.add(log)

    db.commit()
    db.refresh(course)
    return course


@router.put("/courses/{course_id}", response_model=CourseResponse)
def update_course(
    course_id: str,
    payload: CourseCreate,
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id, Course.school_id == school_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")

    course.title = payload.title
    course.description = payload.description
    course.subject = payload.subject
    course.grade_level = payload.grade_level
    if payload.language:
        course.language = payload.language
    if payload.difficulty:
        course.difficulty = payload.difficulty

    db.commit()
    db.refresh(course)
    return course


@router.delete("/courses/{course_id}")
def delete_course(
    course_id: str,
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id, Course.school_id == school_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")
    db.delete(course)
    db.commit()
    return {"message": "Course deleted", "id": course_id}


@router.post("/courses/{course_id}/publish")
def toggle_course_publish(
    course_id: str,
    school_id: str = Depends(get_current_school_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id, Course.school_id == school_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")
    
    course.is_published = not course.is_published
    
    log = ActivityLog(
        school_id=school_id,
        user_id=current_user.id,
        user_name=current_user.full_name,
        action="COURSE_PUBLISHED" if course.is_published else "COURSE_UNPUBLISHED",
        details=f"Course: {course.title}"
    )
    db.add(log)

    db.commit()
    return {"id": course.id, "is_published": course.is_published, "status": "published" if course.is_published else "draft"}


# MODULE ENDPOINTS
@router.post("/courses/{course_id}/modules", response_model=ModuleResponse)
def add_module(
    course_id: str,
    payload: ModuleCreate,
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id, Course.school_id == school_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")

    max_order = len(course.modules)
    module = Module(course_id=course.id, title=payload.title, description=payload.description, order=max_order)
    db.add(module)
    db.commit()
    db.refresh(module)
    return module


@router.put("/courses/{course_id}/modules/{module_id}", response_model=ModuleResponse)
def update_module(
    course_id: str,
    module_id: str,
    payload: ModuleCreate,
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id, Course.school_id == school_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")
    module = db.query(Module).filter(Module.id == module_id, Module.course_id == course.id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    module.title = payload.title
    module.description = payload.description
    db.commit()
    db.refresh(module)
    return module


@router.delete("/courses/{course_id}/modules/{module_id}")
def delete_module(
    course_id: str,
    module_id: str,
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id, Course.school_id == school_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")
    module = db.query(Module).filter(Module.id == module_id, Module.course_id == course.id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    db.delete(module)
    db.commit()
    return {"message": "Module deleted", "id": module_id}


# LESSON ENDPOINTS
@router.post("/courses/{course_id}/modules/{module_id}/lessons", response_model=LessonResponse)
def add_lesson(
    course_id: str,
    module_id: str,
    payload: LessonCreate,
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id, Course.school_id == school_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")
    module = db.query(Module).filter(Module.id == module_id, Module.course_id == course.id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    max_order = len(module.lessons)
    lesson = Lesson(
        module_id=module.id,
        title=payload.title,
        content=payload.content,
        summary=payload.summary,
        duration_minutes=payload.duration_minutes or 30,
        order=max_order,
        activities=payload.activities,
        homework=payload.homework,
        quiz=payload.quiz
    )
    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    return lesson


@router.put("/courses/{course_id}/modules/{module_id}/lessons/{lesson_id}", response_model=LessonResponse)
def update_lesson(
    course_id: str,
    module_id: str,
    lesson_id: str,
    payload: LessonCreate,
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id, Course.school_id == school_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")
    module = db.query(Module).filter(Module.id == module_id, Module.course_id == course.id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id, Lesson.module_id == module.id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    lesson.title = payload.title
    lesson.content = payload.content
    lesson.summary = payload.summary
    if payload.duration_minutes:
        lesson.duration_minutes = payload.duration_minutes
    lesson.activities = payload.activities
    lesson.homework = payload.homework
    lesson.quiz = payload.quiz

    db.commit()
    db.refresh(lesson)
    return lesson


@router.delete("/courses/{course_id}/modules/{module_id}/lessons/{lesson_id}")
def delete_lesson(
    course_id: str,
    module_id: str,
    lesson_id: str,
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id, Course.school_id == school_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id, Lesson.module_id == module_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    db.delete(lesson)
    db.commit()
    return {"message": "Lesson deleted", "id": lesson_id}


# ASSIGNMENTS ENDPOINTS
@router.get("/assignments", response_model=List[AssignmentResponse])
def get_teacher_assignments(
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    return db.query(Assignment).filter(Assignment.school_id == school_id).all()


@router.post("/assignments", response_model=AssignmentResponse)
def create_assignment(
    payload: AssignmentCreate,
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == payload.course_id, Course.school_id == school_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")

    assignment = Assignment(
        school_id=school_id,
        course_id=payload.course_id,
        lesson_id=payload.lesson_id,
        title=payload.title,
        description=payload.description,
        due_date=payload.due_date,
        max_points=payload.max_points or 100
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


@router.delete("/assignments/{assignment_id}")
def delete_assignment(
    assignment_id: str,
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id, Assignment.school_id == school_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found or access denied")
    db.delete(assignment)
    db.commit()
    return {"message": "Assignment deleted", "id": assignment_id}


@router.get("/assignments/{assignment_id}/submissions", response_model=List[SubmissionResponse])
def get_assignment_submissions(
    assignment_id: str,
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id, Assignment.school_id == school_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found or access denied")
    return db.query(Submission).filter(Submission.assignment_id == assignment_id, Submission.school_id == school_id).all()


@router.post("/submissions/{submission_id}/grade", response_model=SubmissionResponse)
def grade_submission(
    submission_id: str,
    payload: dict,
    school_id: str = Depends(get_current_school_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    submission = db.query(Submission).filter(Submission.id == submission_id, Submission.school_id == school_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found or access denied")

    grade_points = payload.get("grade_points") or payload.get("gradePoints")
    feedback = payload.get("feedback")
    if grade_points is not None:
        submission.grade_points = float(grade_points)
    if feedback is not None:
        submission.feedback = str(feedback)

    log = ActivityLog(
        school_id=school_id,
        user_id=current_user.id,
        user_name=current_user.full_name,
        action="SUBMISSION_GRADED",
        details=f"Graded submission for assignment: {submission.assignment_id}"
    )
    db.add(log)

    db.commit()
    db.refresh(submission)
    return submission


# GOLDEN SOURCE TEMPLATE ENDPOINTS
@router.get("/golden-templates", response_model=List[CourseResponse])
def get_available_golden_templates(db: Session = Depends(get_db)):
    """
    Shows Golden Source Templates (school_id is NULL) available to all schools
    """
    return db.query(Course).filter(Course.school_id.is_(None), Course.is_golden_template == True).all()


@router.post("/adopt-template/{template_id}", response_model=CourseResponse)
def adopt_golden_template(
    template_id: str,
    school_id: str = Depends(get_current_school_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    template = db.query(Course).filter(Course.id == template_id, Course.is_golden_template == True).first()
    if not template:
        raise HTTPException(status_code=404, detail="Golden Source Template not found")

    # 1. Clone Course into brand new school-owned course (never mutate golden source)
    new_course = Course(
        school_id=school_id,
        title=f"{template.title} (Adopted)",
        description=template.description,
        subject=template.subject,
        grade_level=template.grade_level,
        language=template.language,
        difficulty=template.difficulty,
        is_published=False,
        is_golden_template=False,
        origin_template_id=template.id,
        created_by_id=current_user.id
    )
    db.add(new_course)
    db.flush()

    # 2. Clone Modules
    for mod in template.modules:
        new_module = Module(course_id=new_course.id, title=mod.title, description=mod.description, order=mod.order)
        db.add(new_module)
        db.flush()

        # 3. Clone Lessons
        for les in mod.lessons:
            new_lesson = Lesson(
                module_id=new_module.id,
                title=les.title,
                content=les.content,
                summary=les.summary,
                duration_minutes=les.duration_minutes,
                order=les.order,
                activities=les.activities,
                homework=les.homework,
                quiz=les.quiz
            )
            db.add(new_lesson)

    log = ActivityLog(school_id=school_id, user_id=current_user.id, user_name=current_user.full_name, action="TEMPLATE_ADOPTED", details=f"Adopted {template.title}")
    db.add(log)

    db.commit()
    db.refresh(new_course)
    return new_course


@router.get("/students")
def get_teacher_students(
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    students = db.query(User).filter(User.school_id == school_id, User.role == UserRole.STUDENT).all()
    result = []
    for st in students:
        stats = db.query(StudentStats).filter(StudentStats.student_id == st.id).first()
        enroll_count = db.query(Enrollment).filter(Enrollment.student_id == st.id).count()
        grade_name = st.grade.name if st.grade else "N/A"
        result.append({
            "id": st.id,
            "name": st.full_name,
            "email": st.email,
            "grade": grade_name,
            "enrolledCourses": enroll_count,
            "xp": stats.xp if stats else 0,
            "streak": stats.streak_days if stats else 0
        })
    return result


@router.get("/analytics")
def get_teacher_analytics(
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    courses = db.query(Course).filter(Course.school_id == school_id).all()
    total_courses = len(courses)
    total_students = db.query(User).filter(User.school_id == school_id, User.role == UserRole.STUDENT).count()
    total_assignments = db.query(Assignment).filter(Assignment.school_id == school_id).count()
    submissions_count = db.query(Submission).filter(Submission.school_id == school_id).count()

    return {
        "totalCourses": total_courses,
        "totalStudents": total_students,
        "totalAssignments": total_assignments,
        "submissionsCount": submissions_count,
        "averageCompletionRate": 78
    }


@router.get("/grades/export/excel")
def export_grades_excel(
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    """
    Exports full school gradebook data into a formatted Excel (.xlsx) report from PostgreSQL
    """
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment
    import io
    from fastapi.responses import StreamingResponse

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Gradebook Report"

    headers = [
        "Student Name", "Student Email", "Grade Level", "Course",
        "Assignment", "Max Points", "Score / Grade", "Percentage",
        "Status", "Teacher Feedback", "Submission Date"
    ]
    ws.append(headers)

    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
    for cell in ws[1]:
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center")

    submissions = db.query(Submission).filter(Submission.school_id == school_id).all()
    for s in submissions:
        student = db.query(User).filter(User.id == s.student_id).first()
        assignment = db.query(Assignment).filter(Assignment.id == s.assignment_id).first()
        course = db.query(Course).filter(Course.id == assignment.course_id).first() if assignment else None
        
        st_name = student.full_name if student else "Unknown"
        st_email = student.email if student else "N/A"
        grade_lvl = student.grade.name if (student and student.grade) else "N/A"
        c_title = course.title if course else "N/A"
        a_title = assignment.title if assignment else "N/A"
        max_p = assignment.max_points if assignment else 100.0
        score = s.grade_points if s.grade_points is not None else "Pending"
        pct = f"{(s.grade_points / max_p * 100):.1f}%" if (s.grade_points is not None and max_p) else "N/A"
        status = "Graded" if s.grade_points is not None else "Submitted"
        feedback = s.feedback or ""
        sub_date = s.submitted_at.strftime("%Y-%m-%d %H:%M") if s.submitted_at else "N/A"

        ws.append([st_name, st_email, grade_lvl, c_title, a_title, max_p, score, pct, status, feedback, sub_date])

    for col in ws.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = openpyxl.utils.get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=gradebook_report.xlsx"}
    )


@router.get("/grades/export/pdf")
def export_grades_pdf(
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    """
    Exports full school gradebook data into a formatted PDF report from PostgreSQL
    """
    import io
    from fastapi.responses import StreamingResponse
    from reportlab.lib.pagesizes import letter, landscape
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(letter), rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        name="ReportTitle",
        parent=styles["Heading1"],
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#1E1B4B"),
        alignment=1
    )
    
    elements = []
    elements.append(Paragraph("School Gradebook & Assessment Report", title_style))
    elements.append(Spacer(1, 15))

    data = [["Student", "Course", "Assignment", "Max", "Score", "%", "Status", "Feedback"]]
    
    submissions = db.query(Submission).filter(Submission.school_id == school_id).all()
    for s in submissions:
        student = db.query(User).filter(User.id == s.student_id).first()
        assignment = db.query(Assignment).filter(Assignment.id == s.assignment_id).first()
        course = db.query(Course).filter(Course.id == assignment.course_id).first() if assignment else None
        
        st_name = student.full_name if student else "Unknown"
        c_title = (course.title[:20] + "..") if (course and len(course.title) > 20) else (course.title if course else "N/A")
        a_title = (assignment.title[:20] + "..") if (assignment and len(assignment.title) > 20) else (assignment.title if assignment else "N/A")
        max_p = str(int(assignment.max_points)) if assignment else "100"
        score = str(round(s.grade_points, 1)) if s.grade_points is not None else "-"
        pct = f"{(s.grade_points / assignment.max_points * 100):.0f}%" if (s.grade_points is not None and assignment and assignment.max_points) else "-"
        status = "Graded" if s.grade_points is not None else "Submitted"
        feedback = (s.feedback[:30] + "..") if (s.feedback and len(s.feedback) > 30) else (s.feedback or "-")

        data.append([st_name, c_title, a_title, max_p, score, pct, status, feedback])

    if len(data) == 1:
        data.append(["No records found", "-", "-", "-", "-", "-", "-", "-"])

    t = Table(data, colWidths=[110, 110, 110, 45, 45, 45, 65, 170])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#4F46E5")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (3, 0), (5, -1), 'CENTER'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    elements.append(t)
    doc.build(elements)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=gradebook_report.pdf"}
    )