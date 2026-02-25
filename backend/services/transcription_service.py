"""
Transcription Service — uses Gemini 2.0 Flash multimodal to transcribe
audio recordings into text for the journal entry feature.
"""

import base64
from services.gemini_service import get_client
from google.genai import types


def transcribe_audio(audio_bytes: bytes, mime_type: str = "audio/webm") -> dict:
    """
    Transcribe audio using Gemini multimodal.

    Args:
        audio_bytes: Raw audio bytes from the uploaded file
        mime_type: MIME type of the audio (e.g. audio/webm, audio/wav, audio/mp3)

    Returns:
        dict with 'transcription' (raw text) and 'enhanced' (cleaned up version)
    """
    client = get_client()

    # Encode audio as base64 for inline data
    audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

    # Build multimodal content: audio + text instruction
    contents = [
        types.Content(
            parts=[
                types.Part(
                    inline_data=types.Blob(
                        mime_type=mime_type,
                        data=audio_b64,
                    )
                ),
                types.Part(
                    text="Transcribe this audio recording exactly as spoken. "
                         "Include proper punctuation and capitalization. "
                         "If the audio is unclear or silent, return an empty string. "
                         "Return ONLY the transcribed text, nothing else."
                ),
            ]
        )
    ]

    config = types.GenerateContentConfig(
        temperature=0.1,  # Low temp for accurate transcription
        max_output_tokens=4096,
    )

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=contents,
            config=config,
        )
        raw_text = response.text.strip()

        # Generate an enhanced/cleaned version
        enhanced_text = _enhance_transcription(client, raw_text)

        return {
            "transcription": raw_text,
            "enhanced": enhanced_text,
            "success": True,
        }
    except Exception as e:
        return {
            "transcription": "",
            "enhanced": "",
            "success": False,
            "error": str(e),
        }


def _enhance_transcription(client, raw_text: str) -> str:
    """
    Use Gemini to clean up/enhance a raw transcription:
    fix grammar, add punctuation, remove filler words.
    """
    if not raw_text or len(raw_text.strip()) < 10:
        return raw_text

    try:
        config = types.GenerateContentConfig(
            temperature=0.3,
            max_output_tokens=4096,
            system_instruction=(
                "You are a text editor. Clean up the following transcribed speech: "
                "fix grammar, remove filler words (um, uh, like), add proper punctuation "
                "and paragraph breaks where appropriate. Keep the original meaning and "
                "tone intact. Do NOT add any commentary — return ONLY the cleaned text."
            ),
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=raw_text,
            config=config,
        )
        return response.text.strip()
    except Exception:
        # If enhancement fails, just return the raw text
        return raw_text
