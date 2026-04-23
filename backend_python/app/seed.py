"""
Seed demo data for AutoMart.
"""
import json
import re
from typing import Any

from flask import Flask

from .extensions import db
from .models import Coupon, Product, ProductBrand, ProductCategory, User, Vehicle

DEMO_VEHICLES: list[tuple[str, str, int, str, str]] = [
    ("Maruti Suzuki", "Swift", 2023, "ZXI", "Petrol"),
    ("Maruti Suzuki", "Brezza", 2022, "VXI", "Petrol"),
    ("Maruti Suzuki", "Baleno", 2024, "Alpha", "Petrol"),
    ("Hyundai", "Creta", 2022, "SX", "Diesel"),
    ("Hyundai", "i20", 2021, "Asta", "Petrol"),
    ("Hyundai", "Verna", 2023, "SX(O)", "Petrol"),
    ("Tata", "Nexon", 2023, "Fearless", "Petrol"),
    ("Tata", "Punch", 2024, "Adventure", "Petrol"),
    ("Mahindra", "XUV700", 2023, "AX7", "Diesel"),
    ("Mahindra", "Scorpio N", 2024, "Z8", "Diesel"),
    ("Honda", "City", 2020, "VX", "Petrol"),
    ("Honda", "City", 2021, "ZX", "Petrol"),
    ("Toyota", "Innova Hycross", 2024, "ZX", "Petrol"),
    ("Toyota", "Fortuner", 2023, "4x2", "Diesel"),
    ("Kia", "Seltos", 2023, "HTX", "Petrol"),
    ("Skoda", "Slavia", 2024, "Style", "Petrol"),
    ("Volkswagen", "Virtus", 2023, "Highline", "Petrol"),
    ("Hero", "Splendor Plus", 2024, "XTEC", "Petrol"),
    ("Honda", "Activa", 2024, "6G", "Petrol"),
    ("Honda", "Shine", 2023, "125", "Petrol"),
    ("TVS", "Apache", 2023, "RTR 200", "Petrol"),
    ("TVS", "Raider", 2024, "125", "Petrol"),
    ("Bajaj", "Pulsar", 2023, "N160", "Petrol"),
    ("Bajaj", "Pulsar", 2022, "NS200", "Petrol"),
    ("Yamaha", "R15", 2023, "V4", "Petrol"),
    ("Royal Enfield", "Classic 350", 2024, "Signals", "Petrol"),
    ("Suzuki", "Gixxer", 2023, "SF", "Petrol"),
    ("KTM", "Duke", 2024, "200", "Petrol"),
]


def slugify(name: str) -> str:
    s = re.sub(r"[^\w\s-]", "", name.lower())
    s = re.sub(r"[-\s]+", "-", s).strip("-")
    return s[:200] or "item"


def _ensure_demo_vehicles() -> None:
    bike_companies = {"hero", "tvs", "bajaj", "yamaha", "royal enfield", "ktm"}
    bike_model_tokens = ("activa", "shine", "apache", "raider", "pulsar", "r15", "classic", "gixxer", "duke")

    def infer_vehicle_type(company_name: str, model_name: str) -> str:
        c = company_name.strip().lower()
        m = model_name.strip().lower()
        if c in bike_companies or any(token in m for token in bike_model_tokens):
            return "bike"
        return "car"

    existing = {
        (
            (v.company or "").strip().lower(),
            (v.model or "").strip().lower(),
            int(v.year),
            (v.variant or "").strip().lower(),
            (v.fuel_type or "").strip().lower(),
        )
        for v in Vehicle.query.all()
    }

    added = 0
    for company, model, year, variant, fuel_type in DEMO_VEHICLES:
        key = (
            company.strip().lower(),
            model.strip().lower(),
            int(year),
            variant.strip().lower(),
            fuel_type.strip().lower(),
        )
        if key in existing:
            continue
        db.session.add(
            Vehicle(
                company=company,
                model=model,
                year=year,
                variant=variant,
                fuel_type=fuel_type,
                vehicle_type=infer_vehicle_type(company, model),
            )
        )
        existing.add(key)
        added += 1

    if added:
        db.session.commit()


