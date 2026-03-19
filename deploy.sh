#!/bin/bash
set -e

PI_HOST="192.168.86.44"
PI_USER="root"
PI_PORT="22"
ADDON_DIR="/addons/family-dashboard"
SSH_KEY="$HOME/.ssh/id_ed25519"

SSH="ssh -p ${PI_PORT} -o StrictHostKeyChecking=no -o ConnectTimeout=10 -i ${SSH_KEY} ${PI_USER}@${PI_HOST}"
SCP="scp -P ${PI_PORT} -o StrictHostKeyChecking=no -i ${SSH_KEY}"

echo "==> Deploying to HAOS add-on at ${PI_USER}@${PI_HOST}:${ADDON_DIR}"

# 1. Test connection
echo "==> Testing connection..."
$SSH "echo 'Connected'" || { echo "ERROR: Cannot connect to Pi"; exit 1; }

# 2. Sync source files
echo "==> Syncing source files..."

tar -czf /tmp/fd-app.tar.gz app/
tar -czf /tmp/fd-components.tar.gz components/
tar -czf /tmp/fd-lib.tar.gz lib/
tar -czf /tmp/fd-prisma.tar.gz prisma/ prisma.config.ts
tar -czf /tmp/fd-public.tar.gz public/

$SCP /tmp/fd-app.tar.gz ${PI_USER}@${PI_HOST}:/tmp/
$SCP /tmp/fd-components.tar.gz ${PI_USER}@${PI_HOST}:/tmp/
$SCP /tmp/fd-lib.tar.gz ${PI_USER}@${PI_HOST}:/tmp/
$SCP /tmp/fd-prisma.tar.gz ${PI_USER}@${PI_HOST}:/tmp/
$SCP /tmp/fd-public.tar.gz ${PI_USER}@${PI_HOST}:/tmp/
$SCP package.json package-lock.json ${PI_USER}@${PI_HOST}:${ADDON_DIR}/
$SCP next.config.mjs tailwind.config.ts tsconfig.json postcss.config.mjs ${PI_USER}@${PI_HOST}:${ADDON_DIR}/ 2>/dev/null || true
$SCP .eslintrc.json ${PI_USER}@${PI_HOST}:${ADDON_DIR}/ 2>/dev/null || true

$SSH "
  tar -xzf /tmp/fd-app.tar.gz -C ${ADDON_DIR}/
  tar -xzf /tmp/fd-components.tar.gz -C ${ADDON_DIR}/
  tar -xzf /tmp/fd-lib.tar.gz -C ${ADDON_DIR}/
  tar -xzf /tmp/fd-prisma.tar.gz -C ${ADDON_DIR}/
  tar -xzf /tmp/fd-public.tar.gz -C ${ADDON_DIR}/
  rm -f /tmp/fd-*.tar.gz
  echo 'Files extracted'
"

# 3. Sync addon config files (Dockerfile, run.sh, config.json, etc.)
echo "==> Syncing add-on config..."
$SCP addons/family-dashboard/Dockerfile ${PI_USER}@${PI_HOST}:${ADDON_DIR}/
$SCP addons/family-dashboard/run.sh ${PI_USER}@${PI_HOST}:${ADDON_DIR}/
$SCP addons/family-dashboard/CHANGELOG.md ${PI_USER}@${PI_HOST}:${ADDON_DIR}/
$SCP addons/family-dashboard/icon.png ${PI_USER}@${PI_HOST}:${ADDON_DIR}/ 2>/dev/null || true
$SCP addons/family-dashboard/logo.png ${PI_USER}@${PI_HOST}:${ADDON_DIR}/ 2>/dev/null || true
# Don't sync config.json — it would reset user's configured options

# 4. Rebuild the add-on
echo "==> Rebuilding HAOS add-on (this takes ~2-3 minutes)..."
$SSH "ha apps rebuild local_family-dashboard 2>&1" || {
  echo "==> Rebuild failed, trying restart..."
  $SSH "ha apps restart local_family-dashboard 2>&1" || true
}

# 5. Wait for it to come up
echo "==> Waiting for dashboard to start..."
sleep 10
for i in $(seq 1 12); do
  STATUS=$($SSH "ha apps info local_family-dashboard 2>&1 | grep 'state:'" || echo "state: unknown")
  if echo "$STATUS" | grep -q "started"; then
    break
  fi
  echo "  $STATUS (waiting...)"
  sleep 10
done

# 6. Show recent logs
$SSH "ha apps logs local_family-dashboard 2>&1 | tail -8"

# Cleanup local temp files
rm -f /tmp/fd-*.tar.gz

echo ""
echo "==> Done! Dashboard available at http://${PI_HOST}:3000"
echo "==> Mobile view at http://${PI_HOST}:3000/mobile"
