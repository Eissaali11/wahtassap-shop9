# 🏗️ معمارية النظام الشاملة

## 📊 مخطط العلاقات بين الجداول

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      DATABASE SCHEMA - قاعدة البيانات                    │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│    session       │ (جلسة WhatsApp)
│──────────────────│
│ id (UUID)        │
│ name             │
│ status           │
│ phone            │
│ created_at       │
└────────┬─────────┘
         │ 1:N
         │
         ├─────────────────────────────────┐
         │                                 │
         ▼                                 ▼
    ┌─────────────────────┐      ┌──────────────────────┐
    │  contact_lists      │      │ recurring_messages   │
    │─────────────────────│      │──────────────────────│
    │ id (UUID)           │      │ id (UUID)            │
    │ session_id (FK)     │      │ session_id (FK)      │
    │ name                │      │ title                │
    │ description         │      │ message_template     │
    │ contact_count       │      │ frequency (daily)    │
    │ source (enum)       │      │ scheduled_time       │
    │ created_at          │      │ is_active            │
    └────────┬────────────┘      │ last_sent_at         │
             │ 1:N               │ created_at           │
             │                   └──────────────────────┘
             ▼
      ┌──────────────┐
      │   contacts   │ (جهات الاتصال)
      │──────────────│
      │ id (UUID)    │
      │ list_id (FK) │
      │ phone        │
      │ name         │
      │ email        │
      │ city         │
      │ custom_data  │ (JSON)
      │ created_at   │
      └──────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                 BULK MESSAGES FLOW - تدفق الرسائل الجماعية                │
└─────────────────────────────────────────────────────────────────────────┘

session_id
    │
    ▼
┌──────────────────────┐
│   bulk_messages      │ (الرسالة الجماعية)
│──────────────────────│
│ id (UUID)            │
│ session_id (FK)      │
│ contact_list_id (FK) │◄──────┐
│ title                │       │
│ message_template     │       │
│ message_type         │  1:1  │
│ media_url            │       │
│ total_contacts       │       │
│ sent_count           │  ┌─────────────────┐
│ failed_count         │  │ contact_lists   │
│ pending_count        │  │─────────────────│
│ status (enum)        │  │ id              │
│ scheduled_at         │  │ contact_count   │
│ started_at           │  └─────────────────┘
│ completed_at         │
└────────┬─────────────┘
         │ 1:N
         │
         ▼
┌────────────────────────┐
│   message_logs         │ (سجلات الرسائل)
│────────────────────────│
│ id (UUID)              │
│ bulk_message_id (FK)   │
│ contact_id (FK)        │
│ phone                  │
│ message_text           │
│ status (sent/failed)   │
│ error_message          │
│ sent_at                │
│ created_at             │
└────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│              ABANDONED CARTS INTEGRATION - تكامل السلات المتروكة           │
└─────────────────────────────────────────────────────────────────────────┘

Salla Webhook Event
    │
    ▼
┌──────────────────────────┐
│  salla-webhook.controller│
│──────────────────────────│
│ Receives: cart-abandoned │
│ Extracts: customer data  │
│ Verifies: webhook sig    │
│ Stores: in abandoned_carts
└────────┬─────────────────┘
         │
         ├─────────────────────────────────┐
         │                                 │
         ▼                                 ▼
    ┌─────────────────────┐      ┌───────────────────┐
    │ abandoned_carts     │      │ contacts (NEW)    │
    │─────────────────────│      │───────────────────│
    │ id                  │      │ Added to list     │
    │ session_id          │      │ Phone number      │
    │ customer_phone      │      │ Customer name     │
    │ customer_name       │      │ Email             │
    │ customer_email      │      │ Custom data       │
    │ cart_items (JSON)   │      └───────────────────┘
    │ cart_total          │
    │ reminder_sent       │
    │ reminder_sent_at    │
    │ created_at          │
    └─────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                    JOBS QUEUE SYSTEM - نظام الجدولة                       │
└─────────────────────────────────────────────────────────────────────────┘

Job Created
    │
    ▼
┌──────────────────────────┐
│        jobs (Queue)      │
│──────────────────────────│
│ id (UUID)                │
│ job_type (enum)          │
│ data (JSON)              │
│ status (pending/done)    │
│ attempts                 │
│ max_attempts             │
│ error_message            │
│ scheduled_at             │
│ started_at               │
│ completed_at             │
│ created_at               │
└──────────────────────────┘
    │
    ├─ send_bulk_message
    ├─ send_recurring_message
    └─ sync_abandoned_carts
