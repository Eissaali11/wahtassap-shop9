import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ContactList, Contact, BulkMessage, MessageLog, RecurringMessage, AbandonedCart, Job } from './entities';
import { SessionService } from '../session/session.service';
import { SessionStatus } from '../session/entities/session.entity';

/**
 * 📨 خدمة الإرسال الجماعي والدوري
 * Service for bulk messaging, recurring messages, and abandoned cart reminders
 */
@Injectable()
export class BulkMessagingService {
  private readonly logger = new Logger('BulkMessagingService');
  private readonly EXCEL_UPLOAD_DIR = path.join(process.cwd(), 'data', 'excel-imports');

  constructor(
    @InjectRepository(ContactList, 'data')
    private readonly contactListRepo: Repository<ContactList>,
    @InjectRepository(Contact, 'data')
    private readonly contactRepo: Repository<Contact>,
    @InjectRepository(BulkMessage, 'data')
    private readonly bulkMessageRepo: Repository<BulkMessage>,
    @InjectRepository(MessageLog, 'data')
    private readonly messageLogRepo: Repository<MessageLog>,
    @InjectRepository(RecurringMessage, 'data')
    private readonly recurringMessageRepo: Repository<RecurringMessage>,
    @InjectRepository(AbandonedCart, 'data')
    private readonly abandonedCartRepo: Repository<AbandonedCart>,
    @InjectRepository(Job, 'data')
    private readonly jobRepo: Repository<Job>,
    private readonly sessionService: SessionService,
  ) {
    this.ensureUploadDirExists();
  }

  // ============================================
  // 📋 Contact List Management
  // ============================================

  /**
   * إنشاء قائمة جهات اتصال جديدة
   */
  async createContactList(
    sessionId: string,
    data: {
      name: string;
      description?: string;
      source?: 'manual' | 'excel' | 'salla_webhook' | 'api';
    },
  ) {
    // التحقق من وجود الجلسة
    await this.sessionService.findOne(sessionId);

    const contactList = this.contactListRepo.create({
      session_id: sessionId,
      name: data.name,
      description: data.description,
      source: data.source || 'manual',
    });

    await this.contactListRepo.save(contactList);

    return {
      statusCode: 201,
      message: 'Contact list created successfully',
      data: contactList,
    };
  }

