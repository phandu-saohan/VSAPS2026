import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Speaker, Status } from '../types';
import LandingHeader from '../components/LandingHeader';

const useFadeIn = <T extends HTMLElement,>() => {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.12 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
};

const FadeIn: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  const { ref, visible } = useFadeIn<HTMLDivElement>();
  return (
    <div ref={ref} className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${className}`}>
      {children}
    </div>
  );
};

const ReportDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [speaker, setSpeaker] = useState<Speaker | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchItem = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('speakers').select('*').eq('id', Number(id)).eq('status', Status.APPROVED).single();
      if (!error) setSpeaker(data);
      setLoading(false);
    };
    fetchItem();
  }, [id]);

  const keywords = useMemo(() => speaker?.keywords?.split(',').map((k) => k.trim()).filter(Boolean) || [], [speaker]);

  return (
    <div className="min-h-screen bg-[#f8f6f6] text-[#221610]">
      <LandingHeader active="other" showSearch searchValue={searchTerm} onSearchChange={setSearchTerm} />

      <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-8">
        <FadeIn className="mb-6 text-sm text-[#9a4c6c]">
          <Link to="/" className="hover:text-[#ec5b13]">Trang chủ</Link>
          <span className="mx-2">/</span>
          <Link to="/speakers-list" className="hover:text-[#ec5b13]">Danh sách báo cáo viên</Link>
          <span className="mx-2">/</span>
          <span className="text-[#221610]">Chi tiết báo cáo</span>
        </FadeIn>

        {loading ? (
          <div className="grid place-items-center py-24"><div className="h-12 w-12 animate-spin rounded-full border-4 border-[#ec5b13]/20 border-t-[#ec5b13]" /></div>
        ) : !speaker ? (
          <FadeIn>
            <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
              <p className="text-lg font-bold">Không tìm thấy bài báo cáo</p>
              <Link to="/speakers-list" className="mt-6 inline-flex rounded-lg bg-[#ec5b13] px-4 py-2 font-bold text-white">Quay lại danh sách</Link>
            </div>
          </FadeIn>
        ) : (
          <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
            <article className="lg:col-span-8 space-y-6">
              <FadeIn>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-[#ec5b13]/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#ec5b13]">{speaker.category || 'Phẫu thuật tạo hình'}</span>
                    <span className="rounded-full border border-[#e6a1ff]/30 bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#9a4c6c]">{speaker.speaker_type === 'Báo cáo viên' ? 'Báo cáo viên trong nước' : 'Khách mời quốc tế'}</span>
                  </div>
                  <h1 className="text-3xl font-black tracking-[-0.033em] text-[#1e0f24] md:text-4xl lg:text-[42px]">{speaker.report_title_vn}</h1>
                </div>
              </FadeIn>

              <FadeIn>
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <img src={speaker.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(speaker.full_name)}&background=random`} alt={speaker.full_name} className="h-12 w-12 rounded-full object-cover" />
                      <div>
                        <p className="text-sm font-bold text-[#1e0f24]">{speaker.academic_rank} {speaker.full_name}</p>
                        <p className="text-xs text-[#9a4c6c]">{speaker.workplace}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-[#f8f6f6] px-3 py-1 font-semibold text-[#221610]">{speaker.speaker_type}</span>
                      <span className="rounded-full bg-[#f8f6f6] px-3 py-1 font-semibold text-[#221610]">{speaker.country || 'Việt Nam'}</span>
                    </div>
                  </div>
                </div>
              </FadeIn>

              {speaker.abstract_text && (
                <FadeIn>
                  <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center gap-3 border-b border-gray-100 pb-3">
                      <span className="material-symbols-outlined text-[#ec5b13]">subject</span>
                      <h2 className="text-lg font-black text-[#1e0f24]">Tóm tắt</h2>
                    </div>
                    <div className="prose max-w-none prose-p:leading-8 prose-p:text-[#221610] prose-headings:text-[#1e0f24]">
                      <div dangerouslySetInnerHTML={{ __html: speaker.abstract_text }} />
                    </div>
                  </section>
                </FadeIn>
              )}

              {speaker.abstract_text_en && (
                <FadeIn>
                  <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center gap-3 border-b border-gray-100 pb-3">
                      <span className="material-symbols-outlined text-[#ec5b13]">language</span>
                      <h2 className="text-lg font-black text-[#1e0f24]">Abstract (English)</h2>
                    </div>
                    <div className="prose max-w-none prose-p:leading-8 prose-p:text-[#221610] prose-headings:text-[#1e0f24]">
                      <div dangerouslySetInnerHTML={{ __html: speaker.abstract_text_en }} />
                    </div>
                  </section>
                </FadeIn>
              )}

              {keywords.length > 0 && (
                <FadeIn>
                  <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center gap-3 border-b border-gray-100 pb-3">
                      <span className="material-symbols-outlined text-[#ec5b13]">sell</span>
                      <h2 className="text-lg font-black text-[#1e0f24]">Từ khóa</h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {keywords.map((kw) => <span key={kw} className="rounded-full border border-gray-200 bg-[#f8f6f6] px-3 py-1.5 text-sm font-semibold text-[#221610]">{kw}</span>)}
                    </div>
                  </section>
                </FadeIn>
              )}
            </article>

            <aside className="lg:col-span-4 space-y-6">
              <FadeIn>
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <div className="relative aspect-[4/5] bg-white">
                    <img src={speaker.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(speaker.full_name)}&background=random`} alt={speaker.full_name} className="h-full w-full object-contain bg-white" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1e0f24]/10 via-transparent to-transparent" />
                  </div>
                  <div className="space-y-4 p-5">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9a4c6c]">Bài báo cáo</p>
                      <p className="mt-1 text-sm font-bold text-[#1e0f24]">{speaker.report_title_vn}</p>
                    </div>
                    {speaker.report_title_en && <div><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9a4c6c]">English title</p><p className="mt-1 text-sm italic text-[#9a4c6c]">{speaker.report_title_en}</p></div>}
                  </div>
                </div>
              </FadeIn>

              <FadeIn>
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9a4c6c]">Thông tin nhanh</p>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3"><span className="text-[#9a4c6c]">Học hàm</span><span className="font-semibold text-[#1e0f24]">{speaker.academic_rank || '—'}</span></div>
                    <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3"><span className="text-[#9a4c6c]">Vai trò</span><span className="font-semibold text-[#1e0f24]">{speaker.speaker_type}</span></div>
                    <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3"><span className="text-[#9a4c6c]">Quốc gia</span><span className="font-semibold text-[#1e0f24]">{speaker.country || 'Việt Nam'}</span></div>
                  </div>
                </div>
              </FadeIn>

              <FadeIn>
                <div className="rounded-xl bg-[#1e0f24] p-6 text-white shadow-sm">
                  <p className="text-sm font-bold">Điều hướng</p>
                  <Link to="/speakers-list" className="mt-4 block rounded-lg bg-[#e6a1ff] px-4 py-2.5 text-center font-bold text-[#1e0f24]">Quay lại danh sách diễn giả</Link>
                </div>
              </FadeIn>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
};

export default ReportDetail;
