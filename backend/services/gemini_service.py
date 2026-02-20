"""
Gemini AI Service — interface to Google's Gemini API for generating
journal prompts, review summaries, and coaching insights.
"""

import os
import json
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()


def get_client():
    """Create Gemini client using API key."""
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY environment variable not set")
    return genai.Client(api_key=api_key)


def generate_text(prompt: str, system_instruction: str = None, temperature: float = 0.8) -> str:
    """Generate text using Gemini 2.5 Flash."""
    client = get_client()
    config = types.GenerateContentConfig(
        temperature=temperature,
        max_output_tokens=2048,
    )
    if system_instruction:
        config.system_instruction = system_instruction

    response = client.models.generate_content(
        model="gemini-2.5-pro-preview-05-06",
        contents=prompt,
        config=config,
    )
    return response.text


def generate_json(prompt: str, system_instruction: str = None) -> dict:
    """Generate structured JSON output from Gemini."""
    client = get_client()
    config = types.GenerateContentConfig(
        temperature=0.7,
        max_output_tokens=4096,
        response_mime_type="application/json",
    )
    if system_instruction:
        config.system_instruction = system_instruction

    response = client.models.generate_content(
        model="gemini-2.5-pro-preview-05-06",
        contents=prompt,
        config=config,
    )
    return json.loads(response.text)
