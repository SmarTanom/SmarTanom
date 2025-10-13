"""
Management command to generate VAPID keys for Web Push notifications.

Usage:
    python manage.py generate_vapid_keys

This will generate a new pair of VAPID public/private keys and display them.
Add these to your environment variables or settings.py
"""

from django.core.management.base import BaseCommand
from pywebpush import webpush
import base64
import os


class Command(BaseCommand):
    help = 'Generate VAPID keys for Web Push notifications'

    def handle(self, *args, **kwargs):
        try:
            from cryptography.hazmat.primitives.asymmetric import ec
            from cryptography.hazmat.primitives import serialization
            from cryptography.hazmat.backends import default_backend
        except ImportError:
            self.stdout.write(self.style.ERROR(
                'cryptography library not found. Install with: pip install cryptography'
            ))
            return

        self.stdout.write(self.style.WARNING('Generating VAPID keys...'))
        self.stdout.write('')

        # Generate a new private key
        private_key = ec.generate_private_key(ec.SECP256R1(), default_backend())

        # Get private key bytes
        private_key_bytes = private_key.private_numbers().private_value.to_bytes(32, 'big')

        # Get public key bytes (uncompressed format)
        public_key_point = private_key.public_key().public_numbers()
        public_key_bytes = b'\x04' + \
            public_key_point.x.to_bytes(32, 'big') + \
            public_key_point.y.to_bytes(32, 'big')

        # Base64 URL-safe encode
        private_key_b64 = base64.urlsafe_b64encode(private_key_bytes).decode('utf-8').rstrip('=')
        public_key_b64 = base64.urlsafe_b64encode(public_key_bytes).decode('utf-8').rstrip('=')

        self.stdout.write(self.style.SUCCESS('✅ VAPID keys generated successfully!'))
        self.stdout.write('')
        self.stdout.write(self.style.WARNING('Add these to your environment variables (.env file):'))
        self.stdout.write('')
        self.stdout.write('# Web Push VAPID Keys')
        self.stdout.write(f'VAPID_PUBLIC_KEY={public_key_b64}')
        self.stdout.write(f'VAPID_PRIVATE_KEY={private_key_b64}')
        self.stdout.write('VAPID_ADMIN_EMAIL=admin@smartanom.com  # Change to your email')
        self.stdout.write('')
        self.stdout.write(self.style.WARNING('Or add to settings.py:'))
        self.stdout.write('')
        self.stdout.write("VAPID_PUBLIC_KEY = os.getenv('VAPID_PUBLIC_KEY', '')")
        self.stdout.write("VAPID_PRIVATE_KEY = os.getenv('VAPID_PRIVATE_KEY', '')")
        self.stdout.write("VAPID_ADMIN_EMAIL = os.getenv('VAPID_ADMIN_EMAIL', 'admin@smartanom.com')")
        self.stdout.write("VAPID_CLAIMS = {'sub': f'mailto:{VAPID_ADMIN_EMAIL}'}")
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('⚠️  Keep your VAPID_PRIVATE_KEY secret! Do not commit it to version control.'))
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('📱 Next steps:'))
        self.stdout.write('1. Add the environment variables to your .env file')
        self.stdout.write('2. Restart your Django server')
        self.stdout.write('3. Update your frontend with the VAPID_PUBLIC_KEY')
        self.stdout.write('')
