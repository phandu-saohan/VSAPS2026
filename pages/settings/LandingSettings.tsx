import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { DEFAULT_LANDING_CONFIG, LandingConfig } from '../../types/landing';

type Tab = 'general' | 'media' | 'stats' | 'speakers' | 'prices' | 'registration' | 'contact';

const TAB_LIST: { id: Tab; label: string; icon: string }[] = [
  { id: 'general', label: 'Thông tin chung', icon: '📋' },
  { id: 'media', label: 'Media & Hình ảnh', icon: '🖼️' },
  { id: 'stats', label: 'Chỉ số thống kê', icon: '📊' },
  { id: 'speakers', label: 'Diễn giả nổi bật', icon: '🎤' },
  { id: 'prices', label: 'Phí đăng ký', icon: '💳' },
  { id: 'registration', label: 'Cài đặt đăng ký', icon: '⚙️' },
  { id: 'contact', label: 'Liên hệ', icon: '📞' },
];

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="block text-xs font-semibold text-gray-700 mb-1.5">{children}</label>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input {...props} className={`w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-colors ${props.className ?? ''}`} />
);

const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
  <textarea {...props} className={`w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-colors resize-none ${props.className ?? ''}`} />
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <Label>{label}</Label>
    {children}
  </div>
);

// ─── Main Component ─────────────────────────────────────────────────────────
const LandingSettings: React.FC = () => {
  const { hasPermission } = useAuth();
  const { addToast } = useToast();
  const [tab, setTab] = useState<Tab>('general');
  const [cfg, setCfg] = useState<LandingConfig>(DEFAULT_LANDING_CONFIG);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch current config
  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase.from('settings').select('landing_config').eq('id', 1).single();
      if (data?.landing_config) {
        setCfg(prev => ({ ...prev, ...(data.landing_config as Partial<LandingConfig>) }));
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const handleSave = async () => {
    if (!hasPermission('settings:edit')) {
      addToast('Bạn không có quyền chỉnh sửa cài đặt.', 'error');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('settings').update({ landing_config: cfg }).eq('id', 1);
    setSaving(false);
    if (error) {
      addToast('Lỗi khi lưu: ' + error.message, 'error');
    } else {
      addToast('Đã lưu cài đặt trang Landing thành công!', 'success');
    }
  };

  const set = useCallback(<K extends keyof LandingConfig>(key: K, value: LandingConfig[K]) => {
    setCfg(prev => ({ ...prev, [key]: value }));
  }, []);

  const setStats = (key: keyof LandingConfig['stats'], value: string) => {
    setCfg(prev => ({ ...prev, stats: { ...prev.stats, [key]: value } }));
  };

  if (loading) return <div className="p-6 text-sm text-gray-500">Đang tải cấu hình...</div>;

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Cài đặt Trang Giới thiệu</h2>
          <p className="text-sm text-gray-500 mt-1">Nội dung được hiển thị trực tiếp trên trang giới thiệu công khai.</p>
        </div>
        <div className="flex gap-3">
          <a href="/#/landing" target="_blank" rel="noopener noreferrer"
            className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-semibold rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2">
            👁 Xem trang
          </a>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-secondary text-white text-xs font-bold rounded-md hover:bg-secondary-dark disabled:opacity-60 transition-colors flex items-center gap-2">
            {saving ? '⏳ Đang lưu...' : '💾 Lưu thay đổi'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto pb-0">
        {TAB_LIST.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
              tab === t.id ? 'border-secondary text-secondary' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Thông tin chung ── */}
      {tab === 'general' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Tên sự kiện *">
              <Input value={cfg.event_name} onChange={e => set('event_name', e.target.value)} placeholder="VSAPS 2026" />
            </Field>
            <Field label="Phiên / Lần tổ chức">
              <Input value={cfg.event_edition} onChange={e => set('event_edition', e.target.value)} placeholder="Hội nghị lần thứ 10..." />
            </Field>
          </div>

          <Field label="Phụ đề dưới tiêu đề chính">
            <Input value={cfg.event_subtitle} onChange={e => set('event_subtitle', e.target.value)} placeholder="ĐẠI HỘI LẦN THỨ 3..." />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Ngày hiển thị (dạng chữ)">
              <Input value={cfg.event_date_display} onChange={e => set('event_date_display', e.target.value)} placeholder="11 – 14 tháng 12, 2026" />
            </Field>
            <Field label="Ngày ISO (dùng cho đếm ngược) *">
              <Input type="datetime-local" value={cfg.event_date_iso.substring(0, 16)} onChange={e => set('event_date_iso', e.target.value + '+07:00')} />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Giờ tổ chức (hiển thị)">
              <Input value={cfg.event_time} onChange={e => set('event_time', e.target.value)} placeholder="08:00 – 17:00, ngày 11–14/12/2026" />
            </Field>
            <Field label="Số giờ CME">
              <Input value={cfg.cme_hours} onChange={e => set('cme_hours', e.target.value)} placeholder="24" />
            </Field>
          </div>

          <Field label="Tên địa điểm (rút gọn)">
            <Input value={cfg.event_venue_display} onChange={e => set('event_venue_display', e.target.value)} placeholder="Bệnh viện Quân y 175, TP.HCM" />
          </Field>

          <Field label="Địa chỉ đầy đủ">
            <Input value={cfg.event_venue_address} onChange={e => set('event_venue_address', e.target.value)} placeholder="786 Nguyễn Kiệm..." />
          </Field>

          <Field label="Mô tả sự kiện (đoạn giới thiệu)">
            <Textarea value={cfg.event_description} onChange={e => set('event_description', e.target.value)} rows={5} placeholder="Nhằm tiếp nối hành trình khoa học..." />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Khoảng cách từ sân bay">
              <Input value={cfg.distance_from_airport} onChange={e => set('distance_from_airport', e.target.value)} placeholder="5 phút" />
            </Field>
            <Field label="Khách sạn khuyến nghị">
              <Input value={cfg.recommended_hotels} onChange={e => set('recommended_hotels', e.target.value)} placeholder="Tân Sơn Nhất Pavilion và Parkroyal..." />
            </Field>
          </div>
        </div>
      )}

      {/* ── Tab: Media & Hình ảnh ── */}
      {tab === 'media' && (
        <div className="space-y-7">
          {/* Hero Background */}
          <div className="border border-gray-200 rounded-lg p-5 space-y-4">
            <p className="text-sm font-bold text-gray-700 flex items-center gap-2">🖼️ Ảnh nền Hero</p>
            <Field label="URL ảnh nền (Hero section)">
              <Input
                value={cfg.hero_image_url ?? ''}
                onChange={e => set('hero_image_url', e.target.value)}
                placeholder="https://images.unsplash.com/photo-..." />
              {cfg.hero_image_url && (
                <div className="mt-2 relative rounded-md overflow-hidden border h-28 bg-gray-50">
                  <img src={cfg.hero_image_url} alt="Hero preview" className="w-full h-full object-cover opacity-70" />
                  <span className="absolute bottom-1 left-2 text-[10px] text-white font-bold bg-black/40 px-2 py-0.5 rounded">Preview</span>
                </div>
              )}
            </Field>
          </div>

          {/* Video */}
          <div className="border border-gray-200 rounded-lg p-5 space-y-4">
            <p className="text-sm font-bold text-gray-700 flex items-center gap-2">🎥 Video Highlight</p>
            <Field label="URL ảnh thumbnail video (hiển thị trong Hero)">
              <Input
                value={cfg.hero_video_thumb_url ?? ''}
                onChange={e => set('hero_video_thumb_url', e.target.value)}
                placeholder="https://images.unsplash.com/photo-..." />
              {cfg.hero_video_thumb_url && (
                <div className="mt-2 relative rounded-md overflow-hidden border h-28 bg-gray-50">
                  <img src={cfg.hero_video_thumb_url} alt="Video thumbnail preview" className="w-full h-full object-cover opacity-70" />
                  <span className="absolute bottom-1 left-2 text-[10px] text-white font-bold bg-black/40 px-2 py-0.5 rounded">Thumbnail</span>
                </div>
              )}
            </Field>
            <Field label="URL video YouTube (embed) — để trống nếu chưa có">
              <Input
                value={cfg.hero_video_url ?? ''}
                onChange={e => set('hero_video_url', e.target.value)}
                placeholder="https://www.youtube.com/embed/VIDEO_ID" />
              <p className="text-[11px] text-gray-400 mt-1">Ví dụ: https://www.youtube.com/embed/dQw4w9WgXcQ</p>
            </Field>
          </div>

          {/* Speaker Card Images */}
          <div className="border border-gray-200 rounded-lg p-5 space-y-4">
            <p className="text-sm font-bold text-gray-700 flex items-center gap-2">🧑‍⚕️ Ảnh Diễn giả Danh dự (5 ảnh card)</p>
            <p className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-md px-4 py-2">
              💡 Tỉ lệ ảnh khuyến nghị <strong>2:1</strong> (ngang). Có thể dùng URL hoặc đường dẫn tương đối <code>/images/speakers/...</code>
            </p>
            {[
              { idx: 0, label: 'Ảnh Card 1 (Hàng trên, trái — tỉ lệ 2:1)' },
              { idx: 1, label: 'Ảnh Card 2 (Hàng trên, phải — tỉ lệ 2:1)' },
              { idx: 2, label: 'Ảnh Card 3 (Hàng dưới, trái — tỉ lệ 2:1)' },
              { idx: 3, label: 'Ảnh Card 4 (Hàng dưới, giữa — tỉ lệ 2:1)' },
              { idx: 4, label: 'Ảnh Card 5 (Hàng dưới, phải — tỉ lệ 2:1)' },
            ].map(({ idx, label }) => {
              const images = cfg.speaker_card_images ?? ['', '', '', '', ''];
              const url = images[idx] ?? '';
              return (
                <div key={idx} className="space-y-2">
                  <Field label={label}>
                    <Input
                      value={url}
                      onChange={e => {
                        const imgs = [...(cfg.speaker_card_images ?? ['', '', '', '', ''])];
                        imgs[idx] = e.target.value;
                        set('speaker_card_images', imgs);
                      }}
                      placeholder="/images/speakers/speaker-1.png hoặc https://..." />
                    {url && (
                      <div className="mt-2 relative rounded-md overflow-hidden border h-20 bg-gray-50">
                        <img src={url} alt={`Card ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                    )}
                  </Field>
                </div>
              );
            })}
          </div>

          {/* Map Embed */}
          <div className="border border-gray-200 rounded-lg p-5 space-y-4">
            <p className="text-sm font-bold text-gray-700 flex items-center gap-2">🗺️ Bản đồ Google Maps</p>
            <Field label="URL Google Maps Embed">
              <Textarea
                value={cfg.map_embed_url ?? ''}
                onChange={e => set('map_embed_url', e.target.value)}
                rows={3}
                placeholder="https://www.google.com/maps/embed?pb=..." />
              <p className="text-[11px] text-gray-400 mt-1">Lấy từ Google Maps → Chia sẻ → Nhúng → Sao chép URL trong src="..."</p>
            </Field>
          </div>

          {/* Social & Footer */}
          <div className="border border-gray-200 rounded-lg p-5 space-y-4">
            <p className="text-sm font-bold text-gray-700 flex items-center gap-2">🌐 Mạng xã hội & Footer</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="URL Facebook">
                <Input
                  value={cfg.social_facebook ?? ''}
                  onChange={e => set('social_facebook', e.target.value)}
                  placeholder="https://facebook.com/vsaps" />
              </Field>
              <Field label="URL YouTube">
                <Input
                  value={cfg.social_youtube ?? ''}
                  onChange={e => set('social_youtube', e.target.value)}
                  placeholder="https://youtube.com/@vsaps" />
              </Field>
            </div>
            <Field label="Mô tả VSAPS (hiển thị trong footer)">
              <Textarea
                value={cfg.footer_description ?? ''}
                onChange={e => set('footer_description', e.target.value)}
                rows={3}
                placeholder="Hội Phẫu thuật Tạo hình Thẩm mỹ Việt Nam (VSAPS)..." />
            </Field>
          </div>
        </div>
      )}

      {/* ── Tab: Stats ── */}
      {tab === 'stats' && (
        <div className="space-y-4">
          <p className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-md px-4 py-3">
            💡 Nhập số nguyên. Ký hiệu "+" sẽ được thêm tự động khi hiển thị.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {([
              ['delegates', 'Số đại biểu'],
              ['speakers', 'Chủ tọa & BCV'],
              ['international_speakers', 'BCV Quốc tế'],
              ['presentations', 'Bài báo cáo'],
              ['companies', 'Doanh nghiệp'],
              ['countries', 'Quốc gia'],
            ] as [keyof LandingConfig['stats'], string][]).map(([key, label]) => (
              <div key={key} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <Label>{label}</Label>
                <Input
                  type="number" min={0}
                  value={cfg.stats[key]}
                  onChange={e => setStats(key, e.target.value)}
                  className="text-center text-2xl font-bold text-secondary"
                />
                <p className="text-center text-xs text-gray-400 mt-1">→ hiển thị: {cfg.stats[key]}+</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab: Diễn giả ── */}
      {tab === 'speakers' && (
        <div className="space-y-4">
          <p className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-md px-4 py-3">
            💡 Nhập tối đa 4 diễn giả nổi bật. Để hiển thị tất cả diễn giả, vào module <strong>CT/BCV</strong> trong menu chính.
          </p>
          {cfg.featured_speakers.map((spk, idx) => (
            <div key={spk.id} className="border border-gray-200 rounded-lg p-5 space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm font-bold text-gray-700">Diễn giả #{idx + 1}</p>
                <button
                  onClick={() => set('featured_speakers', cfg.featured_speakers.filter((_, i) => i !== idx))}
                  className="text-xs text-red-500 hover:text-red-700 font-medium">
                  ✕ Xóa
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Họ và tên *">
                  <Input value={spk.name} onChange={e => {
                    const s = [...cfg.featured_speakers]; s[idx] = { ...s[idx], name: e.target.value };
                    set('featured_speakers', s);
                  }} placeholder="GS. Nguyễn Văn A" />
                </Field>
                <Field label="Cơ sở / Tổ chức">
                  <Input value={spk.institution} onChange={e => {
                    const s = [...cfg.featured_speakers]; s[idx] = { ...s[idx], institution: e.target.value };
                    set('featured_speakers', s);
                  }} placeholder="Đại học Y Hà Nội" />
                </Field>
              </div>
              <Field label="Chuyên môn (mô tả ngắn)">
                <Textarea value={spk.specialty} rows={2} onChange={e => {
                  const s = [...cfg.featured_speakers]; s[idx] = { ...s[idx], specialty: e.target.value };
                  set('featured_speakers', s);
                }} placeholder="Chuyên gia về..." />
              </Field>
              <Field label="URL ảnh đại diện">
                <Input value={spk.avatar_url || ''} onChange={e => {
                  const s = [...cfg.featured_speakers]; s[idx] = { ...s[idx], avatar_url: e.target.value };
                  set('featured_speakers', s);
                }} placeholder="https://..." />
                {spk.avatar_url && (
                  <img src={spk.avatar_url} alt={spk.name} className="mt-2 w-16 h-16 object-cover rounded-full border" />
                )}
              </Field>
            </div>
          ))}

          {cfg.featured_speakers.length < 4 && (
            <button
              onClick={() => set('featured_speakers', [...cfg.featured_speakers, {
                id: Date.now(), name: '', institution: '', specialty: '', avatar_url: '',
              }])}
              className="w-full py-3 border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-secondary hover:text-secondary transition-colors rounded-lg">
              + Thêm diễn giả
            </button>
          )}
        </div>
      )}

      {/* ── Tab: Phí đăng ký ── */}
      {tab === 'prices' && (
        <div className="space-y-4">
          {cfg.registration_prices.map((pkg, idx) => (
            <div key={pkg.id} className={`border-2 rounded-lg p-5 space-y-4 ${pkg.popular ? 'border-secondary/50 bg-secondary/5' : 'border-gray-200'}`}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <p className="text-sm font-bold text-gray-700">Gói #{idx + 1}</p>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={!!pkg.popular}
                      onChange={e => {
                        const p = [...cfg.registration_prices];
                        p[idx] = { ...p[idx], popular: e.target.checked };
                        set('registration_prices', p);
                      }} className="accent-primary" />
                    <span className="text-xs font-medium text-secondary">Nổi bật nhất</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="Tên gói">
                  <Input value={pkg.name} onChange={e => {
                    const p = [...cfg.registration_prices]; p[idx] = { ...p[idx], name: e.target.value };
                    set('registration_prices', p);
                  }} placeholder="Hội viên VSAPS" />
                </Field>
                <Field label="Mức phí (đ)">
                  <Input value={pkg.price} onChange={e => {
                    const p = [...cfg.registration_prices]; p[idx] = { ...p[idx], price: e.target.value };
                    set('registration_prices', p);
                  }} placeholder="1.500.000" />
                </Field>
                <Field label="Ghi chú phí (hạn EarlyBird...)">
                  <Input value={pkg.desc} onChange={e => {
                    const p = [...cfg.registration_prices]; p[idx] = { ...p[idx], desc: e.target.value };
                    set('registration_prices', p);
                  }} placeholder="Áp dụng đến 30/09/2026" />
                </Field>
              </div>

              <Field label="Quyền lợi (mỗi dòng = 1 mục)">
                <Textarea rows={4} value={pkg.features.join('\n')}
                  onChange={e => {
                    const p = [...cfg.registration_prices];
                    p[idx] = { ...p[idx], features: e.target.value.split('\n').filter(Boolean) };
                    set('registration_prices', p);
                  }}
                  placeholder={"Toàn bộ phiên khoa học\nChứng chỉ CME 24 giờ\nVé Gala Dinner"} />
              </Field>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab: Cài đặt đăng ký ── */}
      {tab === 'registration' && (
        <div className="space-y-5">
          {/* Toggle & Deadline */}
          <div className="flex items-center justify-between p-4 bg-gray-50 border rounded-lg">
            <div>
              <p className="text-sm font-bold text-gray-700">Mở đăng ký đại biểu</p>
              <p className="text-xs text-gray-400">Khi tắt, trang đăng ký sẽ hiển thị thông báo đóng.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={cfg.registration_config?.enabled ?? true}
                onChange={e => setCfg(p => ({ ...p, registration_config: { ...p.registration_config, enabled: e.target.checked } }))}
                className="sr-only peer"/>
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-green-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
            </label>
          </div>

          <Field label="Hạn đăng ký sớm (EarlyBird)">
            <Input type="date" value={cfg.registration_config?.deadline ?? ''}
              onChange={e => setCfg(p => ({ ...p, registration_config: { ...p.registration_config, deadline: e.target.value } }))}/>
          </Field>

          {/* Attendee Types */}
          <div className="border rounded-lg p-5 space-y-4">
            <p className="text-sm font-bold text-gray-700">Loại đại biểu & Mức phí</p>
            {(cfg.registration_config?.attendee_types ?? []).map((t, i) => (
              <div key={i} className="flex items-center gap-3">
                <Input value={t.label} placeholder="Tên loại" onChange={e => {
                  const a = [...(cfg.registration_config?.attendee_types ?? [])];
                  a[i] = { ...a[i], label: e.target.value };
                  setCfg(p => ({ ...p, registration_config: { ...p.registration_config, attendee_types: a } }));
                }}/>
                <Input type="number" value={t.fee} placeholder="Phí (đ)" className="max-w-[160px]" onChange={e => {
                  const a = [...(cfg.registration_config?.attendee_types ?? [])];
                  a[i] = { ...a[i], fee: Number(e.target.value) };
                  setCfg(p => ({ ...p, registration_config: { ...p.registration_config, attendee_types: a } }));
                }}/>
                <button type="button" onClick={() => {
                  const a = (cfg.registration_config?.attendee_types ?? []).filter((_, j) => j !== i);
                  setCfg(p => ({ ...p, registration_config: { ...p.registration_config, attendee_types: a } }));
                }} className="text-red-400 hover:text-red-600 text-xs font-bold">✕</button>
              </div>
            ))}
            <button type="button" onClick={() => {
              const a = [...(cfg.registration_config?.attendee_types ?? []), { label: '', fee: 0 }];
              setCfg(p => ({ ...p, registration_config: { ...p.registration_config, attendee_types: a } }));
            }} className="w-full py-2 border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-secondary hover:text-secondary rounded-lg">+ Thêm loại</button>
          </div>

          {/* Add-on fees */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Phí CME (đ)">
              <Input type="number" value={cfg.registration_config?.cme_fee ?? 200000}
                onChange={e => setCfg(p => ({ ...p, registration_config: { ...p.registration_config, cme_fee: Number(e.target.value) } }))}/>
            </Field>
            <Field label="Phí Gala Dinner (đ)">
              <Input type="number" value={cfg.registration_config?.gala_fee ?? 800000}
                onChange={e => setCfg(p => ({ ...p, registration_config: { ...p.registration_config, gala_fee: Number(e.target.value) } }))}/>
            </Field>
          </div>

          {/* Bank info */}
          <div className="border rounded-lg p-5 space-y-4">
            <p className="text-sm font-bold text-gray-700">Thông tin chuyển khoản</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Ngân hàng">
                <Input value={cfg.registration_config?.bank_name ?? ''}
                  onChange={e => setCfg(p => ({ ...p, registration_config: { ...p.registration_config, bank_name: e.target.value } }))}/>
              </Field>
              <Field label="Số tài khoản">
                <Input value={cfg.registration_config?.bank_account ?? ''}
                  onChange={e => setCfg(p => ({ ...p, registration_config: { ...p.registration_config, bank_account: e.target.value } }))}/>
              </Field>
              <Field label="Chủ tài khoản">
                <Input value={cfg.registration_config?.bank_holder ?? ''}
                  onChange={e => setCfg(p => ({ ...p, registration_config: { ...p.registration_config, bank_holder: e.target.value } }))}/>
              </Field>
              <Field label="Tiền tố nội dung CK">
                <Input value={cfg.registration_config?.transfer_prefix ?? ''}
                  onChange={e => setCfg(p => ({ ...p, registration_config: { ...p.registration_config, transfer_prefix: e.target.value } }))}
                  placeholder="VSAPS"/>
              </Field>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Liên hệ ── */}
      {tab === 'contact' && (
        <div className="space-y-4">
          <Field label="Email Ban thư ký">
            <Input type="email" value={cfg.contact_email} onChange={e => set('contact_email', e.target.value)} placeholder="hotro@vsaps.vn" />
          </Field>
          <Field label="Số điện thoại">
            <Input value={cfg.contact_phone} onChange={e => set('contact_phone', e.target.value)} placeholder="+84 (28) 3895 4941" />
          </Field>
          <Field label="Địa chỉ văn phòng">
            <Textarea value={cfg.contact_office} rows={3} onChange={e => set('contact_office', e.target.value)} placeholder="786 Nguyễn Kiệm, Phường 3, Quận Gò Vấp, TP.HCM" />
          </Field>
        </div>
      )}

      {/* Bottom Save Button */}
      <div className="mt-8 pt-5 border-t border-gray-200 flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className="px-7 py-2.5 bg-secondary text-white text-sm font-bold rounded-md hover:bg-secondary-dark disabled:opacity-60 transition-colors">
          {saving ? '⏳ Đang lưu...' : '💾 Lưu thay đổi'}
        </button>
      </div>
    </div>
  );
};

export default LandingSettings;
