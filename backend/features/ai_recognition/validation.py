"""
MedGuard AI - Validation Service
=================================
Implements multi-tiered validation gates for OCR and Vision AI extraction:
1. First Gate (OCR Output): Validates extracted tokens against confidence thresholds,
   date syntax, chronological logic (mfg <= exp), and alphanumeric integrity.
2. Second Gate (Gemma AI Output): Anti-hallucination filter ensuring AI-suggested fields
   conform to pharmaceutical constraints before merging with trusted OCR data.
"""

import re
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
from backend.app.config import settings

# Default confidence threshold (80%) below which fields require vision AI verification
CONFIDENCE_THRESHOLD = 80.0

# Mandatory fields required to consider an OCR scan completely 'trusted' without AI
CRITICAL_FIELDS = ["medicine_name", "batch_number", "expiry_date"]

# Mapping of month abbreviations to calendar month numbers
MONTH_MAP = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}


class ValidationResult:
    """Encapsulates the decision outcome of the OCR validation layer."""
    def __init__(
        self,
        status: str,  # 'trusted' or 'uncertain'
        reasons: List[str],
        trusted_fields: Dict[str, Any],
        uncertain_fields: Dict[str, Any],
        normalized_data: Dict[str, Any],
        overall_confidence: float,
    ):
        self.status = status
        self.reasons = reasons
        self.trusted_fields = trusted_fields
        self.uncertain_fields = uncertain_fields
        self.normalized_data = normalized_data
        self.overall_confidence = overall_confidence

    def to_dict(self) -> Dict[str, Any]:
        """Serialize validation result into standard response dictionary."""
        return {
            "status": self.status,
            "reasons": self.reasons,
            "trusted_fields": self.trusted_fields,
            "uncertain_fields": self.uncertain_fields,
            "normalized_data": self.normalized_data,
            "overall_confidence": self.overall_confidence,
        }


