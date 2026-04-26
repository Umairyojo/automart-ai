"""
Admin JSON API: product CRUD, analytics, embedding reindex for smart search.
"""
import json
from functools import wraps
from decimal import Decimal

from flask import Blueprint, current_app, jsonify, request
from flask_login import current_user, login_required

from . import ai_service
from .extensions import db
from .media_service import upload_admin_image
from .models import (
    CompatibilityMapping,
    Coupon,
    Order,
    OrderItem,
    ProductBrand,
    Product,
    ProductCategory,
    User,
    UserHistory,
    Vehicle,
)
from .seed import reindex_product_embeddings, slugify

bp = Blueprint("api_admin", __name__, url_prefix="/api/admin")
ORDER_STATUSES = {
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "payment_pending",
    "payment_failed",
}
PRODUCT_TYPES = {"vehicleSpecific", "universal", "companyBranded"}
VEHICLE_TYPES = {"car", "bike"}
UPLOAD_FOLDERS = {"product": "products", "vehicle": "vehicles", "general": "general"}
MAX_IMAGE_URL_LENGTH = 2048


def _normalize_category_name(raw: str) -> str:
    return slugify(str(raw or "")).replace("-", "_")[:64]


def _active_category_names() -> set[str]:
    rows = ProductCategory.query.filter_by(active=True).all()
    return {(c.name or "").strip().lower() for c in rows if (c.name or "").strip()}


def _active_brand_names() -> set[str]:
    rows = ProductBrand.query.filter_by(active=True).all()
    return {(b.name or "").strip().lower() for b in rows if (b.name or "").strip()}


def _coupon_to_dict(coupon: Coupon) -> dict:
    return {
        "id": coupon.id,
        "code": coupon.code,
        "description": coupon.description,
        "discount_type": coupon.discount_type,
        "value": float(coupon.value or 0),
        "min_order_amount": float(coupon.min_order_amount or 0),
        "max_discount": float(coupon.max_discount) if coupon.max_discount is not None else None,
        "active": bool(coupon.active),
        "created_at": coupon.created_at.isoformat() if coupon.created_at else None,
    }


def _order_to_dict(order: Order) -> dict:
    meta = order.checkout_meta
    user = db.session.get(User, order.user_id)
    return {
        "id": order.id,
        "user_id": order.user_id,
        "customer_email": user.email if user else None,
        "customer_name": user.name if user else None,
        "total": float(order.total),
        "status": order.status,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "payment_method": meta.payment_method if meta else "cod",
        "payment_status": meta.payment_status if meta else "success",
        "subtotal": float(meta.subtotal) if meta else float(order.total),
        "discount": float(meta.discount_amount) if meta else 0.0,
        "gst": float(meta.gst_amount) if meta else 0.0,
        "shipping": float(meta.shipping_amount) if meta else 0.0,
        "coupon_code": meta.coupon_code if meta else None,
    }


def _category_to_dict(category: ProductCategory) -> dict:
    return category.to_dict()


def _brand_to_dict(brand: ProductBrand) -> dict:
    return brand.to_dict()


def _vehicle_to_dict(vehicle: Vehicle) -> dict:
    return vehicle.to_dict()


def _user_to_dict(user: User) -> dict:
    order_count = Order.query.filter_by(user_id=user.id).count()
    total_spent = (
        db.session.query(db.func.coalesce(db.func.sum(Order.total), 0))
        .filter(Order.user_id == user.id)
        .scalar()
    )
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "is_admin": bool(user.is_admin),
        "is_blocked": bool(user.is_blocked),
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "order_count": int(order_count),
        "total_spent": float(total_spent or 0),
    }


