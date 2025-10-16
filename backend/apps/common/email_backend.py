"""
Custom SendGrid email backend for Django.
Uses the SendGrid Python SDK directly without django-sendgrid-v5 dependency.
"""
import logging
from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content

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
            from_email = Email(email_message.from_email)
            to_emails = [To(email) for email in email_message.recipients()]
            subject = email_message.subject

            # Use HTML content if available, otherwise use plain text
            if hasattr(email_message, 'alternatives') and email_message.alternatives:
                # HTML content from alternatives
                html_content = None
                for content, mimetype in email_message.alternatives:
                    if mimetype == 'text/html':
                        html_content = content
                        break

                if html_content:
                    content = Content("text/html", html_content)
                else:
                    content = Content("text/plain", email_message.body)
            else:
                # Plain text only
                content = Content("text/plain", email_message.body)

            # Create the mail object
            mail = Mail(
                from_email=from_email,
                to_emails=to_emails[0] if len(to_emails) == 1 else to_emails,
                subject=subject,
                html_content=content if content.type == "text/html" else None,
                plain_text_content=email_message.body if content.type == "text/html" else content
            )

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
