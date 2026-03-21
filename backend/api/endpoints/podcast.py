from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.podcast_service import podcast_service, AVAILABLE_VOICES
from services.rag_service import rag_service

router = APIRouter()

class PodcastRequest(BaseModel):
    doc_id: str
    tone: str = "научный"
    voice: str = "ru-RU-DmitryNeural"
    voice_b: str = "ru-RU-SvetlanaNeural"
    mode: str = "monologue"   # "monologue" or "dialogue"
    rate: str = "+0%"         # speech rate e.g. "-10%" to "+50%"
    pitch: str = "+0Hz"       # pitch e.g. "-10Hz" to "+20Hz"

@router.get("/voices")
async def get_voices():
    return {"voices": AVAILABLE_VOICES}

@router.post("/generate")
async def generate_podcast(request: PodcastRequest):
    try:
        content = rag_service.get_document_context(request.doc_id)
        result = await podcast_service.generate_podcast(
            topic="Анализ документа",
            content=content,
            tone=request.tone,
            voice=request.voice,
            mode=request.mode,
            rate=request.rate,
            pitch=request.pitch,
            voice_b=request.voice_b,
        )
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
