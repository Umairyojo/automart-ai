"""
Products, session cart, checkout, and history tracking for recommendations.
"""
import hashlib
import hmac
import time
from decimal import Decimal, ROUND_HALF_UP

import requests
from flask import Blueprint, current_app, jsonify, request, session
from flask_login import current_user, login_required

from .extensions import db
from .models import (
    CompatibilityMapping,
    Coupon,
    Order,
    OrderItem,
    OrderMeta,
    ProductBrand,
    Product,
    ProductCategory,
    Vehicle,
)
from .recommendations import record_history

bp = Blueprint("api_shop", __name__, url_prefix="/api")

GST_RATE = Decimal("0.18")
SHIPPING_CHARGE = Decimal("149.00")
PAYMENT_METHODS = {"cod", "upi", "card"}
PAYMENT_STATUSES = {"success", "failed", "pending"}
PAYMENT_GATEWAYS = {"demo", "razorpay"}
CANCELABLE_STATUSES = {"pending", "confirmed", "processing", "payment_pending"}
RAZORPAY_ORDER_ENDPOINT = "https://api.razorpay.com/v1/orders"


def _cart() -> dict[str, int]:
    raw = session.get("cart") or {}
    out: dict[str, int] = {}
    for k, v in raw.items():
        try:
            q = int(v)
            if q > 0:
                out[str(k)] = q
        except (TypeError, ValueError):
            continue
    return out


def _set_cart(c: dict[str, int]) -> None:
    session["cart"] = c
    session.modified = True


