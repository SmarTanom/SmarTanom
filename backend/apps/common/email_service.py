"""Unified Email Service

Supports multiple transports selected via settings:
- 'brevo_api': Sends via Brevo (Sendinblue) HTTP API (avoids blocked SMTP ports)
- 'smtp': Sends via Django's EmailMultiAlternatives
- fallback: console backend via Django if configured
"""

from __future__ import annotations

import json
import logging
from typing import Optional, List

from django.conf import settings

logger = logging.getLogger(__name__)


def _send_via_brevo_api(to_emails: List[str], subject: str, text: str, html: Optional[str] = None) -> bool:
    """Send email using Brevo HTTP API (v3) to avoid SMTP port requirements.

    Requires settings.BREVO_API_KEY and DEFAULT_FROM_EMAIL.
    """
    api_key = getattr(settings, 'BREVO_API_KEY', '')
    if not api_key:
        logger.error("BREVO_API_KEY not configured; cannot use brevo_api transport")
        return False

    # Parse DEFAULT_FROM_EMAIL into name and email if possible
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@smartanom.com')
    from_name = None
    from_addr = from_email
    try:
        if '<' in from_email and '>' in from_email:
            name_part, addr_part = from_email.split('<', 1)
            from_name = name_part.strip().strip('"')
            from_addr = addr_part.strip('> ').strip()
    except Exception:
        pass

    # Build Brevo payload
    payload = {
        "sender": {"email": from_addr, **({"name": from_name} if from_name else {})},
        "to": [{"email": e} for e in to_emails],
        "subject": subject,
        "textContent": text or "",
    }
    if html:
        payload["htmlContent"] = html

    try:
        import requests
        resp = requests.post(
            "https://api.brevo.com/v3/smtp/email",
            headers={
                "api-key": api_key,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            data=json.dumps(payload),
            timeout=15,
        )
        if 200 <= resp.status_code < 300:
            logger.info("Brevo API email sent: to=%s subject=%s", to_emails, subject)
            return True
        else:
            logger.error("Brevo API error %s: %s", resp.status_code, resp.text[:500])
            return False
    except Exception as e:
        logger.exception("Brevo API request failed: %s", e)
        return False


def _send_via_smtp(to_emails: List[str], subject: str, text: str, html: Optional[str] = None) -> bool:
    from django.core.mail import EmailMultiAlternatives
    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text or "",
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', None),
            to=to_emails,
        )
        if html:
            msg.attach_alternative(html, "text/html")
        msg.send(fail_silently=False)
        logger.info("SMTP email sent: to=%s subject=%s", to_emails, subject)
        return True
    except Exception as e:
        logger.error("SMTP email send failed: %s", e)
        return False


def send_email(to: str | List[str], subject: str, text: str, html: Optional[str] = None) -> bool:
    """Send an email using configured transport.

    Args:
        to: recipient email or list of emails
        subject: subject
        text: plain text body
        html: optional HTML body
    Returns:
        bool: True on success
    """
    recipients = [to] if isinstance(to, str) else list(to)
    transport = getattr(settings, 'EMAIL_TRANSPORT', 'smtp')

    if transport == 'brevo_api':
        ok = _send_via_brevo_api(recipients, subject, text, html)
        if ok:
            return True
        # fall back to SMTP if API fails and SMTP is configured
        return _send_via_smtp(recipients, subject, text, html)

    # default SMTP path (or console backend if configured)
    return _send_via_smtp(recipients, subject, text, html)
