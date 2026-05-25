# 📘 دليل استخدام APIs الإرسال الجماعي

## 🚀 البدء السريع

### المتطلبات الأساسية:
```
Base URL: https://your-domain.com/api
Header: X-API-Key: your-api-key
Content-Type: application/json
```

---

## 📋 إدارة قوائم جهات الاتصال

### 1️⃣ إنشاء قائمة جهات اتصال جديدة

**الطلب:**
```bash
POST /api/sessions/{sessionId}/bulk/contact-lists
```

**مثال:**
```bash
curl -X POST https://your-domain.com/api/sessions/b0c4e93c-5026-4893-984b-1639c3b04f61/bulk/contact-lists \
  -H "X-API-Key: dev-admin-key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "قائمة عملاء Salla",
    "description": "جهات اتصال عملاء متجر Salla",
    "source": "salla_webhook"
  }'
```

**الرد الناجح (201):**
```json
{
  "statusCode": 201,
  "message": "Contact list created successfully",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "session_id": "b0c4e93c-5026-4893-984b-1639c3b04f61",
    "name": "قائمة عملاء Salla",
    "description": "جهات اتصال عملاء متجر Salla",
    "contact_count": 0,
    "source": "salla_webhook",
    "created_at": "2026-05-25T20:20:00Z",
    "updated_at": "2026-05-25T20:20:00Z"
  }
}
```

---

### 2️⃣ الحصول على قائمة القوائم

**الطلب:**
```bash
GET /api/sessions/{sessionId}/bulk/contact-lists?page=1&limit=10
```

**مثال:**
```bash
curl -X GET "https://your-domain.com/api/sessions/b0c4e93c-5026-4893-984b-1639c3b04f61/bulk/contact-lists?page=1&limit=10" \
  -H "X-API-Key: dev-admin-key"
```

**الرد الناجح (200):**
```json
{
  "statusCode": 200,
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "قائمة عملاء Salla",
      "contact_count": 150,
      "source": "salla_webhook",
      "created_at": "2026-05-25T20:20:00Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "pages": 1
  }
}
```

---

### 3️⃣ حذف قائمة جهات اتصال

**الطلب:**
```bash
DELETE /api/sessions/{sessionId}/bulk/contact-lists/{listId}
```

**مثال:**
```bash
curl -X DELETE https://your-domain.com/api/sessions/b0c4e93c-5026-4893-984b-1639c3b04f61/bulk/contact-lists/123e4567-e89b-12d3-a456-426614174000 \
  -H "X-API-Key: dev-admin-key"
```

---

## 👥 إدارة جهات الاتصال

### 1️⃣ إضافة جهة اتصال واحدة

**الطلب:**
```bash
POST /api/sessions/{sessionId}/bulk/contact-lists/{listId}/contacts
```

**مثال:**
```bash
curl -X POST https://your-domain.com/api/sessions/b0c4e93c-5026-4893-984b-1639c3b04f61/bulk/contact-lists/123e4567-e89b-12d3-a456-426614174000/contacts \
  -H "X-API-Key: dev-admin-key" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "966501234567",
    "name": "محمد السعيد",
    "email": "test@example.com",
    "city": "الرياض",
    "custom_data": {
      "customer_id": "cust123",
      "order_count": 5
    }
  }'
```

**الرد الناجح (201):**
```json
{
  "statusCode": 201,
  "message": "Contact added successfully",
  "data": {
    "id": "456e7890-f12c-34e5-b789-739725285111",
    "contact_list_id": "123e4567-e89b-12d3-a456-426614174000",
    "phone": "966501234567",
    "name": "محمد السعيد",
    "email": "test@example.com",
    "city": "الرياض",
    "custom_data": {
      "customer_id": "cust123",
      "order_count": 5
    },
    "created_at": "2026-05-25T20:25:00Z"
  }
}
```

---

### 2️⃣ إضافة عدة جهات اتصال دفعة واحدة

**الطلب:**
```bash
POST /api/sessions/{sessionId}/bulk/contact-lists/{listId}/contacts/bulk
```

**مثال:**
```bash
curl -X POST https://your-domain.com/api/sessions/b0c4e93c-5026-4893-984b-1639c3b04f61/bulk/contact-lists/123e4567-e89b-12d3-a456-426614174000/contacts/bulk \
  -H "X-API-Key: dev-admin-key" \
  -H "Content-Type: application/json" \
  -d '{
    "contacts": [
      {
        "phone": "966501111111",
        "name": "أحمد محمد",
        "email": "ahmad@example.com",
        "city": "جدة"
      },
      {
        "phone": "966502222222",
        "name": "فاطمة علي",
        "email": "fatima@example.com",
        "city": "الدمام"
      },
      {
        "phone": "966503333333",
        "name": "سارة حسن",
        "email": "sarah@example.com",
        "city": "المدينة"
      }
    ]
  }'
```

