import { supabase } from '../supabaseClient';

export type OneSignalNotificationPayload = {
  userIds: string[];
  title: string;
  message: string;
  url?: string;
};

export const sendOneSignalNotification = async ({ userIds, title, message, url }: OneSignalNotificationPayload) => {
  if (!userIds.length) return;

  const { error } = await supabase.functions.invoke('send-onesignal-notification', {
    body: {
      userIds,
      title,
      message,
      url,
    },
  });

  if (error) {
    throw error;
  }
};
