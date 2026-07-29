export const NOTIFICATION_EVENTS = {
  // Server → Client
  NEW_NOTIFICATION: 'notification:new',
  MARK_READ: 'notification:marked_read',
  MARK_ALL_READ: 'notification:all_marked_read',

  // Client → Server
  SUBSCRIBE: 'notification:subscribe',
  UNSUBSCRIBE: 'notification:unsubscribe',
  MARK_AS_READ: 'notification:mark_read',
  MARK_ALL_AS_READ: 'notification:mark_all_read',
} as const;

export const NOTIFICATION_ROOMS = {
  user: (userId: number) => `user:${userId}`,
} as const;
