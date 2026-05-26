/**
 * Meta WhatsApp Cloud API Engine Plugin
 * Official Meta API integration
 */

import { PluginContext, PluginType, IEnginePlugin } from '../../../core/plugins';
import { IWhatsAppEngine } from '../../../engine/interfaces/whatsapp-engine.interface';
import { MetaCloudApiAdapter } from '../../../engine/adapters/meta-cloud-api.adapter';

export class MetaCloudApiPlugin implements IEnginePlugin {
  type = PluginType.ENGINE as const;
  private context?: PluginContext;

  onLoad(context: PluginContext): Promise<void> {
    this.context = context;
    context.logger.log('Meta WhatsApp Cloud API engine plugin loaded');
    return Promise.resolve();
  }

  onEnable(context: PluginContext): Promise<void> {
    context.logger.log('Meta WhatsApp Cloud API engine plugin enabled');
    return Promise.resolve();
  }

  onDisable(context: PluginContext): Promise<void> {
    context.logger.log('Meta WhatsApp Cloud API engine plugin disabled');
    return Promise.resolve();
  }

  createEngine(config: Record<string, unknown>): IWhatsAppEngine {
    const phoneNumberId = (process.env.META_PHONE_NUMBER_ID ?? '') as string;
    const accessToken = (process.env.META_ACCESS_TOKEN ?? '') as string;
    const verifyToken = (process.env.META_VERIFY_TOKEN ?? 'default-verify-token') as string;
    const businessAccountId = (process.env.META_BUSINESS_ACCOUNT_ID ?? '') as string;

    if (!phoneNumberId || !accessToken) {
      throw new Error(
        'Meta Cloud API requires META_PHONE_NUMBER_ID and META_ACCESS_TOKEN env variables. ' +
        'Get them from https://developers.facebook.com → WhatsApp → API Setup'
      );
    }

    return new MetaCloudApiAdapter({
      phoneNumberId,
      accessToken,
      verifyToken,
      businessAccountId,
      apiVersion: (process.env.META_API_VERSION ?? 'v19.0') as string,
    });
  }

  getFeatures(): string[] {
    return [
      'text-messages',
      'media-messages',
      'location-messages',
      'contact-messages',
      'message-reactions',
      'message-replies',
      'message-deletion',
      'catalog',
      'official-api',
      'no-ban-risk',
      'templates',
    ];
  }

  healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    const hasToken = !!process.env.META_ACCESS_TOKEN;
    const hasPhoneId = !!process.env.META_PHONE_NUMBER_ID;
    return Promise.resolve({
      healthy: hasToken && hasPhoneId,
      message: hasToken && hasPhoneId
        ? 'Meta Cloud API credentials configured'
        : 'Missing META_ACCESS_TOKEN or META_PHONE_NUMBER_ID',
    });
  }
}

export default MetaCloudApiPlugin;
