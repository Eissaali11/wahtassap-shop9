import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BulkMessagingService } from './bulk-messaging.service';

// ============================================
// 📨 APIs لنظام الإرسال الجماعي
// ============================================

@ApiTags('Bulk Messaging - الإرسال الجماعي')
@Controller('sessions/:sessionId/bulk-messaging')
@ApiBearerAuth('X-API-Key')
export class BulkMessagingController {
  constructor(private readonly bulkMessagingService: BulkMessagingService) {}

  // ============================================
  // 📋 Contact Lists APIs
  // ============================================

  /**
   * إنشاء قائمة جهات اتصال جديدة
   * @example POST /api/sessions/{sessionId}/bulk/contact-lists
   */
  @Post('contact-lists')
  @ApiOperation({ summary: 'Create a new contact list' })
  async createContactList(
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Body()
    body: {
      name: string;
      description?: string;
      source?: 'manual' | 'excel' | 'salla_webhook' | 'api';
    },
  ) {
    return await this.bulkMessagingService.createContactList(sessionId, body);
  }

  /**
   * الحصول على قائمة جهات الاتصال
   * @example GET /api/sessions/{sessionId}/bulk/contact-lists
   */
  @Get('contact-lists')
  @ApiOperation({ summary: 'Get all contact lists' })
  async getContactLists(
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return await this.bulkMessagingService.getContactLists(sessionId, page, limit);
  }

  /**
   * الحصول على تفاصيل قائمة معينة
   * @example GET /api/sessions/{sessionId}/bulk/contact-lists/{listId}
   */
  @Get('contact-lists/:listId')
  @ApiOperation({ summary: 'Get specific contact list details' })
  async getContactListById(
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Param('listId', new ParseUUIDPipe()) listId: string,
  ) {
    return await this.bulkMessagingService.getContactListWithContacts(sessionId, listId);
  }

  /**
   * تحديث قائمة جهات الاتصال
   * @example PUT /api/sessions/{sessionId}/bulk/contact-lists/{listId}
   */
  @Put('contact-lists/:listId')
  @ApiOperation({ summary: 'Update contact list' })
  async updateContactList(
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Param('listId', new ParseUUIDPipe()) listId: string,
    @Body() body: { name?: string; description?: string },
  ) {
    return await this.bulkMessagingService.updateContactList(listId, body);
  }

  /**
   * حذف قائمة جهات الاتصال
   * @example DELETE /api/sessions/{sessionId}/bulk/contact-lists/{listId}
   */
  @Delete('contact-lists/:listId')
  @ApiOperation({ summary: 'Delete contact list' })
  async deleteContactList(
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Param('listId', new ParseUUIDPipe()) listId: string,
  ) {
    return await this.bulkMessagingService.deleteContactList(listId);
  }

  // ============================================
  // 👥 Individual Contacts APIs
  // ============================================

  /**
   * إضافة جهة اتصال إلى قائمة
   * @example POST /api/sessions/{sessionId}/bulk/contact-lists/{listId}/contacts
   */
  @Post('contact-lists/:listId/contacts')
  @ApiOperation({ summary: 'Add contact to list' })
  async addContact(
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Param('listId', new ParseUUIDPipe()) listId: string,
    @Body()
    body: {
      phone: string;
      name?: string;
      email?: string;
      city?: string;
      custom_data?: Record<string, any>;
    },
  ) {
    return await this.bulkMessagingService.addContact(listId, body);
  }

  /**
   * إضافة عدة جهات اتصال دفعة واحدة
   * @example POST /api/sessions/{sessionId}/bulk/contact-lists/{listId}/contacts/bulk
   */
  @Post('contact-lists/:listId/contacts/bulk')
  @ApiOperation({ summary: 'Add multiple contacts to list' })
  async addBulkContacts(
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Param('listId', new ParseUUIDPipe()) listId: string,
    @Body()
    body: {
      contacts: Array<{
        phone: string;
        name?: string;
        email?: string;
        city?: string;
        custom_data?: Record<string, any>;
      }>;
    },
  ) {
    return await this.bulkMessagingService.addBulkContacts(listId, body.contacts);
  }

