import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import {
  IWhatsAppEngine,
  EngineStatus,
  EngineEventCallbacks,
  MessageResult,
  MediaInput,
  Contact,
  Group,
  GroupInfo,
  IncomingMessage,
  Label,
  Status,
  StatusResult,
  TextStatusOptions,
  Channel,
  ChannelMessage,
  Catalog,
  Product,
  PaginatedProducts,
  ProductQueryOptions,
  LocationInput,
  ContactCard,
  MessageReaction,
} from '../interfaces/whatsapp-engine.interface';

export interface MetaCloudApiOptions {
  phoneNumberId: string;       // Phone Number ID from Meta Developer Console
  accessToken: string;         // Permanent Access Token
  verifyToken: string;         // Webhook Verify Token
  businessAccountId?: string;  // WhatsApp Business Account ID
  apiVersion?: string;         // e.g., 'v19.0'
}

/**
 * Meta WhatsApp Cloud API Adapter
 * Official Meta API - https://developers.facebook.com/docs/whatsapp/cloud-api
 */
export class MetaCloudApiAdapter implements IWhatsAppEngine {
  private readonly logger = new Logger('MetaCloudApiAdapter');
  private readonly api: AxiosInstance;
  private status: EngineStatus = EngineStatus.DISCONNECTED;
  private callbacks: EngineEventCallbacks = {};
  private phoneNumberId: string;
  private phoneNumber: string | null = null;
  private displayName: string | null = null;
  private readonly apiVersion: string;
  private readonly accessToken: string;
  private readonly businessAccountId: string;

