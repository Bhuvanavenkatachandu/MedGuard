"""MedGuard AI - Backward-Compatible Configuration Bridge.

Re-exports Settings and settings from backend.shared.config.
"""

from backend.shared.config import Settings, settings

__all__ = ["Settings", "settings"]