**الرد الناجح (201):**
```json
{
  "statusCode": 201,
  "message": "3 contacts added successfully",
  "data": {
    "added": 3,
    "skipped": 0,
    "total_in_list": 153
  }
}
```

---

### 3️⃣ استيراد جهات اتصال من ملف Excel

**الطلب:**
```bash
POST /api/sessions/{sessionId}/bulk/contact-lists/{listId}/import-excel
```

**مثال (باستخدام curl):**
```bash
curl -X POST https://your-domain.com/api/sessions/b0c4e93c-5026-4893-984b-1639c3b04f61/bulk/contact-lists/123e4567-e89b-12d3-a456-426614174000/import-excel \
  -H "X-API-Key: dev-admin-key" \
  -F "file=@contacts.xlsx"
```

**صيغة ملف Excel المتوقعة:**
```
| الهاتف (A)  | الاسم (B)      | البريد (C)          | المدينة (D) |
|------------|----------------|-------------------|-----------|
| 966501111111 | أحمد محمد     | ahmad@example.com | جدة      |
| 966502222222 | فاطمة علي     | fatima@example.com | الدمام   |
| 966503333333 | سارة حسن      | sarah@example.com | المدينة  |
```

**الرد الناجح (201):**
```json
{
  "statusCode": 201,
  "message": "Contacts imported successfully",
  "data": {
    "imported": 100,
    "invalid": 2,
    "total_in_list": 253
  }
}
```

---

## 📨 إرسال الرسائل الجماعية

### 1️⃣ إنشاء رسالة جماعية

**الطلب:**
```bash
POST /api/sessions/{sessionId}/bulk/messages
```

**مثال:**
```bash
curl -X POST https://your-domain.com/api/sessions/b0c4e93c-5026-4893-984b-1639c3b04f61/bulk/messages \
  -H "X-API-Key: dev-admin-key" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "عرض خاص للعملاء",
    "contact_list_id": "123e4567-e89b-12d3-a456-426614174000",
    "message_template": "أهلاً {{name}}! \n\nلدينا عرض خاص لك! \nاستخدم الرابط التالي: https://your-store.com/offers",
    "message_type": "text",
    "scheduled_at": "2026-05-26T10:00:00Z"
  }'
```

**الرد الناجح (201):**
```json
{
  "statusCode": 201,
  "message": "Bulk message created successfully",
  "data": {
    "id": "789abc12-def4-567e-8f90-abcd1234ef56",
    "session_id": "b0c4e93c-5026-4893-984b-1639c3b04f61",
    "title": "عرض خاص للعملاء",
    "contact_list_id": "123e4567-e89b-12d3-a456-426614174000",
    "message_type": "text",
    "total_contacts": 150,
    "sent_count": 0,
    "failed_count": 0,
    "pending_count": 150,
    "status": "scheduled",
    "scheduled_at": "2026-05-26T10:00:00Z",
    "created_at": "2026-05-25T20:30:00Z"
  }
}
```

---

### 2️⃣ بدء إرسال الرسالة الجماعية

**الطلب:**
```bash
POST /api/sessions/{sessionId}/bulk/messages/{messageId}/send
```

**مثال:**
```bash
curl -X POST https://your-domain.com/api/sessions/b0c4e93c-5026-4893-984b-1639c3b04f61/bulk/messages/789abc12-def4-567e-8f90-abcd1234ef56/send \
  -H "X-API-Key: dev-admin-key" \
  -H "Content-Type: application/json" \
  -d '{
    "delay_ms": 100
  }'
```

**الرد الناجح (200):**
```json
{
  "statusCode": 200,
  "message": "Bulk message sending started",
  "data": {
    "message_id": "789abc12-def4-567e-8f90-abcd1234ef56",
    "total_contacts": 150
  }
}
```

---

### 3️⃣ الحصول على حالة الرسالة والإحصائيات

**الطلب:**
```bash
GET /api/sessions/{sessionId}/bulk/messages/{messageId}
```

**مثال:**
```bash
curl -X GET https://your-domain.com/api/sessions/b0c4e93c-5026-4893-984b-1639c3b04f61/bulk/messages/789abc12-def4-567e-8f90-abcd1234ef56 \
  -H "X-API-Key: dev-admin-key"
```

**الرد الناجح (200):**
```json
{
  "statusCode": 200,
  "data": {
    "id": "789abc12-def4-567e-8f90-abcd1234ef56",
    "title": "عرض خاص للعملاء",
    "status": "processing",
    "total_contacts": 150,
    "sent_count": 45,
    "failed_count": 2,
    "pending_count": 103,
    "started_at": "2026-05-25T20:30:30Z"
  },
  "stats": {
    "sent": 45,
    "failed": 2,
    "pending": 103,
    "total": 150,
    "percentage_sent": 30
  }
}
```

