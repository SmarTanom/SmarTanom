"""Management command for cleaning up expired OTP codes."""

from django.core.management.base import BaseCommand
from apps.users.models import OTPCode, LoginAttempt


class Command(BaseCommand):
    """Django command to clean up expired OTP codes and old login attempts."""

    help = 'Cleans up expired OTP codes and old login attempts'

    def add_arguments(self, parser):
        parser.add_argument(
            '--login-attempts',
            action='store_true',
            help='Also clean up old login attempts',
        )
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='Age in days for login attempts to be considered old (default: 30)',
        )

    def handle(self, *args, **options):
        # Clean up expired OTP codes
        expired_count = OTPCode.cleanup_expired()
        self.stdout.write(
            self.style.SUCCESS(f'Successfully cleaned up {expired_count} expired OTP codes')
        )

        # Optionally clean up old login attempts
        if options['login_attempts']:
            days = options['days']
            attempts_count = LoginAttempt.cleanup_old_attempts(days=days)
            self.stdout.write(
                self.style.SUCCESS(f'Successfully cleaned up {attempts_count} login attempts older than {days} days')
            )
