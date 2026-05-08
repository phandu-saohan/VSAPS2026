import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabaseClient';
import { SystemSettings } from '../../types';
import { SpinnerIcon } from '../../components/icons/SpinnerIcon';
import { useToast } from '../../contexts/ToastContext';

const EmailSettings: React.FC = () => {
  const { hasPermission } = useAuth();
  const { addToast } = useToast();
  const canEdit = hasPermission('settings:edit');

  const [settings, setSettings] = useState<Partial<SystemSettings>>({});
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [testEmail, setTestEmail] = useState('');
  
  useEffect(() => {
    const fetchSettings = async () => {
        setLoading(true);
        const { data, error: fetchError } = await supabase
            .from('settings')
            .select('sender_name, sender_email, smtp_host, smtp_port, smtp_user, smtp_password, smtp_secure')
            .eq('id', 1)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            setError('Lỗi khi tải cài đặt: ' + fetchError.message);
        } else if (data) {
            setSettings({
                sender_name: data.sender_name || '',
                sender_email: data.sender_email || '',
                smtp_host: data.smtp_host || '',
                smtp_port: data.smtp_port || '',
                smtp_user: data.smtp_user || '',
                smtp_password: data.smtp_password || '',
                smtp_secure: data.smtp_secure ?? false,
            });
        }
        setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const saveSettings = async () => {
    const { error: upsertError } = await supabase.from('settings').upsert({ id: 1, ...settings });
    if (upsertError) throw upsertError;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
        setError("Bạn không có quyền thực hiện hành động này.");
        return;
    }
    setLoading(true);
    setSuccess(false);
    setError('');
    
    try {
      await saveSettings();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError('Lỗi khi lưu cài đặt: ' + err.message);
    }
    setLoading(false);
  };

  const handleTestSend = async () => {
    if (!testEmail.trim()) {
      addToast('Vui lòng nhập email nhận test.', 'warning');
      return;
    }
    setTesting(true);
    setError('');
    try {
      await saveSettings();
      const { error: invokeError } = await supabase.functions.invoke('send-email', {
        body: {
          to: testEmail,
          subject: 'Kiểm tra SMTP - VSAPS 2026',
          html: '<p>Đây là email kiểm tra cấu hình SMTP của hệ thống.</p>',
        },
      });
      if (invokeError) throw invokeError;
      addToast('Đã gửi email test thành công.', 'success');
    } catch (err: any) {
      setError('Lỗi khi gửi email test: ' + (err.context?.data?.error || err.message));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800">Cài đặt Email (SMTP)</h2>
      <p className="mt-1 text-sm text-gray-500">Cấu hình thông tin người gửi và máy chủ SMTP để gửi email.</p>
      
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-md">
        <h3 className="font-semibold">Hướng dẫn quan trọng</h3>
        <p className="text-sm mt-1">
          Để tính năng gửi email hoạt động, bạn cần cấu hình các biến môi trường SMTP trong Supabase Edge Functions hoặc nơi triển khai function.
        </p>
        <ol className="list-decimal list-inside text-sm mt-2 space-y-1">
            <li>Thêm secret cho <strong>SMTP_HOST</strong>, <strong>SMTP_PORT</strong>, <strong>SMTP_USER</strong> và <strong>SMTP_PASSWORD</strong>.</li>
            <li>Tùy chọn thêm <strong>SMTP_SECURE</strong> với giá trị <code>true</code> nếu máy chủ SMTP yêu cầu kết nối TLS/SSL.</li>
            <li>Thông tin người gửi dưới đây sẽ được dùng làm địa chỉ <code>From</code> của email.</li>
        </ol>
      </div>

      {!canEdit && <p className="mt-4 p-3 bg-yellow-100 text-yellow-800 rounded-md text-sm">Bạn không có quyền chỉnh sửa cài đặt này.</p>}
      {error && <p className="mt-4 p-3 bg-red-100 text-red-800 rounded-md text-sm">{error}</p>}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
             <label htmlFor="sender_name" className="block text-sm font-medium text-gray-700">Tên người gửi</label>
             <input
              type="text"
              name="sender_name"
              id="sender_name"
              placeholder="Ví dụ: Ban tổ chức VSAPS 2026"
              value={settings.sender_name || ''}
              onChange={handleChange}
              disabled={!canEdit}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-secondary focus:border-secondary sm:text-sm disabled:bg-gray-100"
            />
          </div>
          <div>
             <label htmlFor="sender_email" className="block text-sm font-medium text-gray-700">Email người gửi</label>
             <input
              type="email"
              name="sender_email"
              id="sender_email"
              placeholder="Ví dụ: contact@your-verified-domain.com"
              value={settings.sender_email || ''}
              onChange={handleChange}
              disabled={!canEdit}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-secondary focus:border-secondary sm:text-sm disabled:bg-gray-100"
            />
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-800">Cấu hình SMTP</h3>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="smtp_host" className="block text-sm font-medium text-gray-700">SMTP Host</label>
              <input name="smtp_host" id="smtp_host" value={settings.smtp_host || ''} onChange={handleChange} disabled={!canEdit} placeholder="smtp.gmail.com" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-secondary focus:border-secondary sm:text-sm disabled:bg-gray-100" />
            </div>
            <div>
              <label htmlFor="smtp_port" className="block text-sm font-medium text-gray-700">SMTP Port</label>
              <input name="smtp_port" id="smtp_port" value={settings.smtp_port || ''} onChange={handleChange} disabled={!canEdit} placeholder="587" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-secondary focus:border-secondary sm:text-sm disabled:bg-gray-100" />
            </div>
            <div>
              <label htmlFor="smtp_user" className="block text-sm font-medium text-gray-700">SMTP User</label>
              <input name="smtp_user" id="smtp_user" value={settings.smtp_user || ''} onChange={handleChange} disabled={!canEdit} placeholder="user@example.com" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-secondary focus:border-secondary sm:text-sm disabled:bg-gray-100" />
            </div>
            <div>
              <label htmlFor="smtp_password" className="block text-sm font-medium text-gray-700">SMTP Password</label>
              <input type="password" name="smtp_password" id="smtp_password" value={settings.smtp_password || ''} onChange={handleChange} disabled={!canEdit} placeholder="••••••••" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-secondary focus:border-secondary sm:text-sm disabled:bg-gray-100" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <input type="checkbox" name="smtp_secure" id="smtp_secure" checked={Boolean(settings.smtp_secure)} onChange={handleChange} disabled={!canEdit} className="h-4 w-4 text-secondary border-gray-300 rounded" />
            <label htmlFor="smtp_secure" className="text-sm text-gray-700">Kết nối bảo mật SSL/TLS</label>
          </div>
        </div>
        
        <div className="border-t pt-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Kiểm tra gửi SMTP</h3>
          <div className="flex flex-col md:flex-row gap-3">
            <input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="Nhập email nhận test" className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-secondary focus:border-secondary sm:text-sm" />
            <button type="button" onClick={handleTestSend} disabled={testing || !canEdit} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-slate-700 hover:bg-slate-800 disabled:opacity-50">
              {testing ? <span className="inline-flex items-center"><SpinnerIcon className="w-4 h-4 mr-2" /> Đang test...</span> : 'Gửi email test'}
            </button>
          </div>
        </div>
        
        <div className="flex items-center justify-end space-x-4">
           {success && <p className="text-sm text-green-600">Đã lưu cài đặt thành công!</p>}
           <button
            type="submit"
            disabled={loading || !canEdit}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#eb248e] hover:bg-[#d61f81] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#eb248e] disabled:opacity-50"
          >
            {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmailSettings;
