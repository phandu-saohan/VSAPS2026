import React, { useState, useEffect } from 'react';
import { EventDocument } from '../types';
import { supabase } from '../supabaseClient';
import { useToast } from '../contexts/ToastContext';

interface ShareDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: EventDocument | null;
}

const ShareDocumentModal: React.FC<ShareDocumentModalProps> = ({ isOpen, onClose, document }) => {
  const { addToast } = useToast();
  const [zaloNumber, setZaloNumber] = useState('');
  const [fromZaloNumber, setFromZaloNumber] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (document) {
      setMessage(`Chào bạn, tôi muốn chia sẻ với bạn tài liệu "${document.name}".\n\nBạn có thể xem hoặc tải về tại đây:\n${document.file_url}`);
    }
  }, [document]);

  if (!isOpen || !document) return null;

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(document.file_url)
      .then(() => {
        addToast('Đã sao chép liên kết!', 'success');
      })
      .catch(err => {
        addToast('Không thể sao chép liên kết.', 'error');
        console.error('Clipboard copy failed:', err);
      });
  };

  const handleSendZalo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zaloNumber || !fromZaloNumber) {
      addToast('Vui lòng nhập SĐT Zalo của bạn và người nhận.', 'warning');
      return;
    }
    setIsSending(true);
    
    try {
      const { error: invokeError } = await supabase.functions.invoke('send-abitstore-zalo', {
        body: {
          send_from_number: fromZaloNumber,
          send_to_number: zaloNumber,
          message: message,
        },
      });

      if (invokeError) throw invokeError;
      
      addToast('Tin nhắn đã được gửi qua Zalo!', 'success');
      onClose();

    } catch (err: any) {
      const errorMessage = err.context?.data?.error || err.message || "Đã xảy ra lỗi khi gửi tin nhắn.";
      addToast(`Lỗi: ${errorMessage}`, 'error');
      console.error("Zalo send error:", err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-secondary to-secondary-dark flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Chia sẻ tài liệu</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white hover:bg-white/10 rounded-full p-1 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="p-6 bg-gray-50/40">
          <p className="font-semibold text-gray-900 truncate" title={document.name}>{document.name}</p>
          <div className="mt-4">
            <label className="block text-sm font-semibold text-gray-700">Liên kết chia sẻ</label>
            <div className="mt-1 flex overflow-hidden rounded-xl border border-gray-300 bg-white shadow-sm">
              <input
                type="text"
                readOnly
                value={document.file_url}
                className="focus:ring-[#061D5F] focus:border-[#061D5F] flex-1 block w-full border-0 bg-white text-sm"
              />
              <button
                onClick={handleCopyToClipboard}
                className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-[#061D5F] hover:bg-[#0b2a86] active:scale-[0.98] transition-all"
              >
                Sao chép
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSendZalo} className="px-6 pb-6 pt-0 bg-gray-50/40">
            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Gửi qua Zalo (qua Abitstore)</h3>
              <p className="text-sm text-gray-500 mt-1">Lưu ý: Tính năng này yêu cầu SĐT Zalo của bạn đã được liên kết với Abitstore.</p>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                    <label htmlFor="from-zalo-number" className="block text-sm font-semibold text-gray-700">SĐT Zalo của bạn</label>
                    <input
                        type="tel"
                        id="from-zalo-number"
                        value={fromZaloNumber}
                        onChange={(e) => setFromZaloNumber(e.target.value)}
                        placeholder="VD: 0901234567"
                        className="mt-1 block w-full border-gray-300 rounded-xl shadow-sm focus:ring-[#061D5F] focus:border-[#061D5F]"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="zalo-number" className="block text-sm font-semibold text-gray-700">SĐT Zalo người nhận</label>
                    <input
                        type="tel"
                        id="zalo-number"
                        value={zaloNumber}
                        onChange={(e) => setZaloNumber(e.target.value)}
                        placeholder="VD: 0987654321"
                        className="mt-1 block w-full border-gray-300 rounded-xl shadow-sm focus:ring-[#061D5F] focus:border-[#061D5F]"
                        required
                    />
                </div>
            </div>

            <div className="mt-4">
                <label htmlFor="zalo-message" className="block text-sm font-semibold text-gray-700">Nội dung tin nhắn</label>
                <textarea
                    id="zalo-message"
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-xl shadow-sm focus:ring-[#061D5F] focus:border-[#061D5F]"
                />
            </div>

            <div className="mt-6 flex justify-end gap-3">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 active:scale-[0.98] transition-all"
                >
                    Đóng
                </button>
                <button
                    type="submit"
                    disabled={isSending}
                    className="px-4 py-2 bg-[#061D5F] text-white rounded-xl hover:bg-[#0b2a86] focus:outline-none focus:ring-2 focus:ring-[#061D5F] disabled:opacity-50 active:scale-[0.98] transition-all shadow-md"
                >
                    {isSending ? 'Đang gửi...' : 'Gửi Zalo'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default ShareDocumentModal;
