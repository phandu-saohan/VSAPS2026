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

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, visible };
};

const FadeSection: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  const { ref, visible } = useFadeIn<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`fade-up ${visible ? 'visible' : ''} ${className}`}
    >
      {children}
    </div>
  );
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

      if (error) {
        console.error('Error fetching speakers:', error);
      } else {
        setSpeakers(data || []);
      }
      setLoading(false);
    };

    fetchSpeakers();
  }, []);

  const filteredSpeakers = useMemo(() => {
    return speakers.filter((s) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        s.full_name.toLowerCase().includes(term) ||
        s.workplace.toLowerCase().includes(term) ||
        s.academic_rank.toLowerCase().includes(term) ||
        s.report_title_vn.toLowerCase().includes(term);
      const matchesType = filterType === 'All' || s.speaker_type === filterType;
      return matchesSearch && matchesType;
    });
  }, [speakers, searchTerm, filterType]);

  const stats = useMemo(() => {
    const chairs = speakers.filter((s) => s.speaker_type.includes('Chủ tọa')).length;
    const reports = speakers.filter((s) => s.speaker_type.includes('Báo cáo viên')).length;
    return [
      { label: 'Diễn giả', value: speakers.length },
      { label: 'Chủ tọa', value: chairs },
      { label: 'Báo cáo viên', value: reports },
    ];
  }, [speakers]);

  const speakerTypes = ['All', 'Chủ tọa', 'Báo cáo viên', 'Chủ tọa/Báo cáo viên'];

  return (
    <div className="min-h-screen bg-surface text-gray-800">
      <header className="sticky top-0 z-50 border-b border-border-subtle bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <a href="#/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-lg font-black text-white shadow-premium">
              VS
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-academic-grey">VSAPS 2026</p>
              <p className="text-sm font-bold text-academic-navy">Danh sách diễn giả</p>
            </div>
          </a>
          <nav className="hidden items-center gap-6 md:flex">
            <a href="#/" className="nav-link-premium text-sm font-medium text-academic-grey hover:text-academic-navy">Trang chủ</a>
            <a href="#/speakers-list" className="nav-link-premium text-sm font-semibold text-secondary">Diễn giả</a>
            <a href="#/register-delegate" className="nav-link-premium text-sm font-medium text-academic-grey hover:text-academic-navy">Đăng ký</a>
            <a href="#/login" className="btn-premium btn-secondary-premium shadow-premium">Đăng nhập</a>
          </nav>
          <button onClick={() => setMenuOpen((v) => !v)} className="md:hidden rounded-xl border border-border-subtle bg-white px-3 py-2 text-sm font-semibold text-academic-navy shadow-sm">
            Menu
          </button>
        </div>
        <div className={`md:hidden overflow-hidden border-t border-border-subtle bg-white transition-all duration-300 ${menuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-4 py-4 space-y-3">
            <a className="block rounded-2xl bg-surface px-4 py-3 text-sm font-semibold text-academic-navy" href="#/">Trang chủ</a>
            <a className="block rounded-2xl bg-surface px-4 py-3 text-sm font-semibold text-secondary" href="#/speakers-list">Diễn giả</a>
            <a className="block rounded-2xl bg-surface px-4 py-3 text-sm font-semibold text-academic-navy" href="#/register-delegate">Đăng ký</a>
            <a className="btn-premium btn-secondary-premium w-full" href="#/login">Đăng nhập</a>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-academic-navy text-white">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-secondary blur-3xl" />
            <div className="absolute right-0 top-24 h-80 w-80 rounded-full bg-cyan-400 blur-3xl" />
          </div>
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-20">
            <FadeSection className="relative z-10">
              <p className="mb-4 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-white/90">
                Scientific Committee
              </p>
              <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                Đội ngũ diễn giả & chuyên gia VSAPS 2026
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/85 sm:text-base">
                Khám phá danh sách các chuyên gia, chủ tọa và báo cáo viên tham gia chương trình khoa học của hội nghị.
              </p>
            </FadeSection>

            <FadeSection className="relative z-10">
              <div className="glass-effect rounded-3xl p-5 shadow-2xl lg:ml-auto lg:max-w-md">
                <p className="text-sm font-bold text-academic-navy">Tìm nhanh diễn giả</p>
                <p className="mt-1 text-sm text-academic-grey">Theo tên, đơn vị, học hàm hoặc tên bài báo cáo.</p>
                <div className="mt-5 space-y-4">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-academic-grey">Từ khóa</label>
                    <input
                      type="text"
                      placeholder="Nhập tên hoặc đơn vị..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full rounded-2xl border border-border-subtle bg-white px-4 py-3 text-sm text-gray-800 shadow-sm outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/15"
                    />
                  </div>
                  <div>
                    <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.2em] text-academic-grey">Phân loại</label>
                    <div className="flex flex-wrap gap-2">
                      {speakerTypes.map((t) => (
                        <button
                          key={t}
                          onClick={() => setFilterType(t)}
                          className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${filterType === t ? 'btn-secondary-premium shadow-premium' : 'bg-white text-academic-grey ring-1 ring-border-subtle hover:bg-surface'}`}
                        >
                          {t === 'All' ? 'Tất cả' : t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <a href="#/register-delegate" className="btn-premium btn-primary-premium shadow-premium w-full">
                    Đăng ký tham dự
                  </a>
                </div>
              </div>
            </FadeSection>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
          <FadeSection className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-academic-navy sm:text-3xl">Danh sách chuyên gia</h2>
              <p className="mt-2 text-sm text-academic-grey">{loading ? 'Đang tải dữ liệu...' : `${filteredSpeakers.length} kết quả phù hợp`}</p>
            </div>
          </FadeSection>

          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse overflow-hidden card-premium">
                  <div className="h-52 bg-gray-200" />
                  <div className="space-y-3 p-5">
                    <div className="h-4 w-24 rounded bg-gray-200" />
                    <div className="h-6 w-3/4 rounded bg-gray-200" />
                    <div className="h-4 w-1/2 rounded bg-gray-200" />
                    <div className="h-10 rounded-2xl bg-gray-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredSpeakers.length === 0 ? (
            <FadeSection>
              <div className="card-premium border-dashed px-6 py-20 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f6e8ef] text-2xl text-secondary">✦</div>
                <h3 className="text-xl font-black text-academic-navy">Không tìm thấy kết quả phù hợp</h3>
                <p className="mt-2 text-sm text-academic-grey">Hãy thử đổi từ khóa hoặc bộ lọc để tìm diễn giả khác.</p>
              </div>
            </FadeSection>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredSpeakers.map((speaker) => (
                <FadeSection key={speaker.id}>
                  <Link
                    to={`/speakers-list`}
                    className="group overflow-hidden card-premium hover:ring-secondary/20"
                  >
                    <div className="relative h-56 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 sm:h-56">
                      <img
                        src={speaker.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(speaker.full_name)}&background=random`}
                        alt={speaker.full_name}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-academic-navy/90 via-academic-navy/10 to-transparent" />
                      <div className="absolute left-4 top-4 flex gap-2">
                        <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur-md">
                          {speaker.speaker_type}
                        </span>
                      </div>
                      <div className="absolute bottom-4 left-4 right-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">{speaker.academic_rank}</p>
                        <h3 className="mt-1 text-2xl font-black leading-tight text-white">{speaker.full_name}</h3>
                      </div>
                    </div>

                    <div className="space-y-3 p-4">
                      <div className="flex items-center gap-3 text-xs text-academic-slate">
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#f6e8ef] text-secondary">
                          <span className="material-symbols-outlined text-[18px]">apartment</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-academic-navy">{speaker.workplace}</p>
                          <div className="mt-1 flex items-center gap-2 text-[11px] text-academic-grey">
                            <img
                              src={`https://flagcdn.com/w20/${getCountryCode(speaker.country)}.png`}
                              className="h-3.5 w-5 rounded-sm object-cover ring-1 ring-border-subtle"
                              alt={speaker.country || ''}
                            />
                            <span>{speaker.country || 'Việt Nam'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl bg-surface p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-academic-grey">Đề tài</p>
                        <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-academic-navy italic">“{speaker.report_title_vn}”</p>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-xs">
                        <span className="font-semibold text-academic-grey">Xem thông tin</span>
                        <span className="inline-flex items-center gap-1 font-bold text-secondary transition-transform group-hover:translate-x-1">
                          Mở
                          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </span>
                      </div>
                    </div>
                  </Link>
                </FadeSection>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-border-subtle bg-academic-navy text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-3 lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-lg font-black text-white">VS</div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-white/50">VSAPS 2026</p>
                <p className="text-xl font-black">Scientific Forum</p>
              </div>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-7 text-white/65">Hội Phẫu thuật Tạo hình Thẩm mỹ Việt Nam. 11–14 tháng 12, 2026 tại TP.HCM.</p>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-[#f7b2d0]">Liên kết</h4>
            <ul className="mt-4 space-y-3 text-sm text-white/65">
              <li><a href="#/" className="transition-colors hover:text-white">Trang chủ</a></li>
              <li><a href="#/speakers-list" className="transition-colors hover:text-white">Đội ngũ chuyên gia</a></li>
              <li><a href="#/register-delegate" className="transition-colors hover:text-white">Đăng ký tham dự</a></li>
              <li><a href="#/login" className="transition-colors hover:text-white">Cổng đăng nhập</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-[#f7b2d0]">Liên hệ</h4>
            <p className="mt-4 text-sm leading-7 text-white/65">
              vsapsevents@gmail.com<br />
              +84 (28) 3895 4941<br /><br />
              786 Nguyễn Kiệm, Gò Vấp, TP.HCM
            </p>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/30">© 2026 VSAPS Conference. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicSpeakers;
