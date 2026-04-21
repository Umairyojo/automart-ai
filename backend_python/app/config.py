"""
Application configuration.
Loads environment variables; supports SQLite (default) or MySQL via DATABASE_URL.
"""
import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from backend_python directory
load_dotenv(Path(__file__).resolve().parent.parent / ".env")


class Config:
    """Flask + SQLAlchemy settings."""

    SECRET_KEY = os.environ.get("FLASK_SECRET_KEY") or "dev-only-change-in-production"
    # Instance folder for SQLite file
    BASE_DIR = Path(__file__).resolve().parent.parent
    INSTANCE_PATH = BASE_DIR / "instance"
    INSTANCE_PATH.mkdir(exist_ok=True)

    _db_url = os.environ.get("DATABASE_URL", "").strip()
    if _db_url:
        SQLALCHEMY_DATABASE_URI = _db_url
    else:
        SQLALCHEMY_DATABASE_URI = f"sqlite:///{INSTANCE_PATH / 'spare_parts.db'}"

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Runtime / startup behavior
    FLASK_DEBUG = os.environ.get("FLASK_DEBUG", "0") == "1"
    SEED_ON_STARTUP = os.environ.get("SEED_ON_STARTUP", "1") == "1"
    # Keep disabled by default to avoid slow startup with network-bound embedding calls.
    AUTO_REINDEX_ON_STARTUP = os.environ.get("AUTO_REINDEX_ON_STARTUP", "0") == "1"

    # OpenAI
    OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
    AI_DISABLED = os.environ.get("AI_DISABLED", "0") == "1"
    EXPOSE_RESET_TOKEN = os.environ.get("EXPOSE_RESET_TOKEN", "1") == "1"
    AI_CHAT_MODEL = os.environ.get("AI_CHAT_MODEL", "gpt-4o-mini")
    AI_EMBED_MODEL = os.environ.get("AI_EMBED_MODEL", "text-embedding-3-small")
    AI_CHAT_MAX_TOKENS = int(os.environ.get("AI_CHAT_MAX_TOKENS", "120"))
    AI_CHAT_TEMPERATURE = float(os.environ.get("AI_CHAT_TEMPERATURE", "0.2"))
    AI_CHAT_CACHE_SECONDS = int(os.environ.get("AI_CHAT_CACHE_SECONDS", "900"))
    AI_CHAT_CACHE_MAX_ENTRIES = int(os.environ.get("AI_CHAT_CACHE_MAX_ENTRIES", "300"))
    AI_EMBED_CACHE_SECONDS = int(os.environ.get("AI_EMBED_CACHE_SECONDS", "86400"))
    AI_EMBED_CACHE_MAX_ENTRIES = int(os.environ.get("AI_EMBED_CACHE_MAX_ENTRIES", "500"))
    AI_EMBED_FOR_SMART_SEARCH = os.environ.get("AI_EMBED_FOR_SMART_SEARCH", "0") == "1"
    AI_CHAT_RATE_LIMIT_PER_10_MIN = int(os.environ.get("AI_CHAT_RATE_LIMIT_PER_10_MIN", "25"))
    AI_CHAT_QUOTA_COOLDOWN_SECONDS = int(
        os.environ.get("AI_CHAT_QUOTA_COOLDOWN_SECONDS", "1800")
    )
    AI_CHAT_RATE_LIMIT_COOLDOWN_SECONDS = int(
        os.environ.get("AI_CHAT_RATE_LIMIT_COOLDOWN_SECONDS", "90")
    )

    # Payments (Razorpay sandbox/prod)
    RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "").strip()
    RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "").strip()
    RAZORPAY_CURRENCY = os.environ.get("RAZORPAY_CURRENCY", "INR").strip().upper() or "INR"

    # Media uploads (Cloudinary preferred for free hosting, local fallback for dev)
    PUBLIC_BACKEND_URL = os.environ.get("PUBLIC_BACKEND_URL", "").strip()
    CLOUDINARY_CLOUD_NAME = os.environ.get("CLOUDINARY_CLOUD_NAME", "").strip()
    CLOUDINARY_API_KEY = os.environ.get("CLOUDINARY_API_KEY", "").strip()
    CLOUDINARY_API_SECRET = os.environ.get("CLOUDINARY_API_SECRET", "").strip()
    CLOUDINARY_UPLOAD_FOLDER = os.environ.get("CLOUDINARY_UPLOAD_FOLDER", "automart")
    IMAGE_MAX_MB = int(os.environ.get("IMAGE_MAX_MB", "6"))
    RAW_IMAGE_MAX_MB = int(os.environ.get("RAW_IMAGE_MAX_MB", "20"))

    # Website static files (vanilla HTML/CSS/JS) — sibling folder at project root
    WEB_ROOT = BASE_DIR.parent / "website"

    # Uploaded images for optional image search
    UPLOAD_FOLDER = INSTANCE_PATH / "uploads"
    UPLOAD_FOLDER.mkdir(exist_ok=True)
    MAX_CONTENT_LENGTH = RAW_IMAGE_MAX_MB * 1024 * 1024
    SESSION_COOKIE_SAMESITE = os.environ.get("SESSION_COOKIE_SAMESITE", "Lax")
    SESSION_COOKIE_SECURE = os.environ.get("SESSION_COOKIE_SECURE", "0") == "1"
    REMEMBER_COOKIE_SAMESITE = os.environ.get("REMEMBER_COOKIE_SAMESITE", "Lax")
    REMEMBER_COOKIE_SECURE = os.environ.get("REMEMBER_COOKIE_SECURE", "0") == "1"
