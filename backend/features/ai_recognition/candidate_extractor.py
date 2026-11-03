"""MedGuard AI - Field Candidate Extractor.

Extracts candidate text regions for all medicine packaging fields:
- medicine_name (never assumes position 0 or top-of-packaging)
- strength
- dosage_form
- composition
- batch_number
- manufacturing_date
- expiry_date
- manufacturer

Preserves bounding boxes and individual token confidence scores.
"""

import re
from typing import Any, Dict, List, Optional, Tuple


class CandidateExtractor:
    """Intelligently identifies field candidates across full OCR token layouts."""

    STRENGTH_PATTERN = re.compile(
        r"\b(\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml|l|%|iu|w/v|w/w))\b",
        re.IGNORECASE,
    )

    BATCH_LABEL_PATTERN = re.compile(
        r"(?:B(?:atch)?\.?\s*(?:No|Num)?\.?|"
        r"Lot\.?\s*(?:No)?\.?|B\.?N\.?)"
        r"\s*[:.\-]?\s*([A-Za-z0-9\-/]{3,16})",
        re.IGNORECASE,
    )

    EXPIRY_LABEL_PATTERN = re.compile(
        r"(?:Exp(?:iry)?\.?\s*(?:Date)?\.?|"
        r"Use\s*Before|E\.?D\.?)"
        r"\s*[:.\-]?\s*([A-Za-z0-9/.\-]+)",
        re.IGNORECASE,
    )

    MFG_LABEL_PATTERN = re.compile(
        r"(?:Mfg?\.?\s*(?:Date)?\.?|Mfd\.?|M\.?D\.?|Manufactured)"
        r"\s*[:.\-]?\s*([A-Za-z0-9/.\-]+)",
        re.IGNORECASE,
    )

    # Common English words that OCR may mistakenly match as batch numbers
    DISALLOWED_BATCH_WORDS = {
        "tablets", "tablets", "tablet", "capsule", "capsules", "syrup",
        "contains", "strip", "strips", "place", "below", "light",
        "reach", "physician", "warning", "licence", "license", "marketed",
        "manufactured", "protect", "store", "children", "dosage",
        "uncoated", "coated", "excipients", "colour", "color", "lets",
    }

    DOSAGE_FORMS = [
        "tablets ip", "tablets usp", "tablets bp", "tablets",
        "capsules ip", "capsules usp", "capsules",
        "syrup", "suspension", "injection", "ointment", "cream",
        "gel", "drops", "inhaler", "lotion", "solution", "elixir",
    ]

    MANUFACTURER_KEYWORDS = [
        "ltd", "limited", "pvt", "pharma", "pharmaceuticals", "laboratories",
        "lab", "healthcare", "remedies", "mfg by", "mkt by", "marketed by",
        "manufactured by", "lic no", "unit-", "circle", "east-sikkim",
    ]

    INSTRUCTION_KEYWORDS = [
        "store below", "in dry place", "protect from light", "keep out of reach",
        "dosage :", "dosage:", "as directed", "physician", "warning :", "warning:",
        "to be sold by retail", "prescription", "registered medical",
        "schedule h", "schedule h1", "schedule x",
    ]

    COMPOSITION_BOILERPLATE = [
        "each uncoated tablet contains",
        "each film coated tablet contains",
        "each capsule contains",
        "each ml contains",
        "excipients",
        "q.s.",
        "colour :",
        "color :",
    ]

    @classmethod
    def extract_candidates(
        cls,
        tokens: List[Dict[str, Any]],
        lines: List[Dict[str, Any]],
        image_width: int,
        image_height: int,
    ) -> Dict[str, Any]:
        """
        Extract ranked candidates for every packaging field.
        Does NOT rely on fixed coordinates or top-of-strip assumptions.
        """
        strength_candidates = cls._extract_strength_candidates(lines)
        batch_candidates = cls._extract_batch_candidates(lines)
        exp_candidates = cls._extract_date_candidates(lines, cls.EXPIRY_LABEL_PATTERN)
        mfg_candidates = cls._extract_date_candidates(lines, cls.MFG_LABEL_PATTERN)
        mfr_candidates = cls._extract_manufacturer_candidates(lines)
        comp_candidates = cls._extract_composition_candidates(lines)
        dosage_candidates = cls._extract_dosage_form_candidates(lines)

        # Extract medicine name candidates across ALL regions
        med_name_candidates = cls._extract_medicine_name_candidates(
            lines=lines,
            strength_candidates=strength_candidates,
            dosage_candidates=dosage_candidates,
            image_height=image_height,
        )

        return {
            "medicine_name_candidates": med_name_candidates,
            "strength_candidates": strength_candidates,
            "batch_candidates": batch_candidates,
            "expiry_candidates": exp_candidates,
            "mfg_candidates": mfg_candidates,
            "manufacturer_candidates": mfr_candidates,
            "composition_candidates": comp_candidates,
            "dosage_candidates": dosage_candidates,
        }

    # -------------------------------------------------------------------------
    # Medicine Name Candidate Scoring (Position-Agnostic)
    # -------------------------------------------------------------------------

    @classmethod
    def _extract_medicine_name_candidates(
        cls,
        lines: List[Dict[str, Any]],
        strength_candidates: List[Dict[str, Any]],
        dosage_candidates: List[Dict[str, Any]],
        image_height: int,
    ) -> List[Dict[str, Any]]:
        candidates = []

        for line in lines:
            raw_text = line.get("text", "").strip()
            confidence = float(line.get("confidence", 0.0))
            box = line.get("box", {})
            box_height = box.get("height", 0)

            if len(raw_text) < 3 or confidence < 20.0:
                continue

            lower_line = raw_text.lower()

            # 1. Disqualification checks
            if any(k in lower_line for k in cls.MANUFACTURER_KEYWORDS):
                continue
            if any(k in lower_line for k in cls.INSTRUCTION_KEYWORDS):
                continue
            if any(k in lower_line for k in cls.COMPOSITION_BOILERPLATE):
                continue
            if re.match(r"^(?:b\.?no|mfg|exp|batch|lot|m\.r\.p|mrp)", lower_line):
                continue
            if re.match(r"^[\d\s.,/\\-]+$", raw_text):
                continue

            # Clean candidate text
            cleaned = re.sub(r"^[^\w]+|[^\w)]+$", "", raw_text).strip()
            if len(cleaned) < 3:
                continue

            # 2. Score candidate based on pharmaceutical signals
            score = confidence

            # Signal A: Dosage form present on the line (e.g. "Tablets IP", "Capsules")
            for df in cls.DOSAGE_FORMS:
                if df in lower_line:
                    score += 35.0
                    break

            # Signal B: Strength present on the line (e.g. "Doxofylline 400 mg")
            if cls.STRENGTH_PATTERN.search(raw_text):
                score += 25.0

            # Signal C: Prominent uppercase typography (standard for medicine brand names)
            if cleaned.isupper() and len(cleaned) >= 4:
                score += 15.0

            # Signal D: Font size prominence (larger bounding box height)
            if box_height > 25:
                score += 15.0
            elif box_height > 18:
                score += 8.0

            # Signal E: Clean word ratio (real English/Latin pharma words vs OCR noise)
            words = cleaned.split()
            valid_words = [w for w in words if re.match(r"^[A-Za-z0-9\-]+$", w) and len(w) >= 2]
            if len(valid_words) == len(words):
                score += 10.0

            # Penalize single short tokens that lack dosage/strength markers
            if len(words) == 1 and len(cleaned) < 5 and not any(df in lower_line for df in cls.DOSAGE_FORMS):
                score -= 25.0

            candidates.append({
                "value": cleaned,
                "confidence": confidence,
                "score": round(score, 1),
                "box": box,
            })

        # Sort descending by calculated score
        candidates.sort(key=lambda c: c["score"], reverse=True)
        return candidates

    # -------------------------------------------------------------------------
    # Batch Number Candidate Extraction
    # -------------------------------------------------------------------------

    @classmethod
    def _extract_batch_candidates(cls, lines: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        candidates = []

        for line in lines:
            text = line.get("text", "").strip()
            conf = float(line.get("confidence", 0.0))

            match = cls.BATCH_LABEL_PATTERN.search(text)
            if match:
                batch_val = match.group(1).strip()
                # Clean trailing punctuation
                batch_val = re.sub(r"[^\w\-]", "", batch_val)

                if cls._is_valid_batch_string(batch_val):
                    candidates.append({
                        "value": batch_val,
                        "confidence": conf,
                        "raw_line": text,
                        "box": line.get("box", {}),
                    })

        # Also look for standalone batch patterns if labeled batch was missed
        if not candidates:
            for line in lines:
                text = line.get("text", "").strip()
                conf = float(line.get("confidence", 0.0))
                # Match standalone batch formats like B12345 or AB1234
                standalone = re.findall(r"\b([A-Z]{1,3}\d{4,8})\b", text)
                for val in standalone:
                    if cls._is_valid_batch_string(val):
                        candidates.append({
                            "value": val,
                            "confidence": conf * 0.85,
                            "raw_line": text,
                            "box": line.get("box", {}),
                        })

        candidates.sort(key=lambda c: c["confidence"], reverse=True)
        return candidates

    @classmethod
    def _is_valid_batch_string(cls, val: str) -> bool:
        """Validate candidate batch string."""
        if not val or len(val) < 3 or len(val) > 18:
            return False
        clean = val.lower().strip()
        if clean in cls.DISALLOWED_BATCH_WORDS:
            return False
        # Must contain at least one digit or uppercase letter
        if not re.search(r"[A-Za-z0-9]", val):
            return False
        # Disallow purely common vowels
        if clean in {"tablet", "tablets", "capsule", "contains", "batch", "strip"}:
            return False
        return True

    # -------------------------------------------------------------------------
    # Date Candidate Extraction (Expiry & Manufacturing)
    # -------------------------------------------------------------------------

    @classmethod
    def _extract_date_candidates(
        cls,
        lines: List[Dict[str, Any]],
        label_pattern: re.Pattern,
    ) -> List[Dict[str, Any]]:
        candidates = []

        for line in lines:
            text = line.get("text", "").strip()
            conf = float(line.get("confidence", 0.0))

            match = label_pattern.search(text)
            if match:
                raw_val = match.group(1).strip()
                # Look for date patterns in matched string
                date_str = cls._extract_date_token(raw_val)
                if date_str:
                    candidates.append({
                        "value": date_str,
                        "confidence": conf,
                        "raw_line": text,
                        "box": line.get("box", {}),
                    })

        # If not found via label, search entire line for date regex preceded by label fragment
        if not candidates:
            for line in lines:
                text = line.get("text", "").strip()
                conf = float(line.get("confidence", 0.0))
                date_str = cls._extract_date_token(text)
                if date_str and any(k in text.lower() for k in ["exp", "mfg", "mfd", "valid", "use"]):
                    candidates.append({
                        "value": date_str,
                        "confidence": conf * 0.8,
                        "raw_line": text,
                        "box": line.get("box", {}),
                    })

        candidates.sort(key=lambda c: c["confidence"], reverse=True)
        return candidates

    @classmethod
    def _extract_date_token(cls, text: str) -> Optional[str]:
        """Extract a valid MM/YY, MM/YYYY, or MMM/YYYY string from text."""
        # MM/YYYY or MM/YY
        m1 = re.search(r"\b(0?[1-9]|1[0-2])[/\-.](20\d{2}|\d{2})\b", text)
        if m1:
            month = m1.group(1).zfill(2)
            year = m1.group(2)
            if len(year) == 2:
                year = f"20{year}"
            return f"{month}/{year}"

        # Month abbreviation: JAN/2026 or JAN-26
        month_abbr = r"(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)"
        m2 = re.search(rf"\b({month_abbr})[/\-.](20\d{2}|\d{2})\b", text, re.IGNORECASE)
        if m2:
            m_str = m2.group(1).upper()
            months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
            month_num = str(months.index(m_str) + 1).zfill(2)
            year = m2.group(2)
            if len(year) == 2:
                year = f"20{year}"
            return f"{month_num}/{year}"

        # DD/MM/YYYY
        m3 = re.search(r"\b(?:0?[1-9]|[12]\d|3[01])[/\-.](0?[1-9]|1[0-2])[/\-.](20\d{2})\b", text)
        if m3:
            return f"{m3.group(1).zfill(2)}/{m3.group(2)}"

        return None

    # -------------------------------------------------------------------------
    # Strength Candidate Extraction
    # -------------------------------------------------------------------------

    @classmethod
    def _extract_strength_candidates(cls, lines: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        candidates = []

        for line in lines:
            text = line.get("text", "").strip()
            conf = float(line.get("confidence", 0.0))

            match = cls.STRENGTH_PATTERN.search(text)
            if match:
                raw_str = match.group(1).strip()
                # Normalize spacing: "500mg" -> "500 mg"
                norm_str = re.sub(r"(\d+(?:\.\d+)?)\s*([A-Za-z%]+)", r"\1 \2", raw_str)
                candidates.append({
                    "value": norm_str,
                    "confidence": conf,
                    "box": line.get("box", {}),
                })

        candidates.sort(key=lambda c: c["confidence"], reverse=True)
        return candidates

    # -------------------------------------------------------------------------
    # Dosage Form & Composition Candidates
    # -------------------------------------------------------------------------

    @classmethod
    def _extract_dosage_form_candidates(cls, lines: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        candidates = []
        for line in lines:
            text = line.get("text", "").lower()
            for df in ["tablet", "capsule", "syrup", "suspension", "injection", "ointment", "cream", "gel", "drops"]:
                if df in text:
                    candidates.append({
                        "value": df.capitalize(),
                        "confidence": float(line.get("confidence", 0.0)),
                    })
                    break
        return candidates

    @classmethod
    def _extract_composition_candidates(cls, lines: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        candidates = []
        for line in lines:
            text = line.get("text", "").strip()
            match = re.search(r"(?:contains\s*:?|each\s+.*?contains\s*:?)\s*([A-Za-z\s]+?)(?:\s+ip|\s+usp|\s+\d|\s*$)", text, re.IGNORECASE)
            if match:
                comp = match.group(1).strip()
                if len(comp) > 3 and not any(k in comp.lower() for k in ["tablet", "uncoated", "coated"]):
                    candidates.append({
                        "value": comp,
                        "confidence": float(line.get("confidence", 0.0)),
                    })
        return candidates

    @classmethod
    def _extract_manufacturer_candidates(cls, lines: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        candidates = []
        for line in lines:
            text = line.get("text", "").strip()
            if any(k in text.lower() for k in cls.MANUFACTURER_KEYWORDS):
                # Clean prefix: "Mfg by : Zydus Healthcare Ltd."
                cleaned = re.sub(r"^(?:mfg|mkt)\.?\s*(?:by)?\.?\s*[:\-]?\s*", "", text, flags=re.IGNORECASE).strip()
                if len(cleaned) > 3:
                    candidates.append({
                        "value": cleaned,
                        "confidence": float(line.get("confidence", 0.0)),
                    })
        return candidates
