import os
import json
from django.test import Client
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartanom.settings')
django.setup()

client = Client()
EMAIL = 'smartanom01@gmail.com'

print('Requesting OTP for', EMAIL)
resp = client.post('/api/auth/request-otp/', data=json.dumps({'email': EMAIL, 'purpose': 'login'}), content_type='application/json')
print('Status:', resp.status_code)
print('Body:', resp.json())

if resp.status_code != 200:
    print('Failed to request OTP; aborting.')
    raise SystemExit(1)

from apps.accounts.models import OTPCode
otp = OTPCode.objects.filter(email=EMAIL, is_used=False).order_by('-created_at').first()
print('Retrieved OTP object:', otp)
if not otp:
    print('No OTP found in DB. Exiting.')
    raise SystemExit(1)

code = otp.code
print('Using OTP code:', code)
verify = client.post('/api/auth/verify-otp/', data=json.dumps({'email': EMAIL, 'code': code, 'purpose': 'login'}), content_type='application/json')
print('Verify Status:', verify.status_code)
try:
    print('Verify Body:', verify.json())
except Exception:
    print('Raw Verify Body:', verify.content)
