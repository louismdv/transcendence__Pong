FROM nginx:alpine

# Install openssl only if you still need it for some reason (e.g. fallback)
RUN apk add --no-cache openssl

# Copy your custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]