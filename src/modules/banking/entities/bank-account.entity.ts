import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * SENSIBLE: Los campos encrypted_account_number y encrypted_balance
 * están cifrados con pgp_sym_encrypt (pgcrypto).
 * NUNCA descifrar fuera de CryptoService.
 */
@Entity({ name: 'bank_account', schema: 'banking' })
export class BankAccount {
  @PrimaryGeneratedColumn('identity', { type: 'bigint' })
  id!: number;

  @Column({ type: 'bigint' })
  @Index('idx_bank_account_user')
  user_id!: number;

  @Column({ type: 'varchar', length: 100 })
  bank_name!: string;

  @Column({ type: 'varchar', length: 50 })
  account_type!: string;

  @Column({ type: 'bytea' })
  encrypted_account_number!: Buffer;

  @Column({ type: 'bytea' })
  encrypted_balance!: Buffer;

  @Column({ type: 'varchar', length: 3, default: 'COP' })
  currency!: string;

  @Column({ type: 'boolean', default: false })
  @Index('idx_bank_account_primary')
  is_primary!: boolean;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updated_at!: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deleted_at!: Date;
}
