"""
Transcription Service — uses Gemini 2.0 Flash multimodal to transcribe
audio recordings into text for the journal entry feature.
"""

import base64
from services.gemini_service import get_client
from google.genai import types


def transcribe_audio(audio_bytes: bytes, mime_type: str = "audio/webm") -> dict:
    """
    Transcribe and enhance audio in a single pass using Gemini multimodal.
    """
    client = get_client()

    # Encode audio as base64 for inline data
    audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

    # Build multimodal content: audio + combined instruction
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
                    text="Transcribe this audio recording. Clean up the speech as you go: "
                         "fix grammar, remove filler words (um, uh, like), add proper punctuation "
                         "and paragraph breaks. Return ONLY the cleaned transcribed text, nothing else."
                ),
            ]
        )
    ]

    config = types.GenerateContentConfig(
        temperature=0.1,
        max_output_tokens=4096,
    )

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=contents,
            config=config,
        )
        text = response.text.strip()

        return {
            "transcription": text,
            "enhanced": text, # Same text now as it's done in one pass
            "success": True,
        }
    except Exception as e:
        return {
            "transcription": "",
            "enhanced": "",
            "success": False,
            "error": str(e),
        }



