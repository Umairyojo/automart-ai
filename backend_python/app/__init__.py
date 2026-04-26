"""
Flask application factory: DB, auth, API blueprints, and static website hosting.
"""
import os
import time

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_login import current_user, logout_user
from sqlalchemy import inspect, text
from werkzeug.exceptions import RequestEntityTooLarge

from .config import Config
from .extensions import db, login_manager
from .models import User


def _ensure_schema_columns() -> None:
    """
    Lightweight schema guard for local demo DBs where migrations are not configured.
    Adds missing columns used by new product flows.
    """
    insp = inspect(db.engine)
    to_add: list[str] = []
    tables = set(insp.get_table_names())

    if "products" in tables:
        cols = {c["name"] for c in insp.get_columns("products")}
        if "brand" not in cols:
            to_add.append("ALTER TABLE products ADD COLUMN brand TEXT DEFAULT ''")
        if "product_type" not in cols:
            to_add.append(
                "ALTER TABLE products ADD COLUMN product_type TEXT DEFAULT 'vehicleSpecific'"
            )
        for col in insp.get_columns("products"):
            if col["name"] == "image_url" and "VARCHAR" in str(col.get("type", "")).upper():
                dialect = db.engine.dialect.name
                if dialect == "postgresql":
                    to_add.append("ALTER TABLE products ALTER COLUMN image_url TYPE TEXT")
                elif dialect in {"mysql", "mariadb"}:
                    to_add.append("ALTER TABLE products MODIFY image_url TEXT")

    if "vehicles" in tables:
        cols = {c["name"] for c in insp.get_columns("vehicles")}
        if "vehicle_type" not in cols:
            to_add.append("ALTER TABLE vehicles ADD COLUMN vehicle_type TEXT DEFAULT 'car'")
        if "image_url" not in cols:
            to_add.append("ALTER TABLE vehicles ADD COLUMN image_url TEXT DEFAULT ''")
        for col in insp.get_columns("vehicles"):
            if col["name"] == "image_url" and "VARCHAR" in str(col.get("type", "")).upper():
                dialect = db.engine.dialect.name
                if dialect == "postgresql":
                    to_add.append("ALTER TABLE vehicles ALTER COLUMN image_url TYPE TEXT")
                elif dialect in {"mysql", "mariadb"}:
                    to_add.append("ALTER TABLE vehicles MODIFY image_url TEXT")

    if "users" in tables:
        cols = {c["name"] for c in insp.get_columns("users")}
        if "is_blocked" not in cols:
            to_add.append("ALTER TABLE users ADD COLUMN is_blocked BOOLEAN DEFAULT 0")

    for stmt in to_add:
        db.session.execute(text(stmt))
    if to_add:
        db.session.commit()


def _normalize_product_metadata() -> None:
    """Backfill brand/product_type for older rows created before these fields existed."""
    from .models import Product

    changed = False
    rows = Product.query.all()
    for p in rows:
        current_brand = (p.brand or "").strip()
        if not current_brand:
            p.brand = "Generic"
            changed = True

        current_type = (p.product_type or "").strip()
        if current_type not in ("vehicleSpecific", "universal", "companyBranded"):
            blob = f"{p.name} {p.vehicle_compatibility}".lower()
            if "universal" in blob or "most " in blob:
                p.product_type = "universal"
            elif any(k in blob for k in ("pair", "set", "oil", "bulb", "mount")):
                p.product_type = "companyBranded"
            else:
                p.product_type = "vehicleSpecific"
            changed = True

    universal_count = (
        Product.query.filter(Product.product_type == "universal").count() if rows else 0
    )
    if rows and universal_count == 0:
        # Guarantee a baseline universal catalog for vehicle flows.
        for p in rows[: min(3, len(rows))]:
            p.product_type = "universal"
            changed = True

    if changed:
        db.session.commit()


def _normalize_product_prices_for_inr() -> None:
    """
    Migrate old demo datasets that were seeded in USD-like values to INR-like values.
    Heuristic: if all prices are low (sub-1000), scale once by a fixed factor.
    """
    from .models import Product

    rows = Product.query.all()
    if not rows:
        return

    highest = max(float(p.price or 0) for p in rows)
    if highest >= 1000:
        return

    for p in rows:
        p.price = round(float(p.price or 0) * 85.0, 2)
    db.session.commit()


def _normalize_vehicle_types() -> None:
    """Backfill vehicle_type for rows created before this field existed."""
    from .models import Vehicle

    bike_companies = {
        "hero",
        "tvs",
        "bajaj",
        "yamaha",
        "royal enfield",
        "ktm",
    }
    bike_model_tokens = (
        "splendor",
        "xtreme",
        "glamour",
        "activa",
        "shine",
        "apache",
        "raider",
        "pulsar",
        "r15",
        "classic",
        "hunter",
        "meteor",
        "gixxer",
        "duke",
        "rc ",
    )

    changed = False
    for v in Vehicle.query.all():
        current = (v.vehicle_type or "").strip().lower()
        company = (v.company or "").strip().lower()
        model = (v.model or "").strip().lower()
        expected = "bike" if (company in bike_companies or any(t in model for t in bike_model_tokens)) else "car"

        if current not in {"car", "bike"}:
            v.vehicle_type = expected
            changed = True
        elif current == "car" and expected == "bike":
            # Backfill old rows created before vehicle_type existed.
            v.vehicle_type = "bike"
            changed = True

    if changed:
        db.session.commit()


