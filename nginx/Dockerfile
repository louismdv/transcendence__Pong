FROM nginx:alpine

RUN apk add --no-cache openssl

# Copie du fichier de config Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Script pour générer le certificat auto-signé
RUN mkdir -p /etc/ssl/certs /etc/ssl/private
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/nginx-selfsigned.key \
    -out /etc/ssl/certs/nginx-selfsigned.crt \
    -subj "/C=FR/ST=Paris/L=Paris/O=42/OU=Student/CN=localhost"

CMD ["nginx", "-g", "daemon off;"]