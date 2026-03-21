from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from services.rag_service import rag_service
from services.llm_provider import get_llm
import json, re, time

router = APIRouter()


class PresentationRequest(BaseModel):
    doc_id: str
    slide_count: int = 8


class SlideEditRequest(BaseModel):
    doc_id: str
    slides: List[dict]
    slide_index: int
    instruction: str


class PresentationResponse(BaseModel):
    status: str
    doc_id: str
    title: str
    slides: List[dict]
    token_usage: Optional[dict] = None


@router.post("/generate", response_model=PresentationResponse)
async def generate_presentation(request: PresentationRequest):
    """Generate a presentation with slides from the document."""
    try:
        context = rag_service.get_document_context(request.doc_id)
        if not context or "Нет данных" in context:
            raise HTTPException(status_code=404, detail="Document not found")

        llm = get_llm()
        n = min(max(request.slide_count, 3), 15)

        prompt = (
            f"Создай профессиональную презентацию из {n} слайдов на основе следующего документа.\n\n"
            f"Текст документа:\n{context[:6000]}\n\n"
            "Верни ТОЛЬКО JSON-объект следующей структуры (без пояснений):\n"
            "{\n"
            "  \"title\": \"Название презентации\",\n"
            "  \"slides\": [\n"
            "    {\n"
            "      \"id\": 1,\n"
            "      \"layout\": \"title\",\n"
            "      \"title\": \"Заголовок слайда\",\n"
            "      \"subtitle\": \"Подзаголовок (только для layout=title)\",\n"
            "      \"bullets\": [\"пункт 1\", \"пункт 2\"],\n"
            "      \"accent\": \"blue\",\n"
            "      \"image_query\": \"keyword for unsplash image in english\",\n"
            "      \"speaker_notes\": \"Краткие заметки для спикера\"\n"
            "    }\n"
            "  ]\n"
            "}\n\n"
            "Правила для layout:\n"
            "- Первый слайд: layout=\"title\" (title + subtitle)\n"
            "- Основной контент: layout=\"bullets\" (title + bullets 3-5 пунктов)\n"
            "- Визуальный слайд с изображением: layout=\"image\" (title + image + 1-2 bullets)\n"
            "- Цитаты/ключевые данные: layout=\"quote\" (title + один большой текст в bullets[0])\n"
            "- Финальный слайд: layout=\"end\" (title + subtitle)\n\n"
            "Для accent используй: blue, purple, green, red, orange, teal — по смыслу слайда.\n"
            "image_query: краткий поисковый запрос на английском для Unsplash (2-3 слова, конкретные, "
            "например 'cryptocurrency trading', 'data analysis', 'team meeting'). "
            "Делай минимум 2-3 слайда с layout=image.\n"
            "Сделай контент конкретным и ценным, не общими словами. "
            f"Ровно {n} слайдов."
        )

        t0 = time.monotonic()
        response = llm.invoke(prompt)
        elapsed_ms = int((time.monotonic() - t0) * 1000)
        text = response.content if hasattr(response, "content") else str(response)

        match = re.search(r'\{.*\}', text, re.DOTALL)
        if not match:
            raise HTTPException(status_code=500, detail="Failed to parse presentation JSON")

        raw = json.loads(match.group())
        slides = raw.get("slides", [])
        title = raw.get("title", "Презентация")

        # Normalize slides
        for i, slide in enumerate(slides):
            slide.setdefault("id", i + 1)
            slide.setdefault("layout", "bullets")
            slide.setdefault("title", f"Слайд {i+1}")
            slide.setdefault("bullets", [])
            slide.setdefault("subtitle", "")
            slide.setdefault("accent", "purple")
            slide.setdefault("image_query", "")
            slide.setdefault("speaker_notes", "")

        usage = getattr(response, "usage_metadata", None)
        token_info = {"response_time_ms": elapsed_ms}
        if usage:
            token_info["prompt_tokens"] = getattr(usage, "input_tokens", 0)
            token_info["completion_tokens"] = getattr(usage, "output_tokens", 0)

        return PresentationResponse(
            status="success",
            doc_id=request.doc_id,
            title=title,
            slides=slides,
            token_usage=token_info
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Presentation error: {str(e)}")


@router.post("/edit-slide")
async def edit_slide(request: SlideEditRequest):
    """AI edits a specific slide based on user instruction."""
    try:
        llm = get_llm()
        idx = request.slide_index
        if idx < 0 or idx >= len(request.slides):
            raise HTTPException(status_code=400, detail="Invalid slide index")

        current = request.slides[idx]
        prompt = (
            f"Текущий слайд {idx+1}:\n{json.dumps(current, ensure_ascii=False, indent=2)}\n\n"
            f"Инструкция пользователя: {request.instruction}\n\n"
            "Верни ТОЛЬКО JSON-объект обновлённого слайда с теми же полями (id, layout, title, subtitle, bullets, accent, speaker_notes). "
            "Не добавляй новые поля. Без пояснений."
        )
        response = llm.invoke(prompt)
        text = response.content if hasattr(response, "content") else str(response)
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if not match:
            raise HTTPException(status_code=500, detail="Failed to parse slide JSON")

        updated_slide = json.loads(match.group())
        updated_slide.setdefault("id", current["id"])
        updated_slide.setdefault("layout", current.get("layout", "bullets"))
        updated_slide.setdefault("accent", current.get("accent", "purple"))
        updated_slide.setdefault("speaker_notes", current.get("speaker_notes", ""))

        return {"status": "success", "slide": updated_slide, "slide_index": idx}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Edit error: {str(e)}")
