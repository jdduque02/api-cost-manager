import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FinancialProfile } from './financial-profile.entity';

@Entity({ name: 'app_user', schema: 'identity' })
export class AppUser {
  @PrimaryGeneratedColumn('identity', { type: 'bigint' })
  id!: string;

  // UUID del usuario en Keycloak (campo 'sub' del JWT — nunca generado internamente)
  @Column({ type: 'varchar', length: 36, unique: true, nullable: true })
  @Index('idx_user_external_id')
  external_id!: string;

  @Column({ type: 'citext', unique: true })
  username!: string;

  @Column({ type: 'citext', unique: true })
  @Index('idx_user_email')
  email!: string;

  @Column({ type: 'varchar', length: 10, default: 'es-CO' })
  locale!: string;

  @Column({ type: 'varchar', length: 50, default: 'America/Bogota' })
  timezone!: string;

  @Column({ type: 'jsonb', default: '{}' })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updated_at!: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deleted_at!: Date;

  @Column({ type: 'boolean', default: true })
  @Index('idx_user_active')
  is_active!: boolean;

  // ── Relaciones ──────────────────────────────────────────────
  @OneToOne(() => FinancialProfile, ({ user }) => user, { cascade: true })
  @JoinColumn({ name: 'id', referencedColumnName: 'user_id' })
  financial_profile!: FinancialProfile;
}
