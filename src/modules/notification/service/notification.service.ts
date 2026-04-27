import { Injectable } from '@nestjs/common';
import { NotificationGateway } from '../gateway/notification.gateway';
import { NotificationPayload } from '../interfaces/notification.interfaces';

@Injectable()
export class NotificationService {
  constructor(private readonly gateway: NotificationGateway) {}

  /**
   * Envía una notificación en tiempo real al usuario especificado.
   * Llamar desde cualquier módulo que necesite emitir notificaciones
   * (únicamente a través de BullMQ — no llamar repositorios externos).
   */
  sendToUser(userId: number, payload: NotificationPayload): void {
    this.gateway.sendNotificationToUser(userId, payload);
  }

  /**
   * Confirma al cliente que una notificación fue marcada como leída.
   */
  confirmMarkRead(userId: number, notificationId: number): void {
    this.gateway.confirmMarkRead(userId, notificationId);
  }

  /**
   * Confirma al cliente que todas las notificaciones fueron marcadas como leídas.
   */
  confirmMarkAllRead(userId: number): void {
    this.gateway.confirmMarkAllRead(userId);
  }
}