```

---

## 🔄 سير العمل - Workflows

### 1️⃣ Workflow: إنشاء وإرسال رسالة جماعية

```
User
  │
  ├─ 1. Create Contact List
  │  └─ POST /api/sessions/{id}/bulk/contact-lists
  │     └─ ✅ Contact List Created
  │
  ├─ 2. Import Contacts
  │  ├─ POST /api/.../contact-lists/{id}/contacts/bulk
  │  └─ Upload Excel File
  │     └─ ✅ 150 Contacts Imported
  │
  ├─ 3. Create Bulk Message
  │  └─ POST /api/sessions/{id}/bulk/messages
  │     └─ ✅ Message Created (Draft)
  │
  └─ 4. Send Message
     └─ POST /api/sessions/{id}/bulk/messages/{id}/send
        └─ Start Async Process
           ├─ Create Job
           ├─ Iterate Contacts
           ├─ Send via WhatsApp (with delay)
           ├─ Log Each Send
           ├─ Update Statistics
           └─ Mark as Completed
```

### 2️⃣ Workflow: Salla Abandoned Cart

```
Customer Abandons Cart
  │
  ▼
Salla Webhook Triggered
  │
  ▼
salla-webhook.controller
  ├─ Verify Signature
  ├─ Extract Cart & Customer Data
  ├─ Store in abandoned_carts
  ├─ Add Customer to Contact List
  │
  └─ Schedule Reminder
     └─ After 1 hour
        └─ Send WhatsApp Reminder
           └─ Update reminder_sent flag
```

### 3️⃣ Workflow: Recurring Message

```
Recurring Message Created
  │
  ├─ Title: "Daily Offer"
  ├─ Frequency: daily
  ├─ Time: 09:00 AM
  └─ is_active: true
     │
     ▼
  Cron Job Triggers at 09:00
     │
     ├─ Get Message Template
     ├─ Get Contact List
     ├─ Render Template with Contact Data
     ├─ Create Bulk Message
     ├─ Send All (with delay)
     └─ Update last_sent_at
```

---

## 🌐 معمارية الخدمات

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  React Dashboard  │  Browser  │  Mobile Responsive               │
└────────────┬──────────────────────────────────────────────────┬─┘
             │ HTTPS                                           │ HTTPS
             ▼                                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Nginx Reverse Proxy                           │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ - SSL/TLS Termination                                   │    │
│  │ - Rate Limiting                                         │    │
│  │ - GZIP Compression                                      │    │
│  │ - WebSocket Support (socket.io)                         │    │
│  │ - Security Headers                                      │    │
│  │ - Static File Caching                                   │    │
│  └──────────────────────────────────────────────────────────┘    │
└────────────┬──────────────────────────────────────────────────┬──┘
             │ :2785 (API)                                   │ :2886 (Dashboard)
             ▼                                                 ▼
┌──────────────────────────────┐              ┌──────────────────────────┐
│   NestJS API Server          │              │  React Dev Server        │
│  ┌──────────────────────────┐│              │  ┌────────────────────┐  │
│  │ Controllers              ││              │  │ Vite Build Server  │  │
│  ├──────────────────────────┤│              │  ├────────────────────┤  │
│  │ - SessionController      ││              │  │ - Dashboard Pages  │  │
│  │ - BulkMessagingController││              │  │ - Navigation       │  │
│  │ - WebhookController      ││              │  │ - Forms            │  │
│  │ - MessageController      ││              │  │ - Charts/Stats     │  │
│  └──────────────────────────┘│              │  └────────────────────┘  │
│  ┌──────────────────────────┐│              └──────────────────────────┘
│  │ Services                 ││
│  ├──────────────────────────┤│
│  │ - SessionService         ││
│  │ - BulkMessagingService   ││
│  │ - WhatsAppAdapter        ││
│  │ - ExcelParser            ││
│  │ - WebhookValidator       ││
│  └──────────────────────────┘│
│  ┌──────────────────────────┐│
│  │ Middleware               ││
│  ├──────────────────────────┤│
│  │ - Authentication         ││
│  │ - Logging                ││
│  │ - Error Handling         ││
│  │ - Rate Limiting          ││
│  └──────────────────────────┘│
└────────┬───────────────────────┘
         │
         ├────────┬───────────┬─────────────┐
         │        │           │             │
         ▼        ▼           ▼             ▼
     ┌────┐  ┌──────┐  ┌────────┐  ┌──────────┐
     │ DB │  │Redis │  │Salla   │  │WhatsApp  │
     │    │  │Cache │  │API     │  │Engine    │
     └────┘  └──────┘  └────────┘  └──────────┘
```

---

## 📱 User Journey - رحلة المستخدم

### للمتجر الإلكتروني (Salla)

```
Store Owner
    │
    ├─ 1. Setup Phase
    │  └─ Connect WhatsApp Session
    │     └─ Scan QR Code
    │        └─ Session Active ✅
    │
    ├─ 2. Configuration Phase
    │  ├─ Add Salla Webhook URLs
    │  ├─ Configure API Keys
    │  └─ Set Message Templates
    │     └─ All Set ✅
    │
    └─ 3. Automatic Operations
       ├─ Customer Buys → Order Confirmation
       ├─ Customer Abandons Cart → Abandoned Cart Reminder
       ├─ New Customer Signup → Welcome Message
       └─ Daily/Weekly Messages → Scheduled Broadcasts
          └─ All Automatic ✅
```

