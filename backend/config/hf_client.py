import time
import requests
from django.conf import settings


class HFServiceError(Exception):
    """Raised when Hugging Face inference is unconfigured, rate-limited, unreachable, or invalid."""

    def __init__(self, message: str, status_code: int = 503):
        super().__init__(message)
        self.status_code = status_code


def call_hf_chat(
    *,
    model: str,
    messages: list,
    max_tokens: int = 700,
    temperature: float = 0.3,
    timeout: int = 45,
    max_retries: int = 2,
) -> str:
    """Send a chat completion request to Hugging Face Inference Providers with retry and safe errors."""
    api_url = getattr(settings, "HF_ROUTER_URL", "https://router.huggingface.co/v1/chat/completions")
    api_key = getattr(settings, "HF_TOKEN", "")

    is_local = "localhost" in api_url or "127.0.0.1" in api_url
    if not api_url or (not api_key and not is_local):
        raise HFServiceError(
            "Hugging Face AI is not configured. Set HF_TOKEN in backend/.env to enable live AI.",
            status_code=503,
        )

    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }

    last_error = None
    for attempt in range(max_retries + 1):
        try:
            response = requests.post(api_url, headers=headers, json=payload, timeout=timeout)

            if response.status_code in (429, 503) and attempt < max_retries:
                time.sleep(1.5 * (attempt + 1))
                continue

            if response.status_code >= 400:
                err_detail = ""
                try:
                    err_json = response.json()
                    if isinstance(err_json, dict):
                        err_obj = err_json.get("error")
                        if isinstance(err_obj, dict):
                            err_detail = err_obj.get("message") or str(err_obj)
                        elif isinstance(err_obj, str):
                            err_detail = err_obj
                        elif "message" in err_json:
                            err_detail = err_json["message"]
                        elif "detail" in err_json:
                            err_detail = err_json["detail"]
                except Exception:
                    pass

                if response.status_code == 401:
                    msg = "Hugging Face authentication failed. Please check HF_TOKEN in backend/.env."
                    if err_detail:
                        msg += f" ({err_detail})"
                    raise HFServiceError(msg, status_code=503)
                if response.status_code == 402:
                    raise HFServiceError(
                        "Hugging Face inference quota reached. Please try again later or configure a token with available usage.",
                        status_code=429,
                    )
                if response.status_code == 429:
                    raise HFServiceError(
                        "Hugging Face rate limit reached. Please wait a moment and try again.",
                        status_code=429,
                    )
                if response.status_code in (400, 404, 422):
                    msg = f"Hugging Face inference error (HTTP {response.status_code})"
                    if err_detail:
                        msg += f": {err_detail}"
                    raise HFServiceError(msg, status_code=502)

                response.raise_for_status()

            body = response.json()
            raw_content = body["choices"][0]["message"]["content"]
            if isinstance(raw_content, list):
                content = "".join(
                    [part.get("text", "") if isinstance(part, dict) else str(part) for part in raw_content]
                )
            else:
                content = str(raw_content or "")

            if not content.strip():
                raise HFServiceError("AI model returned an empty response.", status_code=502)
            return content.strip()

        except HFServiceError:
            raise
        except (requests.Timeout, requests.ConnectionError) as exc:
            last_error = exc
            if attempt < max_retries:
                time.sleep(1.0 * (attempt + 1))
                continue
            raise HFServiceError(
                "Could not reach Hugging Face Inference service (network timeout). Please try again.",
                status_code=504,
            ) from exc
        except requests.HTTPError as exc:
            raise HFServiceError(
                f"Hugging Face Inference returned HTTP {response.status_code}.",
                status_code=502,
            ) from exc
        except (ValueError, KeyError, IndexError, TypeError) as exc:
            raise HFServiceError(
                "Unexpected response format from Hugging Face Inference.",
                status_code=502,
            ) from exc

    raise HFServiceError(f"Hugging Face Inference failed: {last_error}", status_code=503)

