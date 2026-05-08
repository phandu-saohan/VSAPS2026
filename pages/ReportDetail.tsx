import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Speaker } from '../types';

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
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
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

const Header = () => (
  <header className="sticky top-0 z-50 border-b border-border-subtle bg-white/90 backdrop-blur-xl">
    <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
      <Link to="/" className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-lg font-black text-white shadow-premium">VS</div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-academic-grey">VSAPS 2026</p>
          <p className="text-sm font-bold text-academic-navy">Chi tiết báo cáo</p>
        </div>
      </Link>
      <nav className="hidden items-center gap-6 md:flex">
        <Link to="/" className="nav-link-premium text-sm font-medium text-academic-grey hover:text-academic-navy">Trang chủ</Link>
        <Link to="/speakers-list" className="nav-link-premium text-sm font-medium text-academic-grey hover:text-academic-navy">Diễn giả</Link>
        <Link to="/register-delegate" className="nav-link-premium text-sm font-medium text-academic-grey hover:text-academic-navy">Đăng ký</Link>
        <Link to="/login" className="btn-premium btn-secondary-premium shadow-premium">Đăng nhập</Link>
      </nav>
    </div>
  </header>
);

const ReportDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [speaker, setSpeaker] = useState<Speaker | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReportDetails = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('speakers').select('*').eq('id', Number(id)).single();
      if (!error && data) setSpeaker(data);
      setLoading(false);
    };

    fetchReportDetails();
  }, [id]);

  return (
    <div className="min-h-screen bg-surface text-gray-800">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <Link to="/speakers-list" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-academic-grey transition-colors hover:text-secondary">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Quay lại danh sách
        </Link>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-secondary/20 border-t-secondary" />
          </div>
        ) : !speaker ? (
          <FadeIn>
            <div className="card-premium p-10 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f6e8ef] text-2xl text-secondary">!</div>
              <h2 className="text-2xl font-black text-academic-navy">Không tìm thấy bài báo cáo</h2>
              <p className="mt-2 text-sm text-academic-grey">Báo cáo này không tồn tại hoặc đã bị gỡ.</p>
            </div>
          </FadeIn>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[360px_1fr] xl:grid-cols-[400px_1fr]">
            <FadeIn>
              <aside className="sticky top-24 space-y-6 self-start">
                <div className="card-premium overflow-hidden">
                  <div className="relative h-80 bg-academic-navy">
                    <img
                      src={speaker.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(speaker.full_name)}&background=random`}
                      alt={speaker.full_name}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-academic-navy/90 via-academic-navy/20 to-transparent" />
                    <div className="absolute left-4 top-4">
                      <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur-md">
                        {speaker.speaker_type}
                      </span>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">{speaker.academic_rank}</p>
                      <h1 className="mt-1 text-3xl font-black leading-tight">{speaker.full_name}</h1>
                    </div>
                  </div>

                  <div className="space-y-4 p-5">
                    <div className="flex items-start gap-3 rounded-2xl bg-surface p-4">
                      <span className="material-symbols-outlined mt-0.5 text-secondary">apartment</span>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-academic-grey">Đơn vị công tác</p>
                        <p className="mt-1 text-sm font-semibold text-academic-navy">{speaker.workplace}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-2xl bg-surface p-4">
                      <img
                        src={`https://flagcdn.com/w40/${getCountryCode(speaker.country)}.png`}
                        className="h-6 w-8 rounded-sm object-cover ring-1 ring-border-subtle"
                        alt={speaker.country || ''}
                      />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-academic-grey">Quốc gia</p>
                        <p className="text-sm font-semibold text-academic-navy">{speaker.country || 'Việt Nam'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3">
                  {speaker.abstract_file_url && (
                    <a href={speaker.abstract_file_url} target="_blank" rel="noopener noreferrer" className="btn-premium btn-secondary-premium flex items-center justify-between">
                      <span>File tóm tắt</span>
                      <span className="material-symbols-outlined text-[18px]">download</span>
                    </a>
                  )}
                  {speaker.report_file_url && (
                    <a href={speaker.report_file_url} target="_blank" rel="noopener noreferrer" className="btn-premium bg-academic-navy text-white hover:brightness-110 flex items-center justify-between">
                      <span>File báo cáo đầy đủ</span>
                      <span className="material-symbols-outlined text-[18px]">download</span>
                    </a>
                  )}
                </div>
              </aside>
            </FadeIn>

            <div className="space-y-8">
              <FadeIn>
                <section className="card-premium overflow-hidden">
                  <div className="bg-gradient-to-br from-academic-navy via-[#0b2a86] to-secondary p-6 text-white sm:p-8 lg:p-10">
                    <div className="mb-4 flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white/90">Báo cáo khoa học</span>
                      <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white/90">VSAPS 2026</span>
                    </div>
                    <h2 className="max-w-4xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">{speaker.report_title_vn}</h2>
                    {speaker.report_title_en && <p className="mt-4 max-w-4xl text-sm leading-7 text-white/85 sm:text-base italic">{speaker.report_title_en}</p>}
                  </div>
                </section>
              </FadeIn>

              <FadeIn>
                <section className="grid gap-6 md:grid-cols-3">
                  {[
                    { label: 'Học hàm', value: speaker.academic_rank || '—' },
                    { label: 'Loại phiên', value: speaker.speaker_type || '—' },
                    { label: 'Quốc gia', value: speaker.country || 'Việt Nam' },
                  ].map((item) => (
                    <div key={item.label} className="card-premium p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-academic-grey">{item.label}</p>
                      <p className="mt-2 text-sm font-bold text-academic-navy">{item.value}</p>
                    </div>
                  ))}
                </section>
              </FadeIn>

              <FadeIn>
                <section className="card-premium p-6 sm:p-8">
                  <div className="mb-6 flex items-center gap-3 border-b border-border-subtle pb-4">
                    <span className="material-symbols-outlined text-2xl text-secondary">article</span>
                    <h3 className="text-xl font-black text-academic-navy sm:text-2xl">Tóm tắt báo cáo</h3>
                  </div>
                  {speaker.abstract_text ? (
                    <div
                      className="prose prose-slate max-w-none prose-headings:text-academic-navy prose-a:text-secondary prose-strong:text-academic-navy prose-blockquote:border-l-secondary prose-blockquote:text-academic-slate"
                      dangerouslySetInnerHTML={{ __html: speaker.abstract_text }}
                    />
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border-subtle bg-surface p-8 text-center text-academic-grey">
                      Nội dung tóm tắt chưa được cập nhật.
                    </div>
                  )}
                </section>
              </FadeIn>

              {speaker.abstract_text_en && (
                <FadeIn>
                  <section className="card-premium p-6 sm:p-8">
                    <div className="mb-6 flex items-center gap-3 border-b border-border-subtle pb-4">
                      <span className="material-symbols-outlined text-2xl text-secondary">language</span>
                      <h3 className="text-xl font-black text-academic-navy sm:text-2xl">Abstract (English)</h3>
                    </div>
                    <div
                      className="prose prose-slate max-w-none prose-headings:text-academic-navy prose-a:text-secondary prose-strong:text-academic-navy prose-blockquote:border-l-secondary prose-blockquote:text-academic-slate"
                      dangerouslySetInnerHTML={{ __html: speaker.abstract_text_en }}
                    />
                  </section>
                </FadeIn>
              )}

              {speaker.keywords && (
                <FadeIn>
                  <section className="card-premium p-6 sm:p-8">
                    <div className="mb-6 flex items-center gap-3 border-b border-border-subtle pb-4">
                      <span className="material-symbols-outlined text-2xl text-secondary">sell</span>
                      <h3 className="text-xl font-black text-academic-navy sm:text-2xl">Từ khóa liên quan</h3>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {speaker.keywords.split(',').map((kw, i) => (
                        <span key={i} className="rounded-full border border-border-subtle bg-surface px-4 py-2 text-sm font-semibold text-academic-navy">
                          #{kw.trim()}
                        </span>
                      ))}
                    </div>
                  </section>
                </FadeIn>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="mt-12 border-t border-border-subtle bg-academic-navy text-white">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/30">© 2026 VSAPS Conference. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default ReportDetail;
