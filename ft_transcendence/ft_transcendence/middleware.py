from django.utils import translation

class UserLanguageMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            language = getattr(request.user.preferences, 'language', None)
            if language:
                translation.activate(language)
                request.LANGUAGE_CODE = language
        response = self.get_response(request)
        translation.deactivate()
        return response