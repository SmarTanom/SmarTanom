from django.core.management.base import BaseCommand, CommandError
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone
from apps.common.email_service import send_email as _send_email

TEST_SUBJECT = "SmarTanom Email Transport Test"

HTML_TEMPLATE = "emails/otp_email.html"  # reuse OTP template for styling
TEXT_TEMPLATE = "emails/otp_email.txt"

class Command(BaseCommand):
    help = "Send a test email using current SMTP / email backend configuration"

    def add_arguments(self, parser):
        parser.add_argument("recipient", type=str, help="Email address to send the test message to")
        parser.add_argument(
            "--code",
            dest="code",
            default="123456",
            help="Optional fake OTP code to embed (default 123456)",
        )

    def handle(self, *args, **options):
        recipient = options["recipient"].strip()
        code = str(options["code"])[:6]

        context = {
            "code": code,
            "timestamp": timezone.now(),
            "brand": "SmarTanom",
        }

        try:
            text_body = render_to_string(TEXT_TEMPLATE, context)
        except Exception:
            # fallback plain text if template missing
            text_body = f"Test code: {code}\nSent at {timezone.now()}"

        html_body = None
        try:
            html_body = render_to_string(HTML_TEMPLATE, context)
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"HTML template render failed: {e}"))

        try:
            sent = _send_email(recipient, TEST_SUBJECT, text_body, html_body)
        except Exception as e:
            raise CommandError(f"Failed to send test email: {e}")

        if sent:
            self.stdout.write(self.style.SUCCESS(f"Test email dispatched to {recipient}"))
            transport = getattr(settings, 'EMAIL_TRANSPORT', 'smtp')
            if transport == 'brevo_api':
                self.stdout.write(f"Transport=brevo_api (BREVO_API_KEY configured: {'YES' if getattr(settings,'BREVO_API_KEY','') else 'NO'})")
            self.stdout.write(
                f"Backend={settings.EMAIL_BACKEND} Host={getattr(settings,'EMAIL_HOST', '')}:{getattr(settings,'EMAIL_PORT','')} TLS={'YES' if getattr(settings,'EMAIL_USE_TLS', False) else 'NO'}"
            )
        else:
            raise CommandError("Email backend returned 0 (not sent)")