  constructor(private readonly options: MetaCloudApiOptions) {
    this.phoneNumberId = options.phoneNumberId;
    this.accessToken = options.accessToken;
    this.businessAccountId = options.businessAccountId ?? '';
    this.apiVersion = options.apiVersion ?? 'v19.0';

    this.api = axios.create({
      baseURL: `https://graph.facebook.com/${this.apiVersion}`,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  async initialize(callbacks: EngineEventCallbacks): Promise<void> {
    this.callbacks = callbacks;
    this.status = EngineStatus.INITIALIZING;
    callbacks.onStateChanged?.(this.status);

    try {
      // Verify credentials by fetching phone number info
      const { data } = await this.api.get(`/${this.phoneNumberId}`, {
        params: { fields: 'display_phone_number,verified_name,status' },
      });

      this.phoneNumber = data.display_phone_number?.replace(/\D/g, '') ?? null;
      this.displayName = data.verified_name ?? null;
      this.status = EngineStatus.READY;

      this.logger.log(`Meta Cloud API connected: ${this.displayName} (${this.phoneNumber})`);
      callbacks.onStateChanged?.(EngineStatus.READY);
      callbacks.onReady?.(this.phoneNumber ?? '', this.displayName ?? '');
    } catch (error: unknown) {
      this.status = EngineStatus.FAILED;
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Meta Cloud API initialization failed: ${msg}`);
      callbacks.onStateChanged?.(EngineStatus.FAILED);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.status = EngineStatus.DISCONNECTED;
    this.callbacks.onStateChanged?.(EngineStatus.DISCONNECTED);
  }

  async logout(): Promise<void> {
    await this.disconnect();
  }

  async destroy(): Promise<void> {
    await this.disconnect();
  }

  // ============================================================================
  // Status
  // ============================================================================

  getStatus(): EngineStatus {
    return this.status;
  }

  getQRCode(): string | null {
    // Meta Cloud API doesn't use QR codes
    return null;
  }

  getPhoneNumber(): string | null {
    return this.phoneNumber;
  }

  getPushName(): string | null {
    return this.displayName;
  }

  // ============================================================================
  // Messaging - Basic
  // ============================================================================

  async sendTextMessage(to: string, text: string): Promise<MessageResult> {
    const phoneNumber = this.normalizePhone(to);
    const { data } = await this.api.post(`/${this.phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phoneNumber,
      type: 'text',
      text: { body: text, preview_url: true },
    });
    return { id: data.messages[0].id, timestamp: Date.now() };
  }

  async sendImageMessage(to: string, media: MediaInput): Promise<MessageResult> {
    const phoneNumber = this.normalizePhone(to);
    const mediaId = await this.uploadMedia(media);
    const { data } = await this.api.post(`/${this.phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'image',
      image: { id: mediaId, caption: media.caption },
    });
    return { id: data.messages[0].id, timestamp: Date.now() };
  }

  async sendVideoMessage(to: string, media: MediaInput): Promise<MessageResult> {
    const phoneNumber = this.normalizePhone(to);
    const mediaId = await this.uploadMedia(media);
    const { data } = await this.api.post(`/${this.phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'video',
      video: { id: mediaId, caption: media.caption },
    });
    return { id: data.messages[0].id, timestamp: Date.now() };
  }

  async sendAudioMessage(to: string, media: MediaInput): Promise<MessageResult> {
    const phoneNumber = this.normalizePhone(to);
    const mediaId = await this.uploadMedia(media);
    const { data } = await this.api.post(`/${this.phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'audio',
      audio: { id: mediaId },
    });
    return { id: data.messages[0].id, timestamp: Date.now() };
  }

  async sendDocumentMessage(to: string, media: MediaInput): Promise<MessageResult> {
    const phoneNumber = this.normalizePhone(to);
    const mediaId = await this.uploadMedia(media);
    const { data } = await this.api.post(`/${this.phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'document',
      document: { id: mediaId, caption: media.caption, filename: media.filename },
    });
    return { id: data.messages[0].id, timestamp: Date.now() };
  }

  async sendLocationMessage(to: string, location: LocationInput): Promise<MessageResult> {
    const phoneNumber = this.normalizePhone(to);
    const { data } = await this.api.post(`/${this.phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'location',
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        name: location.description,
        address: location.address,
      },
    });
    return { id: data.messages[0].id, timestamp: Date.now() };
  }

  async sendContactMessage(to: string, contact: ContactCard): Promise<MessageResult> {
    const phoneNumber = this.normalizePhone(to);
    const { data } = await this.api.post(`/${this.phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'contacts',
      contacts: [{
        name: { formatted_name: contact.name, first_name: contact.name },
        phones: [{ phone: contact.number, type: 'CELL', wa_id: contact.number }],
      }],
    });
    return { id: data.messages[0].id, timestamp: Date.now() };
  }

  async sendStickerMessage(to: string, media: MediaInput): Promise<MessageResult> {
    const phoneNumber = this.normalizePhone(to);
    const mediaId = await this.uploadMedia(media);
    const { data } = await this.api.post(`/${this.phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'sticker',
      sticker: { id: mediaId },
    });
    return { id: data.messages[0].id, timestamp: Date.now() };
  }

  // ============================================================================
  // Reply & Forward
  // ============================================================================

  async replyToMessage(to: string, quotedMsgId: string, text: string): Promise<MessageResult> {
    const phoneNumber = this.normalizePhone(to);
    const { data } = await this.api.post(`/${this.phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'text',
      text: { body: text },
      context: { message_id: quotedMsgId },
    });
    return { id: data.messages[0].id, timestamp: Date.now() };
  }

  async forwardMessage(_fromChatId: string, toChatId: string, messageId: string): Promise<MessageResult> {
    this.logger.warn('forwardMessage not natively supported in Meta Cloud API, forwarding as forward context');
    return this.replyToMessage(toChatId, messageId, '');
  }

  // ============================================================================
  // Reactions
  // ============================================================================

  async reactToMessage(to: string, messageId: string, emoji: string): Promise<void> {
    const phoneNumber = this.normalizePhone(to);
    await this.api.post(`/${this.phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'reaction',
      reaction: { message_id: messageId, emoji },
    });
  }

  async getMessageReactions(_chatId: string, _messageId: string): Promise<MessageReaction[]> {
    this.logger.warn('getMessageReactions not supported in Meta Cloud API');
    return [];
  }

  // ============================================================================
  // Contacts
  // ============================================================================

  async getContacts(): Promise<Contact[]> {
    this.logger.warn('getContacts not available in Meta Cloud API');
    return [];
  }

  async getContactById(_contactId: string): Promise<Contact | null> {
    return null;
  }

  async checkNumberExists(number: string): Promise<boolean> {
    try {
      const phone = this.normalizePhone(number);
      const { data } = await this.api.post(`/${this.phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: '' },
      });
      return data.messages?.length > 0;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // Groups (not supported in Cloud API)
  // ============================================================================

  async getGroups(): Promise<Group[]> { return []; }
  async getGroupInfo(_groupId: string): Promise<GroupInfo | null> { return null; }
  async createGroup(_name: string, _participants: string[]): Promise<Group> { throw new Error('Groups not supported in Meta Cloud API'); }
  async addParticipants(_groupId: string, _participants: string[]): Promise<void> { throw new Error('Not supported'); }
  async removeParticipants(_groupId: string, _participants: string[]): Promise<void> { throw new Error('Not supported'); }
  async promoteParticipants(_groupId: string, _participants: string[]): Promise<void> { throw new Error('Not supported'); }
  async demoteParticipants(_groupId: string, _participants: string[]): Promise<void> { throw new Error('Not supported'); }
  async leaveGroup(_groupId: string): Promise<void> { throw new Error('Not supported'); }
  async setGroupSubject(_groupId: string, _subject: string): Promise<void> { throw new Error('Not supported'); }
  async setGroupDescription(_groupId: string, _description: string): Promise<void> { throw new Error('Not supported'); }
  async getGroupInviteCode(_groupId: string): Promise<string> { throw new Error('Not supported'); }
  async revokeGroupInviteCode(_groupId: string): Promise<string> { throw new Error('Not supported'); }

  // ============================================================================
  // Message Operations
  // ============================================================================

  async deleteMessage(to: string, messageId: string, _forEveryone?: boolean): Promise<void> {
    const phoneNumber = this.normalizePhone(to);
    await this.api.delete(`/${this.phoneNumberId}/messages`, {
      data: {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        message_id: messageId,
      },
    });
  }

  // ============================================================================
  // Contact Extended
  // ============================================================================

  async getProfilePicture(_contactId: string): Promise<string | null> { return null; }
  async blockContact(_contactId: string): Promise<void> { throw new Error('Not supported in Cloud API'); }
  async unblockContact(_contactId: string): Promise<void> { throw new Error('Not supported in Cloud API'); }

  // ============================================================================
  // Labels (not supported)
  // ============================================================================

  async getLabels(): Promise<Label[]> { return []; }
  async getLabelById(_labelId: string): Promise<Label | null> { return null; }
  async getChatLabels(_chatId: string): Promise<Label[]> { return []; }
  async addLabelToChat(_chatId: string, _labelId: string): Promise<void> { throw new Error('Not supported'); }
  async removeLabelFromChat(_chatId: string, _labelId: string): Promise<void> { throw new Error('Not supported'); }

  // ============================================================================
  // Channels
  // ============================================================================

  async getSubscribedChannels(): Promise<Channel[]> { return []; }
  async getChannelById(_channelId: string): Promise<Channel | null> { return null; }
  async subscribeToChannel(_inviteCode: string): Promise<Channel> { throw new Error('Not supported'); }
  async unsubscribeFromChannel(_channelId: string): Promise<void> { throw new Error('Not supported'); }
  async getChannelMessages(_channelId: string, _limit?: number): Promise<ChannelMessage[]> { return []; }

  // ============================================================================
  // Status/Stories
  // ============================================================================

  async getContactStatuses(): Promise<Status[]> { return []; }
  async getContactStatus(_contactId: string): Promise<Status[]> { return []; }
  async postTextStatus(_text: string, _options?: TextStatusOptions): Promise<StatusResult> { throw new Error('Not supported'); }
  async postImageStatus(_media: MediaInput, _caption?: string): Promise<StatusResult> { throw new Error('Not supported'); }
  async postVideoStatus(_media: MediaInput, _caption?: string): Promise<StatusResult> { throw new Error('Not supported'); }
  async deleteStatus(_statusId: string): Promise<void> { throw new Error('Not supported'); }

  // ============================================================================
  // Catalog
  // ============================================================================

  async getCatalog(): Promise<Catalog | null> {
    try {
      const { data } = await this.api.get(`/${this.businessAccountId}/product_catalogs`);
      const catalog = data.data?.[0];
      if (!catalog) return null;
      return {
        id: catalog.id,
        name: catalog.name,
        description: catalog.description ?? '',
        productCount: catalog.product_count ?? 0,
        url: `https://business.facebook.com/commerce/catalogs/${catalog.id}`,
      };
    } catch { return null; }
  }

  async getProducts(options?: ProductQueryOptions): Promise<PaginatedProducts> {
    try {
      const catalog = await this.getCatalog();
      if (!catalog) return { products: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
      const limit = options?.limit ?? 10;
      const { data } = await this.api.get(`/${catalog.id}/products`, {
        params: { fields: 'id,name,description,price,currency,image_url,retailer_id,availability', limit },
      });
      const products: Product[] = (data.data ?? []).map((p: Record<string, unknown>) => ({
        id: String(p.id),
        name: String(p.name ?? ''),
        description: String(p.description ?? ''),
        price: Number(p.price ?? 0),
        currency: String(p.currency ?? 'SAR'),
        priceFormatted: `${p.price} ${p.currency}`,
        imageUrl: String(p.image_url ?? ''),
        url: `https://business.facebook.com`,
        isAvailable: p.availability === 'in stock',
        retailerId: String(p.retailer_id ?? ''),
      }));
      return { products, pagination: { page: 1, limit, total: products.length, totalPages: 1 } };
    } catch { return { products: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }; }
  }

  async getProduct(_productId: string): Promise<Product | null> { return null; }
  async sendProduct(to: string, productId: string, body?: string): Promise<MessageResult> {
    const phoneNumber = this.normalizePhone(to);
    const catalog = await this.getCatalog();
    if (!catalog) throw new Error('No catalog found');
    const { data } = await this.api.post(`/${this.phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'interactive',
      interactive: {
        type: 'product',
        body: { text: body ?? 'Check out this product' },
        action: { catalog_id: catalog.id, product_retailer_id: productId },
      },
    });
    return { id: data.messages[0].id, timestamp: Date.now() };
  }

  async sendCatalog(to: string, body?: string): Promise<MessageResult> {
    const phoneNumber = this.normalizePhone(to);
    const catalog = await this.getCatalog();
    if (!catalog) throw new Error('No catalog found');
    const products = await this.getProducts({ limit: 30 });
    const sections = [{ title: 'Products', product_items: products.products.slice(0, 30).map(p => ({ product_retailer_id: p.retailerId ?? p.id })) }];
    const { data } = await this.api.post(`/${this.phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'interactive',
      interactive: {
        type: 'product_list',
        header: { type: 'text', text: catalog.name },
        body: { text: body ?? 'Browse our catalog' },
        action: { catalog_id: catalog.id, sections },
      },
    });
    return { id: data.messages[0].id, timestamp: Date.now() };
  }

  // ============================================================================
  // Webhook Handler (call this from your controller)
  // ============================================================================

  /**
   * Process incoming webhook event from Meta
   * Call this from a dedicated webhook controller endpoint
   */
  handleWebhookEvent(body: Record<string, unknown>): void {
    try {
      const entry = (body.entry as Array<Record<string, unknown>>)?.[0];
      const changes = (entry?.changes as Array<Record<string, unknown>>)?.[0];
      const value = changes?.value as Record<string, unknown>;

      const messages = value?.messages as Array<Record<string, unknown>>;
      if (!messages?.length) return;

      for (const msg of messages) {
        const incoming: IncomingMessage = {
          id: String(msg.id),
          from: String(msg.from),
          to: this.phoneNumber ?? '',
          chatId: String(msg.from),
          body: this.extractMessageBody(msg),
          type: String(msg.type),
          timestamp: Number(msg.timestamp) * 1000,
          fromMe: false,
          isGroup: false,
        };
        this.callbacks.onMessage?.(incoming);
      }
    } catch (error) {
      this.logger.error('Error handling webhook event', error);
    }
  }

  /**
   * Verify webhook signature from Meta
   */
  verifyWebhookSignature(payload: string, signature: string, appSecret: string): boolean {
    const crypto = require('crypto') as typeof import('crypto');
    const expected = crypto.createHmac('sha256', appSecret).update(payload).digest('hex');
    return `sha256=${expected}` === signature;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private normalizePhone(phone: string): string {
    // Remove spaces, dashes, plus signs; ensure starts with country code
    return phone.replace(/[\s\-\+\(\)]/g, '').replace(/^0/, '966');
  }

  private async uploadMedia(media: MediaInput): Promise<string> {
    const FormData = require('form-data') as typeof import('form-data');
    const form = new FormData();
    
    const buffer = Buffer.isBuffer(media.data)
      ? media.data
      : Buffer.from(media.data as string, 'base64');

    form.append('file', buffer, { filename: media.filename ?? 'file', contentType: media.mimetype });
    form.append('type', media.mimetype);
    form.append('messaging_product', 'whatsapp');

    const { data } = await this.api.post(`/${this.phoneNumberId}/media`, form, {
      headers: { ...form.getHeaders() },
    });
    return data.id;
  }

  private extractMessageBody(msg: Record<string, unknown>): string {
    switch (msg.type) {
      case 'text': return ((msg.text as Record<string, unknown>)?.body as string) ?? '';
      case 'image': return ((msg.image as Record<string, unknown>)?.caption as string) ?? '[Image]';
      case 'video': return ((msg.video as Record<string, unknown>)?.caption as string) ?? '[Video]';
      case 'audio': return '[Audio]';
      case 'document': return ((msg.document as Record<string, unknown>)?.filename as string) ?? '[Document]';
      case 'location': return '[Location]';
      case 'contacts': return '[Contact]';
      case 'sticker': return '[Sticker]';
      default: return '';
    }
  }
}
