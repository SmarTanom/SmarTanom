from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.conf import settings

def get_activation_email(user, request, token):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:8081')
    activation_link = f"{frontend_url}/activate/{uid}/{token}"

    subject = "Activate your SmarTanom Account"
    message = f"""
    Hi {user.name},

    Thanks for signing up for SmarTanom!

    Please click the link below to activate your account:

    {activation_link}

    If you didn’t register, please ignore this email.

    - SmarTanom Team
    """

    return subject.strip(), message.strip()
