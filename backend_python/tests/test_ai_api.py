from conftest import login


def test_ai_chat_smart_search_recommendations_and_image_validation(client):
    chat = client.post("/api/ai/chat", json={"message": "Suggest brake parts for Honda City 2020"})
    assert chat.status_code == 200
    assert "reply" in chat.json
    assert "suggested_products" in chat.json
    assert len(chat.json["suggested_products"]) >= 1

    smart_search = client.post("/api/ai/smart-search", json={"query": "universal engine oil"})
    assert smart_search.status_code == 200
    assert len(smart_search.json["products"]) >= 1

    assert login(client, "demo@automart.local", "demo123").status_code == 200
    recommendations = client.get("/api/ai/recommendations")
    assert recommendations.status_code == 200
    assert "products" in recommendations.json

    image_missing = client.post("/api/ai/image-search", data={})
    assert image_missing.status_code == 400
