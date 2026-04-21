from conftest import login


def test_auth_profile_address_garage_and_reset_flow(client):
    register_res = client.post(
        "/api/auth/register",
        json={
            "name": "Test User",
            "email": "user1@automart.local",
            "password": "user1234",
        },
    )
    assert register_res.status_code == 201
    assert register_res.json["user"]["email"] == "user1@automart.local"

    me_res = client.get("/api/auth/me")
    assert me_res.status_code == 200
    assert me_res.json["user"]["email"] == "user1@automart.local"

    profile_res = client.patch(
        "/api/auth/profile",
        json={"name": "Updated User", "email": "user1-updated@automart.local"},
    )
    assert profile_res.status_code == 200
    assert profile_res.json["user"]["email"] == "user1-updated@automart.local"

    change_password_res = client.post(
        "/api/auth/change-password",
        json={"old_password": "user1234", "new_password": "newpass123"},
    )
    assert change_password_res.status_code == 200

    address_create = client.post(
        "/api/auth/addresses",
        json={
            "label": "Home",
            "line1": "123 Main Road",
            "city": "Bengaluru",
            "state": "Karnataka",
            "postal_code": "560001",
            "phone": "9876543210",
            "is_default": True,
        },
    )
    assert address_create.status_code == 201
    address_id = address_create.json["address"]["id"]

    address_list = client.get("/api/auth/addresses")
    assert address_list.status_code == 200
    assert len(address_list.json["addresses"]) == 1

    address_update = client.patch(
        f"/api/auth/addresses/{address_id}",
        json={"city": "Mysuru"},
    )
    assert address_update.status_code == 200
    assert address_update.json["address"]["city"] == "Mysuru"

    garage_add = client.post("/api/auth/garage", json={"vehicle_id": 1, "nickname": "My City"})
    assert garage_add.status_code == 201
    garage_id = garage_add.json["garage_entry"]["id"]

    garage_update = client.patch(f"/api/auth/garage/{garage_id}", json={"nickname": "City VX"})
    assert garage_update.status_code == 200
    assert garage_update.json["garage_entry"]["nickname"] == "City VX"

    garage_list = client.get("/api/auth/garage")
    assert garage_list.status_code == 200
    assert len(garage_list.json["garage"]) == 1

    garage_delete = client.delete(f"/api/auth/garage/{garage_id}")
    assert garage_delete.status_code == 200

    address_delete = client.delete(f"/api/auth/addresses/{address_id}")
    assert address_delete.status_code == 200

    logout_res = client.post("/api/auth/logout")
    assert logout_res.status_code == 200

    login_new_password = login(client, "user1-updated@automart.local", "newpass123")
    assert login_new_password.status_code == 200
    client.post("/api/auth/logout")

    forgot = client.post("/api/auth/forgot-password", json={"email": "user1-updated@automart.local"})
    assert forgot.status_code == 200
    token = forgot.json.get("reset_token")
    assert token

    reset = client.post("/api/auth/reset-password", json={"token": token, "new_password": "finalpass123"})
    assert reset.status_code == 200

    login_after_reset = login(client, "user1-updated@automart.local", "finalpass123")
    assert login_after_reset.status_code == 200
