"""MedGuard AI - Field-Level Decision Engine.

Decides whether OCR is sufficiently reliable for each field or whether
Gemma Vision should be invoked. Evaluates individual field confidences,
structural syntax validity, and image clarity.
"""

import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger("medguard.decision_engine")


class FieldDecision:
    """Decision container for an individual packaging field."""
    def __init__(
        self,
        field_name: str,
        source: str,  # 'OCR' or 'GEMMA'
        confidence: float,
        is_valid: bool,
        value: Optional[Any],
        reason: str,
    ):
        self.field_name = field_name
        self.source = source
        self.confidence = confidence
        self.is_valid = is_valid
        self.value = value
        self.reason = reason

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source": self.source,
            "confidence": round(self.confidence, 1),
            "is_valid": self.is_valid,
            "value": self.value,
            "reason": self.reason,
        }


class DecisionEngine:
    """Evaluates field-level candidates and routes each field to OCR or Gemma."""

    STRONG_THRESHOLD: float = 85.0
    UNCERTAIN_THRESHOLD: float = 70.0

    @classmethod
    def evaluate(
        cls,
        candidates: Dict[str, Any],
        overall_ocr_confidence: float,
        ocr_lines_count: int,
    ) -> Dict[str, Any]:
        """
        Evaluate candidate evidence for all fields and determine routing.

        Returns:
            Dict containing:
                - decisions: Dict[str, FieldDecision]
                - source_map: Dict[str, str] ('OCR' or 'GEMMA')
                - extracted_ocr_data: Dict[str, Any]
                - fields_for_gemma: List[str]
                - full_image_ai_required: bool
                - decision_logs: List[str]
        """
        decisions: Dict[str, FieldDecision] = {}
        decision_logs: List[str] = []

        # 1. Evaluate Medicine Name
        med_candidates = candidates.get("medicine_name_candidates", [])
        if med_candidates and med_candidates[0]["confidence"] >= cls.STRONG_THRESHOLD and med_candidates[0]["score"] >= 80.0:
            best_med = med_candidates[0]
            decisions["medicine_name"] = FieldDecision(
                field_name="medicine_name",
                source="OCR",
                confidence=best_med["confidence"],
                is_valid=True,
                value=best_med["value"],
                reason="High-confidence OCR candidate with strong pharmaceutical typography signals.",
            )
        elif med_candidates and med_candidates[0]["confidence"] >= cls.UNCERTAIN_THRESHOLD:
            best_med = med_candidates[0]
            decisions["medicine_name"] = FieldDecision(
                field_name="medicine_name",
                source="GEMMA",
                confidence=best_med["confidence"],
                is_valid=False,
                value=best_med["value"],
                reason=f"OCR medicine name candidate uncertain (confidence {best_med['confidence']}%), routed to Gemma.",
            )
        else:
            decisions["medicine_name"] = FieldDecision(
                field_name="medicine_name",
                source="GEMMA",
                confidence=0.0,
                is_valid=False,
                value=None,
                reason="No reliable OCR medicine name candidate found; routed to Gemma.",
            )

        # 2. Evaluate Strength
        str_candidates = candidates.get("strength_candidates", [])
        if str_candidates and str_candidates[0]["confidence"] >= cls.STRONG_THRESHOLD:
            best_str = str_candidates[0]
            decisions["strength"] = FieldDecision(
                field_name="strength",
                source="OCR",
                confidence=best_str["confidence"],
                is_valid=True,
                value=best_str["value"],
                reason="Valid pharmaceutical strength format with high OCR confidence.",
            )
        elif str_candidates and str_candidates[0]["confidence"] >= cls.UNCERTAIN_THRESHOLD:
            best_str = str_candidates[0]
            decisions["strength"] = FieldDecision(
                field_name="strength",
                source="OCR",
                confidence=best_str["confidence"],
                is_valid=True,
                value=best_str["value"],
                reason="Valid strength regex with acceptable OCR confidence.",
            )
        else:
            decisions["strength"] = FieldDecision(
                field_name="strength",
                source="GEMMA",
                confidence=0.0,
                is_valid=False,
                value=None,
                reason="No clear strength token found in OCR.",
            )

        # 3. Evaluate Batch Number
        batch_candidates = candidates.get("batch_candidates", [])
        if batch_candidates and batch_candidates[0]["confidence"] >= cls.STRONG_THRESHOLD:
            best_batch = batch_candidates[0]
            decisions["batch_number"] = FieldDecision(
                field_name="batch_number",
                source="OCR",
                confidence=best_batch["confidence"],
                is_valid=True,
                value=best_batch["value"],
                reason="High-confidence OCR batch number with valid alphanumeric syntax.",
            )
        elif batch_candidates and batch_candidates[0]["confidence"] >= cls.UNCERTAIN_THRESHOLD:
            best_batch = batch_candidates[0]
            decisions["batch_number"] = FieldDecision(
                field_name="batch_number",
                source="GEMMA",
                confidence=best_batch["confidence"],
                is_valid=False,
                value=best_batch["value"],
                reason=f"Batch number candidate confidence ({best_batch['confidence']}%) below strong threshold.",
            )
        else:
            decisions["batch_number"] = FieldDecision(
                field_name="batch_number",
                source="GEMMA",
                confidence=0.0,
                is_valid=False,
                value=None,
                reason="No valid OCR batch candidate detected.",
            )

        # 4. Evaluate Expiry Date
        exp_candidates = candidates.get("expiry_candidates", [])
        if exp_candidates and exp_candidates[0]["confidence"] >= cls.STRONG_THRESHOLD:
            best_exp = exp_candidates[0]
            decisions["expiry_date"] = FieldDecision(
                field_name="expiry_date",
                source="OCR",
                confidence=best_exp["confidence"],
                is_valid=True,
                value=best_exp["value"],
                reason="Valid MM/YYYY expiry date with strong OCR confidence.",
            )
        elif exp_candidates and exp_candidates[0]["confidence"] >= cls.UNCERTAIN_THRESHOLD:
            best_exp = exp_candidates[0]
            decisions["expiry_date"] = FieldDecision(
                field_name="expiry_date",
                source="GEMMA",
                confidence=best_exp["confidence"],
                is_valid=False,
                value=best_exp["value"],
                reason=f"Expiry date candidate confidence ({best_exp['confidence']}%) uncertain.",
            )
        else:
            decisions["expiry_date"] = FieldDecision(
                field_name="expiry_date",
                source="GEMMA",
                confidence=0.0,
                is_valid=False,
                value=None,
                reason="No readable expiry date found in OCR tokens.",
            )

        # 5. Evaluate Manufacturing Date
        mfg_candidates = candidates.get("mfg_candidates", [])
        if mfg_candidates and mfg_candidates[0]["confidence"] >= cls.STRONG_THRESHOLD:
            best_mfg = mfg_candidates[0]
            decisions["manufacturing_date"] = FieldDecision(
                field_name="manufacturing_date",
                source="OCR",
                confidence=best_mfg["confidence"],
                is_valid=True,
                value=best_mfg["value"],
                reason="Valid manufacturing date with high OCR confidence.",
            )
        elif mfg_candidates:
            best_mfg = mfg_candidates[0]
            decisions["manufacturing_date"] = FieldDecision(
                field_name="manufacturing_date",
                source="GEMMA",
                confidence=best_mfg["confidence"],
                is_valid=False,
                value=best_mfg["value"],
                reason="Manufacturing date uncertain in OCR.",
            )
        else:
            decisions["manufacturing_date"] = FieldDecision(
                field_name="manufacturing_date",
                source="GEMMA",
                confidence=0.0,
                is_valid=False,
                value=None,
                reason="No manufacturing date token detected in OCR.",
            )

        # 6. Evaluate Manufacturer
        mfr_candidates = candidates.get("manufacturer_candidates", [])
        if mfr_candidates and mfr_candidates[0]["confidence"] >= 75.0:
            best_mfr = mfr_candidates[0]
            decisions["manufacturer"] = FieldDecision(
                field_name="manufacturer",
                source="OCR",
                confidence=best_mfr["confidence"],
                is_valid=True,
                value=best_mfr["value"],
                reason="Manufacturer entity identified with sufficient confidence.",
            )
        else:
            val = mfr_candidates[0]["value"] if mfr_candidates else None
            decisions["manufacturer"] = FieldDecision(
                field_name="manufacturer",
                source="GEMMA",
                confidence=0.0,
                is_valid=False,
                value=val,
                reason="Manufacturer uncertain in OCR.",
            )

        # Build summary outputs
        source_map = {f: d.source for f, d in decisions.items()}
        extracted_ocr_data = {f: d.value for f, d in decisions.items() if d.source == "OCR"}
        fields_for_gemma = [f for f, d in decisions.items() if d.source == "GEMMA"]

        # Log decision trail
        for field, d in decisions.items():
            log_line = (
                f"{field}: OCR confidence = {d.confidence:.1f} | "
                f"Valid = {d.is_valid} | Decision = {d.source} | Rationale = {d.reason}"
            )
            decision_logs.append(log_line)
            logger.info("DecisionEngine: %s", log_line)

        # Determine if full image or targeted recovery is appropriate
        full_image_ai_required = (
            decisions["medicine_name"].source == "GEMMA"
            or len(fields_for_gemma) >= 3
            or overall_ocr_confidence < 65.0
            or ocr_lines_count < 3
        )

        return {
            "decisions": decisions,
            "source_map": source_map,
            "extracted_ocr_data": extracted_ocr_data,
            "fields_for_gemma": fields_for_gemma,
            "full_image_ai_required": full_image_ai_required,
            "decision_logs": decision_logs,
        }
