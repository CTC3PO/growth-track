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
        context_parts.append(f"Alignment: {context['alignment']}/10")
    if context.get("sleep_hours"):
        context_parts.append(f"Sleep: {context['sleep_hours']} hours")
    if context.get("steps"):
        context_parts.append(f"Steps: {context['steps']}")
    if context.get("mood"):
        context_parts.append(f"Mood: {context['mood']}/10")
    if context.get("recent_social_connection"):
        context_parts.append(f"Social: Connected with {context['recent_social_connection']} ({context.get('recent_social_activity', 'socializing')})")
    if context.get("recent_work_hours"):
        context_parts.append(f"Work: {context['recent_work_hours']} hours of deep work")
    if context.get("books_reading"):
        context_parts.append(f"Reading: {context['books_reading']}")
    if context.get("recent_run_km"):
        context_parts.append(f"Running: {context['recent_run_km']} km")
    if context.get("last_journal_themes"):
        context_parts.append(f"Previous journal themes: {', '.join(context['last_journal_themes'])}")
    if context.get("journal_gap_days") is not None:
        context_parts.append(f"Days since last entry: {context['journal_gap_days']}")
    if context.get("day_of_week"):
        context_parts.append(f"Today is {context['day_of_week']}")

    context_str = "\n".join(context_parts) if context_parts else "No specific context available."

    # Build tradition-specific instructions
    if tradition == "thich_nhat_hanh":
        tradition_instruction = """You are a mindfulness guide in the Plum Village tradition (Thich Nhat Hanh). 
Focus on mindful breathing, present moment awareness, interbeing, and compassion. 
Your tone should be soft, poetic, and deeply present."""
    elif tradition == "stoicism":
        tradition_instruction = """You are a Stoic guide (Aurelius, Epictetus, Seneca). 
Focus on the dichotomy of control, memento mori, virtue, and resilience. 
Your tone should be clear, strong, and logically grounding."""
    else:  # blended
        tradition_instruction = """You are a contemplative guide blending Plum Village mindfulness with Stoic philosophy. 
Weave together present-moment awareness with the inner strength of virtue. 
Balance soft compassion with rigorous internal clarity."""

    system_instruction = f"""{tradition_instruction}

Generate a single, profound journal prompt (2-4 sentences).

CRITICAL CONSTRAINTS:
1. THEMATIC FOCUS: Always center the prompt around one of these pillars:
   - BODY (Vitality, movement, sleep, physical presence)
   - MIND (Deep work, intellectual pursuit, clarity, focus)
   - SPIRIT (Inner peace, alignment, meditation, interbeing)
   - CHECKLIST GOALS (Long-term growth, consistency, becoming who you want to be)

2. AVOID MUNDANE SPECIFICS: Do NOT mention specific names of shops, brands, or trivial daily logistics (e.g., avoid "Bach Hoa Xanh", "supermarket", "expense category"). Instead, elevate these to themes like "nourishment", "intentional consumption", or "stewardship of resources".

3. DEPTH OVER DATA: Use the provided context as a silent guide to the user's state, but do not recite the data back to them.

4. BLEND TEACHINGS: If 'blended', naturally combine Stoic resilience with Thich Nhat Hanh's tenderness.

Respond in JSON with these fields:
- "prompt": the journal prompt text (2-4 sentences)
- "tradition": "thich_nhat_hanh", "stoicism", or "blended"
- "context_reason": one sentence explaining the thematic link chosen
- "related_quote": a relevant quote from the chosen tradition
- "quote_source": author of the quote"""

    # Add monthly checklist goals as static context reference
    checklist_goals = """
Monthly Life Integration Checklist Items:
- Body: 9k steps before 9 AM, Sleep 10:30 PM - 6:00 AM, Running training on schedule, Gym/Nutrition.
- Mind: Deep work block (3h+), Reading progress, Course study (AWS/ML/DSA), Journaling.
- Spirit: Morning meditation (6:00-6:30), Alignment reflection, Gratitude, Sangha/Community.
- Social: Quality time with Vietnam family, friends, Therapy, Networking.
- Career: Financial summary review, job progress, professional development.
"""

    user_prompt = f"""Generate a profound prompt for a user with this current state:

{context_str}

REFERENCE CHECKLIST GOALS:
{checklist_goals}

Elevate their current context into a reflection on Body, Mind, Spirit, or their long-term growth. Ensure the prompt feels broad and timeless, yet resonant with their current energy and alignment."""

    try:
        result = generate_json(user_prompt, system_instruction=system_instruction)
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