def _compatibility_to_dict(row: CompatibilityMapping) -> dict:
    product = row.product
    vehicle = row.vehicle
    return {
        "id": row.id,
        "product_id": row.product_id,
        "vehicle_id": row.vehicle_id,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "product": {
            "id": product.id if product else row.product_id,
            "name": product.name if product else None,
            "brand": product.brand if product else None,
            "category": product.category if product else None,
            "product_type": product.product_type if product else None,
        },
        "vehicle": {
            "id": vehicle.id if vehicle else row.vehicle_id,
            "display_name": vehicle.display_name() if vehicle else None,
            "company": vehicle.company if vehicle else None,
            "model": vehicle.model if vehicle else None,
            "year": vehicle.year if vehicle else None,
            "vehicle_type": vehicle.vehicle_type if vehicle else None,
        },
    }


def _clean_image_url(raw: object) -> str:
    value = str(raw or "").strip()
    if not value:
        return ""
    if len(value) > MAX_IMAGE_URL_LENGTH:
        raise ValueError(f"image_url must be {MAX_IMAGE_URL_LENGTH} characters or less")
    if value.startswith("/uploads/"):
        return value
    if not (value.startswith("https://") or value.startswith("http://")):
        raise ValueError("image_url must start with http://, https://, or /uploads/")
    return value


def admin_required(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin:
            return jsonify({"error": "admin only"}), 403
        return f(*args, **kwargs)

    return wrapped


@bp.route("/products", methods=["GET"])
@login_required
@admin_required
def admin_list_products():
    rows = Product.query.order_by(Product.id).all()
    return jsonify({"products": [p.to_dict() for p in rows]})


@bp.route("/uploads/image", methods=["POST"])
@login_required
@admin_required
def admin_upload_image():
    if "file" not in request.files:
        return jsonify({"error": "file is required"}), 400
    folder_key = str(request.form.get("entity") or "general").strip().lower()
    folder = UPLOAD_FOLDERS.get(folder_key, "general")
    try:
        uploaded = upload_admin_image(
            request.files["file"],
            folder_hint=folder,
            host_base=request.host_url.rstrip("/"),
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception:
        return jsonify({"error": "image upload failed"}), 500
    return jsonify(uploaded), 201


@bp.route("/products", methods=["POST"])
@login_required
@admin_required
def admin_create_product():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "name required"}), 400
    category = _normalize_category_name((data.get("category") or "engine").strip().lower())
    brand = (data.get("brand") or "").strip()
    product_type = (data.get("product_type") or "vehicleSpecific").strip()
    allowed_categories = _active_category_names()
    allowed_brands = _active_brand_names()
    if allowed_categories and category not in allowed_categories:
        return jsonify({"error": "invalid category"}), 400
    if brand and allowed_brands and brand.lower() not in allowed_brands:
        return jsonify({"error": "invalid brand"}), 400
    if product_type not in PRODUCT_TYPES:
        return jsonify({"error": "invalid product_type"}), 400
    slug = (data.get("slug") or "").strip() or slugify(name)
    if Product.query.filter_by(slug=slug).first():
        slug = f"{slug}-{Product.query.count()+1}"
    try:
        price = float(data.get("price", 0))
        stock = int(data.get("stock", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "invalid price or stock"}), 400

    try:
        image_url = _clean_image_url(data.get("image_url"))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    p = Product(
        name=name,
        slug=slug,
        description=(data.get("description") or "")[:10000],
        category=category,
        brand=brand[:120],
        product_type=product_type,
        price=price,
        stock=stock,
        image_url=image_url,
        vehicle_compatibility=(data.get("vehicle_compatibility") or "")[:5000],
        embedding_json="",
    )
    db.session.add(p)
    db.session.commit()
    # Optional: embed single product
    text = (
        f"{p.name}. {p.description}. Category: {p.category}. "
        f"Brand: {p.brand}. Type: {p.product_type}. Fits: {p.vehicle_compatibility}"
    )
    if current_app.config.get("AI_EMBED_FOR_SMART_SEARCH") and ai_service.ai_enabled():
        vec = ai_service.embed_text(text)
        if vec:
            p.embedding_json = json.dumps(vec)
            db.session.commit()
    return jsonify({"product": p.to_dict()}), 201


