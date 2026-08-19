import os
import json
from dotenv import load_dotenv
load_dotenv()
from google import genai
from google.genai import types

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
for model in ["gemini-3.1-flash-lite", "gemini-3-flash-preview", "gemini-2.5-pro"]:
    try:
        resp = client.models.generate_content(
            model=model,
            contents="Return a JSON object with keys 'title' and 'summary' for an introductory lesson on photosynthesis.",
            config=types.GenerateContentConfig(response_mime_type="application/json")
        )
        print(f"SUCCESS with {model}:", resp.text)
        break
    except Exception as e:
        print(f"Failed {model}:", e)
