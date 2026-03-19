#!/bin/bash
set -e

PI_HOST="192.168.86.44"
PI_USER="root"
PI_PORT="22"
SSH_KEY="$HOME/.ssh/id_ed25519"
ADDON_SLUG="family-dashboard"
ADDON_DIR="/addons/${ADDON_SLUG}"

SSH="ssh -p ${PI_PORT} -o StrictHostKeyChecking=no -i ${SSH_KEY} ${PI_USER}@${PI_HOST}"
SCP="scp -P ${PI_PORT} -o StrictHostKeyChecking=no -i ${SSH_KEY}"

echo "==> Building HA add-on package for family-dashboard"

# -------------------------------------------------------
# 1. Assemble the add-on build context in a temp directory
# -------------------------------------------------------
STAGING=$(mktemp -d)
ADDON_STAGING="${STAGING}/family-dashboard"
mkdir -p "$ADDON_STAGING"

echo "==> Staging add-on files..."

# Copy add-on manifest files
cp addons/family-dashboard/config.json   "$ADDON_STAGING/"
cp addons/family-dashboard/Dockerfile    "$ADDON_STAGING/"
cp addons/family-dashboard/run.sh        "$ADDON_STAGING/"
cp addons/family-dashboard/.dockerignore "$ADDON_STAGING/"

# Copy Next.js app source (Dockerfile build context)
cp package.json           "$ADDON_STAGING/"
cp package-lock.json      "$ADDON_STAGING/"
cp next.config.mjs        "$ADDON_STAGING/"
cp tsconfig.json          "$ADDON_STAGING/"
cp tailwind.config.ts     "$ADDON_STAGING/"
cp postcss.config.mjs     "$ADDON_STAGING/"
cp prisma.config.ts       "$ADDON_STAGING/"
cp .eslintrc.json         "$ADDON_STAGING/"

mkdir -p "$ADDON_STAGING/public"
cp -r app/         "$ADDON_STAGING/app/"
cp -r components/  "$ADDON_STAGING/components/"
cp -r lib/         "$ADDON_STAGING/lib/"
cp -r prisma/      "$ADDON_STAGING/prisma/"
[ -d public ] && cp -r public/. "$ADDON_STAGING/public/" || true

# -------------------------------------------------------
# 2. Package and upload to Pi
# -------------------------------------------------------
echo "==> Packaging add-on..."
tar -czf "${STAGING}/addon.tar.gz" -C "$STAGING" family-dashboard

echo "==> Uploading to Pi..."
$SCP "${STAGING}/addon.tar.gz" "${PI_USER}@${PI_HOST}:/tmp/addon.tar.gz"

# -------------------------------------------------------
# 3. Extract to /addons on HA OS
# -------------------------------------------------------
echo "==> Installing add-on files to ${ADDON_DIR}..."
$SSH "
  mkdir -p ${ADDON_DIR}
  tar -xzf /tmp/addon.tar.gz -C /addons/
  rm /tmp/addon.tar.gz
  echo 'Files extracted:'
  ls -la ${ADDON_DIR}/
"