@bp.route("/products/<int:pid>", methods=["PUT", "PATCH"])
@login_required
@admin_required
def admin_update_product(pid: int):
    p = db.session.get(Product, pid)
    if not p:
        return jsonify({"error": "not found"}), 404
    data = request.get_json(silent=True) or {}
    if "name" in data:
        p.name = (data.get("name") or p.name)[:200]
    if "slug" in data and data.get("slug"):
        p.slug = slugify(str(data["slug"]))[:220]
    if "description" in data:
        p.description = str(data.get("description") or "")[:10000]
    if "category" in data:
        c = _normalize_category_name(str(data.get("category") or "").lower())
        allowed_categories = _active_category_names()
        if allowed_categories and c not in allowed_categories:
            return jsonify({"error": "invalid category"}), 400
        if c:
            p.category = c
    if "brand" in data:
        next_brand = str(data.get("brand") or "").strip()
        allowed_brands = _active_brand_names()
        if next_brand and allowed_brands and next_brand.lower() not in allowed_brands:
            return jsonify({"error": "invalid brand"}), 400
        p.brand = next_brand[:120]
    if "product_type" in data:
        pt = str(data.get("product_type") or "")
        if pt in PRODUCT_TYPES:
            p.product_type = pt
    if "price" in data:
        try:
            p.price = float(data["price"])
        except (TypeError, ValueError):
            return jsonify({"error": "invalid price"}), 400
    if "stock" in data:
        try:
            p.stock = int(data["stock"])
        except (TypeError, ValueError):
            return jsonify({"error": "invalid stock"}), 400
    if "image_url" in data:
        try:
            p.image_url = _clean_image_url(data.get("image_url"))
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
    if "vehicle_compatibility" in data:
        p.vehicle_compatibility = str(data.get("vehicle_compatibility") or "")[:5000]

    db.session.commit()
    text = (
        f"{p.name}. {p.description}. Category: {p.category}. "
        f"Brand: {p.brand}. Type: {p.product_type}. Fits: {p.vehicle_compatibility}"
    )
    if current_app.config.get("AI_EMBED_FOR_SMART_SEARCH") and ai_service.ai_enabled():
        vec = ai_service.embed_text(text)
        if vec:
            p.embedding_json = json.dumps(vec)
            db.session.commit()
    return jsonify({"product": p.to_dict()})


@bp.route("/products/<int:pid>", methods=["DELETE"])
@login_required
@admin_required
def admin_delete_product(pid: int):
    p = db.session.get(Product, pid)
    if not p:
        return jsonify({"error": "not found"}), 404
    db.session.delete(p)
    db.session.commit()
    return jsonify({"ok": True})


@bp.route("/products/<int:pid>/out-of-stock", methods=["POST"])
@login_required
@admin_required
def admin_mark_out_of_stock(pid: int):
    p = db.session.get(Product, pid)
    if not p:
        return jsonify({"error": "not found"}), 404
    p.stock = 0
    db.session.commit()
    return jsonify({"product": p.to_dict()})


@bp.route("/categories", methods=["GET"])
@login_required
@admin_required
def admin_list_categories():
    rows = ProductCategory.query.order_by(ProductCategory.name.asc()).all()
    return jsonify({"categories": [_category_to_dict(c) for c in rows]})


@bp.route("/categories", methods=["POST"])
@login_required
@admin_required
def admin_create_category():
    data = request.get_json(silent=True) or {}
    name = _normalize_category_name(data.get("name") or "")
    if not name:
        return jsonify({"error": "name required"}), 400
    if ProductCategory.query.filter_by(name=name).first():
        return jsonify({"error": "category already exists"}), 409
    category = ProductCategory(
        name=name,
        description=str(data.get("description") or "")[:255],
        active=bool(data.get("active", True)),
    )
    db.session.add(category)
    db.session.commit()
    return jsonify({"category": _category_to_dict(category)}), 201


