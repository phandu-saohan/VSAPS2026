import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

const bufferToBase64 = (buffer: ArrayBuffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

const NotificationPermissionPrompt: React.FC = () => {
  const { session, profile } = useAuth();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('vsaps-notification-prompt-seen');
    const denied = Notification.permission === 'denied';
    if (seen || denied || !session || !profile) return;
    setVisible(true);
  }, [session, profile]);

  const ensureServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) throw new Error('Trình duyệt không hỗ trợ service worker.');
    return await navigator.serviceWorker.ready;
  };

  const saveSubscription = async (subscription: PushSubscription) => {
    if (!session?.user) return;
    const p256dh = subscription.getKey('p256dh');
    const auth = subscription.getKey('auth');
    if (!p256dh || !auth) throw new Error('Subscription thiếu khóa mã hóa.');

    const payload = {
      user_id: session.user.id,
      endpoint: subscription.endpoint,
      p256dh_key: bufferToBase64(p256dh),
      auth_key: bufferToBase64(auth),
      subscription_json: subscription.toJSON(),
      user_agent: navigator.userAgent,
    };

    const { error } = await supabase.from('push_subscriptions').upsert(payload, {
      onConflict: 'endpoint',
    });

    if (error) throw error;
  };

  const handleEnable = async () => {
    try {
      setLoading(true);
      if (!VAPID_PUBLIC_KEY) throw new Error('Thiếu VITE_VAPID_PUBLIC_KEY.');
      if (!('Notification' in window)) throw new Error('Trình duyệt không hỗ trợ thông báo.');

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      const registration = await ensureServiceWorker();
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      await saveSubscription(subscription);
      localStorage.setItem('vsaps-notification-prompt-seen', '1');
      setVisible(false);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-4 bottom-20 md:bottom-6 z-50 mx-auto max-w-md">
      <div className="rounded-2xl border border-white/10 bg-white shadow-2xl p-4">
        <p className="text-lg font-bold text-gray-900">Bật thông báo</p>
        <p className="mt-1 text-sm text-gray-600">
          Cho phép nhận thông báo để cập nhật nhanh các thay đổi trong ứng dụng, ngay cả khi bạn đã cài PWA.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleEnable}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-[#eb248e] text-white text-sm font-bold hover:bg-[#d61f81] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Đang bật...' : 'Cho phép'}
          </button>
          <button
            onClick={() => {
              localStorage.setItem('vsaps-notification-prompt-seen', '1');
              setVisible(false);
            }}
            className="px-4 py-2 rounded-xl bg-secondary-light text-secondary text-sm font-semibold hover:bg-secondary/15 active:scale-[0.98] transition-all"
          >
            Để sau
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPermissionPrompt;