# -------------------------------------------------------
# 4. Use Supervisor API to reload, install/rebuild, then start
# -------------------------------------------------------
echo "==> Reloading add-on store via Supervisor API..."
$SSH "
  # Get supervisor token
  TOKEN=\$SUPERVISOR_TOKEN

  # Reload the local add-on store so HA sees the new add-on
  curl -sf -X POST \
    -H \"Authorization: Bearer \$TOKEN\" \
    http://supervisor/store/reload
  echo 'Store reloaded'
  sleep 3

  # Check if already installed — rebuild if so, install if not
  STATUS=\$(curl -sf \
    -H \"Authorization: Bearer \$TOKEN\" \
    http://supervisor/addons/local_${ADDON_SLUG}/info 2>/dev/null | grep -o '\"state\":\"[^\"]*\"' | head -1 || echo 'not_installed')

  echo \"Add-on status: \$STATUS\"

  if echo \"\$STATUS\" | grep -q 'not_installed\|error\|unknown'; then
    echo 'Installing add-on (first time — this will build the Docker image, ~5-10 min)...'
    curl -sf -X POST \
      -H \"Authorization: Bearer \$TOKEN\" \
      http://supervisor/addons/local_${ADDON_SLUG}/install
  else
    echo 'Rebuilding existing add-on...'
    curl -sf -X POST \
      -H \"Authorization: Bearer \$TOKEN\" \
      http://supervisor/addons/local_${ADDON_SLUG}/rebuild
  fi

  echo ''
  echo 'Build started. Polling for completion (this takes a few minutes)...'
"

# -------------------------------------------------------
# 5. Poll until installed, then configure options and start
# -------------------------------------------------------
echo "==> Waiting for build to complete..."

# Read values from local .env
HA_TOKEN_VAL=$(grep '^HA_TOKEN=' .env | cut -d= -f2- | tr -d '"')
HA_BASE_URL_VAL=$(grep '^HA_BASE_URL=' .env | cut -d= -f2- | tr -d '"')
FAMILY_NAME_VAL=$(grep '^NEXT_PUBLIC_FAMILY_NAME=' .env | cut -d= -f2- | tr -d '"')

for i in $(seq 1 30); do
  sleep 20
  STATE=$($SSH "
    curl -sf \
      -H \"Authorization: Bearer \$SUPERVISOR_TOKEN\" \
      http://supervisor/addons/local_${ADDON_SLUG}/info 2>/dev/null \
      | grep -o '\"state\":\"[^\"]*\"' | head -1 || echo 'pending'
  " 2>/dev/null || echo "pending")
  echo "  [${i}] State: $STATE"

  if echo "$STATE" | grep -qE '"state":"stopped"|"state":"started"'; then
    echo "==> Build complete!"
    break
  fi

  if echo "$STATE" | grep -q '"state":"error"'; then
    echo "ERROR: Build failed. Check HA UI → Add-ons → Family Dashboard → Log"
    exit 1
  fi
done

# Configure add-on options
echo "==> Configuring add-on options..."
$SSH "
  curl -sf -X POST \
    -H \"Authorization: Bearer \$SUPERVISOR_TOKEN\" \
    -H 'Content-Type: application/json' \
    -d '{
      \"ha_base_url\": \"${HA_BASE_URL_VAL}\",
      \"ha_token\": \"${HA_TOKEN_VAL}\",
      \"family_name\": \"${FAMILY_NAME_VAL}\"
    }' \
    http://supervisor/addons/local_${ADDON_SLUG}/options
  echo 'Options set'
"

# Start the add-on
echo "==> Starting add-on..."
$SSH "
  curl -sf -X POST \
    -H \"Authorization: Bearer \$SUPERVISOR_TOKEN\" \
    http://supervisor/addons/local_${ADDON_SLUG}/start
  echo 'Start command sent'
"

sleep 5

# Final status
$SSH "
  curl -sf \
    -H \"Authorization: Bearer \$SUPERVISOR_TOKEN\" \
    http://supervisor/addons/local_${ADDON_SLUG}/info \
    | grep -o '\"state\":\"[^\"]*\"'
" 2>/dev/null && echo "" || true

echo ""
echo "==> Done!"
echo "    Dashboard: http://${PI_HOST}:3000"
echo "    HA UI:     http://${PI_HOST}:8123 → Settings → Add-ons → Family Dashboard"
echo ""
echo "    To view logs:"
echo "    ssh -i ~/.ssh/id_ed25519 root@${PI_HOST} \\"
echo "      \"curl -s -H 'Authorization: Bearer \\\$SUPERVISOR_TOKEN' http://supervisor/addons/local_${ADDON_SLUG}/logs\""

# Cleanup
rm -rf "$STAGING"
