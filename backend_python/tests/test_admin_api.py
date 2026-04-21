import io

from PIL import Image

from conftest import login


def test_admin_crud_users_orders_and_compatibility(client):
    assert login(client, "admin@automart.local", "admin123").status_code == 200

    img = Image.new("RGB", (40, 40), color=(120, 40, 180))
    blob = io.BytesIO()
    img.save(blob, format="JPEG")
    blob.seek(0)
    upload = client.post(
        "/api/admin/uploads/image",
        data={"entity": "product", "file": (blob, "part.jpg")},
        content_type="multipart/form-data",
    )
    assert upload.status_code == 201
    assert upload.json["url"]

    analytics = client.get("/api/admin/analytics")
    assert analytics.status_code == 200
    assert analytics.json["users"] >= 2

    create_category = client.post(
        "/api/admin/categories",
        json={"name": "electrical", "description": "Electrical parts"},
    )
    assert create_category.status_code == 201
    category_id = create_category.json["category"]["id"]

    update_category = client.patch(f"/api/admin/categories/{category_id}", json={"active": False})
    assert update_category.status_code == 200

    create_brand = client.post(
        "/api/admin/brands",
        json={"name": "Denso", "description": "Electronics"},
    )
    assert create_brand.status_code == 201
    brand_id = create_brand.json["brand"]["id"]

    update_brand = client.patch(f"/api/admin/brands/{brand_id}", json={"active": False})
    assert update_brand.status_code == 200

    create_vehicle = client.post(
        "/api/admin/vehicles",
        json={
            "vehicle_type": "car",
            "company": "Hyundai",
            "model": "Creta",
            "year": 2022,
            "variant": "SX",
            "fuel_type": "Diesel",
        },
    )
    assert create_vehicle.status_code == 201
    vehicle_id = create_vehicle.json["vehicle"]["id"]

    update_vehicle = client.patch(f"/api/admin/vehicles/{vehicle_id}", json={"variant": "SX(O)"})
    assert update_vehicle.status_code == 200

    create_product = client.post(
        "/api/admin/products",
        json={
            "name": "Hyundai Creta Brake Pads",
            "category": "brake",
            "brand": "Bosch",
            "product_type": "vehicleSpecific",
            "price": 2999,
            "stock": 30,
            "description": "Brake pads for Creta",
            "vehicle_compatibility": "Hyundai Creta 2022 Diesel",
        },
    )
    assert create_product.status_code == 201
    product_id = create_product.json["product"]["id"]

    out_of_stock = client.post(f"/api/admin/products/{product_id}/out-of-stock")
    assert out_of_stock.status_code == 200
    assert out_of_stock.json["product"]["stock"] == 0

    update_product = client.patch(f"/api/admin/products/{product_id}", json={"stock": 5})
    assert update_product.status_code == 200
    assert update_product.json["product"]["stock"] == 5

    create_map = client.post(
        "/api/admin/compatibility",
        json={"product_id": product_id, "vehicle_id": vehicle_id},
    )
    assert create_map.status_code in (200, 201)
    mapping_id = create_map.json["mapping"]["id"]

    list_maps = client.get("/api/admin/compatibility")
    assert list_maps.status_code == 200
    assert len(list_maps.json["mappings"]) >= 1

    delete_map = client.delete(f"/api/admin/compatibility/{mapping_id}")
    assert delete_map.status_code == 200

    create_coupon = client.post(
        "/api/admin/coupons",
        json={
            "code": "ADMIN50",
            "description": "Flat 50 off",
            "discount_type": "fixed",
            "value": 50,
            "min_order_amount": 0,
            "active": True,
        },
    )
    assert create_coupon.status_code == 201
    coupon_id = create_coupon.json["coupon"]["id"]

    update_coupon = client.patch(f"/api/admin/coupons/{coupon_id}", json={"active": False})
    assert update_coupon.status_code == 200

    users = client.get("/api/admin/users")
    assert users.status_code == 200
    demo_user = next((u for u in users.json["users"] if u["email"] == "demo@automart.local"), None)
    assert demo_user is not None

    block_user = client.patch(f"/api/admin/users/{demo_user['id']}/block", json={"blocked": True})
    assert block_user.status_code == 200
    assert block_user.json["user"]["is_blocked"] is True

    unblock_user = client.patch(f"/api/admin/users/{demo_user['id']}/block", json={"blocked": False})
    assert unblock_user.status_code == 200
    assert unblock_user.json["user"]["is_blocked"] is False

    user_orders = client.get(f"/api/admin/users/{demo_user['id']}/orders")
    assert user_orders.status_code == 200

    demo_client = client.application.test_client()
    assert login(demo_client, "demo@automart.local", "demo123").status_code == 200
    demo_client.post("/api/cart/add", json={"product_id": 1, "quantity": 1})
    place_order = demo_client.post(
        "/api/orders/checkout",
        json={"shipping_address": "Bengaluru", "payment_method": "upi", "payment_outcome": "success"},
    )
    assert place_order.status_code == 200
    order_id = place_order.json["order_id"]

    admin_orders = client.get("/api/admin/orders")
    assert admin_orders.status_code == 200
    assert len(admin_orders.json["orders"]) >= 1

    update_status = client.patch(f"/api/admin/orders/{order_id}/status", json={"status": "shipped"})
    assert update_status.status_code == 200
    assert update_status.json["order"]["status"] == "shipped"

    delete_coupon = client.delete(f"/api/admin/coupons/{coupon_id}")
    assert delete_coupon.status_code == 200

    delete_product = client.delete(f"/api/admin/products/{product_id}")
    assert delete_product.status_code == 200

    delete_vehicle = client.delete(f"/api/admin/vehicles/{vehicle_id}")
    assert delete_vehicle.status_code == 200

    delete_brand = client.delete(f"/api/admin/brands/{brand_id}")
    assert delete_brand.status_code == 200

    delete_category = client.delete(f"/api/admin/categories/{category_id}")
    assert delete_category.status_code == 200
