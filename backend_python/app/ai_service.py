"""
OpenAI integration: chatbot, text embeddings, and optional vision.
Designed for low-cost operation on free or limited API credits.
"""
from __future__ import annotations

import hashlib
import json
import math
import re
import time
from typing import Any

from flask import current_app

_client = None
_embed_cache: dict[str, tuple[float, list[float]]] = {}
_chat_cache: dict[str, tuple[float, str]] = {}
_chat_cooldown_until: float = 0.0
_embed_cooldown_until: float = 0.0


def _now() -> float:
    return time.time()


def _cache_get(cache: dict, key: str, ttl_seconds: int):
    row = cache.get(key)
    if not row:
        return None
    ts, value = row
    if (_now() - ts) > ttl_seconds:
        cache.pop(key, None)
        return None
    return value


def _cache_set(cache: dict, key: str, value, max_entries: int):
    cache[key] = (_now(), value)
    if len(cache) <= max_entries:
        return
    oldest_key = min(cache.keys(), key=lambda k: cache[k][0])
    cache.pop(oldest_key, None)


def _error_text(exc: Exception) -> str:
    return str(exc or "").strip().lower()


def _is_quota_error(exc: Exception) -> bool:
    text = _error_text(exc)
    if "insufficient_quota" in text:
        return True
    code = getattr(exc, "code", None)
    return str(code or "").strip().lower() == "insufficient_quota"


def _is_rate_limit_error(exc: Exception) -> bool:
    text = _error_text(exc)
    if "rate_limit" in text or "rate limit" in text:
        return True
    code = getattr(exc, "code", None)
    return str(code or "").strip().lower() in {"rate_limit_exceeded", "too_many_requests"}


def _get_client():
    global _client
    if _client is not None:
        return _client
    key = current_app.config.get("OPENAI_API_KEY", "")
    if not key or current_app.config.get("AI_DISABLED"):
        return None
    from openai import OpenAI

    _client = OpenAI(api_key=key)
    return _client


def ai_enabled() -> bool:
    return bool(_get_client())


def embed_text(text: str) -> list[float] | None:
    """
    Single text -> embedding vector.
    Uses in-memory cache to avoid repeated paid calls.
    """
    global _embed_cooldown_until
    if not bool(current_app.config.get("AI_EMBED_FOR_SMART_SEARCH", False)):
        return None
    if _embed_cooldown_until > _now():
        return None

    client = _get_client()
    clean = (text or "").strip()
    if not client or not clean:
        return None

    cache_key = hashlib.sha256(clean.lower().encode("utf-8")).hexdigest()
    cached = _cache_get(
        _embed_cache,
        cache_key,
        int(current_app.config.get("AI_EMBED_CACHE_SECONDS", 86400)),
    )
    if cached is not None:
        return cached

    try:
        r = client.embeddings.create(
            model=current_app.config.get("AI_EMBED_MODEL", "text-embedding-3-small"),
            input=clean[:5000],
        )
        vector = list(r.data[0].embedding)
        _cache_set(
            _embed_cache,
            cache_key,
            vector,
            int(current_app.config.get("AI_EMBED_CACHE_MAX_ENTRIES", 500)),
        )
        return vector
    except Exception as exc:
        if _is_quota_error(exc):
            cooldown = int(current_app.config.get("AI_CHAT_QUOTA_COOLDOWN_SECONDS", 1800))
            _embed_cooldown_until = max(_embed_cooldown_until, _now() + max(cooldown, 60))
            current_app.logger.warning(
                "OpenAI embedding quota exhausted; disabling embeddings for %s seconds",
                cooldown,
            )
            return None
        if _is_rate_limit_error(exc):
            cooldown = int(current_app.config.get("AI_CHAT_RATE_LIMIT_COOLDOWN_SECONDS", 90))
            _embed_cooldown_until = max(_embed_cooldown_until, _now() + max(cooldown, 30))
            current_app.logger.warning(
                "OpenAI embedding rate-limited; disabling embeddings for %s seconds",
                cooldown,
            )
            return None
        current_app.logger.exception("embed_text failed")
        return None


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


def parse_embedding_json(s: str | None) -> list[float] | None:
    if not s:
        return None
    try:
        v = json.loads(s)
        if isinstance(v, list) and v and isinstance(v[0], (int, float)):
            return [float(x) for x in v]
    except (json.JSONDecodeError, TypeError):
        pass
    return None


