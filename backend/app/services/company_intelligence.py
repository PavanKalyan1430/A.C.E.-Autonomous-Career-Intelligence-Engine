import logging
import json
import os
import re
import asyncio
from typing import Dict, List, Any
from tavily import TavilyClient
from app.core.config import settings

logger = logging.getLogger(__name__)

class CompanyIntelligenceService:
    def __init__(self):
        api_key = settings.TAVILY_API_KEY or os.environ.get("TAVILY_API_KEY")
        if api_key:
            self.client = TavilyClient(api_key=api_key)
        else:
            self.client = None
            logger.warning("TAVILY_API_KEY not set.")

    def _classify_source(self, url: str, domain: str, company_name: str) -> str:
        """
        Deterministic 5-Tier Source Classifier.
        Discovers official domains dynamically without hardcoding static brand mappings.
        """
        url_lower = url.lower()
        domain_lower = domain.lower()
        comp_clean = re.sub(r"[^a-zA-Z0-9]", "", company_name).lower()
        domain_clean = re.sub(r"[^a-zA-Z0-9]", "", domain_lower)

        # 1. Candidate Experience (Anecdotal)
        anecdotal_domains = ["reddit.com", "glassdoor.com", "quora.com", "teamblind.com", "leetcode.com", "blind.com"]
        if any(ad in domain_lower for ad in anecdotal_domains):
            return "Tier 5: Candidate Experience (Anecdotal)"

        # 2. Hiring / Job Evidence (Third-party)
        hiring_domains = ["linkedin.com", "indeed.com", "lever.co", "greenhouse.io", "jobvite.com", "workable.com", "ziprecruiter.com"]
        if any(hd in domain_lower for hd in hiring_domains):
            return "Tier 3: Hiring / Job Evidence"

        # 3. Third-Party Technical Publications & Blogs
        third_party_tech = ["pragmaticengineer.com", "back4app.com", "medium.com", "dev.to", "stackoverflow.com", "techcrunch.com", "infoq.com", "substack.com"]
        if any(tpt in domain_lower for tpt in third_party_tech):
            return "Tier 4: Third-Party Technical"

        # 4. Official Company / Code / Technical (Dynamic Domain Resolution)
        if comp_clean in domain_clean and len(comp_clean) >= 3:
            if "github.com" in domain_lower or "docs." in domain_lower or "developer." in domain_lower:
                return "Tier 2: Official Code / Technical"
            if "careers." in domain_lower or "jobs." in domain_lower:
                return "Tier 3: Hiring / Job Evidence"
            return "Tier 1: Official Company"

        if "github.com" in domain_lower and comp_clean in url_lower:
            return "Tier 2: Official Code / Technical"

        return "Tier 4: Third-Party Technical"

    async def _execute_category_search(self, query: str, category: str, company_name: str, max_results: int = 3) -> List[Dict[str, Any]]:
        if not self.client:
            return []
        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(self.client.search, query=query, max_results=max_results),
                timeout=5.0
            )
            raw_results = response.get("results", [])
            processed = []
            for r in raw_results:
                url = r.get("url", "")
                domain = url.split("/")[2] if "://" in url else url.split("/")[0]
                tier = self._classify_source(url, domain, company_name)

                processed.append({
                    "title": r.get("title", ""),
                    "url": url,
                    "domain": domain,
                    "category": category,
                    "tier": tier,
                    "snippet": r.get("content", "").strip(),
                    "score": round(r.get("score", 0.8), 3)
                })
            return processed
        except Exception as e:
            logger.error(f"Error fetching category search for '{query}': {e}")
            return []

    async def get_company_insights(self, company_name: str) -> dict:
        # Source-aware category searches
        cat_queries = [
            (f"{company_name} engineering architecture backend technology stack", "Official/Engineering"),
            (f"{company_name} software engineer job requirements backend skills", "Hiring/Jobs"),
            (f"{company_name} technical interview experience coding system design", "Candidate Experience")
        ]

        tasks = [self._execute_category_search(q, cat, company_name, max_results=3) for q, cat in cat_queries]
        search_outputs = await asyncio.gather(*tasks)

        seen_urls = set()
        structured_evidence: List[Dict[str, Any]] = []
        sources = []

        for item_list in search_outputs:
            for item in item_list:
                if item["url"] not in seen_urls:
                    seen_urls.add(item["url"])
                    structured_evidence.append(item)
                    sources.append({
                        "title": item["title"],
                        "url": item["url"],
                        "domain": item["domain"],
                        "category": item["category"],
                        "tier": item["tier"],
                        "relevance_score": item["score"]
                    })

        if not structured_evidence:
            return {
                "status": "error",
                "error_code": "company_intelligence_unavailable",
                "detail": f"Live intelligence for '{company_name}' is currently unavailable due to search failure.",
                "company_name": company_name,
                "tech_stack": [],
                "interview_process": "",
                "hiring_trends": "",
                "candidate_experience_signals": "",
                "sources": []
            }

        # Build compact evidence string preserving source tier and category
        compact_snippets = []
        for ev in structured_evidence[:8]:
            compact_snippets.append(
                f"[{ev['category']} | {ev['tier']} | Source: {ev['domain']}]\n"
                f"Title: {ev['title']}\n"
                f"Snippet: {ev['snippet'][:350]}\n"
            )
        compact_evidence_str = "\n".join(compact_snippets)

        prompt = (
            f"You are a Staff Technical Recruiter and Engineering Analyst. Analyze the following source-classified live evidence for {company_name}:\n\n"
            f"{compact_evidence_str}\n\n"
            f"Return ONLY valid JSON format with the following keys:\n"
            f"- 'tech_stack': List of specific programming languages, frameworks, databases, and infrastructure tools verified in evidence (e.g. ['Ruby', 'Go', 'FastAPI', 'PostgreSQL']). Do NOT include generic words like 'Interview', 'Problems', 'Coding'.\n"
            f"- 'interview_process': Summary of official technical interview stages.\n"
            f"- 'hiring_trends': Current backend engineering focus areas.\n"
            f"- 'candidate_experience_signals': Anecdotal insights from candidate discussions (must be explicitly labeled as candidate feedback from forums/Glassdoor/Reddit).\n"
        )

        try:
            from app.core.llm_router import generate_content_with_routing
            res_text = await generate_content_with_routing(
                prompt=prompt,
                response_mime_type="application/json",
                timeout=settings.LLM_SUMMARY_TIMEOUT
            )
            cleaned_json = res_text.strip()
            if cleaned_json.startswith("```"):
                lines = cleaned_json.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                cleaned_json = "\n".join(lines).strip()

            llm_data = json.loads(cleaned_json)
            if isinstance(llm_data, dict):
                llm_data["company_name"] = company_name
                llm_data["sources"] = sources
                if "tech_stack" in llm_data and isinstance(llm_data["tech_stack"], list):
                    llm_data["tech_stack"] = [str(x).strip() for x in llm_data["tech_stack"] if str(x).strip()]
                return llm_data
        except Exception as e:
            logger.error(f"Error synthesizing search snippets via LLM for {company_name}: {e}")

        # Controlled error response when LLM extraction fails (NO TF-IDF Word Salad)
        return {
            "status": "error",
            "error_code": "company_intelligence_unavailable",
            "detail": f"Live intelligence synthesis for '{company_name}' is currently unavailable due to provider limits.",
            "company_name": company_name,
            "tech_stack": [],
            "interview_process": "",
            "hiring_trends": "",
            "candidate_experience_signals": "",
            "sources": sources
        }
