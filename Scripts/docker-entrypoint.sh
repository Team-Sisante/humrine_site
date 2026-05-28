#!/bin/bash
# scripts/docker-entrypoint.sh
# Entry point script for Docker container

set -e

echo "🔧 Running startup configuration..."

# Install certificates if they exist
if [ -f /certs/ca.pem ]; then
    echo "📜 Installing SSL certificates..."
    cp /certs/ca.pem /usr/local/share/ca-certificates/ca-posteio.crt
    update-ca-certificates
fi

# Wait for database to be ready
echo "⏳ Waiting for database..."
until python manage.py check --database default 2>/dev/null; do
  echo "Database unavailable - sleeping"
  sleep 2
done

echo "✅ Database is ready!"

# Run migrations
echo "🔄 Running migrations..."
python manage.py migrate --noinput

# Update Site configuration
echo "🌐 Updating Site configuration..."
python manage.py shell << EOF
from django.contrib.sites.models import Site
from django.conf import settings
try:
    site = Site.objects.get(id=settings.SITE_ID)
    if site.domain != settings.APP_DOMAIN:
        site.domain = settings.APP_DOMAIN
        site.name = settings.SITE_HEADER
        site.save()
        print(f"Site updated: {site.domain}")
except:
    print("Could not update site")
EOF

echo "🚀 Starting application..."
exec python manage.py runserver 0.0.0.0:8000