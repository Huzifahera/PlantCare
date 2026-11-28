import base64
import json
import re
from django.conf import settings

from config.hf_client import HFServiceError, call_hf_chat


class VisionServiceError(HFServiceError):
    """Raised when the Vision AI provider is unconfigured, unreachable, or returns invalid data."""


PLANT_ANALYSIS_PROMPT = (
    "You are an expert botanist and plant pathologist. Analyze the provided plant or tree image "
    "(leaves, bark, fruit, flowers, or whole plant). "
    "Be scientifically honest: if the image is blurry, ambiguous, or shows symptoms that could have "
    "multiple root-level or environmental causes, explicitly note that uncertainty. "
    "Respond ONLY with a valid JSON object using this exact schema (no markdown fences or extra text):\n"
    "{\n"
    '  "plant_name": "Common Name (Scientific Name)",\n'
    '  "confidence": "92%",\n'
    '  "uncertainty_note": "Brief note on visual limitations or what cannot be confirmed from a photo alone.",\n'
    '  "health_status": "Concise status with emoji, e.g. Healthy & Thriving 🌿",\n'
    '  "health_score": 88,\n'
    '  "disease_name": "Healthy" or suspected condition,\n'
    '  "symptoms": "Visible leaf/stem symptoms observed in the photo.",\n'
    '  "possible_causes": "Likely environmental, watering, pest, or fungal causes.",\n'
    '  "severity": "low" | "moderate" | "high" | "critical" | "unknown",\n'
    '  "diagnosis": "2-3 sentence botanical & visual assessment.",\n'
    '  "qwen_advice": [\n'
    '    "Recommended action 1",\n'
    '    "Recommended action 2",\n'
    '    "Preventive care step 3"\n'
    "  ]\n"
    "}"
)


def _extract_json_payload(raw_text: str) -> dict:
    """Parse JSON from model output, stripping optional markdown code fences."""
    cleaned = raw_text.strip()
    fence_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", cleaned, re.DOTALL)
    if fence_match:
        cleaned = fence_match.group(1)
    else:
        brace_match = re.search(r"(\{.*\})", cleaned, re.DOTALL)
        if brace_match:
            cleaned = brace_match.group(1)

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise VisionServiceError("Vision AI returned non-JSON output.", status_code=502) from exc

    if not isinstance(data, dict) or not data.get("plant_name"):
        raise VisionServiceError(
            "Vision AI response is missing required plant identification fields.",
            status_code=502,
        )

    return data


def _normalize_result(data: dict, model: str) -> dict:
    """Ensure consistent field types, uncertainty notice, and defaults for the API response."""
    allowed_severities = {"low", "moderate", "high", "critical", "unknown"}
    severity = str(data.get("severity", "unknown")).lower()
    if severity not in allowed_severities:
        severity = "unknown"

    try:
        health_score = max(0, min(100, int(data.get("health_score", 85))))
    except (TypeError, ValueError):
        health_score = 85

    advice = data.get("qwen_advice") or []
    if not isinstance(advice, list):
        advice = [str(advice)]
    advice = [str(item) for item in advice if str(item).strip()][:5]

    default_uncertainty = (
        "Visual AI analysis is assistive only. Root health, soil pH, and microscopic pathogens "
        "cannot be confirmed from a photograph alone."
    )

    return {
        "plant_name": str(data["plant_name"]),
        "confidence": str(data.get("confidence", "Moderate")),
        "uncertainty_note": str(data.get("uncertainty_note") or default_uncertainty),
        "health_status": str(data.get("health_status", "Assessed 🌿")),
        "health_score": health_score,
        "disease_name": str(data.get("disease_name", "Unknown"))[:150],
        "symptoms": str(data.get("symptoms", "No specific visible lesions reported.")),
        "possible_causes": str(data.get("possible_causes", "Depends on soil moisture, light, and airflow.")),
        "severity": severity,
        "diagnosis": str(data.get("diagnosis", "Botanical analysis complete.")),
        "qwen_advice": advice,
        "model_version": model,
    }


def analyze_plant_image(image_file) -> dict:
    """Send an uploaded plant image to Hugging Face Vision AI and return structured results."""
    model = getattr(settings, "HF_VISION_MODEL", "Qwen/Qwen2.5-VL-7B-Instruct")

    image_file.seek(0)
    image_bytes = image_file.read()
    content_type = getattr(image_file, "content_type", None) or "image/jpeg"
    b64_image = base64.b64encode(image_bytes).decode("utf-8")
    data_uri = f"data:{content_type};base64,{b64_image}"

    messages = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": PLANT_ANALYSIS_PROMPT},
                {"type": "image_url", "image_url": {"url": data_uri}},
            ],
        }
    ]

    try:
        raw_content = call_hf_chat(
            model=model,
            messages=messages,
            max_tokens=700,
            temperature=0.2,
            timeout=45,
        )
    except HFServiceError as exc:
        raise VisionServiceError(str(exc), status_code=exc.status_code) from exc

    parsed = _extract_json_payload(raw_content)
    return _normalize_result(parsed, model)
