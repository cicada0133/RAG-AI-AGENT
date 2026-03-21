from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.summary_service import summary_service
from services.rag_service import rag_service

router = APIRouter()


class SummaryRequest(BaseModel):
    doc_id: str


@router.post("/generate")
def generate_summary(request: SummaryRequest):
    try:
        content = rag_service.get_document_context(request.doc_id)
        result = summary_service.generate_summary(content)
        return {"status": "success", "summary": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
