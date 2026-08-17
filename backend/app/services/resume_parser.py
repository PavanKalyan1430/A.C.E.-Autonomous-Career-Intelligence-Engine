import re
import json
import logging
import os
from app.core.config import settings
from app.schemas.resume import ResumeSchema, PersonalInfo, WorkExperience, Education, Project

logger = logging.getLogger(__name__)

from app.core.genai import get_genai_client
import asyncio

# SpaCy POS tags that indicate structural/grammatical resume filler, NOT skills.
# Verbs, adjectives, determiners, adverbs, particles, punctuation, and conjunctions.
_STRUCTURAL_POS_TAGS = {"VERB", "AUX", "ADJ", "ADV", "DET", "PART", "CONJ", "CCONJ", "SCONJ", "PUNCT", "INTJ", "NUM"}


def _is_likely_tech_term(token: str) -> bool:
    """
    Heuristic: a token is a likely technical term if it contains special characters
    common in tech stacks (C++, C#, .NET, Node.js), or is a known short abbreviation
    that would otherwise be filtered (SQL, AI, ML, UI, API, CI, CD, AWS, GCP).
    """
    # Contains non-alpha characters typical of tech names
    if re.search(r"[+#.]", token):
        return True
    # Short uppercase abbreviations (2-5 chars) are likely tech acronyms
    if re.match(r"^[A-Z]{2,5}$", token):
        return True
    return False


def _build_person_token_set(nlp_features: dict, raw_text: str) -> set:
    """
    Builds a set of lowercase tokens from PERSON entities detected by SpaCy.
    These are used to filter out candidate name fragments from extracted skills.
    """
    person_tokens = set()
    for ent in nlp_features.get("extracted_entities", []):
        if ent.get("label") == "PERSON":
            for tok in re.findall(r"\w+", ent["text"].lower()):
                person_tokens.add(tok)
    return person_tokens


def _is_structural_keyphrase(keyphrase_tokens: list, spacy_nlp) -> bool:
    """
    Returns True if all tokens in the keyphrase are structural resume words
    (verbs, adjectives, adverbs, determiners, etc.) with no meaningful noun/tech content.
    Uses SpaCy POS tagging on each token independently.
    """
    if spacy_nlp is None:
        return False
    doc = spacy_nlp(" ".join(keyphrase_tokens))
    return all(tok.pos_ in _STRUCTURAL_POS_TAGS for tok in doc)


class ResumeParserService:
    async def parse_resume(self, raw_text: str) -> ResumeSchema:
        prompt = f"""
        You are an expert resume parsing system. Your task is to extract professional resume details from the raw text and return a JSON object matching the Pydantic schema below.
        
        Pydantic JSON Schema:
        {json.dumps(ResumeSchema.model_json_schema(), indent=2)}
        
        Raw Resume Text:
        {raw_text}
        
        Important: Return ONLY valid JSON matching the schema. Do not add markdown or conversational text.
        """
        try:
            from app.core.llm_router import generate_content_with_routing
            res_text = await generate_content_with_routing(
                prompt=prompt,
                response_mime_type="application/json",
                timeout=settings.LLM_EVALUATION_TIMEOUT
            )
            # Strip potential markdown fences if returned despite prompt
            if res_text.strip().startswith("```"):
                res_text = re.sub(r"^```json\s*|\s*```$", "", res_text.strip(), flags=re.MULTILINE)
            data = json.loads(res_text)
            return ResumeSchema(**data)
        except Exception as e:
            logger.error(f"Error parsing resume via LLM: {e}. Executing dynamic NLP parser fallback.")
            return await self._dynamic_nlp_fallback_parse(raw_text)

    async def _dynamic_nlp_fallback_parse(self, raw_text: str) -> ResumeSchema:
        """
        Dynamic NLP Extraction Fallback.
        
        Skill filtering strategy (fully generic — no hardcoded word lists):
        1. Extract PERSON entities via SpaCy NER → discard any keyphrase whose tokens
           overlap with detected person names.
        2. Check each token's SpaCy POS tag → discard keyphrases composed entirely of
           structural/grammatical tags (VERB, ADJ, ADV, DET, etc.).
        3. Preserve any keyphrase containing a recognised tech-term pattern
           (C++, C#, SQL, AWS, etc.) regardless of POS.
        """
        from app.services.nlp_service import production_nlp_service

        nlp_features = await production_nlp_service.extract_linguistic_features(raw_text)
        tfidf_keyphrases = await production_nlp_service.extract_tfidf_keyphrases(raw_text, top_n=20)

        # Load the SpaCy model for POS-based structural filtering
        try:
            import spacy
            spacy_nlp = spacy.load("en_core_web_sm")
        except Exception:
            spacy_nlp = None

        # Build person name token set from SpaCy NER (PERSON entities)
        person_tokens = _build_person_token_set(nlp_features, raw_text)
        # Also extract tokens from the first line (candidate name heuristic)
        lines = [line.strip() for line in raw_text.split("\n") if line.strip()]
        candidate_name = lines[0] if lines else "Candidate"
        for tok in re.findall(r"\w+", candidate_name.lower()):
            person_tokens.add(tok)

        extracted_skills = []
        for item in tfidf_keyphrases or []:
            kp = item["keyphrase"]
            kp_lower = kp.lower()
            kp_tokens = re.findall(r"\w+", kp_lower)

            # Rule 1: Skip if any token is a person name fragment
            if any(t in person_tokens for t in kp_tokens):
                continue

            # Rule 2: Preserve tech terms regardless of further checks
            if any(_is_likely_tech_term(t) for t in re.findall(r"\S+", kp)):
                extracted_skills.append(kp)
                continue

            # Rule 3: Skip if all tokens are structural/grammatical (SpaCy POS)
            if _is_structural_keyphrase(kp_tokens, spacy_nlp):
                continue

            extracted_skills.append(kp)

        # Dynamic Email Extraction Regex
        email_matches = re.findall(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b", raw_text)
        email = email_matches[0] if email_matches else "Not Specified"

        # Dynamic Phone Extraction Regex
        phone_matches = re.findall(r"(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}", raw_text)
        phone = "".join(phone_matches[0]) if phone_matches else "Not Specified"

        # Dynamic Link/URL Extraction Regex
        urls = re.findall(r"https?://[^\s]+|github\.com/[^\s]+|linkedin\.com/in/[^\s]+", raw_text)

        return ResumeSchema(
            personal_info=PersonalInfo(
                name=candidate_name,
                email=email,
                phone=phone,
                location=None,
                links=urls
            ),
            work_experience=[],
            education=[],
            projects=[],
            skills=extracted_skills[:10],
            languages=[],
            summary=f"Extracted candidate profile. Verified metrics: {', '.join(nlp_features['quantifiable_metrics']) if nlp_features['quantifiable_metrics'] else 'None'}."
        )

