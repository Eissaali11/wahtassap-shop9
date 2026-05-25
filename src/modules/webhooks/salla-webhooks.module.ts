import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AbandonedCart, Contact, ContactList } from '../bulk-messaging/entities';
import { SallaWebhookController } from './salla-webhook.controller';
import { BulkMessagingModule } from '../bulk-messaging/bulk-messaging.module';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AbandonedCart, ContactList, Contact], 'data'),
    BulkMessagingModule,
    SessionModule,
  ],
  controllers: [SallaWebhookController],
})
export class SallaWebhooksModule {}