  /**
   * الحصول على قائمة القوائم
   */
  async getContactLists(sessionId: string, page: number = 1, limit: number = 10) {
    const [data, total] = await this.contactListRepo.findAndCount({
      where: { session_id: sessionId },
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });

    return {
      statusCode: 200,
      data,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * الحصول على قائمة مع جهات الاتصال الخاصة بها
   */
  async getContactListWithContacts(sessionId: string, listId: string) {
    const contactList = await this.contactListRepo.findOne({
      where: { id: listId, session_id: sessionId },
      relations: ['contacts'],
    });

    if (!contactList) {
      throw new NotFoundException('Contact list not found');
    }

    return {
      statusCode: 200,
      data: contactList,
    };
  }

  /**
   * تحديث قائمة جهات الاتصال
   */
  async updateContactList(listId: string, data: { name?: string; description?: string }) {
    const contactList = await this.contactListRepo.findOne({ where: { id: listId } });

    if (!contactList) {
      throw new NotFoundException('Contact list not found');
    }

    Object.assign(contactList, data);
    await this.contactListRepo.save(contactList);

    return {
      statusCode: 200,
      message: 'Contact list updated successfully',
      data: contactList,
    };
  }

  /**
   * حذف قائمة جهات الاتصال
   */
  async deleteContactList(listId: string) {
    const result = await this.contactListRepo.delete(listId);

    if (result.affected === 0) {
      throw new NotFoundException('Contact list not found');
    }

    return {
      statusCode: 200,
      message: 'Contact list deleted successfully',
    };
  }

  // ============================================
  // 👥 Contact Management
  // ============================================

  /**
   * إضافة جهة اتصال واحدة
   */
  async addContact(
    listId: string,
    data: {
      phone: string;
      name?: string;
      email?: string;
      city?: string;
      custom_data?: Record<string, any>;
    },
  ) {
    // التحقق من القائمة
    const contactList = await this.contactListRepo.findOne({ where: { id: listId } });
    if (!contactList) {
      throw new NotFoundException('Contact list not found');
    }

    // التحقق من رقم الهاتف
    if (!this.validatePhoneNumber(data.phone)) {
      throw new BadRequestException('Invalid phone number format');
    }

    // التحقق من عدم وجود الرقم مسبقاً
    const existing = await this.contactRepo.findOne({
      where: { contact_list_id: listId, phone: data.phone },
    });

    if (existing) {
      throw new BadRequestException('Phone number already exists in this list');
    }

    const contact = this.contactRepo.create({
      contact_list_id: listId,
      ...data,
    });

    await this.contactRepo.save(contact);

    // تحديث عدد جهات الاتصال
    contactList.contact_count = await this.contactRepo.count({
      where: { contact_list_id: listId },
    });
    await this.contactListRepo.save(contactList);

    return {
      statusCode: 201,
      message: 'Contact added successfully',
      data: contact,
    };
  }

  /**
   * إضافة عدة جهات اتصال دفعة واحدة
   */
  async addBulkContacts(
    listId: string,
    contacts: Array<{
      phone: string;
      name?: string;
      email?: string;
      city?: string;
      custom_data?: Record<string, any>;
    }>,
  ) {
    const contactList = await this.contactListRepo.findOne({ where: { id: listId } });
    if (!contactList) {
      throw new NotFoundException('Contact list not found');
    }

    // تصفية الأرقام الصحيحة
    const validContacts = contacts.filter(c => this.validatePhoneNumber(c.phone));

    if (validContacts.length !== contacts.length) {
      this.logger.warn(`${contacts.length - validContacts.length} invalid phone numbers found`);
    }

    // إضافة الجهات
    const savedContacts = [];
    for (const contactData of validContacts) {
      // تجاهل الأرقام المكررة
      const existing = await this.contactRepo.findOne({
        where: { contact_list_id: listId, phone: contactData.phone },
      });

      if (!existing) {
        const contact = this.contactRepo.create({
          contact_list_id: listId,
          ...contactData,
        });
        savedContacts.push(contact);
      }
    }

    if (savedContacts.length > 0) {
      await this.contactRepo.save(savedContacts);
    }

    // تحديث العدد
    contactList.contact_count = await this.contactRepo.count({
      where: { contact_list_id: listId },
    });
    await this.contactListRepo.save(contactList);

    return {
      statusCode: 201,
      message: `${savedContacts.length} contacts added successfully`,
      data: {
        added: savedContacts.length,
        skipped: contacts.length - validContacts.length,
        total_in_list: contactList.contact_count,
      },
    };
  }

  /**
   * استيراد جهات اتصال من ملف Excel
   */
  async importContactsFromExcel(listId: string, file: { buffer: Buffer; originalname?: string }) {
    const contactList = await this.contactListRepo.findOne({ where: { id: listId } });
    if (!contactList) {
      throw new NotFoundException('Contact list not found');
    }

    try {
      // قراءة ملف Excel
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet, { raw: true });

      const contacts = [];
      let invalidCount = 0;

      for (const row of rows as Record<string, any>[]) {
        // البحث الذكي عن مسميات الأعمدة الشائعة
        const phoneKey = Object.keys(row).find(k =>
          /^(phone|mobile|number|الهاتف|الجوال|رقم الجوال|رقم الهاتف|A)$/i.test(k.trim())
        ) || 'phone';

        const nameKey = Object.keys(row).find(k =>
          /^(name|full_name|fullname|الاسم|اسم العميل|الاسم الكامل|B)$/i.test(k.trim())
        ) || 'name';

        const emailKey = Object.keys(row).find(k =>
          /^(email|mail|البريد|البريد الإلكتروني|C)$/i.test(k.trim())
        ) || 'email';

        const cityKey = Object.keys(row).find(k =>
          /^(city|region|المدينة|المنطقة|D)$/i.test(k.trim())
        ) || 'city';

        let rawPhone: any = row[phoneKey];
        const name: string | undefined = row[nameKey];
        const email: string | undefined = row[emailKey];
        const city: string | undefined = row[cityKey];

        if (rawPhone) {
          // تنظيف رقم الهاتف من الفواصل، المسافات، الأقواس وعلامة +
          let phone = rawPhone.toString().replace(/\s|-|\(|\)|\+/g, '');

          // تصحيح الأرقام السعودية المحلية (مثال: تحويل 05xxxxxxx إلى 9665xxxxxxx)
          if (phone.startsWith('05') && phone.length === 10) {
            phone = '966' + phone.substring(1);
          } else if (phone.startsWith('5') && phone.length === 9) {
            phone = '966' + phone;
          }

          if (this.validatePhoneNumber(phone)) {
            const existing = await this.contactRepo.findOne({
              where: { contact_list_id: listId, phone },
            });

            if (!existing) {
              contacts.push({
                contact_list_id: listId,
                phone,
                name: name ? name.toString().trim() : undefined,
                email: email ? email.toString().trim() : undefined,
                city: city ? city.toString().trim() : undefined,
                custom_data: { imported_from: 'excel', imported_at: new Date() },
              });
            }
          } else {
            invalidCount++;
          }
        } else {
          invalidCount++;
        }
      }

      // حفظ الجهات
      if (contacts.length > 0) {
        await this.contactRepo.insert(contacts as any[]);
      }

      // تحديث العدد
      contactList.contact_count = await this.contactRepo.count({
        where: { contact_list_id: listId },
      });
      contactList.source = 'excel';
      await this.contactListRepo.save(contactList);

      return {
        statusCode: 201,
        message: 'Contacts imported successfully',
        data: {
          imported: contacts.length,
          invalid: invalidCount,
          total_in_list: contactList.contact_count,
        },
      };
    } catch (error) {
      this.logger.error('Error importing Excel file', error);
      throw new BadRequestException(
        'Failed to import Excel file: ' + (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  /**
   * حذف جهة اتصال
   */
  async deleteContact(contactId: string) {
    const contact = await this.contactRepo.findOne({ where: { id: contactId } });
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    // تحديث عدد الجهات
    const listId = contact.contact_list_id;
    await this.contactRepo.delete(contactId);

    const contactList = await this.contactListRepo.findOne({ where: { id: listId } });
    if (contactList) {
      contactList.contact_count = await this.contactRepo.count({
        where: { contact_list_id: listId },
      });
      await this.contactListRepo.save(contactList);
    }

    return {
      statusCode: 200,
      message: 'Contact deleted successfully',
    };
  }

  // ============================================
  // 📨 Bulk Message Management
  // ============================================

  /**
   * إنشاء رسالة جماعية جديدة
   */
  async createBulkMessage(
    sessionId: string,
    data: {
      title: string;
      contact_list_id: string;
      message_template: string;
      message_type?: 'text' | 'image' | 'document' | 'video';
      media_url?: string;
      scheduled_at?: Date;
    },
  ) {
    // التحقق من الجلسة
    const session = await this.sessionService.findOne(sessionId);
    if (session.status !== SessionStatus.READY) {
      throw new BadRequestException('Session must be connected to send messages');
    }

    // التحقق من القائمة
    const contactList = await this.contactListRepo.findOne({
      where: { id: data.contact_list_id, session_id: sessionId },
    });

    if (!contactList) {
      throw new NotFoundException('Contact list not found');
    }

    const contactCount = await this.contactRepo.count({
      where: { contact_list_id: data.contact_list_id },
    });

    if (contactCount === 0) {
      throw new BadRequestException('Contact list is empty');
    }

    const bulkMessage = this.bulkMessageRepo.create({
      session_id: sessionId,
      contact_list_id: data.contact_list_id,
      title: data.title,
      message_template: data.message_template,
      message_type: data.message_type || 'text',
      media_url: data.media_url,
      total_contacts: contactCount,
      pending_count: contactCount,
      status: data.scheduled_at ? 'scheduled' : 'draft',
      scheduled_at: data.scheduled_at,
    });

    await this.bulkMessageRepo.save(bulkMessage);

    // إنشاء وظيفة للإرسال
    if (data.scheduled_at) {
      await this.createJob('send_bulk_message', {
        bulk_message_id: bulkMessage.id,
      });
    }

    return {
      statusCode: 201,
      message: 'Bulk message created successfully',
      data: bulkMessage,
    };
  }

  /**
   * الحصول على الرسائل الجماعية
   */
  async getBulkMessages(sessionId: string, page: number = 1, limit: number = 10, status?: string) {
    let query = this.bulkMessageRepo.createQueryBuilder('msg').where('msg.session_id = :sessionId', { sessionId });

    if (status) {
      query = query.andWhere('msg.status = :status', { status });
    }

    const [data, total] = await query
      .orderBy('msg.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      statusCode: 200,
      data,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * الحصول على تفاصيل الرسالة مع الإحصائيات
   */
  async getBulkMessageWithStats(sessionId: string, messageId: string) {
    const message = await this.bulkMessageRepo.findOne({
      where: { id: messageId, session_id: sessionId },
    });

    if (!message) {
      throw new NotFoundException('Bulk message not found');
    }

    // إعادة حساب الإحصائيات
    const [sent, failed, pending] = await Promise.all([
      this.messageLogRepo.count({
        where: { bulk_message_id: messageId, status: 'sent' },
      }),
      this.messageLogRepo.count({
        where: { bulk_message_id: messageId, status: 'failed' },
      }),
      this.messageLogRepo.count({
        where: { bulk_message_id: messageId, status: 'pending' },
      }),
    ]);

    message.sent_count = sent;
    message.failed_count = failed;
    message.pending_count = pending;

    return {
      statusCode: 200,
      data: message,
      stats: {
        sent,
        failed,
        pending,
        total: message.total_contacts,
        percentage_sent: Math.round((sent / message.total_contacts) * 100),
      },
    };
  }

  /**
   * بدء الإرسال الجماعي
   */
  async sendBulkMessage(messageId: string, delayMs: number = 100) {
    const message = await this.bulkMessageRepo.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Bulk message not found');
    }

    if (['processing', 'completed'].includes(message.status)) {
      throw new BadRequestException(`Cannot send message with status: ${message.status}`);
    }

    // تحديث الحالة
    message.status = 'processing';
    message.started_at = new Date();
    await this.bulkMessageRepo.save(message);

    // إنشاء جهات اتصال من القائمة
    const contacts = await this.contactRepo.find({
      where: { contact_list_id: message.contact_list_id },
    });

    // إنشاء سجلات الرسائل
    const messageLogs = contacts.map(contact =>
      this.messageLogRepo.create({
        bulk_message_id: messageId,
        contact_id: contact.id,
        phone: contact.phone,
        message_text: this.renderMessageTemplate(message.message_template, contact),
        status: 'pending',
      }),
    );

    await this.messageLogRepo.save(messageLogs);

    // إرسال الرسائل بشكل متتالي
    this.sendMessagesAsync(message, contacts, delayMs);

    return {
      statusCode: 200,
      message: 'Bulk message sending started',
      data: { message_id: messageId, total_contacts: contacts.length },
    };
  }

  /**
   * إرسال الرسائل بشكل غير متزامن
   */
  private async sendMessagesAsync(message: BulkMessage, contacts: Contact[], delayMs: number) {
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      const messageText = this.renderMessageTemplate(message.message_template, contact);

      try {
        // إرسال الرسالة عبر جلسة WhatsApp
        await this.sendMessageViaWhatsApp(message.session_id, contact.phone, messageText);

        // تحديث السجل
        await this.messageLogRepo.update(
          { bulk_message_id: message.id, contact_id: contact.id },
          { status: 'sent', sent_at: new Date() },
        );
      } catch (error) {
        this.logger.error(`Failed to send message to ${contact.phone}:`, error);

        // تسجيل الخطأ
        await this.messageLogRepo.update(
          { bulk_message_id: message.id, contact_id: contact.id },
          { status: 'failed', error_message: error instanceof Error ? error.message : String(error) },
        );
      }

      // انتظار التأخير (مع إضافة عشوائية لمحاكاة سلوك الإنسان والوقاية من الحظر)
      if (i < contacts.length - 1) {
        const safeDelay = Math.max(2000, delayMs); // الحد الأدنى ثانيتين
        const randomJitter = Math.random() * 4000; // إضافة ما بين 0 إلى 4 ثوانٍ عشوائية
        await new Promise(resolve => setTimeout(resolve, safeDelay + randomJitter));
      }
    }

    // تحديث حالة الرسالة
    message.status = 'completed';
    message.completed_at = new Date();
    await this.bulkMessageRepo.save(message);
  }

  /**
   * إيقاف الإرسال الجماعي
   */
  async stopBulkMessage(messageId: string) {
    const message = await this.bulkMessageRepo.findOne({ where: { id: messageId } });

    if (!message) {
      throw new NotFoundException('Bulk message not found');
    }

    message.status = 'completed';
    message.completed_at = new Date();
    await this.bulkMessageRepo.save(message);

    return {
      statusCode: 200,
      message: 'Bulk message stopped successfully',
    };
  }

  /**
   * حذف رسالة جماعية
   */
  async deleteBulkMessage(messageId: string) {
    const result = await this.bulkMessageRepo.delete(messageId);

    if (result.affected === 0) {
      throw new NotFoundException('Bulk message not found');
    }

    return {
      statusCode: 200,
      message: 'Bulk message deleted successfully',
    };
  }

  // ============================================
  // 📊 Message Logs & Statistics
  // ============================================

  /**
   * الحصول على سجلات الرسائل
   */
  async getMessageLogs(messageId: string, page: number = 1, limit: number = 50, status?: string) {
    let query = this.messageLogRepo.createQueryBuilder('log').where('log.bulk_message_id = :messageId', { messageId });

    if (status) {
      query = query.andWhere('log.status = :status', { status });
    }

    const [data, total] = await query
      .orderBy('log.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      statusCode: 200,
      data,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * إحصائيات شاملة
   */
  async getStatistics(sessionId: string) {
    const [totalMessages, totalContacts, totalContactLists, totalSent, totalFailed, recurringActive, abandonedCarts] =
      await Promise.all([
        this.bulkMessageRepo.count({ where: { session_id: sessionId } }),
        this.contactRepo.count(),
        this.contactListRepo.count({ where: { session_id: sessionId } }),
        this.messageLogRepo.count({ where: { status: 'sent' } }),
        this.messageLogRepo.count({ where: { status: 'failed' } }),
        this.recurringMessageRepo.count({ where: { session_id: sessionId, is_active: true } }),
        this.abandonedCartRepo.count({ where: { session_id: sessionId } }),
      ]);

    return {
      statusCode: 200,
      data: {
        total_messages: totalMessages,
        total_contacts: totalContacts,
        total_contact_lists: totalContactLists,
        total_messages_sent: totalSent,
        total_messages_failed: totalFailed,
        active_recurring_messages: recurringActive,
        abandoned_carts: abandonedCarts,
      },
    };
  }

  // ============================================
  // 🔄 Recurring Messages
  // ============================================

  async createRecurringMessage(sessionId: string, data: any) {
    const session = await this.sessionService.findOne(sessionId);
    if (session.status !== SessionStatus.READY) {
      throw new BadRequestException('Session must be connected');
    }

    const message = this.recurringMessageRepo.create({
      session_id: sessionId,
      ...data,
    });

    await this.recurringMessageRepo.save(message);

    return {
      statusCode: 201,
      message: 'Recurring message created successfully',
      data: message,
    };
  }

  async getRecurringMessages(sessionId: string, page: number = 1, limit: number = 10) {
    const [data, total] = await this.recurringMessageRepo.findAndCount({
      where: { session_id: sessionId },
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });

    return {
      statusCode: 200,
      data,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async toggleRecurringMessage(messageId: string) {
    const message = await this.recurringMessageRepo.findOne({ where: { id: messageId } });
    if (!message) {
      throw new NotFoundException('Recurring message not found');
    }

    message.is_active = !message.is_active;
    await this.recurringMessageRepo.save(message);

    return {
      statusCode: 200,
      message: `Recurring message ${message.is_active ? 'enabled' : 'disabled'} successfully`,
      data: message,
    };
  }

  // ============================================
  // 🛒 Abandoned Carts (Salla)
  // ============================================

  async getAbandonedCarts(sessionId: string, page: number = 1, limit: number = 20) {
    const [data, total] = await this.abandonedCartRepo.findAndCount({
      where: { session_id: sessionId },
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });

    return {
      statusCode: 200,
      data,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async sendAbandonedCartReminder(cartId: string) {
    const cart = await this.abandonedCartRepo.findOne({ where: { id: cartId } });
    if (!cart) {
      throw new NotFoundException('Abandoned cart not found');
    }

    try {
      const message = `🛒 لديك عناصر في سلتك!\n\n${cart.cart_items.map(item => `• ${item.product_name} x${item.quantity}`).join('\n')}\n\n💰 الإجمالي: ${cart.cart_total} ر.س`;

      await this.sendMessageViaWhatsApp(cart.session_id, cart.customer_phone, message);

      cart.reminder_sent = true;
      cart.reminder_sent_at = new Date();
      await this.abandonedCartRepo.save(cart);

      return {
        statusCode: 200,
        message: 'Reminder sent successfully',
      };
    } catch (error) {
      this.logger.error('Failed to send reminder:', error);
      throw new BadRequestException(
        'Failed to send reminder: ' + (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  // ============================================
  // Helper Methods
  // ============================================

  private validatePhoneNumber(phone: string): boolean {
    // قبول أرقام بأشكال مختلفة
    const phoneRegex = /^(\+\d{1,3}|00\d{1,3}|\d{1,3})?\d{7,}$/;
    return phoneRegex.test(phone.replace(/\s|-|\(|\)/g, ''));
  }

  private renderMessageTemplate(template: string, contact: Contact): string {
    return template
      .replace('{{name}}', contact.name || 'العميل')
      .replace('{{phone}}', contact.phone)
      .replace('{{email}}', contact.email || '')
      .replace('{{city}}', contact.city || '');
  }

  private async sendMessageViaWhatsApp(sessionId: string, phone: string, message: string) {
    const engine = this.sessionService.getEngine(sessionId);
    if (!engine) {
      throw new BadRequestException(`No active engine for session ${sessionId}`);
    }

    let chatId = phone.trim();
    if (!chatId.includes('@')) {
      const cleaned = chatId.replace(/\D/g, '');
      if (cleaned.startsWith('9665')) {
        chatId = '966' + cleaned.substring(4) + '@c.us';
      } else if (cleaned.startsWith('966')) {
        chatId = cleaned + '@c.us';
      } else if (cleaned.startsWith('05')) {
        chatId = '966' + cleaned.substring(1) + '@c.us';
      } else if (cleaned.startsWith('5')) {
        chatId = '966' + cleaned + '@c.us';
      } else {
        chatId = cleaned + '@c.us';
      }
    }

    await engine.sendTextMessage(chatId, message);
  }

  private async createJob(jobType: string, data: any) {
    const job = this.jobRepo.create({
      job_type: jobType as Job['job_type'],
      data,
      status: 'pending',
    });

    await this.jobRepo.save(job);
  }

  private async ensureUploadDirExists() {
    try {
      await fs.mkdir(this.EXCEL_UPLOAD_DIR, { recursive: true });
    } catch (error) {
      this.logger.error('Failed to create upload directory:', error);
    }
  }

  /**
   * توليد نص تسويقي احترافي باستخدام ذكاء اصطناعي Gemini AI
   */
  async generateMarketingText(prompt: string) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your-gemini-api-key') {
      throw new BadRequestException(
        'يرجى تهيئة مفتاح الـ API لـ Gemini أولاً في ملف الإعدادات .env تحت اسم GEMINI_API_KEY'
      );
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `أنت كاتب إعلانات تسويقي محترف وخبير في كتابة حملات الواتساب والمبيعات التفاعلية.
مهمتك هي كتابة رسالة تسويقية عربية جذابة ومقنعة للغاية للعميل بناءً على هذا الطلب: "${prompt}".

شروط كتابة الرسالة:
1. استخدم لغة عربية ودية وقريبة للقلب ومناسبة للهجة الخليجية/السعودية إذا كان العرض محلياً.
2. نسق الرسالة بذكاء باستخدام الفقرات القصيرة، والـ Emojis المناسبة لتبدو حية وتفاعلية.
3. استخدم الرموز المناسبة لتنسيق النص في واتساب مثل النجمة (*) لجعل الكلمات المهمة غامقة (Bold).
4. استخدم متغير التخصيص {{name}} في بداية الرسالة للترحيب بالعميل (مثال: أهلاً بك يا {{name}} 👋).
5. أضف جملة دعوة لاتخاذ إجراء واضحة ومثيرة للاهتمام (Call to Action).
6. اجعل الرسالة مقنعة وتجنب الكلمات المكررة أو الطول الممل.

اكتب الرسالة التسويقية مباشرة دون أي مقدمات أو تعليقات خارجية لتكون جاهزة للاستخدام فوراً.`
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1000
            }
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      return {
        statusCode: 200,
        data: {
          text: generatedText.trim()
        }
      };
    } catch (error) {
      this.logger.error('Gemini text generation failed:', error);
      throw new BadRequestException(
        'فشل توليد النص التسويقي: ' + (error instanceof Error ? error.message : String(error))
      );
    }
  }
}
