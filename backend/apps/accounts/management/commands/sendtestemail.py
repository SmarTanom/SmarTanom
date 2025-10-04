from django.core.management.base import BaseCommand, CommandError
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone

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

        message = EmailMultiAlternatives(
            subject=TEST_SUBJECT,
            body=text_body,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None) or settings.EMAIL_HOST_USER,
            to=[recipient],
        )
        if html_body:
            message.attach_alternative(html_body, "text/html")

        try:
            sent = message.send()
        except Exception as e:
            raise CommandError(f"Failed to send test email: {e}")

        if sent:
            self.stdout.write(self.style.SUCCESS(f"Test email dispatched to {recipient}"))
            self.stdout.write(
                f"Backend={settings.EMAIL_BACKEND} Host={getattr(settings,'EMAIL_HOST', '')}:{getattr(settings,'EMAIL_PORT','')} TLS={'YES' if getattr(settings,'EMAIL_USE_TLS', False) else 'NO'}"
            )
        else:
            raise CommandError("Email backend returned 0 (not sent)")
