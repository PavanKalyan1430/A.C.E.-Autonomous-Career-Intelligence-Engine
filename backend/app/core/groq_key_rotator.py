"""
groq_key_rotator.py
-------------------
Thread-safe, atomic round-robin rotator for multiple Groq API keys.

Design decisions
~~~~~~~~~~~~~~~~
- Uses itertools.cycle so the rotation is infinite and evenly distributed.
- Protected by asyncio.Lock so concurrent async callers never race to pick
  the same key twice in the same slot.
- Keys are sourced from settings.groq_api_keys at first use (lazy init)
  so the rotator still works correctly during tests where the settings
  object is patched after import time.
- Falls back gracefully to os.environ if settings yields no keys.
"""

import itertools
import logging
import os
import asyncio
from typing import Optional

logger = logging.getLogger(__name__)


class GroqKeyRotator:
    """Round-robin Groq API key rotator.

    Usage
    -----
    # get the module-level singleton
    from app.core.groq_key_rotator import groq_key_rotator

    api_key = groq_key_rotator.next_key()         # sync, thread-safe
    api_key = await groq_key_rotator.async_next_key()  # async, coroutine-safe
    """

    def __init__(self) -> None:
        self._cycle = None          # itertools.cycle, built lazily
        self._lock = asyncio.Lock() # protects async callers
        self._keys: list = []       # snapshot used for diagnostics

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _ensure_initialised(self) -> bool:
        """Build the cycle on first use.  Returns True if keys are available."""
        if self._cycle is not None:
            return bool(self._keys)

        # 1. Prefer settings (covers .env and test patches)
        try:
            from app.core.config import settings
            keys = settings.groq_api_keys
        except Exception:
            keys = []

        # 2. Fallback: scan bare env vars
        if not keys:
            env_candidates = [
                os.environ.get("GROQ_API_KEY", ""),
                os.environ.get("GROQ_API_KEY_1", ""),
                os.environ.get("GROQ_API_KEY_2", ""),
                os.environ.get("GROQ_API_KEY_3", ""),
                os.environ.get("GROQ_API_KEY_4", ""),
                os.environ.get("GROQ_API_KEY_5", ""),
                os.environ.get("GROQ_API_KEY_6", ""),
                os.environ.get("GROQ_API_KEY_7", ""),
                os.environ.get("GROQ_API_KEY_8", ""),
                os.environ.get("GROQ_API_KEY_9", ""),
            ]
            seen = set()
            for k in env_candidates:
                stripped = k.strip()
                if stripped and stripped not in seen:
                    seen.add(stripped)
                    keys.append(stripped)

        if not keys:
            logger.warning(
                "GroqKeyRotator: no Groq API keys found. "
                "Set GROQ_API_KEY (and optionally GROQ_API_KEY_1..9) in .env."
            )
            self._cycle = iter([])   # empty, won't crash
            self._keys = []
            return False

        self._keys = keys
        self._cycle = itertools.cycle(keys)
        logger.info(
            f"GroqKeyRotator initialised with {len(keys)} key(s). "
            "Keys will be rotated in round-robin order."
        )
        return True

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def next_key(self) -> Optional[str]:
        """Return the next Groq API key synchronously.

        Safe to call from sync code.  For coroutine-heavy paths prefer
        async_next_key() to avoid any potential contention.
        """
        if not self._ensure_initialised():
            return None
        try:
            return next(self._cycle)
        except StopIteration:
            return None

    async def async_next_key(self) -> Optional[str]:
        """Return the next Groq API key, protected by an asyncio.Lock.

        Multiple concurrent coroutines will never pick the same slot.
        """
        async with self._lock:
            return self.next_key()

    def key_count(self) -> int:
        """Return the number of configured keys (useful for health checks)."""
        self._ensure_initialised()
        return len(self._keys)

    def reset(self) -> None:
        """Force re-initialisation on next call.  Mainly used in tests."""
        self._cycle = None
        self._keys = []


# ---------------------------------------------------------------------------
# Module-level singleton — import this everywhere instead of building your own
# ---------------------------------------------------------------------------
groq_key_rotator = GroqKeyRotator()
