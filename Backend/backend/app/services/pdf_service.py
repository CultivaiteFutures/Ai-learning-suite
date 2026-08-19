import io
import json
import pypdf
from app.services.ai_service import ai_service

class PDFCourseService:
    def extract_text_from_pdf(self, file_bytes: bytes) -> str:
        reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return text

    def generate_course_from_pdf(self, file_bytes: bytes, filename: str, provider: str = None) -> dict:
        pdf_text = self.extract_text_from_pdf(file_bytes)
        return ai_service.generate_course_from_pdf(pdf_text=pdf_text, filename=filename, provider=provider)

pdf_service = PDFCourseService()