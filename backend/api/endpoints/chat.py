from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from services.rag_service import rag_service
from services.llm_provider import get_llm
import json, re

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    doc_id: Optional[str] = None

class TokenUsage(BaseModel):
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    response_time_ms: int
    is_estimated: bool

class ChatResponse(BaseModel):
    answer: str
    sources: List[str]
    context_snippets: List[str]
    token_usage: Optional[TokenUsage] = None

class FollowupRequest(BaseModel):
    question: str
    answer: str
    doc_id: Optional[str] = None

class FollowupResponse(BaseModel):
    followups: List[str]

@router.post("/", response_model=ChatResponse)
async def chat_with_docs(request: ChatRequest):
    """Chat with the loaded documents."""
    try:
        result = rag_service.query(request.message, request.doc_id)
        return ChatResponse(
            answer=result["answer"],
            sources=result["sources"],
            context_snippets=result.get("context_snippets", []),
            token_usage=result.get("token_usage")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


@router.post("/followups", response_model=FollowupResponse)
async def get_followup_questions(request: FollowupRequest):
    """Generate 2-3 follow-up questions based on the previous Q&A."""
    try:
        llm = get_llm()
        prompt = (
            f"Пользователь спросил: {request.question}\n"
            f"AI ответил: {request.answer}\n\n"
            "Предложи ровно 3 коротких уточняющих вопроса, которые помогут пользователю "
            "глубже разобраться в теме. Вопросы должны быть на русском языке, краткими (до 10 слов), "
            "разными по содержанию.\n"
            "Верни ТОЛЬКО JSON-массив строк, без пояснений. "
            "Пример: [\"Вопрос 1?\", \"Вопрос 2?\", \"Вопрос 3?\"]"
        )
        response = llm.invoke(prompt)
        text = response.content if hasattr(response, "content") else str(response)
        match = re.search(r'\[.*?\]', text, re.DOTALL)
        if match:
            followups = json.loads(match.group())
            followups = [str(f).strip() for f in followups if str(f).strip()][:3]
        else:
            followups = []
        return FollowupResponse(followups=followups)
    except Exception:
        return FollowupResponse(followups=[])
