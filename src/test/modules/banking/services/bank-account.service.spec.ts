import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BankAccountService } from '@banking/service/bank-account.service';
import { BankAccountRepository } from '@banking/repositories/bank-account.repository';
import { CreateBankAccountDto } from '@banking/dto/bank-account/create-bank-account.dto';
import { UpdateBankAccountDto } from '@banking/dto/bank-account/update-bank-account.dto';
import { BankAccount } from '@banking/entities/bank-account.entity';
import { EncryptionService } from '@shared/services/encryption.service';

const mockBankAccountRepository = {
  create: jest.fn<
    Promise<BankAccount>,
    [number, CreateBankAccountDto, string | null, string | null]
  >(),
  findAll: jest.fn<Promise<BankAccount[]>, [number]>(),
  findById: jest.fn<Promise<BankAccount>, [number, number]>(),
  update: jest.fn<
    Promise<BankAccount>,
    [number, number, Partial<BankAccount>]
  >(),
  softDelete: jest.fn<Promise<void>, [number, number]>(),
};

const mockEncryptionService = {
  encryptField: jest.fn((value: string) => `enc:${value}`),
  decryptField: jest.fn((value: string) => value.replace(/^enc:/, '')),
  encrypt: jest.fn((value: string) => value),
  decrypt: jest.fn((value: string) => value),
};

const buildAccount = (overrides = {}): BankAccount =>
  ({
    id: 1,
    user_id: 10,
    bank_name: 'Bancolombia',
    account_type: 'ahorros',
    encrypted_account_number: 'enc:123456789',
    encrypted_balance: 'enc:1500000',
    currency: 'COP',
    is_primary: false,
    exempt_4x1000: false,
    deleted_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  }) as unknown as BankAccount;

describe('BankAccountService', () => {
  let service: BankAccountService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankAccountService,
        { provide: BankAccountRepository, useValue: mockBankAccountRepository },
        { provide: EncryptionService, useValue: mockEncryptionService },
      ],
    }).compile();

    service = module.get<BankAccountService>(BankAccountService);
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────
  // create
  // ─────────────────────────────────────────────────────────────
  describe('create', () => {
    const dto: CreateBankAccountDto = {
      bank_name: 'Bancolombia',
      account_type: 'ahorros',
      account_number: '123456789',
      balance: 1500000,
    };

    it('debe cifrar account_number y balance antes de delegar al repositorio', async () => {
      mockBankAccountRepository.create.mockResolvedValue(buildAccount());

      const result = await service.create(10, dto);

      expect(mockEncryptionService.encryptField).toHaveBeenCalledWith(
        '123456789',
        'banking',
      );
      expect(mockEncryptionService.encryptField).toHaveBeenCalledWith(
        '1500000',
        'banking',
      );
      expect(mockBankAccountRepository.create).toHaveBeenCalledTimes(1);
      const [userId, dtoArg, encNum, encBal] =
        mockBankAccountRepository.create.mock.calls[0];
      expect(userId).toBe(10);
      expect(dtoArg).toEqual(dto);
      expect(encNum).toBe('enc:123456789');
      expect(encBal).toBe('enc:1500000');
      expect(result).toEqual({
        id: 1,
        user_id: 10,
        bank_name: 'Bancolombia',
        account_type: 'ahorros',
        masked_account_number: '****6789',
        display_balance: '1500000',
        currency: 'COP',
        annual_interest_rate: null,
        yield_frequency: 'monthly',
        is_primary: false,
        exempt_4x1000: false,
        created_at: expect.any(Date) as Date,
        updated_at: expect.any(Date) as Date,
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // findAll
  // ─────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('debe retornar las cuentas del usuario como DTOs', async () => {
      const accounts = [buildAccount()];
      mockBankAccountRepository.findAll.mockResolvedValue(accounts);

      const result = await service.findAll(10);

      expect(mockBankAccountRepository.findAll).toHaveBeenCalledWith(10);
      expect(result[0]).toHaveProperty('masked_account_number', '****6789');
      expect(result[0]).toHaveProperty('display_balance', '1500000');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // findOne
  // ─────────────────────────────────────────────────────────────
  describe('findOne', () => {
    it('debe retornar cuenta por id y userId', async () => {
      const account = buildAccount();
      mockBankAccountRepository.findById.mockResolvedValue(account);

      const result = await service.findOne(1, 10);

      expect(mockBankAccountRepository.findById).toHaveBeenCalledWith(1, 10);
      expect(result).toHaveProperty('masked_account_number', '****6789');
    });

    it('debe propagar NotFoundException del repositorio', async () => {
      mockBankAccountRepository.findById.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(service.findOne(999, 10)).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // update
  // ─────────────────────────────────────────────────────────────
  describe('update', () => {
    it('debe actualizar campos básicos sin cifrado cuando no cambia account_number ni balance', async () => {
      const dto: UpdateBankAccountDto = {
        bank_name: 'Davivienda',
        is_primary: true,
      };
      const updated = buildAccount({ bank_name: 'Davivienda' });
      mockBankAccountRepository.update.mockResolvedValue(updated);

      const result = await service.update(1, 10, dto);

      const [id, userId, partial] =
        mockBankAccountRepository.update.mock.calls[0];
      expect(id).toBe(1);
      expect(userId).toBe(10);
      expect(partial.bank_name).toBe('Davivienda');
      expect(partial.encrypted_account_number).toBeUndefined();
      expect(result).toHaveProperty('bank_name', 'Davivienda');
    });

    it('debe cifrar account_number si se provee en la actualización', async () => {
      const dto: UpdateBankAccountDto = { account_number: '987654321' };
      mockBankAccountRepository.update.mockResolvedValue(buildAccount());

      await service.update(1, 10, dto);

      expect(mockEncryptionService.encryptField).toHaveBeenCalledWith(
        '987654321',
        'banking',
      );
      const [, , partial] = mockBankAccountRepository.update.mock.calls[0];
      expect(partial.encrypted_account_number).toBe('enc:987654321');
    });

    it('debe cifrar balance si se provee en la actualización', async () => {
      const dto: UpdateBankAccountDto = { balance: 2000000 };
      mockBankAccountRepository.update.mockResolvedValue(buildAccount());

      await service.update(1, 10, dto);

      const [, , partial] = mockBankAccountRepository.update.mock.calls[0];
      expect(partial.encrypted_balance).toBe('enc:2000000');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // remove
  // ─────────────────────────────────────────────────────────────
  describe('remove', () => {
    it('debe delegar el soft delete al repositorio', async () => {
      mockBankAccountRepository.softDelete.mockResolvedValue(undefined);

      await service.remove(1, 10);

      expect(mockBankAccountRepository.softDelete).toHaveBeenCalledWith(1, 10);
    });
  });
});
