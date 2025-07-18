#!/bin/sh

# Wait for certs if needed (e.g., in first boot loop)
CERT_PATH="/etc/letsencrypt/live/louismdv.works/fullchain.pem"
KEY_PATH="/etc/letsencrypt/live/louismdv.works/privkey.pem"

echo "Waiting for Let's Encrypt certificates..."
while [ ! -f "$CERT_PATH" ] || [ ! -f "$KEY_PATH" ]; do
  echo "Waiting for certs..."
  sleep 2
done

# Start nginx
exec "$@"