import os
import json
import logging
import asyncio
from typing import Any, List, Optional, Dict

from groq import AsyncGroq
from app.core.config import settings
from app.core.genai import get_genai_client
from app.core.groq_key_rotator import groq_key_rotator

# LangChain imports for the custom routed chat model
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage, AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.outputs import ChatGeneration, ChatResult
from langchain_core.callbacks import CallbackManagerForLLMRun, AsyncCallbackManagerForLLMRun

logger = logging.getLogger(__name__)

# Track active provider globally for verification/observability
_active_provider = "Unknown"

def get_active_provider() -> str:
    global _active_provider
    return _active_provider

def set_active_provider(provider: str):
    global _active_provider
    _active_provider = provider

async def _execute_with_retry(func, retries=0, initial_delay=0.5, backoff_factor=1.5):
    delay = initial_delay
    for attempt in range(retries + 1):
        try:
            return await func()
        except (asyncio.TimeoutError, Exception) as e:
            err_str = str(e).lower()
            if any(term in err_str for term in ["invalid api key", "invalid_api_key", "unauthorized", "401", "429", "rate limit", "rate_limit", "quota"]):
                raise e
            if attempt == retries:
                raise e
            logger.warning(f"Transient error: {e}. Retrying attempt {attempt+1} in {delay}s...")
            await asyncio.sleep(delay)
            delay *= backoff_factor

async def generate_content_with_routing(
    prompt: str,
    system_instruction: str = None,
    response_mime_type: str = None,
    timeout: float = None
) -> str:
    """
    Centralized router for text LLM generation.
    Primary: Groq (qwen/qwen3.8-27b)
    Fallback 1: Groq (qwen/qwen3.6-27b)
    Fallback 2: Gemini Flash (gemini-2.5-flash)
    """
    if timeout is None or timeout > 20.0:
        timeout = 20.0

    # 1. Try Groq Primary (rotate across available keys)
    max_groq_attempts = max(1, groq_key_rotator.key_count() or 1)
    for groq_attempt in range(max_groq_attempts):
        groq_api_key = await groq_key_rotator.async_next_key()
        if not groq_api_key:
            break
        try:
            logger.info(f"Attempting primary LLM generation via Groq (key attempt {groq_attempt+1})")
            async with AsyncGroq(api_key=groq_api_key) as groq_client:
                messages = []
                if system_instruction:
                    messages.append({"role": "system", "content": system_instruction})
                messages.append({"role": "user", "content": prompt})

                extra_args = {}
                if response_mime_type == "application/json":
                    extra_args["response_format"] = {"type": "json_object"}

                res = await asyncio.wait_for(
                    groq_client.chat.completions.create(
                        model="qwen/qwen3.8-27b",
                        messages=messages,
                        temperature=0.2,
                        **extra_args
                    ),
                    timeout=timeout
                )
                content = res.choices[0].message.content
                if content and content.strip():
                    set_active_provider("Groq")
                    logger.info("Successfully generated content via Groq.")
                    return content
        except Exception as e:
            err_msg = str(e).lower()
            logger.warning(f"Groq attempt {groq_attempt+1} failed: {e}. Trying next key/provider...")
            if "rate_limit" in err_msg or "429" in err_msg:
                continue

    # 2. Try Gemini Models Fallback
    gemini_client = get_genai_client()
    if gemini_client:
        full_prompt = prompt
        if system_instruction:
            full_prompt = f"{system_instruction}\n\n{prompt}"

        config = {"temperature": 0.0}
        if response_mime_type == "application/json":
            config["response_mime_type"] = "application/json"

        gemini_models = ["gemini-2.5-flash", "gemini-1.5-flash"]
        for g_model in gemini_models:
            try:
                logger.info(f"Attempting fallback LLM generation via Gemini ({g_model})")
                if hasattr(gemini_client, "models"):
                    async def _call_gemini_modern():
                        return await asyncio.wait_for(
                            gemini_client.aio.models.generate_content(
                                model=g_model,
                                contents=full_prompt,
                                config=config
                            ),
                            timeout=timeout
                        )
                    response = await _execute_with_retry(_call_gemini_modern)
                    set_active_provider("Gemini")
                    logger.info(f"Successfully generated content via Gemini ({g_model}).")
                    return response.text
                else:
                    generation_config = {}
                    if response_mime_type == "application/json":
                        generation_config["response_mime_type"] = "application/json"
                    async def _call_gemini_legacy():
                        return await asyncio.wait_for(
                            asyncio.to_thread(
                                gemini_client.generate_content,
                                full_prompt,
                                generation_config=generation_config
                            ),
                            timeout=timeout
                        )
                    response = await _execute_with_retry(_call_gemini_legacy)
                    set_active_provider("Gemini")
                    logger.info(f"Successfully generated content via Gemini ({g_model} legacy).")
                    return response.text
            except Exception as e:
                logger.warning(f"Gemini {g_model} failed: {e}. Trying next model...")

    set_active_provider("None")
    raise ValueError("No LLM providers available and configured.")



