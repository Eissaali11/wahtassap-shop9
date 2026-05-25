import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactList, Contact, BulkMessage, MessageLog, RecurringMessage, AbandonedCart, Job } from './entities';
import { BulkMessagingService } from './bulk-messaging.service';
import { BulkMessagingController } from './bulk-messaging.controller';
import { SessionModule } from '../session/session.module';

/**
 * 📨 Bulk Messaging Module
 * وحدة الإرسال الجماعي والدوري
 */
@Module({
  imports: [
    TypeOrmModule.forFeature(
      [ContactList, Contact, BulkMessage, MessageLog, RecurringMessage, AbandonedCart, Job],
      'data',
    ),
    SessionModule,
  ],
  controllers: [BulkMessagingController],
  providers: [BulkMessagingService],
  exports: [BulkMessagingService], // Export service for other modules
})
export class BulkMessagingModule {}
