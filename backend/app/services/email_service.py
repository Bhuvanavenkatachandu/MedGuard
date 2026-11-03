"""Backward-compatibility bridge for email service."""
from backend.shared.email.email_service import send_invoice_email_task
__all__ = ["send_invoice_email_task"]
