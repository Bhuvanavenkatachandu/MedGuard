"""
MedGuard AI - OCR Service

Pipeline:
    Image
      ↓
    Preprocess
      ↓
    Tesseract OCR
      ↓
    Tokens + bounding boxes + confidence
      ↓
    Medicine field extraction
      ↓
    ValidationService
      ↓
    Gemma recovery only when OCR is uncertain
"""

import logging
import re
import shutil
from typing import Any, Dict, List, Optional, Tuple

import pytesseract
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
from pytesseract import Output


logger = logging.getLogger("medguard.ocr")


# Find Tesseract on common macOS/Linux installations.
TESSERACT_PATHS = (
    "/opt/homebrew/bin/tesseract",
    "/usr/local/bin/tesseract",
    "/usr/bin/tesseract",
    shutil.which("tesseract"),
)

for path in TESSERACT_PATHS:
    if path and shutil.which(path):
        pytesseract.pytesseract.tesseract_cmd = path
        break


class OCRService:
    """Prepare medicine images, run Tesseract, and extract medicine fields."""

    # Medicine packaging commonly uses these formats.
    STRENGTH_PATTERN = re.compile(
        r"\b(\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml|l|%|iu|w/v|w/w))\b",
        re.IGNORECASE,
    )

    BATCH_PATTERN = re.compile(
        r"(?:B(?:atch)?\.?\s*(?:No|Num)?\.?|"
        r"Lot\.?\s*(?:No)?\.?|B\.?N\.?)"
        r"\s*[:.\-]?\s*([A-Za-z0-9\-/]{3,16})",
        re.IGNORECASE,
    )

    EXPIRY_PATTERN = re.compile(
        r"(?:Exp(?:iry)?\.?\s*(?:Date)?\.?|"
        r"Use\s*Before|E\.?D\.?)"
        r"\s*[:.\-]?\s*([A-Za-z0-9/.\-]+)",
        re.IGNORECASE,
    )

    MFG_PATTERN = re.compile(
        r"(?:Mfg?\.?\s*(?:Date)?\.?|Mfd\.?|M\.?D\.?)"
        r"\s*[:.\-]?\s*([A-Za-z0-9/.\-]+)",
        re.IGNORECASE,
    )

    QUANTITY_PATTERN = re.compile(
        r"(?:Strip\s*of|Pack\s*of|Contains|\bQty\b|\bQuantity\b)?"
        r"\s*(\d{1,3})"
        r"\s*(?:Tablets?|Capsules?|Pills?|Tabs?|Caps?)?",
        re.IGNORECASE,
    )

    DATE_PATTERNS = (
        re.compile(r"^(?:0?[1-9]|1[0-2])[/\-.](?:20\d{2}|\d{2})$"),
        re.compile(r"^[A-Za-z]{3}[/\-.](?:20\d{2}|\d{2})$"),
    )

    BATCH_LABELS = {
        "b.no",
        "b.no.",
        "batch",
        "lot",
        "b.n.",
        "bno",
    }

    MEDICINE_IGNORE_WORDS = {
        "rx",
        "tablets",
        "capsules",
        "syrup",
        "ip",
        "bp",
        "usp",
        "mfg",
        "mfd",
        "lic",
        "no.",
        "batch",
        "exp",
        "expiry",
        "store",
        "cool",
        "dry",
        "keep",
        "children",
        "dose",
        "direction",
        "warning",
        "caution",
        "composition",
        "each",
        "film",
        "coated",
        "tablet",
        "contains",
        "price",
        "mrp",
        "rs",
        "₹",
    }

    # ------------------------------------------------------------------
    # Main OCR flow
    # ------------------------------------------------------------------

    @classmethod
    def run_ocr(cls, image: Image.Image) -> Dict[str, Any]:
        """
        Run the complete OCR process.

        This method only handles OCR.
        Validation and Gemma recovery remain outside this service.
        """
        processed_image, diagnostics = cls._prepare_image(image)

        data = cls._run_tesseract(processed_image)

        if data is None:
            return cls._error_result(
                "Tesseract binary not installed on system",
                diagnostics,
            )

        boxes, tokens, lines, raw_text, confidence = (
            cls._build_ocr_result(data)
        )

        fields, field_confidences = cls._extract_fields(
            lines,
            tokens,
        )

        return {
            "success": True,
            "bounding_boxes": boxes,
            "raw_text": raw_text,
            "overall_confidence": confidence,
            "extracted_fields": fields,
            "field_confidences": field_confidences,
            "diagnostics": diagnostics,
        }

    # ------------------------------------------------------------------
    # Image preparation
    # ------------------------------------------------------------------

    @classmethod
    def preprocess_image(
        cls,
        image: Image.Image,
    ) -> Tuple[Image.Image, Dict[str, Any]]:
        """Public alias for image preprocessing."""
        return cls._prepare_image(image)

    @staticmethod
    def _prepare_image(
        image: Image.Image,
    ) -> Tuple[Image.Image, Dict[str, Any]]:
        """Prepare the image so small medicine text is easier to read."""
        diagnostics = {
            "width": image.width,
            "height": image.height,
            "is_blurry": False,
            "low_contrast": False,
        }

        try:
            image = ImageOps.exif_transpose(image)
        except Exception:
            logger.debug(
                "Could not apply EXIF orientation",
                exc_info=True,
            )

        if image.mode != "RGB":
            image = image.convert("RGB")

        image = OCRService._upscale_if_needed(image)

        gray = image.convert("L")

        # These values are intentionally kept from the original service.
        gray = ImageEnhance.Contrast(gray).enhance(1.8)
        processed = ImageEnhance.Sharpness(gray).enhance(1.6)

        diagnostics["is_blurry"] = OCRService._is_blurry(processed)

        return processed, diagnostics

    @staticmethod
    def _upscale_if_needed(image: Image.Image) -> Image.Image:
        """Upscale small images because medicine text can be very small."""
        minimum_dimension = min(image.width, image.height)

        if minimum_dimension >= 700:
            return image

        scale = 800 / max(minimum_dimension, 1)

        new_size = (
            int(image.width * scale),
            int(image.height * scale),
        )

        return image.resize(
            new_size,
            Image.Resampling.LANCZOS,
        )

    @staticmethod
    def _is_blurry(image: Image.Image) -> bool:
        """Use edge strength as a simple blur indicator."""
        try:
            edges = image.filter(ImageFilter.FIND_EDGES)
            maximum_edge = edges.getextrema()[1]
            return maximum_edge < 45
        except Exception:
            return False

    # ------------------------------------------------------------------
    # Tesseract
    # ------------------------------------------------------------------

    @staticmethod
    def _run_tesseract(
        image: Image.Image,
    ) -> Optional[Dict[str, List[Any]]]:
        """Run Tesseract and return its raw OCR data."""
        try:
            return pytesseract.image_to_data(
                image,
                output_type=Output.DICT,
                config="--oem 3 --psm 11",
            )

        except pytesseract.TesseractNotFoundError:
            logger.warning("Tesseract binary not found")
            return None

        except Exception:
            logger.exception("Tesseract execution failed")
            return None

    # ------------------------------------------------------------------
    # Tesseract output → application format
    # ------------------------------------------------------------------

    @staticmethod
    def _build_ocr_result(
        data: Dict[str, List[Any]],
    ) -> Tuple[
        List[Dict[str, Any]],
        List[Dict[str, Any]],
        List[Dict[str, Any]],
        str,
        float,
    ]:
        """
        Convert Tesseract's raw dictionary into:

        boxes → tokens → lines → full text → overall confidence
        """
        boxes = []
        tokens = []
        lines = {}

        total_confidence = 0.0
        confidence_count = 0

        for index, raw_text in enumerate(data.get("text", [])):
            text = str(raw_text).strip()
            confidence = OCRService._get_confidence(data, index)

            if not text or confidence < 0:
                continue

            box = {
                "x": int(data["left"][index]),
                "y": int(data["top"][index]),
                "width": int(data["width"][index]),
                "height": int(data["height"][index]),
            }

            token = {
                "text": text,
                "confidence": round(confidence, 1),
                "box": box,
                "block": int(data["block_num"][index]),
                "line": int(data["line_num"][index]),
            }

            tokens.append(token)

            boxes.append({
                "text": text,
                "confidence": token["confidence"],
                "box": box,
            })

            total_confidence += confidence
            confidence_count += 1

            line_key = (
                token["block"],
                token["line"],
            )

            lines.setdefault(line_key, []).append(token)

        structured_lines = []

        for line_key in sorted(lines):
            words = lines[line_key]

            line_text = " ".join(
                word["text"]
                for word in words
            )

            line_confidence = (
                sum(word["confidence"] for word in words)
                / len(words)
            )

            structured_lines.append({
                "text": line_text,
                "confidence": round(line_confidence, 1),
                "words": words,
            })

        overall_confidence = (
            round(
                total_confidence / confidence_count,
                1,
            )
            if confidence_count
            else 0.0
        )

        raw_text = "\n".join(
            line["text"]
            for line in structured_lines
        )

        return (
            boxes,
            tokens,
            structured_lines,
            raw_text,
            overall_confidence,
        )

    @staticmethod
    def _get_confidence(
        data: Dict[str, List[Any]],
        index: int,
    ) -> float:
        """Safely read one Tesseract confidence value."""
        try:
            return float(
                str(data["conf"][index]).strip()
            )
        except (
            ValueError,
            TypeError,
            KeyError,
            IndexError,
        ):
            return -1.0

    # ------------------------------------------------------------------
    # Medicine field extraction
    # ------------------------------------------------------------------

    @classmethod
    def _extract_fields(
        cls,
        lines: List[Dict[str, Any]],
        tokens: List[Dict[str, Any]],
    ) -> Tuple[Dict[str, Any], Dict[str, float]]:
        """Extract all medicine fields and their confidence scores."""
        strength, strength_confidence = cls._extract_strength(lines)

        batch, batch_confidence = cls._extract_batch(
            lines,
            tokens,
        )

        expiry, expiry_confidence = cls._extract_expiry(
            lines,
            tokens,
        )

        manufacturing, manufacturing_confidence = (
            cls._extract_manufacturing_date(lines)
        )

        quantity, quantity_confidence = cls._extract_quantity(lines)

        name, name_confidence = cls._extract_medicine_name(lines)

        fields = {
            "medicine_name": name,
            "strength": strength,
            "batch_number": batch,
            "manufacturing_date": manufacturing,
            "expiry_date": expiry,
            "quantity": quantity,
        }

        confidences = {
            "medicine_name": name_confidence,
            "strength": strength_confidence,
            "batch_number": batch_confidence,
            "manufacturing_date": manufacturing_confidence,
            "expiry_date": expiry_confidence,
            "quantity": quantity_confidence,
        }

        return fields, confidences

    @classmethod
    def _extract_strength(
        cls,
        lines: List[Dict[str, Any]],
    ) -> Tuple[Optional[str], float]:
        return cls._find_pattern(
            lines,
            cls.STRENGTH_PATTERN,
        )

    @classmethod
    def _extract_batch(
        cls,
        lines: List[Dict[str, Any]],
        tokens: List[Dict[str, Any]],
    ) -> Tuple[Optional[str], float]:
        """Find batch number using a full-line match or nearby token."""
        value, confidence = cls._find_pattern(
            lines,
            cls.BATCH_PATTERN,
        )

        if value:
            return value, confidence

        # Tesseract may split "Batch No: AB123" into separate tokens.
        for index, token in enumerate(tokens[:-1]):
            if token["text"].lower() not in cls.BATCH_LABELS:
                continue

            value = tokens[index + 1]["text"].strip(
                ":#-./ "
            )

            if re.fullmatch(
                r"[A-Za-z0-9\-/]{3,16}",
                value,
            ):
                return (
                    value,
                    tokens[index + 1]["confidence"],
                )

        return None, 0.0

    @classmethod
    def _extract_expiry(
        cls,
        lines: List[Dict[str, Any]],
        tokens: List[Dict[str, Any]],
    ) -> Tuple[Optional[str], float]:
        """Find expiry date from a labelled line or nearby token."""
        value, confidence = cls._find_pattern(
            lines,
            cls.EXPIRY_PATTERN,
        )

        if value and re.search(r"\d", value):
            return (
                value.strip(":#-./ "),
                confidence,
            )

        # Handles OCR such as: "EXP" followed by "12/28".
        for index, token in enumerate(tokens):
            text = token["text"].lower()

            if "exp" not in text and "use" not in text:
                continue

            for offset in (1, 2):
                if index + offset >= len(tokens):
                    break

                candidate = tokens[
                    index + offset
                ]["text"].strip(":#-./ ")

                if cls._looks_like_date(candidate):
                    return (
                        candidate,
                        tokens[index + offset]["confidence"],
                    )

        return None, 0.0

    @classmethod
    def _extract_manufacturing_date(
        cls,
        lines: List[Dict[str, Any]],
    ) -> Tuple[Optional[str], float]:
        """Find manufacturing date from labels such as MFG or MFD."""
        value, confidence = cls._find_pattern(
            lines,
            cls.MFG_PATTERN,
        )

        if value and re.search(r"\d", value):
            return (
                value.strip(":#-./ "),
                confidence,
            )

        return None, 0.0

    @classmethod
    def _extract_quantity(
        cls,
        lines: List[Dict[str, Any]],
    ) -> Tuple[Optional[int], float]:
        """Find tablet/capsule quantity from the packaging text."""
        for line in lines:
            match = cls.QUANTITY_PATTERN.search(
                line["text"]
            )

            if not match:
                continue

            try:
                quantity = int(match.group(1))
            except ValueError:
                continue

            if 1 <= quantity <= 500:
                return (
                    quantity,
                    line["confidence"],
                )

        return None, 0.0

    @classmethod
    def _extract_medicine_name(
        cls,
        lines: List[Dict[str, Any]],
    ) -> Tuple[Optional[str], float]:
        """
        Select the strongest medicine-name candidate.

        Medicine names are usually near the top of packaging,
        so only the first six OCR lines are considered.
        """
        candidates = []

        for line in lines[:6]:
            text = line["text"].strip()

            cleaned = re.sub(
                r"[^\w\s]",
                "",
                text,
            ).strip()

            words = [
                word
                for word in cleaned.split()
                if word.lower()
                not in cls.MEDICINE_IGNORE_WORDS
                and not word.isdigit()
            ]

            if not words or len(cleaned) < 3:
                continue

            score = line["confidence"]

            # Uppercase text is often used for medicine brand names.
            if cleaned.isupper():
                score += 10

            candidates.append(
                (
                    cleaned,
                    line["confidence"],
                    score,
                )
            )

        if not candidates:
            return None, 0.0

        name, confidence, _ = max(
            candidates,
            key=lambda candidate: candidate[2],
        )

        return name, confidence

    # ------------------------------------------------------------------
    # Shared helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _find_pattern(
        lines: List[Dict[str, Any]],
        pattern: re.Pattern,
    ) -> Tuple[Optional[str], float]:
        """Find the first matching value and use its line confidence."""
        for line in lines:
            match = pattern.search(line["text"])

            if match:
                value = match.group(1) if match.lastindex else match.group(0)
                return (
                    value.strip(),
                    line["confidence"],
                )

        return None, 0.0

    @classmethod
    def _looks_like_date(cls, value: str) -> bool:
        return any(
            pattern.fullmatch(value)
            for pattern in cls.DATE_PATTERNS
        )

    @staticmethod
    def _error_result(
        error: str,
        diagnostics: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Return the standard OCR failure response."""
        return {
            "success": False,
            "error": error,
            "bounding_boxes": [],
            "raw_text": "",
            "overall_confidence": 0.0,
            "extracted_fields": {},
            "field_confidences": {},
            "diagnostics": diagnostics,
        }


# Alias for feature-based provider architecture
OCRProvider = OCRService
