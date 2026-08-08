import { Injectable, Logger } from '@nestjs/common';
import { BankAccountRepository } from '@banking/repositories/bank-account.repository';
import { CreateBankAccountDto } from '@banking/dto/bank-account/create-bank-account.dto';
import { UpdateBankAccountDto } from '@banking/dto/bank-account/update-bank-account.dto';
import { BankAccount } from '@banking/entities/bank-account.entity';
import { BankAccountResponseDto } from '@banking/dto/bank-account/bank-account-response.dto';
import { EncryptionService } from '@shared/services/encryption.service';

@Injectable()
export class BankAccountService {
  private readonly logger = new Logger(BankAccountService.name);

  constructor(
    private readonly bankAccountRepository: BankAccountRepository,
    private readonly encryptionService: EncryptionService,
  ) {}

  private toResponseDto(entity: BankAccount): BankAccountResponseDto {
    const rawBalance = entity.encrypted_balance
      ? this.encryptionService.decryptField(entity.encrypted_balance, 'banking')
      : '0';
    const rawAccountNumber = entity.encrypted_account_number
      ? this.encryptionService.decryptField(
          entity.encrypted_account_number,
          'banking',
        )
      : '';
    const maskedNumber = rawAccountNumber
      ? '****' + rawAccountNumber.slice(-4)
      : '****0000';

    return {
      id: entity.id,
      user_id: entity.user_id,
      bank_name: entity.bank_name,
      account_type: entity.account_type,
      masked_account_number: maskedNumber,
      display_balance: rawBalance ?? '0',
      currency: entity.currency,
      annual_interest_rate: entity.annual_interest_rate ?? null,
      yield_frequency: entity.yield_frequency ?? 'monthly',
      is_primary: entity.is_primary,
      exempt_4x1000: entity.exempt_4x1000,
      created_at: entity.created_at,
      updated_at: entity.updated_at ?? null,
    };
  }

  async create(
    userId: number,
    dto: CreateBankAccountDto,
  ): Promise<BankAccountResponseDto> {
    const encryptedAccountNumber = this.encryptionService.encryptField(
      dto.account_number,
      'banking',
    );
    const encryptedBalance = this.encryptionService.encryptField(
      String(dto.balance),
      'banking',
    );
    const entity = await this.bankAccountRepository.create(
      userId,
      dto,
      encryptedAccountNumber,
      encryptedBalance,
    );
    return this.toResponseDto(entity);
  }

  async findAll(userId: number): Promise<BankAccountResponseDto[]> {
    const entities = await this.bankAccountRepository.findAll(userId);
    return entities.map((e) => this.toResponseDto(e));
  }

  async findOne(id: number, userId: number): Promise<BankAccountResponseDto> {
    const entity = await this.bankAccountRepository.findById(id, userId);
    return this.toResponseDto(entity);
  }

  async update(
    id: number,
    userId: number,
    dto: UpdateBankAccountDto,
  ): Promise<BankAccountResponseDto> {
    const partial: Partial<BankAccount> = {
      bank_name: dto.bank_name,
      account_type: dto.account_type,
      currency: dto.currency,
      is_primary: dto.is_primary,
      exempt_4x1000: dto.exempt_4x1000,
    };
    if (dto.annual_interest_rate !== undefined) {
      partial.annual_interest_rate = dto.annual_interest_rate;
    }
    if (dto.yield_frequency !== undefined) {
      partial.yield_frequency = dto.yield_frequency;
    }
    if (dto.account_number) {
      partial.encrypted_account_number = this.encryptionService.encryptField(
        dto.account_number,
        'banking',
      );
    }
    if (dto.balance !== undefined) {
      partial.encrypted_balance = this.encryptionService.encryptField(
        String(dto.balance),
        'banking',
      );
    }
    const entity = await this.bankAccountRepository.update(id, userId, partial);
    return this.toResponseDto(entity);
  }

  async getProjectedYield(
    id: number,
    userId: number,
  ): Promise<{
    current_balance: number;
    annual_rate: number | null;
    yield_frequency: string;
    projected: Record<string, number>;
  }> {
    const entity = await this.bankAccountRepository.findById(id, userId);
    const rawBalance = entity.encrypted_balance
      ? Number(this.encryptionService.decryptField(entity.encrypted_balance, 'banking'))
      : 0;
    const rate = entity.annual_interest_rate ?? 0;
    const freq = entity.yield_frequency ?? 'monthly';

    const periodsPerYear =
      freq === 'daily' ? 365 : freq === 'monthly' ? 12 : 1;

    const projected: Record<string, number> = {};
    for (const years of [1, 3, 5, 10]) {
      const totalPeriods = periodsPerYear * years;
      const periodicRate = rate / 100 / periodsPerYear;
      if (periodicRate > 0) {
        projected[`${years}y`] =
          Math.round(rawBalance * Math.pow(1 + periodicRate, totalPeriods) * 100) / 100;
      } else {
        projected[`${years}y`] = rawBalance;
      }
    }

    return {
      current_balance: rawBalance,
      annual_rate: entity.annual_interest_rate ?? null,
      yield_frequency: freq,
      projected,
    };
  }

  async remove(id: number, userId: number): Promise<void> {
    return this.bankAccountRepository.softDelete(id, userId);
  }
}
