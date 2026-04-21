"""Authentication, account, password reset, and address APIs."""
from datetime import UTC, datetime, timedelta
import secrets

from flask import Blueprint, current_app, jsonify, request
from flask_login import current_user, login_required, login_user, logout_user

from .extensions import db
from .models import Address, PasswordResetToken, User, UserGarage, Vehicle

bp = Blueprint("api_auth", __name__, url_prefix="/api/auth")


def _clean_email(raw: str) -> str:
    return (raw or "").strip().lower()


def _validate_password(password: str) -> tuple[bool, str]:
    p = password or ""
    if len(p) < 6:
        return False, "password must be at least 6 characters"
    return True, ""


def _utcnow_naive() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


@bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    email = _clean_email(data.get("email") or "")
    password = data.get("password") or ""
    name = (data.get("name") or "").strip()
    ok, reason = _validate_password(password)
    if not email or not password:
        return jsonify({"error": "email and password required"}), 400
    if not ok:
        return jsonify({"error": reason}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "email already registered"}), 409
    u = User(email=email, name=name or None, is_admin=False)
    u.set_password(password)
    db.session.add(u)
    db.session.commit()
    login_user(u, remember=True)
    return jsonify({"user": u.to_dict()}), 201


@bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = _clean_email(data.get("email") or "")
    password = data.get("password") or ""
    u = User.query.filter_by(email=email).first()
    if not u or not u.check_password(password):
        return jsonify({"error": "invalid credentials"}), 401
    if u.is_blocked:
        return jsonify({"error": "account blocked by admin"}), 403
    login_user(u, remember=True)
    return jsonify({"user": u.to_dict()})


@bp.route("/logout", methods=["POST"])
@login_required
def logout():
    logout_user()
    return jsonify({"ok": True})


@bp.route("/me", methods=["GET"])
def me():
    if not current_user.is_authenticated:
        return jsonify({"user": None})
    return jsonify({"user": current_user.to_dict()})


@bp.route("/profile", methods=["GET"])
@login_required
def profile_get():
    user = current_user.to_dict()
    default_address = (
        Address.query.filter_by(user_id=current_user.id, is_default=True)
        .order_by(Address.updated_at.desc())
        .first()
    )
    return jsonify(
        {
            "user": user,
            "default_address": default_address.to_dict() if default_address else None,
        }
    )


@bp.route("/profile", methods=["PUT", "PATCH"])
@login_required
def profile_update():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = _clean_email(data.get("email") or "")

    if name:
        current_user.name = name[:120]
    if email and email != current_user.email:
        if User.query.filter(User.email == email, User.id != current_user.id).first():
            return jsonify({"error": "email already in use"}), 409
        current_user.email = email

    db.session.commit()
    return jsonify({"user": current_user.to_dict()})


@bp.route("/change-password", methods=["POST"])
@login_required
def change_password():
    data = request.get_json(silent=True) or {}
    old_password = data.get("old_password") or ""
    new_password = data.get("new_password") or ""
    if not current_user.check_password(old_password):
        return jsonify({"error": "current password is incorrect"}), 400
    ok, reason = _validate_password(new_password)
    if not ok:
        return jsonify({"error": reason}), 400
    current_user.set_password(new_password)
    db.session.commit()
    return jsonify({"ok": True, "message": "password updated"})


@bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json(silent=True) or {}
    email = _clean_email(data.get("email") or "")
    # Generic response to avoid account enumeration
    generic = {
        "ok": True,
        "message": "If that email exists, a reset link has been generated.",
    }
    if not email:
        return jsonify(generic)

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify(generic)

    raw_token = secrets.token_urlsafe(32)
    token = PasswordResetToken(
        user_id=user.id,
        token_hash=PasswordResetToken.hash_token(raw_token),
        expires_at=_utcnow_naive() + timedelta(minutes=30),
    )
    db.session.add(token)
    db.session.commit()

    # Demo-friendly: expose token for local project testing only.
    if current_app.debug or current_app.config.get("EXPOSE_RESET_TOKEN"):
        return jsonify({**generic, "reset_token": raw_token})
    return jsonify(generic)


@bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json(silent=True) or {}
    raw_token = (data.get("token") or "").strip()
    new_password = data.get("new_password") or ""
    if not raw_token or not new_password:
        return jsonify({"error": "token and new_password required"}), 400
    ok, reason = _validate_password(new_password)
    if not ok:
        return jsonify({"error": reason}), 400

    token_hash = PasswordResetToken.hash_token(raw_token)
    token = (
        PasswordResetToken.query.filter_by(token_hash=token_hash)
        .order_by(PasswordResetToken.created_at.desc())
        .first()
    )
    if not token or token.used_at is not None or token.is_expired():
        return jsonify({"error": "invalid or expired token"}), 400

    user = db.session.get(User, token.user_id)
    if not user:
        return jsonify({"error": "invalid token"}), 400

    user.set_password(new_password)
    token.mark_used()
    db.session.commit()
    return jsonify({"ok": True, "message": "password reset successful"})


@bp.route("/addresses", methods=["GET"])
@login_required
def list_addresses():
    rows = (
        Address.query.filter_by(user_id=current_user.id)
        .order_by(Address.is_default.desc(), Address.updated_at.desc())
        .all()
    )
    return jsonify({"addresses": [a.to_dict() for a in rows]})