def chatbot_reply(
    user_message: str,
    conversation: list[dict[str, str]],
    catalog_snippet: str,
    user_language_hint: str | None = None,
) -> str:
    """
    Customer support bot for spare parts.
    Returns short, practical answers to minimize token usage and spend.
    """
    client = _get_client()
    lang = user_language_hint or "Match the user's language."
    clean_msg = (user_message or "").strip()
    global _chat_cooldown_until

    if _chat_cooldown_until > _now():
        return _fallback_chat_reply(clean_msg, catalog_snippet)

    cache_key = hashlib.sha256(
        f"{lang}|{clean_msg.lower()}|{json.dumps(conversation[-4:], sort_keys=True)}".encode("utf-8")
    ).hexdigest()
    cached = _cache_get(
        _chat_cache,
        cache_key,
        int(current_app.config.get("AI_CHAT_CACHE_SECONDS", 900)),
    )
    if cached is not None:
        return cached

    system = f"""You are AutoMart AI for spare-parts shopping.
Rules:
1) Keep responses concise: maximum 2 short lines.
2) Focus only on spare parts, compatibility, and purchase guidance.
3) If vehicle details are missing, ask for company, model, year.
4) If recommending products, mention up to 3 likely part names with one reason each.
5) Prefer practical guidance over generic marketing text.
6) Currency and context are India-focused (INR).
7) {lang}

Catalog summary:
{catalog_snippet}
"""
    messages = [{"role": "system", "content": system}]
    for m in conversation[-6:]:
        role = m.get("role", "user")
        if role not in ("user", "assistant"):
            role = "user"
        messages.append({"role": role, "content": (m.get("content", "") or "")[:1000]})
    messages.append({"role": "user", "content": clean_msg[:1000]})

    if not client:
        return _fallback_chat_reply(clean_msg, catalog_snippet)

    try:
        r = client.chat.completions.create(
            model=current_app.config.get("AI_CHAT_MODEL", "gpt-4o-mini"),
            messages=messages,
            temperature=float(current_app.config.get("AI_CHAT_TEMPERATURE", 0.2)),
            max_tokens=int(current_app.config.get("AI_CHAT_MAX_TOKENS", 220)),
        )
        content = (r.choices[0].message.content or "").strip()
        if not content:
            content = _fallback_chat_reply(clean_msg, catalog_snippet)
        _cache_set(
            _chat_cache,
            cache_key,
            content,
            int(current_app.config.get("AI_CHAT_CACHE_MAX_ENTRIES", 300)),
        )
        return content
    except Exception as exc:
        if _is_quota_error(exc):
            cooldown = int(current_app.config.get("AI_CHAT_QUOTA_COOLDOWN_SECONDS", 1800))
            _chat_cooldown_until = max(_chat_cooldown_until, _now() + max(cooldown, 60))
            current_app.logger.warning(
                "OpenAI quota exhausted; using fallback replies for %s seconds", cooldown
            )
            return _fallback_chat_reply(clean_msg, catalog_snippet)
        if _is_rate_limit_error(exc):
            cooldown = int(current_app.config.get("AI_CHAT_RATE_LIMIT_COOLDOWN_SECONDS", 90))
            _chat_cooldown_until = max(_chat_cooldown_until, _now() + max(cooldown, 30))
            current_app.logger.warning(
                "OpenAI rate-limited; using fallback replies for %s seconds", cooldown
            )
            return _fallback_chat_reply(clean_msg, catalog_snippet)
        current_app.logger.exception("chatbot_reply failed")
        return _fallback_chat_reply(clean_msg, catalog_snippet)


def _fallback_chat_reply(user_message: str, catalog_snippet: str) -> str:
    low = user_message.lower()
    if "brake" in low:
        return (
            "For brake parts, share vehicle company, model, and year for exact fitment. "
            "Then I can suggest compatible pads/discs in 1-2 options."
        )
    if any(k in low for k in ("engine", "oil", "filter", "service")):
        return (
            "For engine/service parts, tell your vehicle details and usage pattern (city/highway). "
            "I will suggest the right oil/filter type and quantity."
        )
    return (
        "Tell me your vehicle company, model, and year. "
        "I will suggest compatible spare parts and quick buy options."
    )


def describe_part_image(image_path: str, mime: str = "image/jpeg") -> str | None:
    """Use a compact vision prompt for optional image-based part search."""
    client = _get_client()
    if not client:
        return None
    try:
        import base64

        with open(image_path, "rb") as f:
            b64 = base64.standard_b64encode(f.read()).decode("utf-8")
        r = client.chat.completions.create(
            model=current_app.config.get("AI_CHAT_MODEL", "gpt-4o-mini"),
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "Identify the likely automotive spare part and category "
                                "(engine/brake/electrical/accessory) in one short paragraph."
                            ),
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:{mime};base64,{b64}"},
                        },
                    ],
                }
            ],
            max_tokens=180,
        )
        return (r.choices[0].message.content or "").strip()
    except Exception:
        current_app.logger.exception("describe_part_image failed")
        return None


def keyword_search_score(query: str, product: Any) -> float:
    """Keyword score used when embeddings are unavailable or disabled."""
    q = re.findall(r"\w+", (query or "").lower())
    if not q:
        return 0.0
    brand = getattr(product, "brand", "")
    product_type = getattr(product, "product_type", "")
    blob = (
        f"{product.name} {product.description} {product.category} "
        f"{brand} {product_type} {product.vehicle_compatibility}"
    ).lower()
    words = set(re.findall(r"\w+", blob))
    hits = sum(1 for w in q if w in words)
    if any(x in (query or "").lower() for x in ("cheap", "budget", "low price", "affordable")):
        try:
            price = float(product.price)
            if price < 1200:
                hits += 2
            elif price < 3000:
                hits += 1
        except (TypeError, ValueError):
            pass
    return float(hits)
