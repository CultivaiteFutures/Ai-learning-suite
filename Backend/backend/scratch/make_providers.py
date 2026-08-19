import os

provider_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'app', 'services', 'ai_providers')
os.makedirs(provider_dir, exist_ok=True)

# 1. Base provider
base_code = """from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any

class BaseAIProvider(ABC):
    @abstractmethod
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
        pass

    @abstractmethod
    def generate_assignment(
        self,
        topic: str,
        grade_level: str = "Grade 10",
        instructions: str = ""
    ) -> Dict[str, Any]:
        pass

    @abstractmethod
    def tutor_chat(
        self,
        question: str,
        context_info: str = "",
        history: Optional[List[Dict[str, Any]]] = None
    ) -> str:
        pass

    @abstractmethod
    def generate_course_from_pdf(
        self,
        pdf_text: str,
        filename: str
    ) -> Dict[str, Any]:
        pass
"""
with open(os.path.join(provider_dir, 'base.py'), 'w', encoding='utf-8') as f:
    f.write(base_code)

# 2. Gemini Provider using official google-genai SDK
gemini_code = """import json
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
        self.model = model or settings.GEMINI_MODEL or "gemini-3.6-flash"

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
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            return self._extract_json(response.text)
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"AI configuration required: Gemini API error: {str(e)}"
            )

    def generate_assignment(
        self,
        topic: str,
        grade_level: str = "Grade 10",
        instructions: str = ""
    ) -> Dict[str, Any]:
        self._ensure_client()

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
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            return self._extract_json(response.text)
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"AI configuration required: Gemini API error: {str(e)}"
            )

    def tutor_chat(
        self,
        question: str,
        context_info: str = "",
        history: Optional[List[Dict[str, Any]]] = None
    ) -> str:
        self._ensure_client()

        prompt_parts = []
        if history:
            for item in history:
                role = item.get("role", "user")
                content = item.get("content", "")
                prompt_parts.append(f"{role.capitalize()}: {content}")

        prompt_parts.append(f"Context: {context_info}")
        prompt_parts.append(f"Student Question: {question}")
        prompt = "\\n".join(prompt_parts)

        system_instruction = "You are an encouraging, expert AI Tutor assisting a student. Provide clear, structured, step-by-step explanations."

        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction
                )
            )
            return response.text.strip()
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"AI configuration required: Gemini API error: {str(e)}"
            )

    def generate_course_from_pdf(
        self,
        pdf_text: str,
        filename: str
    ) -> Dict[str, Any]:
        self._ensure_client()

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
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            return self._extract_json(response.text)
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"AI configuration required: Gemini API error: {str(e)}"
            )
"""
with open(os.path.join(provider_dir, 'gemini_provider.py'), 'w', encoding='utf-8') as f:
    f.write(gemini_code)

# 3. Claude Provider
claude_code = """import json
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

        messages.append({"role": "user", "content": f"Context: {context_info}\\nQuestion: {question}"})

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
"""
with open(os.path.join(provider_dir, 'claude_provider.py'), 'w', encoding='utf-8') as f:
    f.write(claude_code)

# 4. Factory
factory_code = """from typing import Optional
from app.core.config import settings
from app.services.ai_providers.base import BaseAIProvider
from app.services.ai_providers.gemini_provider import GeminiAIProvider
from app.services.ai_providers.claude_provider import ClaudeAIProvider

_providers = {}

def get_ai_provider(provider_name: Optional[str] = None) -> BaseAIProvider:
    name = (provider_name or settings.DEFAULT_AI_PROVIDER or "gemini").strip().lower()
    
    if name in ["claude", "anthropic"]:
        if "claude" not in _providers:
            _providers["claude"] = ClaudeAIProvider()
        return _providers["claude"]
    else:
        # Default to Gemini
        if "gemini" not in _providers:
            _providers["gemini"] = GeminiAIProvider()
        return _providers["gemini"]
"""
with open(os.path.join(provider_dir, 'factory.py'), 'w', encoding='utf-8') as f:
    f.write(factory_code)

print("AI Providers successfully created.")
