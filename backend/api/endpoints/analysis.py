from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from services.rag_service import rag_service
from services.llm_provider import get_llm
import json, re, time

router = APIRouter()


class AnalysisRequest(BaseModel):
    doc_id: str


class AnalysisSection(BaseModel):
    title: str
    items: List[str]


class AnalysisResponse(BaseModel):
    status: str
    doc_id: str
    sections: List[AnalysisSection]
    token_usage: Optional[dict] = None


@router.post("/generate", response_model=AnalysisResponse)
async def generate_analysis(request: AnalysisRequest):
    """Generate comprehensive multi-section analysis of the document."""
    try:
        context = rag_service.get_document_context(request.doc_id)
        if not context or "Нет данных" in context:
            raise HTTPException(status_code=404, detail="Document not found")

        llm = get_llm()
        prompt = (
            "Проанализируй следующий документ и верни структурированный анализ в формате JSON.\n\n"
            f"Текст документа (фрагменты):\n{context[:5000]}\n\n"
            "Верни ТОЛЬКО JSON-объект (без пояснений) следующей структуры:\n"
            "{\n"
            "  \"Ключевые тезисы\": [\"тезис 1\", \"тезис 2\", ...],\n"
            "  \"Главные сущности\": [\"компания/персона 1 — роль\", ...],\n"
            "  \"Финансовые показатели\": [\"показатель: значение\", ...],\n"
            "  \"Риски и проблемы\": [\"риск 1\", ...],\n"
            "  \"Выводы и рекомендации\": [\"вывод 1\", ...]\n"
            "}\n"
            "Каждый раздел — 3-5 пунктов. Если данных нет — пустой массив []."
        )

        t0 = time.monotonic()
        response = llm.invoke(prompt)
        elapsed_ms = int((time.monotonic() - t0) * 1000)
        text = response.content if hasattr(response, "content") else str(response)

        # Parse JSON
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if not match:
            raise HTTPException(status_code=500, detail="Failed to parse analysis")

        raw = json.loads(match.group())

        sections = []
        for title, items in raw.items():
            if isinstance(items, list) and items:
                sections.append(AnalysisSection(
                    title=title,
                    items=[str(i) for i in items]
                ))

        # Token usage
        usage = getattr(response, "usage_metadata", None)
        token_info = {"response_time_ms": elapsed_ms}
        if usage:
            token_info["prompt_tokens"] = getattr(usage, "input_tokens", 0)
            token_info["completion_tokens"] = getattr(usage, "output_tokens", 0)

        return AnalysisResponse(
            status="success",
            doc_id=request.doc_id,
            sections=sections,
            token_usage=token_info
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")