@bp.route("/categories/<int:cid>", methods=["PATCH"])
@login_required
@admin_required
def admin_update_category(cid: int):
    category = db.session.get(ProductCategory, cid)
    if not category:
        return jsonify({"error": "category not found"}), 404

    data = request.get_json(silent=True) or {}
    if "name" in data:
        next_name = _normalize_category_name(data.get("name") or "")
        if not next_name:
            return jsonify({"error": "name required"}), 400
        exists = ProductCategory.query.filter(
            ProductCategory.name == next_name,
            ProductCategory.id != cid,
        ).first()
        if exists:
            return jsonify({"error": "category already exists"}), 409
        old_name = category.name
        category.name = next_name
        Product.query.filter(Product.category == old_name).update({"category": next_name})
    if "description" in data:
        category.description = str(data.get("description") or "")[:255]
    if "active" in data:
        category.active = bool(data.get("active"))

    db.session.commit()
    return jsonify({"category": _category_to_dict(category)})


@bp.route("/categories/<int:cid>", methods=["DELETE"])
@login_required
@admin_required
def admin_delete_category(cid: int):
    category = db.session.get(ProductCategory, cid)
    if not category:
        return jsonify({"error": "category not found"}), 404
    in_use = Product.query.filter(Product.category == category.name).count()
    if in_use > 0:
        return jsonify({"error": "category is used by products"}), 409
    db.session.delete(category)
    db.session.commit()
    return jsonify({"ok": True})


@bp.route("/brands", methods=["GET"])
@login_required
@admin_required
def admin_list_brands():
    rows = ProductBrand.query.order_by(ProductBrand.name.asc()).all()
    return jsonify({"brands": [_brand_to_dict(b) for b in rows]})


@bp.route("/brands", methods=["POST"])
@login_required
@admin_required
def admin_create_brand():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name") or "").strip()[:120]
    if not name:
        return jsonify({"error": "name required"}), 400
    exists = ProductBrand.query.filter(db.func.lower(ProductBrand.name) == name.lower()).first()
    if exists:
        return jsonify({"error": "brand already exists"}), 409
    brand = ProductBrand(
        name=name,
        description=str(data.get("description") or "")[:255],
        active=bool(data.get("active", True)),
    )
    db.session.add(brand)
    db.session.commit()
    return jsonify({"brand": _brand_to_dict(brand)}), 201


@bp.route("/brands/<int:bid>", methods=["PATCH"])
@login_required
@admin_required
def admin_update_brand(bid: int):
    brand = db.session.get(ProductBrand, bid)
    if not brand:
        return jsonify({"error": "brand not found"}), 404

    data = request.get_json(silent=True) or {}
    if "name" in data:
        next_name = str(data.get("name") or "").strip()[:120]
        if not next_name:
            return jsonify({"error": "name required"}), 400
        exists = ProductBrand.query.filter(
            db.func.lower(ProductBrand.name) == next_name.lower(),
            ProductBrand.id != bid,
        ).first()
        if exists:
            return jsonify({"error": "brand already exists"}), 409
        old_name = brand.name
        brand.name = next_name
        Product.query.filter(Product.brand == old_name).update({"brand": next_name})
    if "description" in data:
        brand.description = str(data.get("description") or "")[:255]
    if "active" in data:
        brand.active = bool(data.get("active"))

    db.session.commit()
    return jsonify({"brand": _brand_to_dict(brand)})


@bp.route("/brands/<int:bid>", methods=["DELETE"])
@login_required
@admin_required
def admin_delete_brand(bid: int):
    brand = db.session.get(ProductBrand, bid)
    if not brand:
        return jsonify({"error": "brand not found"}), 404
    in_use = Product.query.filter(Product.brand == brand.name).count()
    if in_use > 0:
        return jsonify({"error": "brand is used by products"}), 409
    db.session.delete(brand)
    db.session.commit()
    return jsonify({"ok": True})


