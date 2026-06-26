#!/bin/bash
# deploy/setup-binary.sh

set -e

# Wait for the database to be ready (if a PostgreSQL host is set)
if [ -n "$DB_HOST" ]; then
    echo "Waiting for database at $DB_HOST:5432..."
    while ! pg_isready -h "$DB_HOST" -p 5432 -U "${POSTGRES_USER:-dbuser}" -t 1 >/dev/null 2>&1; do
        sleep 1
    done
    echo "Database is ready."
fi

# Apply migrations (idempotent)
/app/humrine_site_linux migrate --noinput

# Ensure media directory exists and is writable
mkdir -p /app/data/media
chown -R appuser:appuser /app/data/media

# Collect static files to persistent volume
echo "Collecting static files..."
/app/humrine_site_linux collectstatic --noinput

# Run the server
exec /app/humrine_site_linux "$@"