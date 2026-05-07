import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../App';

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

const PushNotifications: React.FC = () => {
  const { session, profile } = useAuth();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  const [sending, setSending] = useState(false);

  const canManage = useMemo(() => profile?.role === 'Quản trị viên' || true, [profile]);

  const loadSubscriptions = async () => {
    if (!session?.user) return;
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    if (!error) setSubscriptions(data || []);
  };

  useEffect(() => {
    loadSubscriptions();
  }, [session?.user?.id]);

  const enablePush = async () => {
    try {
      setStatus('Đang xin quyền...');
      if (!VAPID_PUBLIC_KEY) throw new Error('Thiếu VITE_VAPID_PUBLIC_KEY');
      if (!('Notification' in window)) throw new Error('Trình duyệt không hỗ trợ thông báo');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Người dùng chưa cho phép');
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const p256dh = subscription.getKey('p256dh');
      const auth = subscription.getKey('auth');
      if (!p256dh || !auth) throw new Error('Subscription thiếu khóa');
      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: session?.user.id,
        endpoint: subscription.endpoint,
        p256dh_key: bufferToBase64(p256dh),
        auth_key: bufferToBase64(auth),
        subscription_json: subscription.toJSON(),
        user_agent: navigator.userAgent,
      }, { onConflict: 'endpoint' });
      if (error) throw error;
      setStatus('Đã bật thông báo thành công');
      await loadSubscriptions();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Bật thông báo thất bại');
    }
  };

  const sendTestPush = async (subscriptionUserId?: string) => {
    try {
      setSending(true);
      const targetUserId = subscriptionUserId || session?.user.id;
      if (!targetUserId) throw new Error('Thiếu userId');
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: targetUserId,
          title: 'Test push từ VSAPS',
          body: 'Đây là push test được gửi từ action trong app.',
          url: '/#/settings/push',
        },
      });
      if (error) throw error;
      setStatus(`Đã gửi push test: ${JSON.stringify(data)}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Gửi push test thất bại');
    } finally {
      setSending(false);
    }
  };

  const removeSubscription = async (endpoint: string) => {
    if (!confirm('Xóa subscription này?')) return;
    const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
    if (!error) await loadSubscriptions();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý thông báo đẩy</h1>
          <p className="text-sm text-gray-600 mt-1">Đăng ký thiết bị, xem subscription và gửi push test end-to-end.</p>
        </div>
        <button onClick={enablePush} className="px-4 py-2 rounded-lg bg-secondary text-white font-semibold">
          Bật thông báo
        </button>
      </div>

      {status && <div className="rounded-lg bg-gray-50 border p-3 text-sm text-gray-700">{status}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border p-4">
          <h3 className="font-semibold text-gray-900">Thiết bị đã đăng ký</h3>
          <div className="mt-3 space-y-3">
            {subscriptions.map((sub) => (
              <div key={sub.endpoint} className="rounded-lg border p-3">
                <div className="text-xs text-gray-500 break-all">{sub.endpoint}</div>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => sendTestPush(sub.user_id)} className="px-3 py-1.5 rounded-lg bg-primary text-white text-sm">
                    Gửi push test
                  </button>
                  <button onClick={() => removeSubscription(sub.endpoint)} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm">
                    Xóa
                  </button>
                </div>
              </div>
            ))}
            {subscriptions.length === 0 && <p className="text-sm text-gray-500">Chưa có subscription nào.</p>}
          </div>
        </div>

        <div className="rounded-xl border p-4">
          <h3 className="font-semibold text-gray-900">Gửi push từ action thật</h3>
          <p className="text-sm text-gray-600 mt-1">Nút bên dưới gọi trực tiếp Edge Function để test luồng end-to-end.</p>
          <button
            onClick={() => sendTestPush()}
            disabled={sending}
            className="mt-4 px-4 py-2 rounded-lg bg-secondary text-white font-semibold disabled:opacity-60"
          >
            {sending ? 'Đang gửi...' : 'Gửi push test cho tôi'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PushNotifications;
