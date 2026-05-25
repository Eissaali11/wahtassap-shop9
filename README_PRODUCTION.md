# 🚀 OpenWA - نظام إدارة WhatsApp API متقدم

> **نظام تكامل كامل لـ WhatsApp مع دعم الإرسال الجماعي والرسائل الدورية وتكامل Salla**

## ✨ الميزات الرئيسية

### 📱 إدارة جهات الاتصال
- ✅ إنشاء وإدارة قوائم جهات اتصال متعددة
- ✅ إضافة جهات واحدة أو دفعات كبيرة
- ✅ استيراد من ملفات Excel
- ✅ بيانات مخصصة لكل جهة اتصال
- ✅ تنظيم وتصنيف العملاء

### 📨 الإرسال الجماعي المتقدم
- ✅ إرسال رسائل لآلاف العملاء بكفاءة
- ✅ رسائل شخصية ({{name}}, {{city}})
- ✅ جدولة الرسائل في أوقات محددة
- ✅ حماية من الحظر (تأخير آمن بين الرسائل)
- ✅ متابعة حالة الإرسال الفورية
- ✅ تقارير مفصلة عن النجاح والفشل

### 🔄 الرسائل الدورية
- ✅ رسائل يومية/أسبوعية/شهرية
- ✅ جدولة بالتوقيت المحلي
- ✅ تفعيل/تعطيل مرن
- ✅ تواريخ البداية والنهاية
- ✅ نموذج رسائل قابل للتخصيص

### 🛒 تكامل Salla الكامل
- ✅ معالجة حدث السلات المتروكة
- ✅ معالجة حدث الطلبات الجديدة
- ✅ معالجة حدث تغيير حالة الطلب
- ✅ معالجة حدث العملاء الجدد
- ✅ رسائل تلقائية للعملاء
- ✅ تذكيرات ذكية للسلات المتروكة

### 📊 التقارير والإحصائيات
- ✅ إحصائيات شاملة في الوقت الفعلي
- ✅ معدل النجاح والفشل
- ✅ تتبع العملاء النشطين
- ✅ تقارير مفصلة
- ✅ تصدير البيانات

---

## 🏗️ البنية التقنية

```
Frontend (React + Vite)
    ↓
Nginx Reverse Proxy (SSL/TLS)
    ↓
NestJS API Server
    ├─ Controllers
    ├─ Services
    └─ Middleware
    ↓
┌─────────────────────┬─────────────┐
│                     │             │
PostgreSQL          Redis       WhatsApp
(Data)              (Cache)     (Engine)
```

---

## 📦 المكتبات والتقنيات المستخدمة

### Backend
- **NestJS** - إطار عمل Node.js متقدم
- **TypeORM** - ORM قوي لقاعدة البيانات
- **PostgreSQL** - قاعدة بيانات موثوقة
- **Redis** - تخزين مؤقت وقوائم
- **Socket.io** - اتصالات WebSocket
- **XLSX** - معالجة ملفات Excel

### Frontend
- **React 18** - مكتبة الواجهات
- **Vite** - بناء سريع
- **TailwindCSS** - تصميم حديث
- **TypeScript** - كود آمن

### DevOps
- **Docker** - حاويات للبيئات
- **Nginx** - خادم ويب عالي الأداء
- **PM2** - إدارة العمليات
- **Let's Encrypt** - شهادات SSL مجانية

---

## 🚀 البدء السريع

### المتطلبات
- Node.js 18+
- PostgreSQL 12+
- Redis 6+
- npm أو yarn

### التثبيت المحلي

```bash
# 1. نسخ المشروع
git clone <repo-url>
cd OpenWA

# 2. تثبيت المكتبات
npm install

# 3. إعداد البيئة
cp .env.example .env
nano .env  # تعديل البيانات

# 4. تشغيل الخادم
npm run start:dev

# 5. التطبيق يعمل على:
# API: http://localhost:2785
# Dashboard: http://localhost:2886
# API Docs: http://localhost:2785/api/docs
```

---

## 📋 الملفات والمجلدات المهمة

