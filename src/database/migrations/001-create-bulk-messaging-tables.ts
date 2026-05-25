import { MigrationInterface, QueryRunner, Table, TableColumn, TableIndex, TableForeignKey } from 'typeorm';

/**
 * 🚀 Bulk Messaging Tables Migration
 * جداول نظام الإرسال الجماعي والدوري
 */
export class CreateBulkMessagingTables001234567890000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 📋 جدول القوائم (Contact Lists)
    await queryRunner.createTable(
      new Table({
        name: 'contact_lists',
        columns: [
          new TableColumn({
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          }),
          new TableColumn({
            name: 'session_id',
            type: 'uuid',
            isNullable: false,
          }),
          new TableColumn({
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          }),
          new TableColumn({
            name: 'description',
            type: 'text',
            isNullable: true,
          }),
          new TableColumn({
            name: 'contact_count',
            type: 'integer',
            default: 0,
          }),
          new TableColumn({
            name: 'source', // 'manual', 'excel', 'salla_webhook', 'api'
            type: 'varchar',
            length: '50',
            isNullable: false,
          }),
          new TableColumn({
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          }),
          new TableColumn({
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          }),
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['session_id'],
            referencedTableName: 'session',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
        ],
      }),
      true,
    );

    // 📱 جدول جهات الاتصال (Contacts)
    await queryRunner.createTable(
      new Table({
        name: 'contacts',
        columns: [
          new TableColumn({
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          }),
          new TableColumn({
            name: 'contact_list_id',
            type: 'uuid',
            isNullable: false,
          }),
          new TableColumn({
            name: 'phone',
            type: 'varchar',
            length: '20',
            isNullable: false,
          }),
          new TableColumn({
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          }),
          new TableColumn({
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          }),
          new TableColumn({
            name: 'city',
            type: 'varchar',
            length: '255',
            isNullable: true,
          }),
          new TableColumn({
            name: 'custom_data',
            type: 'jsonb',
            isNullable: true,
          }),
          new TableColumn({
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          }),
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['contact_list_id'],
            referencedTableName: 'contact_lists',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
        ],
      }),
      true,
    );

    // 📨 جدول الرسائل الجماعية (Bulk Messages)
    await queryRunner.createTable(
      new Table({
        name: 'bulk_messages',
        columns: [
          new TableColumn({
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          }),
          new TableColumn({
            name: 'session_id',
            type: 'uuid',
            isNullable: false,
          }),
          new TableColumn({
            name: 'contact_list_id',
            type: 'uuid',
            isNullable: true, // للرسائل الفورية قد لا تكون هناك قائمة محفوظة
          }),
          new TableColumn({
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: false,
          }),
          new TableColumn({
            name: 'message_template',
            type: 'text',
            isNullable: false,
          }),
          new TableColumn({
            name: 'message_type', // 'text', 'image', 'document', 'video'
            type: 'varchar',
            length: '50',
            default: 'text',
          }),
          new TableColumn({
            name: 'media_url',
            type: 'text',
            isNullable: true,
          }),
          new TableColumn({
            name: 'total_contacts',
            type: 'integer',
            default: 0,
          }),
          new TableColumn({
            name: 'sent_count',
            type: 'integer',
            default: 0,
          }),
          new TableColumn({
            name: 'failed_count',
            type: 'integer',
            default: 0,
          }),
          new TableColumn({
            name: 'pending_count',
            type: 'integer',
            default: 0,
          }),
          new TableColumn({
            name: 'status', // 'draft', 'scheduled', 'processing', 'completed', 'failed'
            type: 'varchar',
            length: '50',
            default: 'draft',
          }),
          new TableColumn({
            name: 'scheduled_at',
            type: 'timestamp',
            isNullable: true,
          }),
          new TableColumn({
            name: 'started_at',
            type: 'timestamp',
            isNullable: true,
          }),
          new TableColumn({
            name: 'completed_at',
            type: 'timestamp',
            isNullable: true,
          }),
          new TableColumn({
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          }),
          new TableColumn({
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          }),
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['session_id'],
            referencedTableName: 'session',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
          new TableForeignKey({
            columnNames: ['contact_list_id'],
            referencedTableName: 'contact_lists',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          }),
        ],
      }),
      true,
    );

    // 📤 جدول سجلات الإرسال (Message Logs)
    await queryRunner.createTable(
      new Table({
        name: 'message_logs',
        columns: [
          new TableColumn({
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          }),
          new TableColumn({
            name: 'bulk_message_id',
            type: 'uuid',
            isNullable: false,
          }),
          new TableColumn({
            name: 'contact_id',
            type: 'uuid',
            isNullable: false,
          }),
          new TableColumn({
            name: 'phone',
            type: 'varchar',
            length: '20',
            isNullable: false,
          }),
          new TableColumn({
            name: 'message_text',
            type: 'text',
            isNullable: false,
          }),
          new TableColumn({
            name: 'status', // 'pending', 'sent', 'delivered', 'read', 'failed'
            type: 'varchar',
            length: '50',
            default: 'pending',
          }),
          new TableColumn({
            name: 'error_message',
            type: 'text',
            isNullable: true,
          }),
          new TableColumn({
            name: 'sent_at',
            type: 'timestamp',
            isNullable: true,
          }),
          new TableColumn({
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          }),
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['bulk_message_id'],
            referencedTableName: 'bulk_messages',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
          new TableForeignKey({
            columnNames: ['contact_id'],
            referencedTableName: 'contacts',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
        ],
      }),
      true,
    );

    // 🔄 جدول الرسائل الدورية (Recurring Messages)
    await queryRunner.createTable(
      new Table({
        name: 'recurring_messages',
        columns: [
          new TableColumn({
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          }),
          new TableColumn({
            name: 'session_id',
            type: 'uuid',
            isNullable: false,
          }),
          new TableColumn({
            name: 'contact_list_id',
            type: 'uuid',
            isNullable: true,
          }),
          new TableColumn({
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: false,
          }),
          new TableColumn({
            name: 'message_template',
            type: 'text',
            isNullable: false,
          }),
          new TableColumn({
            name: 'frequency', // 'daily', 'weekly', 'monthly'
            type: 'varchar',
            length: '50',
            isNullable: false,
          }),
          new TableColumn({
            name: 'scheduled_time',
            type: 'time',
            isNullable: false,
          }),
          new TableColumn({
            name: 'timezone',
            type: 'varchar',
            length: '50',
            default: 'UTC',
          }),
          new TableColumn({
            name: 'is_active',
            type: 'boolean',
            default: true,
          }),
          new TableColumn({
            name: 'start_date',
            type: 'date',
            isNullable: false,
          }),
          new TableColumn({
            name: 'end_date',
            type: 'date',
            isNullable: true,
          }),
          new TableColumn({
            name: 'last_sent_at',
            type: 'timestamp',
            isNullable: true,
          }),
          new TableColumn({
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          }),
          new TableColumn({
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          }),
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['session_id'],
            referencedTableName: 'session',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
        ],
      }),
      true,
    );

    // 🛒 جدول السلات المتروكة (Abandoned Carts - Salla)
    await queryRunner.createTable(
      new Table({
        name: 'abandoned_carts',
        columns: [
          new TableColumn({
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          }),
          new TableColumn({
            name: 'session_id',
            type: 'uuid',
            isNullable: false,
          }),
          new TableColumn({
            name: 'salla_cart_id',
            type: 'varchar',
            length: '255',
            isNullable: false,
          }),
          new TableColumn({
            name: 'customer_phone',
            type: 'varchar',
            length: '20',
            isNullable: false,
          }),
          new TableColumn({
            name: 'customer_name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          }),
          new TableColumn({
            name: 'customer_email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          }),
          new TableColumn({
            name: 'cart_items',
            type: 'jsonb',
            isNullable: false,
          }),
          new TableColumn({
            name: 'cart_total',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          }),
          new TableColumn({
            name: 'reminder_sent',
            type: 'boolean',
            default: false,
          }),
          new TableColumn({
            name: 'reminder_sent_at',
            type: 'timestamp',
            isNullable: true,
          }),
          new TableColumn({
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          }),
          new TableColumn({
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          }),
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['session_id'],
            referencedTableName: 'session',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
        ],
      }),
      true,
    );

    // 🎯 جدول الوظائف (Jobs/Queue)
    await queryRunner.createTable(
      new Table({
        name: 'jobs',
        columns: [
          new TableColumn({
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          }),
          new TableColumn({
            name: 'job_type', // 'send_bulk_message', 'send_recurring_message', 'sync_abandoned_carts'
            type: 'varchar',
            length: '100',
            isNullable: false,
          }),
          new TableColumn({
            name: 'data',
            type: 'jsonb',
            isNullable: true,
          }),
          new TableColumn({
            name: 'status', // 'pending', 'processing', 'completed', 'failed'
            type: 'varchar',
            length: '50',
            default: 'pending',
          }),
          new TableColumn({
            name: 'attempts',
            type: 'integer',
            default: 0,
          }),
          new TableColumn({
            name: 'max_attempts',
            type: 'integer',
            default: 3,
          }),
          new TableColumn({
            name: 'error_message',
            type: 'text',
            isNullable: true,
          }),
          new TableColumn({
            name: 'scheduled_at',
            type: 'timestamp',
            isNullable: true,
          }),
          new TableColumn({
            name: 'started_at',
            type: 'timestamp',
            isNullable: true,
          }),
          new TableColumn({
            name: 'completed_at',
            type: 'timestamp',
            isNullable: true,
          }),
          new TableColumn({
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          }),
        ],
      }),
      true,
    );

    // 📊 إنشاء الفهارس لتحسين الأداء
    await queryRunner.createIndex(
      'contacts',
      new TableIndex({
        name: 'idx_contacts_phone',
        columnNames: ['phone'],
      }),
    );

    await queryRunner.createIndex(
      'contacts',
      new TableIndex({
        name: 'idx_contacts_list_id',
        columnNames: ['contact_list_id'],
      }),
    );

    await queryRunner.createIndex(
      'bulk_messages',
      new TableIndex({
        name: 'idx_bulk_messages_session_id',
        columnNames: ['session_id'],
      }),
    );

    await queryRunner.createIndex(
      'bulk_messages',
      new TableIndex({
        name: 'idx_bulk_messages_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'message_logs',
      new TableIndex({
        name: 'idx_message_logs_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'jobs',
      new TableIndex({
        name: 'idx_jobs_status',
        columnNames: ['status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('jobs');
    await queryRunner.dropTable('abandoned_carts');
    await queryRunner.dropTable('recurring_messages');
    await queryRunner.dropTable('message_logs');
    await queryRunner.dropTable('bulk_messages');
    await queryRunner.dropTable('contacts');
    await queryRunner.dropTable('contact_lists');
  }
}
