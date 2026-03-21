import os
import requests as req
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

OLLAMA_BASE = os.getenv("API_BASE", "http://ollama:11434/v1")
# Derive Ollama root URL (e.g. http://ollama:11434)
_ollama_root = OLLAMA_BASE.replace("/v1", "").rstrip("/")


@router.get("/models")
def list_models():
    """Return available models from Ollama (or just the current configured model)."""
    try:
        tags_url = f"{_ollama_root}/api/tags"
        resp = req.get(tags_url, timeout=5)
        if resp.ok:
            data = resp.json()
            models = [m["name"] for m in data.get("models", [])]
            return {"models": models, "current": os.getenv("MODEL_NAME", "qwen2.5:7b")}
    except Exception:
        pass
    # Fallback: return current model only
    return {"models": [os.getenv("MODEL_NAME", "qwen2.5:7b")], "current": os.getenv("MODEL_NAME", "qwen2.5:7b")}


class ModelConfig(BaseModel):
    model_name: str | None = None
    api_base: str | None = None
    api_key: str | None = None
    gemini_key: str | None = None


@router.post("/model")
def set_model(config: ModelConfig):
    """Update LLM configuration at runtime."""
    try:
        if config.gemini_key:
            os.environ["GEMINI_API_KEY"] = config.gemini_key
            os.environ.pop("API_BASE", None)
            os.environ.pop("API_KEY", None)
        elif config.api_base:
            os.environ["API_BASE"] = config.api_base
            os.environ["API_KEY"] = config.api_key or "ollama"
            os.environ.pop("GEMINI_API_KEY", None)

        if config.model_name:
            os.environ["MODEL_NAME"] = config.model_name

        # Reinitialize all services with new LLM
        from services import rag_service as rs
        from services import podcast_service as ps
        from services import mindmap_service as ms
        from services import summary_service as ss
        from services import flashcard_service as fs
        from services.llm_provider import get_llm, MockLLM

        new_llm = get_llm()
        rs.rag_service.llm = new_llm or MockLLM()
        ps.podcast_service.llm = get_llm(temperature=0.7)
        ms.mindmap_service.llm = get_llm(temperature=0.1)
        ss.summary_service.llm = get_llm(temperature=0.2) or MockLLM()
        fs.flashcard_service.llm = get_llm(temperature=0.3) or MockLLM()

        return {"status": "ok", "model": os.getenv("MODEL_NAME"), "api_base": os.getenv("API_BASE", "gemini")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