def _bootstrap_compatibility_mappings() -> None:
    """
    One-time bootstrap for legacy data: create compatibility mappings by matching
    product compatibility text against known vehicle company + model names.
    """
    from .models import CompatibilityMapping, Product, Vehicle

    if CompatibilityMapping.query.first():
        return

    vehicles = Vehicle.query.all()
    if not vehicles:
        return

    created = 0
    for product in Product.query.filter(Product.product_type == "vehicleSpecific").all():
        blob = (product.vehicle_compatibility or "").lower()
        if not blob:
            continue
        for vehicle in vehicles:
            company = (vehicle.company or "").strip().lower()
            model = (vehicle.model or "").strip().lower()
            if not company or not model:
                continue
            if company in blob and model in blob:
                db.session.add(
                    CompatibilityMapping(product_id=product.id, vehicle_id=vehicle.id)
                )
                created += 1
    if created:
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()


def create_app(config_class: type = Config) -> Flask:
    app = Flask(__name__, static_folder=None)
    app.config.from_object(config_class)

    # Allow credentialed requests from the frontend origin during split-host development.
    allowed_origin = os.environ.get("ORIGIN", "http://localhost:3000")
    CORS(app, resources={r"/api/*": {"origins": [allowed_origin]}}, supports_credentials=True)

    db.init_app(app)
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id: str):
        return db.session.get(User, int(user_id))

    @login_manager.unauthorized_handler
    def _unauthorized():
        return jsonify({"error": "login required"}), 401

    @app.before_request
    def _blocked_user_guard():
        if not current_user.is_authenticated:
            return None
        if not getattr(current_user, "is_blocked", False):
            return None
        logout_user()
        if request.path.startswith("/api"):
            return jsonify({"error": "account blocked by admin"}), 403
        return jsonify({"error": "account blocked by admin"}), 403

    @app.errorhandler(RequestEntityTooLarge)
    def _handle_request_too_large(_: RequestEntityTooLarge):
        max_mb = int(app.config.get("RAW_IMAGE_MAX_MB", 20))
        return jsonify({"error": f"file too large (max {max_mb}MB)"}), 413

    # API blueprints
    from .api_admin import bp as admin_bp
    from .api_ai import bp as ai_bp
    from .api_auth import bp as auth_bp
    from .api_shop import bp as shop_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(shop_bp)
    app.register_blueprint(ai_bp)
    app.register_blueprint(admin_bp)

    web_root = app.config.get("WEB_ROOT") or ""
    uploads_root = app.config.get("UPLOAD_FOLDER")

    @app.route("/api/health", methods=["GET"])
    def api_health():
        from . import ai_service

        cloudinary_configured = bool(
            (app.config.get("CLOUDINARY_CLOUD_NAME") or "").strip()
            and (app.config.get("CLOUDINARY_API_KEY") or "").strip()
            and (app.config.get("CLOUDINARY_API_SECRET") or "").strip()
        )
        database_url_configured = bool(os.environ.get("DATABASE_URL", "").strip())
        public_backend_url = str(app.config.get("PUBLIC_BACKEND_URL") or "")
        deployed_like = bool(os.environ.get("RENDER") or public_backend_url.startswith("https://"))

        return jsonify(
            {
                "ok": True,
                "service": "AutoMart Backend",
                "ai_enabled": bool(ai_service.ai_enabled()),
                "embed_enabled": bool(app.config.get("AI_EMBED_FOR_SMART_SEARCH", False)),
                "database_url_configured": database_url_configured,
                "cloudinary_configured": cloudinary_configured,
                "local_uploads_ephemeral_risk": bool(deployed_like and not cloudinary_configured),
                "razorpay_enabled": bool(
                    (app.config.get("RAZORPAY_KEY_ID") or "").strip()
                    and (app.config.get("RAZORPAY_KEY_SECRET") or "").strip()
                ),
            }
        )

    @app.route("/uploads/<path:filename>")
    def serve_upload(filename: str):
        return send_from_directory(uploads_root, filename)

    @app.route("/")
    def serve_index():
        return send_from_directory(web_root, "index.html")

    @app.route("/<path:filename>")
    def serve_site(filename: str):
        # Do not shadow API routes (should not overlap if filename never 'api')
        if filename.startswith("api"):
            return jsonify({"error": "not found"}), 404
        path = os.path.join(web_root, filename)
        if os.path.isfile(path):
            return send_from_directory(web_root, filename)
        # Optional SPA-style: unknown paths -> index (not used for multi-page site)
        return jsonify({"error": "not found"}), 404

    with app.app_context():
        t0 = time.perf_counter()
        db.create_all()
        _ensure_schema_columns()
        _normalize_product_metadata()
        from .seed import ensure_bootstrap_admin, reindex_product_embeddings, seed_if_empty

        if app.config.get("SEED_ON_STARTUP", True):
            seed_if_empty(app)
        if not app.config.get("TESTING", False):
            ensure_bootstrap_admin(app)
        _normalize_product_prices_for_inr()
        _normalize_vehicle_types()
        _bootstrap_compatibility_mappings()

        # Optional, disabled by default because network calls can slow startup significantly.
        if (
            app.config.get("AUTO_REINDEX_ON_STARTUP")
            and app.config.get("OPENAI_API_KEY")
            and not app.config.get("AI_DISABLED")
        ):
            from .models import Product

            n_products = Product.query.count()
            n_indexed = Product.query.filter(Product.embedding_json != "").count()
            if n_products > 0 and n_indexed == 0:
                try:
                    reindex_product_embeddings(app)
                except Exception:
                    app.logger.exception("Initial embedding index skipped")
        app.logger.info("Startup init completed in %.2fs", time.perf_counter() - t0)

    return app
