#!/bin/bash
# =============================================================================
# Hostinger VPS Setup Script - سكريبت إعداد خادم Hostinger
# تشغيل مرة واحدة فقط على خادم جديد
# sudo bash hostinger-setup.sh
# =============================================================================

set -e

# Prevent interactive prompts during package installation
export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=a # auto restart services if prompted by needrestart

echo "=========================================="
echo " OpenWA - Hostinger VPS Setup"
echo "=========================================="

# ====================================================
# 1. تحديث النظام
# ====================================================
echo "[1/8] Updating system..."
apt-get update -y && apt-get upgrade -y

# ====================================================
# 2. تثبيت الأدوات الأساسية
# ====================================================
echo "[2/8] Installing base tools..."
apt-get install -y \
  curl wget git unzip nano htop \
  build-essential python3 make g++ \
  ca-certificates gnupg lsb-release \
  ufw fail2ban

# ====================================================
# 3. تثبيت Node.js 22
# ====================================================
echo "[3/8] Installing Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
node --version && npm --version

# ====================================================
# 4. تثبيت PostgreSQL 16
# ====================================================
echo "[4/8] Installing PostgreSQL 16..."
apt-get install -y postgresql postgresql-contrib

systemctl enable postgresql
systemctl start postgresql

# إنشاء قاعدة البيانات والمستخدم (تجنب التعارض)
DB_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
sudo -u postgres psql -c "DO \$\$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'openwa') THEN CREATE ROLE openwa WITH LOGIN PASSWORD '${DB_PASSWORD}'; ELSE ALTER ROLE openwa WITH PASSWORD '${DB_PASSWORD}'; END IF; END \$\$;"
sudo -u postgres psql -c "SELECT 1 FROM pg_database WHERE datname = 'openwa'" | grep -q 1 || sudo -u postgres psql -c "CREATE DATABASE openwa OWNER openwa;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE openwa TO openwa;"

echo ""
echo ">>> PostgreSQL Password (SAVE THIS): ${DB_PASSWORD}"
echo ""

# ====================================================
# 5. تثبيت Redis
# ====================================================
echo "[5/8] Installing Redis..."
apt-get install -y redis-server

# تأمين Redis
sed -i 's/^# bind 127.0.0.1/bind 127.0.0.1/' /etc/redis/redis.conf
sed -i 's/^# requirepass.*/# requirepass disabled - bound to localhost only/' /etc/redis/redis.conf

systemctl enable redis-server
systemctl restart redis-server

# ====================================================
# 6. تثبيت Chromium (لـ Puppeteer / WhatsApp Web)
# ====================================================
echo "[6/8] Installing Chromium for WhatsApp..."
apt-get install -y \
  chromium-browser \
  libnss3 libatk-bridge2.0-0 libxcomposite1 \
  libxdamage1 libxfixes3 libxrandr2 libgbm1 \
  libxkbcommon0 libasound2t64 libxshmfence1

# ====================================================
# 7. إعداد Nginx كـ Reverse Proxy
# ====================================================
echo "[7/8] Installing and configuring Nginx..."
apt-get install -y nginx certbot python3-certbot-nginx

# نسخ إعدادات Nginx
cp /tmp/openwa-nginx.conf /etc/nginx/sites-available/openwa
ln -sf /etc/nginx/sites-available/openwa /etc/nginx/sites-enabled/openwa
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl reload nginx

# ====================================================
# 8. إعداد Firewall
# ====================================================
echo "[8/8] Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# ====================================================
# إنشاء مستخدم التطبيق
# ====================================================
if ! id "openwa" &>/dev/null; then
  useradd -m -s /bin/bash openwa
  echo "User 'openwa' created"
fi

mkdir -p /app/data/{sessions,media,excel-imports,plugins}
chown -R openwa:openwa /app

# ====================================================
# تثبيت PM2 لإدارة العملية
# ====================================================
npm install -g pm2
pm2 startup systemd -u openwa --hp /home/openwa

echo ""
echo "=========================================="
echo " Setup Complete!"
echo " Next: run deploy.sh to deploy the app"
echo "=========================================="
echo ""
echo " PostgreSQL DB Password: ${DB_PASSWORD}"
echo " Save the above password in your .env.production file"
echo ""
