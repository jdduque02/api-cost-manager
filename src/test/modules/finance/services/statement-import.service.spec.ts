import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { StatementImportService } from '@finance/service/statement-import.service';
import { StatementImportRepository } from '@finance/repositories/statement-import.repository';
import { TransactionRecordRepository } from '@finance/repositories/transaction-record.repository';
import { NotificationService } from '@notification/service/notification.service';
import { CategoryService } from '@catalog/service/category.service';
import { BankingEntityService } from '@support/service/banking-entity.service';
import {
  StatementImport,
  StatementImportStatusEnum,
} from '@finance/entities/statement-import.entity';
import {
  StatementImportFile,
  StatementImportFileStatusEnum,
} from '@finance/entities/statement-import-file.entity';
import { TransactionTypeEnum } from '@shared/enums';
import {
  parsePdfStatement,
  ParsedStatementTransaction,
} from '@finance/service/bank-statement-parser';

jest.mock('@finance/service/bank-statement-parser');

jest.mock('node:fs/promises', () => {
  const actual = jest.requireActual('node:fs/promises') as unknown as Record<
    string,
    unknown
  >;
  return {
    ...actual,
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn(),
    rm: jest.fn().mockResolvedValue(undefined),
  };
});

const mockParsePdfStatement = parsePdfStatement as jest.MockedFunction<
  typeof parsePdfStatement
>;

const mockStatementImportRepository = {
  createJob: jest.fn(),
  findJobsByUser: jest.fn(),
  findJobById: jest.fn(),
  findFilesByImport: jest.fn(),
  markProcessing: jest.fn(),
  markFileProcessing: jest.fn(),
  markFileSuccess: jest.fn(),
  markFileFailed: jest.fn(),
  finishJob: jest.fn(),
  clearStoragePath: jest.fn(),
};

const mockTransactionRecordRepository = {
  findExistingFingerprints: jest.fn(),
  createMany: jest.fn(),
};

const mockNotificationService = {
  create: jest.fn(),
  sendStatementImportProgress: jest.fn(),
};

const mockCategoryService = {
  findAll: jest.fn(),
};

const mockBankingEntityService = {
  getActiveDetections: jest.fn(),
};

const mockI18n = {
  t: jest.fn((key: string) => key),
};

const buildJob = (overrides: Partial<StatementImport> = {}): StatementImport =>
  ({
    id: 1,
    user_id: 10,
    status: StatementImportStatusEnum.PENDING,
    total_files: 1,
    processed_files: 0,
    success_files: 0,
    failed_files: 0,
    total_records_parsed: 0,
    total_records_created: 0,
    total_records_skipped: 0,
    total_records_failed: 0,
    options: { skip_duplicates: true },
    error: null,
    created_at: new Date('2026-07-01T00:00:00.000Z'),
    updated_at: null,
    ...overrides,
  }) as StatementImport;

const buildFile = (
  overrides: Partial<StatementImportFile> = {},
): StatementImportFile =>
  ({
    id: 1,
    import_id: 1,
    filename: 'extracto.pdf',
    mimetype: 'application/pdf',
    size_bytes: 1234,
    storage_path: '/tmp/cm-import-test/extracto.pdf',
    status: StatementImportFileStatusEnum.PENDING,
    records_parsed: 0,
    records_created: 0,
    records_skipped: 0,
    error_code: null,
    error_message: null,
    processed_at: null,
    created_at: new Date('2026-07-01T00:00:00.000Z'),
    updated_at: null,
    ...overrides,
  }) as StatementImportFile;

const buildParsedTx = (
  overrides: Partial<ParsedStatementTransaction> = {},
): ParsedStatementTransaction => ({
  transaction_date: '2026-07-15',
  description: 'ABONO SUCURSAL VIRTUAL',
  amount: 1547390,
  type: TransactionTypeEnum.INCOME,
  ...overrides,
});

const pdfBuffer = Buffer.from('%PDF-1.4 extracto de prueba');

const pdfFile = {
  originalname: 'extracto.pdf',
  mimetype: 'application/pdf',
  size: 1234,
  buffer: pdfBuffer,
};

/** Descarga la cola de procesamiento asíncrono encadenada en el servicio. */
const flushChain = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

