import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PaymentMethodEnum, TransactionTypeEnum } from '@shared/enums';

/**
 * CRÍTICO: Esta tabla está PARTICIONADA por RANGE(created_at) — trimestral.
 * SIEMPRE incluir created_at en el WHERE para habilitar partition pruning.
 * Soft delete obligatorio — nunca eliminar físicamente registros.
 */
@Entity({ name: 'transaction_record', schema: 'finance' })
@Index('idx_transaction_user_created', ['user_id', 'created_at'])
@Index('idx_transaction_category', ['category_id'])
@Index('idx_transaction_type', ['type'])
export class TransactionRecord {
  @PrimaryGeneratedColumn('identity', { type: 'bigint' })
  id!: number;

  @Column({ type: 'bigint' })
  @Index('idx_transaction_user')
  user_id!: number;

  @Column({ type: 'bigint' })
  category_id!: number;

  @Column({ type: 'bigint', nullable: true })
  subcategory_id!: number;

  @Column({
    type: 'enum',
    enum: TransactionTypeEnum,
    enumName: 'transaction_type_enum',
  })
  type!: TransactionTypeEnum;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  amount!: number;

  @Column({
    type: 'enum',
    enum: PaymentMethodEnum,
    enumName: 'payment_method_enum',
    nullable: true,
  })
  payment_method!: PaymentMethodEnum;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference_code!: string;

  @Column({ type: 'text', array: true, nullable: true, default: '{}' })
  attachments!: string[];

  @Column({ type: 'varchar', length: 100, nullable: true })
  source_account!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  destination_account!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  source_bank!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  destination_bank!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  addressee!: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updated_at!: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deleted_at!: Date;
}