@bp.route("/vehicles", methods=["GET"])
@login_required
@admin_required
def admin_list_vehicles():
    v_type = str(request.args.get("vehicle_type") or "").strip().lower()
    query = Vehicle.query
    if v_type in VEHICLE_TYPES:
        query = query.filter(Vehicle.vehicle_type == v_type)
    rows = query.order_by(Vehicle.vehicle_type.asc(), Vehicle.company.asc(), Vehicle.model.asc(), Vehicle.year.desc()).all()
    return jsonify({"vehicles": [_vehicle_to_dict(v) for v in rows]})


@bp.route("/vehicles", methods=["POST"])
@login_required
@admin_required
def admin_create_vehicle():
    data = request.get_json(silent=True) or {}
    company = str(data.get("company") or "").strip()
    model = str(data.get("model") or "").strip()
    variant = str(data.get("variant") or "").strip()
    fuel_type = str(data.get("fuel_type") or "").strip()
    vehicle_type = str(data.get("vehicle_type") or "car").strip().lower()
    try:
        year = int(data.get("year"))
    except (TypeError, ValueError):
        return jsonify({"error": "invalid year"}), 400

    if not company or not model:
        return jsonify({"error": "company and model are required"}), 400
    if year < 1980 or year > 2100:
        return jsonify({"error": "year out of range"}), 400
    if vehicle_type not in VEHICLE_TYPES:
        return jsonify({"error": "invalid vehicle_type"}), 400

    try:
        image_url = _clean_image_url(data.get("image_url"))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    vehicle = Vehicle(
        company=company[:120],
        model=model[:120],
        year=year,
        variant=variant[:120],
        fuel_type=fuel_type[:40],
        vehicle_type=vehicle_type,
        image_url=image_url,
    )
    db.session.add(vehicle)
    db.session.commit()
    return jsonify({"vehicle": _vehicle_to_dict(vehicle)}), 201


@bp.route("/vehicles/<int:vid>", methods=["PATCH"])
@login_required
@admin_required
def admin_update_vehicle(vid: int):
    vehicle = db.session.get(Vehicle, vid)
    if not vehicle:
        return jsonify({"error": "vehicle not found"}), 404

    data = request.get_json(silent=True) or {}
    if "company" in data:
        company = str(data.get("company") or "").strip()
        if not company:
            return jsonify({"error": "company cannot be empty"}), 400
        vehicle.company = company[:120]
    if "model" in data:
        model = str(data.get("model") or "").strip()
        if not model:
            return jsonify({"error": "model cannot be empty"}), 400
        vehicle.model = model[:120]
    if "year" in data:
        try:
            year = int(data.get("year"))
        except (TypeError, ValueError):
            return jsonify({"error": "invalid year"}), 400
        if year < 1980 or year > 2100:
            return jsonify({"error": "year out of range"}), 400
        vehicle.year = year
    if "variant" in data:
        vehicle.variant = str(data.get("variant") or "")[:120]
    if "fuel_type" in data:
        vehicle.fuel_type = str(data.get("fuel_type") or "")[:40]
    if "image_url" in data:
        try:
            vehicle.image_url = _clean_image_url(data.get("image_url"))
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
    if "vehicle_type" in data:
        v_type = str(data.get("vehicle_type") or "").strip().lower()
        if v_type not in VEHICLE_TYPES:
            return jsonify({"error": "invalid vehicle_type"}), 400
        vehicle.vehicle_type = v_type

    db.session.commit()
    return jsonify({"vehicle": _vehicle_to_dict(vehicle)})


@bp.route("/vehicles/<int:vid>", methods=["DELETE"])
@login_required
@admin_required
def admin_delete_vehicle(vid: int):
    vehicle = db.session.get(Vehicle, vid)
    if not vehicle:
        return jsonify({"error": "vehicle not found"}), 404
    db.session.delete(vehicle)
    db.session.commit()
    return jsonify({"ok": True})


