import pytest
from django.urls import reverse

@pytest.mark.django_db
def test_healthz(client):
    url = "/healthz"
    resp = client.get(url)
    assert resp.status_code == 200
    data = resp.json()
    assert "status" in data
    assert data["status"] in {"ok", "degraded"}
