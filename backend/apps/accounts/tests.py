from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from apps.accounts.models import OTPCode


@override_settings(DEBUG=True)
class OTPResendCooldownTests(TestCase):
    def setUp(self):
        # Ensure clean slate
        OTPCode.objects.all().delete()
        self.url = reverse('accounts:request_otp')
        self.email = 'cooldown@test.com'
        self.purpose = OTPCode.PURPOSE_LOGIN

    @override_settings(OTP_RESEND_COOLDOWN_SECONDS=120)
    def test_request_otp_twice_within_cooldown_reuses_code_and_no_duplicate_send(self):
        # First request creates a new OTP
        resp1 = self.client.post(self.url, {'email': self.email, 'purpose': self.purpose}, content_type='application/json')
        self.assertEqual(resp1.status_code, 200)
        code1 = resp1.json().get('debug_code')
        self.assertIsNotNone(code1)

        # DB should have exactly one active OTP
        self.assertEqual(OTPCode.objects.filter(email=self.email, purpose=self.purpose).count(), 1)

        # Second request immediately should reuse existing OTP and not create a new one
        resp2 = self.client.post(self.url, {'email': self.email, 'purpose': self.purpose}, content_type='application/json')
        self.assertEqual(resp2.status_code, 200)
        code2 = resp2.json().get('debug_code')
        self.assertEqual(code1, code2)

        # Still only one OTP record for this email/purpose
        self.assertEqual(OTPCode.objects.filter(email=self.email, purpose=self.purpose).count(), 1)

    @override_settings(OTP_RESEND_COOLDOWN_SECONDS=1)
    def test_request_otp_after_cooldown_creates_new_and_invalidates_old(self):
        # Create an OTP via the endpoint
        resp1 = self.client.post(self.url, {'email': self.email, 'purpose': self.purpose}, content_type='application/json')
        self.assertEqual(resp1.status_code, 200)
        code1 = resp1.json().get('debug_code')
        self.assertIsNotNone(code1)

        # Manually age the OTP beyond cooldown
        otp = OTPCode.objects.get(email=self.email, purpose=self.purpose, is_used=False)
        otp.created_at = timezone.now() - timezone.timedelta(seconds=10)
        otp.save(update_fields=['created_at'])

        # Second request should create a new OTP (and invalidate the old unused one)
        resp2 = self.client.post(self.url, {'email': self.email, 'purpose': self.purpose}, content_type='application/json')
        self.assertEqual(resp2.status_code, 200)
        code2 = resp2.json().get('debug_code')
        self.assertIsNotNone(code2)
        self.assertNotEqual(code1, code2)

        # There should be two OTP rows total, but only the latest is unused
        total = OTPCode.objects.filter(email=self.email, purpose=self.purpose).count()
        unused = OTPCode.objects.filter(email=self.email, purpose=self.purpose, is_used=False).count()
        self.assertGreaterEqual(total, 2)
        self.assertEqual(unused, 1)