def _ensure_default_categories() -> None:
    defaults = [
        ("engine", "Engine and lubrication parts"),
        ("brake", "Brake pads, discs and braking items"),
        ("electrical", "Battery, bulbs and electrical components"),
        ("accessories", "Interior and exterior accessories"),
    ]
    existing = {c.name.lower() for c in ProductCategory.query.all()}
    changed = False
    for name, description in defaults:
        if name in existing:
            continue
        db.session.add(
            ProductCategory(
                name=name,
                description=description,
                active=True,
            )
        )
        changed = True
    if changed:
        db.session.commit()


def _ensure_default_brands() -> None:
    defaults = [
        ("3M", "Automotive accessories and care"),
        ("Amaron", "Automotive batteries"),
        ("AutoKraft", "Seat covers and interior trims"),
        ("Bobo", "Motorcycle accessories"),
        ("Bosch", "Filters, electrical and brake components"),
        ("Brembo", "Braking systems and pads"),
        ("Castrol", "Engine oils and lubricants"),
        ("Denso", "Electrical and ignition components"),
        ("EBC", "Brake pads for bikes"),
        ("Motul", "Bike and car engine oils"),
        ("NGK", "Spark plugs"),
        ("Philips", "Lighting and electricals"),
        ("Rolon", "Chain and sprocket kits"),
    ]

    existing = {b.name.strip().lower(): b for b in ProductBrand.query.all() if (b.name or "").strip()}
    changed = False

    for name, description in defaults:
        key = name.strip().lower()
        if key in existing:
            continue
        db.session.add(ProductBrand(name=name, description=description, active=True))
        existing[key] = None
        changed = True

    # Also include any already-used product brand so admin can manage legacy data.
    for raw in Product.query.with_entities(Product.brand).all():
        brand_name = (raw[0] or "").strip()
        if not brand_name:
            continue
        key = brand_name.lower()
        if key in existing:
            continue
        db.session.add(ProductBrand(name=brand_name, description="", active=True))
        existing[key] = None
        changed = True

    if changed:
        db.session.commit()


def _ensure_demo_coupons() -> None:
    rows = [
        {
            "code": "AUTOMART10",
            "description": "10% off up to Rs 500",
            "discount_type": "percent",
            "value": 10,
            "min_order_amount": 999,
            "max_discount": 500,
            "active": True,
        },
        {
            "code": "SAVE250",
            "description": "Flat Rs 250 off on orders above Rs 1999",
            "discount_type": "fixed",
            "value": 250,
            "min_order_amount": 1999,
            "max_discount": None,
            "active": True,
        },
    ]

    existing_codes = {c.code.upper() for c in Coupon.query.all()}
    added = 0
    for row in rows:
        code = str(row["code"]).upper()
        if code in existing_codes:
            continue
        db.session.add(Coupon(**{**row, "code": code}))
        existing_codes.add(code)
        added += 1
    if added:
        db.session.commit()


def ensure_bootstrap_admin(app: Flask) -> None:
    """
    Ensure a usable admin account always exists, especially on free hosting
    where local SQLite data can be reset.
    """
    with app.app_context():
        admin_email = str(app.config.get("ADMIN_EMAIL") or "admin@automart.local").strip().lower()
        admin_name = str(app.config.get("ADMIN_NAME") or "Admin").strip() or "Admin"
        admin_password = str(app.config.get("ADMIN_PASSWORD") or "admin123")
        force_password_reset = bool(app.config.get("ADMIN_FORCE_PASSWORD_RESET", False))

        user = User.query.filter_by(email=admin_email).first()
        changed = False
        if not user:
            user = User(email=admin_email, name=admin_name, is_admin=True, is_blocked=False)
            user.set_password(admin_password)
            db.session.add(user)
            changed = True
        else:
            if not user.is_admin:
                user.is_admin = True
                changed = True
            if user.is_blocked:
                user.is_blocked = False
                changed = True
            if (user.name or "").strip() != admin_name:
                user.name = admin_name
                changed = True
            if force_password_reset:
                user.set_password(admin_password)
                changed = True

        if changed:
            db.session.commit()


