from django.conf import settings

from config.hf_client import HFServiceError, call_hf_chat


class ChatbotServiceError(HFServiceError):
    """Raised when the AI Botanist language model fails or is unconfigured."""


BOTANIST_SYSTEM_PROMPT = (
    "You are PlantCare AI Botanist, a knowledgeable, practical, and honest gardening assistant. "
    "Provide clear, actionable care advice tailored to home gardeners and small-garden growers.\n"
    "Follow these rules strictly:\n"
    "- Never invent scientific facts or claim 100% certainty when diagnosing plant issues without a physical inspection.\n"
    "- Distinguish general botanical guidance from image-based observations.\n"
    "- Ask 1-2 clarifying questions when critical context (light, watering frequency, pot drainage, climate) is missing.\n"
    "- Recommend consulting a local horticulturist or extension office for severe, spreading, or persistent tree/crop diseases.\n"
    "- Keep responses concise, structured with bullet points, and easy to follow."
)


def ask_botanist(message: str, history: list | None = None, plant_context: str | None = None) -> dict:
    """Send a user gardening question to the configured Hugging Face LLM and return the reply."""
    model = getattr(settings, "HF_CHAT_MODEL", "Qwen/Qwen2.5-72B-Instruct")

    system_content = BOTANIST_SYSTEM_PROMPT
    if plant_context:
        system_content += f"\n\nContext about the user's selected plant: {plant_context}"

    messages = [{"role": "system", "content": system_content}]

    if history:
        for turn in history[-8:]:
            role = turn.get("role")
            content = str(turn.get("content", "")).strip()
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content[:1500]})

    messages.append({"role": "user", "content": message.strip()})

    try:
        reply = call_hf_chat(
            model=model,
            messages=messages,
            max_tokens=700,
            temperature=0.4,
            timeout=40,
        )
    except HFServiceError as exc:
        raise ChatbotServiceError(str(exc), status_code=exc.status_code) from exc

    return {
        "reply": reply.strip(),
        "model": model,
    }

