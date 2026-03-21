from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from services.rag_service import rag_service
from services.llm_provider import get_llm
import io, csv, json

router = APIRouter()

class ExportRequest(BaseModel):
    doc_id: str

@router.post("/csv")
async def export_to_csv(request: ExportRequest):
    """Extract structured data from document and export as CSV."""
    try:
        # Get document context
        context = rag_service.get_context(request.doc_id, "извлеки ключевые данные из документа")
        if not context:
            raise HTTPException(status_code=404, detail="Document not found")

        llm = get_llm()
        prompt = (
            f"Из следующего текста документа извлеки структурированные данные в виде таблицы.\n\n"
            f"Текст:\n{context[:4000]}\n\n"
            "Верни ТОЛЬКО JSON-массив объектов, где каждый объект — строка таблицы. "
            "Ключи — названия колонок, значения — данные. "
            "Выбери наиболее информативные данные (показатели, числа, факты, сущности). "
            "Максимум 20 строк. Пример: [{\"Показатель\": \"P/E\", \"Значение\": \"15\", \"Описание\": \"...\"}]\n"
            "Верни ТОЛЬКО JSON, без пояснений."
        )
        response = llm.invoke(prompt)
        text = response.content if hasattr(response, "content") else str(response)

        # Parse JSON
        import re
        match = re.search(r'\[.*?\]', text, re.DOTALL)
        if not match:
            raise HTTPException(status_code=500, detail="Failed to extract structured data")

        rows = json.loads(match.group())
        if not rows:
            raise HTTPException(status_code=500, detail="No data extracted")

        # Build CSV
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=rows[0].keys(), extrasaction='ignore')
        writer.writeheader()
        writer.writerows(rows)

        csv_bytes = output.getvalue().encode('utf-8-sig')  # BOM for Excel

        return StreamingResponse(
            io.BytesIO(csv_bytes),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=export_{request.doc_id[:8]}.csv"}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export error: {str(e)}")
