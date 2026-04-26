"""Image upload helpers with Cloudinary-first and local-folder fallback."""
from __future__ import annotations

import hashlib
import io
import os
import secrets
import time
from pathlib import Path
from typing import Any

import requests
from flask import current_app
from PIL import Image, ImageOps
from werkzeug.datastructures import FileStorage

ALLOWED_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
TARGET_SIZE = (1200, 900)  # 4:3 crop for catalog cards


def _normalize_ext(filename: str) -> str:
    ext = (Path(filename or "").suffix or "").lower().strip()
    if ext == ".jpeg":
        return ".jpg"
    return ext


def _validate_file(file: FileStorage) -> str:
    if not file or not file.filename:
        raise ValueError("image file is required")
    ext = _normalize_ext(file.filename)
    if ext not in ALLOWED_EXTS:
        raise ValueError("allowed image types: jpg, png, webp")
    return ext


def _prepare_image(file: FileStorage) -> tuple[bytes, str, tuple[int, int]]:
    try:
        image = Image.open(file.stream)
    except Exception as exc:  # pragma: no cover - pillow handles parsing
        raise ValueError("invalid image file") from exc

    image = ImageOps.exif_transpose(image)
    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")
    elif image.mode == "L":
        image = image.convert("RGB")

    fitted = ImageOps.fit(image, TARGET_SIZE, method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
    out = io.BytesIO()
    fitted.save(out, format="JPEG", quality=85, optimize=True)
    data = out.getvalue()

    max_bytes = int(current_app.config.get("IMAGE_MAX_MB", 6)) * 1024 * 1024
    if len(data) > max_bytes:
        raise ValueError(f"image too large after processing (max {current_app.config.get('IMAGE_MAX_MB', 6)}MB)")
    return data, "image/jpeg", fitted.size


def _cloudinary_ready() -> bool:
    return bool(
        current_app.config.get("CLOUDINARY_CLOUD_NAME")
        and current_app.config.get("CLOUDINARY_API_KEY")
        and current_app.config.get("CLOUDINARY_API_SECRET")
    )


def _upload_cloudinary(image_bytes: bytes, folder_hint: str) -> dict[str, Any]:
    cloud = current_app.config["CLOUDINARY_CLOUD_NAME"]
    api_key = current_app.config["CLOUDINARY_API_KEY"]
    api_secret = current_app.config["CLOUDINARY_API_SECRET"]
    root_folder = (current_app.config.get("CLOUDINARY_UPLOAD_FOLDER") or "automart").strip("/")
    folder = f"{root_folder}/{folder_hint}".strip("/")
    timestamp = int(time.time())

    # Cloudinary signed upload
    sign_payload = f"folder={folder}&timestamp={timestamp}{api_secret}"
    signature = hashlib.sha1(sign_payload.encode("utf-8")).hexdigest()
    endpoint = f"https://api.cloudinary.com/v1_1/{cloud}/image/upload"

    files = {"file": ("upload.jpg", image_bytes, "image/jpeg")}
    data = {
        "api_key": api_key,
        "timestamp": timestamp,
        "folder": folder,
        "signature": signature,
    }
    res = requests.post(endpoint, files=files, data=data, timeout=20)
    if res.status_code >= 300:
        raise RuntimeError(f"cloud upload failed: {res.text[:180]}")
    payload = res.json()
    return {
        "url": payload.get("secure_url") or payload.get("url"),
        "provider": "cloudinary",
        "width": int(payload.get("width") or 0),
        "height": int(payload.get("height") or 0),
    }


def _upload_local(image_bytes: bytes, folder_hint: str, host_base: str | None = None) -> dict[str, Any]:
    uploads_root: Path = current_app.config["UPLOAD_FOLDER"]
    target_dir = uploads_root / "admin" / folder_hint
    target_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{int(time.time())}_{secrets.token_hex(6)}.jpg"
    target_path = target_dir / filename
    target_path.write_bytes(image_bytes)

    relative = f"/uploads/admin/{folder_hint}/{filename}"
    base = (current_app.config.get("PUBLIC_BACKEND_URL") or host_base or "").rstrip("/")
    url = f"{base}{relative}" if base else relative
    return {"url": url, "provider": "local", "width": TARGET_SIZE[0], "height": TARGET_SIZE[1]}


def upload_admin_image(file: FileStorage, folder_hint: str, host_base: str | None = None) -> dict[str, Any]:
    _validate_file(file)
    image_bytes, _, _ = _prepare_image(file)

    if _cloudinary_ready():
        try:
            uploaded = _upload_cloudinary(image_bytes, folder_hint=folder_hint)
            if uploaded.get("url"):
                return uploaded
        except Exception:
            current_app.logger.exception("Cloudinary upload failed, falling back to local storage")

    if current_app.config.get("REQUIRE_CLOUDINARY_UPLOADS"):
        raise ValueError("Cloudinary is required for deployed image uploads")

    return _upload_local(image_bytes, folder_hint=folder_hint, host_base=host_base)
