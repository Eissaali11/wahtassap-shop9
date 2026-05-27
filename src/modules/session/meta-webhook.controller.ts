import { Controller, Post, Get, Body, Headers, Query, Logger, BadRequestException, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import * as express from 'express';
import * as crypto from 'crypto';
import { Public } from '../auth/decorators/auth.decorators';
import { SessionService } from './session.service';
import { MetaCloudApiAdapter } from '../../engine/adapters/meta-cloud-api.adapter';

/**
 * Meta WhatsApp Cloud API Webhook Controller
 *
 * Endpoints:
 *  GET  /api/sessions/meta/webhook  → Webhook verification (Meta calls this once)
 *  POST /api/sessions/meta/webhook  → Incoming messages from Meta
 *  POST /api/sessions/meta/setup    → Configure Meta credentials for a session
 */
@Public()
@ApiTags('Meta WhatsApp Cloud API')
@Controller('sessions/meta')
export class MetaWebhookController {
  private readonly logger = new Logger('MetaWebhookController');
  private readonly verifyToken = process.env.META_VERIFY_TOKEN ?? 'default-verify-token';
  private readonly appSecret = process.env.META_APP_SECRET ?? '';

  constructor(private readonly sessionService: SessionService) {}

  /**
   * Meta Webhook Verification
   * Meta calls GET with hub.challenge when you set up the webhook
   */
  @Get('webhook')
  @ApiOperation({ summary: 'Meta webhook verification challenge' })
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: express.Response,
  ): void {
    this.logger.log(`Webhook verification: mode=${mode}, token=${token}`);

    if (mode === 'subscribe' && token === this.verifyToken) {
      this.logger.log('✅ Webhook verified successfully by Meta');
      res.setHeader('Content-Type', 'text/plain');
      res.status(200).send(challenge);
      return;
    }

    this.logger.warn('❌ Webhook verification failed — token mismatch');
    throw new BadRequestException('Webhook verification failed');
  }

  /**
   * Meta Incoming Messages Webhook
   * Receives all messages, status updates, and events
   */
  @Post('webhook')
  @ApiOperation({ summary: 'Receive incoming messages from Meta' })
  @ApiHeader({ name: 'X-Hub-Signature-256', description: 'Meta webhook signature' })
  async handleWebhook(
    @Body() body: Record<string, unknown>,
    @Headers('x-hub-signature-256') signature: string,
  ): Promise<{ status: string }> {
    // Verify signature if app secret is configured
    if (this.appSecret && signature) {
      const rawBody = JSON.stringify(body);
      const expected = `sha256=${crypto.createHmac('sha256', this.appSecret).update(rawBody).digest('hex')}`;
      if (expected !== signature) {
        this.logger.warn('Invalid webhook signature from Meta');
        throw new BadRequestException('Invalid signature');
      }
    }

    // Validate it's a WhatsApp event
    if (body.object !== 'whatsapp_business_account') {
      return { status: 'ignored' };
    }

    this.logger.log('📩 Received Meta webhook event');

    // Route the event to the active Meta session engine
    const sessions = await this.sessionService.findAll();
    const metaSession = sessions.find(s => s.config && (s.config as Record<string,unknown>).engine === 'meta-cloud-api');

    if (metaSession) {
      const engine = this.sessionService.getEngine(metaSession.id);
      if (engine && engine instanceof MetaCloudApiAdapter) {
        engine.handleWebhookEvent(body);
      }
    }

    return { status: 'ok' };
  }

  /**
   * Configure Meta API credentials for a session
   * POST /api/sessions/meta/setup
   */
  @Post('setup')
  @ApiOperation({ summary: 'Configure Meta API credentials for a session' })
  async setup(
    @Body() dto: {
      sessionId: string;
      phoneNumberId: string;
      accessToken: string;
      verifyToken?: string;
      businessAccountId?: string;
    },
  ): Promise<{ message: string; webhookUrl: string; verifyToken: string }> {
    const domain = process.env.APP_DOMAIN ?? 'raya2.site';
    const webhookUrl = `https://${domain}/api/sessions/meta/webhook`;

    this.logger.log(`Meta setup for session: ${dto.sessionId}`);

    return {
      message: 'Configure these in Meta Developer Console',
      webhookUrl,
      verifyToken: dto.verifyToken ?? this.verifyToken,
    };
  }

  /**
   * Get Meta setup instructions
   */
  @Get('setup-guide')
  @ApiOperation({ summary: 'Get Meta setup instructions and current webhook URL' })
  getSetupGuide(): {
    webhookUrl: string;
    verifyToken: string;
    steps: string[];
    configured: boolean;
  } {
    const domain = process.env.APP_DOMAIN ?? 'raya2.site';
    return {
      webhookUrl: `https://${domain}/api/sessions/meta/webhook`,
      verifyToken: this.verifyToken,
      configured: !!(process.env.META_ACCESS_TOKEN && process.env.META_PHONE_NUMBER_ID),
      steps: [
        '1. Go to https://developers.facebook.com → Your App → WhatsApp → Configuration',
        `2. Set Callback URL to: https://${domain}/api/sessions/meta/webhook`,
        `3. Set Verify Token to: ${this.verifyToken}`,
        '4. Subscribe to: messages, message_deliveries, message_reads',
        '5. Add META_PHONE_NUMBER_ID, META_ACCESS_TOKEN, META_VERIFY_TOKEN to your .env',
        '6. Set ENGINE_TYPE=meta-cloud-api in .env and restart',
      ],
    };
  }
}