def _money(value: Decimal) -> Decimal:
    return Decimal(str(value or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _razorpay_enabled() -> bool:
    key_id = str(current_app.config.get("RAZORPAY_KEY_ID") or "").strip()
    key_secret = str(current_app.config.get("RAZORPAY_KEY_SECRET") or "").strip()
    return bool(key_id and key_secret)


def _razorpay_currency() -> str:
    return str(current_app.config.get("RAZORPAY_CURRENCY") or "INR").strip().upper() or "INR"


def _summary_total_to_paise(total: Decimal) -> int:
    return int((_money(total) * Decimal("100")).to_integral_value(rounding=ROUND_HALF_UP))


def _create_razorpay_order(total: Decimal, receipt: str) -> dict:
    key_id = str(current_app.config.get("RAZORPAY_KEY_ID") or "").strip()
    key_secret = str(current_app.config.get("RAZORPAY_KEY_SECRET") or "").strip()
    payload = {
        "amount": _summary_total_to_paise(total),
        "currency": _razorpay_currency(),
        "receipt": receipt[:40],
        "payment_capture": 1,
    }
    try:
        res = requests.post(
            RAZORPAY_ORDER_ENDPOINT,
            auth=(key_id, key_secret),
            json=payload,
            timeout=20,
        )
    except requests.RequestException as exc:
        raise RuntimeError("payment gateway unreachable") from exc

    if not res.ok:
        msg = "could not create payment order"
        try:
            body = res.json()
            msg = body.get("error", {}).get("description") or body.get("error", {}).get("reason") or msg
        except Exception:
            pass
        raise RuntimeError(msg)

    data = res.json()
    if not data.get("id"):
        raise RuntimeError("invalid payment gateway response")
    return data


def _fetch_razorpay_order(order_id: str) -> dict:
    key_id = str(current_app.config.get("RAZORPAY_KEY_ID") or "").strip()
    key_secret = str(current_app.config.get("RAZORPAY_KEY_SECRET") or "").strip()
    try:
        res = requests.get(
            f"{RAZORPAY_ORDER_ENDPOINT}/{order_id}",
            auth=(key_id, key_secret),
            timeout=20,
        )
    except requests.RequestException as exc:
        raise RuntimeError("payment gateway verification failed") from exc

    if not res.ok:
        raise RuntimeError("could not verify payment order")
    return res.json()


def _verify_razorpay_signature(order_id: str, payment_id: str, signature: str) -> bool:
    key_secret = str(current_app.config.get("RAZORPAY_KEY_SECRET") or "").strip()
    if not key_secret:
        return False
    payload = f"{order_id}|{payment_id}".encode("utf-8")
    expected = hmac.new(key_secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


def _compute_cart_summary(cart: dict[str, int], coupon_code: str | None = None) -> dict:
    items_payload = []
    display_items = []
    subtotal = Decimal("0")

    for sid, qty in cart.items():
        p = db.session.get(Product, int(sid))
        if not p or p.stock < 1:
            continue
        q = min(int(qty), int(p.stock))
        if q < 1:
            continue
        unit = _money(Decimal(str(p.price)))
        line = _money(unit * q)
        subtotal += line
        items_payload.append((p, q, unit, line))
        display_items.append({"product": p.to_dict(), "quantity": q, "line_total": float(line)})

    subtotal = _money(subtotal)
    code = (coupon_code or "").strip().upper()
    coupon = None
    coupon_error = None
    discount = Decimal("0")

    if code:
        coupon = Coupon.query.filter_by(code=code, active=True).first()
        if not coupon:
            coupon_error = "invalid coupon code"
        else:
            discount = _money(coupon.compute_discount(subtotal))
            if discount <= 0:
                min_value = _money(Decimal(str(coupon.min_order_amount or 0)))
                coupon_error = f"coupon requires minimum order of Rs {int(min_value)}"
                coupon = None

    taxable_amount = _money(max(Decimal("0"), subtotal - discount))
    gst = _money(taxable_amount * GST_RATE)
    shipping = SHIPPING_CHARGE if items_payload else Decimal("0")
    total = _money(taxable_amount + gst + shipping)

    return {
        "items_payload": items_payload,
        "display_items": display_items,
        "subtotal": subtotal,
        "discount": discount,
        "gst": gst,
        "shipping": shipping,
        "total": total,
        "coupon_code": coupon.code if coupon else None,
        "coupon_error": coupon_error,
    }


@bp.route("/products", methods=["GET"])
def list_products():
    category = (request.args.get("category") or "").strip().lower()
    qtext = (request.args.get("q") or "").strip()
    brand = (request.args.get("brand") or "").strip()
    product_type = (request.args.get("product_type") or "").strip()
    query = Product.query
    if category and category != "all":
        query = query.filter(Product.category == category)
    if brand:
        query = query.filter(Product.brand.ilike(brand))
    if product_type and product_type != "all":
        query = query.filter(Product.product_type == product_type)
    if qtext:
        like = f"%{qtext}%"
        query = query.filter(
            (Product.name.ilike(like))
            | (Product.description.ilike(like))
            | (Product.vehicle_compatibility.ilike(like))
            | (Product.brand.ilike(like))
        )
    products = query.order_by(Product.name).all()
    return jsonify({"products": [p.to_dict() for p in products]})


@bp.route("/products/<int:pid>", methods=["GET"])
def product_detail(pid: int):
    p = db.session.get(Product, pid)
    if not p:
        return jsonify({"error": "not found"}), 404
    if current_user.is_authenticated:
        record_history(current_user.id, pid, "view")
    return jsonify({"product": p.to_dict()})


@bp.route("/products/slug/<slug>", methods=["GET"])
def product_detail_by_slug(slug: str):
    clean_slug = (slug or "").strip().lower()
    if not clean_slug:
        return jsonify({"error": "slug required"}), 400
    p = Product.query.filter_by(slug=clean_slug).first()
    if not p:
        return jsonify({"error": "not found"}), 404
    if current_user.is_authenticated:
        record_history(current_user.id, p.id, "view")
    return jsonify({"product": p.to_dict()})


@bp.route("/products/meta", methods=["GET"])
def products_meta():
    products = Product.query.all()
    brands = [
        b.name
        for b in ProductBrand.query.filter_by(active=True).order_by(ProductBrand.name.asc()).all()
        if (b.name or "").strip()
    ]
    if not brands:
        brands = sorted({(p.brand or "").strip() for p in products if (p.brand or "").strip()})
    categories = [
        c.name
        for c in ProductCategory.query.filter_by(active=True).order_by(ProductCategory.name.asc()).all()
    ]
    if not categories:
        categories = sorted({p.category for p in products if p.category})
    return jsonify(
        {
            "brands": brands,
            "categories": categories,
            "product_types": ["vehicleSpecific", "universal", "companyBranded"],
        }
    )


@bp.route("/vehicles", methods=["GET"])
def list_vehicles():
    q = (request.args.get("q") or "").strip()
    company = (request.args.get("company") or "").strip()
    model = (request.args.get("model") or "").strip()
    variant = (request.args.get("variant") or "").strip()
    fuel_type = (request.args.get("fuel_type") or "").strip()
    vehicle_type = (request.args.get("vehicle_type") or "").strip().lower()
    year = (request.args.get("year") or "").strip()

    query = Vehicle.query
    if company:
        query = query.filter(Vehicle.company.ilike(f"%{company}%"))
    if model:
        query = query.filter(Vehicle.model.ilike(f"%{model}%"))
    if variant:
        query = query.filter(Vehicle.variant.ilike(f"%{variant}%"))
    if fuel_type:
        query = query.filter(Vehicle.fuel_type.ilike(f"%{fuel_type}%"))
    if vehicle_type in {"car", "bike"}:
        query = query.filter(Vehicle.vehicle_type == vehicle_type)
    if year:
        try:
            query = query.filter(Vehicle.year == int(year))
        except ValueError:
            return jsonify({"error": "year must be numeric"}), 400
    if q:
        like = f"%{q}%"
        query = query.filter(
            (Vehicle.company.ilike(like))
            | (Vehicle.model.ilike(like))
            | (Vehicle.variant.ilike(like))
            | (Vehicle.fuel_type.ilike(like))
        )

    vehicles = query.order_by(Vehicle.company, Vehicle.model, Vehicle.year.desc()).all()
    return jsonify({"vehicles": [v.to_dict() for v in vehicles]})


@bp.route("/vehicles/<int:vid>/parts", methods=["GET"])
def list_vehicle_parts(vid: int):
    vehicle = db.session.get(Vehicle, vid)
    if not vehicle:
        return jsonify({"error": "vehicle not found"}), 404

    mapped_ids = {
        row.product_id
        for row in CompatibilityMapping.query.filter_by(vehicle_id=vid).all()
    }

    if mapped_ids:
        # Strict mapping mode: mapped products + general products.
        products = (
            Product.query.filter(Product.stock > 0)
            .filter(
                (Product.id.in_(list(mapped_ids)))
                | (Product.product_type == "universal")
                | (Product.product_type == "companyBranded")
            )
            .order_by(Product.name)
            .all()
        )
    else:
        # Fallback for older datasets where mapping table is not populated yet.
        query = Product.query.filter(Product.stock > 0)
        query = query.filter(
            (Product.product_type == "universal")
            | (Product.product_type == "companyBranded")
            | (
                (Product.vehicle_compatibility.ilike(f"%{vehicle.company}%"))
                & (Product.vehicle_compatibility.ilike(f"%{vehicle.model}%"))
            )
        )
        products = query.order_by(Product.name).all()

    vehicle_tokens = [vehicle.company, vehicle.model, str(vehicle.year), vehicle.variant]
    scored: list[tuple[int, Product]] = []
    for p in products:
        score = 0
        if p.id in mapped_ids:
            score += 100
        blob = (p.vehicle_compatibility or "").lower()
        for t in vehicle_tokens:
            token = (t or "").strip().lower()
            if token and token in blob:
                score += 1
        scored.append((score, p))
    scored.sort(key=lambda item: (-item[0], item[1].name))

    return jsonify(
        {
            "vehicle": vehicle.to_dict(),
            "products": [p.to_dict() for _, p in scored],
            "matching_mode": "mapped" if mapped_ids else "fallback",
        }
    )


@bp.route("/cart", methods=["GET"])
def get_cart():
    cart = _cart()
    coupon_code = request.args.get("coupon") or ""
    summary = _compute_cart_summary(cart, coupon_code)
    return jsonify(
        {
            "items": summary["display_items"],
            "subtotal": float(summary["subtotal"]),
            "discount": float(summary["discount"]),
            "gst": float(summary["gst"]),
            "shipping": float(summary["shipping"]),
            "total": float(summary["total"]),
            "coupon": {
                "code": summary["coupon_code"],
                "error": summary["coupon_error"],
            },
        }
    )


@bp.route("/coupons/validate", methods=["GET"])
def validate_coupon():
    code = (request.args.get("code") or "").strip()
    if not code:
        return jsonify({"error": "coupon code required"}), 400

    summary = _compute_cart_summary(_cart(), code)
    if summary["coupon_error"] or not summary["coupon_code"]:
        return jsonify(
            {
                "valid": False,
                "code": code.upper(),
                "message": summary["coupon_error"] or "coupon not applicable",
                "discount": 0.0,
            }
        )

    return jsonify(
        {
            "valid": True,
            "code": summary["coupon_code"],
            "message": "coupon applied",
            "discount": float(summary["discount"]),
        }
    )


@bp.route("/cart/add", methods=["POST"])
def cart_add():
    data = request.get_json(silent=True) or {}
    try:
        pid = int(data.get("product_id"))
        qty = int(data.get("quantity", 1))
    except (TypeError, ValueError):
        return jsonify({"error": "invalid product_id or quantity"}), 400
    if qty < 1:
        return jsonify({"error": "quantity must be >= 1"}), 400
    p = db.session.get(Product, pid)
    if not p:
        return jsonify({"error": "product not found"}), 404
    cart = _cart()
    cur = cart.get(str(pid), 0)
    new_qty = min(cur + qty, p.stock)
    cart[str(pid)] = new_qty
    _set_cart(cart)
    if current_user.is_authenticated:
        record_history(current_user.id, pid, "cart_add")
    return jsonify({"ok": True, "cart": cart})


@bp.route("/cart/update", methods=["POST"])
def cart_update():
    data = request.get_json(silent=True) or {}
    try:
        pid = int(data.get("product_id"))
        qty = int(data.get("quantity", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "invalid payload"}), 400
    cart = _cart()
    p = db.session.get(Product, pid)
    if qty < 1:
        cart.pop(str(pid), None)
    elif p:
        cart[str(pid)] = min(qty, p.stock)
    _set_cart(cart)
    return jsonify({"ok": True, "cart": cart})


@bp.route("/cart/clear", methods=["POST"])
def cart_clear():
    _set_cart({})
    return jsonify({"ok": True})


@bp.route("/payments/config", methods=["GET"])
def payment_config():
    enabled = _razorpay_enabled()
    return jsonify(
        {
            "provider": "razorpay",
            "enabled": enabled,
            "currency": _razorpay_currency(),
            "key_id": str(current_app.config.get("RAZORPAY_KEY_ID") or "").strip() if enabled else "",
            "demo_fallback": True,
        }
    )


@bp.route("/payments/razorpay/order", methods=["POST"])
@login_required
def create_razorpay_payment_order():
    if not _razorpay_enabled():
        return jsonify({"error": "razorpay is not configured"}), 503

    data = request.get_json(silent=True) or {}
    coupon_code = str(data.get("coupon_code") or "").strip()

    cart = _cart()
    if not cart:
        return jsonify({"error": "cart is empty"}), 400

    summary = _compute_cart_summary(cart, coupon_code)
    if coupon_code and summary["coupon_error"]:
        return jsonify({"error": summary["coupon_error"]}), 400
    if not summary["items_payload"]:
        return jsonify({"error": "no valid items in cart"}), 400

    receipt = f"am_{current_user.id}_{int(time.time())}"
    try:
        order_payload = _create_razorpay_order(summary["total"], receipt)
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 502

    return jsonify(
        {
            "provider": "razorpay",
            "key_id": str(current_app.config.get("RAZORPAY_KEY_ID") or "").strip(),
            "order": {
                "id": order_payload.get("id"),
                "amount": int(order_payload.get("amount") or 0),
                "currency": order_payload.get("currency") or _razorpay_currency(),
                "receipt": order_payload.get("receipt") or receipt,
                "status": order_payload.get("status") or "created",
            },
            "amount_breakdown": {
                "subtotal": float(summary["subtotal"]),
                "discount": float(summary["discount"]),
                "gst": float(summary["gst"]),
                "shipping": float(summary["shipping"]),
                "total": float(summary["total"]),
            },
            "coupon_code": summary["coupon_code"],
        }
    )


@bp.route("/orders/checkout", methods=["POST"])
@login_required
def checkout():
    data = request.get_json(silent=True) or {}
    shipping = data.get("shipping_address") or ""
    payment_method = str(data.get("payment_method") or "cod").strip().lower()
    payment_outcome = str(data.get("payment_outcome") or "").strip().lower()
    payment_gateway = str(data.get("payment_gateway") or "demo").strip().lower()
    coupon_code = str(data.get("coupon_code") or "").strip()
    razorpay_order_id = str(data.get("razorpay_order_id") or "").strip()
    razorpay_payment_id = str(data.get("razorpay_payment_id") or "").strip()
    razorpay_signature = str(data.get("razorpay_signature") or "").strip()

    if payment_method not in PAYMENT_METHODS:
        return jsonify({"error": "invalid payment_method"}), 400
    if payment_gateway not in PAYMENT_GATEWAYS:
        return jsonify({"error": "invalid payment_gateway"}), 400
    if payment_outcome and payment_outcome not in PAYMENT_STATUSES:
        return jsonify({"error": "invalid payment_outcome"}), 400

    cart = _cart()
    if not cart:
        return jsonify({"error": "cart is empty"}), 400

    summary = _compute_cart_summary(cart, coupon_code)
    if coupon_code and summary["coupon_error"]:
        return jsonify({"error": summary["coupon_error"]}), 400

    items_payload = summary["items_payload"]
    total = summary["total"]

    if not items_payload:
        return jsonify({"error": "no valid items in cart"}), 400

    if payment_method == "cod":
        payment_status = "pending"
    elif payment_gateway == "razorpay":
        if not _razorpay_enabled():
            return jsonify({"error": "razorpay is not configured"}), 400
        if not (razorpay_order_id and razorpay_payment_id and razorpay_signature):
            return jsonify({"error": "razorpay verification payload missing"}), 400
        if not _verify_razorpay_signature(
            order_id=razorpay_order_id,
            payment_id=razorpay_payment_id,
            signature=razorpay_signature,
        ):
            return jsonify({"error": "invalid razorpay signature"}), 400
        try:
            gateway_order = _fetch_razorpay_order(razorpay_order_id)
        except RuntimeError as exc:
            return jsonify({"error": str(exc)}), 502
        expected_amount = _summary_total_to_paise(total)
        order_amount = int(gateway_order.get("amount") or 0)
        paid_amount = int(gateway_order.get("amount_paid") or 0)
        currency = str(gateway_order.get("currency") or "").upper()
        if order_amount != expected_amount:
            return jsonify({"error": "payment amount mismatch"}), 400
        if currency and currency != _razorpay_currency():
            return jsonify({"error": "payment currency mismatch"}), 400
        payment_status = (
            "success"
            if (
                str(gateway_order.get("status") or "").lower() == "paid"
                and paid_amount >= expected_amount
            )
            else "pending"
        )
    else:
        payment_status = payment_outcome or "success"

    status_map = {
        "success": "confirmed",
        "pending": "payment_pending",
        "failed": "payment_failed",
    }

    order = Order(
        user_id=current_user.id,
        total=total,
        status=status_map.get(payment_status, "confirmed"),
        shipping_address=str(shipping)[:2000],
    )
    db.session.add(order)
    db.session.flush()

    db.session.add(
        OrderMeta(
            order_id=order.id,
            subtotal=summary["subtotal"],
            gst_amount=summary["gst"],
            shipping_amount=summary["shipping"],
            discount_amount=summary["discount"],
            coupon_code=summary["coupon_code"],
            payment_method=payment_method,
            payment_status=payment_status,
        )
    )

    for p, q, unit, _line in items_payload:
        db.session.add(
            OrderItem(order_id=order.id, product_id=p.id, quantity=q, unit_price=unit)
        )
        if payment_status != "failed":
            p.stock = int(p.stock) - q
            record_history(current_user.id, p.id, "purchase")

    if payment_status != "failed":
        _set_cart({})
    db.session.commit()
    return jsonify(
        {
            "order_id": order.id,
            "subtotal": float(summary["subtotal"]),
            "discount": float(summary["discount"]),
            "gst": float(summary["gst"]),
            "shipping": float(summary["shipping"]),
            "total": float(total),
            "status": order.status,
            "payment_status": payment_status,
            "payment_method": payment_method,
            "payment_gateway": payment_gateway if payment_method != "cod" else "cod",
        }
    )


def _order_to_dict(order: Order, include_items: bool = False) -> dict:
    meta = order.checkout_meta
    payload = {
        "id": order.id,
        "user_id": order.user_id,
        "total": float(order.total),
        "status": order.status,
        "shipping_address": order.shipping_address,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "subtotal": float(meta.subtotal) if meta else float(order.total),
        "gst": float(meta.gst_amount) if meta else 0.0,
        "shipping": float(meta.shipping_amount) if meta else 0.0,
        "discount": float(meta.discount_amount) if meta else 0.0,
        "coupon_code": meta.coupon_code if meta else None,
        "payment_method": meta.payment_method if meta else "cod",
        "payment_status": meta.payment_status if meta else "success",
    }
    if include_items:
        items = []
        for item in order.items.order_by(OrderItem.id).all():
            p = item.product
            items.append(
                {
                    "id": item.id,
                    "product_id": item.product_id,
                    "product_name": p.name if p else None,
                    "quantity": item.quantity,
                    "unit_price": float(item.unit_price),
                    "line_total": float(item.unit_price) * int(item.quantity),
                }
            )
        payload["items"] = items
    return payload


@bp.route("/orders", methods=["GET"])
@login_required
def list_orders():
    rows = (
        Order.query.filter_by(user_id=current_user.id)
        .order_by(Order.created_at.desc())
        .all()
    )
    return jsonify({"orders": [_order_to_dict(o) for o in rows]})


@bp.route("/orders/<int:oid>", methods=["GET"])
@login_required
def get_order(oid: int):
    o = Order.query.filter_by(id=oid, user_id=current_user.id).first()
    if not o:
        return jsonify({"error": "order not found"}), 404
    return jsonify({"order": _order_to_dict(o, include_items=True)})


@bp.route("/orders/<int:oid>/cancel", methods=["POST"])
@login_required
def cancel_order(oid: int):
    order = Order.query.filter_by(id=oid, user_id=current_user.id).first()
    if not order:
        return jsonify({"error": "order not found"}), 404
    if order.status == "cancelled":
        return jsonify({"error": "order already cancelled"}), 400
    if order.status not in CANCELABLE_STATUSES:
        return jsonify({"error": f"order cannot be cancelled in status '{order.status}'"}), 400

    for item in order.items.all():
        product = item.product
        if product:
            product.stock = int(product.stock or 0) + int(item.quantity or 0)

    order.status = "cancelled"
    meta = order.checkout_meta
    if meta and meta.payment_status != "failed":
        meta.payment_status = "failed"

    db.session.commit()
    return jsonify({"order": _order_to_dict(order, include_items=True)})


@bp.route("/orders/<int:oid>/invoice", methods=["GET"])
@login_required
def get_order_invoice(oid: int):
    order = Order.query.filter_by(id=oid, user_id=current_user.id).first()
    if not order:
        return jsonify({"error": "order not found"}), 404

    order_payload = _order_to_dict(order, include_items=True)
    stamp = order.created_at.strftime("%Y%m%d") if order.created_at else "00000000"
    invoice_number = f"AM-{stamp}-{order.id:05d}"

    return jsonify(
        {
            "invoice": {
                "invoice_number": invoice_number,
                "issued_at": order_payload["created_at"],
                "seller": {
                    "name": "AutoMart Pvt Ltd",
                    "address": "Bengaluru, Karnataka, India",
                    "gstin": "29ABCDE1234F1Z5",
                    "support_email": "support@automart.com",
                },
                "customer": {
                    "name": current_user.name or "AutoMart Customer",
                    "email": current_user.email,
                },
                "order": order_payload,
            }
        }
    )