### الملفات التوثيقية
```
📚 DEPLOYMENT_GUIDE.md      - دليل النشر على Hostinger VPS
📚 API_USAGE_GUIDE.md       - أمثلة استخدام جميع APIs
📚 ARCHITECTURE.md          - معمارية النظام الشاملة
📚 DEPLOYMENT_SUMMARY.md    - ملخص شامل للملفات والخطوات
```

### كود المشروع
```
src/
├── modules/
│   ├── bulk-messaging/          - نظام الإرسال الجماعي
│   │   ├── entities/            - نماذج قاعدة البيانات
│   │   ├── bulk-messaging.controller.ts
│   │   ├── bulk-messaging.service.ts
│   │   └── bulk-messaging.module.ts
│   ├── webhooks/                - معالجات Webhooks
│   │   └── salla-webhook.controller.ts
│   └── ... (modules أخرى)
├── database/
│   └── migrations/              - scripts قاعدة البيانات
└── main.ts
```

### ملفات الإعدادات
```
.env.production             - متغيرات الإنتاج
docker-compose.prod.yml     - Docker Compose
Dockerfile.prod             - Docker Image
nginx.conf                  - إعدادات Nginx
```

---

## 🎯 APIs الرئيسية

### إدارة جهات الاتصال
```bash
POST   /api/sessions/{sessionId}/bulk/contact-lists
GET    /api/sessions/{sessionId}/bulk/contact-lists
POST   /api/sessions/{sessionId}/bulk/contact-lists/{listId}/contacts
POST   /api/sessions/{sessionId}/bulk/contact-lists/{listId}/contacts/bulk
POST   /api/sessions/{sessionId}/bulk/contact-lists/{listId}/import-excel
DELETE /api/sessions/{sessionId}/bulk/contact-lists/{listId}
```

### الإرسال الجماعي
```bash
POST   /api/sessions/{sessionId}/bulk/messages
GET    /api/sessions/{sessionId}/bulk/messages
GET    /api/sessions/{sessionId}/bulk/messages/{messageId}
POST   /api/sessions/{sessionId}/bulk/messages/{messageId}/send
POST   /api/sessions/{sessionId}/bulk/messages/{messageId}/stop
GET    /api/sessions/{sessionId}/bulk/messages/{messageId}/logs
```

### الرسائل الدورية
```bash
POST   /api/sessions/{sessionId}/bulk/recurring-messages
GET    /api/sessions/{sessionId}/bulk/recurring-messages
PUT    /api/sessions/{sessionId}/bulk/recurring-messages/{messageId}/toggle
```

### السلات المتروكة
```bash
GET    /api/sessions/{sessionId}/bulk/abandoned-carts
POST   /api/sessions/{sessionId}/bulk/abandoned-carts/{cartId}/remind
```

### الإحصائيات
```bash
GET    /api/sessions/{sessionId}/bulk/statistics
```

---

## 🔌 Salla Webhook Integration

### Webhook URLs المطلوبة
```
POST /api/webhooks/salla/cart-abandoned        - السلات المتروكة
POST /api/webhooks/salla/order-created         - الطلبات الجديدة
POST /api/webhooks/salla/order-status-changed  - تغيير الحالة
POST /api/webhooks/salla/customer-created      - عملاء جدد
```

### الإعداد في Salla Dashboard
1. اذهب إلى **الإعدادات → Webhooks**
2. أضف URLs أعلاه
3. أضف `WEBHOOK_SECRET` من ملف `.env`
4. اختبر الـ Webhooks

---

## 📊 نموذج قاعدة البيانات

### الجداول الأساسية
- **contact_lists** - قوائم جهات الاتصال
- **contacts** - جهات الاتصال الفردية
- **bulk_messages** - الرسائل الجماعية
- **message_logs** - سجلات الرسائل
- **recurring_messages** - الرسائل الدورية
- **abandoned_carts** - السلات المتروكة
- **jobs** - نظام الجدولة

---

## 🔐 أمان وحماية

### SSL/TLS
- شهادات Let's Encrypt مجانية
- تجديد تلقائي

### Authentication
- API Key الإنتاج
- JWT Tokens
- Webhook Signature Verification

### Database Security
- Encrypted Passwords
- Connection Pooling
- SQL Injection Prevention

### Rate Limiting
- حماية من DDoS
- حدود الطلبات لكل IP
- حماية من الإساءة

---

## 📈 الأداء والقابلية للتوسع