describe('StatementImportService', () => {
  let service: StatementImportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatementImportService,
        {
          provide: StatementImportRepository,
          useValue: mockStatementImportRepository,
        },
        {
          provide: TransactionRecordRepository,
          useValue: mockTransactionRecordRepository,
        },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: CategoryService, useValue: mockCategoryService },
        {
          provide: BankingEntityService,
          useValue: mockBankingEntityService,
        },
        { provide: I18nService, useValue: mockI18n },
      ],
    }).compile();

    service = module.get<StatementImportService>(StatementImportService);
    jest.resetAllMocks();
    (mockI18n.t as jest.Mock).mockImplementation((key: string) => key);
    (mkdir as jest.Mock).mockResolvedValue(undefined);
    (writeFile as jest.Mock).mockResolvedValue(undefined);
    (readFile as jest.Mock).mockResolvedValue(pdfBuffer);
    (rm as jest.Mock).mockResolvedValue(undefined);
    mockCategoryService.findAll.mockResolvedValue([{ id: 2, name: 'General' }]);
    mockBankingEntityService.getActiveDetections.mockResolvedValue([]);
    mockStatementImportRepository.createJob.mockResolvedValue(buildJob());
    mockStatementImportRepository.findJobById.mockResolvedValue(buildJob());
    mockStatementImportRepository.findFilesByImport.mockResolvedValue([
      buildFile(),
    ]);
    mockTransactionRecordRepository.findExistingFingerprints.mockResolvedValue(
      new Set(),
    );
    mockTransactionRecordRepository.createMany.mockResolvedValue([]);
  });

  describe('createJob', () => {
    it('lanza BadRequestException si no recibe archivos', async () => {
      await expect(
        service.createJob(10, [], { skip_duplicates: 'true' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockStatementImportRepository.createJob).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException si ningún archivo es PDF', async () => {
      const txt = {
        originalname: 'nota.txt',
        mimetype: 'text/plain',
        size: 10,
        buffer: Buffer.from('hola'),
      };
      await expect(
        service.createJob(10, [txt], { skip_duplicates: 'true' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si no hay categoría por defecto disponible', async () => {
      mockCategoryService.findAll.mockResolvedValue([]);

      await expect(
        service.createJob(10, [pdfFile], { skip_duplicates: 'true' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockStatementImportRepository.createJob).not.toHaveBeenCalled();
    });

    it('escribe los PDFs en un directorio temporal y crea el lote', async () => {
      mockCategoryService.findAll.mockResolvedValue([
        { id: 2, name: 'General' },
      ]);
      const job = buildJob();
      mockStatementImportRepository.createJob.mockResolvedValue(job);

      const result = await service.createJob(10, [pdfFile], {
        skip_duplicates: 'true',
      });

      expect(result).toBe(job);
      const [, stored] = mockStatementImportRepository.createJob.mock
        .calls[0] as [
        number,
        Array<{ filename: string; storagePath: string }>,
        Record<string, unknown>,
      ];
      expect(stored).toHaveLength(1);
      expect(stored[0]).toMatchObject({
        filename: 'extracto.pdf',
        mimetype: 'application/pdf',
        size: 1234,
      });
      expect(stored[0].storagePath).toContain('cm-import-');
      expect(stored[0].storagePath).toMatch(/\.pdf$/);
      expect(mockStatementImportRepository.createJob).toHaveBeenCalledWith(
        10,
        stored,
        expect.objectContaining({ skip_duplicates: 'true' }),
      );
      // La limpieza del directorio temporal no ocurre si el lote se creó bien.
      expect(rm).not.toHaveBeenCalled();
    });

    it('usa la categoría explícita sin consultar el catálogo', async () => {
      mockStatementImportRepository.createJob.mockResolvedValue(buildJob());
      mockCategoryService.findAll.mockResolvedValue([]);

      const dto = {
        skip_duplicates: 'true',
        default_category_id: 7,
      };
      await service.createJob(10, [pdfFile], dto);

      expect(mockCategoryService.findAll).not.toHaveBeenCalled();
      expect(mockStatementImportRepository.createJob).toHaveBeenCalledWith(
        10,
        expect.any(Array),
        expect.objectContaining({ default_category_id: 7 }),
      );
    });
  });

  describe('findAll', () => {
    it('delega la búsqueda paginada al repositorio', async () => {
      const payload = { data: [buildJob()], total: 1 };
      mockStatementImportRepository.findJobsByUser.mockResolvedValue(payload);

      const result = await service.findAll(10, 20, 40);

      expect(mockStatementImportRepository.findJobsByUser).toHaveBeenCalledWith(
        10,
        20,
        40,
      );
      expect(result).toEqual(payload);
    });
  });

  describe('findOne', () => {
    it('retorna el lote con sus archivos', async () => {
      const job = buildJob();
      const files = [buildFile()];
      mockStatementImportRepository.findJobById.mockResolvedValue(job);
      mockStatementImportRepository.findFilesByImport.mockResolvedValue(files);

      const result = await service.findOne(1, 10);

      expect(result).toEqual({ ...job, files });
    });
  });

  describe('procesamiento asíncrono', () => {
    it('procesa un lote exitoso y crea las transacciones', async () => {
      mockParsePdfStatement.mockResolvedValue({
        transactions: [buildParsedTx()],
        bank: 'bancolombia',
        period: 'jun - jul',
      });
      mockStatementImportRepository.createJob.mockResolvedValue(buildJob());
      mockStatementImportRepository.findJobById.mockResolvedValue(buildJob());
      mockStatementImportRepository.findFilesByImport.mockResolvedValue([
        buildFile(),
      ]);
      mockCategoryService.findAll.mockResolvedValue([
        { id: 2, name: 'General' },
      ]);
      mockTransactionRecordRepository.findExistingFingerprints.mockResolvedValue(
        new Set(),
      );
      mockTransactionRecordRepository.createMany.mockResolvedValue([]);

      await service.createJob(10, [pdfFile], {
        skip_duplicates: 'true',
      });
      await flushChain();
      await flushChain();

      expect(mockStatementImportRepository.markProcessing).toHaveBeenCalledWith(
        1,
      );
      expect(mockParsePdfStatement).toHaveBeenCalledWith(
        pdfBuffer,
        undefined,
        undefined,
        [],
      );
      expect(
        mockTransactionRecordRepository.findExistingFingerprints,
      ).toHaveBeenCalledWith(10, ['2026-07-15'], expect.any(Date));
      expect(mockTransactionRecordRepository.createMany).toHaveBeenCalledWith(
        10,
        [
          expect.objectContaining({
            category_id: 2,
            type: TransactionTypeEnum.INCOME,
            amount: 1547390,
            description: 'ABONO SUCURSAL VIRTUAL',
            transaction_date: '2026-07-15',
          }),
        ],
      );
      expect(
        mockStatementImportRepository.markFileSuccess,
      ).toHaveBeenCalledWith(1, {
        records_parsed: 1,
        records_created: 1,
        records_skipped: 0,
      });
      expect(mockStatementImportRepository.finishJob).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          success_files: 1,
          failed_files: 0,
          total_records_parsed: 1,
          total_records_created: 1,
          error: null,
        }),
      );
      expect(mockNotificationService.create).toHaveBeenCalled();
      expect(
        mockNotificationService.sendStatementImportProgress,
      ).toHaveBeenCalled();
      expect(
        mockStatementImportRepository.clearStoragePath,
      ).toHaveBeenCalledWith(1);
    });

    it('pasa las entidades bancarias configuradas al parser', async () => {
      const entities = [
        {
          code: 'daviplata',
          detect_patterns: ['Movimientos de Daviplata'],
        },
      ];
      mockParsePdfStatement.mockResolvedValue({
        transactions: [buildParsedTx()],
        bank: 'daviplata',
      });
      mockBankingEntityService.getActiveDetections.mockResolvedValue(entities);
      mockStatementImportRepository.createJob.mockResolvedValue(buildJob());
      mockStatementImportRepository.findJobById.mockResolvedValue(buildJob());
      mockStatementImportRepository.findFilesByImport.mockResolvedValue([
        buildFile(),
      ]);
      mockTransactionRecordRepository.findExistingFingerprints.mockResolvedValue(
        new Set(),
      );

      await service.createJob(10, [pdfFile], { skip_duplicates: 'true' });
      await flushChain();
      await flushChain();

      expect(mockBankingEntityService.getActiveDetections).toHaveBeenCalled();
      expect(mockParsePdfStatement).toHaveBeenCalledWith(
        pdfBuffer,
        undefined,
        undefined,
        entities,
      );
    });

    it('omite movimientos que ya existen (skip_duplicates=true)', async () => {
      const tx = buildParsedTx();
      mockParsePdfStatement.mockResolvedValue({ transactions: [tx] });
      mockStatementImportRepository.createJob.mockResolvedValue(buildJob());
      mockStatementImportRepository.findJobById.mockResolvedValue(buildJob());
      mockStatementImportRepository.findFilesByImport.mockResolvedValue([
        buildFile(),
      ]);
      mockCategoryService.findAll.mockResolvedValue([
        { id: 2, name: 'General' },
      ]);
      mockTransactionRecordRepository.findExistingFingerprints.mockResolvedValue(
        new Set([
          TransactionRecordRepository.fingerprint(
            tx.transaction_date,
            tx.amount,
            tx.description,
          ),
        ]),
      );

      await service.createJob(10, [pdfFile], {
        skip_duplicates: 'true',
      });
      await flushChain();
      await flushChain();

      expect(mockTransactionRecordRepository.createMany).not.toHaveBeenCalled();
      expect(
        mockStatementImportRepository.markFileSuccess,
      ).toHaveBeenCalledWith(1, {
        records_parsed: 1,
        records_created: 0,
        records_skipped: 1,
      });
    });

    it('omite duplicados dentro del mismo lote', async () => {
      const tx = buildParsedTx();
      mockParsePdfStatement.mockResolvedValue({
        transactions: [tx, { ...tx }],
      });
      mockStatementImportRepository.createJob.mockResolvedValue(buildJob());
      mockStatementImportRepository.findJobById.mockResolvedValue(buildJob());
      mockStatementImportRepository.findFilesByImport.mockResolvedValue([
        buildFile(),
      ]);
      mockCategoryService.findAll.mockResolvedValue([
        { id: 2, name: 'General' },
      ]);
      mockTransactionRecordRepository.findExistingFingerprints.mockResolvedValue(
        new Set(),
      );

      await service.createJob(10, [pdfFile], {
        skip_duplicates: 'true',
      });
      await flushChain();
      await flushChain();

      expect(mockTransactionRecordRepository.createMany).toHaveBeenCalledWith(
        10,
        [expect.objectContaining({ amount: 1547390 })],
      );
      expect(
        mockStatementImportRepository.markFileSuccess,
      ).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ records_skipped: 1, records_created: 1 }),
      );
    });

    it('no consulta duplicados si skip_duplicates=false', async () => {
      mockParsePdfStatement.mockResolvedValue({
        transactions: [buildParsedTx()],
      });
      mockStatementImportRepository.createJob.mockResolvedValue(
        buildJob({ options: { skip_duplicates: false } }),
      );
      mockStatementImportRepository.findJobById.mockResolvedValue(
        buildJob({ options: { skip_duplicates: false } }),
      );
      mockStatementImportRepository.findFilesByImport.mockResolvedValue([
        buildFile(),
      ]);
      mockCategoryService.findAll.mockResolvedValue([
        { id: 2, name: 'General' },
      ]);

      await service.createJob(10, [pdfFile], {
        skip_duplicates: 'false',
      });
      await flushChain();
      await flushChain();

      expect(
        mockTransactionRecordRepository.findExistingFingerprints,
      ).not.toHaveBeenCalled();
      expect(mockTransactionRecordRepository.createMany).toHaveBeenCalledWith(
        10,
        [expect.objectContaining({ amount: 1547390 })],
      );
    });

    it('incluye la cuenta bancaria, referencia y categoría del lote', async () => {
      mockParsePdfStatement.mockResolvedValue({
        transactions: [buildParsedTx({ reference: 'C78699' })],
      });
      mockStatementImportRepository.createJob.mockResolvedValue(
        buildJob({
          options: {
            skip_duplicates: true,
            account_id: 5,
            default_category_id: 2,
          },
        }),
      );
      mockStatementImportRepository.findJobById.mockResolvedValue(
        buildJob({
          options: {
            skip_duplicates: true,
            account_id: 5,
            default_category_id: 2,
          },
        }),
      );
      mockStatementImportRepository.findFilesByImport.mockResolvedValue([
        buildFile(),
      ]);
      mockTransactionRecordRepository.findExistingFingerprints.mockResolvedValue(
        new Set(),
      );

      await service.createJob(10, [pdfFile], {
        skip_duplicates: 'true',
        account_id: 5,
        default_category_id: 2,
      });
      await flushChain();
      await flushChain();

      expect(mockCategoryService.findAll).not.toHaveBeenCalled();
      expect(mockTransactionRecordRepository.createMany).toHaveBeenCalledWith(
        10,
        [
          expect.objectContaining({
            category_id: 2,
            account_id: 5,
            reference_code: 'C78699',
          }),
        ],
      );
    });

    it('marca el archivo como fallido si la contraseña es incorrecta', async () => {
      mockParsePdfStatement.mockRejectedValue(
        Object.assign(new Error('Incorrect password'), {
          name: 'PasswordException',
        }),
      );
      mockStatementImportRepository.createJob.mockResolvedValue(buildJob());
      mockStatementImportRepository.findJobById.mockResolvedValue(buildJob());
      mockStatementImportRepository.findFilesByImport.mockResolvedValue([
        buildFile(),
      ]);

      await service.createJob(10, [pdfFile], {
        skip_duplicates: 'true',
      });
      await flushChain();
      await flushChain();

      expect(mockStatementImportRepository.markFileFailed).toHaveBeenCalledWith(
        1,
        'PDF_WRONG_PASSWORD',
        expect.any(String),
      );
      expect(mockStatementImportRepository.finishJob).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          success_files: 0,
          failed_files: 1,
        }),
      );
      const [, totals] = mockStatementImportRepository.finishJob.mock
        .calls[0] as [number, { error?: { code: string } }];
      expect(totals.error?.code).toBe('PARTIAL_FAILURES');
      expect(mockNotificationService.create).toHaveBeenCalled();
    });

    it('marca el archivo como fallido si no detecta movimientos', async () => {
      mockParsePdfStatement.mockResolvedValue({ transactions: [] });
      mockStatementImportRepository.createJob.mockResolvedValue(buildJob());
      mockStatementImportRepository.findJobById.mockResolvedValue(buildJob());
      mockStatementImportRepository.findFilesByImport.mockResolvedValue([
        buildFile(),
      ]);

      await service.createJob(10, [pdfFile], {
        skip_duplicates: 'true',
      });
      await flushChain();
      await flushChain();

      expect(mockStatementImportRepository.markFileFailed).toHaveBeenCalledWith(
        1,
        'NO_TRANSACTIONS',
        expect.any(String),
      );
      expect(mockStatementImportRepository.finishJob).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ failed_files: 1 }),
      );
    });

    it('marca el archivo como fallido si el binario no es un PDF', async () => {
      (readFile as jest.Mock).mockResolvedValue(Buffer.from('no es un pdf'));
      mockStatementImportRepository.createJob.mockResolvedValue(buildJob());
      mockStatementImportRepository.findJobById.mockResolvedValue(buildJob());
      mockStatementImportRepository.findFilesByImport.mockResolvedValue([
        buildFile(),
      ]);

      await service.createJob(10, [pdfFile], {
        skip_duplicates: 'true',
      });
      await flushChain();
      await flushChain();

      expect(mockParsePdfStatement).not.toHaveBeenCalled();
      expect(mockStatementImportRepository.markFileFailed).toHaveBeenCalledWith(
        1,
        'UNSUPPORTED_FILE',
        expect.any(String),
      );
    });

    it('procesa varios archivos y reporta resultados parciales', async () => {
      mockParsePdfStatement.mockResolvedValue({
        transactions: [buildParsedTx()],
      });
      mockStatementImportRepository.createJob.mockResolvedValue(
        buildJob({ total_files: 2 }),
      );
      mockStatementImportRepository.findJobById.mockResolvedValue(buildJob());
      mockStatementImportRepository.findFilesByImport.mockResolvedValue([
        buildFile({ id: 1, filename: 'ok.pdf', storage_path: '/tmp/ok.pdf' }),
        buildFile({ id: 2, filename: 'bad.pdf', storage_path: '/tmp/bad.pdf' }),
      ]);
      mockCategoryService.findAll.mockResolvedValue([
        { id: 2, name: 'General' },
      ]);
      mockTransactionRecordRepository.findExistingFingerprints.mockResolvedValue(
        new Set(),
      );
      (readFile as jest.Mock).mockImplementation((path: string) =>
        path.endsWith('bad.pdf')
          ? Promise.resolve(Buffer.from('no es un pdf'))
          : Promise.resolve(pdfBuffer),
      );

      await service.createJob(10, [pdfFile], {
        skip_duplicates: 'true',
      });
      await flushChain();
      await flushChain();

      expect(
        mockStatementImportRepository.markFileSuccess,
      ).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ records_created: 1 }),
      );
      expect(mockStatementImportRepository.markFileFailed).toHaveBeenCalledWith(
        2,
        'UNSUPPORTED_FILE',
        expect.any(String),
      );
      expect(mockStatementImportRepository.finishJob).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          processed_files: 2,
          success_files: 1,
          failed_files: 1,
        }),
      );
      const [, totals] = mockStatementImportRepository.finishJob.mock
        .calls[0] as [number, { error?: { code: string } }];
      expect(totals.error?.code).toBe('PARTIAL_FAILURES');
    });

    it('no procesa si el lote ya no está pendiente', async () => {
      mockStatementImportRepository.createJob.mockResolvedValue(
        buildJob({ status: StatementImportStatusEnum.PROCESSING }),
      );
      mockStatementImportRepository.findJobById.mockResolvedValue(
        buildJob({ status: StatementImportStatusEnum.PROCESSING }),
      );

      await service.createJob(10, [pdfFile], {
        skip_duplicates: 'true',
      });
      await flushChain();
      await flushChain();

      expect(
        mockStatementImportRepository.markProcessing,
      ).not.toHaveBeenCalled();
      expect(
        mockStatementImportRepository.findFilesByImport,
      ).not.toHaveBeenCalled();
    });
  });
});
