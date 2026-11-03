import re
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple

CONFIDENCE_THRESHOLD = 80.0
CRITICAL_FIELDS = ["medicine_name", "batch_number", "expiry_date"]

MONTH_MAP = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}

class ValidationResult:
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
        return {
            "status": self.status,
            "reasons": self.reasons,
            "trusted_fields": self.trusted_fields,
            "uncertain_fields": self.uncertain_fields,
            "normalized_data": self.normalized_data,
            "overall_confidence": self.overall_confidence,
        }

class ValidationService:
    @classmethod
    def validate_ocr_output(
        cls,
        extracted_fields: Dict[str, Any],
        field_confidences: Dict[str, float],
        diagnostics: Optional[Dict[str, Any]] = None,
        overall_confidence: float = 0.0,
    ) -> ValidationResult:
        """
        Validates OCR extraction across:
        - Required medicine fields
        - Field confidence scores vs threshold (80.0%)
        - Date syntax and chronological validity (mfg <= exp)
        - Batch number structure
        - Medicine name readability
        - Strength syntax
        - Image diagnostics (blur, contrast)
        """
        reasons: List[str] = []
        trusted_fields: Dict[str, Any] = {}
        uncertain_fields: Dict[str, Any] = {}
        normalized = dict(extracted_fields)

        diagnostics = diagnostics or {}
        if diagnostics.get("is_blurry"):
            reasons.append("Image is blurry or low contrast, reducing OCR reliability")

        # 1. Medicine Name Validation
        med_name = extracted_fields.get("medicine_name")
        med_conf = field_confidences.get("medicine_name", 0.0)
        if not med_name:
            reasons.append("Medicine name could not be identified by OCR")
            uncertain_fields["medicine_name"] = None
        elif not cls._is_readable_medicine_name(med_name):
            reasons.append(f"Medicine name '{med_name}' appears garbled or unreadable")
            uncertain_fields["medicine_name"] = med_name
        elif med_conf < CONFIDENCE_THRESHOLD:
            reasons.append(f"Medicine name confidence ({med_conf:.1f}%) is below threshold ({CONFIDENCE_THRESHOLD}%)")
            uncertain_fields["medicine_name"] = med_name
        else:
            trusted_fields["medicine_name"] = med_name

        # 2. Strength Validation
        strength = extracted_fields.get("strength")
        str_conf = field_confidences.get("strength", 0.0)
        if strength:
            if cls._is_valid_strength(strength):
                if str_conf >= CONFIDENCE_THRESHOLD:
                    trusted_fields["strength"] = strength
                else:
                    reasons.append(f"Strength confidence ({str_conf:.1f}%) is below threshold ({CONFIDENCE_THRESHOLD}%)")
                    uncertain_fields["strength"] = strength
            else:
                reasons.append(f"Strength format '{strength}' is irregular or unverified")
                uncertain_fields["strength"] = strength
        else:
            # Check if strength was in medicine name (e.g. Paracetamol 500mg)
            if med_name:
                m_str = re.search(r"\b(\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml|l|%|iu))\b", med_name, re.I)
                if m_str:
                    normalized["strength"] = m_str.group(1)
                    trusted_fields["strength"] = m_str.group(1)
                else:
                    uncertain_fields["strength"] = None
            else:
                uncertain_fields["strength"] = None

        # 3. Batch Number Validation
        batch = extracted_fields.get("batch_number")
        batch_conf = field_confidences.get("batch_number", 0.0)
        if not batch:
            reasons.append("Batch number could not be identified by OCR")
            uncertain_fields["batch_number"] = None
        elif not cls._is_valid_batch_number(batch):
            reasons.append(f"Batch number '{batch}' has invalid structure or noise")
            uncertain_fields["batch_number"] = batch
        elif batch_conf < CONFIDENCE_THRESHOLD:
            reasons.append(f"Batch number confidence ({batch_conf:.1f}%) is below threshold ({CONFIDENCE_THRESHOLD}%)")
            uncertain_fields["batch_number"] = batch
        else:
            trusted_fields["batch_number"] = batch

        # 4. Expiry Date Validation
        exp_date_raw = extracted_fields.get("expiry_date")
        exp_conf = field_confidences.get("expiry_date", 0.0)
        parsed_exp_dt, norm_exp_str = cls._parse_and_normalize_date(exp_date_raw)

        if not exp_date_raw:
            reasons.append("Expiry date could not be identified by OCR")
            uncertain_fields["expiry_date"] = None
        elif not parsed_exp_dt:
            reasons.append(f"Expiry date '{exp_date_raw}' is unparseable or has invalid date format")
            uncertain_fields["expiry_date"] = exp_date_raw
        elif exp_conf < CONFIDENCE_THRESHOLD:
            reasons.append(f"Expiry date confidence ({exp_conf:.1f}%) is below threshold ({CONFIDENCE_THRESHOLD}%)")
            uncertain_fields["expiry_date"] = norm_exp_str
            normalized["expiry_date"] = norm_exp_str
        else:
            normalized["expiry_date"] = norm_exp_str
            trusted_fields["expiry_date"] = norm_exp_str

        # 5. Manufacturing Date Validation & Timeline consistency
        mfg_date_raw = extracted_fields.get("manufacturing_date")
        mfg_conf = field_confidences.get("manufacturing_date", 0.0)
        parsed_mfg_dt, norm_mfg_str = cls._parse_and_normalize_date(mfg_date_raw)

        if mfg_date_raw:
            if parsed_mfg_dt:
                normalized["manufacturing_date"] = norm_mfg_str
                if mfg_conf >= CONFIDENCE_THRESHOLD:
                    trusted_fields["manufacturing_date"] = norm_mfg_str
                else:
                    uncertain_fields["manufacturing_date"] = norm_mfg_str
                # Check consistency: mfg <= exp
                if parsed_exp_dt and parsed_mfg_dt > parsed_exp_dt:
                    reasons.append(f"Manufacturing date ({norm_mfg_str}) is after expiry date ({norm_exp_str})")
                    uncertain_fields["manufacturing_date"] = norm_mfg_str
                    uncertain_fields["expiry_date"] = norm_exp_str
                    trusted_fields.pop("expiry_date", None)
                    trusted_fields.pop("manufacturing_date", None)
            else:
                reasons.append(f"Manufacturing date '{mfg_date_raw}' is unparseable")
                uncertain_fields["manufacturing_date"] = mfg_date_raw
        else:
            uncertain_fields["manufacturing_date"] = None

        # 6. Quantity Validation
        qty = extracted_fields.get("quantity", 10)
        try:
            qty_int = int(qty)
            if 1 <= qty_int <= 500:
                normalized["quantity"] = qty_int
                trusted_fields["quantity"] = qty_int
            else:
                normalized["quantity"] = 10
                uncertain_fields["quantity"] = qty
        except (ValueError, TypeError):
            normalized["quantity"] = 10
            uncertain_fields["quantity"] = qty

        # 7. Final Decision Gate: Trusted vs Uncertain
        # Must have all critical fields trusted and zero blocking diagnostic reasons
        has_all_critical = all(field in trusted_fields for field in CRITICAL_FIELDS)
        is_trusted = has_all_critical and len(reasons) == 0

        status = "trusted" if is_trusted else "uncertain"

        # Calculate weighted confidence
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

    @staticmethod
    def _is_readable_medicine_name(name: str) -> bool:
        if not name or len(name.strip()) < 3:
            return False
        clean = name.strip()
        # Must contain at least 50% letters
        letters_count = sum(1 for c in clean if c.isalpha())
        if letters_count / max(len(clean), 1) < 0.45:
            return False
        # Cannot be purely numeric or symbols
        if not re.search(r"[A-Za-z]", clean):
            return False
        return True

    @staticmethod
    def _is_valid_strength(strength: str) -> bool:
        if not strength:
            return False
        # Matches formats like 500 mg, 625mg, 10 ml, 2% w/v, 500mcg
        pattern = r"^\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml|l|%|iu)(?:\s*(?:w\/v|w\/w))?$"
        return bool(re.match(pattern, strength.strip(), re.IGNORECASE))

    @staticmethod
    def _is_valid_batch_number(batch: str) -> bool:
        if not batch:
            return False
        clean = batch.strip()
        # Batch numbers are generally 3 to 18 alphanumeric characters with optional hyphens/slashes
        if len(clean) < 3 or len(clean) > 20:
            return False
        # Must have at least one digit or uppercase letter
        if not re.search(r"[A-Za-z0-9]", clean):
            return False
        # Must not be only punctuation or repeated single symbols
        if len(set(clean)) <= 1 and len(clean) > 2:
            return False
        return True

    @classmethod
    def _parse_and_normalize_date(cls, date_str: Optional[str]) -> Tuple[Optional[datetime], Optional[str]]:
        if not date_str:
            return None, None

        raw = date_str.strip().strip(":#-./ ")
        if not raw:
            return None, None

        # Clean multiple spaces and delimiters
        raw_clean = re.sub(r"[\.\-\/]", "/", raw)
        parts = [p.strip() for p in raw_clean.split("/") if p.strip()]

        dt = None
        norm_str = None

        # Pattern 1: MM/YYYY or MM/YY (e.g. 08/2027, 8/27)
        if len(parts) == 2:
            p1, p2 = parts[0], parts[1]
            month = None
            year = None

            # Check if p1 is month name (e.g. AUG/2027)
            if p1.lower() in MONTH_MAP:
                month = MONTH_MAP[p1.lower()]
            elif p1.isdigit():
                month = int(p1)

            # Check if p2 is month name (e.g. 2027/AUG)
            if p2.lower() in MONTH_MAP and not month:
                month = MONTH_MAP[p2.lower()]
                if p1.isdigit():
                    year = int(p1)
            elif p2.isdigit():
                year = int(p2)

            # Handle 2-digit years
            if year is not None:
                if year < 100:
                    year += 2000
                if month and 1 <= month <= 12 and 2000 <= year <= 2060:
                    try:
                        dt = datetime(year, month, 1)
                        norm_str = f"{month:02d}/{year}"
                        return dt, norm_str
                    except Exception:
                        pass

        # Pattern 2: DD/MM/YYYY (e.g. 15/08/2027)
        if len(parts) == 3 and all(p.isdigit() for p in parts):
            p1, p2, p3 = int(parts[0]), int(parts[1]), int(parts[2])
            # Check if YYYY/MM/DD
            if p1 > 1000 and 1 <= p2 <= 12 and 1 <= p3 <= 31:
                try:
                    dt = datetime(p1, p2, p3)
                    norm_str = f"{p2:02d}/{p1}"
                    return dt, norm_str
                except Exception:
                    pass
            # DD/MM/YYYY or MM/DD/YYYY
            year = p3 if p3 > 1000 else p3 + 2000
            if 2000 <= year <= 2060:
                month = p2 if 1 <= p2 <= 12 else (p1 if 1 <= p1 <= 12 else None)
                if month:
                    try:
                        dt = datetime(year, month, 1)
                        norm_str = f"{month:02d}/{year}"
                        return dt, norm_str
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
                dt = datetime(yr_val, month, 1)
                norm_str = f"{month:02d}/{yr_val}"
                return dt, norm_str

        return None, raw
