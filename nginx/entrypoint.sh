#!/bin/sh

# Create SSL certificate directories
mkdir -p /etc/ssl/certs /etc/ssl/private

# Generate self-signed SSL certificate if it doesn't exist
if [ ! -f /etc/ssl/certs/nginx-selfsigned.crt ] || [ ! -f /etc/ssl/private/nginx-selfsigned.key ]; then
    echo "Generating self-signed SSL certificates..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/ssl/private/nginx-selfsigned.key \
        -out /etc/ssl/certs/nginx-selfsigned.crt \
        -subj "/C=FR/ST=Paris/L=Paris/O=42/OU=Student/CN=localhost"
fi

# Create .htpasswd file if needed
if [ ! -f /etc/nginx/.htpasswd ]; then
    echo "Creating .htpasswd file with default admin:admin credentials"
    htpasswd -bc /etc/nginx/.htpasswd admin admin
fi

# Start nginx
exec "$@"