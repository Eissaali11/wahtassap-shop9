# 🚀 دليل النشر الكامل لـ OpenWA على Hostinger VPS

## 📋 جدول المحتويات
1. [المتطلبات الأولية](#1-المتطلبات-الأولية)
2. [إعداد خادم Hostinger VPS](#2-إعداد-خادم-hostinger-vps)
3. [تثبيت البرامج المطلوبة](#3-تثبيت-البرامج-المطلوبة)
4. [إعداد قاعدة البيانات](#4-إعداد-قاعدة-البيانات)
5. [نشر التطبيق](#5-نشر-التطبيق)
6. [إعداد Nginx كـ Reverse Proxy](#6-إعداد-nginx-كـ-reverse-proxy)
7. [تفعيل SSL و HTTPS](#7-تفعيل-ssl-و-https)
8. [إعداد Salla Webhook](#8-إعداد-salla-webhook)
9. [الصيانة والمراقبة](#9-الصيانة-والمراقبة)

---

## 1️⃣ المتطلبات الأولية

### ✅ ما تحتاجه:
- **خادم Hostinger VPS** (الحد الأدنى: 2 نوى، 2GB RAM)
- **نطاق أو IP عام**
- **حساب Salla** مع بيانات API الخاصة بك
- **شهادة SSL** (Let's Encrypt مجانية)
- **عميل SSH** (Putty, Terminal, أو أي برنامج آخر)

### 🌐 Hostinger VPS Specs الموصى بها:
```
CPU: 2 cores
RAM: 2GB (الحد الأدنى) أو 4GB (مثالي)
SSD: 20GB
Bandwidth: 1TB
OS: Ubuntu 20.04 LTS أو Ubuntu 22.04 LTS
```

---

## 2️⃣ إعداد خادم Hostinger VPS

### الخطوة 1: الوصول إلى الخادم عبر SSH

```bash
ssh root@your-server-ip
```

عند المرة الأولى، قد يطلب منك كلمة المرور (تجدها في بريد Hostinger)

### الخطوة 2: تحديث نظام التشغيل

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y curl wget git build-essential
```

### الخطوة 3: إنشاء مستخدم جديد (اختياري لكن مهم أماناً)

```bash
sudo adduser openwa
sudo usermod -aG sudo openwa
su - openwa
```

---

## 3️⃣ تثبيت البرامج المطلوبة

### تثبيت Node.js و NPM

```bash
# تثبيت Node.js 18+ (موصى به للإنتاج)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# التحقق من التثبيت
node --version
npm --version
```

### تثبيت PostgreSQL

```bash
# إضافة مفتاح PostgreSQL
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

# التثبيت
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# بدء الخدمة
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### تثبيت Redis (لتخزين مؤقت والقوائم)

```bash
sudo apt install -y redis-server

# تفعيل الخدمة
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### تثبيت Nginx

```bash
sudo apt install -y nginx

# تفعيل الخدمة
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## 4️⃣ إعداد قاعدة البيانات

### الخطوة 1: إنشاء قاعدة البيانات والمستخدم

```bash
sudo su - postgres
psql
```

داخل psql:

```sql
-- إنشاء المستخدم
CREATE USER openwa_user WITH PASSWORD 'your_secure_password_here';

-- إنشاء قاعدة البيانات
CREATE DATABASE openwa_prod OWNER openwa_user;

-- إعطاء الصلاحيات
ALTER USER openwa_user CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE openwa_prod TO openwa_user;

-- الخروج
\q
exit
```

### الخطوة 2: اختبار الاتصال

```bash
psql -U openwa_user -d openwa_prod -h localhost
```

---

## 5️⃣ نشر التطبيق

### الخطوة 1: استنساخ المشروع

```bash
cd /home/openwa
git clone <your-repo-url> OpenWA
cd OpenWA
```

### الخطوة 2: تثبيت المكتبات

```bash
npm install
```

### الخطوة 3: تحضير ملف البيئة

```bash
# نسخ ملف البيئة
cp .env.production .env

# تعديل البيانات الحساسة
nano .env
```

**تأكد من تعديل هذه البيانات:**

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=openwa_prod
DATABASE_USER=openwa_user
DATABASE_PASSWORD=your_secure_password_here

# API Keys
API_KEY_DEFAULT=your-production-api-key-change-this
JWT_SECRET=your-jwt-secret-key-change-this

# Salla Integration
SALLA_API_KEY=your_salla_api_key
SALLA_API_SECRET=your_salla_api_secret

# App URL
APP_URL=https://your-domain.com
API_URL=https://your-domain.com/api
```

### الخطوة 4: بناء التطبيق

```bash
npm run build
```

### الخطوة 5: تشغيل التطبيق كخدمة (باستخدام PM2)

```bash
# تثبيت PM2
npm install -g pm2

# بدء التطبيق
pm2 start "npm run start:prod" --name openwa

# جعل التطبيق يبدأ مع النظام
pm2 startup
pm2 save

# التحقق من الحالة
pm2 status
```

---

## 6️⃣ إعداد Nginx كـ Reverse Proxy

### إنشاء ملف الإعدادات

```bash
sudo nano /etc/nginx/sites-available/openwa
```

أضف المحتوى التالي:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # إعادة توجيه HTTP إلى HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # شهادات SSL (سيتم إضافتها في الخطوة التالية)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # إعدادات SSL الأمنة
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # GZIP Compression
    gzip on;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;

    # API Backend
    location /api {
        proxy_pass http://localhost:2785;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket Support
    location /socket.io {
        proxy_pass http://localhost:2785;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Dashboard Frontend
    location / {
        proxy_pass http://localhost:2886;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Swagger Docs
    location /swagger {
        proxy_pass http://localhost:2785;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Limits
    client_max_body_size 100M;
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
}
```

### تفعيل الموقع

```bash
sudo ln -s /etc/nginx/sites-available/openwa /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 7️⃣ تفعيل SSL و HTTPS

### تثبيت Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### إنشاء شهادة SSL

```bash
sudo certbot certonly --nginx -d your-domain.com -d www.your-domain.com
```

### التجديد التلقائي

```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## 8️⃣ إعداد Salla Webhook

### الخطوة 1: الحصول على بيانات Salla API

1. اذهب إلى **Salla Dashboard**
2. **الإعدادات → تطبيقات → API Keys**
3. انسخ:
   - `API Key`
   - `API Secret`
   - `Webhook Secret` (إن كان موجوداً)

### الخطوة 2: تحديث ملف .env

```bash
nano .env
```

```env
SALLA_API_KEY=your_api_key_from_salla
SALLA_API_SECRET=your_api_secret
WEBHOOK_SECRET=your_webhook_secret
SALLA_WEBHOOK_URL=https://your-domain.com/api/webhooks/salla
```

### الخطوة 3: تسجيل Webhooks في Salla

في **Salla Dashboard**:

1. اذهب إلى **الإعدادات → Webhooks**
2. أضف الـ URLs التالية:

```
✅ Cart Abandoned:
   https://your-domain.com/api/webhooks/salla/cart-abandoned

✅ Order Created:
   https://your-domain.com/api/webhooks/salla/order-created

✅ Order Status Changed:
   https://your-domain.com/api/webhooks/salla/order-status-changed

✅ Customer Created:
   https://your-domain.com/api/webhooks/salla/customer-created
```

3. أضف `WEBHOOK_SECRET` في كل واحد

### الخطوة 4: اختبار الـ Webhook

```bash
curl -X POST https://your-domain.com/api/webhooks/salla/cart-abandoned \
  -H "Content-Type: application/json" \
  -H "x-salla-signature: test-signature" \
  -d '{
    "data": {
      "cart": {
        "id": "test-123",
        "total": 100,
        "items": []
      },
      "customer": {
        "id": "cust-123",
        "name": "Test User",
        "mobile": "0501234567",
        "email": "test@example.com"
      }
    }
  }'
```

---

## 9️⃣ الصيانة والمراقبة

### عرض السجلات

```bash
# سجلات التطبيق
pm2 logs openwa

# سجلات Nginx
sudo tail -f /var/log/nginx/access.log

# سجلات الأخطاء
sudo tail -f /var/log/nginx/error.log
```

### إعادة تشغيل التطبيق

```bash
pm2 restart openwa
```

### التحديث إلى إصدار جديد

```bash
cd /home/openwa/OpenWA
git pull origin main
npm install
npm run build
pm2 restart openwa
```

### مراقبة الموارد

```bash
# استخدام CPU والذاكرة
pm2 monit

# معلومات النظام
free -h
df -h
```

---

## 🔥 اختبار التطبيق بعد النشر

### 1. اختبار الـ API

```bash
# التحقق من اتصال الـ API
curl -X GET https://your-domain.com/api/docs \
  -H "X-API-Key: your-api-key"

# الحالة الصحية
curl -X GET https://your-domain.com/api/health \
  -H "X-API-Key: your-api-key"
```

### 2. الوصول إلى Dashboard

```
https://your-domain.com/dashboard
```

### 3. اختبار Webhook

```bash
# اختبار استقبال webhook
curl -X POST https://your-domain.com/api/webhooks/salla/cart-abandoned \
  -H "Content-Type: application/json" \
  -d '{"data": {"cart": {...}, "customer": {...}}}'
```

---

## 📊 إعدادات الأمان المهمة

### تحديث تصاريح الملفات

```bash
cd /home/openwa/OpenWA
chmod 755 .
chmod -R 755 public
chmod -R 700 data
chmod 600 .env
```

### إضافة Firewall

```bash
# تفعيل UFW
sudo ufw enable

# السماح بـ SSH
sudo ufw allow 22/tcp

# السماح بـ HTTP و HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# التحقق من الحالة
sudo ufw status
```

### النسخ الاحتياطية

```bash
# نسخ احتياطية من قاعدة البيانات
pg_dump -U openwa_user openwa_prod > /backups/openwa_$(date +%Y%m%d).sql

# نسخ احتياطية من الملفات
tar -czf /backups/openwa_files_$(date +%Y%m%d).tar.gz /home/openwa/OpenWA/data

# أتمتة النسخ الاحتياطية (cron)
crontab -e
# أضف: 0 2 * * * /path/to/backup-script.sh
```

---

## 🐛 استكشاف الأخطاء

### تطبيق لا يبدأ

```bash
pm2 logs openwa
# تحقق من أخطاء قاعدة البيانات أو المنافذ
```

### خطأ في الاتصال بقاعدة البيانات

```bash
# تحقق من حالة PostgreSQL
sudo systemctl status postgresql

# اختبر الاتصال
psql -U openwa_user -d openwa_prod -h localhost
```

### Webhook لا يستقبل البيانات

```bash
# تحقق من DNS
nslookup your-domain.com

# تحقق من الشهادة
curl -v https://your-domain.com/api/webhooks/salla/cart-abandoned

# تحقق من سجلات Nginx
sudo tail -100 /var/log/nginx/error.log
```

---

## 📈 قياس الأداء

### استخدام New Relic أو DataDog (اختياري)

```bash
npm install newrelic --save
```

أضف في بداية `src/main.ts`:

```typescript
require('newrelic');
```

---

## ✅ Checklist النشر النهائي

- [ ] تثبيت Node.js و npm
- [ ] إنشاء قاعدة البيانات PostgreSQL
- [ ] نسخ ملف .env مع البيانات الصحيحة
- [ ] بناء التطبيق (npm run build)
- [ ] بدء التطبيق مع PM2
- [ ] تكوين Nginx كـ Reverse Proxy
- [ ] تفعيل SSL/HTTPS
- [ ] تسجيل Webhooks في Salla
- [ ] اختبار جميع الـ Endpoints
- [ ] إعداد النسخ الاحتياطية
- [ ] تفعيل الـ Firewall
- [ ] توثيق بيانات الدخول والمفاتيح

---

## 📞 الدعم والمساعدة

للمساعدة أو الأسئلة:
- 📧 البريد الإلكتروني: support@example.com
- 🔗 الموقع: https://your-domain.com
- 📚 الوثائق: https://your-domain.com/api/docs

---

**آخر تحديث: 2026-05-25**
**الإصدار: 1.0.0**