---

### 4️⃣ الحصول على سجلات الرسائل

**الطلب:**
```bash
GET /api/sessions/{sessionId}/bulk/messages/{messageId}/logs?page=1&limit=50&status=sent
```

**مثال:**
```bash
curl -X GET "https://your-domain.com/api/sessions/b0c4e93c-5026-4893-984b-1639c3b04f61/bulk/messages/789abc12-def4-567e-8f90-abcd1234ef56/logs?page=1&limit=50&status=sent" \
  -H "X-API-Key: dev-admin-key"
```

**الرد الناجح (200):**
```json
{
  "statusCode": 200,
  "data": [
    {
      "id": "abc123-def456",
      "bulk_message_id": "789abc12-def4-567e-8f90-abcd1234ef56",
      "contact_id": "456e7890-f12c-34e5-b789-739725285111",
      "phone": "966501234567",
      "message_text": "أهلاً محمد السعيد! \n\nلدينا عرض خاص لك!...",
      "status": "sent",
      "sent_at": "2026-05-25T20:31:00Z",
      "created_at": "2026-05-25T20:30:30Z"
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 50,
    "pages": 1
  }
}
```

---

## 🔄 الرسائل الدورية (Recurring Messages)

### 1️⃣ إنشاء رسالة دورية

**الطلب:**
```bash
POST /api/sessions/{sessionId}/bulk/recurring-messages
```

**مثال (رسالة يومية):**
```bash
curl -X POST https://your-domain.com/api/sessions/b0c4e93c-5026-4893-984b-1639c3b04f61/bulk/recurring-messages \
  -H "X-API-Key: dev-admin-key" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "تذكير يومي بالعروض الجديدة",
    "contact_list_id": "123e4567-e89b-12d3-a456-426614174000",
    "message_template": "مرحباً {{name}}! تحقق من عروضنا الجديدة اليوم 🎉",
    "frequency": "daily",
    "scheduled_time": "09:00",
    "timezone": "Asia/Riyadh",
    "start_date": "2026-05-25",
    "end_date": "2026-12-31"
  }'
```

**مثال (رسالة أسبوعية):**
```bash
curl -X POST https://your-domain.com/api/sessions/b0c4e93c-5026-4893-984b-1639c3b04f61/bulk/recurring-messages \
  -H "X-API-Key: dev-admin-key" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "نشرة أسبوعية",
    "contact_list_id": "123e4567-e89b-12d3-a456-426614174000",
    "message_template": "النشرة الأسبوعية: أحدث المنتجات والعروض 📰",
    "frequency": "weekly",
    "scheduled_time": "18:00",
    "timezone": "Asia/Riyadh",
    "start_date": "2026-05-25",
    "end_date": null
  }'
```

**الرد الناجح (201):**
```json
{
  "statusCode": 201,
  "message": "Recurring message created successfully",
  "data": {
    "id": "def567-ghi789",
    "title": "تذكير يومي بالعروض الجديدة",
    "frequency": "daily",
    "scheduled_time": "09:00",
    "timezone": "Asia/Riyadh",
    "is_active": true,
    "start_date": "2026-05-25",
    "end_date": "2026-12-31",
    "last_sent_at": null,
    "created_at": "2026-05-25T20:35:00Z"
  }
}
```

---

### 2️⃣ تفعيل/تعطيل رسالة دورية

**الطلب:**
```bash
PUT /api/sessions/{sessionId}/bulk/recurring-messages/{messageId}/toggle
```

**مثال:**
```bash
curl -X PUT https://your-domain.com/api/sessions/b0c4e93c-5026-4893-984b-1639c3b04f61/bulk/recurring-messages/def567-ghi789/toggle \
  -H "X-API-Key: dev-admin-key"
```

**الرد الناجح (200):**
```json
{
  "statusCode": 200,
  "message": "Recurring message disabled successfully",
  "data": {
    "id": "def567-ghi789",
    "is_active": false,
    "updated_at": "2026-05-25T20:40:00Z"
  }
}
```

---

## 🛒 السلات المتروكة (Abandoned Carts)

### 1️⃣ الحصول على السلات المتروكة

**الطلب:**
```bash
GET /api/sessions/{sessionId}/bulk/abandoned-carts?page=1&limit=20
```

**مثال:**
```bash
curl -X GET "https://your-domain.com/api/sessions/b0c4e93c-5026-4893-984b-1639c3b04f61/bulk/abandoned-carts?page=1&limit=20" \
  -H "X-API-Key: dev-admin-key"
```