@bp.route("/analytics", methods=["GET"])
@login_required
@admin_required
def analytics():
    """Simple dashboard: users, orders, revenue, top products, recent activity."""
    user_count = User.query.count()
    product_count = Product.query.count()
    order_count = Order.query.count()
    revenue = db.session.query(db.func.coalesce(db.func.sum(Order.total), 0)).scalar()
    revenue_f = float(revenue or 0)

    top_q = (
        db.session.query(OrderItem.product_id, db.func.sum(OrderItem.quantity).label("qty"))
        .group_by(OrderItem.product_id)
        .order_by(db.desc("qty"))
        .limit(5)
        .all()
    )
    top_products = []
    for product_id, qty in top_q:
        p = db.session.get(Product, product_id)
        if p:
            top_products.append({"product": p.to_dict(), "units_sold": int(qty)})

    recent_orders = Order.query.order_by(Order.created_at.desc()).limit(10).all()
    recent = [
        {
            "id": o.id,
            "user_id": o.user_id,
            "total": float(o.total),
            "status": o.status,
            "created_at": o.created_at.isoformat() if o.created_at else None,
        }
        for o in recent_orders
    ]

    hist_count = UserHistory.query.count()

    return jsonify(
        {
            "users": user_count,
            "products": product_count,
            "orders": order_count,
            "revenue_total": revenue_f,
            "history_events": hist_count,
            "top_products": top_products,
            "recent_orders": recent,
            "low_stock_products": [
                p.to_dict()
                for p in Product.query.filter(Product.stock <= 10).order_by(Product.stock.asc()).limit(10).all()
            ],
            "ai_enabled": ai_service.ai_enabled(),
        }
    )


@bp.route("/orders", methods=["GET"])
@login_required
@admin_required
def admin_list_orders():
    rows = Order.query.order_by(Order.created_at.desc()).limit(100).all()
    return jsonify({"orders": [_order_to_dict(o) for o in rows], "allowed_statuses": sorted(ORDER_STATUSES)})


@bp.route("/orders/<int:oid>/status", methods=["PATCH"])
@login_required
@admin_required
def admin_update_order_status(oid: int):
    order = db.session.get(Order, oid)
    if not order:
        return jsonify({"error": "order not found"}), 404

    data = request.get_json(silent=True) or {}
    status = str(data.get("status") or "").strip().lower()
    if status not in ORDER_STATUSES:
        return jsonify({"error": "invalid status"}), 400

    order.status = status
    meta = order.checkout_meta
    if meta:
        if status in {"payment_failed", "cancelled"}:
            meta.payment_status = "failed"
        elif status == "payment_pending":
            meta.payment_status = "pending"
        elif status in {"confirmed", "processing", "shipped", "delivered"}:
            if meta.payment_method == "cod":
                meta.payment_status = "pending" if status != "delivered" else "success"
            else:
                if meta.payment_status == "failed":
                    meta.payment_status = "success"

    db.session.commit()
    return jsonify({"order": _order_to_dict(order)})


@bp.route("/users", methods=["GET"])
@login_required
@admin_required
def admin_list_users():
    rows = User.query.order_by(User.created_at.desc(), User.id.desc()).limit(300).all()
    return jsonify({"users": [_user_to_dict(u) for u in rows]})


@bp.route("/users/<int:uid>/block", methods=["PATCH"])
@login_required
@admin_required
def admin_block_unblock_user(uid: int):
    user = db.session.get(User, uid)
    if not user:
        return jsonify({"error": "user not found"}), 404

    data = request.get_json(silent=True) or {}
    blocked = bool(data.get("blocked"))
    if user.id == current_user.id and blocked:
        return jsonify({"error": "you cannot block your own account"}), 400

    user.is_blocked = blocked
    db.session.commit()
    return jsonify({"user": _user_to_dict(user)})


