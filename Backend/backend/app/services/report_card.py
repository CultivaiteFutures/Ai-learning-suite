"""
Formal report-card PDF generation (Task #49). Given a student, builds a
single PDF summarizing: per-course grade averages (from graded Submissions),
overall attendance rate, and any enrolled courses with no graded work yet.
Shared by the Teacher (scoped to their own courses) and School Admin
(any student in the school) report-card endpoints.
"""
import io
from collections import defaultdict
from datetime import datetime, timezone

from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from app.models.user import User
from app.models.course import Course
from app.models.lms import Enrollment, Assignment, Submission
from app.models.attendance import AttendanceRecord, AttendanceStatus


def generate_report_card_pdf(db: Session, school, student: User) -> io.BytesIO:
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        name="ReportCardTitle", parent=styles["Heading1"], fontSize=18, leading=22,
        textColor=colors.HexColor("#1E1B4B"),
    )
    sub_style = ParagraphStyle(name="ReportCardSub", parent=styles["Normal"], fontSize=10, textColor=colors.HexColor("#475569"))
    section_style = ParagraphStyle(name="ReportCardSection", parent=styles["Heading2"], fontSize=13, spaceBefore=14, spaceAfter=6, textColor=colors.HexColor("#312E81"))

    elements = [
        Paragraph(f"{school.name}", sub_style),
        Paragraph("Student Progress Report", title_style),
        Spacer(1, 4),
        Paragraph(f"Student: <b>{student.full_name}</b> ({student.email})", sub_style),
        Paragraph(f"Grade / Section: {(student.grade.name if student.grade else 'N/A')} {(student.section or '')}", sub_style),
        Paragraph(f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}", sub_style),
    ]

    # --- Per-course grade averages -----------------------------------
    enrollments = db.query(Enrollment).filter(Enrollment.student_id == student.id).all()
    course_ids = [e.course_id for e in enrollments]
    courses = {c.id: c for c in db.query(Course).filter(Course.id.in_(course_ids)).all()} if course_ids else {}

    submissions = (
        db.query(Submission, Assignment)
        .join(Assignment, Assignment.id == Submission.assignment_id)
        .filter(Submission.student_id == student.id, Submission.grade_points.isnot(None))
        .all()
    )
    totals = defaultdict(lambda: [0.0, 0.0])  # course_id -> [earned, possible]
    for sub, assignment in submissions:
        if assignment.course_id not in courses:
            continue
        totals[assignment.course_id][0] += sub.grade_points or 0
        totals[assignment.course_id][1] += assignment.max_points or 100

    elements.append(Paragraph("Academic Performance", section_style))
    grade_data = [["Course", "Grade Level", "Average", "Graded Work"]]
    if not courses:
        grade_data.append(["Not currently enrolled in any course", "-", "-", "-"])
    else:
        for cid, course in courses.items():
            earned, possible = totals.get(cid, [0.0, 0.0])
            avg = f"{(earned / possible * 100):.1f}%" if possible else "No graded work yet"
            graded_count = sum(1 for sub, a in submissions if a.course_id == cid)
            grade_data.append([course.title, course.grade_level or "N/A", avg, str(graded_count)])

    grade_table = Table(grade_data, colWidths=[190, 90, 90, 90])
    grade_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#4F46E5")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('ALIGN', (2, 0), (3, -1), 'CENTER'),
    ]))
    elements.append(grade_table)

    # --- Attendance summary -------------------------------------------
    attendance_records = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student.id).all()
    total_days = len(attendance_records)
    present_days = sum(1 for r in attendance_records if r.status in (AttendanceStatus.PRESENT, AttendanceStatus.LATE))
    attendance_rate = f"{(present_days / total_days * 100):.1f}%" if total_days else "No attendance recorded yet"

    elements.append(Paragraph("Attendance", section_style))
    att_data = [
        ["Days Recorded", "Present", "Absent", "Late", "Excused", "Attendance Rate"],
        [
            str(total_days),
            str(sum(1 for r in attendance_records if r.status == AttendanceStatus.PRESENT)),
            str(sum(1 for r in attendance_records if r.status == AttendanceStatus.ABSENT)),
            str(sum(1 for r in attendance_records if r.status == AttendanceStatus.LATE)),
            str(sum(1 for r in attendance_records if r.status == AttendanceStatus.EXCUSED)),
            attendance_rate,
        ],
    ]
    att_table = Table(att_data, colWidths=[80, 70, 70, 60, 70, 110])
    att_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0F766E")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ]))
    elements.append(att_table)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    doc.build(elements)
    buf.seek(0)
    return buf
