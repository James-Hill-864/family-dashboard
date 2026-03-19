#!/bin/sh
set -e

CONFIG_PATH="/data/options.json"
DATA_DIR="/data"

echo "[family-dashboard] Starting..."

# Read options from HA add-on config
if [ -f "$CONFIG_PATH" ]; then
    HA_TOKEN=$(jq --raw-output '.ha_token // empty' "$CONFIG_PATH")
    HA_BASE_URL=$(jq --raw-output '.ha_base_url // empty' "$CONFIG_PATH")
    FAMILY_NAME=$(jq --raw-output '.family_name // empty' "$CONFIG_PATH")
    GOOGLE_CLIENT_ID=$(jq --raw-output '.google_client_id // empty' "$CONFIG_PATH")
    GOOGLE_CLIENT_SECRET=$(jq --raw-output '.google_client_secret // empty' "$CONFIG_PATH")
    GOOGLE_REDIRECT_URI=$(jq --raw-output '.google_redirect_uri // empty' "$CONFIG_PATH")
    GMAIL_USER=$(jq --raw-output '.gmail_user // empty' "$CONFIG_PATH")
    GMAIL_APP_PASSWORD=$(jq --raw-output '.gmail_app_password // empty' "$CONFIG_PATH")
fi

# Defaults
HA_BASE_URL="${HA_BASE_URL:-http://homeassistant.local:8123}"
FAMILY_NAME="${FAMILY_NAME:-Our Family}"
GOOGLE_REDIRECT_URI="${GOOGLE_REDIRECT_URI:-http://localhost:3000/api/google/callback}"
DATABASE_URL="file:${DATA_DIR}/family.db"

export HA_TOKEN
export HA_BASE_URL
export NEXT_PUBLIC_FAMILY_NAME="$FAMILY_NAME"
export DATABASE_URL
export GOOGLE_CLIENT_ID
export GOOGLE_CLIENT_SECRET
export GOOGLE_REDIRECT_URI
export GMAIL_USER
export GMAIL_APP_PASSWORD
export NODE_ENV=production
export PORT=3000
export HOSTNAME=0.0.0.0

echo "[family-dashboard] HA URL: $HA_BASE_URL"
echo "[family-dashboard] Family: $FAMILY_NAME"
echo "[family-dashboard] Database: $DATABASE_URL"
echo "[family-dashboard] Google OAuth: ${GOOGLE_CLIENT_ID:+configured}${GOOGLE_CLIENT_ID:-not set}"
echo "[family-dashboard] Gmail: ${GMAIL_USER:+configured}${GMAIL_USER:-not set}"

# Run database migrations
echo "[family-dashboard] Running migrations..."
node_modules/.bin/prisma migrate deploy --schema=prisma/schema.prisma 2>&1 || \
    echo "[family-dashboard] Warning: migrations failed or already up to date"

# Start the Next.js server
echo "[family-dashboard] Starting Next.js server on port 3000..."
exec node .next/standalone/server.js
