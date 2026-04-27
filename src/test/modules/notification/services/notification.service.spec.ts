import { NotificationService } from '@notification/service/notification.service';
import { NotificationGateway } from '@notification/gateway/notification.gateway';
import { NotificationPayload } from '@notification/interfaces/notification.interfaces';

const mockNotificationGateway = {
  sendNotificationToUser: jest.fn(),
  confirmMarkRead: jest.fn(),
  confirmMarkAllRead: jest.fn(),
};

const buildPayload = (overrides = {}): NotificationPayload => ({
  id: 1,
  user_id: 10,
  title: 'Alerta de presupuesto',
  description: 'Has superado el 80% de tu presupuesto mensual.',
  is_read: false,
  is_active: true,
  scheduled_at: null,
  created_at: new Date(),
  ...overrides,
});

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    service = new NotificationService(
      mockNotificationGateway as unknown as NotificationGateway,
    );
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────
  // sendToUser
  // ─────────────────────────────────────────────────────────────
  describe('sendToUser', () => {
    it('debe delegar la notificación al gateway con userId y payload', () => {
      const payload = buildPayload();

      service.sendToUser(10, payload);

      expect(mockNotificationGateway.sendNotificationToUser).toHaveBeenCalledWith(10, payload);
    });

    it('debe delegar correctamente a diferentes usuarios', () => {
      const payload1 = buildPayload({ user_id: 10 });
      const payload2 = buildPayload({ id: 2, user_id: 20, title: 'Otro aviso' });

      service.sendToUser(10, payload1);
      service.sendToUser(20, payload2);

      expect(mockNotificationGateway.sendNotificationToUser).toHaveBeenCalledTimes(2);
      expect(mockNotificationGateway.sendNotificationToUser).toHaveBeenNthCalledWith(1, 10, payload1);
      expect(mockNotificationGateway.sendNotificationToUser).toHaveBeenNthCalledWith(2, 20, payload2);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // confirmMarkRead
  // ─────────────────────────────────────────────────────────────
  describe('confirmMarkRead', () => {
    it('debe confirmar al gateway que la notificación fue leída', () => {
      service.confirmMarkRead(10, 99);

      expect(mockNotificationGateway.confirmMarkRead).toHaveBeenCalledWith(10, 99);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // confirmMarkAllRead
  // ─────────────────────────────────────────────────────────────
  describe('confirmMarkAllRead', () => {
    it('debe confirmar al gateway que todas las notificaciones fueron leídas', () => {
      service.confirmMarkAllRead(10);

      expect(mockNotificationGateway.confirmMarkAllRead).toHaveBeenCalledWith(10);
    });
  });
});
