#!/bin/bash
# =============================================================================
# Deploy Script - سكريبت النشر على Hostinger
# شغّله في كل مرة تريد تحديث التطبيق
# bash deploy.sh
# =============================================================================

set -e

APP_DIR="/app/openwa"
ENV_FILE="${APP_DIR}/.env"

echo "=========================================="
echo " OpenWA - Deploying to Production"
echo "=========================================="

# ====================================================
# نسخ الكود إذا لم يكن موجوداً
# ====================================================
if [ ! -d "$APP_DIR" ]; then
  echo "[*] Cloning repository..."
  git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git "$APP_DIR"
  # أو انسخ الملفات يدوياً عبر SCP:
  # scp -r ./OpenWA root@YOUR_SERVER_IP:/app/openwa
fi

cd "$APP_DIR"

# ====================================================
# التحقق من وجود ملف البيئة
# ====================================================
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: .env file not found at ${ENV_FILE}"
  echo "Copy your .env.production to ${ENV_FILE} first"
  exit 1
fi

# ====================================================
# تثبيت الاعتماديات وبناء المشروع
# ====================================================
echo "[*] Installing dependencies..."
npm ci --production=false

echo "[*] Building application..."
npm run build

echo "[*] Installing production deps only..."
cd dashboard && npm ci && npm run build && cd ..

# ====================================================
# تشغيل migrations
# ====================================================
echo "[*] Running database migrations..."
NODE_ENV=production node -r dotenv/config \
  node_modules/.bin/typeorm migration:run \
  -d dist/database/data-source.js 2>/dev/null || \
  echo "Warning: migrations may have failed - check manually"

# ====================================================
# تشغيل/إعادة تشغيل التطبيق عبر PM2
# ====================================================
echo "[*] Starting application with PM2..."

pm2 describe openwa > /dev/null 2>&1 && \
  pm2 reload openwa --update-env || \
  pm2 start dist/main.js \
    --name openwa \
    --env production \
    --max-memory-restart 1G \
    --log /app/logs/openwa.log \
    --time

pm2 save

echo ""
echo "=========================================="
echo " Deployment Complete!"
echo " App running at: http://localhost:2785"
echo " Check logs: pm2 logs openwa"
echo "=========================================="