@bp.route("/users/<int:uid>/orders", methods=["GET"])
@login_required
@admin_required
def admin_user_orders(uid: int):
    user = db.session.get(User, uid)
    if not user:
        return jsonify({"error": "user not found"}), 404
    rows = Order.query.filter_by(user_id=uid).order_by(Order.created_at.desc()).limit(100).all()
    return jsonify({"user": _user_to_dict(user), "orders": [_order_to_dict(o) for o in rows]})


@bp.route("/compatibility", methods=["GET"])
@login_required
@admin_required
def admin_list_compatibility():
    vehicle_id = request.args.get("vehicle_id", type=int)
    product_id = request.args.get("product_id", type=int)
    query = CompatibilityMapping.query
    if vehicle_id:
        query = query.filter(CompatibilityMapping.vehicle_id == vehicle_id)
    if product_id:
        query = query.filter(CompatibilityMapping.product_id == product_id)
    rows = query.order_by(CompatibilityMapping.created_at.desc(), CompatibilityMapping.id.desc()).limit(600).all()
    return jsonify({"mappings": [_compatibility_to_dict(r) for r in rows]})


@bp.route("/compatibility", methods=["POST"])
@login_required
@admin_required
def admin_create_compatibility():
    data = request.get_json(silent=True) or {}
    product_id = data.get("product_id")
    vehicle_id = data.get("vehicle_id")
    try:
        product_id = int(product_id)
        vehicle_id = int(vehicle_id)
    except (TypeError, ValueError):
        return jsonify({"error": "product_id and vehicle_id are required"}), 400

    product = db.session.get(Product, product_id)
    vehicle = db.session.get(Vehicle, vehicle_id)
    if not product:
        return jsonify({"error": "product not found"}), 404
    if not vehicle:
        return jsonify({"error": "vehicle not found"}), 404
    if product.product_type == "universal":
        return jsonify({"error": "universal products do not need compatibility mapping"}), 400

    existing = CompatibilityMapping.query.filter_by(
        product_id=product_id,
        vehicle_id=vehicle_id,
    ).first()
    if existing:
        return jsonify({"mapping": _compatibility_to_dict(existing), "created": False})

    row = CompatibilityMapping(product_id=product_id, vehicle_id=vehicle_id)
    db.session.add(row)
    db.session.commit()
    return jsonify({"mapping": _compatibility_to_dict(row), "created": True}), 201


@bp.route("/compatibility/<int:mapping_id>", methods=["DELETE"])
@login_required
@admin_required
def admin_delete_compatibility(mapping_id: int):
    row = db.session.get(CompatibilityMapping, mapping_id)
    if not row:
        return jsonify({"error": "mapping not found"}), 404
    db.session.delete(row)
    db.session.commit()
    return jsonify({"ok": True})


@bp.route("/coupons", methods=["GET"])
@login_required
@admin_required
def admin_list_coupons():
    rows = Coupon.query.order_by(Coupon.created_at.desc(), Coupon.id.desc()).all()
    return jsonify({"coupons": [_coupon_to_dict(c) for c in rows]})


@bp.route("/coupons", methods=["POST"])
@login_required
@admin_required
def admin_create_coupon():
    data = request.get_json(silent=True) or {}
    code = str(data.get("code") or "").strip().upper()
    discount_type = str(data.get("discount_type") or "percent").strip().lower()
    description = str(data.get("description") or "")[:255]
    if not code:
        return jsonify({"error": "code required"}), 400
    if discount_type not in {"percent", "fixed"}:
        return jsonify({"error": "discount_type must be percent or fixed"}), 400
    if Coupon.query.filter_by(code=code).first():
        return jsonify({"error": "coupon code already exists"}), 409

    try:
        value = Decimal(str(data.get("value", 0)))
        min_order_amount = Decimal(str(data.get("min_order_amount", 0)))
        max_discount_raw = data.get("max_discount")
        max_discount = (
            None
            if max_discount_raw in (None, "", "null")
            else Decimal(str(max_discount_raw))
        )
    except Exception:
        return jsonify({"error": "invalid numeric values"}), 400

    if value <= 0:
        return jsonify({"error": "value must be greater than 0"}), 400
    if discount_type == "percent" and value > 100:
        return jsonify({"error": "percent coupon cannot exceed 100"}), 400
    if min_order_amount < 0:
        return jsonify({"error": "min_order_amount cannot be negative"}), 400
    if max_discount is not None and max_discount < 0:
        return jsonify({"error": "max_discount cannot be negative"}), 400

    coupon = Coupon(
        code=code,
        description=description,
        discount_type=discount_type,
        value=value,
        min_order_amount=min_order_amount,
        max_discount=max_discount,
        active=bool(data.get("active", True)),
    )
    db.session.add(coupon)
    db.session.commit()
    return jsonify({"coupon": _coupon_to_dict(coupon)}), 201


