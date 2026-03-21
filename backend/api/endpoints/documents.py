from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
import shutil, os, uuid
from services.rag_service import rag_service

router = APIRouter()

UPLOAD_DIR = "./temp_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload a document and process it for RAG."""
    # Use UUID-based safe filename to avoid Cyrillic/space issues on Linux
    original_name = file.filename or "upload.bin"
    ext = original_name.rsplit(".", 1)[-1].lower() if "." in original_name else "bin"
    safe_name = f"{uuid.uuid4().hex}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)

    try:
        # Write file to disk first
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Verify file exists and has content
        if not os.path.exists(file_path) or os.path.getsize(file_path) == 0:
            raise ValueError("File was not saved correctly")

        # Process in RAG service — pass original_name for metadata display
        doc_id = rag_service.process_file(file_path, original_name)

        return {"filename": original_name, "doc_id": doc_id, "status": "processed"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")
    finally:
        # Clean up temp file after processing is complete
        if os.path.exists(file_path):
            os.remove(file_path)


@router.get("/download/{filename}")
async def download_file(filename: str):
    file_path = os.path.join(UPLOAD_DIR, filename)
    if os.path.exists(file_path):
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="File not found")
