import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

declare global {
  interface Window {
    OneSignal?: any;
    OneSignalDeferred?: any[];
  }
}

const NotificationPermissionPrompt: React.FC = () => {
  const { session, profile } = useAuth();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const ONE_SIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID;

  useEffect(() => {
    const seen = localStorage.getItem('vsaps-notification-prompt-seen');
    if (seen || !session || !profile || !ONE_SIGNAL_APP_ID) return;
    setVisible(true);
  }, [session, profile, ONE_SIGNAL_APP_ID]);

  const handleEnable = async () => {
    try {
      setLoading(true);
      if (!ONE_SIGNAL_APP_ID) throw new Error('Thiếu VITE_ONESIGNAL_APP_ID.');
      if (!('Notification' in window)) throw new Error('Trình duyệt không hỗ trợ thông báo.');

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      localStorage.setItem('vsaps-notification-prompt-seen', '1');
      setVisible(false);

      if (!window.OneSignalDeferred) window.OneSignalDeferred = [];
      window.OneSignalDeferred.push(async (OneSignal) => {
        await OneSignal.login(profile?.id || session?.user?.id);
        await OneSignal.Notifications.requestPermission();
      });
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
