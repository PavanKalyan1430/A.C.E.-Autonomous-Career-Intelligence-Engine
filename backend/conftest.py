"""
Root conftest.py for the backend test suite.

Sets the PYTHONPATH and loads the backend .env file before any test
module is imported. This ensures pydantic-settings / Settings() picks up
the live API keys (GEMINI_API_KEY, GROQ_API_KEY, etc.) even when pytest
is invoked from the project root (ACE/) rather than from ACE/backend/.
"""
import os
import pathlib

# Resolve the directory that contains this conftest.py (i.e. ACE/backend/)
_BACKEND_DIR = pathlib.Path(__file__).parent.resolve()
_ENV_FILE = _BACKEND_DIR / ".env"

# Load .env manually before any app module is imported so that
# pydantic-settings finds all keys via os.environ.
if _ENV_FILE.exists():
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=str(_ENV_FILE), override=False)