class ValidationService:
    """
    Validation engine ensuring pharmaceutical data safety and preventing hallucinations.
    """

    # -------------------------------------------------------------------------
    # Gate 1: OCR Output Validation
    # -------------------------------------------------------------------------

    @classmethod
    def validate_ocr_output(
        cls,
        extracted_fields: Dict[str, Any],
        field_confidences: Dict[str, float],
        diagnostics: Optional[Dict[str, Any]] = None,
        overall_confidence: float = 0.0,
    ) -> ValidationResult:
        """
        Evaluate raw OCR extractions against thresholds and domain syntax rules.
        
        Returns:
            ValidationResult with status='trusted' (bypass Gemma vision) or 'uncertain'
            (trigger targeted Gemma vision recovery for ambiguous fields).
        """
        reasons: List[str] = []
        trusted_fields: Dict[str, Any] = {}
        uncertain_fields: Dict[str, Any] = {}
        normalized = dict(extracted_fields)

        # Flag blurry or degraded images
        diagnostics = diagnostics or {}
        if diagnostics.get("is_blurry"):
            reasons.append("Image is blurry or low contrast, reducing OCR reliability")

        # Thresholds configured via environment settings
        med_threshold = getattr(settings, "OCR_MEDICINE_NAME_THRESHOLD", 80.0)
        str_threshold = getattr(settings, "OCR_STRENGTH_THRESHOLD", 80.0)
        batch_threshold = getattr(settings, "OCR_BATCH_THRESHOLD", 80.0)
        date_threshold = getattr(settings, "OCR_DATE_THRESHOLD", 80.0)

        # 1. Validate medicine name
        cls._validate_ocr_medicine_name(
            extracted_fields.get("medicine_name"),
            field_confidences.get("medicine_name", 0.0),
            med_threshold,
            reasons,
            trusted_fields,
            uncertain_fields,
        )

        # 2. Validate dosage strength
        cls._validate_ocr_strength(
            extracted_fields.get("strength"),
            extracted_fields.get("medicine_name"),
            field_confidences.get("strength", 0.0),
            str_threshold,
            reasons,
            trusted_fields,
            uncertain_fields,
            normalized,
        )

        # 3. Validate batch identifier
        cls._validate_ocr_batch(
            extracted_fields.get("batch_number"),
            field_confidences.get("batch_number", 0.0),
            batch_threshold,
            reasons,
            trusted_fields,
            uncertain_fields,
        )

        # 4. Validate dates (expiry & manufacturing) with chronological check (mfg <= exp)
        cls._validate_ocr_dates(
            extracted_fields.get("expiry_date"),
            field_confidences.get("expiry_date", 0.0),
            extracted_fields.get("manufacturing_date"),
            field_confidences.get("manufacturing_date", 0.0),
            date_threshold,
            reasons,
            trusted_fields,
            uncertain_fields,
            normalized,
        )

        # 5. Validate package quantity
        cls._validate_ocr_quantity(
            extracted_fields.get("quantity"),
            trusted_fields,
            uncertain_fields,
            normalized,
        )

        # 6. Final Decision Gate: Status is 'trusted' only if all critical fields are trusted
        #    and there are zero disqualifying reasons or blur issues.
        has_all_critical = all(field in trusted_fields for field in CRITICAL_FIELDS)
        is_trusted = has_all_critical and len(reasons) == 0
        status = "trusted" if is_trusted else "uncertain"

        # Calculate weighted confidence across critical medicine fields
        critical_confs = [field_confidences.get(f, 0.0) for f in CRITICAL_FIELDS]
        calculated_conf = sum(critical_confs) / len(critical_confs) if critical_confs else overall_confidence
        final_conf = round(calculated_conf if calculated_conf > 0 else overall_confidence, 1)

        return ValidationResult(
            status=status,
            reasons=reasons,
            trusted_fields=trusted_fields,
            uncertain_fields=uncertain_fields,
            normalized_data=normalized,
            overall_confidence=final_conf,
        )

    # -------------------------------------------------------------------------
    # OCR Validation Field Helpers
    # -------------------------------------------------------------------------

    @classmethod
    def _validate_ocr_medicine_name(
        cls,
        name: Optional[str],
        conf: float,
        threshold: float,
        reasons: List[str],
        trusted: Dict[str, Any],
        uncertain: Dict[str, Any],
    ) -> None:
        """Validate medicine name readability and confidence score."""
        if not name:
            reasons.append("Medicine name could not be identified by OCR")
            uncertain["medicine_name"] = None
        elif not cls._is_readable_medicine_name(name):
            reasons.append(f"Medicine name '{name}' appears garbled or unreadable")
            uncertain["medicine_name"] = name
        elif conf < threshold:
            reasons.append(f"Medicine name confidence ({conf:.1f}%) is below threshold ({threshold}%)")
            uncertain["medicine_name"] = name
        else:
            trusted["medicine_name"] = name

    @classmethod
    def _validate_ocr_strength(
        cls,
        strength: Optional[str],
        med_name: Optional[str],
        conf: float,
        threshold: float,
        reasons: List[str],
        trusted: Dict[str, Any],
        uncertain: Dict[str, Any],
        normalized: Dict[str, Any],
    ) -> None:
        """Validate strength format, or extract from brand name if present (e.g. 'Paracetamol 500mg')."""
        if strength:
            if cls._is_valid_strength(strength):
                if conf >= threshold:
                    trusted["strength"] = strength
                else:
                    reasons.append(f"Strength confidence ({conf:.1f}%) is below threshold ({threshold}%)")
                    uncertain["strength"] = strength
            else:
                reasons.append(f"Strength format '{strength}' is irregular or unverified")
                uncertain["strength"] = strength
        else:
            # Check if strength pattern exists inside the medicine name itself
            if med_name:
                m_str = re.search(r"\b(\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml|l|%|iu))\b", med_name, re.I)
                if m_str:
                    normalized["strength"] = m_str.group(1)
                    trusted["strength"] = m_str.group(1)
                else:
                    uncertain["strength"] = None
            else:
                uncertain["strength"] = None

    @classmethod
    def _validate_ocr_batch(
        cls,
        batch: Optional[str],
        conf: float,
        threshold: float,
        reasons: List[str],
        trusted: Dict[str, Any],
        uncertain: Dict[str, Any],
    ) -> None:
        """Validate alphanumeric structure and confidence of batch/lot number."""
        if not batch:
            reasons.append("Batch number could not be identified by OCR")
            uncertain["batch_number"] = None
        elif not cls._is_valid_batch_number(batch):
            reasons.append(f"Batch number '{batch}' has invalid structure or noise")
            uncertain["batch_number"] = batch
        elif conf < threshold:
            reasons.append(f"Batch number confidence ({conf:.1f}%) is below threshold ({threshold}%)")
            uncertain["batch_number"] = batch
        else:
            trusted["batch_number"] = batch

    @classmethod
    def _validate_ocr_dates(
        cls,
        exp_raw: Optional[str],
        exp_conf: float,
        mfg_raw: Optional[str],
        mfg_conf: float,
        date_threshold: float,
        reasons: List[str],
        trusted: Dict[str, Any],
        uncertain: Dict[str, Any],
        normalized: Dict[str, Any],
    ) -> None:
        """Parse expiry and manufacturing dates, ensuring chronological order (mfg <= exp)."""
        parsed_exp_dt, norm_exp_str = cls._parse_and_normalize_date(exp_raw)

        # Expiry date evaluation
        if not exp_raw:
            reasons.append("Expiry date could not be identified by OCR")
            uncertain["expiry_date"] = None
        elif not parsed_exp_dt:
            reasons.append(f"Expiry date '{exp_raw}' is unparseable or has invalid date format")
            uncertain["expiry_date"] = exp_raw
        elif exp_conf < date_threshold:
            reasons.append(f"Expiry date confidence ({exp_conf:.1f}%) is below threshold ({date_threshold}%)")
            uncertain["expiry_date"] = norm_exp_str
            normalized["expiry_date"] = norm_exp_str
        else:
            normalized["expiry_date"] = norm_exp_str
            trusted["expiry_date"] = norm_exp_str

        # Manufacturing date evaluation
        parsed_mfg_dt, norm_mfg_str = cls._parse_and_normalize_date(mfg_raw)
        if mfg_raw:
            if parsed_mfg_dt:
                normalized["manufacturing_date"] = norm_mfg_str
                if mfg_conf >= date_threshold:
                    trusted["manufacturing_date"] = norm_mfg_str
                else:
                    uncertain["manufacturing_date"] = norm_mfg_str

                # Timeline sanity: manufacturing date must precede or equal expiry date
                if parsed_exp_dt and parsed_mfg_dt > parsed_exp_dt:
                    reasons.append(f"Manufacturing date ({norm_mfg_str}) is after expiry date ({norm_exp_str})")
                    uncertain["manufacturing_date"] = norm_mfg_str
                    uncertain["expiry_date"] = norm_exp_str
                    trusted.pop("expiry_date", None)
                    trusted.pop("manufacturing_date", None)
            else:
                reasons.append(f"Manufacturing date '{mfg_raw}' is unparseable")
                uncertain["manufacturing_date"] = mfg_raw
        else:
            uncertain["manufacturing_date"] = None

    @staticmethod
    def _validate_ocr_quantity(
        qty: Any,
        trusted: Dict[str, Any],
        uncertain: Dict[str, Any],
        normalized: Dict[str, Any],
    ) -> None:
        """Validate package count (tablets/capsules per strip) within realistic pharmaceutical bounds."""
        if qty is not None:
            try:
                qty_int = int(qty)
                if 1 <= qty_int <= 500:
                    normalized["quantity"] = qty_int
                    trusted["quantity"] = qty_int
                else:
                    uncertain["quantity"] = qty
                    normalized["quantity"] = None
            except (ValueError, TypeError):
                uncertain["quantity"] = qty
                normalized["quantity"] = None
        else:
            normalized["quantity"] = None

    # -------------------------------------------------------------------------
    # Gate 2: Gemma Vision Anti-Hallucination Gate
    # -------------------------------------------------------------------------

    @classmethod
    def validate_gemma_output(
        cls,
        raw_ai_data: Dict[str, Any],
        uncertain_fields: Dict[str, Any],
    ) -> Tuple[Dict[str, Any], List[str]]:
        """
        Anti-hallucination filter for vision AI outputs.
        
        Validates AI fields before merging:
        - Drops placeholder values ('null', 'unknown', 'N/A', 'unreadable')
        - Verifies brand name readability
        - Validates dosage strength units
        - Validates batch alphanumeric structure
        - Enforces calendar month 1-12 and year 2020-2060
        - Enforces manufacturing date <= expiry date
        - Validates strip piece count (1-500) and unit pricing
        """
        sanitized: Dict[str, Any] = {}
        issues: List[str] = []

        # 1. Medicine Name
        sanitized["medicine_name"] = cls._validate_ai_medicine_name(raw_ai_data.get("medicine_name"), issues)

        # 2. Strength
        sanitized["strength"] = cls._validate_ai_strength(raw_ai_data.get("strength"), issues)

        # 3. Batch Number
        sanitized["batch_number"] = cls._validate_ai_batch(raw_ai_data.get("batch_number"), issues)

        # 4 & 5. Dates & Chronology
        exp_val, mfg_val = cls._validate_ai_dates(
            raw_ai_data.get("expiry_date"),
            raw_ai_data.get("manufacturing_date"),
            issues,
        )
        sanitized["expiry_date"] = exp_val
        sanitized["manufacturing_date"] = mfg_val

        # 6. Quantity / Pieces per strip
        qty_val = cls._validate_ai_quantity(raw_ai_data.get("pieces_per_strip") or raw_ai_data.get("quantity"))
        sanitized["pieces_per_strip"] = qty_val
        sanitized["quantity"] = qty_val

        # 7. Price per strip
        sanitized["price_per_strip"] = cls._validate_ai_price(raw_ai_data.get("price_per_strip"))

        # 8. Pass through descriptive text fields safely
        for k in ["generic_name", "brand", "manufacturer", "unit_of_measure"]:
            val = raw_ai_data.get(k)
            sanitized[k] = "" if cls._is_placeholder(val) else str(val).strip()

        return sanitized, issues

    # -------------------------------------------------------------------------
    # Gemma Validation Field Helpers
    # -------------------------------------------------------------------------

    @classmethod
    def _is_placeholder(cls, val: Any) -> bool:
        """Check if an AI-returned value is empty or a generic placeholder."""
        if val is None:
            return True
        s = str(val).strip().lower()
        return s in ["", "null", "none", "unknown", "n/a", "not visible", "unreadable", "nil"]

    @classmethod
    def _validate_ai_medicine_name(cls, raw_val: Any, issues: List[str]) -> Optional[str]:
        """Validate AI-extracted medicine name."""
        if cls._is_placeholder(raw_val):
            return None
        clean = str(raw_val).strip()
        if cls._is_readable_medicine_name(clean):
            return clean
        issues.append(f"AI returned unreadable medicine name '{clean}'; discarded as hallucination.")
        return None

    @classmethod
    def _validate_ai_strength(cls, raw_val: Any, issues: List[str]) -> Optional[str]:
        """Validate AI-extracted strength pattern."""
        if cls._is_placeholder(raw_val):
            return None
        clean = str(raw_val).strip()
        if cls._is_valid_strength(clean):
            return clean
        m = re.search(r"\b(\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml|l|%|iu)(?:\s*(?:w\/v|w\/w))?)\b", clean, re.I)
        if m:
            return m.group(1).strip()
        issues.append(f"AI returned invalid strength '{clean}'; discarded.")
        return None

    @classmethod
    def _validate_ai_batch(cls, raw_val: Any, issues: List[str]) -> Optional[str]:
        """Validate AI-extracted batch identifier."""
        if cls._is_placeholder(raw_val):
            return None
        clean = str(raw_val).strip()
        if cls._is_valid_batch_number(clean):
            return clean
        issues.append(f"AI returned invalid batch number '{clean}'; discarded.")
        return None

    @classmethod
    def _validate_ai_dates(
        cls,
        raw_exp: Any,
        raw_mfg: Any,
        issues: List[str],
    ) -> Tuple[Optional[str], Optional[str]]:
        """Validate AI-extracted expiry & manufacturing dates and chronology."""
        exp_dt, norm_exp = None, None
        if not cls._is_placeholder(raw_exp):
            clean_exp = str(raw_exp).strip()
            exp_dt, norm_exp = cls._parse_and_normalize_date(clean_exp)
            if not (exp_dt and norm_exp):
                issues.append(f"AI returned invalid or unparseable expiry date '{clean_exp}'; discarded.")
                norm_exp = None

        mfg_dt, norm_mfg = None, None
        if not cls._is_placeholder(raw_mfg):
            clean_mfg = str(raw_mfg).strip()
            mfg_dt, norm_mfg = cls._parse_and_normalize_date(clean_mfg)
            if not (mfg_dt and norm_mfg):
                issues.append(f"AI returned invalid manufacturing date '{clean_mfg}'; discarded.")
                norm_mfg = None

        # Chronology check: manufacturing date cannot be after expiry date
        if exp_dt and mfg_dt and mfg_dt > exp_dt:
            issues.append(
                f"AI manufacturing date ({norm_mfg}) is after expiry date ({norm_exp}); discarded invalid dates."
            )
            return None, None

        return norm_exp, norm_mfg

    @classmethod
    def _validate_ai_quantity(cls, raw_val: Any) -> Optional[int]:
        """Validate AI-extracted package quantity."""
        if cls._is_placeholder(raw_val):
            return None
        try:
            qty_val = int(raw_val)
            if 1 <= qty_val <= 500:
                return qty_val
        except (ValueError, TypeError):
            pass
        return None

    @classmethod
    def _validate_ai_price(cls, raw_val: Any) -> Optional[float]:
        """Validate AI-extracted pricing per strip."""
        if cls._is_placeholder(raw_val):
            return None
        try:
            p_val = float(raw_val)
            if 0.1 <= p_val <= 100000.0:
                return round(p_val, 2)
        except (ValueError, TypeError):
            pass
        return None

    # -------------------------------------------------------------------------
    # Shared Pharmaceutical Pattern Checkers
    # -------------------------------------------------------------------------

    @staticmethod
    def _is_readable_medicine_name(name: str) -> bool:
        """Verify that the string contains legitimate alphabetic characters and isn't random symbols."""
        if not name or len(name.strip()) < 3:
            return False
        clean = name.strip()
        letters_count = sum(1 for c in clean if c.isalpha())
        # At least 45% of characters must be letters
        if letters_count / max(len(clean), 1) < 0.45:
            return False
        return bool(re.search(r"[A-Za-z]", clean))

    @staticmethod
    def _is_valid_strength(strength: str) -> bool:
        """Validate dosage strength syntax (e.g. 500 mg, 625mg, 10 ml, 2% w/v)."""
        if not strength:
            return False
        pattern = r"^\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml|l|%|iu)(?:\s*(?:w\/v|w\/w))?$"
        return bool(re.match(pattern, strength.strip(), re.IGNORECASE))

    @staticmethod
    def _is_valid_batch_number(batch: str) -> bool:
        """Ensure batch number is 3-20 characters long and contains alphanumeric characters."""
        if not batch:
            return False
        clean = batch.strip()
        if len(clean) < 3 or len(clean) > 20:
            return False
        if not re.search(r"[A-Za-z0-9]", clean):
            return False
        if len(set(clean)) <= 1 and len(clean) > 2:
            return False
        return True

    @classmethod
    def _parse_and_normalize_date(cls, date_str: Optional[str]) -> Tuple[Optional[datetime], Optional[str]]:
        """
        Parse flexible pharmaceutical date formats into (datetime, 'MM/YYYY') standard.
        
        Supports:
        - MM/YYYY or MM/YY (e.g. '08/2027', '08/27')
        - Month name formats (e.g. 'AUG/2027', 'AUG 2027', 'AUG27')
        - DD/MM/YYYY or YYYY/MM/DD full dates
        """
        if not date_str:
            return None, None

        raw = date_str.strip().strip(":#-./ ")
        if not raw:
            return None, None

        raw_clean = re.sub(r"[\.\-\/]", "/", raw)
        parts = [p.strip() for p in raw_clean.split("/") if p.strip()]

        # Pattern 1: MM/YYYY or MM/YY
        if len(parts) == 2:
            p1, p2 = parts[0], parts[1]
            month = None
            year = None

            if p1.lower() in MONTH_MAP:
                month = MONTH_MAP[p1.lower()]
            elif p1.isdigit():
                month = int(p1)

            if p2.lower() in MONTH_MAP and not month:
                month = MONTH_MAP[p2.lower()]
                if p1.isdigit():
                    year = int(p1)
            elif p2.isdigit():
                year = int(p2)

            if year is not None:
                if year < 100:
                    year += 2000
                if month and 1 <= month <= 12 and 2000 <= year <= 2060:
                    try:
                        return datetime(year, month, 1), f"{month:02d}/{year}"
                    except Exception:
                        pass

        # Pattern 2: DD/MM/YYYY or YYYY/MM/DD
        if len(parts) == 3 and all(p.isdigit() for p in parts):
            p1, p2, p3 = int(parts[0]), int(parts[1]), int(parts[2])
            # Format: YYYY/MM/DD
            if p1 > 1000 and 1 <= p2 <= 12 and 1 <= p3 <= 31:
                try:
                    return datetime(p1, p2, p3), f"{p2:02d}/{p1}"
                except Exception:
                    pass
            # Format: DD/MM/YYYY or MM/DD/YYYY
            year = p3 if p3 > 1000 else p3 + 2000
            if 2000 <= year <= 2060:
                month = p2 if 1 <= p2 <= 12 else (p1 if 1 <= p1 <= 12 else None)
                if month:
                    try:
                        return datetime(year, month, 1), f"{month:02d}/{year}"
                    except Exception:
                        pass

        # Pattern 3: Mon Year (e.g. "AUG 2027" or "AUG27")
        mon_match = re.search(r"([A-Za-z]{3})[\s\.\-\/]*(\d{2,4})", raw)
        if mon_match:
            mon_name = mon_match.group(1).lower()
            yr_val = int(mon_match.group(2))
            if yr_val < 100:
                yr_val += 2000
            if mon_name in MONTH_MAP and 2000 <= yr_val <= 2060:
                month = MONTH_MAP[mon_name]
                return datetime(yr_val, month, 1), f"{month:02d}/{yr_val}"

        return None, raw