### للمسوقين والفرق الكبيرة

```
Marketing Team
    │
    ├─ 1. Create Campaign
    │  ├─ Upload Customer List (Excel)
    │  └─ Create Message Template
    │     └─ with personalization
    │
    ├─ 2. Configure & Test
    │  ├─ Preview Messages
    │  ├─ Set Sending Rate
    │  └─ Schedule Send Time
    │
    ├─ 3. Monitor & Analyze
    │  ├─ Live Statistics Dashboard
    │  ├─ Delivery Rate %
    │  ├─ Error Tracking
    │  └─ Export Reports
    │
    └─ 4. Recurring Campaigns
       ├─ Daily Offers
       ├─ Weekly Newsletter
       └─ Monthly Promotions
```

---

## 🔐 Security Architecture - معمارية الأمان

```
┌─────────────────────────────────────────────────────────────────┐
│                        SECURITY LAYERS                           │
└─────────────────────────────────────────────────────────────────┘

Layer 1: Network Security
├─ SSL/TLS (HTTPS only)
├─ Firewall Rules
├─ IP Whitelist/Blacklist
└─ DDoS Protection (Nginx)

Layer 2: API Security
├─ API Key Authentication (X-API-Key header)
├─ JWT Token Support
├─ Rate Limiting per IP
└─ CORS Configuration

Layer 3: Data Security
├─ Database Encryption
├─ Encrypted API Keys Storage
├─ Password Hashing (bcrypt)
└─ Sensitive Data Encryption

Layer 4: Application Security
├─ Input Validation
├─ SQL Injection Prevention (TypeORM)
├─ XSS Protection
├─ CSRF Tokens
└─ Request Signing (Webhook Verification)

Layer 5: Infrastructure Security
├─ Firewall (UFW)
├─ SSH Key-based Auth
├─ User Permissions (chmod)
├─ Log Monitoring
└─ Intrusion Detection
```

---

## 📈 Performance Optimization

```
Caching Strategy:
├─ Redis for:
│  ├─ Session Data
│  ├─ Contact Lists (frequently accessed)
│  └─ Message Templates
│
└─ HTTP Caching:
   ├─ Static Assets (1 day)
   ├─ API Responses (1 min)
   └─ Dashboard (no cache)

Database Optimization:
├─ Indexes on:
│  ├─ phone (contacts)
│  ├─ status (messages)
│  ├─ session_id (all tables)
│  └─ created_at (time ranges)
│
└─ Connection Pooling:
   └─ Max 20 connections

Request Optimization:
├─ GZIP Compression
├─ Minified Assets
├─ CDN for Static Files (optional)
└─ Pagination for Large Datasets
```

---

## 🚀 Deployment Architecture

```
Hostinger VPS
│
├─ Operating System: Ubuntu 20.04 LTS
│
├─ Services:
│  ├─ Nginx (Port 80, 443)
│  ├─ Node.js (Port 2785)
│  ├─ React Dev (Port 2886)
│  ├─ PostgreSQL (Port 5432)
│  └─ Redis (Port 6379)
│
├─ Process Management: PM2
│  └─ Auto-restart on crash
│     └─ Logs to /home/openwa/.pm2/logs
│
├─ SSL/TLS: Let's Encrypt
│  └─ Auto-renewal (Certbot)
│
├─ Monitoring:
│  ├─ PM2 Monit
│  ├─ Nginx Logs
│  ├─ Application Logs
│  └─ System Resources (free, df)
│
└─ Backups:
   ├─ Database (daily)
   ├─ Application (git)
   └─ Configuration (manual)
```

---

## 📊 Database Performance

### Indexes
```sql
-- Contact Search
CREATE INDEX idx_contacts_phone 
ON contacts(phone);

CREATE INDEX idx_contacts_list_id 
ON contacts(contact_list_id);

-- Message Tracking
CREATE INDEX idx_bulk_messages_status 
ON bulk_messages(status);

CREATE INDEX idx_message_logs_status 
ON message_logs(status);

-- Job Processing
CREATE INDEX idx_jobs_status 
ON jobs(status);
```

### Query Optimization
```typescript
// ✅ Good: Uses indexes
SELECT * FROM message_logs 
WHERE bulk_message_id = ? AND status = 'sent'
ORDER BY created_at DESC
LIMIT 50;

// ❌ Avoid: Full table scan
SELECT * FROM message_logs 
WHERE error_message LIKE '%timeout%'
```

---

**معمارية شاملة وآمنة وقابلة للتوسع! 🎯**