**الرد الناجح (200):**
```json
{
  "statusCode": 200,
  "data": [
    {
      "id": "cart123-abc",
      "session_id": "b0c4e93c-5026-4893-984b-1639c3b04f61",
      "salla_cart_id": "salla-cart-5678",
      "customer_phone": "966501234567",
      "customer_name": "محمد السعيد",
      "customer_email": "test@example.com",
      "cart_items": [
        {
          "product_id": "prod-123",
          "product_name": "حقيبة جلدية",
          "quantity": 1,
          "price": 299.99
        }
      ],
      "cart_total": 299.99,
      "reminder_sent": false,
      "created_at": "2026-05-25T15:30:00Z"
    }
  ],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 20,
    "pages": 1
  }
}
```

---

### 2️⃣ إرسال تذكير للسلة المتروكة

**الطلب:**
```bash
POST /api/sessions/{sessionId}/bulk/abandoned-carts/{cartId}/remind
```

**مثال:**
```bash
curl -X POST https://your-domain.com/api/sessions/b0c4e93c-5026-4893-984b-1639c3b04f61/bulk/abandoned-carts/cart123-abc/remind \
  -H "X-API-Key: dev-admin-key"
```

**الرد الناجح (200):**
```json
{
  "statusCode": 200,
  "message": "Reminder sent successfully",
  "data": {
    "cart_id": "cart123-abc",
    "customer_phone": "966501234567",
    "reminder_sent_at": "2026-05-25T20:45:00Z"
  }
}
```

---

## 📊 الإحصائيات

### الحصول على إحصائيات شاملة

**الطلب:**
```bash
GET /api/sessions/{sessionId}/bulk/statistics
```

**مثال:**
```bash
curl -X GET https://your-domain.com/api/sessions/b0c4e93c-5026-4893-984b-1639c3b04f61/bulk/statistics \
  -H "X-API-Key: dev-admin-key"
```

**الرد الناجح (200):**
```json
{
  "statusCode": 200,
  "data": {
    "total_messages": 15,
    "total_contacts": 850,
    "total_contact_lists": 5,
    "total_messages_sent": 1250,
    "total_messages_failed": 12,
    "active_recurring_messages": 3,
    "abandoned_carts": 18
  }
}
```

---

## ⚠️ معالجة الأخطاء

### الأخطاء الشائعة:

#### 400 Bad Request - تنسيق الطلب غير صحيح
```json
{
  "statusCode": 400,
  "message": "Invalid phone number format",
  "error": "Bad Request"
}
```

**الحل:** تحقق من صيغة الهاتف. يجب أن تكون بصيغة دولية مثل `966501234567` أو `00966501234567`

---

#### 401 Unauthorized - مفتاح API غير صحيح
```json
{
  "statusCode": 401,
  "message": "Invalid API key",
  "error": "Unauthorized"
}
```

**الحل:** تأكد من إرسال مفتاح API الصحيح في الـ Header

---

#### 404 Not Found - المورد غير موجود
```json
{
  "statusCode": 404,
  "message": "Contact list not found",
  "error": "Not Found"
}
```

**الحل:** تأكد من أن معرّف المورد صحيح ومكتمل

---

#### 500 Internal Server Error - خطأ في الخادم
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

**الحل:** تحقق من سجلات الخادم أو اتصل بالدعم

---

## 🔐 أفضل الممارسات الأمنية

1. **لا تشارك مفتاح API:** احفظه في متغيرات البيئة فقط
2. **استخدم HTTPS:** تأكد من أن جميع الاتصالات مشفرة
3. **تحقق من الصلاحيات:** تأكد من أن المستخدم له صلاحية الوصول
4. **رجّل الطلبات:** استخدم Rate Limiting لتجنب الإساءة
5. **عّمّ السجلات:** احتفظ بسجلات جميع العمليات المهمة

---

## 💡 نصائح وحيل

### تحسين الأداء:
- استخدم `bulk` endpoint لإضافة عدة جهات اتصال دفعة واحدة
- اجعل التأخير بين الرسائل حوالي 100-200ms لتجنب الحظر
- استخدم Cron Jobs لجدولة الرسائل الدورية

### الامتثال لقوانين WhatsApp:
- لا تتجاوز حد الرسائل اليومي
- لا تحتفظ برقم العميل إلا بموافقته
- اتبع سياسة عدم البث المزعج
- وفر خيار إلغاء الاشتراك في الرسائل

---

## 📞 الدعم

للمساعدة أو الأسئلة:
- 📧 البريد: support@example.com
- 💬 الدردشة: https://your-domain.com/support
- 📚 الوثائق: https://your-domain.com/api/docs

---

**آخر تحديث: 2026-05-25**
**الإصدار: 1.0.0**
