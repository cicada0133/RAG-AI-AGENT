from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.mindmap_service import mindmap_service

router = APIRouter()

from services.rag_service import rag_service

class MindmapRequest(BaseModel):
    doc_id: str

@router.post("/generate")
def generate_mindmap(request: MindmapRequest):
    try:
        content = rag_service.get_document_context(request.doc_id)
        result = mindmap_service.generate_mindmap(content)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
