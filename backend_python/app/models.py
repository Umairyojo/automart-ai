"""
SQLAlchemy models: Users, Products, Orders, OrderItems, UserHistory.
Matches the requested schema for spare-parts e-commerce + recommendation signals.
"""
from datetime import UTC, datetime
import hashlib
from decimal import Decimal

from flask_login import UserMixin
from werkzeug.security import check_password_hash, generate_password_hash

from .extensions import db


def utcnow_naive() -> datetime:
    """UTC timestamp without tzinfo for SQLite DateTime columns."""
    return datetime.now(UTC).replace(tzinfo=None)


class User(UserMixin, db.Model):
    """Registered customers and admins."""

    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    name = db.Column(db.String(120), nullable=True)
    is_admin = db.Column(db.Boolean, default=False, nullable=False)
    is_blocked = db.Column(db.Boolean, default=False, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=utcnow_naive)

    orders = db.relationship("Order", backref="user", lazy="dynamic")
    history = db.relationship("UserHistory", backref="user", lazy="dynamic")
    addresses = db.relationship(
        "Address", backref="user", lazy="dynamic", cascade="all, delete-orphan"
    )
    garage_entries = db.relationship(
        "UserGarage", backref="user", lazy="dynamic", cascade="all, delete-orphan"
    )
    reset_tokens = db.relationship(
        "PasswordResetToken", backref="user", lazy="dynamic", cascade="all, delete-orphan"
    )

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "is_admin": self.is_admin,
            "is_blocked": self.is_blocked,
        }


class Product(db.Model):
    """Spare parts catalog."""

    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    slug = db.Column(db.String(220), unique=True, nullable=False, index=True)
    description = db.Column(db.Text, default="")
    # Categories: engine, brake, electrical, accessories
    category = db.Column(db.String(64), nullable=False, index=True)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    stock = db.Column(db.Integer, default=0, nullable=False)
    image_url = db.Column(db.Text, default="")
    brand = db.Column(db.String(120), default="", index=True)
    # vehicleSpecific | universal | companyBranded
    product_type = db.Column(db.String(32), default="vehicleSpecific", index=True)
    # Free text / JSON string listing compatible vehicles, e.g. "Honda Civic 2018; Toyota Corolla 2019"
    vehicle_compatibility = db.Column(db.Text, default="")
    # JSON array of floats from OpenAI embeddings for semantic search
    embedding_json = db.Column(db.Text, default="")
    created_at = db.Column(db.DateTime, default=utcnow_naive)
    compatibility_mappings = db.relationship(
        "CompatibilityMapping",
        backref="product",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "description": self.description,
            "category": self.category,
            "price": float(self.price),
            "stock": self.stock,
            "image_url": self.image_url,
            "brand": self.brand,
            "product_type": self.product_type,
            "vehicle_compatibility": self.vehicle_compatibility,
        }


class ProductCategory(db.Model):
    """Admin-managed spare-part categories."""

    __tablename__ = "product_categories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), unique=True, nullable=False, index=True)
    description = db.Column(db.String(255), default="")
    active = db.Column(db.Boolean, default=True, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=utcnow_naive)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "active": self.active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ProductBrand(db.Model):
    """Admin-managed spare-part brands/companies."""

    __tablename__ = "product_brands"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False, index=True)
    description = db.Column(db.String(255), default="")
    active = db.Column(db.Boolean, default=True, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=utcnow_naive)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "active": self.active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Vehicle(db.Model):
    """Vehicle master used for compatibility-first shopping flow."""

    __tablename__ = "vehicles"

    id = db.Column(db.Integer, primary_key=True)
    company = db.Column(db.String(120), nullable=False, index=True)
    model = db.Column(db.String(120), nullable=False, index=True)
    year = db.Column(db.Integer, nullable=False, index=True)
    variant = db.Column(db.String(120), default="", nullable=False)
    fuel_type = db.Column(db.String(40), default="", nullable=False)
    # car | bike
    vehicle_type = db.Column(db.String(16), default="car", nullable=False, index=True)
    image_url = db.Column(db.Text, default="")
    created_at = db.Column(db.DateTime, default=utcnow_naive)
    compatibility_mappings = db.relationship(
        "CompatibilityMapping",
        backref="vehicle",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )
    garage_entries = db.relationship(
        "UserGarage",
        backref="vehicle",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )

    def display_name(self) -> str:
        parts = [self.company, self.model, str(self.year)]
        if self.variant:
            parts.append(self.variant)
        if self.fuel_type:
            parts.append(self.fuel_type)
        return " ".join(parts)

    def to_dict(self):
        return {
            "id": self.id,
            "company": self.company,
            "model": self.model,
            "year": self.year,
            "variant": self.variant,
            "fuel_type": self.fuel_type,
            "vehicle_type": self.vehicle_type,
            "image_url": self.image_url,
            "display_name": self.display_name(),
        }


