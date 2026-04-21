from __future__ import annotations

from decimal import Decimal
from pathlib import Path

import pytest

from app import create_app
from app.extensions import db
from app.models import (
    CompatibilityMapping,
    Coupon,
    Product,
    ProductBrand,
    ProductCategory,
    User,
    Vehicle,
)


@pytest.fixture()
def app(tmp_path):
    db_path = tmp_path / "automart_test.db"
    upload_dir = tmp_path / "uploads"
    upload_dir.mkdir(exist_ok=True)

    class TestConfig:
        TESTING = True
        SECRET_KEY = "test-secret"
        SQLALCHEMY_DATABASE_URI = f"sqlite:///{db_path}"
        SQLALCHEMY_TRACK_MODIFICATIONS = False
        FLASK_DEBUG = False
        SEED_ON_STARTUP = False
        AUTO_REINDEX_ON_STARTUP = False
        OPENAI_API_KEY = ""
        AI_DISABLED = True
        EXPOSE_RESET_TOKEN = True
        AI_EMBED_FOR_SMART_SEARCH = False
        WEB_ROOT = Path(__file__).resolve().parents[2] / "website"
        UPLOAD_FOLDER = upload_dir
        MAX_CONTENT_LENGTH = 8 * 1024 * 1024
        SESSION_COOKIE_SAMESITE = "Lax"
        SESSION_COOKIE_SECURE = False
        REMEMBER_COOKIE_SAMESITE = "Lax"
        REMEMBER_COOKIE_SECURE = False

    app = create_app(TestConfig)

    with app.app_context():
        admin = User(email="admin@automart.local", name="Admin", is_admin=True)
        admin.set_password("admin123")
        demo = User(email="demo@automart.local", name="Demo User", is_admin=False)
        demo.set_password("demo123")
        db.session.add_all([admin, demo])

        cat_engine = ProductCategory(name="engine", description="Engine parts", active=True)
        cat_brake = ProductCategory(name="brake", description="Brake parts", active=True)
        db.session.add_all([cat_engine, cat_brake])

        brand_bosch = ProductBrand(name="Bosch", description="Electrical and filters", active=True)
        brand_castrol = ProductBrand(name="Castrol", description="Lubricants", active=True)
        db.session.add_all([brand_bosch, brand_castrol])

        car = Vehicle(
            company="Honda",
            model="City",
            year=2020,
            variant="VX",
            fuel_type="Petrol",
            vehicle_type="car",
        )
        bike = Vehicle(
            company="Hero",
            model="Splendor Plus",
            year=2024,
            variant="XTEC",
            fuel_type="Petrol",
            vehicle_type="bike",
        )
        db.session.add_all([car, bike])
        db.session.flush()

        p1 = Product(
            name="Front Brake Pads - Honda City",
            slug="front-brake-pads-honda-city",
            description="Ceramic brake pads for Honda City",
            category="brake",
            price=Decimal("2499.00"),
            stock=20,
            image_url="",
            brand="Bosch",
            product_type="vehicleSpecific",
            vehicle_compatibility="Honda City 2020 VX Petrol",
            embedding_json="",
        )
        p2 = Product(
            name="Synthetic Engine Oil 5W-30 (4L)",
            slug="synthetic-engine-oil-5w-30-4l",
            description="Universal synthetic engine oil",
            category="engine",
            price=Decimal("1899.00"),
            stock=50,
            image_url="",
            brand="Castrol",
            product_type="universal",
            vehicle_compatibility="Most petrol cars",
            embedding_json="",
        )
        db.session.add_all([p1, p2])
        db.session.flush()

        db.session.add(CompatibilityMapping(product_id=p1.id, vehicle_id=car.id))
        db.session.add(
            Coupon(
                code="TEST10",
                description="10 percent off",
                discount_type="percent",
                value=Decimal("10"),
                min_order_amount=Decimal("0"),
                max_discount=Decimal("500"),
                active=True,
            )
        )
        db.session.commit()

    yield app

    with app.app_context():
        db.session.remove()


@pytest.fixture()
def client(app):
    return app.test_client()


def login(client, email: str, password: str):
    return client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
