"""
Development convenience command for quick admin login
"""
import webbrowser
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.conf import settings
from django.contrib.sessions.models import Session
from django.contrib.auth import login
import secrets


class Command(BaseCommand):
    help = 'Quick admin login for development - opens browser with auto-login'

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            type=str,
            help='Username to login as (default: first superuser)',
        )
        parser.add_argument(
            '--no-browser',
            action='store_true',
            help='Don\'t open browser automatically',
        )

    def handle(self, *args, **options):
        if not settings.DEBUG:
            self.stdout.write(
                self.style.ERROR('This command only works in DEBUG mode for security!')
            )
            return

        User = get_user_model()

        # Get user to login as
        if options['username']:
            try:
                user = User.objects.get(username=options['username'])
            except User.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'User "{options["username"]}" not found!')
                )
                return
        else:
            # Get first superuser
            user = User.objects.filter(is_superuser=True).first()
            if not user:
                self.stdout.write(
                    self.style.ERROR('No superuser found! Create one first with: python manage.py createsuperuser')
                )
                return

        # Create a development login token
        token = secrets.token_urlsafe(32)

        # Store token in cache or session (simplified for development)
        from django.core.cache import cache
        cache.set(f'dev_login_{token}', user.pk, timeout=300)  # 5 minutes

        # Generate admin URL with token
        admin_url = f'http://127.0.0.1:8000/admin/?dev_login={token}'

        self.stdout.write(
            self.style.SUCCESS(f'✅ Development login created for: {user.username}')
        )
        self.stdout.write(f'🔗 Admin URL: {admin_url}')
        self.stdout.write(f'⏰ Valid for 5 minutes')

        if not options['no_browser']:
            try:
                webbrowser.open(admin_url)
                self.stdout.write(
                    self.style.SUCCESS('🌐 Opening browser...')
                )
            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(f'Could not open browser: {e}')
                )
                self.stdout.write('Copy the URL above and paste it in your browser')

        # Instructions
        self.stdout.write('\n' + '='*50)
        self.stdout.write('DEVELOPMENT SHORTCUTS:')
        self.stdout.write('='*50)
        self.stdout.write('• Quick admin: python manage.py dev_login')
        self.stdout.write('• Specific user: python manage.py dev_login --username admin')
        self.stdout.write('• No browser: python manage.py dev_login --no-browser')
        self.stdout.write('='*50)
