from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Create an admin user with OTP-based authentication'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='Admin email address')
        parser.add_argument('--first-name', type=str, help='Admin first name')
        parser.add_argument('--last-name', type=str, help='Admin last name')

    def handle(self, *args, **options):
        email = options['email']
        first_name = options.get('first_name', '')
        last_name = options.get('last_name', '')

        try:
            # Check if user already exists
            if User.objects.filter(email=email).exists():
                self.stdout.write(
                    self.style.WARNING(f'User with email {email} already exists')
                )
                return

            # Create admin user
            user = User.objects.create_user(
                email=email,
                first_name=first_name,
                last_name=last_name,
                role=User.ADMIN,
                is_staff=True,
                is_superuser=True,
                is_verified=True
            )

            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully created admin user: {email}\n'
                    f'User can now request OTP codes to login via the API.'
                )
            )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error creating admin user: {str(e)}')
            )