@bp.route("/addresses", methods=["POST"])
@login_required
def create_address():
    data = request.get_json(silent=True) or {}
    required = ["line1", "city", "state", "postal_code"]
    if any(not str(data.get(k) or "").strip() for k in required):
        return jsonify({"error": "line1, city, state, postal_code are required"}), 400

    has_any = Address.query.filter_by(user_id=current_user.id).first() is not None
    set_default = bool(data.get("is_default")) or not has_any
    if set_default:
        Address.query.filter_by(user_id=current_user.id, is_default=True).update(
            {"is_default": False}
        )

    addr = Address(
        user_id=current_user.id,
        label=str(data.get("label") or "Home")[:80],
        full_name=str(data.get("full_name") or current_user.name or "")[:120],
        line1=str(data.get("line1") or "")[:255],
        line2=str(data.get("line2") or "")[:255],
        city=str(data.get("city") or "")[:120],
        state=str(data.get("state") or "")[:120],
        postal_code=str(data.get("postal_code") or "")[:20],
        country=str(data.get("country") or "India")[:80],
        phone=str(data.get("phone") or "")[:20],
        is_default=set_default,
    )
    db.session.add(addr)
    db.session.commit()
    return jsonify({"address": addr.to_dict()}), 201


@bp.route("/addresses/<int:aid>", methods=["PUT", "PATCH"])
@login_required
def update_address(aid: int):
    addr = Address.query.filter_by(id=aid, user_id=current_user.id).first()
    if not addr:
        return jsonify({"error": "address not found"}), 404
    data = request.get_json(silent=True) or {}

    for k, max_len in (
        ("label", 80),
        ("full_name", 120),
        ("line1", 255),
        ("line2", 255),
        ("city", 120),
        ("state", 120),
        ("postal_code", 20),
        ("country", 80),
        ("phone", 20),
    ):
        if k in data:
            setattr(addr, k, str(data.get(k) or "")[:max_len])

    if data.get("is_default"):
        Address.query.filter_by(user_id=current_user.id, is_default=True).update(
            {"is_default": False}
        )
        addr.is_default = True

    db.session.commit()
    return jsonify({"address": addr.to_dict()})


@bp.route("/addresses/<int:aid>", methods=["DELETE"])
@login_required
def delete_address(aid: int):
    addr = Address.query.filter_by(id=aid, user_id=current_user.id).first()
    if not addr:
        return jsonify({"error": "address not found"}), 404
    was_default = bool(addr.is_default)
    db.session.delete(addr)
    db.session.commit()

    if was_default:
        next_one = (
            Address.query.filter_by(user_id=current_user.id)
            .order_by(Address.updated_at.desc())
            .first()
        )
        if next_one:
            next_one.is_default = True
            db.session.commit()

    return jsonify({"ok": True})


@bp.route("/garage", methods=["GET"])
@login_required
def list_garage():
    rows = (
        UserGarage.query.filter_by(user_id=current_user.id)
        .order_by(UserGarage.is_default.desc(), UserGarage.updated_at.desc())
        .all()
    )
    return jsonify({"garage": [row.to_dict() for row in rows]})


@bp.route("/garage", methods=["POST"])
@login_required
def create_garage_entry():
    data = request.get_json(silent=True) or {}
    try:
        vehicle_id = int(data.get("vehicle_id"))
    except (TypeError, ValueError):
        return jsonify({"error": "vehicle_id is required"}), 400

    vehicle = db.session.get(Vehicle, vehicle_id)
    if not vehicle:
        return jsonify({"error": "vehicle not found"}), 404

    nickname = str(data.get("nickname") or "")[:120]
    existing = UserGarage.query.filter_by(user_id=current_user.id, vehicle_id=vehicle_id).first()
    has_any = UserGarage.query.filter_by(user_id=current_user.id).first() is not None
    set_default = bool(data.get("is_default")) or not has_any

    if set_default:
        UserGarage.query.filter_by(user_id=current_user.id, is_default=True).update(
            {"is_default": False}
        )

    if existing:
        existing.nickname = nickname
        if set_default:
            existing.is_default = True
        db.session.commit()
        return jsonify({"garage_entry": existing.to_dict(), "created": False})

    row = UserGarage(
        user_id=current_user.id,
        vehicle_id=vehicle_id,
        nickname=nickname,
        is_default=set_default,
    )
    db.session.add(row)
    db.session.commit()
    return jsonify({"garage_entry": row.to_dict(), "created": True}), 201


@bp.route("/garage/<int:gid>", methods=["PATCH"])
@login_required
def update_garage_entry(gid: int):
    row = UserGarage.query.filter_by(id=gid, user_id=current_user.id).first()
    if not row:
        return jsonify({"error": "garage entry not found"}), 404
    data = request.get_json(silent=True) or {}

    if "nickname" in data:
        row.nickname = str(data.get("nickname") or "")[:120]

    if data.get("is_default"):
        UserGarage.query.filter_by(user_id=current_user.id, is_default=True).update(
            {"is_default": False}
        )
        row.is_default = True

    db.session.commit()
    return jsonify({"garage_entry": row.to_dict()})


@bp.route("/garage/<int:gid>", methods=["DELETE"])
@login_required
def delete_garage_entry(gid: int):
    row = UserGarage.query.filter_by(id=gid, user_id=current_user.id).first()
    if not row:
        return jsonify({"error": "garage entry not found"}), 404
    was_default = bool(row.is_default)
    db.session.delete(row)
    db.session.commit()

    if was_default:
        next_one = (
            UserGarage.query.filter_by(user_id=current_user.id)
            .order_by(UserGarage.updated_at.desc())
            .first()
        )
        if next_one:
            next_one.is_default = True
            db.session.commit()

    return jsonify({"ok": True})
