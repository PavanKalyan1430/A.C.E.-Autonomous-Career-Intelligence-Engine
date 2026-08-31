import re
import logging
import httpx
from abc import ABC, abstractmethod
from typing import List
from app.core.config import settings

logger = logging.getLogger(__name__)

def clean_and_normalize_title(title: str) -> str:
    """
    Strips HTML tags, removes common noise terms (locations, job types),
    and standardizes casing.
    """
    # Remove HTML tags
    title = re.sub(r'<[^>]*>', '', title)
    
    # Remove common location/type annotations like (Remote), - Pune, [Full Time], etc.
    title = re.sub(r'[\(\[\{][^\]\)\}]*[\)\]\}]', '', title)
    title = re.sub(r'\s+-\s+.*$', '', title)
    title = re.sub(r'\s+in\s+.*$', '', title, flags=re.IGNORECASE)
    
    # Strip multiple spaces
    title = re.sub(r'\s+', ' ', title).strip()
    
    # Normalize capitalization (Title Case)
    title = title.title()
    
    return title

class OccupationProviderError(Exception):
    """Base exception for occupation provider errors."""
    pass

class OccupationProviderUnavailableError(OccupationProviderError):
    """Raised when the occupation provider is unconfigured, credentials are missing, or connection fails."""
    pass

class OccupationProviderCredentialError(OccupationProviderError):
    """Raised when the occupation provider credentials are unconfigured or placeholder values."""
    pass

class OccupationProviderAPIError(OccupationProviderError):
    """Raised when the occupation provider API request fails (e.g. status code is not 200)."""
    pass

def _is_valid_credential(val: str) -> bool:
    v = val.strip()
    if not v:
        return False
    if v.upper().startswith("YOUR_"):
        return False
    return True

class OccupationProvider(ABC):
    @abstractmethod
    async def search_roles(self, query: str, country: str = "in") -> List[str]:
        """Search and return a list of standard canonical job titles."""
        pass

class AdzunaOccupationProvider(OccupationProvider):
    def __init__(self, app_id: str, app_key: str):
        self.app_id = app_id.strip()
        self.app_key = app_key.strip()
        self.base_url = "https://api.adzuna.com/v1/api/jobs"

    async def search_roles(self, query: str, country: str = "in") -> List[str]:
        if not _is_valid_credential(self.app_id) or not _is_valid_credential(self.app_key):
            logger.warning("Adzuna credentials are not configured or are placeholder values. Cannot perform live discovery.")
            raise OccupationProviderCredentialError("Adzuna credentials are unconfigured or invalid.")

        # Target Adzuna search endpoint: v1/api/jobs/{country}/search/{page}
        # Adzuna API is 1-indexed for pages
        url = f"{self.base_url}/{country.lower()}/search/1"
        params = {
            "app_id": self.app_id,
            "app_key": self.app_key,
            "what": query,
            "results_per_page": 50
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url, params=params)
                if response.status_code != 200:
                    if response.status_code in (401, 403):
                        logger.error("Adzuna API returned 401/403: Authorization failed. Credentials might be invalid.")
                        raise OccupationProviderCredentialError("Adzuna authorization failed. Invalid app_id or app_key.")
                    logger.error(f"Adzuna API returned status {response.status_code}: {response.text}")
                    raise OccupationProviderAPIError(f"Adzuna API returned status {response.status_code}")
                
                data = response.json()
                results = data.get("results", [])
                
                titles = []
                for job in results:
                    raw_title = job.get("title", "")
                    cleaned = clean_and_normalize_title(raw_title)
                    if cleaned and len(cleaned) > 2:
                        titles.append(cleaned)
                
                return titles
        except httpx.RequestError as e:
            err_msg = str(e)
            if self.app_id:
                err_msg = err_msg.replace(self.app_id, "[REDACTED_APP_ID]")
            if self.app_key:
                err_msg = err_msg.replace(self.app_key, "[REDACTED_APP_KEY]")
            logger.error(f"Adzuna connection error: {err_msg}")
            raise OccupationProviderUnavailableError("Adzuna network or connection failure.") from e
        except Exception as e:
            if isinstance(e, OccupationProviderError):
                raise
            err_msg = str(e)
            if self.app_id:
                err_msg = err_msg.replace(self.app_id, "[REDACTED_APP_ID]")
            if self.app_key:
                err_msg = err_msg.replace(self.app_key, "[REDACTED_APP_KEY]")
            logger.error(f"Failed to query Adzuna Jobs API: {err_msg}")
            raise OccupationProviderUnavailableError(f"Failed to query Adzuna Jobs API due to network or connection failure: {err_msg}") from e

# Extensible Provider Hub
class OccupationService:
    def __init__(self):
        # Instantiate Adzuna provider if keys are supplied
        app_id = settings.ADZUNA_APP_ID
        app_key = settings.ADZUNA_APP_KEY
        
        if _is_valid_credential(app_id) and _is_valid_credential(app_key):
            self.provider = AdzunaOccupationProvider(app_id, app_key)
            logger.info("Extensible Occupation Provider initialized with Adzuna source.")
        else:
            self.provider = None
            logger.warning("Extensible Occupation Provider initialized with no live provider.")

    async def search_roles(self, query: str, country: str = "in") -> List[str]:
        if not self.provider:
            raise OccupationProviderCredentialError("Adzuna credentials are unconfigured or invalid.")

        # Perform discovery using current configured provider
        raw_titles = await self.provider.search_roles(query, country)

        # Post-processing: Deduplicate, normalize, and rank
        seen = set()
        deduped = []
        for t in raw_titles:
            norm = clean_and_normalize_title(t)
            if norm and norm.lower() not in seen:
                seen.add(norm.lower())
                deduped.append(norm)

        # Rank suggestions: exact/prefix matches first, then partial matches, sorted by length (conciseness)
        q_lower = query.lower().strip()
        prefix_matches = []
        contain_matches = []
        
        for title in deduped:
            t_lower = title.lower()
            if t_lower.startswith(q_lower):
                prefix_matches.append(title)
            elif q_lower in t_lower:
                contain_matches.append(title)
        
        prefix_matches.sort(key=len)
        contain_matches.sort(key=len)
        
        ranked_titles = prefix_matches + contain_matches
        
        # Limit to concise top 15 suggestions
        return ranked_titles[:15]

occupation_service = OccupationService()
