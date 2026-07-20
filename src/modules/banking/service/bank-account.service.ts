import { Injectable, Logger } from '@nestjs/common';
import { BankAccountRepository } from '@banking/repositories/bank-account.repository';
import { CreateBankAccountDto } from '@banking/dto/bank-account/create-bank-account.dto';
import { UpdateBankAccountDto } from '@banking/dto/bank-account/update-bank-account.dto';
import { BankAccount } from '@banking/entities/bank-account.entity';
import { BankAccountResponseDto } from '@banking/dto/bank-account/bank-account-response.dto';

@Injectable()
export class BankAccountService {
  private readonly logger = new Logger(BankAccountService.name);

  constructor(private readonly bankAccountRepository: BankAccountRepository) {}

  private toResponseDto(entity: BankAccount): BankAccountResponseDto {
    const displayBalance = entity.encrypted_balance
      ? Buffer.from(entity.encrypted_balance).toString('utf8')
      : '0';
    const maskedNumber = entity.encrypted_account_number
      ? '****' + Buffer.from(entity.encrypted_account_number).toString('utf8').slice(-4)
      : '****0000';

    return {
      id: entity.id,
      user_id: entity.user_id,
      bank_name: entity.bank_name,
      account_type: entity.account_type,
      masked_account_number: maskedNumber,
      display_balance: displayBalance,
      is_primary: entity.is_primary,
      created_at: entity.created_at,
      updated_at: entity.updated_at ?? null,
    };
  }

  async create(userId: number, dto: CreateBankAccountDto): Promise<BankAccountResponseDto> {
    const encryptedAccountNumber = Buffer.from(dto.account_number, 'utf8');
    const encryptedBalance = Buffer.from(String(dto.balance), 'utf8');
    const entity = await this.bankAccountRepository.create(userId, dto, encryptedAccountNumber, encryptedBalance);
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

  async update(id: number, userId: number, dto: UpdateBankAccountDto): Promise<BankAccountResponseDto> {
    const partial: Partial<BankAccount> = {
      bank_name: dto.bank_name,
      account_type: dto.account_type,
      is_primary: dto.is_primary,
    };
    if (dto.account_number) partial.encrypted_account_number = Buffer.from(dto.account_number, 'utf8');
    if (dto.balance !== undefined) partial.encrypted_balance = Buffer.from(String(dto.balance), 'utf8');
    const entity = await this.bankAccountRepository.update(id, userId, partial);
    return this.toResponseDto(entity);
  }

  async remove(id: number, userId: number): Promise<void> {
    return this.bankAccountRepository.softDelete(id, userId);
  }
}
