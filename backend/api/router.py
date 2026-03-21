from fastapi import APIRouter

api_router = APIRouter()

@api_router.get("/health")
def health_check():
    return {"status": "healthy"}

from api.endpoints import documents, chat, mindmap, podcast, summary, flashcards, settings, export, analysis, presentation
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(mindmap.router, prefix="/mindmap", tags=["mindmap"])
api_router.include_router(podcast.router, prefix="/podcast", tags=["podcast"])
api_router.include_router(summary.router, prefix="/summary", tags=["summary"])
api_router.include_router(flashcards.router, prefix="/flashcards", tags=["flashcards"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(export.router, prefix="/export", tags=["export"])
api_router.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
api_router.include_router(presentation.router, prefix="/presentation", tags=["presentation"])

