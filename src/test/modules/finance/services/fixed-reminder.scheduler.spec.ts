import {
  FixedReminderScheduler,
  nextMonthlyOccurrence,
  nextBiweeklyOccurrence,
  startOfDay,
} from '@finance/service/fixed-reminder.scheduler';
import { TransactionRecordRepository } from '@finance/repositories/transaction-record.repository';
import { NotificationService } from '@notification/service/notification.service';

const mockTransactionRepo = {
  findFixedForReminders: jest.fn(),
};

const mockNotificationService = {
  createIfMissing: jest.fn(),
};

const mockI18nService = {
  t: jest.fn((key: string) => `[${key}]`),
};

const buildTx = (overrides = {}) =>
  ({
    id: 1,
    user_id: 10,
    type: 'expense',
    amount: '50000',
    is_fixed: true,
    frequency: 'monthly',
    due_day: 15,
    reminder_days: 3,
    description: 'Suscripción Movistar',
    created_at: new Date('2026-07-01T10:00:00.000Z'),
    ...overrides,
  }) as any;

describe('FixedReminderScheduler', () => {
  let scheduler: FixedReminderScheduler;

  beforeEach(() => {
    scheduler = new FixedReminderScheduler(
      mockTransactionRepo as unknown as TransactionRecordRepository,
      mockNotificationService as unknown as NotificationService,
      mockI18nService as any,
    );
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────
  // nextMonthlyOccurrence
  // ─────────────────────────────────────────────────────────────
  describe('nextMonthlyOccurrence', () => {
    it('debe devolver el due_day del mes actual si aún no pasó', () => {
      const today = new Date(2026, 7, 2, 10);
      const result = nextMonthlyOccurrence(15, today);
      expect(result).toEqual(new Date(2026, 7, 15));
    });

    it('debe pasar al mes siguiente si el due_day ya pasó', () => {
      const today = new Date(2026, 7, 20, 10);
      const result = nextMonthlyOccurrence(15, today);
      expect(result).toEqual(new Date(2026, 8, 15));
    });

    it('debe hacer clamp al último día del mes', () => {
      const today = new Date(2026, 1, 2, 10);
      const result = nextMonthlyOccurrence(31, today);
      expect(result).toEqual(new Date(2026, 1, 28));
    });
  });

  // ─────────────────────────────────────────────────────────────
  // nextBiweeklyOccurrence
  // ─────────────────────────────────────────────────────────────
  describe('nextBiweeklyOccurrence', () => {
    it('debe devolver hoy si hoy es una ocurrencia (ancla)', () => {
      const today = new Date(2026, 7, 15, 10);
      const result = nextBiweeklyOccurrence(15, new Date(2026, 7, 1), today);
      expect(result).toEqual(startOfDay(today));
    });

    it('debe calcular la próxima ocurrencia cada 14 días', () => {
      const today = new Date(2026, 7, 20, 10);
      const result = nextBiweeklyOccurrence(15, new Date(2026, 7, 1), today);
      expect(result).toEqual(new Date(2026, 7, 29));
    });
  });

  // ─────────────────────────────────────────────────────────────
  // handleDailyReminders
  // ─────────────────────────────────────────────────────────────
  describe('handleDailyReminders', () => {
    it('debe crear notificación cuando la deducción está dentro de la ventana', async () => {
      const tx = buildTx();
      mockTransactionRepo.findFixedForReminders.mockResolvedValue([tx]);
      mockNotificationService.createIfMissing.mockResolvedValue({ id: 1 });

      jest.useFakeTimers().setSystemTime(new Date('2026-08-13T08:00:00'));

      await scheduler.handleDailyReminders();
      jest.useRealTimers();

      const reference = `fixed:reminder:1:2026-08-15`;
      expect(mockNotificationService.createIfMissing).toHaveBeenCalledWith(
        10,
        expect.objectContaining({ title: expect.any(String) }),
        reference,
      );
    });

    it('no debe notificar si la ocurrencia está fuera de la ventana', async () => {
      const tx = buildTx();
      mockTransactionRepo.findFixedForReminders.mockResolvedValue([tx]);

      jest.useFakeTimers().setSystemTime(new Date('2026-08-01T08:00:00'));

      await scheduler.handleDailyReminders();
      jest.useRealTimers();

      expect(mockNotificationService.createIfMissing).not.toHaveBeenCalled();
    });

    it('debe ignorar transacciones sin due_day', async () => {
      const tx = buildTx({ due_day: null });
      mockTransactionRepo.findFixedForReminders.mockResolvedValue([tx]);

      await scheduler.handleDailyReminders();

      expect(mockNotificationService.createIfMissing).not.toHaveBeenCalled();
    });
  });
});
