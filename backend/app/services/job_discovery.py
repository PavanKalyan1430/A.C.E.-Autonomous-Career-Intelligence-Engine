import logging
import json
import httpx
import re
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.user import User, Profile, Resume, Company, Application, ApplicationStatus
from app.services.nlp_service import production_nlp_service
from app.core.llm_router import generate_content_with_routing

logger = logging.getLogger(__name__)

def strip_html(text: str) -> str:
    if not text:
        return ""
    # Strip HTML tags
    clean = re.sub(r'<[^>]*>', '', text)
    # Remove HTML entities
    clean = html_unescape(clean)
    return clean

def html_unescape(text: str) -> str:
    # A basic entity unescaper
    import html
    return html.unescape(text)

class JobDiscoveryService:
    async def get_user_context(self, user_id: int, db: AsyncSession) -> Dict[str, Any]:
        """Fetches candidate profile and latest resume to provide context for personalized matching."""
        res_prof = await db.execute(select(Profile).filter(Profile.user_id == user_id))
        profile = res_prof.scalars().first()

        res_res = await db.execute(
            select(Resume)
            .filter(Resume.user_id == user_id)
            .order_by(Resume.created_at.desc())
        )
        latest_resume = res_res.scalars().first()

        verified_skills = []
        target_role = ""
        resume_text = ""

        if profile:
            target_role = profile.target_role or ""
            if profile.skills_json and isinstance(profile.skills_json, dict):
                verified_skills = profile.skills_json.get("skills", [])

        if latest_resume:
            resume_text = latest_resume.raw_text or ""
            if latest_resume.parsed_data and isinstance(latest_resume.parsed_data, dict):
                if not verified_skills:
                    verified_skills = latest_resume.parsed_data.get("skills", [])

        return {
            "target_role": target_role,
            "verified_skills": verified_skills,
            "resume_text": resume_text
        }

    async def search_and_discover_jobs(
        self, user_id: int, filters: Dict[str, Any], page: int, limit: int, db: AsyncSession
    ) -> Dict[str, Any]:
        """
        Discovers job opportunities in real-time from the Adzuna API.
        Does not query local DB jobs as the source of truth.
        """
        user_context = await self.get_user_context(user_id, db)

        # 1. Build Adzuna Query Parameters
        app_id = settings.ADZUNA_APP_ID
        app_key = settings.ADZUNA_APP_KEY
        country = settings.ADZUNA_COUNTRY or "in"

        if not app_id or not app_key:
            logger.error("Adzuna API credentials are not configured in environment variables.")
            raise ValueError("Adzuna API credentials are not configured.")

        # Build "what" query parameter combining keyword, role, and skills
        what_terms = []
        if filters.get("keyword"):
            what_terms.append(filters["keyword"])
        if filters.get("role"):
            what_terms.append(filters["role"])
        if filters.get("skills"):
            what_terms.append(filters["skills"])

        # If remote is selected, add to search query
        if filters.get("remote_onsite") and filters["remote_onsite"].lower() == "remote":
            what_terms.append("remote")

        # Only append search parameters if they are supplied
        what_query = " ".join(what_terms).strip()

        params = {
            "app_id": app_id,
            "app_key": app_key,
            "results_per_page": 20
        }
        if what_query:
            params["what"] = what_query

        if filters.get("location"):
            params["where"] = filters["location"]

        if filters.get("salary_min"):
            try:
                params["salary_min"] = int(float(filters["salary_min"]))
            except ValueError:
                pass

        # Job type parameters mapping
        job_type_filter = filters.get("job_type")
        if job_type_filter:
            jt_lower = job_type_filter.lower()
            if "full-time" in jt_lower or "full_time" in jt_lower:
                params["full_time"] = 1
            elif "part-time" in jt_lower or "part_time" in jt_lower:
                params["part_time"] = 1
            elif "contract" in jt_lower:
                params["contract"] = 1
            elif "permanent" in jt_lower:
                params["permanent"] = 1

        # Sorting
        if filters.get("sort_by") == "date":
            params["sort_by"] = "date"

        # Call Adzuna API
        url = f"https://api.adzuna.com/v1/api/jobs/{country.lower()}/search/{page}"
        logger.info(f"Calling Adzuna URL: {url} with params keys: {list(params.keys())}")

        try:
            async with httpx.AsyncClient(timeout=25.0) as client:
                response = await client.get(url, params=params)
                if response.status_code != 200:
                    logger.error(f"Adzuna API error response: {response.status_code} - {response.text}")
                    raise RuntimeError(f"Adzuna API returned status code {response.status_code}")
                
                data = response.json()
        except Exception as e:
            logger.error(f"Adzuna API request failed: {e}")
            raise RuntimeError(f"Network error or timeout calling job discovery service: {e}")

        raw_results = data.get("results", [])
        total_count = data.get("count", 0)

        # 2. Normalize and Deduplicate results
        seen_job_ids = set()
        normalized_jobs = []

        for item in raw_results:
            job_id = str(item.get("id"))
            if not job_id or job_id in seen_job_ids:
                continue
            seen_job_ids.add(job_id)

            raw_title = item.get("title", "")
            # Stripping HTML from title and description
            title = strip_html(raw_title).strip()
            description = strip_html(item.get("description", "")).strip()

            company_name = item.get("company", {}).get("display_name") or "Not specified"
            location_name = item.get("location", {}).get("display_name") or "Not specified"

            # Parse Created Date to Freshness
            created_str = item.get("created")
            freshness = "Not specified"
            if created_str:
                try:
                    created_dt = datetime.fromisoformat(created_str.replace("Z", "+00:00"))
                    diff = datetime.now(timezone.utc) - created_dt
                    if diff.days == 0:
                        freshness = "Posted today"
                    elif diff.days == 1:
                        freshness = "Posted yesterday"
                    else:
                        freshness = f"Posted {diff.days} days ago"
                except Exception:
                    pass

            # Job Type Normalization
            contract_time = item.get("contract_time")
            contract_type = item.get("contract_type")
            job_type = "Not specified"
            if contract_time:
                job_type = contract_time.replace("_", "-").title()
            if contract_type:
                job_type += f" ({contract_type.title()})"

            # Salary Heuristic Calculation
            salary_min = item.get("salary_min")
            salary_max = item.get("salary_max")
            salary_range = "Salary estimate unavailable"
            salary_breakdown = []

            # Format Currency label dynamically based on country
            currency = "$"
            if country.lower() == "in":
                currency = "₹"
            elif country.lower() == "gb":
                currency = "£"
            elif country.lower() in ("de", "fr", "it", "es", "nl"):
                currency = "€"

            # If salary signals are available
            if salary_min is not None or salary_max is not None:
                s_min = salary_min if salary_min is not None else (salary_max * 0.85)
                s_max = salary_max if salary_max is not None else (salary_min * 1.15)
                
                # Round to thousands
                s_min_val = round(s_min / 1000) * 1000
                s_max_val = round(s_max / 1000) * 1000

                if currency == "₹":
                    # Display as LPA for Indian jobs
                    lpa_min = s_min_val / 100000
                    lpa_max = s_max_val / 100000
                    salary_range = f"Estimated market range: ₹{lpa_min:.1f} - ₹{lpa_max:.1f} LPA"
                else:
                    salary_range = f"Estimated market range: {currency}{s_min_val//1000}K - {currency}{s_max_val//1000}K / year"
                
                salary_breakdown = [
                    f"Baseline min: {currency}{s_min_val:,.0f}",
                    f"Baseline max: {currency}{s_max_val:,.0f}",
                    f"Source: Real-time Adzuna salary parameters"
                ]

            normalized_jobs.append({
                "id": job_id,
                "title": title,
                "company_name": company_name,
                "company_industry": item.get("category", {}).get("label") or "Not specified",
                "company_website": "Not specified",
                "description": description,
                "requirements": [], # We will extract requirements dynamically
                "location": location_name,
                "experience": "Not specified",
                "job_type": job_type,
                "remote_onsite": "Remote" if "remote" in location_name.lower() or "remote" in description.lower() else "On-site",
                "created_at": freshness,
                "salary_range": salary_range,
                "salary_breakdown": salary_breakdown,
                "external_apply_url": item.get("redirect_url") or ""
            })

        # 3. Dynamic compatibility score calculation
        has_profile = bool(user_context["resume_text"].strip() or user_context["verified_skills"])
        candidate_profile_text = user_context["resume_text"] or " ".join(user_context["verified_skills"])

        # ── Prepare base enrichment for every job (semantic score + skill mapping) ──
        import asyncio

        if has_profile:
            # Batch compute semantic similarity for all jobs concurrently
            job_texts = [f"{job['title']} {job['description']}" for job in normalized_jobs]
            scores = await asyncio.gather(*[
                production_nlp_service.compute_semantic_similarity(candidate_profile_text, jt)
                for jt in job_texts
            ])
        else:
            scores = [{"match_percentage": None}] * len(normalized_jobs)

        scored_jobs = []
        for i, job in enumerate(normalized_jobs):
            if not has_profile:
                job.update({
                    "match_score": None,
                    "matched_skills": [],
                    "missing_skills": [],
                    "why_match": "Personalized match diagnosis is unavailable. Please upload your resume or configure profile skills.",
                    "weakness_reasons": "No candidate profile data available.",
                    "experience_alignment": "Profile unconfigured."
                })
            else:
                match_score = scores[i]["match_percentage"]
                words = set(re.findall(r"\b[a-zA-Z0-9\+\#\.]+\b", job["description"].lower()))
                matched_skills = [s for s in user_context["verified_skills"] if s.lower() in words]
                missing_skills = [s for s in user_context["verified_skills"] if s.lower() not in words]

                job.update({
                    "match_score": match_score,
                    "matched_skills": list(set(matched_skills))[:5],
                    "missing_skills": list(set(missing_skills))[:5],
                    "why_match": f"Your profile shows a {match_score:.0f}% semantic alignment with this position.",
                    "weakness_reasons": "Some tool or framework requirements might not be fully documented in your profile.",
                    "experience_alignment": "Target career role matches the core job scope."
                })
            scored_jobs.append(job)

        # ── LLM explanation enrichment (best-effort, single concurrent batch) ──
        # We call the LLM for all jobs at once. If rate-limited, the except branch
        # keeps the fallback text already set above — the response is never blocked.
        if has_profile:
            async def _llm_explain(job: dict) -> dict:
                """Attempt LLM explanation. Falls back silently on any error."""
                if job.get("match_score") is None:
                    return job

                prompt = (
                    "You are an AI career advisor. Reason over the actual job details and the candidate's profile to generate a matching diagnosis.\n\n"
                    f"Job Title: {job['title']}\n"
                    f"Company: {job['company_name']}\n"
                    f"Job Description: {job['description'][:400]}...\n\n"
                    f"Candidate Verified Skills: {user_context['verified_skills']}\n"
                    f"Candidate Target Role: {user_context['target_role']}\n\n"
                    "Strict Rules:\n"
                    "1. Output MUST be valid JSON with three keys:\n"
                    "   - 'why_match': A 2-sentence explanation of why the candidate fits the role based ONLY on their verified skills and target role.\n"
                    "   - 'weakness_reasons': A 1-sentence description of missing requirements or potential gap areas.\n"
                    "   - 'experience_alignment': A 1-sentence description of how their career alignment matches the job.\n"
                    "2. NEVER invent achievements, credentials, or experiences. Do not hallucinate data that is absent from the candidate profile.\n"
                    "3. Do not include markdown code fences or conversational text."
                )
                try:
                    # Short timeout — if LLM is slow/rate-limited, we keep fallback text
                    res_text = await generate_content_with_routing(
                        prompt=prompt, response_mime_type="application/json", timeout=3.0
                    )
                    cleaned = res_text.strip()
                    if cleaned.startswith("```"):
                        lines = cleaned.splitlines()
                        cleaned = "\n".join(
                            l for l in lines
                            if not l.startswith("```")
                        ).strip()
                    llm_res = json.loads(cleaned)
                    if isinstance(llm_res, dict):
                        job["why_match"] = llm_res.get("why_match", job["why_match"])
                        job["weakness_reasons"] = llm_res.get("weakness_reasons", job["weakness_reasons"])
                        job["experience_alignment"] = llm_res.get("experience_alignment", job["experience_alignment"])
                except Exception as e:
                    # Rate-limit, timeout, or parse error — silently keep NLP fallback text
                    logger.warning(f"LLM explanation skipped for '{job.get('title')}': {type(e).__name__}")
                return job

            # Fire all LLM calls concurrently with a hard outer cap so a slow batch
            # never blocks the HTTP response beyond the cap.
            try:
                scored_jobs = list(
                    await asyncio.wait_for(
                        asyncio.gather(*[_llm_explain(job) for job in scored_jobs], return_exceptions=True),
                        timeout=5.0  # Fast hard cap: all LLM calls must finish within 5s total
                    )
                )
                # Unwrap exceptions if any return_exceptions occurred
                scored_jobs = [j if isinstance(j, dict) else normalized_jobs[i] for i, j in enumerate(scored_jobs)]
            except asyncio.TimeoutError:
                logger.warning("LLM batch explanation timed out — returning NLP-only scores.")
            except Exception as e:
                logger.warning(f"LLM batch explanation failed: {e} — returning NLP-only scores.")

        return {
            "jobs": list(scored_jobs),
            "total_count": total_count,
            "page": page,
            "limit": limit
        }

    async def track_discovered_job(
        self, job_data: Dict[str, Any], current_user: User, db: AsyncSession
    ) -> Dict[str, Any]:
        """Tracks the dynamically retrieved job by creating a company and application entry in the database."""
        comp_name = job_data.get("company_name", "Unknown Corp")
        
        # Find or create company
        c_stmt = select(Company).filter(Company.name == comp_name)
        c_res = await db.execute(c_stmt)
        company = c_res.scalars().first()

        if not company:
            company = Company(
                name=comp_name,
                industry=job_data.get("company_industry") or "Technology",
                website=job_data.get("company_website") or "https://example.com",
                tech_stack=job_data.get("matched_skills", []) + job_data.get("missing_skills", [])
            )
            db.add(company)
            await db.flush()

        # Check if already tracked
        dup_stmt = select(Application).filter(
            Application.user_id == current_user.id,
            Application.company_name == company.name,
            Application.role_title == job_data.get("title")
        )
        dup_res = await db.execute(dup_stmt)
        existing_app = dup_res.scalars().first()
        if existing_app:
            return {
                "status": "exists",
                "message": "Job is already being tracked.",
                "application_id": existing_app.id
            }

        # Extract user resume
        res_stmt = select(Resume).filter(Resume.user_id == current_user.id).order_by(Resume.created_at.desc())
        res_res = await db.execute(res_stmt)
        latest_resume = res_res.scalars().first()

        analysis_data = None
        jd_text = f"{job_data.get('title')}\n{job_data.get('description')}"
        
        if latest_resume and latest_resume.raw_text:
            sim_res = await production_nlp_service.compute_semantic_similarity(latest_resume.raw_text, jd_text)
            keyphrases = await production_nlp_service.extract_tfidf_keyphrases(jd_text, top_n=5)
            analysis_data = {
                "match_percentage": sim_res["match_percentage"],
                "cosine_score": sim_res["cosine_similarity_score"],
                "required_keyphrases": [kp["keyphrase"] for kp in keyphrases]
            }

        app_record = Application(
            user_id=current_user.id,
            company_name=company.name,
            role_title=job_data.get("title"),
            status=ApplicationStatus.APPLIED.value,
            jd_text=jd_text,
            analysis=analysis_data
        )
        
        db.add(app_record)
        await db.commit()
        await db.refresh(app_record)
        
        return {
            "status": "success",
            "message": f"Successfully tracking {job_data.get('title')} at {company.name}.",
            "application_id": app_record.id
        }

job_discovery_service = JobDiscoveryService()
