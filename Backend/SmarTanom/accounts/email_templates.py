from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes

def get_activation_email(user, request, token):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    frontend_base_url = "http://10.0.2.2:8081"  # Emulator's localhost alias
    activation_link = f"{frontend_base_url}/activate/{uid}/{token}"

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
