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

      <section className="bg-academic-navy pb-10 pt-6 text-white">
        <div className="mx-auto max-w-[1280px] px-4 md:px-8">
          <FadeSection>
            <div className="flex flex-wrap justify-between gap-3">
              <div className="max-w-2xl">
                <h1 className="text-4xl font-black leading-tight tracking-[-0.033em] md:text-5xl">Báo cáo viên VSAPS 2026</h1>
                <p className="mt-3 text-[#bd8dce] text-base font-normal leading-normal">Kết nối với các chuyên gia phẫu thuật tạo hình hàng đầu Việt Nam.</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 w-full md:w-auto">
                {stats.map((s) => (
                  <div key={s.label} className="rounded-xl border border-[#40204b] bg-white/5 px-4 py-3 text-center min-w-32">
                    <div className="text-2xl font-black text-white">{s.value}</div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#bd8dce]">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </FadeSection>
        </div>
      </section>

      <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-8">
        <FadeSection>
          <section className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-gray-700">Tìm kiếm</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                  <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Tên bác sĩ..." className="w-full rounded-lg border border-gray-200 py-3 pl-10 pr-4 outline-none transition-all focus:border-[#ec5b13] focus:ring-1 focus:ring-[#ec5b13]" />
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
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredSpeakers.map((speaker) => (
              <FadeSection key={speaker.id}>
                <Link to={`/reports/${speaker.id}`} className="group block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                  <div className="aspect-[4/5] bg-gray-100">
                    <img src={speaker.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(speaker.full_name)}&background=random`} alt={speaker.full_name} className="h-full w-full object-contain bg-white transition-transform duration-500 group-hover:scale-105" />
                  </div>
                  <div className="p-4">
                    <span className={`inline-flex rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${speakerTypeLabel(speaker.speaker_type) === 'Khách mời quốc tế' ? 'bg-orange-100 text-[#ec5b13]' : 'bg-gray-100 text-gray-600'}`}>
                      {speakerTypeLabel(speaker.speaker_type)}
                    </span>
                    <h3 className="mt-3 text-lg font-bold text-[#221610] group-hover:text-[#ec5b13]">{speaker.academic_rank} {speaker.full_name}</h3>
                    <p className="mt-1 text-sm font-medium text-gray-600">{speaker.workplace}</p>
                    <div className="mt-4 space-y-2 text-sm text-gray-500">
                      <div className="flex items-start gap-2">
                        <span className="material-symbols-outlined mt-0.5 text-[18px] text-[#ec5b13]">medical_services</span>
                        <span className="line-clamp-2">{speaker.report_title_vn}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="material-symbols-outlined mt-0.5 text-[18px] text-[#ec5b13]">location_on</span>
                        <span>{speaker.country || 'Việt Nam'}</span>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between pt-3 text-sm font-semibold text-[#ec5b13] border-t border-gray-100">
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
