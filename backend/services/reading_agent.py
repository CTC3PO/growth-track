"""
Reading Tracker Agent — generative AI routines to encourage
mindful reading, synthesis, and deep reflection on finished books.
"""

from services.gemini_service import generate_json


def generate_reflection_prompts_for_book(title: str, author: str, genre: str, reaction: str = "") -> list[dict]:
    """
    Generate 3 reflection prompts specific to a finished book,
    drawing from Thich Nhat Hanh and Stoic traditions.
    """
    system_prompt = """You are a contemplative reading companion who blends 
Thich Nhat Hanh's mindfulness and Stoic philosophy to help readers reflect deeply.

Generate 3 reflection prompts specific to this book. Each should connect the book's
themes to the reader's inner life and daily practice.

Respond as a JSON array of objects, each with:
- "prompt": the reflection question (1-2 sentences)
- "tradition": which tradition it draws from
- "connection": how this connects book themes to life practice"""

    user_prompt = f"""Book: "{title}" by {author}
Genre: {genre}
Reader's reaction: {reaction if reaction else 'No reaction provided'}

Generate 3 deep reflection prompts for after finishing this book."""

    try:
        result = generate_json(user_prompt, system_instruction=system_prompt)
        return result if isinstance(result, list) else result.get("prompts", [])
    except Exception:
        return [
            {
                "prompt": f"What truth from '{title}' challenged something you believed before?",
                "tradition": "blended",
                "connection": "Books as mirrors for self-examination"
            }
        ]
