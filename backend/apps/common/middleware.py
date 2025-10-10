"""
Development middleware for auto-login convenience
WARNING: Only enabled in DEBUG mode!
"""
from django.contrib.auth import get_user_model, login
from django.core.cache import cache
from django.conf import settings
from django.shortcuts import redirect


class DevAutoLoginMiddleware:
    """
    Development middleware that allows auto-login via URL parameter
    Only works when DEBUG=True for security
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Only process in DEBUG mode
        if settings.DEBUG and not request.user.is_authenticated:
            dev_login_token = request.GET.get('dev_login')

            if dev_login_token:
                # Check if token is valid
                user_pk = cache.get(f'dev_login_{dev_login_token}')

                if user_pk:
                    try:
                        User = get_user_model()
                        user = User.objects.get(pk=user_pk)

                        # Log the user in
                        login(request, user)

                        # Clear the token (single use)
                        cache.delete(f'dev_login_{dev_login_token}')

                        # Redirect to remove token from URL
                        clean_url = request.path
                        if request.META.get('QUERY_STRING'):
                            # Remove dev_login from query string
                            query_params = []
                            for param in request.META['QUERY_STRING'].split('&'):
                                if not param.startswith('dev_login='):
                                    query_params.append(param)

                            if query_params:
                                clean_url += '?' + '&'.join(query_params)

                        return redirect(clean_url)

                    except User.DoesNotExist:
                        pass  # Invalid user, continue normally

        response = self.get_response(request)
        return response
