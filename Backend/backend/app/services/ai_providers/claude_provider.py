import json
import re
from typing import Optional, List, Dict, Any
from fastapi import HTTPException, status
import anthropic
from app.core.config import settings
from app.services.ai_providers.base import BaseAIProvider

class ClaudeAIProvider(BaseAIProvider):
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or settings.CLAUDE_API_KEY
        self.model = model or settings.CLAUDE_MODEL or "claude-3-5-sonnet-20241022"

        is_placeholder = (
            not self.api_key
            or "your-anthropic-claude-api-key" in self.api_key.lower()
            or "placeholder" in self.api_key.lower()
            or len(self.api_key.strip()) < 10
        )
        if is_placeholder:
            self.client = None
        else:
            try:
                self.client = anthropic.Anthropic(api_key=self.api_key)
            except Exception:
                self.client = None

    def _ensure_client(self):
        if not self.client:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI configuration required: Anthropic Claude API key is not configured on the server."
            )

    def _extract_json(self, text: str) -> dict:
        clean_text = text.strip()
        if "```json" in clean_text:
            match = re.search(r"```json\s*(.*?)\s*```", clean_text, re.DOTALL)
            if match:
                clean_text = match.group(1)
        elif "```" in clean_text:
            match = re.search(r"```\s*(.*?)\s*```", clean_text, re.DOTALL)
            if match:
                clean_text = match.group(1)

        try:
            return json.loads(clean_text)
        except Exception:
            start = clean_text.find("{")
            end = clean_text.rfind("}")
            if start != -1 and end != -1:
                return json.loads(clean_text[start:end+1])
            raise

    def generate_course_structure(
        self,
        course_name: str,
        grade: str,
        subject: str,
        language: str = "English",
        difficulty: str = "Medium",
        objectives: str = "",
        number_of_modules: int = 4,
        lesson_duration: str = "30 mins",
        additional_instructions: str = ""
    ) -> Dict[str, Any]:
        self._ensure_client()

        prompt = f'''You are an expert curriculum designer. Generate a structured course for:
Course Name: {course_name}
Grade: {grade}
Subject: {subject}
Language: {language}
Difficulty: {difficulty}
Objectives: {objectives}
Modules: {number_of_modules}
Lesson Duration: {lesson_duration}
Instructions: {additional_instructions}

Return strict JSON only in this schema:
{{
  "title": "{course_name}",
  "description": "Comprehensive course description...",
  "subject": "{subject}",
  "grade_level": "{grade}",
  "language": "{language}",
  "difficulty": "{difficulty}",
  "modules": [
    {{
      "title": "Module Title",
      "description": "Module description",
      "order": 0,
      "lessons": [
        {{
          "title": "Lesson Title",
          "content": "Detailed lesson content and explanation...",
          "summary": "Key summary points...",
          "duration_minutes": 30,
          "order": 0,
          "activities": ["Activity 1", "Activity 2"],
          "homework": "Homework assignment description",
          "quiz": [
            {{"question": "Q1", "options": ["A", "B", "C", "D"], "answer": "A"}}
          ]
        }}
      ]
    }}
  ]
}}'''
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=4000,
                messages=[{"role": "user", "content": prompt}]
            )
            return self._extract_json(response.content[0].text)
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"AI configuration required: Anthropic Claude API key error: {str(e)}"
            )

    def generate_assignment(
        self,
        topic: str,
        grade_level: str = "Grade 10",
        instructions: str = ""
    ) -> Dict[str, Any]:
        self._ensure_client()

        prompt = f'''You are an educator. Generate an assignment for:
Topic: {topic}
Grade Level: {grade_level}
Instructions: {instructions}

Return strict JSON only:
{{
  "title": "Assignment Title",
  "description": "Detailed assignment instructions and problem set...",
  "max_points": 100
}}'''
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=1500,
                messages=[{"role": "user", "content": prompt}]
            )
            return self._extract_json(response.content[0].text)
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"AI configuration required: Anthropic Claude API key error: {str(e)}"
            )

    def tutor_chat(
        self,
        question: str,
        context_info: str = "",
        history: Optional[List[Dict[str, Any]]] = None
    ) -> str:
        self._ensure_client()

        messages = []
        if history:
            for item in history:
                messages.append({"role": item.get("role", "user"), "content": item.get("content", "")})

        messages.append({"role": "user", "content": f"Context: {context_info}\nQuestion: {question}"})

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=1000,
                system="You are a helpful, encouraging AI Tutor assisting a student with their coursework.",
                messages=messages
            )
            return response.content[0].text
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"AI configuration required: Anthropic Claude API key error: {str(e)}"
            )

    def generate_course_from_pdf(
        self,
        pdf_text: str,
        filename: str
    ) -> Dict[str, Any]:
        self._ensure_client()

        truncated_text = pdf_text[:12000]

        prompt = f'''Extract key concepts and transform the following PDF textbook/document content into a full structured course.

PDF Filename: {filename}
PDF Content:
{truncated_text}

Return strict JSON only matching this schema:
{{
  "title": "Course Title derived from PDF",
  "description": "Detailed course description",
  "subject": "Extracted Subject",
  "grade_level": "Extracted Grade Level",
  "language": "English",
  "difficulty": "Medium",
  "modules": [
    {{
      "title": "Module Title",
      "description": "Module overview",
      "order": 0,
      "lessons": [
        {{
          "title": "Lesson Title",
          "content": "Detailed lesson content extracted & expanded from PDF",
          "summary": "Lesson summary",
          "duration_minutes": 30,
          "order": 0,
          "activities": ["Activity 1", "Activity 2"],
          "homework": "Homework task",
          "quiz": [
            {{"question": "Sample Question?", "options": ["A", "B", "C", "D"], "answer": "A"}}
          ]
        }}
      ]
    }}
  ]
}}'''
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=4000,
                messages=[{"role": "user", "content": prompt}]
            )
            return self._extract_json(response.content[0].text)
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"AI configuration required: Anthropic Claude API key error: {str(e)}"
            )

    def grade_submission(
        self,
        submission_text: str,
        answer_key: str,
        assignment_title: str = "",
        max_points: float = 100.0
    ) -> Dict[str, Any]:
        self._ensure_client()
        prompt = f'''You are an expert academic evaluator. Grade the student's submission by comparing it thoroughly with the provided official answer key and scoring rubric.

Assignment: {assignment_title}
Maximum Points: {max_points}

Official Answer Key / Rubric:
{answer_key}

Student Submission:
{submission_text}

Evaluate accuracy, completeness, key steps, and conceptual understanding.
Return STRICT JSON only matching this schema:
{{
  "suggested_grade": 85.0,
  "max_points": {max_points},
  "feedback": "Comprehensive teacher feedback explaining the score and key strengths/errors...",
  "strengths": ["Clear step-by-step working", "Accurate final answer for question 1"],
  "areas_for_improvement": ["Review intermediate derivation in question 2"]
}}'''
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}]
            )
            return self._extract_json(response.content[0].text)
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"AI configuration required: Anthropic Claude API key error: {str(e)}"
            )

    def grade_submission_with_rubric(
        self,
        submission_text: str,
        criteria: List[Dict[str, Any]],
        assignment_title: str = ""
    ) -> Dict[str, Any]:
        self._ensure_client()
        criteria_json = json.dumps(criteria, indent=2)
        prompt = f'''You are an expert academic evaluator grading a student's submission against a scoring rubric, one criterion at a time.

Assignment: {assignment_title}

Rubric Criteria (grade the submission against EACH of these independently):
{criteria_json}

Student Submission:
{submission_text}

For every criterion above, decide how many of its points the submission earns and why -- point to specific evidence in the submission (or note what's missing) rather than a generic comment. Use the criterion's own "id" value exactly as given, unchanged, as "criterion_id" in your response.
Return STRICT JSON only matching this schema:
{{
  "criteria": [
    {{"criterion_id": "<the exact id from above>", "suggested_points": 4, "justification": "Specific reasoning tied to the submission text..."}}
  ],
  "overall_feedback": "A short overall comment for the student, synthesizing the criteria above."
}}'''
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}]
            )
            return self._extract_json(response.content[0].text)
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"AI configuration required: Anthropic Claude API key error: {str(e)}"
            )
