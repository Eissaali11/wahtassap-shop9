import { Controller, Post, Body, Headers, BadRequestException, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { AbandonedCart, Contact, ContactList } from '../bulk-messaging/entities';
import { BulkMessagingService } from '../bulk-messaging/bulk-messaging.service';
import { SessionService } from '../session/session.service';
import { Public } from '../auth/decorators/auth.decorators';

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

@Public()
@ApiTags('Webhooks - Salla Integration')
@Controller('webhooks')
export class SallaWebhookController {
  private readonly logger = new Logger('SallaWebhookController');
  private readonly webhookSecret = process.env.WEBHOOK_SECRET || 'default-secret';

  constructor(
    @InjectRepository(AbandonedCart, 'data')
    private readonly abandonedCartRepo: Repository<AbandonedCart>,
    @InjectRepository(ContactList, 'data')
    private readonly contactListRepo: Repository<ContactList>,
    @InjectRepository(Contact, 'data')
    private readonly contactRepo: Repository<Contact>,
    private readonly bulkMessagingService: BulkMessagingService,
    private readonly sessionService: SessionService,
  ) {}

  private verifyWebhookSignature(payload: string, signature: string): boolean {
    if (this.webhookSecret === 'default-secret' || !signature) {
      this.logger.warn('Skipping Salla webhook signature verification (default secret or missing signature header)');
      return true;
    }
    const hash = crypto.createHmac('sha256', this.webhookSecret).update(payload).digest('hex');
    return hash === signature;
  }

  /**
   * @example POST /api/webhooks/salla/cart-abandoned
   */
  @Post('salla/cart-abandoned')
  @ApiOperation({ summary: 'Handle abandoned cart webhook from Salla' })
  async handleAbandonedCart(@Headers('x-salla-signature') signature: string, @Body() payload: any) {
    if (!this.verifyWebhookSignature(JSON.stringify(payload), signature)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    try {
      this.logger.log('Received abandoned cart event from Salla');

      const { cart, customer } = payload.data;
      const sessionId = await this.getSessionId();

      if (!sessionId) {
        this.logger.warn('No active session found for Salla webhook');
        return { statusCode: 400, message: 'No active session configured' };
      }

      const abandonedCart = this.abandonedCartRepo.create({
        session_id: sessionId,
        salla_cart_id: cart.id,
        customer_phone: this.normalizePhoneNumber(customer.mobile),
        customer_name: customer.name,
        customer_email: customer.email,
        cart_items: cart.items.map(
          (item: { product_id: string; product_name: string; quantity: number; price: number }) => ({
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            price: item.price,
          }),
        ),
        cart_total: cart.total,
        reminder_sent: false,
      });

      await this.abandonedCartRepo.save(abandonedCart);

      let contactList = await this.contactListRepo.findOne({
        where: { session_id: sessionId, source: 'salla_webhook' },
      });

      if (!contactList) {
        contactList = this.contactListRepo.create({
          session_id: sessionId,
          name: 'Salla - Abandoned Cart Customers',
          description: 'جهات اتصال من السلات المتروكة في Salla',
          source: 'salla_webhook',
        });
        await this.contactListRepo.save(contactList);
      }

      const existingContact = await this.contactRepo.findOne({
        where: {
          contact_list_id: contactList.id,
          phone: abandonedCart.customer_phone,
        },
      });

      if (!existingContact) {
        const contact = this.contactRepo.create({
          contact_list_id: contactList.id,
          phone: abandonedCart.customer_phone,
          name: customer.name,
          email: customer.email,
          custom_data: { salla_customer_id: customer.id, source: 'abandoned_cart' },
        });
        await this.contactRepo.save(contact);
        contactList.contact_count++;
        await this.contactListRepo.save(contactList);
      }

      const reminderDelay = parseInt(process.env.ABANDONED_CART_DELAY_HOURS || '1');
      setTimeout(
        () => {
          this.sendAbandonedCartReminder(abandonedCart.id);
        },
        reminderDelay * 60 * 60 * 1000,
      );

      return {
        statusCode: 200,
        message: 'Abandoned cart recorded successfully',
        data: {
          cart_id: abandonedCart.id,
          customer_phone: abandonedCart.customer_phone,
          reminder_scheduled: true,
        },
      };
    } catch (error) {
      this.logger.error('Error processing abandoned cart webhook:', error);
      throw new BadRequestException(
        'Failed to process webhook: ' + (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  /**
   * @example POST /api/webhooks/salla/order-created
   */
  @Post('salla/order-created')
  @ApiOperation({ summary: 'Handle order created webhook from Salla' })
  async handleOrderCreated(@Headers('x-salla-signature') signature: string, @Body() payload: any) {
    if (!this.verifyWebhookSignature(JSON.stringify(payload), signature)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    try {
      this.logger.log('Received order created event from Salla');

      const { order, customer } = payload.data;
      const sessionId = await this.getSessionId();

      if (!sessionId) {
        this.logger.warn('No active session found for Salla webhook');
        return { statusCode: 400, message: 'No active session configured' };
      }

      let contactList = await this.contactListRepo.findOne({
        where: { session_id: sessionId, source: 'salla_webhook', name: 'Salla - Order Customers' },
      });

      if (!contactList) {
        contactList = this.contactListRepo.create({
          session_id: sessionId,
          name: 'Salla - Order Customers',
          description: 'جهات اتصال العملاء الذين لديهم طلبات',
          source: 'salla_webhook',
        });
        await this.contactListRepo.save(contactList);
      }

      const normalizedPhone = this.normalizePhoneNumber(customer.mobile);
      const existingContact = await this.contactRepo.findOne({
        where: { contact_list_id: contactList.id, phone: normalizedPhone },
      });

      if (!existingContact) {
        const contact = this.contactRepo.create({
          contact_list_id: contactList.id,
          phone: normalizedPhone,
          name: customer.name,
          email: customer.email,
          custom_data: {
            salla_customer_id: customer.id,
            latest_order_id: order.id,
            source: 'order_created',
          },
        });
        await this.contactRepo.save(contact);
        contactList.contact_count++;
        await this.contactListRepo.save(contactList);
      }

      const message = `✅ تم استقبال طلبك رقم ${order.id}\n\n📦 الإجمالي: ${order.total} ر.س\n\nشكراً لتسوقك معنا!`;
      this.scheduleMessage(sessionId, normalizedPhone, message, 2000);

      return {
        statusCode: 200,
        message: 'Order recorded successfully',
        data: { order_id: order.id, customer_phone: normalizedPhone, confirmation_scheduled: true },
      };
    } catch (error) {
      this.logger.error('Error processing order created webhook:', error);
      throw new BadRequestException(
        'Failed to process webhook: ' + (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  /**
   * @example POST /api/webhooks/salla/order-status-changed
   */
  @Post('salla/order-status-changed')
  @ApiOperation({ summary: 'Handle order status change webhook' })
  async handleOrderStatusChanged(@Headers('x-salla-signature') signature: string, @Body() payload: any) {
    if (!this.verifyWebhookSignature(JSON.stringify(payload), signature)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    try {
      const { order, customer, status } = payload.data;
      const sessionId = await this.getSessionId();

      if (!sessionId) {
        this.logger.warn('No active session found for Salla webhook');
        return { statusCode: 400, message: 'No active session configured' };
      }

      const phoneNumber = this.normalizePhoneNumber(customer.mobile);

      const statusMessages: Record<OrderStatus, string> = {
        pending: '⏳ جاري معالجة الطلب',
        processing: '📦 جاري تجهيز الطلب',
        shipped: '🚚 تم شحن الطلب',
        delivered: '✅ تم استلام الطلب',
        cancelled: '❌ تم إلغاء الطلب',
      };

      const statusLabel = statusMessages[status as OrderStatus] ?? 'تم تحديث حالة الطلب';
      const message = `${statusLabel}\n\nرقم الطلب: ${order.id}`;

      this.scheduleMessage(sessionId, phoneNumber, message, 1000);

      return { statusCode: 200, message: 'Order status update recorded' };
    } catch (error) {
      this.logger.error('Error processing order status webhook:', error);
      throw new BadRequestException(
        'Failed to process webhook: ' + (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  /**
   * @example POST /api/webhooks/salla/customer-created
   */
  @Post('salla/customer-created')
  @ApiOperation({ summary: 'Handle customer created webhook' })
  async handleCustomerCreated(@Headers('x-salla-signature') signature: string, @Body() payload: any) {
    if (!this.verifyWebhookSignature(JSON.stringify(payload), signature)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    try {
      const { customer } = payload.data;
      const sessionId = await this.getSessionId();

      if (!sessionId) {
        this.logger.warn('No active session found for Salla webhook');
        return { statusCode: 400, message: 'No active session configured' };
      }

      let contactList = await this.contactListRepo.findOne({
        where: { session_id: sessionId, source: 'salla_webhook', name: 'Salla - All Customers' },
      });

      if (!contactList) {
        contactList = this.contactListRepo.create({
          session_id: sessionId,
          name: 'Salla - All Customers',
          description: 'جميع عملاء Salla',
          source: 'salla_webhook',
        });
        await this.contactListRepo.save(contactList);
      }

      const normalizedPhone = this.normalizePhoneNumber(customer.mobile);
      const contact = this.contactRepo.create({
        contact_list_id: contactList.id,
        phone: normalizedPhone,
        name: customer.name,
        email: customer.email,
        custom_data: { salla_customer_id: customer.id, source: 'customer_created' },
      });

      await this.contactRepo.save(contact);
      contactList.contact_count++;
      await this.contactListRepo.save(contactList);

      const welcomeMessage = `👋 أهلاً وسهلاً ${customer.name}!\n\nشكراً لتسجيلك معنا. نحن في الخدمة!`;
      this.scheduleMessage(sessionId, normalizedPhone, welcomeMessage, 2000);

      return {
        statusCode: 200,
        message: 'Customer added successfully',
        data: { customer_id: customer.id, phone: normalizedPhone },
      };
    } catch (error) {
      this.logger.error('Error processing customer created webhook:', error);
      throw new BadRequestException(
        'Failed to process webhook: ' + (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  // ============================================
  // Helper Methods
  // ============================================

  private normalizePhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');

    if (cleaned.startsWith('9665')) {
      return '966' + cleaned.substring(4) + '@c.us';
    } else if (cleaned.startsWith('966')) {
      return cleaned + '@c.us';
    } else if (cleaned.startsWith('05')) {
      return '966' + cleaned.substring(1) + '@c.us';
    } else if (cleaned.startsWith('5')) {
      return '966' + cleaned + '@c.us';
    }

    return cleaned + '@c.us';
  }

  private scheduleMessage(sessionId: string, phone: string, message: string, delayMs: number) {
    setTimeout(() => {
      void (async () => {
        try {
          const engine = this.sessionService.getEngine(sessionId);
          if (engine) {
            await engine.sendTextMessage(phone, message);
            this.logger.log(`Sent message to ${phone}`);
          } else {
            this.logger.warn(`No active engine for session ${sessionId}`);
          }
        } catch (error) {
          this.logger.error(`Failed to send message to ${phone}:`, error);
        }
      })();
    }, delayMs);
  }

  private async sendAbandonedCartReminder(cartId: string) {
    try {
      await this.bulkMessagingService.sendAbandonedCartReminder(cartId);
    } catch (error) {
      this.logger.error('Failed to send abandoned cart reminder:', error);
    }
  }

  private async getSessionId(): Promise<string | null> {
    const envSessionId = process.env.DEFAULT_SESSION_ID;
    if (envSessionId && envSessionId !== 'default-session') {
      try {
        const session = await this.sessionService.findOne(envSessionId);
        if (session) return envSessionId;
      } catch (e) {
        // Not found
      }
    }
    
    const sessions = await this.sessionService.findAll();
    const readySession = sessions.find(s => s.status === 'ready');
    if (readySession) {
      return readySession.id;
    }
    
    if (sessions.length > 0) {
      return sessions[0].id;
    }
    
    return null;
  }
}