### Caching
- Redis للبيانات المتكررة
- HTTP Cache للـ Static Assets
- Database Connection Pooling

### Database Optimization
- Indexes على الأعمدة الحيوية
- Pagination للبيانات الكبيرة
- Query Optimization

### Load Balancing
- Nginx Load Balancer
- Multiple Node.js Instances (optional)
- Redis Cluster (optional)

---

## 🛠️ أدوات التطوير

### Testing
```bash
npm run test          # تشغيل الاختبارات
npm run test:cov      # تقرير التغطية
```

### Linting
```bash
npm run lint          # فحص الكود
npm run format        # تنسيق الكود
```

### Building
```bash
npm run build         # بناء الإنتاج
npm run start:prod    # تشغيل الإنتاج
```

---

## 📱 صيغة أرقام الهاتف

### السعودية
```
✅ 966501234567     (مع رمز الدولة)
✅ 0501234567       (الصيغة المحلية)
✅ +966501234567    (مع علامة الجمع)
```

**يتم التحويل تلقائياً إلى:** `966501234567@c.us`

---

## 🎯 حدود الإرسال الآمنة

### لتجنب الحظر من WhatsApp
```
اليومي:   max 1,000 رسالة
الساعي:   max 100 رسالة
التأخير:  100-200ms بين الرسائل
```

---

## 📚 التوثيق المتاحة

| الملف | الوصف |
|------|-------|
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | نشر على Hostinger VPS (900+ سطر) |
| [API_USAGE_GUIDE.md](./API_USAGE_GUIDE.md) | أمثلة استخدام APIs (800+ سطر) |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | معمارية النظام الكاملة |
| [DEPLOYMENT_SUMMARY.md](./DEPLOYMENT_SUMMARY.md) | ملخص الملفات والخطوات |

---

## 🔄 سير الأمور

### 1. إرسالة جماعية
```
1. Create Contact List
2. Import Contacts (Excel)
3. Create Message
4. Send (async)
5. Monitor Stats
```

### 2. Salla Integration
```
1. Customer Action
2. Salla Webhook
3. Auto Store in DB
4. Auto Send Message
5. Track Results
```

### 3. Recurring Message
```
1. Create Template
2. Set Schedule
3. Auto Trigger Daily
4. Send to All
5. Log Results
```

---

## 🚨 المتطلبات الأساسية

### Hosting
- **Hostinger VPS** أو أي VPS بـ:
  - 2+ CPU Cores
  - 2GB+ RAM
  - 20GB+ SSD Storage

### Software
- Ubuntu 20.04+ LTS
- Node.js 18+
- PostgreSQL 12+
- Redis 6+
- Nginx

### Domains
- نطاق (Domain Name)
- شهادة SSL
- DNS Configuration

---

## 📞 الدعم والمساعدة

### للأسئلة التقنية
- 📧 البريد: support@example.com
- 📚 الوثائق: `/api/docs` بعد النشر
- 🔗 الموقع: https://your-domain.com

### الإبلاغ عن المشاكل
- 🐛 GitHub Issues
- 💬 البريد الإلكتروني

---

## 📄 الترخيص

هذا المشروع مرخص تحت **MIT License**

---

## 🙏 شكراً لاستخدامك OpenWA!

### نصائح للبدء الناجح
1. ✅ اقرأ `DEPLOYMENT_GUIDE.md` بالكامل
2. ✅ اتبع الخطوات خطوة بخطوة
3. ✅ احفظ كل كلمات السر في مكان آمن
4. ✅ اختبر في بيئة محلية أولاً
5. ✅ استخدم HTTPS في الإنتاج
6. ✅ عمّل النسخ الاحتياطية

---

## 📈 الإحصائيات

| المقياس | القيمة |
|--------|--------|
| عدد الملفات الجديدة | 12+ |
| سطور الكود | 4000+ |
| APIs الجديدة | 20+ |
| جداول قاعدة البيانات | 7 |
| Webhooks | 4 |
| صفحات التوثيق | 10+ |

---

**تم إنشاؤه بـ ❤️ للعاملين في مجال التسويق والتجارة الإلكترونية**

**آخر تحديث: 25 مايو 2026**
**الإصدار: 1.0.0**
