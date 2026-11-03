"""MedGuard AI - 21 Packaging Layout Scenarios Test Suite.

Verifies that the recognition pipeline handles varied packaging topologies:
1. Medicine name at top
2. Medicine name in middle
3. Medicine name at bottom
4. Medicine name on left side
5. Medicine name on right side
6. Medicine name split across lines
7. Manufacturer name appears before medicine name
8. Active ingredient (composition) appears before medicine name
9. Batch number appears before medicine name
10. Expiry date appears before medicine name
11. Blurry image (quality gate rejection)
12. Low light / dark image (brightness gate rejection)
13. Low resolution image (dimension gate rejection)
14. Rotated strip / vertical metadata layout
15. Partial strip image
16. Multiple active ingredients
17. Strength in name vs separate line
18. Varied date formats (MM/YY, MM/YYYY, Month YYYY) normalized
19. Unreadable expiry returns null (zero hallucination)
20. Unreadable batch returns null (zero hallucination)
21. Novel unknown medicine recognized without hardcoded dictionary
"""

import io
import base64
import pytest
from PIL import Image, ImageDraw, ImageFilter
from unittest.mock import MagicMock, patch

from backend.features.ai_recognition.image_quality import ImageQualityChecker
from backend.features.ai_recognition.candidate_extractor import CandidateExtractor
from backend.features.ai_recognition.decision_engine import DecisionEngine
from backend.features.ai_recognition.validation import ValidationService
from backend.features.ai_recognition.service import scan_medicine_image, SourceMapping
from backend.tests.test_hybrid_ocr_validation import create_synthetic_medicine_image


