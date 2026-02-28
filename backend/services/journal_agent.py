"""
Journaling Prompt Engine — generates context-aware journal prompts
rooted in Thich Nhat Hanh's mindfulness teachings and Stoic philosophy.
"""

from services.gemini_service import generate_json

# ─── Prompt Libraries ────────────────────────────────────────────────

THICH_NHAT_HANH_THEMES = {
    "mindful_breathing": [
        "Breathing in, I know I am breathing in. Breathing out, I know I am breathing out.",
        "Feelings come and go like clouds in a windy sky. Conscious breathing is my anchor.",
    ],
    "present_moment": [
        "Life is available only in the present moment.",
        "The present moment is filled with joy and happiness. If you are attentive, you will see it.",
    ],
    "interbeing": [
        "We are here to awaken from the illusion of our separateness.",
        "You carry Mother Earth within you. She is not outside of you.",
    ],
    "compassion": [
        "Compassion is a verb.",
        "Understanding someone's suffering is the best gift you can give another person.",
    ],
    "impermanence": [
        "It is not impermanence that makes us suffer. What makes us suffer is wanting things to be permanent.",
        "Thanks to impermanence, everything is possible.",
    ],
    "walking_meditation": [
        "Walk as if you are kissing the Earth with your feet.",
        "Every step we take can bring us closer to our true home.",
    ],
}

STOIC_THEMES = {
    "control": [
        "Some things are within our power, while others are not. — Epictetus",
        "You have power over your mind — not outside events. Realize this, and you will find strength. — Marcus Aurelius",
    ],
    "memento_mori": [
        "Let us prepare our minds as if we'd come to the very end of life. — Seneca",
        "Think of yourself as dead. You have lived your life. Now, take what's left and live it properly. — Marcus Aurelius",
    ],
    "obstacle_as_way": [
        "The impediment to action advances action. What stands in the way becomes the way. — Marcus Aurelius",
        "Difficulties strengthen the mind, as labor does the body. — Seneca",
    ],
    "virtue": [
        "Waste no more time arguing about what a good person should be. Be one. — Marcus Aurelius",
        "No person is free who is not master of themselves. — Epictetus",
    ],
    "amor_fati": [
        "Do not seek for things to happen the way you want them to; rather, wish that what happens happen the way it happens. — Epictetus",
        "Accept the things to which fate binds you, and love the people with whom fate brings you together. — Marcus Aurelius",
    ],
    "journaling": [
        "Begin at once to live, and count each separate day as a separate life. — Seneca",
        "When you arise in the morning, think of what a precious privilege it is to be alive. — Marcus Aurelius",
    ],
}


def generate_journal_prompt(
    tradition: str = "blended",
    context: dict = None
) -> dict:
    """
    Generate a context-aware journal prompt.

    Args:
        tradition: 'thich_nhat_hanh', 'stoicism', or 'blended'
        context: dict with keys like 'energy', 'alignment', 'recent_run_km',
                 'books_reading', 'is_traveling', 'city', 'mood', 'day_of_week'
    """
    context = context or {}

    # Build context description for the AI
    context_parts = []
    if context.get("energy"):
        context_parts.append(f"Energy level: {context['energy']}/10")
    if context.get("alignment"):
        context_parts.append(f"Alignment with values: {context['alignment']}/10")
    if context.get("is_traveling"):
        context_parts.append(f"Currently traveling in: {context.get('city', 'another city')}")
    if context.get("mood"):
        context_parts.append(f"Current mood: {context['mood']}/10")
    if context.get("day_of_week"):
        context_parts.append(f"Day: {context['day_of_week']}")

    context_str = "\n".join(context_parts) if context_parts else "No specific context available."

    # Choose tradition instruction
    if tradition == "thich_nhat_hanh":
        tradition_instruction = """You are a mindfulness guide deeply rooted in Thich Nhat Hanh's teachings.
Your prompts should incorporate high-level principles: mindful breathing, present moment awareness, 
interbeing, compassion, impermanence, and walking meditation. Focus on profound existential reflection, 
not daily metrics."""
    elif tradition == "stoicism":
        tradition_instruction = """You are a Stoic philosophy guide drawing from Marcus Aurelius, Epictetus, and Seneca.
Your prompts should incorporate high-level principles: dichotomy of control, memento mori, obstacle is the way,
virtue ethics, amor fati. Focus on existential strength and psychological resilience, not daily metrics."""
    else:  # blended
        tradition_instruction = """You are a contemplative guide blending Thich Nhat Hanh's mindfulness with Stoic philosophy.
Weave high-level themes naturally (present moment, interbeing, dichotomy of control, memento mori).
Focus on broad, profound existential concepts rather than addressing specific daily physical habits or routines."""

    system_prompt = f"""{tradition_instruction}

Generate a single journal prompt that is deeply personal, context-aware, and invites genuine reflection.
The prompt should be 2-4 sentences. Include a relevant quote from the tradition.

Respond in JSON with these fields:
- "prompt": the journal prompt text (2-4 sentences)
- "tradition": which tradition this draws from ("thich_nhat_hanh", "stoicism", or "blended")
- "context_reason": one sentence explaining why this prompt was chosen for this moment
- "related_quote": a relevant quote from the tradition
- "quote_source": who said/wrote the quote"""

    user_prompt = f"""Generate a journal prompt for someone with this current context:

{context_str}

Make the prompt specific to their situation, not generic. It should feel like it was written
just for them, right now."""

    try:
        result = generate_json(user_prompt, system_instruction=system_prompt)
        return result
    except Exception as e:
        # Fallback to a static prompt if AI fails
        return {
            "prompt": "Take three conscious breaths. With each exhale, release one thing you're holding onto. What remains when you let go?",
            "tradition": "blended",
            "context_reason": "A grounding prompt for any moment.",
            "related_quote": "Feelings come and go like clouds in a windy sky. Conscious breathing is my anchor.",
            "quote_source": "Thich Nhat Hanh",
            "error": str(e),
        }



