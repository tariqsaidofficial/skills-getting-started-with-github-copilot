import copy
from urllib.parse import quote

import pytest
from fastapi.testclient import TestClient

from src import app as app_module


@pytest.fixture(autouse=True)
def restore_activities():
    # Keep a snapshot of original activities and restore before each test
    original = copy.deepcopy(app_module.activities)
    yield
    app_module.activities.clear()
    app_module.activities.update(copy.deepcopy(original))


def test_get_activities():
    client = TestClient(app_module.app)
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # Known activity exists
    assert "Chess Club" in data


def test_signup_and_unregister_flow():
    client = TestClient(app_module.app)
    activity = "Chess Club"
    email = "teststudent@example.com"

    # Ensure not present initially
    resp = client.get("/activities")
    assert resp.status_code == 200
    assert email not in resp.json()[activity]["participants"]

    # Sign up
    signup_resp = client.post(f"/activities/{quote(activity)}/signup?email={quote(email)}")
    assert signup_resp.status_code == 200
    assert "Signed up" in signup_resp.json().get("message", "")

    # Verify participant added
    resp2 = client.get("/activities")
    assert email in resp2.json()[activity]["participants"]

    # Unregister
    delete_resp = client.delete(f"/activities/{quote(activity)}/participants?email={quote(email)}")
    assert delete_resp.status_code == 200
    assert "Removed" in delete_resp.json().get("message", "")

    # Verify removed
    resp3 = client.get("/activities")
    assert email not in resp3.json()[activity]["participants"]
