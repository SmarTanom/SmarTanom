"""
Deprecated: Legacy SendGrid backend placeholder.

This module previously defined a custom SendGrid backend. The project now uses
the built-in Django SMTP EmailBackend configured via Brevo SMTP credentials.
This file remains only to avoid import errors if any stale setting references
it; it does not send emails.
"""

from django.core.mail.backends.base import BaseEmailBackend


class SendGridBackend(BaseEmailBackend):
    def send_messages(self, email_messages):  # type: ignore[override]
        return 0
