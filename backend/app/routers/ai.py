import base64
from typing import Optional
from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.pharmacy import Pharmacy
from backend.app.schemas.ai import AIScanResponse
from backend.app.services.ai_service import scan_medicine_image
from backend.app.dependencies import get_current_pharmacy

router = APIRouter(prefix="/api/ai", tags=["AI Medicine Scanner"])

@router.post("/scan-medicine", response_model=AIScanResponse)
async def scan_medicine_endpoint(
    request: Request,
    pharmacy: Pharmacy = Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    content_type = request.headers.get("content-type", "")
    base64_data = ""
    image_url = None

    if "application/json" in content_type:
        try:
            body = await request.json()
            base64_data = body.get("image_base64", "")
            image_url = body.get("image_url")
        except Exception:
            pass
    elif "multipart/form-data" in content_type:
        form = await request.form()
        file = form.get("file")
        if file and hasattr(file, "read"):
            content = await file.read()
            mime_type = getattr(file, "content_type", "image/jpeg") or "image/jpeg"
            b64_str = base64.b64encode(content).decode("utf-8")
            base64_data = f"data:{mime_type};base64,{b64_str}"
        elif "image_base64" in form:
            base64_data = form.get("image_base64")
            image_url = form.get("image_url")
    else:
        try:
            body = await request.json()
            base64_data = body.get("image_base64", "")
            image_url = body.get("image_url")
        except Exception:
            pass

    if not base64_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No image provided. Please supply image_base64 or upload an image file."
        )

    return await scan_medicine_image(
        db=db,
        pharmacy_id=pharmacy.id,
        image_base64=base64_data,
        image_url=image_url,
    )
