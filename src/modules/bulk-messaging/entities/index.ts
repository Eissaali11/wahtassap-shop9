import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Session } from '../../session/entities/session.entity';
import { jsonColumnType } from '../../../common/utils/column-types';

// ============================================
// 📋 Contact List Entity
// ============================================
@Entity('contact_lists')
export class ContactList {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  session_id: string;

  @ManyToOne(() => Session, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: Session;

  @Column('varchar', { length: 255 })
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('integer', { default: 0 })
  contact_count: number;

  @Column('varchar', { length: 50 })
  source: 'manual' | 'excel' | 'salla_webhook' | 'api';

  @OneToMany(() => Contact, contact => contact.contact_list, { cascade: true })
  contacts: Contact[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

// ============================================
// 📱 Contact Entity
// ============================================
@Entity('contacts')
export class Contact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  contact_list_id: string;

  @ManyToOne(() => ContactList, list => list.contacts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contact_list_id' })
  contact_list: ContactList;

  @Column('varchar', { length: 20 })
  phone: string;

  @Column('varchar', { length: 255, nullable: true })
  name: string;

  @Column('varchar', { length: 255, nullable: true })
  email: string;

  @Column('varchar', { length: 255, nullable: true })
  city: string;

  @Column({ type: jsonColumnType(), nullable: true })
  custom_data: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;
}

// ============================================
// 📨 Bulk Message Entity
// ============================================
@Entity('bulk_messages')
export class BulkMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  session_id: string;

  @ManyToOne(() => Session, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: Session;

  @Column('uuid', { nullable: true })
  contact_list_id: string;

  @ManyToOne(() => ContactList, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'contact_list_id' })
  contact_list: ContactList;

  @Column('varchar', { length: 255 })
  title: string;

  @Column('text')
  message_template: string;

  @Column('varchar', { length: 50, default: 'text' })
  message_type: 'text' | 'image' | 'document' | 'video';

  @Column('text', { nullable: true })
  media_url: string;

  @Column('integer', { default: 0 })
  total_contacts: number;

  @Column('integer', { default: 0 })
  sent_count: number;

  @Column('integer', { default: 0 })
  failed_count: number;

  @Column('integer', { default: 0 })
  pending_count: number;

  @Column('varchar', { length: 50, default: 'draft' })
  status: 'draft' | 'scheduled' | 'processing' | 'completed' | 'failed';

  @Column({ type: 'datetime', nullable: true })
  scheduled_at: Date;

  @Column({ type: 'datetime', nullable: true })
  started_at: Date;

  @Column({ type: 'datetime', nullable: true })
  completed_at: Date;

  @OneToMany(() => MessageLog, log => log.bulk_message, { cascade: true })
  message_logs: MessageLog[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

// ============================================
// 📤 Message Log Entity
// ============================================
@Entity('message_logs')
export class MessageLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  bulk_message_id: string;

  @ManyToOne(() => BulkMessage, msg => msg.message_logs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bulk_message_id' })
  bulk_message: BulkMessage;

  @Column('uuid')
  contact_id: string;

  @ManyToOne(() => Contact, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contact_id' })
  contact: Contact;

  @Column('varchar', { length: 20 })
  phone: string;

  @Column('text')
  message_text: string;

  @Column('varchar', { length: 50, default: 'pending' })
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

  @Column('text', { nullable: true })
  error_message: string;

  @Column({ type: 'datetime', nullable: true })
  sent_at: Date;

  @CreateDateColumn()
  created_at: Date;
}

// ============================================
// 🔄 Recurring Message Entity
// ============================================
@Entity('recurring_messages')
export class RecurringMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  session_id: string;

  @ManyToOne(() => Session, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: Session;

  @Column('uuid', { nullable: true })
  contact_list_id: string;

  @ManyToOne(() => ContactList, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'contact_list_id' })
  contact_list: ContactList;

  @Column('varchar', { length: 255 })
  title: string;

  @Column('text')
  message_template: string;

  @Column('varchar', { length: 50 })
  frequency: 'daily' | 'weekly' | 'monthly';

  @Column({ type: 'varchar', length: 8 })
  scheduled_time: string;

  @Column('varchar', { length: 50, default: 'UTC' })
  timezone: string;

  @Column('boolean', { default: true })
  is_active: boolean;

  @Column({ type: 'varchar', length: 10 })
  start_date: Date;

  @Column({ type: 'varchar', length: 10, nullable: true })
  end_date: Date;

  @Column({ type: 'datetime', nullable: true })
  last_sent_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

// ============================================
// 🛒 Abandoned Cart Entity
// ============================================
@Entity('abandoned_carts')
export class AbandonedCart {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  session_id: string;

  @ManyToOne(() => Session, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: Session;

  @Column('varchar', { length: 255 })
  salla_cart_id: string;

  @Column('varchar', { length: 20 })
  customer_phone: string;

  @Column('varchar', { length: 255, nullable: true })
  customer_name: string;

  @Column('varchar', { length: 255, nullable: true })
  customer_email: string;

  @Column({ type: jsonColumnType() })
  cart_items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    price: number;
  }>;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  cart_total: number;

  @Column('boolean', { default: false })
  reminder_sent: boolean;

  @Column({ type: 'datetime', nullable: true })
  reminder_sent_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

// ============================================
// 🎯 Job Entity (Queue)
// ============================================
@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 100 })
  job_type: 'send_bulk_message' | 'send_recurring_message' | 'sync_abandoned_carts' | 'send_single_message';

  @Column({ type: jsonColumnType(), nullable: true })
  data: Record<string, any>;

  @Column('varchar', { length: 50, default: 'pending' })
  status: 'pending' | 'processing' | 'completed' | 'failed';

  @Column('integer', { default: 0 })
  attempts: number;

  @Column('integer', { default: 3 })
  max_attempts: number;

  @Column('text', { nullable: true })
  error_message: string;

  @Column({ type: 'datetime', nullable: true })
  scheduled_at: Date;

  @Column({ type: 'datetime', nullable: true })
  started_at: Date;

  @Column({ type: 'datetime', nullable: true })
  completed_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
