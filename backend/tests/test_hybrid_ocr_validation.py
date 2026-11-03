import io
import base64
from unittest.mock import MagicMock, patch
from PIL import Image, ImageDraw, ImageFont
import pytest

from backend.app.services.ocr_service import OCRService
from backend.app.services.validation_service import ValidationService, CONFIDENCE_THRESHOLD
from backend.app.schemas.ai import AIScanResponse, ProcessingMetadata

def create_synthetic_medicine_image(
    med_name="PARACETAMOL",
    strength="500 mg",
    batch="B12345",
    exp="08/2027",
    mfg="08/2024",
) -> Image.Image:
    """Generates a clean synthetic medicine strip image for testing."""
    img = Image.new("RGB", (600, 300), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    # Draw packaging lines
    draw.text((30, 30), f"{med_name} {strength}", fill=(0, 0, 0))
    draw.text((30, 80), f"B.No: {batch}", fill=(0, 0, 0))
    draw.text((30, 130), f"Mfg Date: {mfg}", fill=(0, 0, 0))
    draw.text((30, 180), f"Exp Date: {exp}", fill=(0, 0, 0))
    draw.text((30, 230), "Strip of 10 Tablets", fill=(0, 0, 0))
    return img

def test_ocr_service_preprocessing():
    img = create_synthetic_medicine_image()
    processed, diag = OCRService.preprocess_image(img)
    assert processed is not None
    assert diag["width"] >= 600
    assert diag["height"] >= 300
    assert "is_blurry" in diag

def test_ocr_service_extraction():
    img = create_synthetic_medicine_image()
    result = OCRService.run_ocr(img)
    
    assert result["success"] is True
    assert len(result["bounding_boxes"]) > 0
    # Every bounding box must have text, confidence, and box with x, y, width, height
    for box in result["bounding_boxes"][:3]:
        assert "text" in box
        assert "confidence" in box
        assert "box" in box
        assert all(k in box["box"] for k in ["x", "y", "width", "height"])

    fields = result["extracted_fields"]
    # Should detect at least one or more fields
    assert fields is not None

def test_validation_service_trusted_path():
    """When all critical fields have high confidence and pass validation -> TRUSTED"""
    extracted_fields = {
        "medicine_name": "Paracetamol",
        "strength": "500 mg",
        "batch_number": "B12345",
        "manufacturing_date": "08/2024",
        "expiry_date": "08/2027",
        "quantity": 20,
    }
    field_confidences = {
        "medicine_name": 94.0,
        "strength": 91.0,
        "batch_number": 87.0,
        "manufacturing_date": 85.0,
        "expiry_date": 92.5,
        "quantity": 88.0,
    }
    
    val = ValidationService.validate_ocr_output(
        extracted_fields=extracted_fields,
        field_confidences=field_confidences,
        diagnostics={"is_blurry": False},
        overall_confidence=92.5,
    )
    
    assert val.status == "trusted"
    assert len(val.reasons) == 0
    assert "medicine_name" in val.trusted_fields
    assert "batch_number" in val.trusted_fields
    assert "expiry_date" in val.trusted_fields
    assert val.normalized_data["expiry_date"] == "08/2027"

def test_validation_service_uncertain_path_low_expiry_confidence():
    """When expiry date confidence is below threshold -> UNCERTAIN with explicit reason"""
    extracted_fields = {
        "medicine_name": "Paracetamol",
        "strength": "500 mg",
        "batch_number": "B12345",
        "manufacturing_date": "08/2025",
        "expiry_date": "08/2027",
        "quantity": 20,
    }
    field_confidences = {
        "medicine_name": 94.0,
        "strength": 91.0,
        "batch_number": 87.0,
        "manufacturing_date": 85.0,
        "expiry_date": 42.0,  # Below 80% threshold!
        "quantity": 88.0,
    }
    
    val = ValidationService.validate_ocr_output(
        extracted_fields=extracted_fields,
        field_confidences=field_confidences,
        diagnostics={"is_blurry": False},
        overall_confidence=76.2,
    )
    
    assert val.status == "uncertain"
    assert any("Expiry date confidence" in r for r in val.reasons)
    assert "expiry_date" in val.uncertain_fields

def test_validation_service_date_chronology_conflict():
    """Manufacturing date after expiry date -> UNCERTAIN with conflict reason"""
    extracted_fields = {
        "medicine_name": "Amoxicillin",
        "strength": "625 mg",
        "batch_number": "AMX991",
        "manufacturing_date": "10/2028",  # After expiry!
        "expiry_date": "05/2027",
        "quantity": 10,
    }
    field_confidences = {
        "medicine_name": 90.0,
        "strength": 90.0,
        "batch_number": 90.0,
        "manufacturing_date": 90.0,
        "expiry_date": 90.0,
        "quantity": 90.0,
    }
    
    val = ValidationService.validate_ocr_output(
        extracted_fields=extracted_fields,
        field_confidences=field_confidences,
        diagnostics={"is_blurry": False},
    )
    
    assert val.status == "uncertain"
    assert any("after expiry date" in r for r in val.reasons)

def test_validation_service_missing_required_fields():
    """Missing batch number or medicine name -> UNCERTAIN"""
    extracted_fields = {
        "medicine_name": None,
        "strength": "500 mg",
        "batch_number": None,
        "manufacturing_date": None,
        "expiry_date": "08/2027",
        "quantity": 10,
    }
    field_confidences = {
        "medicine_name": 0.0,
        "strength": 85.0,
        "batch_number": 0.0,
        "expiry_date": 90.0,
    }
    
    val = ValidationService.validate_ocr_output(
        extracted_fields=extracted_fields,
        field_confidences=field_confidences,
    )
    
    assert val.status == "uncertain"
    assert any("Medicine name could not be identified" in r for r in val.reasons)
    assert any("Batch number could not be identified" in r for r in val.reasons)

def test_batch_number_format_validation():
    assert ValidationService._is_valid_batch_number("B12345") is True
    assert ValidationService._is_valid_batch_number("BT-90281/A") is True
    assert ValidationService._is_valid_batch_number("") is False
    assert ValidationService._is_valid_batch_number("x") is False
    assert ValidationService._is_valid_batch_number("---") is False

def test_strength_format_validation():
    assert ValidationService._is_valid_strength("500 mg") is True
    assert ValidationService._is_valid_strength("625mg") is True
    assert ValidationService._is_valid_strength("10 ml") is True
    assert ValidationService._is_valid_strength("2% w/v") is True
    assert ValidationService._is_valid_strength("random_word") is False

@pytest.mark.anyio
async def test_hybrid_pipeline_trusted_end_to_end():
    from backend.app.services.ai_service import scan_medicine_image

    img = create_synthetic_medicine_image()
    buffered = io.BytesIO()
    img.save(buffered, format="JPEG")
    b64_str = "data:image/jpeg;base64," + base64.b64encode(buffered.getvalue()).decode("utf-8")

    # Mock DB session
    mock_db = MagicMock()
    mock_scan = MagicMock()
    mock_scan.id = "scan-123"
    mock_db.add = MagicMock()
    mock_db.commit = MagicMock()
    mock_db.refresh = MagicMock()

    # Mock OCR returning high-confidence trusted data
    with patch("backend.app.services.ai_service.OCRService.run_ocr") as mock_ocr, \
         patch("backend.app.services.ai_service.call_gemma_vision") as mock_gemma:
        mock_ocr.return_value = {
            "success": True,
            "bounding_boxes": [
                {"text": "PARACETAMOL 500 MG", "confidence": 92.5, "box": {"x": 30, "y": 30, "width": 200, "height": 30}}
            ],
            "raw_text": "PARACETAMOL 500 MG\nB.No: B12345\nExp Date: 08/2027",
            "overall_confidence": 92.5,
            "extracted_fields": {
                "medicine_name": "Paracetamol",
                "strength": "500 mg",
                "batch_number": "B12345",
                "manufacturing_date": "08/2024",
                "expiry_date": "08/2027",
                "quantity": 20,
            },
            "field_confidences": {
                "medicine_name": 94.0,
                "strength": 91.0,
                "batch_number": 87.0,
                "manufacturing_date": 85.0,
                "expiry_date": 92.5,
                "quantity": 88.0,
            },
            "diagnostics": {"is_blurry": False},
        }

        response = await scan_medicine_image(
            db=mock_db,
            pharmacy_id="pharmacy-1",
            image_base64=b64_str,
        )

        # 1. Gemma must NOT be called for trusted results
        mock_gemma.assert_not_called()

        # 2. Response must verify trusted path specification
        assert response.source == "tesseract"
        assert response.validation_status == "trusted"
        assert response.medicine_name == "Paracetamol"
        assert response.strength == "500 mg"
        assert response.batch_number == "B12345"
        assert response.expiry_date == "08/2027"
        assert response.processing.ocr_used is True
        assert response.processing.validation == "trusted"
        assert response.processing.ai_fallback_used is False
        assert len(response.processing.reason) == 0
        assert len(response.bounding_boxes) == 1
        assert response.bounding_boxes[0].box.x == 30

@pytest.mark.anyio
async def test_hybrid_pipeline_uncertain_fallback_end_to_end():
    from backend.app.services.ai_service import scan_medicine_image

    img = create_synthetic_medicine_image()
    buffered = io.BytesIO()
    img.save(buffered, format="JPEG")
    b64_str = "data:image/jpeg;base64," + base64.b64encode(buffered.getvalue()).decode("utf-8")

    mock_db = MagicMock()

    # Mock OCR returning low confidence on expiry
    with patch("backend.app.services.ai_service.OCRService.run_ocr") as mock_ocr, \
         patch("backend.app.services.ai_service.call_gemma_vision") as mock_gemma, \
         patch("backend.app.services.ai_service.settings") as mock_settings:
        mock_settings.GEMMA_API_KEY = "valid-mock-key"

        mock_ocr.return_value = {
            "success": True,
            "bounding_boxes": [],
            "raw_text": "PARACETAMOL 500 MG\nB.No: B12345\nExp: ??",
            "overall_confidence": 76.2,
            "extracted_fields": {
                "medicine_name": "Paracetamol",
                "strength": "500 mg",
                "batch_number": "B12345",
                "manufacturing_date": "08/2025",
                "expiry_date": "08/2027",
                "quantity": 20,
            },
            "field_confidences": {
                "medicine_name": 94.0,
                "strength": 91.0,
                "batch_number": 87.0,
                "manufacturing_date": 85.0,
                "expiry_date": 42.0,  # Below threshold!
            },
            "diagnostics": {"is_blurry": False},
        }

        # Gemma successfully recovers the uncertain expiry date
        mock_gemma.return_value = (
            {
                "medicine_name": "Paracetamol",
                "generic_name": "Paracetamol IP",
                "brand": "Calpol",
                "strength": "500 mg",
                "manufacturer": "GlaxoSmithKline",
                "batch_number": "B12345",
                "manufacturing_date": "08/2025",
                "expiry_date": "08/2027",
                "pieces_per_strip": 20,
                "confidence_score": 94.1,
                "issues": [],
            },
            '{"medicine_name": "Paracetamol"}',
            "",
        )

        response = await scan_medicine_image(
            db=mock_db,
            pharmacy_id="pharmacy-1",
            image_base64=b64_str,
        )

        # 1. Gemma must be called
        mock_gemma.assert_called_once()

        # 2. Response conforms to Section 7 & 9 specification
        assert response.source == "gemma"
        assert response.validation_status == "ai_validated"
        assert response.expiry_date == "08/2027"
        assert response.processing.ocr_used is True
        assert response.processing.validation == "uncertain"
        assert response.processing.ai_fallback_used is True
        assert any("Expiry date confidence" in r for r in response.processing.reason)

def test_crop_uncertain_regions_finds_expiry_box():
    from backend.app.services.ai_service import crop_uncertain_regions

    img = Image.new("RGB", (800, 600), color=(255, 255, 255))
    boxes = [
        {"text": "PARACETAMOL", "confidence": 95.0, "box": {"x": 50, "y": 50, "width": 200, "height": 30}},
        {"text": "Exp", "confidence": 45.0, "box": {"x": 50, "y": 400, "width": 40, "height": 25}},
        {"text": "Date:", "confidence": 42.0, "box": {"x": 95, "y": 400, "width": 50, "height": 25}},
        {"text": "08/2027", "confidence": 35.0, "box": {"x": 150, "y": 400, "width": 70, "height": 25}},
    ]
    uncertain_fields = {"expiry_date": "08/2027"}

    cropped, crop_used, crop_box = crop_uncertain_regions(img, boxes, uncertain_fields)
    assert crop_used is True
    assert cropped.width < 800
    assert cropped.height < 600
    # Cropped region should cover the expiry area around y=400
    assert crop_box[1] <= 400

def test_second_validation_gate_rejects_hallucinations_and_invalid_dates():
    """Gemma second validation must reject 15/2028, placeholder names, and reversed mfg > exp"""
    # Case 1: Invalid month 15/2028
    raw_ai_data = {
        "medicine_name": "Metformin",
        "strength": "500 mg",
        "batch_number": "MET101",
        "expiry_date": "15/2028",  # Invalid month!
    }
    sanitized, issues = ValidationService.validate_gemma_output(raw_ai_data, {"expiry_date": None})
    assert sanitized["expiry_date"] is None
    assert any("invalid or unparseable expiry date" in i.lower() for i in issues)

    # Case 2: Hallucinated placeholder medicine name
    raw_ai_data_2 = {
        "medicine_name": "Unknown",
        "batch_number": "MET101",
    }
    sanitized_2, issues_2 = ValidationService.validate_gemma_output(raw_ai_data_2, {"medicine_name": None})
    assert sanitized_2["medicine_name"] is None

    # Case 3: MFG after EXP chronology violation
    raw_ai_data_3 = {
        "medicine_name": "Metformin",
        "batch_number": "MET101",
        "manufacturing_date": "10/2028",
        "expiry_date": "05/2027",
    }
    sanitized_3, issues_3 = ValidationService.validate_gemma_output(raw_ai_data_3, {"expiry_date": None, "manufacturing_date": None})
    assert sanitized_3["expiry_date"] is None
    assert sanitized_3["manufacturing_date"] is None
    assert any("after expiry date" in i.lower() for i in issues_3)

@pytest.mark.anyio
async def test_zero_fake_defaults_when_unreadable():
    """When pricing and count are unreadable, system must NOT fabricate 10 pieces or 50.0 price"""
    from backend.app.services.ai_service import scan_medicine_image

    img = create_synthetic_medicine_image()
    buffered = io.BytesIO()
    img.save(buffered, format="JPEG")
    b64_str = "data:image/jpeg;base64," + base64.b64encode(buffered.getvalue()).decode("utf-8")

    mock_db = MagicMock()

    with patch("backend.app.services.ai_service.OCRService.run_ocr") as mock_ocr:
        mock_ocr.return_value = {
            "success": True,
            "bounding_boxes": [],
            "raw_text": "PARACETAMOL 500 MG\nB.No: B12345\nExp Date: 08/2027",
            "overall_confidence": 92.5,
            "extracted_fields": {
                "medicine_name": "Paracetamol",
                "strength": "500 mg",
                "batch_number": "B12345",
                "manufacturing_date": "08/2024",
                "expiry_date": "08/2027",
                "quantity": None,  # No quantity detected!
            },
            "field_confidences": {
                "medicine_name": 94.0,
                "strength": 91.0,
                "batch_number": 87.0,
                "manufacturing_date": 85.0,
                "expiry_date": 92.5,
            },
            "diagnostics": {"is_blurry": False},
        }

        response = await scan_medicine_image(
            db=mock_db,
            pharmacy_id="pharmacy-1",
            image_base64=b64_str,
        )

        assert response.quantity is None
        assert response.extracted_data.get("price_per_strip") is None


