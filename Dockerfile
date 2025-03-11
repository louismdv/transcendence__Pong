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

# Lancer le serveur ASGI avec uvicorn
CMD ["sh", "-c", "python manage.py migrate && uvicorn ft_transcendence.asgi:application --host 0.0.0.0 --port 8000"]