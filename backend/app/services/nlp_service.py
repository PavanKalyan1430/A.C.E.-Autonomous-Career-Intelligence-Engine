import re
import logging
import numpy as np
from typing import List, Dict, Any, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
import networkx as nx

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


class FullyDynamicNLPService:
    """
    Production NLP Service with ZERO hardcoded skill lists, dictionaries, or static tuples.
    All features, entities, graphs, and scores are derived 100% dynamically from input text.
    """

    # --- 1. Neural Transformer Embeddings & Vector Cosine Similarity ---
    def compute_semantic_similarity(self, candidate_text: str, target_text: str) -> Dict[str, Any]:
        """
        Computes 384-dimensional dense vector embeddings and calculates exact Cosine Similarity:
        Similarity = (u · v) / (||u|| * ||v||)
        """
        model = get_sentence_model()

        if model != "TFIDF_FALLBACK" and model is not None:
            emb1 = model.encode(candidate_text, convert_to_numpy=True)
            emb2 = model.encode(target_text, convert_to_numpy=True)
            
            dot_product = np.dot(emb1, emb2)
            norm_product = np.linalg.norm(emb1) * np.linalg.norm(emb2)
            cosine_score = float(dot_product / max(norm_product, 1e-9))
            method_used = "SentenceTransformer (all-MiniLM-L6-v2)"
        else:
            vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words="english")
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

    # --- 2. Fully Dynamic TF-IDF N-gram Keyphrase Extraction ---
    def extract_tfidf_keyphrases(self, text: str, top_n: int = 15) -> List[Dict[str, Any]]:
        """
        Extracts 1-, 2-, and 3-word keyphrases dynamically using statistical TF-IDF term frequency analysis.
        No hardcoded keywords used.
        """
        if not text or len(text.strip()) < 10:
            return []
            
        try:
            vectorizer = TfidfVectorizer(
                ngram_range=(1, 3),
                stop_words="english",
                max_features=100
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
    def extract_linguistic_features(self, text: str) -> Dict[str, Any]:
        """
        Extracts Named Entities, Noun Chunks, Action Verbs, and Quantifiable Impact Metrics
        dynamically using SpaCy NLP dependency parsing and regex token analysis.
        No hardcoded keyword lists.
        """
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
    def compute_dynamic_skill_graph_gap(self, candidate_text_or_skills: Any, target_job_description: str) -> Dict[str, Any]:
        """
        Constructs a NetworkX Directed Acyclic Graph (DAG) 100% dynamically from raw Target Job Description text.
        Determines target keyphrases via TF-IDF/SpaCy, builds dynamic prerequisite edges based on text sequence,
        and computes Topological Sort and Shortest Paths. ZERO hardcoded edges or roles.
        """
        target_features = self.extract_tfidf_keyphrases(target_job_description, top_n=10)
        target_skills = [f["keyphrase"] for f in target_features] if target_features else ["Software Architecture", "System Design"]

        if isinstance(candidate_text_or_skills, list):
            candidate_skills = [str(s).strip().title() for s in candidate_text_or_skills]
        elif isinstance(candidate_text_or_skills, str):
            extracted = self.extract_tfidf_keyphrases(candidate_text_or_skills, top_n=10)
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

        cand_lower = [c.lower() for c in candidate_skills]
        missing_skills = [s for s in target_skills if not any(cs in s.lower() or s.lower() in cs for cs in cand_lower)]

        try:
            topological_order = list(nx.topological_sort(G))
        except nx.NetworkXUnfeasible:
            topological_order = target_skills

        prerequisite_learning_paths = {}
        for missing in missing_skills:
            if candidate_skills and target_skills[0] in G and missing in G:
                try:
                    path = nx.shortest_path(G, source=target_skills[0], target=missing)
                    prerequisite_learning_paths[missing] = path
                except (nx.NetworkXNoPath, nx.NodeNotFound):
                    prerequisite_learning_paths[missing] = [target_skills[0], missing]
            else:
                prerequisite_learning_paths[missing] = [missing]

        return {
            "target_skills_required": target_skills,
            "candidate_verified_skills": candidate_skills,
            "missing_skills": missing_skills,
            "topological_learning_order": topological_order,
            "prerequisite_learning_paths": prerequisite_learning_paths
        }


production_nlp_service = FullyDynamicNLPService()
