import pytest
import asyncio
from app.core.genai import get_genai_client
from app.services.nlp_service import production_nlp_service
from app.core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from unittest.mock import MagicMock, patch, AsyncMock

@pytest.mark.anyio
async def test_genai_client_singleton_lifecycle():
    """Verify that get_genai_client returns a cached singleton instance of the client."""
    with patch("google.genai.Client") as mock_client:
        c1 = get_genai_client()
        c2 = get_genai_client()
        if c1 is not None and c2 is not None:
            assert c1 is c2

@pytest.mark.anyio
async def test_nlp_service_async_execution():
    """Verify that NLP service methods are asynchronous and return accurate results."""
    # Test compute_semantic_similarity
    sim_res = await production_nlp_service.compute_semantic_similarity("Python Fastapi Development", "Python Fastapi Development")
    assert sim_res["match_percentage"] == 100.0
    assert "cosine_similarity_score" in sim_res
    
    # Test extract_tfidf_keyphrases
    keyphrases = await production_nlp_service.extract_tfidf_keyphrases("Software engineer building distributed microservices systems.", top_n=3)
    assert len(keyphrases) > 0
    
    # Test extract_linguistic_features (using 5k which matches word boundary regex constraints)
    linguistic = await production_nlp_service.extract_linguistic_features("We reduced response times by 5k using python.")
    assert "5k" in linguistic["quantifiable_metrics"]
    
    # Test compute_dynamic_skill_graph_gap
    gap = await production_nlp_service.compute_dynamic_skill_graph_gap(["Python"], "Fastapi Kubernetes Docker")
    assert "Kubernetes" in gap["missing_skills"]

@pytest.mark.anyio
async def test_database_get_db_session_lifecycle():
    """Verify get_db transaction yield and rollback lifecycle."""
    mock_session = MagicMock(spec=AsyncSession)
    
    # Mock SessionLocal() as an async context manager
    mock_context = MagicMock()
    mock_context.__aenter__ = AsyncMock(return_value=mock_session)
    mock_context.__aexit__ = AsyncMock(return_value=None)
    
    # Patch SessionLocal to return our mock context manager
    with patch("app.core.database.SessionLocal", return_value=mock_context):
        # 1. Successful yield path
        generator = get_db()
        yielded_session = await anext(generator)
        assert yielded_session is mock_session
        
        # Generator should complete successfully without calling commit
        try:
            await anext(generator)
        except StopAsyncIteration:
            pass
        mock_session.commit.assert_not_called()
        mock_session.close.assert_called_once()
        mock_context.__aexit__.assert_called_once()
        
        # Reset exit mocks
        mock_context.__aexit__.reset_mock()
        mock_session.rollback.reset_mock()
        
        # 2. Failure rollback path
        generator = get_db()
        yielded_session = await anext(generator)
        
        # Simulate exception raised inside request handler using generator.athrow
        try:
            await generator.athrow(ValueError("API Request Failed"))
        except ValueError:
            pass
            
        mock_session.rollback.assert_called_once()
        mock_context.__aexit__.assert_called_once()
