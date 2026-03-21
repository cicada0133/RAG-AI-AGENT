import os


def get_llm(temperature=0.3):
    """
    Returns the best available LLM based on environment variables.

    Priority:
    1. GEMINI_API_KEY -> Google Gemini (cloud, requires quota)
    2. API_BASE + API_KEY -> OpenAI-compatible endpoint (Ollama, vLLM, LM Studio, etc.)
    3. MockLLM -> Returns raw context as answer (no external dependencies)
    """
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    api_key = os.getenv("API_KEY", "")
    api_base = os.getenv("API_BASE", "")
    model_name = os.getenv("MODEL_NAME", "gemma3:4b")

    if gemini_key:
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            return ChatGoogleGenerativeAI(
                model="gemini-2.5-flash",
                google_api_key=gemini_key,
                temperature=temperature
            )
        except ImportError:
            pass

    if api_base and api_key:
        try:
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(
                model_name=model_name,
                openai_api_key=api_key,
                openai_api_base=api_base,
                temperature=temperature,
                # Ollama can be slow — give it time
                request_timeout=120,
            )
        except ImportError:
            pass

    return None


class MockLLM:
    """Fallback mock LLM — returns relevant context text as the answer."""

    def invoke(self, prompt: str):
        class Resp:
            content = ""

        r = Resp()
        if "Контекст:" in prompt and "Вопрос:" in prompt:
            ctx_start = prompt.find("Контекст:") + 9
            ctx_end = prompt.find("Вопрос:")
            ctx = prompt[ctx_start:ctx_end].strip()
            r.content = (ctx[:600] + "...") if len(ctx) > 600 else ctx
        else:
            r.content = prompt[:300]
        return r
