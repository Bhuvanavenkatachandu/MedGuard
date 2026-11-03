"""MedGuard AI - Backward-Compatible Auth Dependencies Bridge.

Re-exports auth and security dependencies from backend.shared.auth.dependencies.
"""

from backend.shared.auth.dependencies import (
    pwd_context,
    oauth2_scheme,
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    get_current_user,
    get_current_pharmacy,
    get_optional_current_user,
)

__all__ = [
    "pwd_context",
    "oauth2_scheme",
    "hash_password",
    "verify_password",
    "create_access_token",
    "decode_access_token",
    "get_current_user",
    "get_current_pharmacy",
    "get_optional_current_user",
]
