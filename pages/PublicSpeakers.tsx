import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Speaker, Status } from '../types';
import { Link } from 'react-router-dom';

const getCountryCode = (country: string | null | undefined) => {
  const map: Record<string, string> = {
    'Việt Nam': 'vn',
    'Hoa Kỳ': 'us',
    'Hàn Quốc': 'kr',
    'Nhật Bản': 'jp',
    'Pháp': 'fr',
    'Đức': 'de',
    'Singapore': 'sg',
    'Thái Lan': 'th',
    'Đài Loan': 'tw',
  };
  return map[country || ''] || 'un';
};

const useFadeIn = <T extends HTMLElement,>() => {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        obs.disconnect();
      }
    }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, visible };
};

const FadeSection: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  const { ref, visible } = useFadeIn<HTMLDivElement>();
  return <div ref={ref} className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${className}`}>{children}</div>;
};

const speakerTypeLabel = (type: string) => {
  if (type === 'Chủ tọa' || type === 'Chủ tọa/Báo cáo viên') return 'Khách mời quốc tế';
  return 'Báo cáo viên trong nước';
};

const PublicSpeakers: React.FC = () => {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fetchSpeakers = async () => {
      const { data, error } = await supabase
        .from('speakers')
        .select('*')
        .eq('status', Status.APPROVED)
        .order('full_name', { ascending: true });
      if (!error) setSpeakers(data || []);
      setLoading(false);
    };
    fetchSpeakers();
  }, []);

  const filteredSpeakers = useMemo(() => speakers.filter((s) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      s.full_name.toLowerCase().includes(term) ||
      s.workplace.toLowerCase().includes(term) ||
      s.academic_rank.toLowerCase().includes(term);
    const matchesType =
      filterType === 'All' ? true : filterType === 'Khách mời quốc tế'
        ? (s.speaker_type === 'Chủ tọa' || s.speaker_type === 'Chủ tọa/Báo cáo viên')
        : s.speaker_type === 'Báo cáo viên';
    return matchesSearch && matchesType;
  }), [speakers, searchTerm, filterType]);

  const stats = useMemo(() => ([
    { label: 'Diễn giả', value: speakers.length },
    { label: 'Khách mời quốc tế', value: speakers.filter((s) => s.speaker_type === 'Chủ tọa' || s.speaker_type === 'Chủ tọa/Báo cáo viên').length },
    { label: 'Báo cáo viên trong nước', value: speakers.filter((s) => s.speaker_type === 'Báo cáo viên').length },
  ]), [speakers]);

  const speakerTypes = ['All', 'Khách mời quốc tế', 'Báo cáo viên trong nước'];

  return (
    <div className="min-h-screen bg-[#f8f6f6] text-[#221610] font-display">
      <header className="sticky top-0 z-50 bg-[#1e0f24] text-white border-b border-[#40204b] backdrop-blur-md">
        <div className="mx-auto max-w-[1280px] px-4 md:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-[#e6a1ff] text-[#1e0f24] flex items-center justify-center font-black">VS</div>
              <div>
                <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">VSAPS</h2>
                <span className="text-[10px] uppercase tracking-wider text-[#bd8dce] font-semibold">Danh sách báo cáo viên</span>
              </div>
            </Link>
            <div className="hidden md:flex items-center gap-8 text-sm font-medium">
              <Link to="/" className="text-white/90 hover:text-[#e6a1ff]">Trang chủ</Link>
              <span className="border-b-2 border-[#e6a1ff] pb-0.5">Diễn giả</span>
              <Link to="/register-delegate" className="text-white/90 hover:text-[#e6a1ff]">Sự kiện</Link>
              <Link to="/login" className="rounded-xl bg-[#e6a1ff] px-4 py-2 font-bold text-[#1e0f24]">Tài khoản</Link>
            </div>
            <button onClick={() => setMenuOpen((v) => !v)} className="md:hidden rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold">
              Menu
            </button>
          </div>
          <div className={`md:hidden overflow-hidden transition-all duration-300 ${menuOpen ? 'max-h-64 pb-4 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="grid gap-3 pt-2 text-sm">
              <Link to="/" className="rounded-xl bg-white/5 px-4 py-3">Trang chủ</Link>
              <Link to="/speakers-list" className="rounded-xl bg-white/5 px-4 py-3 text-[#e6a1ff]">Diễn giả</Link>
              <Link to="/register-delegate" className="rounded-xl bg-white/5 px-4 py-3">Sự kiện</Link>
              <Link to="/login" className="rounded-xl bg-[#e6a1ff] px-4 py-3 text-center font-bold text-[#1e0f24]">Tài khoản</Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-8">
        <FadeSection>
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-white bg-[#1e0f24] inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider">Danh sách hội viên</p>
              <h1 className="mt-4 text-4xl font-black tracking-[-0.033em] text-[#1e0f24] md:text-5xl">Báo cáo viên VSAPS 2026</h1>
              <p className="mt-3 text-base text-[#bd8dce]">Kết nối với các chuyên gia phẫu thuật tạo hình hàng đầu Việt Nam.</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center w-full md:w-auto">
              {stats.map((s) => (
                <div key={s.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm min-w-28">
                  <div className="text-2xl font-black text-[#1e0f24]">{s.value}</div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#9a4c6c]">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </FadeSection>

        <FadeSection>
          <section className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-gray-700">Tìm kiếm</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tên bác sĩ..."
                    className="w-full rounded-lg border border-gray-200 py-3 pl-10 pr-4 outline-none transition-all focus:border-[#ec5b13] focus:ring-1 focus:ring-[#ec5b13]"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">Phân loại</label>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white p-3 outline-none focus:border-[#ec5b13] focus:ring-1 focus:ring-[#ec5b13]">
                  {speakerTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <button onClick={() => { setSearchTerm(''); setFilterType('All'); }} className="w-full rounded-lg bg-[#ec5b13] px-4 py-3 font-bold text-white transition-colors hover:bg-[#d6520d]">Đặt lại</button>
              </div>
            </div>
          </section>
        </FadeSection>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1,2,3,4,5,6,7,8].map((i) => <div key={i} className="h-[420px] animate-pulse rounded-xl bg-white border border-gray-200" />)}
          </div>
        ) : filteredSpeakers.length === 0 ? (
          <FadeSection>
            <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
              <p className="text-lg font-bold text-[#221610]">Không tìm thấy báo cáo viên phù hợp</p>
              <p className="mt-2 text-sm text-[#9a4c6c]">Thử thay đổi từ khóa hoặc phân loại.</p>
            </div>
          </FadeSection>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredSpeakers.map((speaker) => (
                <FadeSection key={speaker.id}>
                  <Link to="#" className="group block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                    <div className="aspect-[4/5] bg-gray-100">
                      <img
                        src={speaker.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(speaker.full_name)}&background=random`}
                        alt={speaker.full_name}
                        className="h-full w-full object-contain bg-white transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-5">
                      <span className={`inline-flex rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${speakerTypeLabel(speaker.speaker_type) === 'Khách mời quốc tế' ? 'bg-orange-100 text-[#ec5b13]' : 'bg-gray-100 text-gray-600'}`}>
                        {speakerTypeLabel(speaker.speaker_type)}
                      </span>
                      <h3 className="mt-3 text-lg font-bold text-[#221610] group-hover:text-[#ec5b13]">{speaker.academic_rank} {speaker.full_name}</h3>
                      <p className="mt-1 text-sm font-medium text-gray-600">{speaker.workplace}</p>
                      <div className="mt-4 space-y-2 text-sm text-gray-500">
                        <div className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-[18px] mt-0.5 text-[#ec5b13]">medical_services</span>
                          <span>{speaker.report_title_vn}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-[18px] mt-0.5 text-[#ec5b13]">location_on</span>
                          <span>{speaker.country || 'Việt Nam'} <span className="ml-2 inline-block rounded-full bg-[#f8f6f6] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#9a4c6c]">{speaker.speaker_type}</span></span>
                        </div>
                      </div>
                      <button className="mt-5 w-full rounded-lg bg-[#ec5b13] py-2.5 font-bold text-white transition-colors hover:bg-[#d6520d]">
                        Xem Profile
                      </button>
                    </div>
                  </Link>
                </FadeSection>
              ))}
            </div>

            <div className="mt-12 flex items-center justify-center gap-2">
              <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white transition-colors hover:border-[#ec5b13] hover:text-[#ec5b13]"><span className="material-symbols-outlined">chevron_left</span></button>
              <button className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#ec5b13] font-bold text-white">1</button>
              <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white transition-colors hover:border-[#ec5b13] hover:text-[#ec5b13]">2</button>
              <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white transition-colors hover:border-[#ec5b13] hover:text-[#ec5b13]">3</button>
              <span className="px-2 text-gray-400">...</span>
              <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white transition-colors hover:border-[#ec5b13] hover:text-[#ec5b13]">12</button>
              <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white transition-colors hover:border-[#ec5b13] hover:text-[#ec5b13]"><span className="material-symbols-outlined">chevron_right</span></button>
            </div>
          </>
        )}
      </main>

      <footer className="mt-20 bg-[#221610] px-4 pb-8 pt-16 text-white md:px-20">
        <div className="mx-auto max-w-[1280px]">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-4 mb-16">
            <div>
              <div className="mb-6 flex items-center gap-3">
                <div className="size-8 rounded-full bg-[#e6a1ff] text-[#1e0f24] flex items-center justify-center font-black">VS</div>
                <h2 className="text-2xl font-bold tracking-tight">VSAPS</h2>
              </div>
              <p className="mb-6 text-sm leading-relaxed text-gray-400">Hội Phẫu thuật Tạo hình Thẩm mỹ Việt Nam là tổ chức nghề nghiệp hàng đầu của các bác sĩ chuyên khoa phẫu thuật thẩm mỹ tại Việt Nam.</p>
            </div>
            <div>
              <h4 className="mb-6 text-lg font-bold">Liên kết nhanh</h4>
              <ul className="space-y-4 text-sm text-gray-400">
                <li><a className="transition-colors hover:text-white" href="#/">Trang chủ</a></li>
                <li><a className="transition-colors hover:text-white" href="#/speakers-list">Danh sách báo cáo viên</a></li>
                <li><a className="transition-colors hover:text-white" href="#/register-delegate">Sự kiện khoa học</a></li>
                <li><a className="transition-colors hover:text-white" href="#/login">Tài khoản</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-6 text-lg font-bold">Liên hệ</h4>
              <ul className="space-y-4 text-sm text-gray-400">
                <li className="flex gap-3"><span className="material-symbols-outlined text-[#e6a1ff]">location_on</span><span>786 Nguyễn Kiệm, Gò Vấp, TP.HCM</span></li>
                <li className="flex gap-3"><span className="material-symbols-outlined text-[#e6a1ff]">phone</span><span>(028) 3895 4941</span></li>
                <li className="flex gap-3"><span className="material-symbols-outlined text-[#e6a1ff]">email</span><span>vsapsevents@gmail.com</span></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-6 text-lg font-bold">Vị trí</h4>
              <div className="relative h-40 w-full overflow-hidden rounded-lg bg-gray-800">
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="rounded bg-[#e6a1ff] px-3 py-1 text-xs font-bold text-[#1e0f24]">Xem bản đồ</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs text-gray-500 md:flex-row">
            <p>© 2024 VSAPS. Bảo lưu mọi quyền.</p>
            <div className="flex gap-6">
              <a className="hover:text-white" href="#">Điều khoản sử dụng</a>
              <a className="hover:text-white" href="#">Chính sách bảo mật</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicSpeakers;