class RoutedChatModel(BaseChatModel):
    """
    Custom LangChain chat model wrapper that interfaces with the ReAct agent
    and routes requests between Groq and Gemini.
    """
    model_name: str = "routed-groq-gemini"
    temperature: float = 0.2
    tools: Optional[List[Any]] = None

    @property
    def _llm_type(self) -> str:
        return "routed-groq-gemini"

    def bind_tools(self, tools: List[Any], **kwargs: Any) -> Any:
        self.tools = tools
        return self

    def _convert_messages_to_groq(self, messages: List[BaseMessage]) -> List[Dict[str, Any]]:
        groq_msgs = []
        for msg in messages:
            if isinstance(msg, SystemMessage):
                groq_msgs.append({"role": "system", "content": msg.content})
            elif isinstance(msg, HumanMessage):
                groq_msgs.append({"role": "user", "content": msg.content})
            elif isinstance(msg, AIMessage):
                msg_dict = {"role": "assistant"}
                if msg.content:
                    msg_dict["content"] = msg.content
                if msg.tool_calls:
                    msg_dict["tool_calls"] = [
                        {
                            "id": tc["id"],
                            "type": "function",
                            "function": {
                                "name": tc["name"],
                                "arguments": json.dumps(tc["args"])
                            }
                        } for tc in msg.tool_calls
                    ]
                groq_msgs.append(msg_dict)
            elif isinstance(msg, ToolMessage):
                groq_msgs.append({
                    "role": "tool",
                    "tool_call_id": msg.tool_call_id,
                    "name": msg.name,
                    "content": msg.content
                })
            else:
                groq_msgs.append({"role": "user", "content": msg.content})
        return groq_msgs

    def _convert_messages_to_gemini(self, messages: List[BaseMessage]) -> str:
        import re
        prompt_parts = []
        for msg in messages:
            if isinstance(msg, SystemMessage):
                cleaned = msg.content
                cleaned = re.sub(r"- Use \w+_tool.*?\n", "", cleaned)
                cleaned = cleaned.replace("retrieve_user_memory_tool", "user memory")
                cleaned = cleaned.replace("nlp_semantic_similarity_tool", "semantic similarity")
                cleaned = cleaned.replace("compute_topological_skill_gap_tool", "skill gap analyser")
                cleaned = cleaned.replace("evaluate_star_interview_tool", "STAR evaluator")
                cleaned = cleaned.replace("search_company_intelligence_tool", "company search")
                cleaned = cleaned.replace("generate_interview_questions_tool", "interview questions generator")
                cleaned = cleaned.replace("parse_resume_document_tool", "resume parser")
                prompt_parts.append(f"System: {cleaned}")
            elif isinstance(msg, HumanMessage):
                prompt_parts.append(f"User: {msg.content}")
            elif isinstance(msg, AIMessage):
                prompt_parts.append(f"Assistant: {msg.content}")
            elif isinstance(msg, ToolMessage):
                prompt_parts.append(f"Tool {msg.name} Result: {msg.content}")
            else:
                prompt_parts.append(msg.content)
        return "\n\n".join(prompt_parts)

    def _get_groq_tools(self) -> List[Dict[str, Any]]:
        groq_tools = []
        if self.tools:
            for t in self.tools:
                properties = {}
                required = []
                if hasattr(t, "args_schema") and t.args_schema:
                    schema = t.args_schema.schema()
                    properties = schema.get("properties", {})
                    required = schema.get("required", [])
                groq_tools.append({
                    "type": "function",
                    "function": {
                        "name": t.name,
                        "description": t.description,
                        "parameters": {
                            "type": "object",
                            "properties": properties,
                            "required": required
                        }
                    }
                })
        return groq_tools

    async def _agenerate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[AsyncCallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> ChatResult:
        # Enforce request-scoped tool execution budget
        tool_messages_count = sum(1 for m in messages if isinstance(m, ToolMessage) or getattr(m, "role", None) == "tool")
        if tool_messages_count >= settings.AGENT_MAX_TOOL_CALLS:
            raise ValueError("Agent tool call limit exceeded")

        # 1. Try Gemini 3.6 Flash Primary
        gemini_client = get_genai_client()
        if gemini_client:
            try:
                prompt = self._convert_messages_to_gemini(messages)
                if hasattr(gemini_client, "models"):
                    try:
                        async def _call_gemini_modern():
                            return await asyncio.wait_for(
                                gemini_client.aio.models.generate_content(
                                    model="gemini-3.6-flash",
                                    contents=prompt,
                                    config={"temperature": self.temperature}
                                ),
                                timeout=settings.LLM_QUESTION_TIMEOUT
                            )
                        response = await _execute_with_retry(_call_gemini_modern)
                        set_active_provider("Gemini")
                        ai_msg = AIMessage(content=response.text)
                        return ChatResult(generations=[ChatGeneration(message=ai_msg)])
                    except Exception as mod_err:
                        logger.warning(f"Modern Gemini API call failed: {mod_err}. Attempting legacy Gemini fallback...")

                import google.generativeai as legacy_genai
                legacy_genai.configure(api_key=settings.GEMINI_API_KEY)
                leg_model = legacy_genai.GenerativeModel("gemini-3.6-flash")
                async def _call_gemini_legacy():
                    return await asyncio.wait_for(
                        asyncio.to_thread(
                            leg_model.generate_content,
                            prompt,
                            generation_config={"temperature": self.temperature}
                        ),
                        timeout=settings.LLM_QUESTION_TIMEOUT
                    )
                response = await _execute_with_retry(_call_gemini_legacy)
                set_active_provider("Gemini")
                ai_msg = AIMessage(content=response.text)
                return ChatResult(generations=[ChatGeneration(message=ai_msg)])

            except Exception as e:
                logger.warning(f"Gemini agent generation failed: {e}. Falling back to Groq...")

        # 2. Try Groq Secondary
        max_groq_attempts = min(3, groq_key_rotator.key_count() or 1)
        for groq_attempt in range(max_groq_attempts):
            groq_api_key = await groq_key_rotator.async_next_key()
            if not groq_api_key:
                break
            try:
                async with AsyncGroq(api_key=groq_api_key) as groq_client:
                    groq_msgs = self._convert_messages_to_groq(messages)
                    groq_tools = self._get_groq_tools()

                    extra_args = {}
                    if groq_tools:
                        extra_args["tools"] = groq_tools

                    res = await asyncio.wait_for(
                        groq_client.chat.completions.create(
                            model="qwen/qwen3.8-27b",
                            messages=groq_msgs,
                            temperature=self.temperature,
                            **extra_args
                        ),
                        timeout=settings.LLM_QUESTION_TIMEOUT
                    )
                    content = res.choices[0].message.content
                    if content or getattr(res.choices[0].message, "tool_calls", None):
                        set_active_provider("Groq")
                        tool_calls = []
                        res_msg = res.choices[0].message
                        if hasattr(res_msg, "tool_calls") and res_msg.tool_calls:
                            for tc in res_msg.tool_calls:
                                tool_calls.append({
                                    "name": tc.function.name,
                                    "args": json.loads(tc.function.arguments),
                                    "id": tc.id
                                })
                        ai_msg = AIMessage(content=res_msg.content or "", tool_calls=tool_calls)
                        return ChatResult(generations=[ChatGeneration(message=ai_msg)])
            except Exception as e:
                logger.warning(f"Groq attempt {groq_attempt+1} failed: {e}")
                if "rate_limit" in str(e).lower() or "429" in str(e):
                    break
                continue

        set_active_provider("None")
        raise ValueError("No LLM providers available for agent execution.")

    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> ChatResult:
        return asyncio.run(self._agenerate(messages, stop, **kwargs))
