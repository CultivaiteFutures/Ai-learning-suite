import json
import re
from typing import Optional, List, Dict, Any
from fastapi import HTTPException, status
from google import genai
from google.genai import types
from app.core.config import settings
from app.services.ai_providers.base import BaseAIProvider

class GeminiAIProvider(BaseAIProvider):
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model = model or settings.GEMINI_MODEL or "gemini-3.1-flash-lite"

        is_placeholder = (
            not self.api_key
            or "placeholder" in self.api_key.lower()
            or len(self.api_key.strip()) < 10
        )
        if is_placeholder:
            self.client = None
        else:
            try:
                self.client = genai.Client(api_key=self.api_key)
            except Exception:
                self.client = None

    def _ensure_client(self):
        if not self.client:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI configuration required: Google Gemini API key is not configured on the server."
            )

    def _get_candidate_models(self) -> List[str]:
        candidates = [self.model, "gemini-3.1-flash-lite", "gemini-3-flash-preview", "gemini-3.6-flash", "gemini-2.5-pro"]
        seen = set()
        result = []
        for m in candidates:
            if m and m not in seen:
                seen.add(m)
                result.append(m)
        return result

    def _call_gemini(self, contents: str, config: Optional[types.GenerateContentConfig] = None) -> str:
        self._ensure_client()
        last_error = None
        for model_name in self._get_candidate_models():
            try:
                response = self.client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=config
                )
                if response and response.text:
                    return response.text
            except Exception as e:
                last_error = e
                continue

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI configuration required: Gemini API error: {str(last_error)}"
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
        prompt = f'''You are an expert curriculum designer. Generate a structured educational course in strict JSON format.

Course Name: {course_name}
Grade: {grade}
Subject: {subject}
Language: {language}
Difficulty: {difficulty}
Objectives: {objectives}
Modules Count: {number_of_modules}
Lesson Duration: {lesson_duration}
Instructions: {additional_instructions}

Return STRICT JSON only matching this exact schema:
{{
  "title": "{course_name}",
  "description": "Comprehensive course description...",
  "subject": "{subject}",
  "grade_level": "{grade}",
  "language": "{language}",
  "difficulty": "{difficulty}",
  "modules": [
    {{
      "title": "Module 1 Title",
      "description": "Module description...",
      "order": 0,
      "lessons": [
        {{
          "title": "Lesson 1 Title",
          "content": "Detailed educational lesson content...",
          "summary": "Key takeaways summary...",
          "duration_minutes": 30,
          "order": 0,
          "activities": ["Activity 1", "Activity 2"],
          "homework": "Homework description...",
          "quiz": [
            {{"question": "Question 1?", "options": ["Option A", "Option B", "Option C", "Option D"], "answer": "Option A"}}
          ]
        }}
      ]
    }}
  ]
}}'''
        config = types.GenerateContentConfig(response_mime_type="application/json")
        raw_text = self._call_gemini(contents=prompt, config=config)
        return self._extract_json(raw_text)

    def generate_assignment(
        self,
        topic: str,
        grade_level: str = "Grade 10",
        instructions: str = ""
    ) -> Dict[str, Any]:
        prompt = f'''You are an educator. Generate an assignment in strict JSON format.

Topic: {topic}
Grade Level: {grade_level}
Instructions: {instructions}

Return STRICT JSON only matching this schema:
{{
  "title": "Assignment Title",
  "description": "Detailed assignment problem set and instructions...",
  "max_points": 100
}}'''
        config = types.GenerateContentConfig(response_mime_type="application/json")
        raw_text = self._call_gemini(contents=prompt, config=config)
        return self._extract_json(raw_text)

    def tutor_chat(
        self,
        question: str,
        context_info: str = "",
        history: Optional[List[Dict[str, Any]]] = None
    ) -> str:
        prompt_parts = []
        if history:
            for item in history:
                role = item.get("role", "user")
                content = item.get("content", "")
                prompt_parts.append(f"{role.capitalize()}: {content}")

        prompt_parts.append(f"Context: {context_info}")
        prompt_parts.append(f"Student Question: {question}")
        prompt = "\n".join(prompt_parts)

        system_instruction = "You are an encouraging, expert AI Tutor assisting a student. Provide clear, structured, step-by-step explanations."
        config = types.GenerateContentConfig(system_instruction=system_instruction)
        return self._call_gemini(contents=prompt, config=config).strip()

    def generate_course_from_pdf(
        self,
        pdf_text: str,
        filename: str
    ) -> Dict[str, Any]:
        truncated_text = pdf_text[:20000]

        prompt = f'''You are an expert curriculum designer. Transform the following extracted PDF textbook content into a structured educational course in strict JSON format.

Source Document: {filename}
Document Content:
{truncated_text}

Return STRICT JSON only matching this schema:
{{
  "title": "Course Title derived from {filename}",
  "description": "Comprehensive overview derived from document...",
  "subject": "Subject identified from content",
  "grade_level": "Grade 10",
  "language": "English",
  "difficulty": "Medium",
  "modules": [
    {{
      "title": "Module 1 Title",
      "description": "Module summary...",
      "order": 0,
      "lessons": [
        {{
          "title": "Lesson 1 Title",
          "content": "Educational content extracted & synthesized from document...",
          "summary": "Key concepts summary...",
          "duration_minutes": 30,
          "order": 0,
          "activities": ["Practice Activity 1", "Discussion Question 2"],
          "homework": "Independent study task...",
          "quiz": [
            {{"question": "Quiz question?", "options": ["A", "B", "C", "D"], "answer": "A"}}
          ]
        }}
      ]
    }}
  ]
}}'''
        config = types.GenerateContentConfig(response_mime_type="application/json")
        raw_text = self._call_gemini(contents=prompt, config=config)
        return self._extract_json(raw_text)

    def grade_submission(
        self,
        submission_text: str,
        answer_key: str,
        assignment_title: str = "",
        max_points: float = 100.0
    ) -> Dict[str, Any]:
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
        config = types.GenerateContentConfig(response_mime_type="application/json")
        raw_text = self._call_gemini(contents=prompt, config=config)
        return self._extract_json(raw_text)

    def grade_submission_with_rubric(
        self,
        submission_text: str,
        criteria: List[Dict[str, Any]],
        assignment_title: str = ""
    ) -> Dict[str, Any]:
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
        config = types.GenerateContentConfig(response_mime_type="application/json")
        raw_text = self._call_gemini(contents=prompt, config=config)
        return self._extract_json(raw_text)