  /**
   * رفع ملف Excel بجهات الاتصال
   * @example POST /api/sessions/{sessionId}/bulk/contact-lists/{listId}/import-excel
   */
  @Post('contact-lists/:listId/import-excel')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Import contacts from Excel file' })
  async importFromExcel(
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Param('listId', new ParseUUIDPipe()) listId: string,
    @UploadedFile() file: { buffer: Buffer; originalname: string },
  ) {
    return await this.bulkMessagingService.importContactsFromExcel(listId, file);
  }

  /**
   * حذف جهة اتصال
   * @example DELETE /api/sessions/{sessionId}/bulk/contacts/{contactId}
   */
  @Delete('contacts/:contactId')
  @ApiOperation({ summary: 'Delete contact' })
  async deleteContact(
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Param('contactId', new ParseUUIDPipe()) contactId: string,
  ) {
    return await this.bulkMessagingService.deleteContact(contactId);
  }

  // ============================================
  // 📨 Bulk Message APIs
  // ============================================

  /**
   * إنشاء رسالة جماعية جديدة
   * @example POST /api/sessions/{sessionId}/bulk/messages
   */
  @Post('messages')
  @ApiOperation({ summary: 'Create bulk message' })
  async createBulkMessage(
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Body()
    body: {
      title: string;
      contact_list_id: string;
      message_template: string;
      message_type?: 'text' | 'image' | 'document' | 'video';
      media_url?: string;
      scheduled_at?: Date;
    },
  ) {
    return await this.bulkMessagingService.createBulkMessage(sessionId, body);
  }

  /**
   * الحصول على قائمة الرسائل الجماعية
   * @example GET /api/sessions/{sessionId}/bulk/messages
   */
  @Get('messages')
  @ApiOperation({ summary: 'Get all bulk messages' })
  async getBulkMessages(
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
  ) {
    return await this.bulkMessagingService.getBulkMessages(sessionId, page, limit, status);
  }

  /**
   * الحصول على تفاصيل رسالة جماعية
   * @example GET /api/sessions/{sessionId}/bulk/messages/{messageId}
   */
  @Get('messages/:messageId')
  @ApiOperation({ summary: 'Get bulk message details' })
  async getBulkMessageById(
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Param('messageId', new ParseUUIDPipe()) messageId: string,
  ) {
    return await this.bulkMessagingService.getBulkMessageWithStats(sessionId, messageId);
  }

  /**
   * بدء إرسال الرسالة الجماعية
   * @example POST /api/sessions/{sessionId}/bulk/messages/{messageId}/send
   */
  @Post('messages/:messageId/send')
  @ApiOperation({ summary: 'Send bulk message' })
  async sendBulkMessage(
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Param('messageId', new ParseUUIDPipe()) messageId: string,
    @Body() body?: { delay_ms?: number },
  ) {
    return await this.bulkMessagingService.sendBulkMessage(messageId, body?.delay_ms || 8000);
  }

  /**
   * إيقاف الرسالة الجماعية
   * @example POST /api/sessions/{sessionId}/bulk/messages/{messageId}/stop
   */
  @Post('messages/:messageId/stop')
  @ApiOperation({ summary: 'Stop bulk message sending' })
  async stopBulkMessage(
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Param('messageId', new ParseUUIDPipe()) messageId: string,
  ) {
    return await this.bulkMessagingService.stopBulkMessage(messageId);
  }

  /**
   * حذف رسالة جماعية
   * @example DELETE /api/sessions/{sessionId}/bulk/messages/{messageId}
   */
  @Delete('messages/:messageId')
  @ApiOperation({ summary: 'Delete bulk message' })
  async deleteBulkMessage(
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Param('messageId', new ParseUUIDPipe()) messageId: string,
  ) {
    return await this.bulkMessagingService.deleteBulkMessage(messageId);
  }

