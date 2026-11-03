"""MedGuard AI - Image Quality Assessment Service.

Evaluates uploaded medicine packaging images for blur, resolution, brightness,
and contrast before performing OCR or AI vision inference.
"""

from typing import Any, Dict, List
from PIL import Image, ImageFilter, ImageStat


class ImageQualityChecker:
    """Pre-scan image quality evaluation to reject unreadable photos."""

    MIN_DIMENSION: int = 140
    MIN_BRIGHTNESS: float = 18.0
    MAX_BRIGHTNESS: float = 248.0
    MIN_CONTRAST: float = 8.0
    MIN_EDGE_SHARPNESS: float = 3.5

    @classmethod
    def evaluate(cls, image: Image.Image) -> Dict[str, Any]:
        """
        Evaluate image clarity, exposure, and resolution.

        Returns:
            Dict containing:
                - is_acceptable: bool
                - status: 'PASS' | 'LOW_IMAGE_QUALITY'
                - issues: List[str]
                - metrics: Dict[str, float]
        """
        width, height = image.size
        issues: List[str] = []

        # 1. Resolution / Dimension check
        if width < cls.MIN_DIMENSION or height < cls.MIN_DIMENSION:
            issues.append(
                f"Image resolution is too low ({width}x{height}px). Minimum {cls.MIN_DIMENSION}x{cls.MIN_DIMENSION}px required."
            )

        # 2. Brightness & Contrast analysis (Grayscale)
        gray = image.convert("L")
        stat = ImageStat.Stat(gray)
        mean_brightness = stat.mean[0]
        std_contrast = stat.stddev[0]

        if mean_brightness < cls.MIN_BRIGHTNESS:
            issues.append("Image is too dark to clearly read medicine details.")
        elif mean_brightness > cls.MAX_BRIGHTNESS and std_contrast < 15.0:
            issues.append("Image is severely overexposed or washed out.")

        if std_contrast < cls.MIN_CONTRAST:
            issues.append("Image has extremely low contrast between text and background.")

        # 3. Blur detection via high-frequency edge response (FIND_EDGES filter)
        edge_image = gray.filter(ImageFilter.FIND_EDGES)
        edge_stat = ImageStat.Stat(edge_image)
        edge_sharpness = edge_stat.mean[0]

        # Only evaluate blur if image has reasonable dimensions
        if width >= cls.MIN_DIMENSION and height >= cls.MIN_DIMENSION:
            if edge_sharpness < cls.MIN_EDGE_SHARPNESS:
                issues.append("Image is severely blurred or out of focus.")

        is_acceptable = len(issues) == 0

        return {
            "is_acceptable": is_acceptable,
            "status": "PASS" if is_acceptable else "LOW_IMAGE_QUALITY",
            "message": "Image quality is acceptable." if is_acceptable else "Please upload a clearer medicine image.",
            "issues": issues,
            "metrics": {
                "width": width,
                "height": height,
                "brightness": round(mean_brightness, 1),
                "contrast": round(std_contrast, 1),
                "edge_sharpness": round(edge_sharpness, 1),
            },
        }
