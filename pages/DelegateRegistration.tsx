import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase, uploadFileToStorage } from '../supabaseClient';
import { Status } from '../types';
import { useToast } from '../contexts/ToastContext';
import { SpinnerIcon } from '../components/icons/SpinnerIcon';
import { DEFAULT_LANDING_CONFIG, LandingConfig } from '../types/landing';
import { GoogleGenAI } from '@google/genai';
import QRCode from 'qrcode';

const fmt = (n: number) => n.toLocaleString('vi-VN') + ' đ';

interface MemberForm {
  id: string; full_name: string; email: string; phone: string;
  workplace: string; attendee_type: string; cme: boolean; gala_dinner: boolean;
}

const DelegateRegistration: React.FC = () => {
  const { addToast } = useToast();
  const [cfg, setCfg] = useState<LandingConfig>(DEFAULT_LANDING_CONFIG);
  const [cfgLoading, setCfgLoading] = useState(true);
  const [isGroup, setIsGroup] = useState(false);
  const [members, setMembers] = useState<MemberForm[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [err, setErr] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('settings').select('landing_config').eq('id', 1).single();
      if (data?.landing_config) setCfg(p => ({ ...p, ...(data.landing_config as Partial<LandingConfig>) }));
      setCfgLoading(false);
    })();
  }, []);

  const rc = cfg.registration_config;
  const TYPES = (rc?.attendee_types ?? []).map(t => ({ value: t.label, fee: t.fee }));
  const cmeFee = rc?.cme_fee ?? 200000;
  const galaFee = rc?.gala_fee ?? 800000;

  useEffect(() => {
    if (TYPES.length > 0 && members.length === 0) {
      setMembers([{ id: '1', full_name: '', email: '', phone: '', workplace: '', attendee_type: TYPES[0].value, cme: false, gala_dinner: false }]);
    }
  }, [cfgLoading]);

  const calcFee = (m: MemberForm) => (TYPES.find(t => t.value === m.attendee_type)?.fee ?? 0) + (m.cme ? cmeFee : 0) + (m.gala_dinner ? galaFee : 0);
  const grandTotal = members.reduce((s, m) => s + calcFee(m), 0);

  const addMember = () => setMembers(p => [...p, { id: Date.now().toString(), full_name: '', email: '', phone: '', workplace: '', attendee_type: TYPES[0]?.value ?? '', cme: false, gala_dinner: false }]);
  const removeMember = (id: string) => { if (members.length > 1) setMembers(p => p.filter(m => m.id !== id)); };
  const updateMember = (id: string, field: keyof MemberForm, val: any) => setMembers(p => p.map(m => m.id === id ? { ...m, [field]: val } : m));

  // VietQR string
  const vietQRContent = rc?.bank_account
    ? `${rc.bank_name}|${rc.bank_account}|${grandTotal}|${rc.transfer_prefix ?? 'VSAPS'} ${members[0]?.phone ?? ''}`
    : '';

  useEffect(() => {
    if (!qrRef.current || !vietQRContent || grandTotal === 0) return;
    QRCode.toCanvas(qrRef.current, vietQRContent, { width: 180, margin: 1, errorCorrectionLevel: 'H' }, (err) => { if (err) console.error(err); });
  }, [vietQRContent, grandTotal]);

  const checkPaymentWithAI = async (file: File): Promise<number | null> => {
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) return null;
      const base64 = await new Promise<string>(r => { const reader = new FileReader(); reader.onloadend = () => r((reader.result as string).split(',')[1]); reader.readAsDataURL(file); });
      const ai = new GoogleGenAI({ apiKey });
      const resp = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: [{ role: 'user', parts: [{ text: 'Đọc ảnh biên lai chuyển khoản. CHỈ trả về số tiền VNĐ dạng số nguyên, không có ký tự khác. Ví dụ: 2500000. Nếu không tìm thấy trả về 0.' }, { inlineData: { mimeType: file.type, data: base64 } }] }] });
      const n = parseInt(resp.text.trim().replace(/\D/g, ''), 10);
      return isNaN(n) ? null : n;
    } catch { return null; }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      if (!m.full_name || !m.email || !m.phone || !m.workplace) { setErr(`Điền đầy đủ thông tin Thành viên ${i + 1}`); return; }
    }
    if (!paymentFile && grandTotal > 0) { setErr('Vui lòng tải ảnh biên lai thanh toán.'); return; }
    setSubmitting(true);
    try {
      let finalStatus = grandTotal === 0 ? Status.COMPLETED : Status.PENDING;
      let paymentUrl = '';
      if (paymentFile && grandTotal > 0) {
        paymentUrl = await uploadFileToStorage(paymentFile, 'event_assets', 'payments') || '';
        if (!paymentUrl) throw new Error('Lỗi khi tải ảnh biên lai.');
        const aiAmt = await checkPaymentWithAI(paymentFile);
        if (aiAmt !== null && aiAmt >= grandTotal) { finalStatus = Status.COMPLETED; addToast('AI xác nhận thanh toán hợp lệ!', 'success'); }
        else { addToast('Biên lai đã nhận, chờ BTC xác nhận.', 'success'); }
      }
      const groupId = isGroup ? `GROUP-${Date.now().toString(36).toUpperCase()}` : null;
      const rows = members.map((m, i) => ({
        full_name: m.full_name, email: m.email, phone: m.phone, workplace: m.workplace,
        attendee_type: m.attendee_type, cme: m.cme, gala_dinner: m.gala_dinner,
        payment_amount: calcFee(m), payment_image_url: paymentUrl, status: finalStatus,
        attendance_id: groupId ? `${groupId}-${i + 1}` : `VIP-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      }));
      const { error } = await supabase.from('submissions').insert(rows);
      if (error) throw error;
      const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'Quản trị viên');
      if (admins?.length) await supabase.from('notifications').insert(admins.map(a => ({ user_id: a.id, message: `Đại biểu mới: ${members[0].full_name}${isGroup ? ' và đoàn' : ''}`, link: '/submissions', read: false })));
      setSuccess(true);
    } catch (e: any) { setErr(e.message); }
    finally { setSubmitting(false); }
  };

  const Header = () => (
    <nav className="bg-[#061D5F] text-white sticky top-0 z-50 border-b border-white/10">
      <div className="max-w-screen-xl mx-auto px-6 py-3 flex justify-between items-center">
        <a href="#/" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#F95E8B] rounded flex items-center justify-center font-black text-white">VS</div>
          <span className="text-sm font-semibold tracking-widest uppercase hidden sm:inline">{cfg.event_name}</span>
        </a>
        <div className="hidden lg:flex items-center gap-6">
          <a className="text-xs font-bold uppercase tracking-widest hover:text-[#F95E8B]" href="#/">Trang chủ</a>
          <a className="text-xs font-bold uppercase tracking-widest text-[#F95E8B]" href="#/register-delegate">Đăng ký</a>
          <a href="#/login" className="px-5 py-2 bg-[#F95E8B] text-white text-xs font-bold uppercase rounded hover:brightness-110">Đăng nhập →</a>
        </div>
        <button onClick={() => setMenuOpen(!menuOpen)} className="lg:hidden"><span className="material-symbols-outlined">menu</span></button>
      </div>
      <div className={`lg:hidden overflow-hidden transition-all ${menuOpen ? 'max-h-60' : 'max-h-0'}`}>
        <div className="px-6 py-4 space-y-3 border-t border-white/10">
          <a className="block text-xs font-bold uppercase text-white/80" href="#/">Trang chủ</a>
          <a className="block text-xs font-bold uppercase text-[#F95E8B]" href="#/register-delegate">Đăng ký Đại biểu</a>
          <a href="#/login" className="block px-4 py-2 bg-[#F95E8B] text-white text-xs font-bold uppercase text-center rounded">Đăng nhập →</a>
        </div>
      </div>
    </nav>
  );

  const Footer = () => (
    <footer className="bg-[#061D5F] text-white px-6 py-10 mt-auto">
      <div className="max-w-screen-xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        <div><div className="flex items-center gap-3 mb-3"><div className="w-9 h-9 bg-[#F95E8B] rounded flex items-center justify-center font-black">VS</div><span className="font-black tracking-tight">{cfg.event_name}</span></div>
          <p className="text-white/40 text-xs leading-relaxed">{cfg.event_date_display} · {cfg.event_venue_display}</p></div>
        <div><h5 className="text-[10px] font-bold uppercase tracking-widest text-[#F95E8B] mb-3">Liên kết</h5>
          <ul className="space-y-2 text-xs text-white/50"><li><a href="#/" className="hover:text-white">Trang chủ</a></li><li><a href="#/register-speaker" className="hover:text-white">Đăng ký BCV</a></li></ul></div>
        <div><h5 className="text-[10px] font-bold uppercase tracking-widest text-[#F95E8B] mb-3">Ban Thư ký</h5>
          <p className="text-xs text-white/50 leading-relaxed">{cfg.contact_email}<br/>{cfg.contact_phone}</p></div>
      </div>
      <div className="max-w-screen-xl mx-auto mt-6 pt-4 border-t border-white/10"><p className="text-[10px] text-white/30 uppercase">© 2026 VSAPS.</p></div>
    </footer>
  );

  if (success) return (<><Header/><div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
    <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5"><span className="material-symbols-outlined text-4xl text-green-600">check_circle</span></div>
      <h1 className="text-2xl font-extrabold text-[#061D5F] mb-2">Đăng ký thành công!</h1>
      <p className="text-gray-500 text-sm mb-6">Cảm ơn bạn. BTC sẽ xác nhận sớm nhất có thể.</p>
      <Link to="/" className="px-8 py-3 bg-[#061D5F] text-white font-bold rounded-xl hover:bg-blue-900 inline-block">Về trang chủ</Link>
    </div></div><Footer/></>);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Header/>
      <div className="flex-1 py-8 px-4">
        {!cfgLoading && rc?.enabled === false ? (
          <div className="max-w-md mx-auto text-center bg-white rounded-3xl shadow p-10">
            <span className="material-symbols-outlined text-5xl text-red-400">event_busy</span>
            <h2 className="text-xl font-bold text-[#061D5F] mt-3 mb-2">Đăng ký đã đóng</h2>
            <p className="text-gray-500 text-sm">Hệ thống chưa mở đăng ký. Vui lòng quay lại sau.</p>
            <Link to="/" className="inline-block mt-5 px-6 py-2 bg-[#061D5F] text-white font-bold rounded-xl">Trang chủ</Link>
          </div>
        ) : (
          <div className="max-w-screen-xl mx-auto">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-extrabold text-[#061D5F]">Đăng ký Đại biểu</h1>
              <p className="text-gray-400 text-sm mt-1">{cfg.event_date_display} · {cfg.event_venue_display}</p>
            </div>

            {err && <p className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-sm text-center mb-4 max-w-screen-xl mx-auto">{err}</p>}

            <form onSubmit={submit}>
              <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

                {/* ── LEFT COLUMN (3/5) ── */}
                <div className="xl:col-span-3 space-y-4">

                  {/* Mode toggle */}
                  <div className="flex bg-white rounded-2xl shadow-sm border border-gray-100 p-1.5 max-w-xs">
                    <button type="button" onClick={() => { setIsGroup(false); setMembers([members[0]]); }}
                      className={`flex-1 py-2 text-sm font-bold rounded-xl transition-colors ${!isGroup ? 'bg-[#061D5F] text-white' : 'text-gray-500'}`}>
                      Cá nhân
                    </button>
                    <button type="button" onClick={() => setIsGroup(true)}
                      className={`flex-1 py-2 text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-1 ${isGroup ? 'bg-[#061D5F] text-white' : 'text-gray-500'}`}>
                      <span className="material-symbols-outlined text-base">groups</span> Theo đoàn
                    </button>
                  </div>

                  {/* Member cards */}
                  {members.map((m, i) => (
                    <div key={m.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 relative">
                      {isGroup && members.length > 1 && (
                        <button type="button" onClick={() => removeMember(m.id)} className="absolute top-3 right-3 text-red-400 hover:text-red-600">
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      )}
                      <div className="flex items-center gap-2 mb-4">
                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                        <h2 className="text-base font-bold text-[#061D5F]">{isGroup ? `Thành viên ${i + 1}` : 'Thông tin cá nhân'}</h2>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          { f: 'full_name', l: 'Họ và tên *', t: 'text', ph: 'Nguyễn Văn A' },
                          { f: 'phone', l: 'Số điện thoại *', t: 'tel', ph: '0901 234 567' },
                          { f: 'email', l: 'Email *', t: 'email', ph: 'email@example.com' },
                          { f: 'workplace', l: 'Đơn vị công tác *', t: 'text', ph: 'Bệnh viện...' },
                        ].map(x => (
                          <div key={x.f}>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">{x.l}</label>
                            <input type={x.t} required value={(m as any)[x.f]} placeholder={x.ph}
                              onChange={e => updateMember(m.id, x.f as keyof MemberForm, e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"/>
                          </div>
                        ))}
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-gray-600 mb-2">Gói đăng ký & Dịch vụ</label>
                          <div className="flex flex-wrap gap-2">
                            <select value={m.attendee_type} onChange={e => updateMember(m.id, 'attendee_type', e.target.value)}
                              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500">
                              {TYPES.map(t => <option key={t.value} value={t.value}>{t.value} ({fmt(t.fee)})</option>)}
                            </select>
                            <label className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 text-sm">
                              <input type="checkbox" checked={m.cme} onChange={e => updateMember(m.id, 'cme', e.target.checked)} className="rounded"/>
                              CME <span className="text-[#F95E8B] font-semibold">+{fmt(cmeFee)}</span>
                            </label>
                            <label className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 text-sm">
                              <input type="checkbox" checked={m.gala_dinner} onChange={e => updateMember(m.id, 'gala_dinner', e.target.checked)} className="rounded"/>
                              Gala <span className="text-[#F95E8B] font-semibold">+{fmt(galaFee)}</span>
                            </label>
                          </div>
                          <div className="mt-2 flex justify-between items-center text-sm px-1">
                            <span className="text-gray-500">Phí thành viên {i+1}:</span>
                            <span className="font-bold text-[#061D5F]">{fmt(calcFee(m))}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {isGroup && (
                    <button type="button" onClick={addMember}
                      className="w-full py-3 border-2 border-dashed border-[#061D5F]/30 text-[#061D5F] font-bold rounded-2xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 text-sm">
                      <span className="material-symbols-outlined">add_circle</span> Thêm thành viên
                    </button>
                  )}
                </div>

                {/* ── RIGHT COLUMN (2/5) ── */}
                <div className="xl:col-span-2 space-y-4">
                  
                  {/* Order Summary */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sticky top-20">
                    <h3 className="text-base font-bold text-[#061D5F] mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#F95E8B]">receipt_long</span> Tóm tắt đăng ký
                    </h3>
                    <div className="space-y-2 mb-4">
                      {members.map((m, i) => (
                        <div key={m.id} className="flex justify-between text-sm py-2 border-b border-gray-50">
                          <div>
                            <p className="font-semibold text-gray-800">{m.full_name || `Thành viên ${i + 1}`}</p>
                            <p className="text-xs text-gray-400">{m.attendee_type || TYPES[0]?.value}{m.cme ? ' · CME' : ''}{m.gala_dinner ? ' · Gala' : ''}</p>
                          </div>
                          <span className="font-bold text-[#061D5F]">{fmt(calcFee(m))}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center p-3 bg-[#061D5F] rounded-xl text-white">
                      <span className="font-bold">Tổng cộng</span>
                      <span className="text-xl font-extrabold text-[#F95E8B]">{fmt(grandTotal)}</span>
                    </div>

                    {/* Bank info + QR */}
                    {grandTotal > 0 && rc?.bank_account && (
                      <div className="mt-4 bg-blue-50 border border-blue-100 rounded-2xl p-4">
                        <p className="text-xs font-bold text-[#061D5F] uppercase tracking-widest mb-3">Thông tin chuyển khoản</p>
                        <div className="flex gap-4 items-start">
                          <div className="flex-1 space-y-1.5 text-sm">
                            <div className="flex justify-between"><span className="text-gray-500">Ngân hàng</span><span className="font-bold">{rc.bank_name}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Số TK</span><span className="font-mono font-bold">{rc.bank_account}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Chủ TK</span><span className="font-bold text-xs text-right">{rc.bank_holder}</span></div>
                            <div className="pt-2 border-t border-blue-200">
                              <p className="text-xs text-gray-500">Nội dung CK:</p>
                              <p className="font-bold text-[#F95E8B] text-sm">{rc.transfer_prefix} {members[0]?.phone || 'SĐT'}</p>
                            </div>
                          </div>
                          <div className="flex-shrink-0 bg-white rounded-lg p-1.5 border shadow-sm">
                            <canvas ref={qrRef} width={120} height={120} style={{ width: 120, height: 120 }}/>
                            <p className="text-[9px] text-center text-gray-400 mt-1">Quét QR</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Upload receipt */}
                    {grandTotal > 0 && (
                      <div className="mt-4">
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Ảnh biên lai <span className="text-red-500">*</span>
                          <span className="text-gray-400 font-normal"> · AI tự đối chiếu</span>
                        </label>
                        <label className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${paymentFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-[#061D5F]'}`}>
                          {paymentFile
                            ? <><span className="material-symbols-outlined text-2xl text-green-500">check_circle</span><span className="text-xs font-semibold text-green-700 mt-1">{paymentFile.name}</span></>
                            : <><span className="material-symbols-outlined text-2xl text-gray-400">cloud_upload</span><span className="text-xs text-gray-500 mt-1">Nhấn để chọn ảnh</span></>
                          }
                          <input type="file" className="sr-only" accept="image/*,.pdf" onChange={e => setPaymentFile(e.target.files?.[0] || null)}/>
                        </label>
                      </div>
                    )}

                    {/* Submit button */}
                    <button type="submit" disabled={submitting}
                      className="w-full mt-4 py-3.5 bg-[#F95E8B] text-white font-bold rounded-xl hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2">
                      {submitting ? <><SpinnerIcon className="w-5 h-5"/> Đang xử lý...</> : <><span className="material-symbols-outlined">verified</span> Hoàn tất đăng ký</>}
                    </button>
                    <p className="text-center text-xs text-gray-400 mt-3">
                      Đã có tài khoản? <Link to="/login" className="text-[#061D5F] font-bold hover:underline">Đăng nhập</Link>
                    </p>
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
      <Footer/>
    </div>
  );
};

export default DelegateRegistration;
