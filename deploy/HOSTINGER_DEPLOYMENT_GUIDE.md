# دليل النشر الكامل على Hostinger VPS
## OpenWA + الإرسال الجماعي + تكامل سلة

---

## المتطلبات
- Hostinger VPS: KVM 2 أو أعلى (2 vCPU, 8GB RAM موصى به)
- نظام التشغيل: Ubuntu 22.04 LTS
- دومين مُوجَّه لـ IP الخادم

---

## الخطوة 1: إعداد VPS من لوحة Hostinger

1. اشتري VPS من hostinger.com
2. اختر **Ubuntu 22.04 LTS**
3. احفظ كلمة مرور root
4. من **hPanel → VPS → Manage → SSH Access** احصل على الـ IP

```bash
# اتصل بالخادم
ssh root@YOUR_SERVER_IP
```

---

## الخطوة 2: تثبيت المتطلبات الأساسية

```bash
# ارفع سكريبت الإعداد إلى الخادم
scp deploy/hostinger-setup.sh root@YOUR_SERVER_IP:/tmp/
scp deploy/nginx.conf root@YOUR_SERVER_IP:/tmp/openwa-nginx.conf

# شغّل السكريبت
ssh root@YOUR_SERVER_IP "bash /tmp/hostinger-setup.sh"
```

**احفظ كلمة مرور PostgreSQL التي تظهر في النهاية.**

---

## الخطوة 3: تجهيز ملف الإعدادات

على جهازك المحلي، افتح `.env.production` واستبدل:

| المتغير | القيمة |
|---------|--------|
| `YOUR_DOMAIN.com` | دومينك مثل `api.mystore.com` |
| `YOUR_STRONG_DB_PASSWORD` | كلمة مرور PostgreSQL من الخطوة 2 |
| `YOUR_RANDOM_64_CHAR_KEY` | مفتاح عشوائي (شغّل: `openssl rand -hex 32`) |
| `YOUR_SALLA_WEBHOOK_SECRET` | من لوحة سلة (انظر الخطوة 7) |
| `YOUR_WHATSAPP_SESSION_ID` | بعد تسجيل الدخول لـ WhatsApp |
| `YOUR_EMAIL@domain.com` | إيميلك لـ SSL |

---

## الخطوة 4: رفع المشروع للخادم

```bash
# من مجلد المشروع على جهازك
scp -r . root@YOUR_SERVER_IP:/app/openwa

# أو عبر Git (أفضل)
# على الخادم:
cd /app && git clone https://github.com/YOUR_REPO/openwa.git

# انسخ ملف الإعدادات
scp .env.production root@YOUR_SERVER_IP:/app/openwa/.env
```

---

## الخطوة 5: تثبيت وبناء التطبيق

```bash
ssh root@YOUR_SERVER_IP

cd /app/openwa

# تثبيت الاعتماديات
npm ci

# بناء المشروع
npm run build

# بناء الـ Dashboard
cd dashboard && npm ci && npm run build && cd ..

# تشغيل migrations قاعدة البيانات
NODE_ENV=production node -r dotenv/config \
  node_modules/.bin/typeorm migration:run \
  -d dist/database/data-source.js
```

---

## الخطوة 6: تشغيل التطبيق

```bash
# تثبيت PM2
npm install -g pm2

# تشغيل التطبيق
pm2 start dist/main.js \
  --name openwa \
  --max-memory-restart 1G \
  --time

# حفظ إعداد PM2 (يبدأ تلقائياً عند إعادة التشغيل)
pm2 save
pm2 startup

# مراقبة السجلات
pm2 logs openwa
```

---

## الخطوة 7: إعداد SSL مع Certbot

```bash
# غيّر YOUR_DOMAIN بدومينك
certbot --nginx -d YOUR_DOMAIN.com -d www.YOUR_DOMAIN.com \
  --non-interactive --agree-tos -m YOUR_EMAIL@domain.com

# تجديد تلقائي (يضاف تلقائياً لـ cron)
certbot renew --dry-run
```

---

## الخطوة 8: إعداد Nginx

```bash
# عدّل ملف Nginx
nano /etc/nginx/sites-available/openwa

# استبدل YOUR_DOMAIN.com بدومينك الفعلي في:
# - server_name
# - ssl_certificate
# - ssl_certificate_key

# اختبر وأعِد تشغيل
nginx -t && systemctl reload nginx
```

---

## الخطوة 9: تهيئة WhatsApp Session

1. افتح `https://YOUR_DOMAIN.com/api/docs` (أو استخدم curl)
2. أنشئ جلسة جديدة:
```bash
curl -X POST https://YOUR_DOMAIN.com/api/sessions \
  -H "X-API-Key: YOUR_API_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "main-session"}'
```
3. احصل على QR Code:
```bash
curl https://YOUR_DOMAIN.com/api/sessions/SESSION_ID/qr \
  -H "X-API-Key: YOUR_API_MASTER_KEY"
```
4. امسح الـ QR من هاتفك
5. انسخ الـ `SESSION_ID` وضعه في `.env` تحت `DEFAULT_SESSION_ID`
6. أعِد تشغيل التطبيق: `pm2 restart openwa`

---

## الخطوة 10: إعداد Webhook في سلة

