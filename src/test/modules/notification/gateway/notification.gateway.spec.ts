import { NotificationGateway } from '@notification/gateway/notification.gateway';
import { NotificationService } from '@notification/service/notification.service';
import { NotificationPayload } from '@notification/interfaces/notification.interfaces';
import {
  NOTIFICATION_EVENTS,
  NOTIFICATION_ROOMS,
} from '@notification/constants/notification.events';

// ─────────────────────────────────────────────────────────────
// Mocks del Server y Socket de socket.io
// ─────────────────────────────────────────────────────────────
const mockServerTo = { emit: jest.fn() };
const mockServer = { to: jest.fn().mockReturnValue(mockServerTo) };

const mockGateway = {
  sendNotificationToUser: jest.fn(),
  confirmMarkRead: jest.fn(),
  confirmMarkAllRead: jest.fn(),
};

const buildPayload = (overrides = {}): NotificationPayload => ({
  id: 1,
  user_id: 10,
  title: 'Test',
  description: 'Mensaje de prueba',
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
      mockGateway as unknown as NotificationGateway,
    );
    jest.clearAllMocks();
  });

  describe('sendToUser', () => {
    it('debe delegar al gateway.sendNotificationToUser', () => {
      const payload = buildPayload();

      service.sendToUser(10, payload);

      expect(mockGateway.sendNotificationToUser).toHaveBeenCalledWith(
        10,
        payload,
      );
    });
  });

  describe('confirmMarkRead', () => {
    it('debe delegar al gateway.confirmMarkRead', () => {
      service.confirmMarkRead(10, 42);

      expect(mockGateway.confirmMarkRead).toHaveBeenCalledWith(10, 42);
    });
  });

  describe('confirmMarkAllRead', () => {
    it('debe delegar al gateway.confirmMarkAllRead', () => {
      service.confirmMarkAllRead(10);

      expect(mockGateway.confirmMarkAllRead).toHaveBeenCalledWith(10);
    });
  });
});

describe('NotificationGateway — métodos de emisión', () => {
  let gateway: NotificationGateway;

  beforeEach(() => {
    gateway = new NotificationGateway(
      {} as any, // ConfigService — no se usa en los métodos de emisión
      {} as any, // AuthService  — no se usa en los métodos de emisión
    );

    // Inyectar el server mock en la propiedad privada
    (gateway as any).server = mockServer;
    jest.clearAllMocks();
    mockServer.to.mockReturnValue(mockServerTo);
  });

  describe('sendNotificationToUser', () => {
    it('debe emitir NEW_NOTIFICATION a la sala del usuario', () => {
      const payload = buildPayload();
      const expectedRoom = NOTIFICATION_ROOMS.user(10);

      gateway.sendNotificationToUser(10, payload);

      expect(mockServer.to).toHaveBeenCalledWith(expectedRoom);
      expect(mockServerTo.emit).toHaveBeenCalledWith(
        NOTIFICATION_EVENTS.NEW_NOTIFICATION,
        payload,
      );
    });
  });

  describe('confirmMarkRead', () => {
    it('debe emitir MARK_READ con el id de notificación', () => {
      const expectedRoom = NOTIFICATION_ROOMS.user(10);

      gateway.confirmMarkRead(10, 42);

      expect(mockServer.to).toHaveBeenCalledWith(expectedRoom);
      expect(mockServerTo.emit).toHaveBeenCalledWith(
        NOTIFICATION_EVENTS.MARK_READ,
        {
          notification_id: 42,
        },
      );
    });
  });

  describe('confirmMarkAllRead', () => {
    it('debe emitir MARK_ALL_READ a la sala del usuario', () => {
      const expectedRoom = NOTIFICATION_ROOMS.user(10);

      gateway.confirmMarkAllRead(10);

      expect(mockServer.to).toHaveBeenCalledWith(expectedRoom);
      expect(mockServerTo.emit).toHaveBeenCalledWith(
        NOTIFICATION_EVENTS.MARK_ALL_READ,
      );
    });
  });

  describe('handleConnection / handleDisconnect', () => {
    it('handleConnection no debe lanzar excepción', () => {
      const socket = {
        id: 'socket-1',
        data: { user: { sub: 'kc-uuid' } },
      } as any;
      expect(() => gateway.handleConnection(socket)).not.toThrow();
    });

    it('handleDisconnect no debe lanzar excepción', () => {
      const socket = { id: 'socket-1' } as any;
      expect(() => gateway.handleDisconnect(socket)).not.toThrow();
    });
  });

  describe('handleSubscribe', () => {
    it('debe unir al cliente a la sala del usuario', () => {
      const join = jest.fn();
      const client = { id: 'socket-1', join, data: {} } as any;

      gateway.handleSubscribe({ user_id: 10 }, client);

      expect(join).toHaveBeenCalledWith(NOTIFICATION_ROOMS.user(10));
      expect(client.data.user_id).toBe(10);
    });
  });

  describe('handleUnsubscribe', () => {
    it('debe sacar al cliente de la sala del usuario', () => {
      const leave = jest.fn();
      const client = { id: 'socket-1', leave, data: {} } as any;

      gateway.handleUnsubscribe({ user_id: 10 }, client);

      expect(leave).toHaveBeenCalledWith(NOTIFICATION_ROOMS.user(10));
    });
  });

  describe('handleMarkAsRead', () => {
    it('no debe lanzar excepción al recibir el evento', () => {
      const client = { id: 'socket-1', data: {} } as any;
      expect(() =>
        gateway.handleMarkAsRead({ notification_id: 5 }, client),
      ).not.toThrow();
    });
  });

  describe('handleMarkAllAsRead', () => {
    it('no debe lanzar excepción cuando el cliente tiene user_id', () => {
      const client = { id: 'socket-1', data: { user_id: 10 } } as any;
      expect(() => gateway.handleMarkAllAsRead(client)).not.toThrow();
    });

    it('no debe lanzar excepción cuando el cliente no tiene user_id', () => {
      const client = { id: 'socket-1', data: {} } as any;
      expect(() => gateway.handleMarkAllAsRead(client)).not.toThrow();
    });
  });
});
