"""
ASGI config for ft_transcendence project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
from online_game.routing import websocket_urlpatterns as onlinegame_routing
from livechat.routing import websocket_urlpatterns as livechat_routing


os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ft_transcendence.settings')  # Replace with your project name

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(
                onlinegame_routing + livechat_routing
            )
        )
    ),
})