@bp.route("/coupons/<int:cid>", methods=["PATCH"])
@login_required
@admin_required
def admin_update_coupon(cid: int):
    coupon = db.session.get(Coupon, cid)
    if not coupon:
        return jsonify({"error": "coupon not found"}), 404

    data = request.get_json(silent=True) or {}
    if "code" in data:
        next_code = str(data.get("code") or "").strip().upper()
        if not next_code:
            return jsonify({"error": "code cannot be empty"}), 400
        exists = Coupon.query.filter(Coupon.code == next_code, Coupon.id != cid).first()
        if exists:
            return jsonify({"error": "coupon code already exists"}), 409
        coupon.code = next_code
    if "description" in data:
        coupon.description = str(data.get("description") or "")[:255]
    if "discount_type" in data:
        discount_type = str(data.get("discount_type") or "").strip().lower()
        if discount_type not in {"percent", "fixed"}:
            return jsonify({"error": "discount_type must be percent or fixed"}), 400
        coupon.discount_type = discount_type
    if "value" in data:
        try:
            value = Decimal(str(data.get("value")))
        except Exception:
            return jsonify({"error": "invalid value"}), 400
        if value <= 0:
            return jsonify({"error": "value must be greater than 0"}), 400
        if coupon.discount_type == "percent" and value > 100:
            return jsonify({"error": "percent coupon cannot exceed 100"}), 400
        coupon.value = value
    if "min_order_amount" in data:
        try:
            minimum = Decimal(str(data.get("min_order_amount")))
        except Exception:
            return jsonify({"error": "invalid min_order_amount"}), 400
        if minimum < 0:
            return jsonify({"error": "min_order_amount cannot be negative"}), 400
        coupon.min_order_amount = minimum
    if "max_discount" in data:
        raw = data.get("max_discount")
        if raw in (None, "", "null"):
            coupon.max_discount = None
        else:
            try:
                max_discount = Decimal(str(raw))
            except Exception:
                return jsonify({"error": "invalid max_discount"}), 400
            if max_discount < 0:
                return jsonify({"error": "max_discount cannot be negative"}), 400
            coupon.max_discount = max_discount
    if "active" in data:
        coupon.active = bool(data.get("active"))

    db.session.commit()
    return jsonify({"coupon": _coupon_to_dict(coupon)})


@bp.route("/coupons/<int:cid>", methods=["DELETE"])
@login_required
@admin_required
def admin_delete_coupon(cid: int):
    coupon = db.session.get(Coupon, cid)
    if not coupon:
        return jsonify({"error": "coupon not found"}), 404
    db.session.delete(coupon)
    db.session.commit()
    return jsonify({"ok": True})


@bp.route("/reindex-embeddings", methods=["POST"])
@login_required
@admin_required
def reindex_embeddings():
    """Rebuild embeddings for all products (call after bulk edits or new API key)."""
    from flask import current_app

    n = reindex_product_embeddings(current_app)
    return jsonify({"updated": n, "ai_enabled": ai_service.ai_enabled()})