class CompatibilityMapping(db.Model):
    """Product-to-vehicle compatibility map managed by admin."""

    __tablename__ = "compatibility_mappings"
    __table_args__ = (
        db.UniqueConstraint("product_id", "vehicle_id", name="uq_product_vehicle_compatibility"),
    )

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False, index=True)
    vehicle_id = db.Column(db.Integer, db.ForeignKey("vehicles.id"), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=utcnow_naive, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "vehicle_id": self.vehicle_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class UserGarage(db.Model):
    """Saved vehicles per user for quick re-order journeys."""

    __tablename__ = "user_garage"
    __table_args__ = (
        db.UniqueConstraint("user_id", "vehicle_id", name="uq_user_vehicle_garage"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    vehicle_id = db.Column(db.Integer, db.ForeignKey("vehicles.id"), nullable=False, index=True)
    nickname = db.Column(db.String(120), default="", nullable=False)
    is_default = db.Column(db.Boolean, default=False, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=utcnow_naive, nullable=False)
    updated_at = db.Column(db.DateTime, default=utcnow_naive, onupdate=utcnow_naive)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "vehicle_id": self.vehicle_id,
            "nickname": self.nickname,
            "is_default": self.is_default,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "vehicle": self.vehicle.to_dict() if self.vehicle else None,
        }


class Order(db.Model):
    """Customer orders."""

    __tablename__ = "orders"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    total = db.Column(db.Numeric(12, 2), nullable=False)
    status = db.Column(db.String(32), default="pending", nullable=False)
    shipping_address = db.Column(db.Text, default="{}")
    created_at = db.Column(db.DateTime, default=utcnow_naive)

    items = db.relationship("OrderItem", backref="order", lazy="dynamic", cascade="all, delete-orphan")
    checkout_meta = db.relationship(
        "OrderMeta",
        backref="order",
        uselist=False,
        lazy="joined",
        cascade="all, delete-orphan",
    )


class OrderItem(db.Model):
    """Line items for an order."""

    __tablename__ = "order_items"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)

    product = db.relationship("Product")


class OrderMeta(db.Model):
    """Checkout financial breakdown and payment metadata for each order."""

    __tablename__ = "order_meta"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id"), nullable=False, unique=True, index=True)
    subtotal = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    gst_amount = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    shipping_amount = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    discount_amount = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    coupon_code = db.Column(db.String(40), nullable=True, index=True)
    payment_method = db.Column(db.String(20), nullable=False, default="cod")
    payment_status = db.Column(db.String(20), nullable=False, default="pending")
    created_at = db.Column(db.DateTime, default=utcnow_naive)

    def to_dict(self):
        return {
            "subtotal": float(self.subtotal or 0),
            "gst_amount": float(self.gst_amount or 0),
            "shipping_amount": float(self.shipping_amount or 0),
            "discount_amount": float(self.discount_amount or 0),
            "coupon_code": self.coupon_code,
            "payment_method": self.payment_method,
            "payment_status": self.payment_status,
        }


class Coupon(db.Model):
    """Simple coupon model for demo checkout discounts."""

    __tablename__ = "coupons"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(40), nullable=False, unique=True, index=True)
    description = db.Column(db.String(255), default="")
    # percent | fixed
    discount_type = db.Column(db.String(20), nullable=False, default="percent")
    value = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    min_order_amount = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    max_discount = db.Column(db.Numeric(12, 2), nullable=True)
    active = db.Column(db.Boolean, default=True, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=utcnow_naive)

    def compute_discount(self, subtotal: Decimal) -> Decimal:
        current = Decimal(str(subtotal or 0))
        if current <= 0:
            return Decimal("0")
        if current < Decimal(str(self.min_order_amount or 0)):
            return Decimal("0")
        if self.discount_type == "fixed":
            discount = Decimal(str(self.value or 0))
        else:
            discount = (current * Decimal(str(self.value or 0))) / Decimal("100")
        if self.max_discount is not None:
            discount = min(discount, Decimal(str(self.max_discount)))
        return max(Decimal("0"), min(discount, current))


class Address(db.Model):
    """User shipping addresses."""

    __tablename__ = "addresses"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    label = db.Column(db.String(80), default="Home")
    full_name = db.Column(db.String(120), default="")
    line1 = db.Column(db.String(255), nullable=False)
    line2 = db.Column(db.String(255), default="")
    city = db.Column(db.String(120), nullable=False)
    state = db.Column(db.String(120), nullable=False)
    postal_code = db.Column(db.String(20), nullable=False)
    country = db.Column(db.String(80), default="India")
    phone = db.Column(db.String(20), default="")
    is_default = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow_naive)
    updated_at = db.Column(db.DateTime, default=utcnow_naive, onupdate=utcnow_naive)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "label": self.label,
            "full_name": self.full_name,
            "line1": self.line1,
            "line2": self.line2,
            "city": self.city,
            "state": self.state,
            "postal_code": self.postal_code,
            "country": self.country,
            "phone": self.phone,
            "is_default": self.is_default,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class PasswordResetToken(db.Model):
    """Time-bound password reset tokens."""

    __tablename__ = "password_reset_tokens"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    token_hash = db.Column(db.String(64), nullable=False, index=True)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    used_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow_naive, index=True)

    @staticmethod
    def hash_token(raw_token: str) -> str:
        return hashlib.sha256((raw_token or "").encode("utf-8")).hexdigest()

    def mark_used(self) -> None:
        self.used_at = utcnow_naive()

    def is_expired(self) -> bool:
        return utcnow_naive() > self.expires_at


class UserHistory(db.Model):
    """
    Browsing and purchase signals for recommendations.
    action_type: 'view', 'purchase', 'search_click', 'cart_add'
    """

    __tablename__ = "user_history"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=True)
    action_type = db.Column(db.String(32), nullable=False)
    meta = db.Column(db.Text, default="")  # optional JSON string (e.g. search query)
    created_at = db.Column(db.DateTime, default=utcnow_naive, index=True)

    product = db.relationship("Product")
