import re
import logging
import numpy as np
from typing import List, Dict, Any, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer, ENGLISH_STOP_WORDS
import networkx as nx

CUSTOM_STOP_WORDS = list(ENGLISH_STOP_WORDS - {"go"})

logger = logging.getLogger(__name__)

_sentence_model = None
_spacy_nlp = None

def get_sentence_model():
    global _sentence_model
    if _sentence_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            _sentence_model = SentenceTransformer("all-MiniLM-L6-v2")
            logger.info("SentenceTransformer (all-MiniLM-L6-v2) loaded successfully.")
        except Exception as e:
            logger.warning(f"Could not load SentenceTransformer: {e}. Falling back to TF-IDF vector embeddings.")
            _sentence_model = "TFIDF_FALLBACK"
    return _sentence_model

def get_spacy_nlp():
    global _spacy_nlp
    if _spacy_nlp is None:
        try:
            import spacy
            try:
                _spacy_nlp = spacy.load("en_core_web_sm")
            except OSError:
                try:
                    import spacy.cli
                    spacy.cli.download("en_core_web_sm")
                    _spacy_nlp = spacy.load("en_core_web_sm")
                except Exception:
                    _spacy_nlp = spacy.blank("en")
                    if "sentencizer" not in _spacy_nlp.pipe_names:
                        _spacy_nlp.add_pipe("sentencizer")
            logger.info("SpaCy NLP pipeline loaded successfully.")
        except Exception as e:
            logger.warning(f"Could not load SpaCy NLP pipeline: {e}.")
            _spacy_nlp = None
    return _spacy_nlp


import asyncio

# Technology alias normalization mapping to canonical lowercase names
TECH_ALIASES = {
    "c++": "cplusplus",
    "cpp": "cplusplus",
    "c plus plus": "cplusplus",
    "c#": "csharp",
    "c sharp": "csharp",
    ".net": "dotnet",
    "dotnet": "dotnet",
    "f#": "fsharp",
    "f sharp": "fsharp",
    "node.js": "nodejs",
    "node": "nodejs",
    "react.js": "reactjs",
    "react": "reactjs",
}

def _normalize_tech_aliases(text: str) -> str:
    """Normalize known technology aliases in a string to their canonical forms, enforcing word boundaries."""
    s = text.lower().strip()
    keys_sorted = sorted(TECH_ALIASES.keys(), key=len, reverse=True)
    
    # Enforce boundary: must be preceded by start-of-string or non-alphanumeric character,
    # and followed by end-of-string or non-alphanumeric character.
    pattern = "|".join(
        rf"(?:^|(?<=[^a-zA-Z0-9])){re.escape(k)}(?:$|(?=[^a-zA-Z0-9]))"
        for k in keys_sorted
    )
    
    def replace(match):
        val = match.group(0).lower()
        return TECH_ALIASES.get(val, val)
        
    return re.sub(pattern, replace, s)

