import { Exclude, Expose, Type } from 'class-transformer';
import { FinancialProfileResponseDto } from '../financial-profile/financial-profile-response.dto';

/**
 * DTO de respuesta para un usuario.
 * Controla qué campos se exponen al cliente.
 */
@Exclude()
export class UserResponseDto {
  @Expose()
  id: number;

  @Expose()
  external_id: string;

  @Expose()
  username: string;

  @Expose()
  email: string;

  @Expose()
  locale: string;

  @Expose()
  timezone: string;

  @Expose()
  metadata: Record<string, unknown>;

  @Expose()
  is_active: boolean;

  @Expose()
  created_at: Date;

  @Expose()
  updated_at: Date;

  @Expose()
  @Type(() => FinancialProfileResponseDto)
  financial_profile: FinancialProfileResponseDto;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
