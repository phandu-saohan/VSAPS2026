import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Speaker, Status } from '../types';
import { Link } from 'react-router-dom';
import LandingHeader from '../components/LandingHeader';

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

  useEffect(() => {
    const fetchSpeakers = async () => {
      const { data, error } = await supabase.from('speakers').select('*').eq('status', Status.APPROVED).order('full_name', { ascending: true });
      if (!error) setSpeakers(data || []);
      setLoading(false);
    };
    fetchSpeakers();
  }, []);

  const filteredSpeakers = useMemo(() => speakers.filter((s) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = s.full_name.toLowerCase().includes(term) || s.workplace.toLowerCase().includes(term) || s.academic_rank.toLowerCase().includes(term);
    const matchesType = filterType === 'All' ? true : filterType === 'Khách mời quốc tế'
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
      <LandingHeader active="speakers" />

      <section className="bg-academic-navy pb-14 pt-10 text-white">
        <div className="mx-auto max-w-[1280px] px-4 md:px-8">
          <FadeSection>
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div className="max-w-2xl">
                <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/85">
                  Scientific Committee
                </p>
                <h1 className="mt-4 text-4xl font-black leading-tight tracking-[-0.033em] text-white md:text-5xl">
                  Báo cáo viên VSAPS 2026
                </h1>
                <p className="mt-4 max-w-xl text-base font-normal leading-7 text-white/85">
                  Kết nối với các chuyên gia phẫu thuật tạo hình hàng đầu Việt Nam.
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
                <p className="text-sm font-bold text-white">Tìm kiếm nhanh</p>
                <p className="mt-1 text-sm text-white/70">Theo tên, đơn vị, học hàm hoặc vai trò báo cáo.</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-white/55">Từ khóa</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/45">search</span>
                      <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Nhập tên báo cáo viên..."
                        className="w-full rounded-2xl border border-white/10 bg-white px-4 py-3 pl-10 text-sm text-gray-800 outline-none transition focus:border-[#f7b2d0] focus:ring-4 focus:ring-[#f7b2d0]/15"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-white/55">Phân loại</label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#f7b2d0] focus:ring-4 focus:ring-[#f7b2d0]/15"
                    >
                      {speakerTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button onClick={() => { setSearchTerm(''); setFilterType('All'); }} className="w-full rounded-2xl bg-secondary px-4 py-3 font-bold text-white transition-colors hover:brightness-110">
                      Đặt lại
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </FadeSection>
        </div>
      </section>

      <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-8">
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
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredSpeakers.map((speaker) => (
              <FadeSection key={speaker.id}>
                <Link to={`/reports/${speaker.id}`} className="group block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                  <div className="aspect-square bg-gray-100">
                    <img src={speaker.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(speaker.full_name)}&background=random`} alt={speaker.full_name} className="h-full w-full object-contain bg-white transition-transform duration-500 group-hover:scale-105" />
                  </div>
                  <div className="p-3.5">
                    <span className={`inline-flex rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${speakerTypeLabel(speaker.speaker_type) === 'Khách mời quốc tế' ? 'bg-[#f7b2d0]/20 text-secondary' : 'bg-gray-100 text-gray-600'}`}>
                      {speakerTypeLabel(speaker.speaker_type)}
                    </span>
                    <h3 className="mt-2.5 text-[15px] font-bold leading-6 text-secondary group-hover:text-secondary line-clamp-2">
                      {speaker.academic_rank} {speaker.full_name}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-gray-600 line-clamp-1">{speaker.workplace}</p>
                    <div className="mt-3 space-y-1.5 text-sm text-gray-500">
                      <div className="flex items-start gap-2">
                        <span className="material-symbols-outlined mt-0.5 text-[18px] text-secondary">medical_services</span>
                        <span className="line-clamp-2">{speaker.report_title_vn}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <img
                          src={`https://flagcdn.com/w20/${getCountryCode(speaker.country)}.png`}
                          alt={speaker.country || 'Việt Nam'}
                          className="h-4 w-6 rounded-sm object-cover ring-1 ring-gray-200"
                        />
                        <span>{speaker.country || 'Việt Nam'}</span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2.5 text-sm font-semibold text-secondary">
                      <span>Xem chi tiết</span>
                      <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-1">arrow_forward</span>
                    </div>
                  </div>
                </Link>
              </FadeSection>
            ))}
          </div>
        )}
      </main>

      <footer className="mt-20 bg-[#221610] px-4 pb-8 pt-16 text-white md:px-20">
        <div className="mx-auto max-w-[1280px]">
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
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
