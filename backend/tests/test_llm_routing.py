import pytest
import asyncio
from unittest.mock import patch, MagicMock, AsyncMock
from app.core.llm_router import generate_content_with_routing, RoutedChatModel
from langchain_core.messages import HumanMessage

@pytest.mark.anyio
async def test_routing_groq_success():
    """Verify that Groq is called and succeeds, without hitting Gemini."""
    mock_groq_response = MagicMock()
    mock_groq_response.choices = [MagicMock()]
    mock_groq_response.choices[0].message.content = "Groq Output"

    with patch("groq.AsyncGroq.chat") as mock_groq_chat, \
         patch("app.core.llm_router.get_genai_client") as mock_get_gemini:
        
        # Setup mock for groq
        mock_completions = MagicMock()
        mock_completions.create = AsyncMock(return_value=mock_groq_response)
        mock_groq_chat.completions = mock_completions

        # Setup mock for gemini (should not be called)
        mock_get_gemini.return_value = MagicMock()

        result = await generate_content_with_routing("Hello")
        assert result == "Groq Output"
        mock_completions.create.assert_called_once()
        mock_get_gemini.assert_not_called()


@pytest.mark.anyio
async def test_routing_groq_fails_gemini_fallback():
    """Verify that if Groq fails, Gemini is called and succeeds."""
    mock_gemini_client = MagicMock()
    
    # Let's mock a modern client generate_content
    mock_gemini_response = MagicMock()
    mock_gemini_response.text = "Gemini Output"
    mock_gemini_client.aio.models.generate_content = AsyncMock(return_value=mock_gemini_response)

    with patch("groq.AsyncGroq.chat") as mock_groq_chat, \
         patch("app.core.llm_router.get_genai_client", return_value=mock_gemini_client):
        
        # Setup mock for groq to throw error
        mock_completions = MagicMock()
        mock_completions.create = AsyncMock(side_effect=Exception("Groq rate limit or quota exceeded"))
        mock_groq_chat.completions = mock_completions

        result = await generate_content_with_routing("Hello")
        assert result == "Gemini Output"
        mock_gemini_client.aio.models.generate_content.assert_called_once()


@pytest.mark.anyio
async def test_routing_both_fail():
    """Verify that if both Groq and Gemini fail, an exception is raised."""
    mock_gemini_client = MagicMock()
    mock_gemini_client.aio.models.generate_content = AsyncMock(side_effect=Exception("Gemini Service Unavailable"))

    with patch("groq.AsyncGroq.chat") as mock_groq_chat, \
         patch("app.core.llm_router.get_genai_client", return_value=mock_gemini_client):
        
        # Setup mock for groq to throw error
        mock_completions = MagicMock()
        mock_completions.create = AsyncMock(side_effect=Exception("Groq failure"))
        mock_groq_chat.completions = mock_completions

        with pytest.raises(Exception):
            await generate_content_with_routing("Hello")


@pytest.mark.anyio
async def test_routed_chat_model_agent_groq():
    """Verify RoutedChatModel routes agent queries to Groq."""
    mock_groq_response = MagicMock()
    mock_groq_response.choices = [MagicMock()]
    mock_groq_response.choices[0].message.content = "Agent Groq Output"

    with patch("groq.AsyncGroq.chat") as mock_groq_chat, \
         patch("app.core.llm_router.get_genai_client") as mock_get_gemini:
        
        mock_completions = MagicMock()
        mock_completions.create = AsyncMock(return_value=mock_groq_response)
        mock_groq_chat.completions = mock_completions

        model = RoutedChatModel()
        res = await model._agenerate([HumanMessage(content="Hello Agent")])
        assert res.generations[0].message.content == "Agent Groq Output"
        mock_completions.create.assert_called_once()
        mock_get_gemini.assert_not_called()
