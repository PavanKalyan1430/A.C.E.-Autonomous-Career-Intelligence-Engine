import asyncio
import uuid
import httpx
import asyncpg

BASE_URL = "http://127.0.0.1:8000/api/v1"
DB_URL = "postgresql://postgres:pavan@127.0.0.1:5432/ace"

def format_api_error_python(detail, fallback="Registration failed"):
    """Python mirror of frontend formatApiError function for verification."""
    if not detail:
        return fallback
    if isinstance(detail, str):
        return detail
    if isinstance(detail, list):
        items = []
        for item in detail:
            if isinstance(item, str):
                items.append(item)
            elif isinstance(item, dict):
                loc = ".".join([str(l) for l in item.get("loc", []) if l != "body"])
                msg = item.get("msg", str(item))
                items.append(f"{loc}: {msg}" if loc else msg)
            else:
                items.append(str(item))
        return ", ".join(items)
    if isinstance(detail, dict):
        return detail.get("msg") or detail.get("message") or str(detail)
    return str(detail)

async def test_full_signup_flow():
    async with httpx.AsyncClient() as client:
        unique_id = uuid.uuid4().hex[:8]
        test_email = f"signup_user_{unique_id}@example.com"
        valid_password = "SecurePassword123!"

        print(f"=== TEST 1: Valid Registration for {test_email} ===")
        reg_resp = await client.post(
            f"{BASE_URL}/auth/register",
            json={"email": test_email, "password": valid_password}
        )
        print(f"Registration Status: {reg_resp.status_code}")
        assert reg_resp.status_code == 200, f"Expected 200, got {reg_resp.status_code}: {reg_resp.text}"
        user_data = reg_resp.json()
        print(f"Registered User Data: id={user_data.get('id')}, email={user_data.get('email')}, is_active={user_data.get('is_active')}")
        user_id = user_data["id"]

        print("\n=== TEST 2: PostgreSQL Persistence Verification ===")
        conn = await asyncpg.connect(DB_URL)
        db_user = await conn.fetchrow("SELECT id, email, is_active, created_at FROM users WHERE email = $1", test_email)
        await conn.close()
        assert db_user is not None, "User was not persisted in PostgreSQL!"
        print(f"Persisted User in DB: id={db_user['id']}, email={db_user['email']}, is_active={db_user['is_active']}, created_at={db_user['created_at']}")

        print("\n=== TEST 3: Login & Authenticated Session Verification ===")
        login_resp = await client.post(
            f"{BASE_URL}/auth/login",
            data={"username": test_email, "password": valid_password},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        print(f"Login Status: {login_resp.status_code}")
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token_data = login_resp.json()
        token = token_data["access_token"]
        print(f"Access Token Acquired: {token[:20]}...")

        me_resp = await client.get(
            f"{BASE_URL}/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        print(f"GET /auth/me Status: {me_resp.status_code}")
        assert me_resp.status_code == 200, f"GET /auth/me failed: {me_resp.text}"
        print(f"Current User Profile: {me_resp.json()}")

        print("\n=== TEST 4: Invalid Signup - Short Password (< 8 chars) ===")
        short_pwd_resp = await client.post(
            f"{BASE_URL}/auth/register",
            json={"email": f"short_{unique_id}@example.com", "password": "short"}
        )
        print(f"Short Password Resp Code: {short_pwd_resp.status_code}")
        assert short_pwd_resp.status_code == 422, f"Expected 422, got {short_pwd_resp.status_code}"
        raw_detail = short_pwd_resp.json().get("detail")
        formatted_error = format_api_error_python(raw_detail)
        print(f"Raw FastAPI 422 Detail Array: {raw_detail}")
        print(f"Formatted Error String for UI: '{formatted_error}'")
        assert isinstance(formatted_error, str), "Formatted error is not a string!"
        assert "password" in formatted_error.lower() and "8 characters" in formatted_error.lower()

        print("\n=== TEST 5: Duplicate Email Signup Handling ===")
        dup_resp = await client.post(
            f"{BASE_URL}/auth/register",
            json={"email": test_email, "password": valid_password}
        )
        print(f"Duplicate Signup Status: {dup_resp.status_code}")
        assert dup_resp.status_code == 400, f"Expected 400, got {dup_resp.status_code}"
        dup_detail = dup_resp.json().get("detail")
        formatted_dup_error = format_api_error_python(dup_detail)
        print(f"Formatted Duplicate Error: '{formatted_dup_error}'")
        assert isinstance(formatted_dup_error, str), "Formatted duplicate error is not a string!"

        print("\n[SUCCESS] ALL SIGNUP FLOW VERIFICATION TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(test_full_signup_flow())
