from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.conf import settings

def get_activation_email(user, request, token):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    # Use your actual domain or backend URL here
    activation_url = f"http://127.0.0.1:8000/api/accounts/activate/{uid}/{token}/"
    
    subject = "Activate your SmarTanom Account"
    message = f"""
    Hi {user.name},

    Thanks for signing up for SmarTanom!

    Please click the link below to activate your account:

    {activation_url}

    If you didn't register, please ignore this email.

    - SmarTanom Team
    """

    return subject.strip(), message.strip()