def seed_if_empty(app: Flask) -> None:
    """Create users, vehicles, and products when tables are empty."""
    with app.app_context():
        admin_email = str(app.config.get("ADMIN_EMAIL") or "admin@automart.local").strip().lower()
        admin_name = str(app.config.get("ADMIN_NAME") or "Admin").strip() or "Admin"
        admin_password = str(app.config.get("ADMIN_PASSWORD") or "admin123")
        admin = User.query.filter_by(email=admin_email).first()
        if not admin:
            admin = User(email=admin_email, name=admin_name, is_admin=True)
            admin.set_password(admin_password)
            db.session.add(admin)

        demo = User.query.filter_by(email="demo@automart.local").first()
        if not demo:
            demo = User(email="demo@automart.local", name="Demo User", is_admin=False)
            demo.set_password("demo123")
            db.session.add(demo)
        db.session.commit()

        _ensure_demo_vehicles()
        _ensure_demo_coupons()
        _ensure_default_categories()
        _ensure_default_brands()

        samples: list[dict[str, Any]] = [
            {
                "name": "Synthetic Engine Oil 5W-30 (4L)",
                "category": "engine",
                "brand": "Castrol",
                "product_type": "universal",
                "price": 1899.00,
                "stock": 120,
                "vehicle_compatibility": "Most petrol cars; Maruti Suzuki, Hyundai, Honda, Toyota",
                "description": "Full synthetic motor oil for daily city and highway driving.",
            },
            {
                "name": "Air Filter - Compact Cars",
                "category": "engine",
                "brand": "Bosch",
                "product_type": "vehicleSpecific",
                "price": 649.00,
                "stock": 200,
                "vehicle_compatibility": "Maruti Suzuki Swift, Baleno; Hyundai i20; Honda City",
                "description": "High-flow air filter element for compact petrol engines.",
            },
            {
                "name": "Bike Engine Oil 10W-40 (1L)",
                "category": "engine",
                "brand": "Motul",
                "product_type": "companyBranded",
                "price": 699.00,
                "stock": 300,
                "vehicle_compatibility": "Yamaha, Bajaj, TVS, Hero, Honda commuter and sports bikes",
                "description": "Semi-synthetic oil for smooth bike engine performance.",
            },
            {
                "name": "Spark Plug Set Iridium (4 pcs)",
                "category": "engine",
                "brand": "NGK",
                "product_type": "vehicleSpecific",
                "price": 2199.00,
                "stock": 80,
                "vehicle_compatibility": "Honda City, Hyundai Verna, Skoda Slavia, Volkswagen Virtus",
                "description": "Iridium spark plugs for improved combustion and pickup.",
            },
            {
                "name": "Front Brake Pads - Maruti Suzuki",
                "category": "brake",
                "brand": "Brembo",
                "product_type": "vehicleSpecific",
                "price": 2499.00,
                "stock": 45,
                "vehicle_compatibility": "Maruti Suzuki Swift, Baleno, Brezza",
                "description": "Low-noise ceramic front brake pads for city use.",
            },
            {
                "name": "Front Brake Pads - Hyundai",
                "category": "brake",
                "brand": "Bosch",
                "product_type": "vehicleSpecific",
                "price": 2599.00,
                "stock": 52,
                "vehicle_compatibility": "Hyundai Creta, i20, Verna",
                "description": "Durable brake pads with stable braking performance.",
            },
            {
                "name": "Bike Disc Brake Pads (Pair)",
                "category": "brake",
                "brand": "EBC",
                "product_type": "companyBranded",
                "price": 849.00,
                "stock": 150,
                "vehicle_compatibility": "Yamaha R15, TVS Apache, Bajaj Pulsar, KTM Duke",
                "description": "Replacement disc pads for front or rear callipers.",
            },
            {
                "name": "12V Car Battery 60Ah",
                "category": "electrical",
                "brand": "Amaron",
                "product_type": "universal",
                "price": 5799.00,
                "stock": 25,
                "vehicle_compatibility": "Most hatchbacks and sedans including Maruti, Tata, Hyundai, Honda",
                "description": "Maintenance-free long-life battery for daily use.",
            },
            {
                "name": "Headlight Bulb H7 (Pair)",
                "category": "electrical",
                "brand": "Philips",
                "product_type": "companyBranded",
                "price": 999.00,
                "stock": 90,
                "vehicle_compatibility": "Models using H7 socket across multiple companies",
                "description": "Standard halogen replacement bulbs for night visibility.",
            },
            {
                "name": "Alternator 120A - Honda City",
                "category": "electrical",
                "brand": "Denso",
                "product_type": "vehicleSpecific",
                "price": 12499.00,
                "stock": 12,
                "vehicle_compatibility": "Honda City 2020-2022",
                "description": "Remanufactured alternator with warranty support.",
            },
            {
                "name": "Rubber Floor Mats (4-piece)",
                "category": "accessories",
                "brand": "3M",
                "product_type": "universal",
                "price": 1599.00,
                "stock": 60,
                "vehicle_compatibility": "Universal trim-to-fit for hatchback and sedan cars",
                "description": "All-weather mats with anti-skid texture.",
            },
            {
                "name": "Bike Phone Mount - Handlebar",
                "category": "accessories",
                "brand": "Bobo",
                "product_type": "companyBranded",
                "price": 549.00,
                "stock": 100,
                "vehicle_compatibility": "Motorcycles and scooters from all major companies",
                "description": "Tool-free mount with vibration-resistant lock.",
            },
            {
                "name": "Seat Cover Set - Tata and Mahindra SUVs",
                "category": "accessories",
                "brand": "AutoKraft",
                "product_type": "vehicleSpecific",
                "price": 3499.00,
                "stock": 35,
                "vehicle_compatibility": "Tata Nexon, Tata Punch, Mahindra XUV700, Scorpio N",
                "description": "Premium stitched seat covers with dual-tone finish.",
            },
            {
                "name": "Chain and Sprocket Kit - 150cc to 200cc",
                "category": "engine",
                "brand": "Rolon",
                "product_type": "vehicleSpecific",
                "price": 2190.00,
                "stock": 40,
                "vehicle_compatibility": "Yamaha R15, Bajaj Pulsar NS200, TVS Apache RTR 200, KTM Duke 200",
                "description": "Hardened steel sprocket set with sealed chain.",
            },
        ]

        existing_slugs = {row.slug for row in Product.query.with_entities(Product.slug).all()}
        added_products = 0

        for row in samples:
            slug = slugify(row["name"])
            if slug in existing_slugs:
                continue
            p = Product(
                name=row["name"],
                slug=slug,
                description=row["description"],
                category=row["category"],
                brand=row.get("brand", ""),
                product_type=row.get("product_type", "vehicleSpecific"),
                price=row["price"],
                stock=row["stock"],
                image_url="",
                vehicle_compatibility=row["vehicle_compatibility"],
                embedding_json="",
            )
            db.session.add(p)
            existing_slugs.add(slug)
            added_products += 1

        if added_products:
            db.session.commit()


def reindex_product_embeddings(app: Flask) -> int:
    """Compute and store embeddings for all products."""
    from . import ai_service

    updated = 0
    with app.app_context():
        for p in Product.query.all():
            text = (
                f"{p.name}. {p.description}. Category: {p.category}. "
                f"Brand: {p.brand}. Type: {p.product_type}. Fits: {p.vehicle_compatibility}"
            )
            vec = ai_service.embed_text(text)
            if vec:
                p.embedding_json = json.dumps(vec)
                updated += 1
        db.session.commit()
    return updated
