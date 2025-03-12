
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import ft_transcendence.ft_transcendence.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ft_transcendence.settings')

# application = get_asgi_application()

application = ProtocolTypeRouter({
    'http': get_asgi_application(),
    'websocket': AuthMiddlewareStack(
        URLRouter(
            ft_transcendence.ft_transcendence.routing.websocket_urlpatterns
        )
    ),
})
