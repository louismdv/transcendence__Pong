# Utilisation d'une image de base Python
FROM python:3.10-slim

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers nécessaires pour le projet
COPY . .

RUN apt-get update && apt-get install -y gettext

# Installer les dépendances du projet
RUN pip install --no-cache-dir -r requirements.txt

# Exposer le port sur lequel Django va tourner
EXPOSE 8000

ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=ft_transcendence.settings.base

# Lancer le serveur ASGI avec daphne
CMD ["sh", "-c", "python manage.py makemessages -l fr -l es && python manage.py compilemessages && python manage.py migrate && daphne -p 8000 -b 0.0.0.0 ft_transcendence.asgi:application"]