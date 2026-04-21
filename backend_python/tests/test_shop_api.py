from conftest import login


def test_catalog_cart_checkout_orders_invoice(client):
    payment_config = client.get("/api/payments/config")
    assert payment_config.status_code == 200
    assert payment_config.json["provider"] == "razorpay"

    razorpay_order_unauth = client.post("/api/payments/razorpay/order", json={})
    assert razorpay_order_unauth.status_code == 401

    products_res = client.get("/api/products")
    assert products_res.status_code == 200
    assert len(products_res.json["products"]) >= 2
    first_product = products_res.json["products"][0]

    product_by_slug = client.get(f"/api/products/slug/{first_product['slug']}")
    assert product_by_slug.status_code == 200
    assert product_by_slug.json["product"]["slug"] == first_product["slug"]

    missing_slug = client.get("/api/products/slug/not-a-real-product-slug")
    assert missing_slug.status_code == 404

    products_meta = client.get("/api/products/meta")
    assert products_meta.status_code == 200
    assert "brands" in products_meta.json
    assert "categories" in products_meta.json

    vehicles_res = client.get("/api/vehicles?vehicle_type=car")
    assert vehicles_res.status_code == 200
    assert len(vehicles_res.json["vehicles"]) >= 1

    vehicle_parts = client.get("/api/vehicles/1/parts")
    assert vehicle_parts.status_code == 200
    assert vehicle_parts.json["vehicle"]["id"] == 1
    assert len(vehicle_parts.json["products"]) >= 1

    add_cart = client.post("/api/cart/add", json={"product_id": 1, "quantity": 2})
    assert add_cart.status_code == 200
    assert add_cart.json["ok"] is True

    update_cart = client.post("/api/cart/update", json={"product_id": 1, "quantity": 1})
    assert update_cart.status_code == 200
    assert update_cart.json["ok"] is True

    cart_res = client.get("/api/cart?coupon=TEST10")
    assert cart_res.status_code == 200
    assert cart_res.json["total"] > 0
    assert cart_res.json["coupon"]["code"] == "TEST10"

    coupon_validate = client.get("/api/coupons/validate?code=TEST10")
    assert coupon_validate.status_code == 200
    assert coupon_validate.json["valid"] is True

    checkout_unauth = client.post(
        "/api/orders/checkout",
        json={"shipping_address": "Address", "payment_method": "cod"},
    )
    assert checkout_unauth.status_code == 401

    assert login(client, "demo@automart.local", "demo123").status_code == 200

    razorpay_order_no_config = client.post("/api/payments/razorpay/order", json={})
    assert razorpay_order_no_config.status_code == 503

    checkout = client.post(
        "/api/orders/checkout",
        json={
            "shipping_address": "123 Main Road, Bengaluru",
            "payment_method": "cod",
            "coupon_code": "TEST10",
        },
    )
    assert checkout.status_code == 200
    order_id = checkout.json["order_id"]
    assert order_id > 0

    orders = client.get("/api/orders")
    assert orders.status_code == 200
    assert len(orders.json["orders"]) == 1

    order_detail = client.get(f"/api/orders/{order_id}")
    assert order_detail.status_code == 200
    assert order_detail.json["order"]["id"] == order_id

    invoice = client.get(f"/api/orders/{order_id}/invoice")
    assert invoice.status_code == 200
    assert invoice.json["invoice"]["invoice_number"].startswith("AM-")

    cancel = client.post(f"/api/orders/{order_id}/cancel")
    assert cancel.status_code == 200
    assert cancel.json["order"]["status"] == "cancelled"

    cancel_again = client.post(f"/api/orders/{order_id}/cancel")
    assert cancel_again.status_code == 400

    re_add_cart = client.post("/api/cart/add", json={"product_id": 1, "quantity": 1})
    assert re_add_cart.status_code == 200

    razorpay_checkout_without_config = client.post(
        "/api/orders/checkout",
        json={
            "shipping_address": "123 Main Road, Bengaluru",
            "payment_method": "card",
            "payment_gateway": "razorpay",
            "razorpay_order_id": "order_test",
            "razorpay_payment_id": "pay_test",
            "razorpay_signature": "bad",
        },
    )
    assert razorpay_checkout_without_config.status_code == 400

    card_demo_checkout = client.post(
        "/api/orders/checkout",
        json={
            "shipping_address": "123 Main Road, Bengaluru",
            "payment_method": "card",
            "payment_gateway": "demo",
            "payment_outcome": "success",
        },
    )
    assert card_demo_checkout.status_code == 200
    assert card_demo_checkout.json["payment_method"] == "card"
    assert card_demo_checkout.json["payment_gateway"] == "demo"