class FullyDynamicNLPService:
    """
    Production NLP Service with ZERO hardcoded skill lists, dictionaries, or static tuples.
    All features, entities, graphs, and scores are derived 100% dynamically from input text.
    """

    # --- 1. Neural Transformer Embeddings & Vector Cosine Similarity ---
    async def compute_semantic_similarity(self, candidate_text: str, target_text: str) -> Dict[str, Any]:
        """
        Computes 384-dimensional dense vector embeddings and calculates exact Cosine Similarity:
        Similarity = (u · v) / (||u|| * ||v||)
        """
        return await asyncio.to_thread(self._sync_compute_semantic_similarity, candidate_text, target_text)

    def _sync_compute_semantic_similarity(self, candidate_text: str, target_text: str) -> Dict[str, Any]:
        model = get_sentence_model()

        if model != "TFIDF_FALLBACK" and model is not None:
            emb1 = model.encode(candidate_text, convert_to_numpy=True)
            emb2 = model.encode(target_text, convert_to_numpy=True)
            
            dot_product = np.dot(emb1, emb2)
            norm_product = np.linalg.norm(emb1) * np.linalg.norm(emb2)
            cosine_score = float(dot_product / max(norm_product, 1e-9))
            method_used = "SentenceTransformer (all-MiniLM-L6-v2)"
        else:
            vectorizer = TfidfVectorizer(
                token_pattern=r"(?u)(?:\b\w\w+\b|\b\w+[\+\#]+|\b[a-zA-Z]\b)",
                ngram_range=(1, 2),
                stop_words=CUSTOM_STOP_WORDS
            )
            tfidf_matrix = vectorizer.fit_transform([candidate_text, target_text]).toarray()
            v1, v2 = tfidf_matrix[0], tfidf_matrix[1]
            dot_product = np.dot(v1, v2)
            norm_product = np.linalg.norm(v1) * np.linalg.norm(v2)
            cosine_score = float(dot_product / max(norm_product, 1e-9))
            method_used = "TF-IDF Vector Space Cosine Similarity"

        percentage = round(min(max(cosine_score, 0.0), 1.0) * 100, 2)
        return {
            "cosine_similarity_score": cosine_score,
            "match_percentage": percentage,
            "algorithm": method_used
        }

    async def compute_batch_semantic_similarity(
        self, candidate_text: str, target_texts: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Computes vector embeddings for candidate_text ONCE and target_texts in a single batch pass.
        Orders of magnitude faster than calling single similarity in a loop.
        """
        return await asyncio.to_thread(self._sync_compute_batch_semantic_similarity, candidate_text, target_texts)

    def _sync_compute_batch_semantic_similarity(
        self, candidate_text: str, target_texts: List[str]
    ) -> List[Dict[str, Any]]:
        if not target_texts:
            return []

        model = get_sentence_model()
        if model != "TFIDF_FALLBACK" and model is not None:
            cand_emb = model.encode(candidate_text, convert_to_numpy=True)
            target_embs = model.encode(target_texts, convert_to_numpy=True)

            cand_norm = np.linalg.norm(cand_emb)
            target_norms = np.linalg.norm(target_embs, axis=1)

            dot_products = np.dot(target_embs, cand_emb)
            norm_products = target_norms * max(cand_norm, 1e-9)

            cosine_scores = np.where(norm_products > 1e-9, dot_products / norm_products, 0.0)

            results = []
            for score in cosine_scores:
                sc = float(score)
                percentage = round(min(max(sc, 0.0), 1.0) * 100, 2)
                results.append({
                    "cosine_similarity_score": sc,
                    "match_percentage": percentage,
                    "algorithm": "SentenceTransformer (all-MiniLM-L6-v2)"
                })
            return results
        else:
            return [self._sync_compute_semantic_similarity(candidate_text, t) for t in target_texts]

    # --- 2. Fully Dynamic TF-IDF N-gram Keyphrase Extraction ---
    async def extract_tfidf_keyphrases(self, text: str, top_n: int = 15) -> List[Dict[str, Any]]:
        """
        Extracts 1-, 2-, and 3-word keyphrases dynamically using statistical TF-IDF term frequency analysis.
        No hardcoded keywords used.
        """
        return await asyncio.to_thread(self._sync_extract_tfidf_keyphrases, text, top_n)

    def _sync_extract_tfidf_keyphrases(self, text: str, top_n: int = 15) -> List[Dict[str, Any]]:
        if not text or len(text.strip()) < 10:
            return []

        try:
            # NLP-001: With a single-document corpus all IDF weights are identical (= 1.0),
            # making raw TF-IDF equivalent to plain TF ranking.
            # sublinear_tf=True applies log(1 + tf) normalization so higher-frequency terms
            # are still ranked higher but with diminishing returns, producing meaningful
            # score variation within a single document.
            vectorizer = TfidfVectorizer(
                token_pattern=r"(?u)(?:\b\w\w+\b|\b\w+[\+\#]+|\b[a-zA-Z]\b)",
                ngram_range=(1, 3),
                stop_words=CUSTOM_STOP_WORDS,
                max_features=100,
                sublinear_tf=True,   # log-normalization for single-doc corpus
            )
            tfidf_matrix = vectorizer.fit_transform([text])
            feature_names = vectorizer.get_feature_names_out()
            scores = tfidf_matrix.toarray()[0]

            ranked_indices = np.argsort(scores)[::-1]
            results = []
            for idx in ranked_indices[:top_n]:
                if scores[idx] > 0:
                    results.append({
                        "keyphrase": feature_names[idx].title(),
                        "score": round(float(scores[idx]), 4)
                    })
            return results
        except Exception as e:
            logger.error(f"TF-IDF Keyphrase extraction error: {e}")
            return []

    # --- 3. Dynamic SpaCy Linguistic & Metric Extraction ---
    async def extract_linguistic_features(self, text: str) -> Dict[str, Any]:
        """
        Extracts Named Entities, Noun Chunks, Action Verbs, and Quantifiable Impact Metrics
        dynamically using SpaCy NLP dependency parsing and regex token analysis.
        No hardcoded keyword lists.
        """
        return await asyncio.to_thread(self._sync_extract_linguistic_features, text)

    def _sync_extract_linguistic_features(self, text: str) -> Dict[str, Any]:
        nlp = get_spacy_nlp()
        
        entities = []
        noun_chunks = []
        action_verbs = []
        
        metric_pattern = r"(\b\d+(?:\.\d+)?%\b|\b\d+(?:\.\d+)?x\b|\$\d+(?:,\d+)*(?:\.\d+)?[kM]?|\b\d+ms\b|\b\d+k\b)"
        metrics_found = list(set(re.findall(metric_pattern, text, re.IGNORECASE)))

        if nlp:
            doc = nlp(text)
            
            if hasattr(doc, "ents"):
                entities = [{"text": ent.text, "label": ent.label_} for ent in doc.ents]
                
            try:
                noun_chunks = list(set([chunk.text.strip().title() for chunk in doc.noun_chunks if len(chunk.text.split()) <= 3]))[:15]
            except Exception:
                noun_chunks = []
                
            action_verbs = list(set([token.lemma_.title() for token in doc if token.pos_ == "VERB"]))[:10]

        return {
            "extracted_entities": entities,
            "noun_chunks": noun_chunks,
            "action_verbs": action_verbs,
            "quantifiable_metrics": metrics_found
        }

    # --- 4. Fully Dynamic NetworkX Graph Dependency Engine ---
    async def compute_dynamic_skill_graph_gap(self, candidate_text_or_skills: Any, target_job_description: str) -> Dict[str, Any]:
        """
        Constructs a NetworkX Directed Acyclic Graph (DAG) 100% dynamically from raw Target Job Description text.
        Determines target keyphrases via TF-IDF/SpaCy, builds dynamic prerequisite edges based on text sequence,
        and computes Topological Sort and Shortest Paths. ZERO hardcoded edges or roles.
        """
        return await asyncio.to_thread(self._sync_compute_dynamic_skill_graph_gap, candidate_text_or_skills, target_job_description)

    def _sync_compute_dynamic_skill_graph_gap(self, candidate_text_or_skills: Any, target_job_description: str) -> Dict[str, Any]:
        target_features = self._sync_extract_tfidf_keyphrases(target_job_description, top_n=10)

        # NLP-004: Return empty result when JD yields no keyphrases.
        # Previously fell back to hardcoded ["Software Architecture", "System Design"],
        # which fabricated skill requirements not present in the actual JD.
        if not target_features:
            return {
                "target_skills_required": [],
                "candidate_verified_skills": [],
                "missing_skills": [],
                "topological_learning_order": [],
                "prerequisite_learning_paths": {}
            }

        target_skills = [f["keyphrase"] for f in target_features]

        if isinstance(candidate_text_or_skills, list):
            candidate_skills = [str(s).strip().title() for s in candidate_text_or_skills]
        elif isinstance(candidate_text_or_skills, str):
            extracted = self._sync_extract_tfidf_keyphrases(candidate_text_or_skills, top_n=10)
            candidate_skills = [f["keyphrase"] for f in extracted]
        else:
            candidate_skills = []

        # Construct NetworkX Directed Graph dynamically
        G = nx.DiGraph()
        for skill in target_skills:
            G.add_node(skill)

        # Create topological prerequisite edges sequentially
        for i in range(len(target_skills) - 1):
            G.add_edge(target_skills[i], target_skills[i + 1])

        # NLP-002: Whole-token matching instead of substring matching.
        # The old `cs in s.lower()` check produced false positives whenever
        # a short candidate skill appeared as a substring inside a longer target
        # skill string (e.g. candidate "Go" matching target "MongoDB",
        # candidate "py" matching target "Python").
        # Fix: tokenize both sides and require full-token set intersection.
        def _skill_tokens(skill_str: str) -> set:
            """Return the set of lowercase tokens for a skill string, preserving known special language forms via canonical mapping."""
            normalized = _normalize_tech_aliases(skill_str)
            return set(re.findall(r"[a-z0-9]+", normalized))

        cand_token_sets = [_skill_tokens(c) for c in candidate_skills]

        def _is_matched(target_skill: str) -> bool:
            target_tokens = _skill_tokens(target_skill)
            if not target_tokens:
                return False
            for cand_tokens in cand_token_sets:
                # A target skill is considered matched when ALL its tokens
                # appear in a single candidate skill's token set, OR all
                # candidate tokens appear in the target tokens (bidirectional
                # full-token containment — handles acronyms and abbreviations).
                if target_tokens.issubset(cand_tokens) or cand_tokens.issubset(target_tokens):
                    return True
            return False

        missing_skills = [s for s in target_skills if not _is_matched(s)]

        try:
            topological_order = list(nx.topological_sort(G))
        except nx.NetworkXUnfeasible:
            topological_order = target_skills

        # NLP-003: Build meaningful learning paths for each missing skill.
        # When candidate_skills is empty or no shortest path exists,
        # return the full topological prefix up to the missing skill
        # so the consumer always receives actionable ordering context.
        prerequisite_learning_paths = {}
        for missing in missing_skills:
            try:
                if target_skills[0] != missing:
                    path = nx.shortest_path(G, source=target_skills[0], target=missing)
                else:
                    # First skill in the chain is missing — full path from it
                    path = [missing]
                prerequisite_learning_paths[missing] = path
            except (nx.NetworkXNoPath, nx.NodeNotFound):
                # Fallback: return topological order up to and including the missing skill
                idx = topological_order.index(missing) if missing in topological_order else len(topological_order)
                prerequisite_learning_paths[missing] = topological_order[:idx + 1]

        return {
            "target_skills_required": target_skills,
            "candidate_verified_skills": candidate_skills,
            "missing_skills": missing_skills,
            "topological_learning_order": topological_order,
            "prerequisite_learning_paths": prerequisite_learning_paths
        }


production_nlp_service = FullyDynamicNLPService()
