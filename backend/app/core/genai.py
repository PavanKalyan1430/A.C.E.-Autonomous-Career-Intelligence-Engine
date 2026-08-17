import logging
import os
from app.core.config import settings

logger = logging.getLogger(__name__)

_genai_client = None

def get_genai_client():
    global _genai_client
    if _genai_client is None:
        api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
        if api_key:
            try:
                from google import genai
                _genai_client = genai.Client(api_key=api_key)
                logger.info("Modern Google GenAI client initialized.")
            except ImportError:
                try:
                    import google.generativeai as legacy_genai
                    legacy_genai.configure(api_key=api_key)
                    _genai_client = legacy_genai.GenerativeModel("gemini-3.6-flash")
                    logger.info("Legacy Google GenerativeAI model initialized.")
                except Exception as e:
                    logger.warning(f"Could not load Gemini SDK: {e}")
                    _genai_client = None
    return _genai_client
