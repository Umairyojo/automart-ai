"""
Recommendation helpers: category affinity from UserHistory + co-purchase from OrderItem.
Lightweight scoring without extra ML libraries.
"""
from __future__ import annotations

from collections import Counter, defaultdict

from .extensions import db
from .models import Order, OrderItem, Product, User, UserHistory


def record_history(user_id: int | None, product_id: int | None, action_type: str, meta: str = "") -> None:
    """Append a user behavior row for recommendations."""
    if not user_id:
        return
    h = UserHistory(user_id=user_id, product_id=product_id, action_type=action_type, meta=meta or "")
    db.session.add(h)
    db.session.commit()


def get_recommended_product_ids(user: User | None, limit: int = 8) -> list[int]:
    """
    Return product IDs for 'You may also like':
    - Prefer categories the user viewed or purchased
    - Boost products that appear in orders with the user's past purchases
    """
    if not user:
        return _popular_fallback(limit)

    uid = user.id
    hist = (
        UserHistory.query.filter_by(user_id=uid)
        .order_by(UserHistory.created_at.desc())
        .limit(50)
        .all()
    )

    touched_product_ids: set[int] = set()
    cat_weights: Counter[str] = Counter()
    for h in hist:
        if not h.product_id:
            continue
        touched_product_ids.add(h.product_id)
        p = db.session.get(Product, h.product_id)
        if p:
            w = 3 if h.action_type == "purchase" else 2 if h.action_type == "view" else 1
            cat_weights[p.category] += w

    # Orders for this user
    order_ids = [o.id for o in Order.query.filter_by(user_id=uid).all()]
    my_purchase_pids = {
        oi.product_id for oi in OrderItem.query.filter(OrderItem.order_id.in_(order_ids)).all()
    }
    touched_product_ids |= my_purchase_pids

    # Co-purchase: other products in orders that include any product user bought
    co_scores: defaultdict[int, int] = defaultdict(int)
    if my_purchase_pids:
        shared_order_ids = [
            r[0]
            for r in db.session.query(OrderItem.order_id)
            .filter(OrderItem.product_id.in_(my_purchase_pids))
            .distinct()
        ]
        if shared_order_ids:
            for oi in OrderItem.query.filter(OrderItem.order_id.in_(shared_order_ids)).all():
                if oi.product_id not in my_purchase_pids:
                    co_scores[oi.product_id] += 1

    candidates: list[tuple[int, float]] = []
    for p in Product.query.filter(Product.stock > 0).all():
        if p.id in touched_product_ids:
            continue
        score = cat_weights.get(p.category, 0) * 1.0 + co_scores.get(p.id, 0) * 2.5
        if score > 0:
            candidates.append((p.id, score))

    candidates.sort(key=lambda x: -x[1])
    out = [c[0] for c in candidates[:limit]]

    if len(out) < limit:
        for pid in _popular_fallback(limit * 3):
            if pid not in out and pid not in touched_product_ids:
                out.append(pid)
            if len(out) >= limit:
                break
    return out[:limit]


def _popular_fallback(limit: int) -> list[int]:
    """In-stock products, newest first — cold start."""
    rows = (
        Product.query.filter(Product.stock > 0)
        .order_by(Product.created_at.desc())
        .limit(limit)
        .all()
    )
    return [p.id for p in rows]
