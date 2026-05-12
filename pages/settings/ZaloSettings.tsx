import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabaseClient';
import { SystemSettings } from '../../types';

const ZaloSettings: React.FC = () => {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('settings:edit');

  const [settings, setSettings] = useState<Partial<SystemSettings>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
        setLoading(true);
        const { data, error: fetchError } = await supabase
            .from('settings')
            .select('oa_id, oa_secret_key, access_token')
            .eq('id', 1)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
             setError('Lỗi khi tải cài đặt: ' + fetchError.message);
        } else if (data) {
            setSettings({
                oa_id: data.oa_id || '',
                oa_secret_key: data.oa_secret_key || '',
                access_token: data.access_token || '',
            });
        }
        setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
        setError("Bạn không có quyền thực hiện hành động này.");
        return;
    }
    setSaving(true);
    setSuccess(false);
    setError('');

    const dataToSave = {
        oa_id: settings.oa_id,
        access_token: settings.access_token,
        ...(settings.oa_secret_key && { oa_secret_key: settings.oa_secret_key })
    };

    const { error: upsertError } = await supabase
        .from('settings')
        .upsert({ id: 1, ...dataToSave });

    if (upsertError) {
        setError('Lỗi khi lưu cài đặt: ' + upsertError.message);
    } else {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
    }
    setSaving(false);
  };

  const handleTestConnection = async () => {
    if (!canEdit) {
      setCheckResult({ type: 'error', message: 'Bạn không có quyền thực hiện hành động này.' });
      return;
    }
    setChecking(true);
    setCheckResult(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('test-zalo-connection', {
        body: {
          oa_id: settings.oa_id,
          access_token: settings.access_token,
        },
      });
      if (invokeError) throw invokeError;
      setCheckResult({ type: 'success', message: (data as any)?.message || 'Kết nối Zalo thành công.' });
    } catch (err: any) {
      const errorMessage = err.context?.data?.error || err.message || 'Không thể kết nối tới Zalo.';
      setCheckResult({ type: 'error', message: `Lỗi: ${errorMessage}` });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800">Cài đặt Zalo</h2>
      <p className="mt-1 text-sm text-gray-500">Cấu hình Zalo Official Account (OA) để tích hợp các tính năng Zalo.</p>

      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-md">
        <h3 className="font-semibold">Thông tin cài đặt</h3>
        <p className="text-sm mt-1">
          Điền <strong>OA ID</strong>, <strong>OA Secret Key</strong> và <strong>Access Token</strong> để hệ thống có thể gọi API Zalo.
          Bạn có thể lưu token thủ công hoặc kiểm tra kết nối ngay bên dưới.
        </p>
      </div>
      
      {!canEdit && <p className="mt-4 p-3 bg-yellow-100 text-yellow-800 rounded-md text-sm">Bạn không có quyền chỉnh sửa cài đặt này.</p>}
      {error && <p className="mt-4 p-3 bg-red-100 text-red-800 rounded-md text-sm">{error}</p>}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6 max-w-lg">
        <div>
          <label htmlFor="oa_id" className="block text-sm font-medium text-gray-700">Official Account ID</label>
          <input
            type="text"
            name="oa_id"
            id="oa_id"
            value={settings.oa_id || ''}
            onChange={handleChange}
            disabled={!canEdit}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-secondary focus:border-secondary sm:text-sm disabled:bg-gray-100"
          />
        </div>

        <div>
          <label htmlFor="oa_secret_key" className="block text-sm font-medium text-gray-700">OA Secret Key</label>
          <input
            type="password"
            name="oa_secret_key"
            id="oa_secret_key"
            value={settings.oa_secret_key || ''}
            onChange={handleChange}
            placeholder="Để trống nếu không muốn thay đổi"
            disabled={!canEdit}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-secondary focus:border-secondary sm:text-sm disabled:bg-gray-100"
          />
        </div>

        <div>
          <label htmlFor="access_token" className="block text-sm font-medium text-gray-700">Access Token</label>
          <textarea
            name="access_token"
            id="access_token"
            rows={4}
            value={settings.access_token || ''}
            onChange={handleChange}
            placeholder="Dán access token từ Zalo vào đây"
            disabled={!canEdit}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-secondary focus:border-secondary sm:text-sm disabled:bg-gray-100"
          />
        </div>
        
        <div className="flex flex-wrap items-center justify-end gap-3">
           {success && <p className="text-sm text-green-600">Đã lưu cài đặt thành công!</p>}
           <button
            type="button"
            onClick={handleTestConnection}
            disabled={checking || !canEdit}
            className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary disabled:opacity-50"
          >
            {checking ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
          </button>
           <button
            type="submit"
            disabled={saving || !canEdit}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#eb248e] hover:bg-[#d61f81] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#eb248e] disabled:opacity-50"
          >
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>

      <div className="mt-6 max-w-lg">
        {checkResult && (
          <p className={`text-sm p-3 rounded-md ${checkResult.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {checkResult.message}
          </p>
        )}
      </div>

    </div>
  );
};

export default ZaloSettings;
