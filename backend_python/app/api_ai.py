"""
AI endpoints: chatbot, smart search, recommendations, optional image search.
Built with rate limiting and low-cost defaults for free-tier API usage.
"""
from __future__ import annotations

import os
import time
import uuid
from collections import defaultdict, deque

from flask import Blueprint, current_app, jsonify, request
from flask_login import current_user
from werkzeug.utils import secure_filename

from . import ai_service
from .extensions import db
from .models import Product, Vehicle
from .recommendations import get_recommended_product_ids, record_history

bp = Blueprint("api_ai", __name__, url_prefix="/api/ai")

_chat_rate_buckets: dict[str, deque[float]] = defaultdict(deque)


def _catalog_snippet() -> str:
    lines = []
    for p in Product.query.order_by(Product.category, Product.name).limit(25).all():
        lines.append(
            f"- [{p.category}] {p.name} (INR {float(p.price):.2f}): "
            f"{p.description[:90]}... Fits: {p.vehicle_compatibility[:70]}"
        )
    return "\n".join(lines)


def _client_ip() -> str:
    forwarded = (request.headers.get("X-Forwarded-For") or "").strip()
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote_addr or "unknown"


def _chat_rate_limited(ip: str) -> bool:
    limit = int(current_app.config.get("AI_CHAT_RATE_LIMIT_PER_10_MIN", 25))
    window_seconds = 10 * 60
    now = time.time()
    bucket = _chat_rate_buckets[ip]
    while bucket and (now - bucket[0]) > window_seconds:
        bucket.popleft()
    if len(bucket) >= limit:
        return True
    bucket.append(now)
    return False


def _extract_vehicle_hints(query: str) -> tuple[list[str], list[str]]:
    low = (query or "").lower()
    if not low:
        return [], []

    companies: list[str] = []
    models: list[str] = []
    for row in Vehicle.query.with_entities(Vehicle.company, Vehicle.model).all():
        company = (row[0] or "").strip().lower()
        model = (row[1] or "").strip().lower()
        if company and company in low and company not in companies:
            companies.append(company)
        if model and model in low and model not in models:
            models.append(model)
    return companies, models


@bp.route("/chat", methods=["POST"])
def chat():
    """
    Chatbot endpoint.
    Returns text reply + suggested products suitable for cart flow.
    """
    data = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()
    history = data.get("history") or []
    lang = (data.get("language") or "").strip() or None
    if not message:
        return jsonify({"error": "message required"}), 400

    ip = _client_ip()
    if _chat_rate_limited(ip):
        return jsonify({"error": "chat rate limit exceeded, please wait a minute"}), 429

    snippet = _catalog_snippet()
    reply = ai_service.chatbot_reply(message, history, snippet, user_language_hint=lang)

    # Keep chat suggestions cheap: keyword + compatibility boosts, no embeddings by default.
    suggested = _rank_products_by_query(message, limit=6, use_embeddings=False)
    if current_user.is_authenticated:
        for item in suggested:
            record_history(current_user.id, item["id"], "search_click", meta=message[:200])

    return jsonify({"reply": reply, "suggested_products": suggested})


@bp.route("/smart-search", methods=["POST"])
def smart_search():
    """
    Natural-language product search.
    Uses embeddings only when enabled by configuration.
    """
    data = request.get_json(silent=True) or {}
    query = (data.get("query") or "").strip()
    if not query:
        return jsonify({"error": "query required"}), 400

    use_embeddings = bool(current_app.config.get("AI_EMBED_FOR_SMART_SEARCH", True))
    ranked = _rank_products_by_query(query, limit=20, use_embeddings=use_embeddings)
    return jsonify({"query": query, "products": ranked})


@bp.route("/recommendations", methods=["GET"])
def recommendations():
    """Personalized 'You may also like' using history + orders."""
    user = current_user if current_user.is_authenticated else None
    ids = get_recommended_product_ids(user, limit=8)
    products = []
    for pid in ids:
        p = db.session.get(Product, pid)
        if p and p.stock > 0:
            products.append(p.to_dict())
    return jsonify({"products": products})


@bp.route("/image-search", methods=["POST"])
def image_search():
    """Optional image upload flow -> description -> ranked products."""
    if "file" not in request.files:
        return jsonify({"error": "file field required"}), 400
    f = request.files["file"]
    if not f or not f.filename:
        return jsonify({"error": "empty file"}), 400

    ext = (os.path.splitext(f.filename)[1] or ".jpg").lower()
    if ext not in (".jpg", ".jpeg", ".png", ".webp"):
        return jsonify({"error": "use jpg, png, or webp"}), 400

    name = secure_filename(f.filename) or "upload"
    uid = uuid.uuid4().hex[:12]
    path = current_app.config["UPLOAD_FOLDER"] / f"{uid}_{name}"
    f.save(path)

    mime = "image/jpeg"
    if ext == ".png":
        mime = "image/png"
    elif ext == ".webp":
        mime = "image/webp"

    description = ai_service.describe_part_image(str(path), mime=mime)
    if not description:
        description = f"automotive spare part image {name}"

    ranked = _rank_products_by_query(description, limit=10, use_embeddings=False)
    try:
        os.remove(path)
    except OSError:
        pass

    return jsonify({"description": description, "products": ranked})


def _rank_products_by_query(query: str, limit: int, use_embeddings: bool = True) -> list[dict]:
    """Combine optional embedding similarity with keyword + compatibility scoring."""
    products = Product.query.filter(Product.stock > 0).all()
    qvec = ai_service.embed_text(query) if use_embeddings else None
    companies, models = _extract_vehicle_hints(query)
    qlow = (query or "").lower()

    scored: list[tuple[float, Product]] = []
    for p in products:
        emb = ai_service.parse_embedding_json(p.embedding_json)
        sim = ai_service.cosine_similarity(qvec, emb) if (qvec and emb) else 0.0
        kw = ai_service.keyword_search_score(query, p)
        boost = 0.0

        compat_blob = (p.vehicle_compatibility or "").lower()
        brand_blob = (p.brand or "").lower()
        for company in companies:
            if company in compat_blob:
                boost += 3.0
            if company in brand_blob:
                boost += 2.0
        for model in models:
            if model in compat_blob:
                boost += 3.5

        if "universal" in qlow and p.product_type == "universal":
            boost += 1.5
        if "branded" in qlow and p.product_type == "companyBranded":
            boost += 1.5

        score = (sim * 2.8) + (kw * 0.8) + boost
        scored.append((score, p))

    scored.sort(key=lambda x: (-x[0], x[1].name))
    ranked = [p.to_dict() for _, p in scored[:limit]]
    return ranked
