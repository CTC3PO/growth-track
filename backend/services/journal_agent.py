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
    context: dict = None,
    mode: str = "daily"
) -> dict:
    """
    Generate a context-aware journal prompt.

    Args:
        tradition: 'thich_nhat_hanh', 'stoicism', or 'blended'
        context: dict with daily or weekly telemetry data
        mode: 'daily' for standard growth prompts, 'mix' for creative pattern-based remixing
    """
    context = context or {}

    # Build context description for the AI
    context_parts = []
    
    # Daily context (always useful)
    if context.get("energy"):
        context_parts.append(f"Daily Energy: {context['energy']}/10")
    if context.get("alignment"):
        context_parts.append(f"Daily Alignment: {context['alignment']}/10")
    
    # Weekly Patterns (for Mix mode)
    if mode == "mix" and context.get("weekly_stats"):
        w = context["weekly_stats"]
        context_parts.append(f"WEEKLY PATTERN: Run {w['total_km']}km, Avg {w['avg_sleep']}h sleep, {w['social_count']} social connections, {w['work_hours']}h deep work.")
    
    # Standard Daily Telemetry
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
    if context.get("recent_run_km"):
        context_parts.append(f"Running: {context['recent_run_km']} km")
    if context.get("last_journal_themes"):
        context_parts.append(f"Previous journal themes: {', '.join(context['last_journal_themes'])}")

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

    if mode == "mix":
        mode_instruction = """CREATIVE MIX MODE:
1. You will be provided with 'Seed Prompts' (classic journal prompts).
2. You must REMIX these concepts with the user's WEEKLY PATTERN insights.
3. Don't just pick one; synthesize a new, creative reflection that bridges a timeless philosophical question with their actual data trends from the past week.
4. If they had high social but low sleep, or high work but low reflection, bridge that gap creatively."""
    else:
        mode_instruction = """DAILY REFLECTION MODE: Focus on the current day's energy and telemetry. Generate a profound prompt (2-4 sentences)."""

    system_instruction = f"""{tradition_instruction}

{mode_instruction}

CRITICAL CONSTRAINTS:
1. THEMATIC FOCUS: Always center the prompt around one of these pillars: BODY, MIND, SPIRIT, or CHECKLIST GOALS.
2. AVOID MUNDANE SPECIFICS: Do NOT recite data back. Instead of "You slept 6 hours", say "In your current season of shorter rest...".
3. DEPTH OVER DATA: Elevate the patterns into existential or reflective inquiries.

Respond in JSON with these fields:
- "prompt": the journal prompt text (2-4 sentences)
- "tradition": "thich_nhat_hanh", "stoicism", or "blended"
- "context_reason": one sentence explaining the pattern or seed concept remixed
- "related_quote": a relevant quote
- "quote_source": author"""

    # Add monthly checklist goals as static context reference
    checklist_goals = """
Monthly Life Integration Checklist Items:
- Body: 9k steps before 9 AM, Sleep 10:30 PM - 6:00 AM, Running training on schedule.
- Mind: Deep work block (3h+), Reading, Course study, Journaling.
- Spirit: Morning meditation (6:00-6:30), Alignment, Gratitude.
"""

    seed_str = f"\nSEED PROMPTS TO REMIX:\n" + "\n".join(context.get("seed_prompts", [])) if context.get("seed_prompts") else ""

    user_prompt = f"""Generate a profound prompt for a user with this current state:

{context_str}
{seed_str}

REFERENCE CHECKLIST GOALS:
{checklist_goals}

Elevate their weekly patterns and seed concepts into a creative, hybrid reflection."""

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



