"""
Custom SendGrid email backend for Django.
Uses the SendGrid Python SDK directly without django-sendgrid-v5 dependency.
"""
import logging
from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

logger = logging.getLogger(__name__)


class SendGridBackend(BaseEmailBackend):
    """
    A Django email backend that uses SendGrid API directly.
    """

    def __init__(self, fail_silently=False, **kwargs):
        super().__init__(fail_silently=fail_silently, **kwargs)
        self.api_key = getattr(settings, 'SENDGRID_API_KEY', None)

        if not self.api_key:
            if not fail_silently:
                raise ValueError("SENDGRID_API_KEY must be set in Django settings")
            logger.warning("SENDGRID_API_KEY not set, emails will not be sent")

        self.client = SendGridAPIClient(self.api_key) if self.api_key else None

    def send_messages(self, email_messages):
        """
        Send one or more EmailMessage objects and return the number of email
        messages sent.
        """
        if not self.client:
            if not self.fail_silently:
                raise ValueError("SendGrid client not initialized")
            return 0

        num_sent = 0
        for message in email_messages:
            sent = self._send(message)
            if sent:
                num_sent += 1
        return num_sent

    def _send(self, email_message):
        """Send a single email message."""
        if not email_message.recipients():
            return False

        try:
            subject = email_message.subject or ""
            from_email = email_message.from_email or getattr(settings, 'DEFAULT_FROM_EMAIL', None)
            to_emails = email_message.recipients()

            # Determine plain text and HTML content
            plain_text_content = email_message.body or ""
            html_content = None

            if hasattr(email_message, 'alternatives') and email_message.alternatives:
                for alt_content, mimetype in email_message.alternatives:
                    if mimetype == 'text/html' and alt_content:
                        html_content = alt_content
                        break

            # Build the Mail object using raw strings (not Content objects)
            mail = Mail(
                from_email=from_email,
                to_emails=to_emails,
                subject=subject,
                plain_text_content=plain_text_content if plain_text_content else None,
                html_content=html_content,
            )

            # Propagate reply-to if provided
            if getattr(email_message, 'reply_to', None):
                # SendGrid Mail supports a single reply_to string or object
                mail.reply_to = email_message.reply_to[0] if len(email_message.reply_to) == 1 else email_message.reply_to[0]

            # Send the email
            response = self.client.send(mail)

            if response.status_code >= 200 and response.status_code < 300:
                logger.info(f"Email sent successfully to {email_message.recipients()}")
                return True
            else:
                logger.error(f"SendGrid API returned status {response.status_code}: {response.body}")
                if not self.fail_silently:
                    raise Exception(f"SendGrid error: {response.body}")
                return False

        except Exception as e:
            logger.error(f"Failed to send email via SendGrid: {str(e)}")
            if not self.fail_silently:
                raise
            return False
