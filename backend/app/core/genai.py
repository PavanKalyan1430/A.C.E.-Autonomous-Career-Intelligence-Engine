import logging
import os
from app.core.config import settings

logger = logging.getLogger(__name__)

_genai_client = None

def get_genai_client():
    api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
    if api_key:
        try:
            from google import genai
            return genai.Client(api_key=api_key)
        except Exception as e:
            logger.warning(f"Could not load Gemini SDK: {e}")
            return None
    return None
