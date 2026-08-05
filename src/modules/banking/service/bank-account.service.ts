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
      is_primary: entity.is_primary,
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
    };
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

  async remove(id: number, userId: number): Promise<void> {
    return this.bankAccountRepository.softDelete(id, userId);
  }
}
