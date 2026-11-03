import io
import re
import shutil
import logging
from typing import Dict, Any, List, Optional, Tuple
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
import pytesseract
from pytesseract import Output

logger = logging.getLogger("medguard.ocr")

# Configure tesseract executable if in standard Homebrew or Linux paths
TESSERACT_CANDIDATES = [
    "/opt/homebrew/bin/tesseract",
    "/usr/local/bin/tesseract",
    "/usr/bin/tesseract",
    shutil.which("tesseract"),
]
for candidate in TESSERACT_CANDIDATES:
    if candidate and shutil.which(candidate):
        pytesseract.pytesseract.tesseract_cmd = candidate
        break

class OCRService:
    @staticmethod
    def preprocess_image(image: Image.Image) -> Tuple[Image.Image, Dict[str, Any]]:
        """
        Preprocesses a medicine packaging image for OCR:
        - Auto-rotates based on EXIF
        - Normalizes scale (upscales small packaging photos to help OCR read small 4-6pt fonts)
        - Increases contrast and sharpens edges
        - Computes blur and illumination diagnostics
        """
        diagnostics = {
            "width": image.width,
            "height": image.height,
            "is_blurry": False,
            "low_contrast": False,
        }

        # Auto-rotate according to EXIF
        try:
            image = ImageOps.exif_transpose(image)
        except Exception:
            pass

        # Convert to RGB
        if image.mode != "RGB":
            image = image.convert("RGB")

        # Upscale if image is too small
        min_dim = min(image.width, image.height)
        if min_dim < 700:
            scale_factor = 800 / max(min_dim, 1)
            new_size = (int(image.width * scale_factor), int(image.height * scale_factor))
            image = image.resize(new_size, Image.Resampling.LANCZOS)

        # Grayscale conversion for text extraction
        gray = image.convert("L")

        # Contrast enhancement
        enhancer = ImageEnhance.Contrast(gray)
        enhanced = enhancer.enhance(1.8)

        # Sharpness enhancement
        sharpener = ImageEnhance.Sharpness(enhanced)
        processed = sharpener.enhance(1.6)

        # Check blurriness using edge detection energy
        try:
            edges = processed.filter(ImageFilter.FIND_EDGES)
            edge_stat = edges.getextrema()
            # If maximum edge intensity is very low, image is likely blurry
            if edge_stat[1] < 45:
                diagnostics["is_blurry"] = True
        except Exception:
            pass

        return processed, diagnostics

    @classmethod
    def run_ocr(cls, image: Image.Image) -> Dict[str, Any]:
        """
        Executes Tesseract OCR, captures text tokens with bounding boxes and confidences,
        and parses candidate medicine fields.
        """
        try:
            processed_img, diagnostics = cls.preprocess_image(image)
        except Exception as e:
            logger.error(f"Image preprocessing failed: {e}")
            processed_img = image.convert("L")
            diagnostics = {"is_blurry": False}

        bounding_boxes: List[Dict[str, Any]] = []
        raw_lines: List[str] = []
        token_entries: List[Dict[str, Any]] = []

        try:
            # Run pytesseract with data output
            data = pytesseract.image_to_data(
                processed_img,
                output_type=Output.DICT,
                config="--oem 3 --psm 11",
            )
        except pytesseract.TesseractNotFoundError:
            logger.warning("Tesseract binary not found on host system.")
            return {
                "success": False,
                "error": "Tesseract binary not installed on system",
                "bounding_boxes": [],
                "raw_text": "",
                "overall_confidence": 0.0,
                "extracted_fields": {},
                "field_confidences": {},
                "diagnostics": diagnostics,
            }
        except Exception as e:
            logger.error(f"Tesseract execution error: {e}")
            return {
                "success": False,
                "error": str(e),
                "bounding_boxes": [],
                "raw_text": "",
                "overall_confidence": 0.0,
                "extracted_fields": {},
                "field_confidences": {},
                "diagnostics": diagnostics,
            }

        num_boxes = len(data.get("text", []))
        total_conf = 0.0
        conf_count = 0

        # Group by block and line to reconstruct coherent lines
        lines_map: Dict[Tuple[int, int], List[Dict[str, Any]]] = {}

        for i in range(num_boxes):
            word = str(data["text"][i]).strip()
            conf_str = str(data["conf"][i]).strip()
            try:
                conf = float(conf_str)
            except ValueError:
                conf = -1.0

            if not word or conf < 0:
                continue

            x = int(data["left"][i])
            y = int(data["top"][i])
            w = int(data["width"][i])
            h = int(data["height"][i])
            block = int(data["block_num"][i])
            line = int(data["line_num"][i])

            entry = {
                "text": word,
                "confidence": round(conf, 1),
                "box": {
                    "x": x,
                    "y": y,
                    "width": w,
                    "height": h,
                },
                "block": block,
                "line": line,
            }
            token_entries.append(entry)
            bounding_boxes.append({
                "text": word,
                "confidence": round(conf, 1),
                "box": entry["box"],
            })

            total_conf += conf
            conf_count += 1

            key = (block, line)
            if key not in lines_map:
                lines_map[key] = []
            lines_map[key].append(entry)

        # Reconstruct text lines
        structured_lines: List[Dict[str, Any]] = []
        for key in sorted(lines_map.keys()):
            words_in_line = lines_map[key]
            line_text = " ".join(w["text"] for w in words_in_line)
            avg_conf = sum(w["confidence"] for w in words_in_line) / len(words_in_line)
            structured_lines.append({
                "text": line_text,
                "confidence": round(avg_conf, 1),
                "words": words_in_line,
            })
            raw_lines.append(line_text)

        overall_confidence = round(total_conf / conf_count, 1) if conf_count > 0 else 0.0
        full_raw_text = "\n".join(raw_lines)

        # Parse medicine fields from lines and tokens
        extracted_fields, field_confidences = cls._parse_medicine_fields(
            structured_lines, token_entries, full_raw_text
        )

        return {
            "success": True,
            "bounding_boxes": bounding_boxes,
            "raw_text": full_raw_text,
            "overall_confidence": overall_confidence,
            "extracted_fields": extracted_fields,
            "field_confidences": field_confidences,
            "diagnostics": diagnostics,
        }

    @classmethod
    def _parse_medicine_fields(
        cls,
        lines: List[Dict[str, Any]],
        tokens: List[Dict[str, Any]],
        full_text: str,
    ) -> Tuple[Dict[str, Any], Dict[str, float]]:
        """
        Extracts medicine attributes using domain regexes and calculates
        confidence scores for each extracted field based on token confidences.
        """
        extracted: Dict[str, Any] = {
            "medicine_name": None,
            "strength": None,
            "batch_number": None,
            "manufacturing_date": None,
            "expiry_date": None,
            "quantity": 10,
        }
        confidences: Dict[str, float] = {
            "medicine_name": 0.0,
            "strength": 0.0,
            "batch_number": 0.0,
            "manufacturing_date": 0.0,
            "expiry_date": 0.0,
            "quantity": 0.0,
        }

        # 1. Strength pattern (e.g. 500mg, 625 mg, 10 ml, 2% w/v)
        strength_regex = re.compile(
            r"\b(\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml|l|%|iu|w\/v|w\/w))\b",
            re.IGNORECASE,
        )
        for line_info in lines:
            m = strength_regex.search(line_info["text"])
            if m:
                extracted["strength"] = m.group(1).strip()
                # Find matching token confidence
                matched_tokens = [
                    t["confidence"] for t in line_info["words"]
                    if m.group(1).lower() in t["text"].lower() or any(p in t["text"].lower() for p in m.group(1).lower().split())
                ]
                confidences["strength"] = round(sum(matched_tokens) / len(matched_tokens), 1) if matched_tokens else line_info["confidence"]
                break

        # 2. Batch Number
        # Looks for B.No, Batch No, Lot No, B.N., B.No.
        batch_regex = re.compile(
            r"(?:B(?:atch)?\.?\s*(?:No|Num)?\.?|Lot\.?\s*(?:No)?\.?|B\.?N\.?)\s*[:.\-]?\s*([A-Za-z0-9\-\/]{3,16})",
            re.IGNORECASE,
        )
        for line_info in lines:
            m = batch_regex.search(line_info["text"])
            if m:
                matched_val = m.group(1).strip()
                extracted["batch_number"] = matched_val
                val_tokens = [
                    t["confidence"] for t in line_info["words"]
                    if matched_val.lower() in t["text"].lower() or t["text"].lower() in matched_val.lower()
                ]
                confidences["batch_number"] = round(sum(val_tokens) / len(val_tokens), 1) if val_tokens else line_info["confidence"]
                break

        # If not found via prefix, search tokens for common batch-like patterns near keywords
        if not extracted["batch_number"]:
            for i, token in enumerate(tokens):
                t_lower = token["text"].lower()
                if t_lower in ["b.no", "b.no.", "batch", "lot", "b.n.", "bno"]:
                    if i + 1 < len(tokens):
                        val_candidate = tokens[i + 1]["text"].strip(":#-./ ")
                        if re.match(r"^[A-Za-z0-9\-\/]{3,16}$", val_candidate):
                            extracted["batch_number"] = val_candidate
                            confidences["batch_number"] = tokens[i + 1]["confidence"]
                            break

        # 3. Expiry Date
        # Looks for Exp Date, Expiry, Use Before, E.D.
        expiry_regex = re.compile(
            r"(?:Exp(?:iry)?\.?\s*(?:Date)?\.?|Use\s*Before|E\.?D\.?)\s*[:.\-]?\s*([A-Za-z0-9\/\.\-]+)",
            re.IGNORECASE,
        )
        for line_info in lines:
            m = expiry_regex.search(line_info["text"])
            if m:
                candidate = m.group(1).strip(":#-./ ")
                if re.search(r"\d", candidate):  # must contain at least a digit
                    extracted["expiry_date"] = candidate
                    val_tokens = [
                        t["confidence"] for t in line_info["words"]
                        if candidate.lower() in t["text"].lower() or any(p in t["text"].lower() for p in candidate.lower().split("/"))
                    ]
                    confidences["expiry_date"] = round(sum(val_tokens) / len(val_tokens), 1) if val_tokens else line_info["confidence"]
                    break

        # If expiry date not found via label, search for date-formatted strings near 'exp'
        if not extracted["expiry_date"]:
            for i, token in enumerate(tokens):
                t_lower = token["text"].lower()
                if "exp" in t_lower or "use" in t_lower:
                    # Check next 2 tokens
                    for offset in [1, 2]:
                        if i + offset < len(tokens):
                            cand = tokens[i + offset]["text"].strip(":#-./ ")
                            if re.search(r"^(?:0?[1-9]|1[0-2])[\/\-\.](?:20\d{2}|\d{2})$", cand) or \
                               re.search(r"^[A-Za-z]{3}[\/\-\.](?:20\d{2}|\d{2})$", cand):
                                extracted["expiry_date"] = cand
                                confidences["expiry_date"] = tokens[i + offset]["confidence"]
                                break
                    if extracted["expiry_date"]:
                        break

        # 4. Manufacturing Date
        # Looks for Mfg Date, Mfd, M.D.
        mfg_regex = re.compile(
            r"(?:Mfg?\.?\s*(?:Date)?\.?|Mfd\.?|M\.?D\.?)\s*[:.\-]?\s*([A-Za-z0-9\/\.\-]+)",
            re.IGNORECASE,
        )
        for line_info in lines:
            m = mfg_regex.search(line_info["text"])
            if m:
                candidate = m.group(1).strip(":#-./ ")
                if re.search(r"\d", candidate):
                    extracted["manufacturing_date"] = candidate
                    val_tokens = [
                        t["confidence"] for t in line_info["words"]
                        if candidate.lower() in t["text"].lower() or any(p in t["text"].lower() for p in candidate.lower().split("/"))
                    ]
                    confidences["manufacturing_date"] = round(sum(val_tokens) / len(val_tokens), 1) if val_tokens else line_info["confidence"]
                    break

        # 5. Quantity (pieces or count)
        qty_regex = re.compile(
            r"(?:Strip\s*of|Pack\s*of|Contains|\bQty\b|\bQuantity\b)?\s*(\d{1,3})\s*(?:Tablets?|Capsules?|Pills?|Tabs?|Caps?)?",
            re.IGNORECASE,
        )
        for line_info in lines:
            m = qty_regex.search(line_info["text"])
            if m and m.group(1):
                val = int(m.group(1))
                if 1 <= val <= 500:
                    extracted["quantity"] = val
                    confidences["quantity"] = line_info["confidence"]
                    break

        # 6. Medicine Name
        # Heuristic: prominent non-header text, usually capitalized, appearing in the first few lines
        ignore_keywords = [
            "rx", "tablets", "capsules", "syrup", "ip", "bp", "usp", "mfg", "mfd",
            "lic", "no.", "batch", "exp", "expiry", "store", "cool", "dry", "keep",
            "children", "dose", "direction", "warning", "caution", "composition",
            "each", "film", "coated", "tablet", "contains", "price", "mrp", "rs", "₹",
        ]
        candidate_names = []
        for line_info in lines[:6]:  # search top lines
            text = line_info["text"].strip()
            # Clean punctuation
            clean = re.sub(r"[^\w\s]", "", text).strip()
            words = [w for w in clean.split() if w.lower() not in ignore_keywords and not w.isdigit()]
            if len(words) >= 1 and len(clean) >= 3:
                # Give weight to capitalized or uppercase names
                weight = line_info["confidence"]
                if clean.isupper():
                    weight += 10
                candidate_names.append((clean, line_info["confidence"], weight))

        if candidate_names:
            # Pick highest weighted candidate
            candidate_names.sort(key=lambda x: x[2], reverse=True)
            best_name, orig_conf, _ = candidate_names[0]
            extracted["medicine_name"] = best_name
            confidences["medicine_name"] = orig_conf

        return extracted, confidences
