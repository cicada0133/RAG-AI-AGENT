from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.flashcard_service import flashcard_service
from services.rag_service import rag_service

router = APIRouter()


class FlashcardsRequest(BaseModel):
    doc_id: str


@router.post("/generate")
def generate_flashcards(request: FlashcardsRequest):
    try:
        content = rag_service.get_document_context(request.doc_id)
        cards = flashcard_service.generate_flashcards(content)
        return {"status": "success", "cards": cards}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