1. افتح لوحة تحكم سلة → **التطبيقات → Webhooks**
2. أضف webhook جديد:

| الحدث | الرابط |
|-------|--------|
| `cart.abandoned` | `https://YOUR_DOMAIN.com/api/webhooks/salla/cart-abandoned` |
| `order.created` | `https://YOUR_DOMAIN.com/api/webhooks/salla/order-created` |
| `order.status.updated` | `https://YOUR_DOMAIN.com/api/webhooks/salla/order-status-changed` |
| `customer.created` | `https://YOUR_DOMAIN.com/api/webhooks/salla/customer-created` |

3. في **Webhook Secret**: أدخل نفس قيمة `WEBHOOK_SECRET` من ملف `.env`
4. اضغط **Test** للتحقق من الاتصال

---

## الخطوة 11: ميزات الإرسال الجماعي

### أ. استيراد أرقام من Excel

جهّز ملف Excel بالأعمدة التالية:

| A | B | C | D |
|---|---|---|---|
| phone | name | email | city |
| 966501234567 | أحمد | ahmed@mail.com | الرياض |

```bash
# رفع الملف عبر API
curl -X POST "https://YOUR_DOMAIN.com/api/bulk-messaging/contacts/import" \
  -H "X-API-Key: YOUR_API_KEY" \
  -F "file=@contacts.xlsx" \
  -F "list_id=YOUR_LIST_ID"
```

### ب. إنشاء قائمة جهات اتصال

```bash
curl -X POST "https://YOUR_DOMAIN.com/api/sessions/SESSION_ID/bulk-messaging/contact-lists" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "عملاء المتجر", "description": "قائمة العملاء الرئيسية"}'
```

### ج. إرسال رسالة جماعية

```bash
# إنشاء الحملة
curl -X POST "https://YOUR_DOMAIN.com/api/sessions/SESSION_ID/bulk-messaging/messages" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "عرض رمضان",
    "contact_list_id": "LIST_ID",
    "message_template": "أهلاً {{name}}! لدينا عرض خاص لك 🎉",
    "message_type": "text"
  }'

# بدء الإرسال
curl -X POST "https://YOUR_DOMAIN.com/api/bulk-messaging/messages/MESSAGE_ID/send" \
  -H "X-API-Key: YOUR_API_KEY"
```

### د. جدولة رسالة دورية

```bash
curl -X POST "https://YOUR_DOMAIN.com/api/sessions/SESSION_ID/bulk-messaging/recurring" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "تذكير أسبوعي",
    "contact_list_id": "LIST_ID",
    "message_template": "مرحباً {{name}}، لا تنسَ زيارتنا هذا الأسبوع!",
    "frequency": "weekly",
    "scheduled_time": "09:00",
    "timezone": "Asia/Riyadh",
    "start_date": "2026-01-01"
  }'
```

---

## الخطوة 12: مراقبة وصيانة

```bash
# حالة التطبيق
pm2 status

# السجلات المباشرة
pm2 logs openwa --lines 100

# إعادة التشغيل
pm2 restart openwa

# إحصائيات الموارد
pm2 monit

# فحص قاعدة البيانات
sudo -u postgres psql openwa -c "SELECT COUNT(*) FROM contacts;"
sudo -u postgres psql openwa -c "SELECT COUNT(*) FROM bulk_messages;"

# نسخة احتياطية يومية لقاعدة البيانات
# أضف هذا لـ cron: crontab -e
# 0 2 * * * pg_dump openwa > /app/backups/openwa_$(date +%Y%m%d).sql
```

---

## حل المشكلات الشائعة

### التطبيق لا يبدأ
```bash
pm2 logs openwa --err
# تحقق من ملف .env وتأكد من صحة DATABASE_PASSWORD
```

### WhatsApp يقطع الاتصال
```bash
# أعِد مسح QR
curl -X DELETE "https://YOUR_DOMAIN.com/api/sessions/SESSION_ID" -H "X-API-Key: KEY"
# ثم أنشئ جلسة جديدة
```

### Webhook من سلة لا يصل
```bash
# تحقق من السجلات
pm2 logs openwa | grep "salla"
# تأكد أن WEBHOOK_SECRET في .env يطابق ما في لوحة سلة
```

### خطأ في قاعدة البيانات
```bash
# تشغيل migrations يدوياً
cd /app/openwa
NODE_ENV=production node -r dotenv/config \
  node_modules/.bin/typeorm migration:run \
  -d dist/database/data-source.js
```

---

## الإعدادات الموصى بها للأداء العالي (10K-100K رسالة)

```env
# في .env
QUEUE_ENABLED=true
REDIS_ENABLED=true
```

```bash
# حد الرسائل لتجنب حظر WhatsApp
# بين كل رسالة: 3-5 ثواني
# يومياً: لا تتجاوز 1000 رسالة لكل رقم
# أسبوعياً: موزّعة على أيام مختلفة
```

---

## ملاحظات أمان مهمة

1. لا تضع `ENABLE_SWAGGER=true` في الإنتاج
2. استخدم `API_MASTER_KEY` قوياً (64 حرف عشوائي)
3. فعّل `ufw` وأغلق جميع المنافذ غير الضرورية
4. فعّل fail2ban لمنع هجمات brute-force
5. لا تحفظ `.env` في Git (تأكد أنه في `.gitignore`)
