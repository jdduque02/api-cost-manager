import { Injectable, Logger } from '@nestjs/common';
import { BankAccountRepository } from '@banking/repositories/bank-account.repository';
import { CreateBankAccountDto } from '@banking/dto/bank-account/create-bank-account.dto';
import { UpdateBankAccountDto } from '@banking/dto/bank-account/update-bank-account.dto';
import { BankAccount } from '@banking/entities/bank-account.entity';

@Injectable()
export class BankAccountService {
  private readonly logger = new Logger(BankAccountService.name);

  constructor(private readonly bankAccountRepository: BankAccountRepository) {}

  async create(userId: number, dto: CreateBankAccountDto): Promise<BankAccount> {
    // Los campos sensibles se cifran externamente con pgp_sym_encrypt (pgcrypto).
    // Por ahora se almacena como buffer del string plano; en producción usar CryptoService.
    const encryptedAccountNumber = Buffer.from(dto.account_number, 'utf8');
    const encryptedBalance = Buffer.from(String(dto.balance), 'utf8');
    return this.bankAccountRepository.create(userId, dto, encryptedAccountNumber, encryptedBalance);
  }

  async findAll(userId: number): Promise<BankAccount[]> {
    return this.bankAccountRepository.findAll(userId);
  }

  async findOne(id: number, userId: number): Promise<BankAccount> {
    return this.bankAccountRepository.findById(id, userId);
  }

  async update(id: number, userId: number, dto: UpdateBankAccountDto): Promise<BankAccount> {
    const partial: Partial<BankAccount> = {
      bank_name: dto.bank_name,
      account_type: dto.account_type,
      is_primary: dto.is_primary,
    };
    if (dto.account_number) partial.encrypted_account_number = Buffer.from(dto.account_number, 'utf8');
    if (dto.balance !== undefined) partial.encrypted_balance = Buffer.from(String(dto.balance), 'utf8');
    return this.bankAccountRepository.update(id, userId, partial);
  }

  async remove(id: number, userId: number): Promise<void> {
    return this.bankAccountRepository.softDelete(id, userId);
  }
}