  // ============================================
  // 📊 Message Logs & Statistics
  // ============================================

  /**
   * الحصول على سجلات الرسائل
   * @example GET /api/sessions/{sessionId}/bulk/messages/{messageId}/logs
   */
  @Get('messages/:messageId/logs')
  @ApiOperation({ summary: 'Get message logs' })
  async getMessageLogs(
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Param('messageId', new ParseUUIDPipe()) messageId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('status') status?: string,
  ) {
    return await this.bulkMessagingService.getMessageLogs(messageId, page, limit, status);
  }

  /**
   * الحصول على إحصائيات شاملة
   * @example GET /api/sessions/{sessionId}/bulk/statistics
   */
  @Get('statistics')
  @ApiOperation({ summary: 'Get bulk messaging statistics' })
  async getStatistics(@Param('sessionId', new ParseUUIDPipe()) sessionId: string) {
    return await this.bulkMessagingService.getStatistics(sessionId);
  }

  // ============================================
  // 🔄 Recurring Messages APIs
  // ============================================

  /**
   * إنشاء رسالة دورية
   * @example POST /api/sessions/{sessionId}/bulk/recurring-messages
   */
  @Post('recurring-messages')
  @ApiOperation({ summary: 'Create recurring message' })
  async createRecurringMessage(
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Body()
    body: {
      title: string;
      contact_list_id?: string;
      message_template: string;
      frequency: 'daily' | 'weekly' | 'monthly';
      scheduled_time: string; // HH:mm format
      timezone?: string;
      start_date: Date;
      end_date?: Date;
    },
  ) {
    return await this.bulkMessagingService.createRecurringMessage(sessionId, body);
  }

  /**
   * الحصول على قائمة الرسائل الدورية
   * @example GET /api/sessions/{sessionId}/bulk/recurring-messages
   */
  @Get('recurring-messages')
  @ApiOperation({ summary: 'Get recurring messages' })
  async getRecurringMessages(
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return await this.bulkMessagingService.getRecurringMessages(sessionId, page, limit);
  }

  /**
   * تفعيل/تعطيل رسالة دورية
   * @example PUT /api/sessions/{sessionId}/bulk/recurring-messages/{messageId}/toggle
   */
  @Put('recurring-messages/:messageId/toggle')
  @ApiOperation({ summary: 'Enable/Disable recurring message' })
  async toggleRecurringMessage(
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Param('messageId', new ParseUUIDPipe()) messageId: string,
  ) {
    return await this.bulkMessagingService.toggleRecurringMessage(messageId);
  }

  // ============================================
  // 🛒 Abandoned Cart APIs (Salla Integration)
  // ============================================

  /**
   * الحصول على السلات المتروكة
   * @example GET /api/sessions/{sessionId}/bulk/abandoned-carts
   */
  @Get('abandoned-carts')
  @ApiOperation({ summary: 'Get abandoned carts' })
  async getAbandonedCarts(
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return await this.bulkMessagingService.getAbandonedCarts(sessionId, page, limit);
  }

  /**
   * إرسال رسالة تذكيرية للسلات المتروكة
   * @example POST /api/sessions/{sessionId}/bulk/abandoned-carts/{cartId}/remind
   */
  @Post('abandoned-carts/:cartId/remind')
  @ApiOperation({ summary: 'Send abandoned cart reminder' })
  async sendAbandonedCartReminder(
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Param('cartId', new ParseUUIDPipe()) cartId: string,
  ) {
    return await this.bulkMessagingService.sendAbandonedCartReminder(cartId);
  }

  /**
   * توليد نص تسويقي باستخدام ذكاء اصطناعي Gemini AI
   * @example POST /api/sessions/{sessionId}/bulk-messaging/generate-marketing-text
   */
  @Post('generate-marketing-text')
  @ApiOperation({ summary: 'Generate professional marketing message using Gemini AI' })
  async generateMarketingText(
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Body() body: { prompt: string },
  ) {
    return await this.bulkMessagingService.generateMarketingText(body.prompt);
  }
}
