# Utilisation d'une image de base Python
FROM python:3.10-slim

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers nécessaires pour le projet
COPY . .

# Installer les dépendances du projet
RUN pip install --no-cache-dir -r requirements.txt

# Exposer le port sur lequel Django va tourner
EXPOSE 8000

# Lancer le serveur ASGI avec daphne
CMD ["sh", "-c", "python manage.py migrate && daphne -p 8000 -b 0.0.0.0 ft_transcendence.asgi:application"]