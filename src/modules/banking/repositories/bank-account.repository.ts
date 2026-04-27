import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, QueryFailedError, Repository } from 'typeorm';
import { BankAccount } from '@banking/entities/bank-account.entity';
import { CreateBankAccountDto } from '@banking/dto/bank-account/create-bank-account.dto';

const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class BankAccountRepository {
  private readonly logger = new Logger(BankAccountRepository.name);

  constructor(
    @InjectRepository(BankAccount)
    private readonly repo: Repository<BankAccount>,
  ) {}

  async create(userId: number, dto: CreateBankAccountDto, encryptedAccountNumber: Buffer, encryptedBalance: Buffer): Promise<BankAccount> {
    try {
      const account = this.repo.create({
        user_id: userId,
        bank_name: dto.bank_name,
        account_type: dto.account_type,
        encrypted_account_number: encryptedAccountNumber,
        encrypted_balance: encryptedBalance,
        is_primary: dto.is_primary ?? false,
      });
      const saved = await this.repo.save(account);
      this.logger.log(`Cuenta bancaria creada para usuario ID: ${userId}`);
      return saved;
    } catch (error) {
      this.handleDbError(error);
    }
  }

  async findAll(userId: number): Promise<BankAccount[]> {
    return this.repo.find({ where: { user_id: userId, deleted_at: IsNull() }, order: { created_at: 'DESC' } });
  }

  async findById(id: number, userId: number): Promise<BankAccount> {
    const account = await this.repo.findOne({ where: { id, user_id: userId, deleted_at: IsNull() } });
    if (!account) throw new NotFoundException(`Cuenta bancaria con id ${id} no encontrada.`);
    return account;
  }

  async update(id: number, userId: number, dto: Partial<BankAccount>): Promise<BankAccount> {
    const account = await this.findById(id, userId);
    const updated = this.repo.merge(account, dto);
    const saved = await this.repo.save(updated);
    this.logger.log(`Cuenta bancaria ID ${id} actualizada para usuario ID: ${userId}`);
    return saved;
  }

  async softDelete(id: number, userId: number): Promise<void> {
    const account = await this.findById(id, userId);
    await this.repo.softRemove(account);
    this.logger.log(`Cuenta bancaria ID ${id} eliminada (soft) para usuario ID: ${userId}`);
  }

  private handleDbError(error: unknown): never {
    if (error instanceof QueryFailedError && (error as any).code === PG_UNIQUE_VIOLATION) {
      throw new ConflictException('Ya existe una cuenta con esos datos.');
    }
    this.logger.error(`Error de base de datos: ${(error as Error).message}`);
    throw new InternalServerErrorException('Error al procesar la solicitud.');
  }
}
