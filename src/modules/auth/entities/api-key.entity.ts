import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index, ValueTransformer } from 'typeorm';

// Transformer to store Date as integer epoch in SQLite (avoids 'Object' type error for Date|null)
const dateEpochTransformer: ValueTransformer = {
  to: (value: Date | null | undefined): number | null => (value ? value.getTime() : null),
  from: (value: number | null | undefined): Date | null => (value ? new Date(value) : null),
};

export enum ApiKeyRole {
  ADMIN = 'admin',
  OPERATOR = 'operator',
  VIEWER = 'viewer',
}

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  keyHash: string;

  @Column({ type: 'varchar', length: 8 })
  keyPrefix: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: ApiKeyRole.OPERATOR,
  })
  role: ApiKeyRole;

  @Column({ type: 'simple-array', nullable: true })
  allowedIps: string[] | null;

  @Column({ type: 'simple-array', nullable: true })
  allowedSessions: string[] | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'integer', nullable: true, transformer: dateEpochTransformer })
  expiresAt: Date | null;

  @Column({ type: 'integer', nullable: true, transformer: dateEpochTransformer })
  lastUsedAt: Date | null;

  @Column({ type: 'int', default: 0 })
  usageCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
