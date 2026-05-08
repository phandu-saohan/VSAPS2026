import { Notification, NotificationChannel, NotificationKind } from '../types';
import { sendOneSignalNotification } from './oneSignal';

export type NotificationInput = {
  user_id: string;
  title?: string | null;
  message: string;
  kind?: NotificationKind;
  channel?: NotificationChannel;
  link?: string | null;
  meta?: Record<string, any> | null;
};

export const normalizeNotification = (input: NotificationInput): Omit<Notification, 'id' | 'created_at' | 'read'> => ({
  user_id: input.user_id,
  title: input.title || input.message,
  message: input.message,
  kind: input.kind || 'system',
  channel: input.channel || 'in_app',
  link: input.link || null,
  meta: input.meta || null,
});

export const buildNotificationPayload = (input: NotificationInput) => normalizeNotification(input);

export const buildToastMessage = (notification: Pick<Notification, 'title' | 'message' | 'kind'>) => {
  const headline = notification.title || notification.message;
  return headline === notification.message ? notification.message : `${headline}: ${notification.message}`;
};

export const pushViaOneSignal = async (input: NotificationInput) => {
  await sendOneSignalNotification({
    userIds: [input.user_id],
    title: input.title || input.message,
    message: input.message,
    url: input.link || undefined,
  });
};