def create_layout_image(lines: list, size=(700, 350)) -> Image.Image:
    """Helper to draw text lines onto an RGB packaging canvas."""
    img = Image.new("RGB", size, color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    for pos, text in lines:
        draw.text(pos, text, fill=(0, 0, 0))
    return img


# -----------------------------------------------------------------------------
# Scenario 1: Medicine name at top
# -----------------------------------------------------------------------------
def test_scenario_01_medicine_name_at_top():
    lines = [
        {"text": "PARACETAMOL TABLETS IP", "confidence": 95.0, "box": {"x": 20, "y": 20, "width": 250, "height": 30}},
        {"text": "500 mg", "confidence": 92.0, "box": {"x": 20, "y": 60, "width": 80, "height": 20}},
        {"text": "B.No: B8890", "confidence": 91.0, "box": {"x": 20, "y": 100, "width": 120, "height": 20}},
        {"text": "Exp: 08/2028", "confidence": 90.0, "box": {"x": 20, "y": 130, "width": 120, "height": 20}},
    ]
    candidates = CandidateExtractor.extract_candidates(tokens=[], lines=lines, image_width=700, image_height=350)
    assert len(candidates["medicine_name_candidates"]) > 0
    assert "PARACETAMOL TABLETS IP" in candidates["medicine_name_candidates"][0]["value"]


# -----------------------------------------------------------------------------
# Scenario 2: Medicine name in middle
# -----------------------------------------------------------------------------
def test_scenario_02_medicine_name_in_middle():
    lines = [
        {"text": "ABC PHARMACEUTICALS LTD", "confidence": 90.0, "box": {"x": 20, "y": 20, "width": 250, "height": 20}},
        {"text": "B.No: L7789", "confidence": 92.0, "box": {"x": 20, "y": 50, "width": 100, "height": 20}},
        {"text": "Exp: 10/2026", "confidence": 91.0, "box": {"x": 20, "y": 80, "width": 100, "height": 20}},
        {"text": "METFORMIN HYDROCHLORIDE TABLETS IP", "confidence": 96.0, "box": {"x": 20, "y": 130, "width": 350, "height": 32}},
        {"text": "500 mg", "confidence": 93.0, "box": {"x": 20, "y": 170, "width": 80, "height": 20}},
    ]
    candidates = CandidateExtractor.extract_candidates(tokens=[], lines=lines, image_width=700, image_height=350)
    top_candidate = candidates["medicine_name_candidates"][0]["value"]
    assert "METFORMIN HYDROCHLORIDE" in top_candidate
    assert "ABC PHARMACEUTICALS" not in top_candidate


# -----------------------------------------------------------------------------
# Scenario 3: Medicine name at bottom
# -----------------------------------------------------------------------------
def test_scenario_03_medicine_name_at_bottom():
    lines = [
        {"text": "Each film coated tablet contains:", "confidence": 88.0, "box": {"x": 20, "y": 20, "width": 280, "height": 18}},
        {"text": "Excipients q.s.", "confidence": 85.0, "box": {"x": 20, "y": 50, "width": 120, "height": 18}},
        {"text": "Store below 30 C in dry place", "confidence": 89.0, "box": {"x": 20, "y": 80, "width": 240, "height": 18}},
        {"text": "B.No: KL402", "confidence": 90.0, "box": {"x": 20, "y": 110, "width": 110, "height": 18}},
        {"text": "Exp: 11/2027", "confidence": 91.0, "box": {"x": 20, "y": 140, "width": 110, "height": 18}},
        {"text": "AZITHROMYCIN TABLETS IP 500 MG", "confidence": 95.0, "box": {"x": 20, "y": 200, "width": 320, "height": 30}},
    ]
    candidates = CandidateExtractor.extract_candidates(tokens=[], lines=lines, image_width=700, image_height=350)
    top_candidate = candidates["medicine_name_candidates"][0]["value"]
    assert "AZITHROMYCIN" in top_candidate


# -----------------------------------------------------------------------------
# Scenario 4: Medicine name on left side
# -----------------------------------------------------------------------------
def test_scenario_04_medicine_name_on_left_side():
    lines = [
        {"text": "CETIRIZINE TABLETS IP 10 MG", "confidence": 94.0, "box": {"x": 15, "y": 60, "width": 240, "height": 28}},
        {"text": "Mfg: 01/2024", "confidence": 88.0, "box": {"x": 350, "y": 60, "width": 100, "height": 18}},
        {"text": "Exp: 12/2026", "confidence": 89.0, "box": {"x": 350, "y": 90, "width": 100, "height": 18}},
        {"text": "B.No: CT991", "confidence": 91.0, "box": {"x": 350, "y": 120, "width": 100, "height": 18}},
    ]
    candidates = CandidateExtractor.extract_candidates(tokens=[], lines=lines, image_width=700, image_height=350)
    assert "CETIRIZINE" in candidates["medicine_name_candidates"][0]["value"]


# -----------------------------------------------------------------------------
# Scenario 5: Medicine name on right side
# -----------------------------------------------------------------------------
def test_scenario_05_medicine_name_on_right_side():
    lines = [
        {"text": "B.No: B441", "confidence": 90.0, "box": {"x": 20, "y": 40, "width": 100, "height": 18}},
        {"text": "Exp: 05/2026", "confidence": 90.0, "box": {"x": 20, "y": 70, "width": 100, "height": 18}},
        {"text": "Mfg: 06/2023", "confidence": 88.0, "box": {"x": 20, "y": 100, "width": 100, "height": 18}},
        {"text": "PANTOPRAZOLE TABLETS IP", "confidence": 96.0, "box": {"x": 320, "y": 40, "width": 260, "height": 30}},
        {"text": "40 mg", "confidence": 92.0, "box": {"x": 320, "y": 80, "width": 70, "height": 20}},
    ]
    candidates = CandidateExtractor.extract_candidates(tokens=[], lines=lines, image_width=700, image_height=350)
    assert "PANTOPRAZOLE" in candidates["medicine_name_candidates"][0]["value"]


# -----------------------------------------------------------------------------
# Scenario 6: Medicine name split across 2 lines
# -----------------------------------------------------------------------------
def test_scenario_06_medicine_name_split_across_lines():
    lines = [
        {"text": "AMOXICILLIN AND POTASSIUM", "confidence": 91.0, "box": {"x": 20, "y": 30, "width": 250, "height": 25}},
        {"text": "CLAVULANATE TABLETS IP", "confidence": 92.0, "box": {"x": 20, "y": 60, "width": 230, "height": 25}},
        {"text": "625 mg", "confidence": 90.0, "box": {"x": 20, "y": 95, "width": 70, "height": 20}},
        {"text": "B.No: AC104", "confidence": 90.0, "box": {"x": 20, "y": 130, "width": 100, "height": 18}},
    ]
    candidates = CandidateExtractor.extract_candidates(tokens=[], lines=lines, image_width=700, image_height=350)
    top_cand = candidates["medicine_name_candidates"][0]["value"]
    assert "TABLETS IP" in top_cand or "AMOXICILLIN" in top_cand


# -----------------------------------------------------------------------------
# Scenario 7: Manufacturer appears before medicine name
# -----------------------------------------------------------------------------
def test_scenario_07_manufacturer_appears_first():
    lines = [
        {"text": "ZYDUS HEALTHCARE LTD", "confidence": 94.0, "box": {"x": 20, "y": 20, "width": 220, "height": 20}},
        {"text": "DOXOFYLLINE TABLETS IP", "confidence": 93.0, "box": {"x": 20, "y": 60, "width": 260, "height": 30}},
        {"text": "400 mg", "confidence": 90.0, "box": {"x": 20, "y": 100, "width": 80, "height": 20}},
    ]
    candidates = CandidateExtractor.extract_candidates(tokens=[], lines=lines, image_width=700, image_height=350)
    top_cand = candidates["medicine_name_candidates"][0]["value"]
    assert "DOXOFYLLINE" in top_cand
    assert "ZYDUS" not in top_cand
    assert any("ZYDUS" in m["value"] for m in candidates["manufacturer_candidates"])


# -----------------------------------------------------------------------------
# Scenario 8: Composition boilerplate appears before medicine name
# -----------------------------------------------------------------------------
def test_scenario_08_composition_boilerplate_disqualified():
    lines = [
        {"text": "Each uncoated tablet contains:", "confidence": 92.0, "box": {"x": 20, "y": 20, "width": 260, "height": 18}},
        {"text": "Doxofylline IP 400 mg", "confidence": 90.0, "box": {"x": 20, "y": 50, "width": 180, "height": 18}},
        {"text": "Excipients q.s.", "confidence": 88.0, "box": {"x": 20, "y": 80, "width": 120, "height": 18}},
        {"text": "DOXOLIN TABLETS", "confidence": 94.0, "box": {"x": 20, "y": 120, "width": 200, "height": 28}},
    ]
    candidates = CandidateExtractor.extract_candidates(tokens=[], lines=lines, image_width=700, image_height=350)
    top_cand = candidates["medicine_name_candidates"][0]["value"]
    assert "DOXOLIN" in top_cand or "Doxofylline" in top_cand
    assert "Each uncoated" not in top_cand


# -----------------------------------------------------------------------------
# Scenario 9: Batch number appears before medicine name
# -----------------------------------------------------------------------------
def test_scenario_09_batch_appears_before_name():
    lines = [
        {"text": "B.No. I900139", "confidence": 92.0, "box": {"x": 20, "y": 20, "width": 120, "height": 18}},
        {"text": "DOXOFYLLINE TABLETS IP 400 MG", "confidence": 95.0, "box": {"x": 20, "y": 70, "width": 300, "height": 28}},
    ]
    candidates = CandidateExtractor.extract_candidates(tokens=[], lines=lines, image_width=700, image_height=350)
    assert candidates["batch_candidates"][0]["value"] == "I900139"
    assert "DOXOFYLLINE" in candidates["medicine_name_candidates"][0]["value"]


# -----------------------------------------------------------------------------
# Scenario 10: Expiry date appears before medicine name
# -----------------------------------------------------------------------------
def test_scenario_10_expiry_appears_before_name():
    lines = [
        {"text": "Exp.Date: 12/2028", "confidence": 91.0, "box": {"x": 20, "y": 20, "width": 130, "height": 18}},
        {"text": "OMEPRAZOLE CAPSULES IP", "confidence": 94.0, "box": {"x": 20, "y": 60, "width": 250, "height": 28}},
    ]
    candidates = CandidateExtractor.extract_candidates(tokens=[], lines=lines, image_width=700, image_height=350)
    assert candidates["expiry_candidates"][0]["value"] == "12/2028"
    assert "OMEPRAZOLE" in candidates["medicine_name_candidates"][0]["value"]


# -----------------------------------------------------------------------------
# Scenario 11: Blurry image quality gate rejection
# -----------------------------------------------------------------------------
def test_scenario_11_blurry_image_rejection():
    # Synthetic packaging image with medicine details
    img = create_synthetic_medicine_image()
    # Gaussian blur removes edge sharpness
    blurry = img.filter(ImageFilter.GaussianBlur(radius=8))
    quality = ImageQualityChecker.evaluate(blurry)
    assert quality["is_acceptable"] is False
    assert any("blur" in issue.lower() for issue in quality["issues"])


# -----------------------------------------------------------------------------
# Scenario 12: Low light / dark image rejection
# -----------------------------------------------------------------------------
def test_scenario_12_dark_image_rejection():
    # Mean brightness ~ 5 (very dark)
    dark_img = Image.new("RGB", (300, 300), color=(5, 5, 5))
    quality = ImageQualityChecker.evaluate(dark_img)
    assert quality["is_acceptable"] is False
    assert any("dark" in issue.lower() for issue in quality["issues"])


# -----------------------------------------------------------------------------
# Scenario 13: Low resolution dimension rejection
# -----------------------------------------------------------------------------
def test_scenario_13_low_resolution_rejection():
    # Only 80x80px (well below MIN_DIMENSION 140)
    tiny_img = Image.new("RGB", (80, 80), color=(255, 255, 255))
    quality = ImageQualityChecker.evaluate(tiny_img)
    assert quality["is_acceptable"] is False
    assert any("resolution" in issue.lower() for issue in quality["issues"])


# -----------------------------------------------------------------------------
# Scenario 14: Rotated packaging / vertical dot-matrix text
# -----------------------------------------------------------------------------
def test_scenario_14_rotated_strip_vertical_text():
    # User's uploaded image case: B.No. I900139 and EXP. 12/2020 printed vertically
    lines = [
        {"text": "B.No.I900139 M.R.P. 78.90 EXP.12/2020", "confidence": 92.0, "box": {"x": 620, "y": 100, "width": 30, "height": 300}},
        {"text": "Doxofylline Tablets IP", "confidence": 94.0, "box": {"x": 50, "y": 80, "width": 240, "height": 30}},
    ]
    candidates = CandidateExtractor.extract_candidates(tokens=[], lines=lines, image_width=700, image_height=400)
    assert candidates["batch_candidates"][0]["value"] == "I900139"
    assert candidates["expiry_candidates"][0]["value"] == "12/2020"


# -----------------------------------------------------------------------------
# Scenario 15: Partial strip image (only sub-fields visible)
# -----------------------------------------------------------------------------
def test_scenario_15_partial_strip_missing_fields_null():
    clean_ai = {
        "medicine_name": "Paracetamol",
        "generic_name": None,
        "brand": None,
        "strength": "500 mg",
        "manufacturer": None,
        "batch_number": None,
        "manufacturing_date": None,
        "expiry_date": None,
        "pieces_per_strip": None,
        "unit_of_measure": "tablet",
        "price_per_strip": None,
    }
    sanitized, issues = ValidationService.validate_gemma_output(clean_ai, uncertain_fields={"batch_number": None})
    assert sanitized["medicine_name"] == "Paracetamol"
    assert sanitized["batch_number"] is None
    assert sanitized["price_per_strip"] is None


# -----------------------------------------------------------------------------
# Scenario 16: Multiple active ingredients
# -----------------------------------------------------------------------------
def test_scenario_16_multiple_active_ingredients():
    lines = [
        {"text": "AMODIAQUINE AND ARTESUNATE TABLETS", "confidence": 92.0, "box": {"x": 20, "y": 30, "width": 320, "height": 28}},
        {"text": "153.1 mg + 50 mg", "confidence": 89.0, "box": {"x": 20, "y": 70, "width": 140, "height": 20}},
    ]
    candidates = CandidateExtractor.extract_candidates(tokens=[], lines=lines, image_width=700, image_height=300)
    assert "AMODIAQUINE" in candidates["medicine_name_candidates"][0]["value"]


# -----------------------------------------------------------------------------
# Scenario 17: Strength in name vs separate line
# -----------------------------------------------------------------------------
def test_scenario_17_strength_in_name_and_separate():
    # Case A: Combined
    norm_a = {}
    ValidationService._validate_ocr_strength(None, "Ibuprofen 400 mg Tablets", 90.0, 80.0, [], {}, {}, norm_a)
    assert norm_a["strength"] == "400 mg"

    # Case B: Standalone
    norm_b = {}
    ValidationService._validate_ocr_strength("650 mg", "Dolo", 92.0, 80.0, [], {}, {}, norm_b)
    assert ValidationService._is_valid_strength("650 mg") is True


# -----------------------------------------------------------------------------
# Scenario 18: Varied date formats normalization
# -----------------------------------------------------------------------------
def test_scenario_18_date_formats_normalization():
    # MM/YY -> MM/YYYY
    _, d1 = ValidationService._parse_and_normalize_date("08/27")
    assert d1 == "08/2027"

    # MM/YYYY
    _, d2 = ValidationService._parse_and_normalize_date("12/2028")
    assert d2 == "12/2028"

    # Mon Year
    _, d3 = ValidationService._parse_and_normalize_date("AUG 2027")
    assert d3 == "08/2027"

    # DD/MM/YYYY
    _, d4 = ValidationService._parse_and_normalize_date("15/09/2026")
    assert d4 == "09/2026"


# -----------------------------------------------------------------------------
# Scenario 19: Unreadable expiry returns null (zero guessing)
# -----------------------------------------------------------------------------
def test_scenario_19_unreadable_expiry_returns_null():
    raw_ai = {"medicine_name": "Paracetamol", "expiry_date": "unreadable"}
    sanitized, _ = ValidationService.validate_gemma_output(raw_ai, {})
    assert sanitized["expiry_date"] is None

    # Impossible date (e.g. 19/99 or month 25)
    raw_ai_2 = {"medicine_name": "Paracetamol", "expiry_date": "25/2027"}
    sanitized_2, issues = ValidationService.validate_gemma_output(raw_ai_2, {})
    assert sanitized_2["expiry_date"] is None


# -----------------------------------------------------------------------------
# Scenario 20: Unreadable batch number returns null (zero guessing)
# -----------------------------------------------------------------------------
def test_scenario_20_unreadable_batch_returns_null():
    raw_ai = {"medicine_name": "Paracetamol", "batch_number": "N/A"}
    sanitized, _ = ValidationService.validate_gemma_output(raw_ai, {})
    assert sanitized["batch_number"] is None

    # Noise fragment like "lets" or "tablet"
    assert CandidateExtractor._is_valid_batch_string("lets") is False
    assert CandidateExtractor._is_valid_batch_string("tablets") is False


# -----------------------------------------------------------------------------
# Scenario 21: Completely unknown new medicine without hardcoded dictionary
# -----------------------------------------------------------------------------
def test_scenario_21_unknown_new_medicine_extracted():
    # Brand new fictional molecular entity: Xenoriftin
    lines = [
        {"text": "XENORIFTIN TABLETS IP", "confidence": 95.0, "box": {"x": 20, "y": 30, "width": 260, "height": 30}},
        {"text": "250 mg", "confidence": 92.0, "box": {"x": 20, "y": 70, "width": 80, "height": 20}},
        {"text": "B.No: XR001", "confidence": 91.0, "box": {"x": 20, "y": 105, "width": 100, "height": 18}},
    ]
    candidates = CandidateExtractor.extract_candidates(tokens=[], lines=lines, image_width=700, image_height=300)
    top_cand = candidates["medicine_name_candidates"][0]["value"]
    assert "XENORIFTIN" in top_cand
