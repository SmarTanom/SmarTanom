"""
Django management command to test email configuration.

Usage:
    python manage.py sendtestemail your_email@example.com
    python manage.py sendtestemail your_email@example.com --code 123456
"""

from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from apps.accounts.views import send_otp_email
import random


class Command(BaseCommand):
    help = 'Send a test OTP email to verify SMTP configuration'

    def add_arguments(self, parser):
        parser.add_argument(
            'email',
            type=str,
            help='Email address to send the test email to'
        )
        parser.add_argument(
            '--code',
            type=str,
            default=None,
            help='Optional: specific OTP code to send (default: random 6 digits)'
        )
        parser.add_argument(
            '--purpose',
            type=str,
            default='login',
            choices=['login', 'register', 'reset'],
            help='Email purpose type (affects subject line)'
        )

    def handle(self, *args, **options):
        email = options['email']
        code = options['code'] or str(random.randint(100000, 999999))
        purpose = options['purpose']

        # Display configuration info
        self.stdout.write(self.style.MIGRATE_HEADING('Email Configuration Test'))
        self.stdout.write('-' * 60)
        self.stdout.write(f'Backend: {settings.EMAIL_BACKEND}')
        self.stdout.write(f'Host: {settings.EMAIL_HOST}')
        self.stdout.write(f'Port: {settings.EMAIL_PORT}')
        self.stdout.write(f'Use TLS: {getattr(settings, "EMAIL_USE_TLS", False)}')
        self.stdout.write(f'Use SSL: {getattr(settings, "EMAIL_USE_SSL", False)}')
        self.stdout.write(f'From: {settings.DEFAULT_FROM_EMAIL}')
        self.stdout.write('-' * 60)
        self.stdout.write('')

        # Attempt to send
        self.stdout.write(f'Sending test email to: {email}')
        self.stdout.write(f'OTP Code: {code}')
        self.stdout.write(f'Purpose: {purpose}')
        self.stdout.write('')

        try:
            success = send_otp_email(email, code, purpose)
            
            if success:
                self.stdout.write(
                    self.style.SUCCESS(f'\n✓ Test email sent successfully!')
                )
                self.stdout.write('')
                self.stdout.write('Next steps:')
                self.stdout.write('  1. Check the inbox (and spam folder) of ' + email)
                self.stdout.write('  2. Verify the email was received with code: ' + code)
                self.stdout.write('  3. If not received, check your SMTP credentials and firewall settings')
                self.stdout.write('')
            else:
                self.stdout.write(
                    self.style.ERROR('\n✗ Failed to send test email.')
                )
                self.stdout.write('')
                self.stdout.write('Troubleshooting:')
                self.stdout.write('  1. Verify EMAIL_HOST_USER and EMAIL_HOST_PASSWORD in .env')
                self.stdout.write('  2. For Gmail: use an App Password (not your account password)')
                self.stdout.write('  3. Check that EMAIL_PORT matches your provider (587 for TLS, 465 for SSL)')
                self.stdout.write('  4. Ensure your firewall allows outbound SMTP connections')
                self.stdout.write('  5. Check Django logs for detailed error messages')
                self.stdout.write('')
                
        except Exception as e:
            raise CommandError(f'Error sending test email: {str(e)}')
