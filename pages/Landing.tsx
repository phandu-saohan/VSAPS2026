import React, { useState, useEffect, useRef } from 'react';
import { supabase, normalizePublicStorageUrl } from '../supabaseClient';
import { DEFAULT_LANDING_CONFIG, LandingConfig } from '../types/landing';
import LandingHeader from '../components/LandingHeader';

interface SponsorItem {
  id: number;
  name: string;
  sponsorship_package: 'Kim cương' | 'Vàng' | 'Bạc' | 'Đồng' | 'Khác';
  logo_url?: string | null;
  status: string;
}

/* ─── Animated stat number ────────────────────────────────────────────────── */
const useInView = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } }, { threshold: 0.15 });
    obs.observe(el); return () => obs.disconnect();
  }, []);
  return { ref, inView };
};

const useCount = (targetStr: string | number, run: boolean) => {
  const [v, setV] = useState(0);
  const target = typeof targetStr === 'string' ? parseInt(targetStr.replace(/\D/g, '')) || 0 : targetStr;
  useEffect(() => {
    if (!run) return;
    let c = 0; const step = Math.max(1, Math.floor(target / 40));
    const t = setInterval(() => { c = Math.min(c + step, target); setV(c); if (c >= target) clearInterval(t); }, 30);
    return () => clearInterval(t);
  }, [target, run]);
  return v;
};

const AnimStat: React.FC<{ value: string; label: string }> = ({ value, label }) => {
  const { ref, inView } = useInView();
  const v = useCount(value, inView);
  const suffix = String(value).replace(/\d+/g, '') || '+';
  return (
    <div ref={ref} className="text-center space-y-1">
      <p className="text-4xl font-extrabold text-secondary">{v}{suffix}</p>
      <p className="text-[10px] font-bold text-academic-grey uppercase tracking-tight">{label}</p>
    </div>
  );
};

const FadeSection: React.FC<{ children: React.ReactNode; className?: string; id?: string }> = ({ children, className = '', id }) => {
  const { ref, inView } = useInView();
  return (
    <div ref={ref} id={id} className={`fade-up ${inView ? 'visible' : ''} ${className}`}>
      {children}
    </div>
  );
};

export default function LandingPage() {
  const [cfg, setCfg] = useState<LandingConfig>(DEFAULT_LANDING_CONFIG);
  const [programTab, setProgramTab] = useState<'day1' | 'day2' | 'day3'>('day1');
  const [menuOpen, setMenuOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [sponsors, setSponsors] = useState<SponsorItem[]>([]);
  
  const speakerSliderRef = useRef<HTMLDivElement>(null);
  const scrollSpeakers = (dir: 'left' | 'right') => {
    if (speakerSliderRef.current) {
      const scrollAmount = 350;
      speakerSliderRef.current.scrollBy({ left: dir === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  
  // Global fade-up observer
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
        }
      });
    }, { threshold: 0.15 });
    document.querySelectorAll('.fade-up').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  // Countdown logic
  const [timeLeft, setTimeLeft] = useState([0,0,0,0]); // d, h, m, s
  
  useEffect(() => {
    supabase.from('settings').select('landing_config').eq('id', 1).single()
      .then(({ data }) => { if (data?.landing_config) setCfg(p => ({ ...p, ...data.landing_config })); });
    supabase.from('sponsors').select('id,name,sponsorship_package,logo_url,status')
      .eq('status', 'Đã duyệt')
      .then(({ data }) => { if (data) setSponsors(data as SponsorItem[]); });
  }, []);

  useEffect(() => {
    const calc = () => {
      const d = new Date(cfg.event_date_iso).getTime() - Date.now();
      if (d <= 0) return [0, 0, 0, 0];
      return [
        Math.floor(d / 86400000),
        Math.floor((d % 86400000) / 3600000),
        Math.floor((d % 3600000) / 60000),
        Math.floor((d % 60000) / 1000),
      ];
    };
    setTimeLeft(calc());
    const i = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(i);
  }, [cfg.event_date_iso]);

  return (
    <div className="landing-wrapper relative">
      <style>{`
        .landing-wrapper .font-headline { font-family: 'Inter', sans-serif; }
        .landing-wrapper .font-body { font-family: 'Inter', sans-serif; }
        .landing-wrapper .text-primary { color: #061D5F !important; }
        .landing-wrapper .bg-primary { background-color: #061D5F !important; }
        .landing-wrapper .border-primary { border-color: #061D5F !important; }
        .landing-wrapper .text-secondary { color: #F95E8B !important; }
        .landing-wrapper .bg-secondary { background-color: #F95E8B !important; }
        .landing-wrapper .border-secondary { border-color: #F95E8B !important; }
        .landing-wrapper .text-academic-navy { color: #061D5F !important; }
        .landing-wrapper .bg-academic-navy { background-color: #061D5F !important; }
        .landing-wrapper .border-academic-navy { border-color: #061D5F !important; }
        .landing-wrapper .text-academic-slate { color: #334155 !important; }
        .landing-wrapper .bg-academic-slate { background-color: #334155 !important; }
        .landing-wrapper .text-academic-grey { color: #64748B !important; }
        .landing-wrapper .bg-surface { background-color: #F8FAFC !important; }
        .landing-wrapper .border-border-subtle { border-color: #E2E8F0 !important; }
        
        .landing-wrapper .hero-overlay {
          background: linear-gradient(to right, rgba(6,29,95,0.95) 0%, rgba(6,29,95,0.75) 100%);
        }
        .landing-wrapper .agenda-row:hover { background-color: #F1F5F9; }
        .landing-wrapper .flip-card {
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.12);
          backdrop-filter: blur(8px);
        }
        .landing-wrapper .nav-link::after {
          content: '';
          display: block;
          width: 0;
          height: 2px;
          background: #F95E8B;
          transition: width .25s;
        }
        .landing-wrapper .nav-link:hover::after { width: 100%; }
        .landing-wrapper .fade-up {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity .6s ease, transform .6s ease;
        }
        .landing-wrapper .fade-up.visible {
          opacity: 1;
          transform: translateY(0);
        }
        .landing-wrapper .hide-scrollbar::-webkit-scrollbar { display: none; }
        .landing-wrapper .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <LandingHeader active="home" />

{/*  ═══════════════════════ HERO ═══════════════════════  */}
<section className="relative bg-academic-navy py-10 lg:py-10 overflow-hidden border-b-4 border-secondary">
  {/*  BG Image  */}
  <div className="absolute inset-0 z-0">
    <div className="absolute inset-0 hero-overlay z-10"></div>
    <img alt="" aria-hidden="true"
      className="w-full h-full object-cover opacity-25 grayscale"
      src={normalizePublicStorageUrl(cfg.hero_image_url) || 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1600&q=80'}/>
  </div>

  <div className="relative z-20 max-w-7xl mx-auto px-6">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

      {/*  Left  */}
      <div className="max-xl fade-up visible">
        <p className="text-secondary font-bold tracking-[0.3em] text-xs uppercase mb-4">
          Hội nghị Khoa học Quốc tế Thường niên lần thứ 10
        </p>
        <h1 className="text-white text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter leading-none mb-4">
          VSAPS<br className="lg:hidden"/><span className="text-secondary">2026</span>
        </h1>
        <h2 className="text-white/70 text-base md:text-lg font-light tracking-wide mb-8 border-l-2 border-secondary pl-6">
          ĐẠI HỘI LẦN THỨ 3<br/>
          HỘI PHẪU THUẬT TẠO HÌNH THẨM MỸ VIỆT NAM
        </h2>

        {/*  Date & Location chips  */}
        <div className="flex flex-wrap gap-8 mb-10">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest font-bold text-secondary mb-1">Thời gian</span>
            <span className="text-lg font-semibold text-white">{cfg.event_date_display}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest font-bold text-secondary mb-1">Địa điểm</span>
            <span className="text-lg font-semibold text-white">{cfg.event_venue_display}</span>
          </div>
        </div>

        {/*  CTA Buttons  */}
        <div className="flex flex-col sm:flex-row gap-4">
          <a href="#/register-delegate" className="px-8 py-4 bg-secondary text-white font-bold text-sm tracking-widest uppercase hover:brightness-110 transition-all text-center">
            ĐĂNG KÝ THAM DỰ
          </a>
          <a href="#program" className="px-8 py-4 border border-white/30 text-white font-bold text-sm tracking-widest uppercase hover:bg-white/10 transition-all text-center">
            Xem chương trình
          </a>
        </div>

        {/*  Countdown  */}
        <div className="mt-10">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-3">Đếm ngược đến sự kiện</p>
          <div className="flex gap-3" id="countdown">
            <div className="flip-card rounded-sm px-4 py-3 text-center min-w-[64px]">
              <p className="text-3xl font-black text-white">{String(timeLeft[0]).padStart(3,"0")}</p>
              <p className="text-[8px] font-bold uppercase tracking-widest text-white/50 mt-1">Ngày</p>
            </div>
            <div className="flip-card rounded-sm px-4 py-3 text-center min-w-[64px]">
              <p className="text-3xl font-black text-white">{String(timeLeft[1]).padStart(2,"0")}</p>
              <p className="text-[8px] font-bold uppercase tracking-widest text-white/50 mt-1">Giờ</p>
            </div>
            <div className="flip-card rounded-sm px-4 py-3 text-center min-w-[64px]">
              <p className="text-3xl font-black text-white">{String(timeLeft[2]).padStart(2,"0")}</p>
              <p className="text-[8px] font-bold uppercase tracking-widest text-white/50 mt-1">Phút</p>
            </div>
            <div className="flip-card rounded-sm px-4 py-3 text-center min-w-[64px]">
              <p className="text-3xl font-black text-white">{String(timeLeft[3]).padStart(2,"0")}</p>
              <p className="text-[8px] font-bold uppercase tracking-widest text-white/50 mt-1">Giây</p>
            </div>
          </div>
        </div>
      </div>

      {/*  Right: Video Card  */}
      <div className="relative group fade-up visible">
        <div className="absolute -inset-3 bg-secondary/20 blur-2xl group-hover:bg-secondary/30 transition-all duration-500 rounded-sm"></div>
        <div className="relative aspect-video bg-academic-navy border border-white/10 overflow-hidden shadow-2xl cursor-pointer" onClick={() => setVideoModalOpen(true)} >
          <img alt="Video Preview – VSAPS 2025 Highlights"
            className="w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-700"
            src={normalizePublicStorageUrl(cfg.hero_video_thumb_url) || 'https://images.unsplash.com/photo-1551076805-e1869033e561?w=900&q=80'}/>
          <div className="absolute inset-0 bg-gradient-to-t from-academic-navy/80 via-transparent to-transparent"></div>
          {/*  Play btn  */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-secondary/90 flex items-center justify-center text-white shadow-xl group-hover:scale-110 group-hover:bg-secondary transition-all duration-300">
              <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
            </div>
          </div>
          {/*  Label  */}
          <div className="absolute bottom-6 left-6 right-6">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-secondary animate-pulse"></div>
              <span className="text-[10px] font-bold text-white uppercase tracking-widest">Xem Highlight Hội nghị VSAPS 2025</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

{/*  ═══════════════════════ ABOUT ═══════════════════════  */}
<section className="py-8 bg-white" id="about">
  <div className="max-w-7xl mx-auto px-6">
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start mb-8">

      {/*  Left: Description  */}
      <div className="lg:col-span-7 space-y-6 fade-up">
        <div>
          <span className="text-[10px] font-bold text-secondary tracking-[0.3em] uppercase">Về Hội nghị</span>
          <h2 className="text-5xl font-extrabold tracking-tight text-academic-navy mt-2">{cfg.event_name}</h2>
        </div>
        <div className="text-academic-slate text-sm leading-relaxed space-y-4">
          {cfg.event_description.split('\n').map((paragraph, index) => (
            paragraph.trim() ? <p key={index}>{paragraph}</p> : null
          ))}
        </div>
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-4 text-academic-navy">
            <span className="material-symbols-outlined text-secondary">schedule</span>
            <p className="text-sm"><span className="font-medium">Thời gian:</span> <strong>{cfg.event_time}</strong></p>
          </div>
          <div className="flex items-center gap-4 text-academic-navy">
            <span className="material-symbols-outlined text-secondary">location_on</span>
            <p className="text-sm"><span className="font-medium">Địa điểm:</span> <strong>{cfg.event_venue_display}</strong></p>
          </div>
          <div className="flex items-center gap-4 text-academic-navy">
            <span className="material-symbols-outlined text-secondary">workspace_premium</span>
            <p className="text-sm"><span className="font-medium">Chứng chỉ:</span> <strong>{cfg.cme_hours} giờ CME được Bộ Y tế công nhận</strong></p>
          </div>
        </div>
      </div>

      {/*  Right: Quick Links  */}
      <div className="lg:col-span-5 grid grid-cols-2 gap-4 fade-up">
        <a href="#/register-delegate" className="p-6 border border-secondary/30 hover:bg-secondary/20 rounded-2xl transition-all group flex flex-col gap-3">
          <span className="material-symbols-outlined text-secondary text-3xl group-hover:scale-110 transition-transform">person_add</span>
          <div>
            <p className="font-bold text-secondary text-sm">Đăng ký tham dự</p>
            <p className="text-[10px] text-academic-grey italic uppercase font-medium mt-0.5">Register to attend</p>
          </div>
        </a>
        <a href="#program" className="p-6 border border-secondary/30 hover:bg-secondary/20 rounded-2xl transition-all group flex flex-col gap-3">
          <span className="material-symbols-outlined text-secondary text-3xl group-hover:scale-110 transition-transform">list_alt</span>
          <div>
            <p className="font-bold text-secondary text-sm">Nội dung chương trình</p>
            <p className="text-[10px] text-academic-grey italic uppercase font-medium mt-0.5">Program content</p>
          </div>
        </a>
        <a href="#/speakers-list" className="p-6 border border-secondary/30 hover:bg-secondary/20 rounded-2xl transition-all group flex flex-col gap-3">
          <span className="material-symbols-outlined text-secondary text-3xl group-hover:scale-110 transition-transform">record_voice_over</span>
          <div>
            <p className="font-bold text-secondary text-sm">Báo cáo viên</p>
            <p className="text-[10px] text-academic-grey italic uppercase font-medium mt-0.5">Speakers</p>
          </div>
        </a>
        <a href="#" className="p-6 border border-secondary/30 hover:bg-secondary/20 rounded-2xl transition-all group flex flex-col gap-3">
          <span className="material-symbols-outlined text-secondary text-3xl group-hover:scale-110 transition-transform">groups</span>
          <div>
            <p className="font-bold text-secondary text-sm">Ban Chủ tọa</p>
            <p className="text-[10px] text-academic-grey italic uppercase font-medium mt-0.5">Chairmen</p>
          </div>
        </a>
        <a href="#/register-speaker" className="p-6 border border-secondary/30 hover:bg-secondary/20 rounded-2xl transition-all group flex flex-col gap-3">
          <span className="material-symbols-outlined text-secondary text-3xl group-hover:scale-110 transition-transform">article</span>
          <div>
            <p className="font-bold text-secondary text-sm">Gửi bài báo cáo</p>
            <p className="text-[10px] text-academic-grey italic uppercase font-medium mt-0.5">Submit abstract</p>
          </div>
        </a>
        <a href="#" className="p-6 border border-secondary/30 hover:bg-secondary/20 rounded-2xl transition-all group flex flex-col gap-3">
          <span className="material-symbols-outlined text-secondary text-3xl group-hover:scale-110 transition-transform">business</span>
          <div>
            <p className="font-bold text-secondary text-sm">Nhà tài trợ</p>
            <p className="text-[10px] text-academic-grey italic uppercase font-medium mt-0.5">Sponsors</p>
          </div>
        </a>
      </div>
    </div>

    {/*  Stats Bar  */}
    <div className="grid grid-cols-3 md:grid-cols-6 gap-6 pt-12 border-t border-border-subtle fade-up">
      <AnimStat value={cfg.stats.delegates} label="Đại biểu" />
      <AnimStat value={cfg.stats.speakers} label="Chủ tọa &amp; BCV" />
      <AnimStat value={cfg.stats.international_speakers} label="BCV Quốc tế" />
      <AnimStat value={cfg.stats.presentations} label="Bài báo cáo" />
      <AnimStat value={cfg.stats.companies} label="Doanh nghiệp" />
      <AnimStat value={cfg.stats.countries} label="Quốc gia" />
    </div>
  </div>
</section>

{/*  ═══════════════════════ SPEAKERS ═══════════════════════  */}
<section className="py-8 bg-surface border-y border-border-subtle" id="speakers">
  <div className="max-w-7xl mx-auto px-6">
    <div className="flex justify-between items-end mb-6 fade-up">
      <div>
        <span className="text-xs font-bold text-secondary tracking-[0.2em] uppercase">Ban Khoa học</span>
        <h2 className="text-4xl font-headline font-extrabold text-academic-navy mt-2">Diễn giả Danh dự</h2>
      </div>
      <a href="#/speakers-list" className="text-xs font-bold uppercase tracking-widest text-academic-navy flex items-center gap-2 hover:text-secondary transition-colors">
        Xem tất cả <span className="material-symbols-outlined text-sm">arrow_forward</span>
      </a>
    </div>

    <div className="flex flex-col gap-4 fade-up">
      {/* Top Row: 2 Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card 1 */}
        <div className="rounded-3xl shadow-lg overflow-hidden group border border-border-subtle bg-slate-100 aspect-[2/1] relative flex items-center justify-center">
          {!(cfg.speaker_card_images?.[0]) && <span className="absolute text-slate-400 font-medium text-sm">Upload image 1 (Tỷ lệ 2:1)</span>}
          <img className="w-full h-full object-cover relative z-10 transition-transform duration-700 group-hover:scale-105"
            src={normalizePublicStorageUrl(cfg.speaker_card_images?.[0]) || '/images/speakers/speaker-1.png'} alt="Card 1"
            onError={(e) => e.currentTarget.style.opacity = '0'} 
            onLoad={(e) => e.currentTarget.style.opacity = '1'} />
        </div>

        {/* Card 2 */}
        <div className="rounded-3xl shadow-lg overflow-hidden group border border-border-subtle bg-slate-100 aspect-[2/1] relative flex items-center justify-center">
          {!(cfg.speaker_card_images?.[1]) && <span className="absolute text-slate-400 font-medium text-sm">Upload image 2 (Tỷ lệ 2:1)</span>}
          <img className="w-full h-full object-cover relative z-10 transition-transform duration-700 group-hover:scale-105"
            src={normalizePublicStorageUrl(cfg.speaker_card_images?.[1]) || '/images/speakers/speaker-2.png'} alt="Card 2"
            onError={(e) => e.currentTarget.style.opacity = '0'} 
            onLoad={(e) => e.currentTarget.style.opacity = '1'} />
        </div>
      </div>

      {/* Bottom Row: 3 Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card 3 */}
        <div className="rounded-3xl shadow-lg overflow-hidden group border border-border-subtle bg-slate-100 aspect-[2/1] relative flex items-center justify-center">
          {!(cfg.speaker_card_images?.[2]) && <span className="absolute text-slate-400 font-medium text-sm text-center">Upload image 3<br/>(Tỷ lệ 2:1)</span>}
          <img className="w-full h-full object-cover relative z-10 transition-transform duration-700 group-hover:scale-105"
            src={normalizePublicStorageUrl(cfg.speaker_card_images?.[2]) || '/images/speakers/speaker-3.png'} alt="Card 3"
            onError={(e) => e.currentTarget.style.opacity = '0'} 
            onLoad={(e) => e.currentTarget.style.opacity = '1'} />
        </div>

        {/* Card 4 */}
        <div className="rounded-3xl shadow-lg overflow-hidden group border border-border-subtle bg-slate-100 aspect-[2/1] relative flex items-center justify-center">
          {!(cfg.speaker_card_images?.[3]) && <span className="absolute text-slate-400 font-medium text-sm text-center">Upload image 4<br/>(Tỷ lệ 2:1)</span>}
          <img className="w-full h-full object-cover relative z-10 transition-transform duration-700 group-hover:scale-105"
            src={normalizePublicStorageUrl(cfg.speaker_card_images?.[3]) || '/images/speakers/speaker-4.png'} alt="Card 4"
            onError={(e) => e.currentTarget.style.opacity = '0'} 
            onLoad={(e) => e.currentTarget.style.opacity = '1'} />
        </div>

        {/* Card 5 */}
        <div className="rounded-3xl shadow-lg overflow-hidden group border border-border-subtle bg-slate-100 aspect-[2/1] relative flex items-center justify-center">
          {!(cfg.speaker_card_images?.[4]) && <span className="absolute text-slate-400 font-medium text-sm text-center">Upload image 5<br/>(Tỷ lệ 2:1)</span>}
          <img className="w-full h-full object-cover relative z-10 transition-transform duration-700 group-hover:scale-105"
            src={normalizePublicStorageUrl(cfg.speaker_card_images?.[4]) || '/images/speakers/speaker-5.png'} alt="Card 5"
            onError={(e) => e.currentTarget.style.opacity = '0'} 
            onLoad={(e) => e.currentTarget.style.opacity = '1'} />
        </div>
      </div>

      {/* Carousel Dots */}
      <div className="flex justify-center gap-2 mt-4 mb-2">
        <button className="w-1.5 h-1.5 rounded-full border border-border-subtle"></button>
        <button className="w-1.5 h-1.5 rounded-full border border-border-subtle"></button>
        <button className="w-2 h-2 rounded-full bg-academic-navy -my-0.5"></button>
        <button className="w-1.5 h-1.5 rounded-full border border-border-subtle"></button>
      </div>
    </div>
  </div>
</section>

{/*  ═══════════════════════ PROGRAM ═══════════════════════  */}
<section className="py-8 bg-white" id="program">
  <div className="max-w-7xl mx-auto px-6">
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12 fade-up">
      <div>
        <span className="text-xs font-bold text-secondary tracking-[0.2em] uppercase">Chương trình chi tiết</span>
        <h2 className="text-4xl font-headline font-extrabold text-academic-navy mt-2">Chương trình Khoa học</h2>
      </div>
    </div>

    {/* Mobile Schedule (Hidden on Desktop) */}
    <div className="block lg:hidden space-y-6 mt-6 fade-up">
      {/* Day 1 */}
      <div className="border border-border-subtle rounded-2xl overflow-hidden bg-white shadow-sm">
        <div className="bg-secondary/40 text-academic-navy font-bold p-3 text-center text-base">NGÀY 1 - 11 DEC 2026</div>
        <div className="divide-y divide-border-subtle">
          <div className="p-3">
            <div className="mb-2"><span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded">HT1</span> <span className="text-xs font-semibold">Đăng ký & Check-in</span></div>
            <div className=""><span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-1 rounded">HT2</span> <span className="text-xs font-bold uppercase">ĐẠI HỘI VSAPS</span></div>
          </div>
          <div className="p-3">
            <div className="mb-2"><span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded">HT1</span> <span className="text-xs font-semibold">Live Surgery</span></div>
            <div className="mb-2"><span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-1 rounded">HT2</span> <span className="text-xs font-semibold">Phiên họp BCH Hội VSAPS</span></div>
            <div className="mb-2"><span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded">HT3</span> <span className="text-xs font-bold text-red-600">MASTER CLASS</span></div>
            <div className=""><span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded">HT4</span> <span className="text-xs font-bold text-red-600">MASTER CLASS</span></div>
          </div>
          <div className="p-3 bg-slate-50 text-center text-xs font-semibold text-academic-slate">Nghỉ giải lao</div>
          <div className="p-3">
            <div className="mb-2"><span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded">HT1</span> <span className="text-xs font-semibold">Live Surgery</span></div>
            <div className=""><span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-1 rounded">HT2</span> <span className="text-xs font-semibold">Phiên họp BCH Hội VSAPS (tiếp)</span></div>
          </div>
          <div className="p-3 bg-slate-50 text-center text-xs font-semibold text-academic-slate">Nghỉ trưa</div>
          <div className="p-3">
            <div className="mb-2"><span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded">HT1</span> <span className="text-xs font-semibold">Live Surgery</span></div>
            <div className=""><span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-1 rounded">HT2</span> <span className="text-xs font-semibold">Đại hội VSAPS lần thứ 3</span></div>
          </div>
          <div className="p-3 bg-slate-50 text-center text-xs font-semibold text-academic-slate">Nghỉ giải lao</div>
          <div className="p-3">
            <div className="mb-2"><span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded">HT1</span> <span className="text-xs font-bold text-red-600">MASTER CLASS</span></div>
            <div className="mb-2"><span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-1 rounded">HT2</span> <span className="text-xs font-semibold">Đại hội VSAPS lần thứ 3 (tiếp)</span></div>
            <div className="mb-2"><span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded">HT3</span> <span className="text-xs font-bold text-red-600">MASTER CLASS</span></div>
            <div className=""><span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded">HT4</span> <span className="text-xs font-bold text-red-600">MASTER CLASS</span></div>
          </div>
          <div className="p-4 bg-academic-navy text-white text-center font-bold tracking-widest text-sm">WELCOME DINNER</div>
        </div>
      </div>

      {/* Day 2 */}
      <div className="border border-border-subtle rounded-2xl overflow-hidden bg-white shadow-sm">
        <div className="bg-primary/10 text-academic-navy font-bold p-3 text-center text-base">NGÀY 2 - 12 DEC 2026</div>
        <div className="divide-y divide-border-subtle">
          <div className="p-3 text-center">
            <span className="text-xs font-bold text-red-600 uppercase tracking-widest">MASTER CLASS TẠI CÁC HỘI TRƯỜNG</span>
          </div>
          <div className="p-3">
            <div className="mb-3"><span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded block mb-1">HT1</span> <span className="text-xs font-bold text-academic-navy">Phần 1: Xu hướng mới trong Phẫu thuật Tạo hình & Thẩm mỹ</span></div>
            <div className="mb-3"><span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-1 rounded block mb-1">HT2</span> <span className="text-xs font-bold text-academic-navy">Phần 8: Phẫu thuật Sọ - Mặt</span></div>
            <div className="mb-3"><span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded block mb-1">HT3</span> <span className="text-xs font-bold text-academic-navy">Phần 16: PT hàm mặt chính xác: Từ lập kế hoạch đến hoàn thiện</span></div>
            <div className=""><span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded block mb-1">HT4</span> <span className="text-xs font-bold text-academic-navy">Phần 23: Phẫu thuật xâm lấn tối thiểu 1</span></div>
          </div>
          <div className="p-3 bg-slate-50 text-center text-xs font-semibold text-academic-slate">Nghỉ giải lao</div>
          <div className="p-3">
            <div className="mb-3"><span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded block mb-1">HT1</span> <span className="text-xs font-bold text-academic-navy">Phần 2: Những tiến bộ trong Phẫu thuật Thẩm mỹ mắt và Cấy mỡ vùng mặt</span></div>
            <div className="mb-3"><span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-1 rounded block mb-1">HT2</span> <span className="text-xs font-bold text-academic-navy">Phần 9: Kỹ thuật nâng cao và xử lý các khuyết phức tạp trong Phẫu thuật Sọ - Mặt</span></div>
            <div className="mb-3"><span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded block mb-1">HT3</span> <span className="text-xs font-bold text-academic-navy">Phần 17: Thách thức và đột phá trong xử trí chấn thương hàm mặt</span></div>
            <div className=""><span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded block mb-1">HT4</span> <span className="text-xs font-bold text-academic-navy">Phần 24: Phẫu thuật xâm lấn tối thiểu 2</span></div>
          </div>
          <div className="p-3 bg-slate-50 text-center text-xs font-semibold text-academic-slate">Nghỉ trưa</div>
          <div className="p-3">
            <div className="mb-3"><span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded block mb-1">HT1</span> <span className="text-xs font-bold text-academic-navy">Phần 3: Các đổi mới trong Phẫu thuật Thẩm mỹ & Tạo hình vùng mặt</span></div>
            <div className="mb-3"><span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-1 rounded block mb-1">HT2</span> <span className="text-xs font-bold text-academic-navy">Phần 10: Phẫu thuật Sọ - Mặt và Chỉnh hình Xương</span></div>
            <div className="mb-3"><span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded block mb-1">HT3</span> <span className="text-xs font-bold text-academic-navy">Phần 18: Tiến bộ trong tái tạo hàm mặt và hài hòa trong thẩm mỹ</span></div>
            <div className=""><span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded block mb-1">HT4</span> <span className="text-xs font-bold text-academic-navy">Phần 25: Phẫu thuật xâm lấn tối thiểu 3</span></div>
          </div>
          <div className="p-3 bg-slate-50 text-center text-xs font-semibold text-academic-slate">Nghỉ giải lao</div>
          <div className="p-3">
            <div className="mb-3"><span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded block mb-1">HT1</span> <span className="text-xs font-bold text-academic-navy">Phần 4: Các kỹ thuật tiên tiến trong Phẫu thuật thẩm mỹ ngực</span></div>
            <div className="mb-3"><span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-1 rounded block mb-1">HT2</span> <span className="text-xs font-bold text-academic-navy">Phần 11: Các đổi mới trong Phẫu thuật Hàm mặt và Phẫu thuật Sọ - Mặt</span></div>
            <div className="mb-3"><span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded block mb-1">HT3</span> <span className="text-xs font-bold text-academic-navy">Phần 19: Những tiến bộ mới trong tái tạo hàm mặt, kết hợp thẩm mỹ</span></div>
            <div className=""><span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded block mb-1">HT4</span> <span className="text-xs font-bold text-academic-navy">Phần 26: Phẫu thuật xâm lấn tối thiểu 4</span></div>
          </div>
          <div className="p-3 text-center">
            <span className="text-xs font-bold text-red-600 uppercase tracking-widest">MASTER CLASS TẠI CÁC HỘI TRƯỜNG</span>
          </div>
          <div className="p-4 bg-academic-navy text-white text-center font-bold tracking-widest text-sm">GALA DINNER</div>
        </div>
      </div>

      {/* Day 3 */}
      <div className="border border-border-subtle rounded-2xl overflow-hidden bg-white shadow-sm">
        <div className="bg-secondary/40 text-academic-navy font-bold p-3 text-center text-base">NGÀY 3 - 13 DEC 2026</div>
        <div className="divide-y divide-border-subtle">
          <div className="p-3 text-center">
            <span className="text-xs font-bold text-red-600 uppercase tracking-widest">MASTER CLASS TẠI CÁC HỘI TRƯỜNG</span>
          </div>
          <div className="p-3">
            <div className="mb-3"><span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded block mb-1">HT1</span> <span className="text-xs font-bold text-academic-navy">Phần 5: Các kỹ thuật Tạo hình cơ thể tiên tiến</span></div>
            <div className="mb-3"><span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-1 rounded block mb-1">HT2</span> <span className="text-xs font-bold text-academic-navy">Phần 12: Phẫu thuật tái tạo thứ phát và chiến lược điều chỉnh</span></div>
            <div className="mb-3"><span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded block mb-1">HT3</span> <span className="text-xs font-bold text-academic-navy">Phần 20: Kỹ thuật đổi mới trong Phẫu thuật Thẩm mỹ & Tạo hình</span></div>
            <div className=""><span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded block mb-1">HT4</span> <span className="text-xs font-bold text-academic-navy">Phần 27: Thẩm mỹ Nội khoa & Da liễu 5</span></div>
          </div>
          <div className="p-3 bg-slate-50 text-center text-xs font-semibold text-academic-slate">Nghỉ giải lao</div>
          <div className="p-3">
            <div className="mb-3"><span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded block mb-1">HT1</span> <span className="text-xs font-bold text-academic-navy">Phần 6: Các nguyên lý cơ bản và kỹ thuật nâng cao trong Phẫu thuật thẩm mỹ Mũi</span></div>
            <div className="mb-3"><span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-1 rounded block mb-1">HT2</span> <span className="text-xs font-bold text-academic-navy">Phần 13: Phẫu thuật Tạo hình & Tái tạo (6 & 7)</span></div>
            <div className="mb-3"><span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded block mb-1">HT3</span> <span className="text-xs font-bold text-academic-navy">Phần 21: Kỹ thuật đổi mới trong Phẫu thuật Thẩm mỹ & Tạo hình</span></div>
            <div className=""><span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded block mb-1">HT4</span> <span className="text-xs font-bold text-academic-navy">Phần 28: Thẩm mỹ Nội khoa & Da liễu 6</span></div>
          </div>
          <div className="p-3 bg-slate-50 text-center text-xs font-semibold text-academic-slate">Nghỉ trưa</div>
          <div className="p-3">
            <div className="mb-3"><span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded block mb-1">HT1</span> <span className="text-xs font-bold text-academic-navy">Phần 7: Những tiến bộ và đổi mới trong Phẫu thuật Mũi Cấu trúc</span></div>
            <div className="mb-3"><span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-1 rounded block mb-1">HT2</span> <span className="text-xs font-bold text-academic-navy">Phần 14: Phẫu thuật Tạo hình & Tái tạo (8)</span></div>
            <div className="mb-3"><span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded block mb-1">HT3</span> <span className="text-xs font-bold text-academic-navy">Phần 22: Kỹ thuật đổi mới trong Phẫu thuật Thẩm mỹ & Tạo hình</span></div>
            <div className=""><span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded block mb-1">HT4</span> <span className="text-xs font-bold text-academic-navy">Phần 29: Thẩm mỹ không xâm lấn 7</span></div>
          </div>
          <div className="p-3 text-center">
            <span className="text-xs font-bold text-red-600 uppercase tracking-widest">MASTER CLASS TẠI CÁC HỘI TRƯỜNG</span>
          </div>
        </div>
      </div>

      {/* Day 4 */}
      <div className="border border-border-subtle rounded-2xl overflow-hidden bg-white shadow-sm">
        <div className="bg-primary/10 text-academic-navy font-bold p-3 text-center text-base">NGÀY 4 - 14 DEC 2026</div>
        <div className="p-4 bg-slate-50 text-academic-navy text-center font-bold tracking-widest text-sm">TIỆC GIAO LƯU VÀ TOUR DU LỊCH KHÁM PHÁ</div>
      </div>
    </div>

    {/* Schedule Table (Detailed) */}
    <div className="hidden lg:block w-full overflow-x-auto rounded-3xl border border-border-subtle shadow-sm bg-white fade-up mt-12">
      <table className="w-full text-xs md:text-sm border-collapse min-w-[1000px] text-center">
        <tbody>
          {/* DAY 1 */}
          <tr>
            <td colSpan={4} className="border border-border-subtle p-4 bg-secondary/40 font-bold text-lg text-academic-navy">NGÀY 1 - 11 DEC 2026</td>
          </tr>
          <tr>
            <td className="border border-border-subtle p-3 font-bold bg-blue-50 text-blue-900 w-1/4 text-xs uppercase tracking-wider">Hội trường 1:<br/>Phẫu thuật Thẩm mỹ</td>
            <td className="border border-border-subtle p-3 font-bold bg-rose-50 text-rose-900 w-1/4 text-xs uppercase tracking-wider">Hội trường 2:<br/>Phẫu thuật Hàm mặt & Tái tạo</td>
            <td className="border border-border-subtle p-3 font-bold bg-emerald-50 text-emerald-900 w-1/4 text-xs uppercase tracking-wider">Hội trường 3:<br/>Phẫu thuật Tạo hình & Thẩm mỹ Tổng quát</td>
            <td className="border border-border-subtle p-3 font-bold bg-amber-50 text-amber-900 w-1/4 text-xs uppercase tracking-wider">Hội trường 4:<br/>Thẩm mỹ Ít xâm lấn & Nội khoa</td>
          </tr>
          <tr>
            <td className="border border-border-subtle p-3 font-semibold text-left bg-blue-50/30">Đăng ký & Check-in</td>
            <td className="border border-border-subtle p-3 font-bold uppercase text-left bg-rose-50/30 text-rose-900">ĐẠI HỘI VSAPS</td>
            <td className="border border-border-subtle p-3 bg-white"></td>
            <td className="border border-border-subtle p-3 bg-white"></td>
          </tr>
          <tr>
            <td className="border border-border-subtle p-3 font-semibold text-left bg-blue-50/30">Live Surgery</td>
            <td className="border border-border-subtle p-3 font-semibold text-left bg-rose-50/30">Phiên họp Ban Chấp hành Hội VSAPS</td>
            <td className="border border-border-subtle p-3 font-bold text-red-600 uppercase bg-emerald-50/30">MASTER CLASS</td>
            <td className="border border-border-subtle p-3 font-bold text-red-600 uppercase bg-amber-50/30">MASTER CLASS</td>
          </tr>
          <tr>
            <td className="border border-border-subtle p-2 text-academic-slate text-left">Nghỉ giải lao</td>
            <td className="border border-border-subtle p-2 text-academic-slate text-left">Nghỉ giải lao</td>
            <td className="border border-border-subtle p-2 text-academic-slate text-left">Nghỉ giải lao</td>
            <td className="border border-border-subtle p-2 text-academic-slate text-left">Nghỉ giải lao</td>
          </tr>
          <tr>
            <td className="border border-border-subtle p-3 font-semibold text-left bg-blue-50/30">Live Surgery</td>
            <td className="border border-border-subtle p-3 font-semibold text-left bg-rose-50/30">Phiên họp Ban Chấp hành Hội VSAPS (tiếp)</td>
            <td className="border border-border-subtle p-3 bg-white"></td>
            <td className="border border-border-subtle p-3 bg-white"></td>
          </tr>
          <tr>
            <td className="border border-border-subtle p-2 text-academic-slate text-left">Nghỉ trưa</td>
            <td className="border border-border-subtle p-2 text-academic-slate text-left">Nghỉ trưa</td>
            <td className="border border-border-subtle p-2 text-academic-slate text-left">Nghỉ trưa</td>
            <td className="border border-border-subtle p-2 text-academic-slate text-left">Nghỉ trưa</td>
          </tr>
          <tr>
            <td className="border border-border-subtle p-3 font-semibold text-left bg-blue-50/30">Live Surgery</td>
            <td className="border border-border-subtle p-3 font-semibold text-left bg-rose-50/30">Đại hội VSAPS lần thứ 3</td>
            <td className="border border-border-subtle p-3 bg-white"></td>
            <td className="border border-border-subtle p-3 bg-white"></td>
          </tr>
          <tr>
            <td className="border border-border-subtle p-2 text-academic-slate text-left">Nghỉ giải lao</td>
            <td className="border border-border-subtle p-2 text-academic-slate text-left">Nghỉ giải lao</td>
            <td className="border border-border-subtle p-2 text-academic-slate text-left">Nghỉ giải lao</td>
            <td className="border border-border-subtle p-2 text-academic-slate text-left">Nghỉ giải lao</td>
          </tr>
          <tr>
            <td className="border border-border-subtle p-3 font-bold text-red-600 uppercase text-left bg-blue-50/30">MASTER CLASS</td>
            <td className="border border-border-subtle p-3 font-semibold text-left bg-rose-50/30">Đại hội VSAPS lần thứ 3 (tiếp)</td>
            <td className="border border-border-subtle p-3 font-bold text-red-600 uppercase text-left bg-emerald-50/30">MASTER CLASS</td>
            <td className="border border-border-subtle p-3 font-bold text-red-600 uppercase text-left bg-amber-50/30">MASTER CLASS</td>
          </tr>

          {/* WELCOME DINNER */}
          <tr>
            <td colSpan={4} className="border border-border-subtle p-4 font-bold text-lg tracking-widest uppercase bg-slate-50 text-academic-navy">WELCOME DINNER</td>
          </tr>

          {/* DAY 2 */}
          <tr>
            <td colSpan={4} className="border border-border-subtle p-4 bg-primary/10 font-bold text-lg text-academic-navy">NGÀY 2 - 12 DEC 2026</td>
          </tr>
          <tr>
            <td className="border border-border-subtle p-3 font-bold bg-blue-50 text-blue-900 w-1/4 text-xs uppercase tracking-wider">Hội trường 1:<br/>Phẫu thuật Thẩm mỹ</td>
            <td className="border border-border-subtle p-3 font-bold bg-rose-50 text-rose-900 w-1/4 text-xs uppercase tracking-wider">Hội trường 2:<br/>Phẫu thuật Hàm mặt & Tái tạo</td>
            <td className="border border-border-subtle p-3 font-bold bg-emerald-50 text-emerald-900 w-1/4 text-xs uppercase tracking-wider">Hội trường 3:<br/>Phẫu thuật Tạo hình & Thẩm mỹ Tổng quát</td>
            <td className="border border-border-subtle p-3 font-bold bg-amber-50 text-amber-900 w-1/4 text-xs uppercase tracking-wider">Hội trường 4:<br/>Thẩm mỹ Ít xâm lấn & Nội khoa</td>
          </tr>
          <tr>
            <td className="border border-border-subtle p-3 font-bold text-red-600 uppercase text-left bg-blue-50/30">MASTER CLASS</td>
            <td className="border border-border-subtle p-3 font-bold text-red-600 uppercase text-left bg-rose-50/30">MASTER CLASS</td>
            <td className="border border-border-subtle p-3 font-bold text-red-600 uppercase text-left bg-emerald-50/30">MASTER CLASS</td>
            <td className="border border-border-subtle p-3 font-bold text-red-600 uppercase text-left bg-amber-50/30">MASTER CLASS</td>
          </tr>
          <tr>
            <td className="border border-border-subtle p-3 bg-blue-50/50 font-bold text-left text-blue-900">Phần 1: Xu hướng mới trong Phẫu thuật Tạo hình & Thẩm mỹ</td>
            <td className="border border-border-subtle p-3 bg-rose-50/50 font-bold text-left text-rose-900">Phần 8: Phẫu thuật Sọ - Mặt</td>
            <td className="border border-border-subtle p-3 bg-emerald-50/50 font-bold text-left text-emerald-900">Phần 16: PT hàm mặt chính xác: Từ lập kế hoạch đến hoàn thiện</td>
            <td className="border border-border-subtle p-3 bg-amber-50/50 font-bold text-left text-amber-900">Phần 23: Phẫu thuật xâm lấn tối thiểu 1</td>
          </tr>
          <tr>
            <td className="border border-border-subtle p-2 text-academic-slate text-left">Nghỉ giải lao</td>
            <td className="border border-border-subtle p-2 text-academic-slate text-left">Nghỉ giải lao</td>
            <td className="border border-border-subtle p-2 text-academic-slate text-left">Nghỉ giải lao</td>
            <td className="border border-border-subtle p-2 text-academic-slate text-left">Nghỉ giải lao</td>
          </tr>
          <tr>
            <td className="border border-border-subtle p-3 bg-blue-50/50 font-bold text-left text-blue-900">Phần 2: Những tiến bộ trong Phẫu thuật Thẩm mỹ mắt và Cấy mỡ vùng mặt</td>
            <td className="border border-border-subtle p-3 bg-rose-50/50 font-bold text-left text-rose-900">Phần 9: Kỹ thuật nâng cao và xử lý các khuyết phức tạp trong Phẫu thuật Sọ - Mặt</td>
            <td className="border border-border-subtle p-3 bg-emerald-50/50 font-bold text-left text-emerald-900">Phần 17: Thách thức và đột phá trong xử trí chấn thương hàm mặt</td>
            <td className="border border-border-subtle p-3 bg-amber-50/50 font-bold text-left text-amber-900">Phần 24: Phẫu thuật xâm lấn tối thiểu 2</td>
          </tr>
          <tr>
            <td className="border border-border-subtle p-2 text-academic-slate text-left">Nghỉ trưa</td>
            <td className="border border-border-subtle p-2 text-academic-slate text-left">Nghỉ trưa</td>
            <td className="border border-border-subtle p-2 text-academic-slate text-left">Nghỉ trưa</td>
            <td className="border border-border-subtle p-2 text-academic-slate text-left">Nghỉ trưa</td>
          </tr>
          <tr>
            <td className="border border-border-subtle p-3 bg-blue-50/50 font-bold text-left text-blue-900">Phần 3: Các đổi mới trong Phẫu thuật Thẩm mỹ & Tạo hình vùng mặt</td>
            <td className="border border-border-subtle p-3 bg-rose-50/50 font-bold text-left text-rose-900">Phần 10: Phẫu thuật Sọ - Mặt và Chỉnh hình Xương</td>
            <td className="border border-border-subtle p-3 bg-emerald-50/50 font-bold text-left text-emerald-900">Phần 18: Tiến bộ trong tái tạo hàm mặt và hài hòa trong thẩm mỹ</td>
            <td className="border border-border-subtle p-3 bg-amber-50/50 font-bold text-left text-amber-900">Phần 25: Phẫu thuật xâm lấn tối thiểu 3</td>
          </tr>
          <tr>
            <td className="border border-border-subtle p-2 text-academic-slate text-left">Nghỉ giải lao</td>
            <td className="border border-border-subtle p-2 text-academic-slate text-left">Nghỉ giải lao</td>
            <td className="border border-border-subtle p-2 text-academic-slate text-left">Nghỉ giải lao</td>
            <td className="border border-border-subtle p-2 text-academic-slate text-left">Nghỉ giải lao</td>
          </tr>
          <tr>
            <td className="border border-border-subtle p-3 bg-blue-50/50 font-bold text-left text-blue-900">Phần 4: Các kỹ thuật tiên tiến trong Phẫu thuật thẩm mỹ ngực</td>
            <td className="border border-border-subtle p-3 bg-rose-50/50 font-bold text-left text-rose-900">Phần 11: Các đổi mới trong Phẫu thuật Hàm mặt và Phẫu thuật Sọ - Mặt</td>
            <td className="border border-border-subtle p-3 bg-emerald-50/50 font-bold text-left text-emerald-900">Phần 19: Những tiến bộ mới trong tái tạo hàm mặt, kết hợp thẩm mỹ</td>
            <td className="border border-border-subtle p-3 bg-amber-50/50 font-bold text-left text-amber-900">Phần 26: Phẫu thuật xâm lấn tối thiểu 4</td>
          </tr>
          <tr>
            <td className="border border-border-subtle p-3 font-bold text-red-600 uppercase text-left bg-blue-50/30">MASTER CLASS</td>
            <td className="border border-border-subtle p-3 font-bold text-red-600 uppercase text-left bg-rose-50/30">MASTER CLASS</td>
            <td className="border border-border-subtle p-3 font-bold text-red-600 uppercase text-left bg-emerald-50/30">MASTER CLASS</td>
            <td className="border border-border-subtle p-3 font-bold text-red-600 uppercase text-left bg-amber-50/30">MASTER CLASS</td>
          </tr>

          {/* GALA DINNER */}
          <tr>
            <td colSpan={4} className="border border-border-subtle p-4 font-bold text-lg tracking-widest uppercase bg-slate-50 text-academic-navy">GALA DINNER</td>
          </tr>

          {/* DAY 3 */}
          <tr>
            <td colSpan={4} className="border border-border-subtle p-4 bg-secondary/40 font-bold text-lg text-academic-navy">NGÀY 3 - 13 DEC 2026</td>
          </tr>
          <tr>
            <td className="border border-border-subtle p-3 font-bold bg-blue-50 text-blue-900 w-1/4 text-xs uppercase tracking-wider">Hội trường 1:<br/>Phẫu thuật Thẩm mỹ</td>
            <td className="border border-border-subtle p-3 font-bold bg-rose-50 text-rose-900 w-1/4 text-xs uppercase tracking-wider">Hội trường 2:<br/>Phẫu thuật Hàm mặt & Tái tạo</td>
            <td className="border border-border-subtle p-3 font-bold bg-emerald-50 text-emerald-900 w-1/4 text-xs uppercase tracking-wider">Hội trường 3:<br/>Phẫu thuật Tạo hình & Thẩm mỹ Tổng quát</td>
            <td className="border border-border-subtle p-3 font-bold bg-amber-50 text-amber-900 w-1/4 text-xs uppercase tracking-wider">Hội trường 4:<br/>Thẩm mỹ Ít xâm lấn & Nội khoa</td>
          </tr>
          <tr>
            <td className="border border-border-subtle p-3 font-bold text-red-600 uppercase text-left bg-blue-50/30">MASTER CLASS</td>
            <td className="border border-border-subtle p-3 font-bold text-red-600 uppercase text-left bg-rose-50/30">MASTER CLASS</td>
            <td className="border border-border-subtle p-3 font-bold text-red-600 uppercase text-left bg-emerald-50/30">MASTER CLASS</td>
            <td className="border border-border-subtle p-3 font-bold text-red-600 uppercase text-left bg-amber-50/30">MASTER CLASS</td>
          </tr>
          <tr>
            <td className="border border-border-subtle p-3 bg-blue-50/50 font-bold text-left text-blue-900">Phần 5: Các kỹ thuật Tạo hình cơ thể tiên tiến</td>
            <td className="border border-border-subtle p-3 bg-rose-50/50 font-bold text-left text-rose-900">Phần 12: Phẫu thuật tái tạo thứ phát và chiến lược điều chỉnh</td>
            <td className="border border-border-subtle p-3 bg-emerald-50/50 font-bold text-left text-emerald-900">Phần 20: Kỹ thuật đổi mới trong Phẫu thuật Thẩm mỹ & Tạo hình</td>
            <td className="border border-border-subtle p-3 bg-amber-50/50 font-bold text-left text-amber-900">Phần 27: Thẩm mỹ Nội khoa & Da liễu 5</td>
          </tr>
          <tr>
            <td className="border border-border-subtle p-2 text-academic-slate text-left">Nghỉ giải lao</td>
            <td className="border border-border-subtle p-2 text-academic-slate text-left">Nghỉ giải lao</td>
            <td className="border border-border-subtle p-2 text-academic-slate text-left">Nghỉ giải lao</td>
            <td className="border border-border-subtle p-2 text-academic-slate text-left">Nghỉ giải lao</td>
          </tr>
          <tr>
            <td className="border border-border-subtle p-3 bg-blue-50/50 font-bold text-left text-blue-900">Phần 6: Các nguyên lý cơ bản và kỹ thuật nâng cao trong Phẫu thuật thẩm mỹ Mũi</td>
            <td className="border border-border-subtle p-3 bg-rose-50/50 font-bold text-left text-rose-900">Phần 13: Phẫu thuật Tạo hình & Tái tạo (6 & 7)</td>
            <td className="border border-border-subtle p-3 bg-emerald-50/50 font-bold text-left text-emerald-900">Phần 21: Kỹ thuật đổi mới trong Phẫu thuật Thẩm mỹ & Tạo hình</td>
            <td className="border border-border-subtle p-3 bg-amber-50/50 font-bold text-left text-amber-900">Phần 28: Thẩm mỹ Nội khoa & Da liễu 6</td>
          </tr>
          <tr>
            <td className="border border-border-subtle p-2 text-academic-slate text-left">Nghỉ trưa</td>
            <td className="border border-border-subtle p-2 text-academic-slate text-left">Nghỉ trưa</td>
            <td className="border border-border-subtle p-2 text-academic-slate text-left">Nghỉ trưa</td>
            <td className="border border-border-subtle p-2 text-academic-slate text-left">Nghỉ trưa</td>
          </tr>
          <tr>
            <td className="border border-border-subtle p-3 bg-blue-50/50 font-bold text-left text-blue-900">Phần 7: Những tiến bộ và đổi mới trong Phẫu thuật Mũi Cấu trúc</td>
            <td className="border border-border-subtle p-3 bg-rose-50/50 font-bold text-left text-rose-900">Phần 14: Phẫu thuật Tạo hình & Tái tạo (8)</td>
            <td className="border border-border-subtle p-3 bg-emerald-50/50 font-bold text-left text-emerald-900">Phần 22: Kỹ thuật đổi mới trong Phẫu thuật Thẩm mỹ & Tạo hình</td>
            <td className="border border-border-subtle p-3 bg-amber-50/50 font-bold text-left text-amber-900">Phần 29: Thẩm mỹ không xâm lấn 7</td>
          </tr>
          <tr>
            <td className="border border-border-subtle p-3 font-bold text-red-600 uppercase text-left bg-blue-50/30">MASTER CLASS</td>
            <td className="border border-border-subtle p-3 font-bold text-red-600 uppercase text-left bg-rose-50/30">MASTER CLASS</td>
            <td className="border border-border-subtle p-3 font-bold text-red-600 uppercase text-left bg-emerald-50/30">MASTER CLASS</td>
            <td className="border border-border-subtle p-3 font-bold text-red-600 uppercase text-left bg-amber-50/30">MASTER CLASS</td>
          </tr>

          {/* DAY 4 */}
          <tr>
            <td colSpan={4} className="border border-border-subtle p-4 bg-primary/10 font-bold text-lg text-academic-navy">NGÀY 4 - 14 DEC 2026</td>
          </tr>
          <tr>
            <td colSpan={4} className="border border-border-subtle p-4 font-bold text-lg tracking-widest uppercase bg-slate-50 text-academic-navy text-center">TIỆC GIAO LƯU VÀ TOUR DU LỊCH KHÁM PHÁ</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div className="mt-10 text-center fade-up">
      <a href="#" className="inline-block px-10 py-4 bg-white border-2 border-academic-navy text-academic-navy font-bold text-sm tracking-widest uppercase hover:bg-academic-navy hover:text-white transition-all">
        Tải Chương trình Chi tiết (PDF) ↓
      </a>
    </div>
  </div>
</section>

{/*  ═══════════════════════ REGISTER ═══════════════════════  */}
<section className="py-8 bg-academic-navy" id="register">
  <div className="max-w-7xl mx-auto px-6 text-center fade-up">
    <p className="text-secondary font-bold tracking-[0.3em] text-xs uppercase mb-4">Mở đăng ký sớm</p>
    <h2 className="text-5xl font-extrabold text-white tracking-tight mb-4">Tham gia {cfg.event_name}</h2>
    <p className="text-white/60 text-sm max-w-xl mx-auto mb-10">
      Đăng ký sớm trước ngày 30/09/2026 để nhận ưu đãi 20% và đảm bảo chỗ tham dự Gala Dinner.
    </p>

    {/*  Pricing Cards  */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 text-left max-w-4xl mx-auto">
      <div className="border border-white/10 p-8 bg-white/5 hover:bg-white/10 transition-colors">
        <p className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">Hội viên VSAPS</p>
        <p className="text-4xl font-black text-white mb-1 whitespace-nowrap">{cfg.registration_prices[0]?.price || "1.500.000"} <span className="text-lg font-normal text-white/50">đ</span></p>
        <p className="text-xs text-white/50 mb-6">Áp dụng đến 30/09/2026</p>
        <ul className="text-xs text-white/70 space-y-2">
          <li className="flex gap-2"><span className="text-secondary">✓</span> Toàn bộ phiên khoa học</li>
          <li className="flex gap-2"><span className="text-secondary">✓</span> Chứng chỉ CME 24 giờ</li>
          <li className="flex gap-2"><span className="text-secondary">✓</span> Tài liệu hội nghị digital</li>
        </ul>
      </div>
      <div className="border-2 border-secondary p-8 bg-secondary/10 relative">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-secondary text-white text-[8px] font-bold uppercase tracking-widest">Phổ biến nhất</div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">Đại biểu Tự do</p>
        <p className="text-4xl font-black text-white mb-1 whitespace-nowrap">{cfg.registration_prices[1]?.price || "2.500.000"} <span className="text-lg font-normal text-white/50">đ</span></p>
        <p className="text-xs text-white/50 mb-6">Áp dụng đến 30/09/2026</p>
        <ul className="text-xs text-white/70 space-y-2">
          <li className="flex gap-2"><span className="text-secondary">✓</span> Toàn bộ phiên khoa học</li>
          <li className="flex gap-2"><span className="text-secondary">✓</span> Chứng chỉ CME 24 giờ</li>
          <li className="flex gap-2"><span className="text-secondary">✓</span> Tài liệu hội nghị digital</li>
          <li className="flex gap-2"><span className="text-secondary">✓</span> Vé Gala Dinner</li>
        </ul>
      </div>
      <div className="border border-white/10 p-8 bg-white/5 hover:bg-white/10 transition-colors">
        <p className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">Học viên / SV</p>
        <p className="text-4xl font-black text-white mb-1 whitespace-nowrap">{cfg.registration_prices[2]?.price || "800.000"} <span className="text-lg font-normal text-white/50">đ</span></p>
        <p className="text-xs text-white/50 mb-6">Cần xác nhận của cơ sở đào tạo</p>
        <ul className="text-xs text-white/70 space-y-2">
          <li className="flex gap-2"><span className="text-secondary">✓</span> Toàn bộ phiên khoa học</li>
          <li className="flex gap-2"><span className="text-secondary">✓</span> Chứng nhận tham dự</li>
          <li className="flex gap-2"><span className="text-secondary">✓</span> Poster session access</li>
        </ul>
      </div>
    </div>

    <div className="flex flex-col sm:flex-row gap-4 justify-center">
      <a href="#/register-delegate" className="px-10 py-4 bg-secondary text-white font-bold text-sm tracking-widest uppercase hover:brightness-110 transition-all">
        Đăng ký Đại biểu →
      </a>
      <a href="#/register-speaker" className="px-10 py-4 border border-white/20 text-white font-bold text-sm tracking-widest uppercase hover:bg-white/10 transition-all">
        Đăng ký Báo cáo viên
      </a>
    </div>
  </div>
</section>

{/*  ═══════════════════════ VENUE ═══════════════════════  */}
<section className="py-8 bg-white" id="venue">
  <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
    <div className="space-y-8 fade-up">
      <div>
        <span className="text-xs font-bold text-secondary tracking-[0.2em] uppercase">Hỗ trợ Hậu cần</span>
        <h2 className="text-4xl font-headline font-extrabold text-academic-navy mt-2">Địa điểm Tổ chức</h2>
        <div className="w-20 h-1 bg-secondary mt-4"></div>
      </div>

      <div className="space-y-4">
        <div className="p-6 border border-border-subtle flex gap-5 hover:border-secondary/40 transition-colors">
          <span className="material-symbols-outlined text-3xl text-secondary flex-shrink-0">location_on</span>
          <div>
            <p className="font-bold text-lg text-academic-navy">Bệnh viện Quân y 175</p>
            <p className="text-sm text-academic-slate mt-1">786 Nguyễn Kiệm, Phường 3, Quận Gò Vấp, TP. Hồ Chí Minh</p>
          </div>
        </div>
        <div className="p-6 border border-border-subtle flex gap-5 hover:border-secondary/40 transition-colors">
          <span className="material-symbols-outlined text-3xl text-secondary flex-shrink-0">bed</span>
          <div>
            <p className="font-bold text-lg text-academic-navy">Khách sạn Khuyến nghị</p>
            <p className="text-sm text-academic-slate mt-1">Giá ưu đãi cho đại biểu tại <strong>Tân Sơn Nhất Pavilion</strong> và <strong>Parkroyal Sài Gòn</strong>. Đặt phòng qua Ban thư ký.</p>
          </div>
        </div>
        <div className="p-6 border border-border-subtle flex gap-5 hover:border-secondary/40 transition-colors">
          <span className="material-symbols-outlined text-3xl text-secondary flex-shrink-0">school</span>
          <div>
            <p className="font-bold text-lg text-academic-navy">Chứng chỉ CME</p>
            <p className="text-sm text-academic-slate mt-1">Đại biểu nhận <strong>24 giờ CME</strong> chính thức được công nhận bởi Bộ Y tế Việt Nam.</p>
          </div>
        </div>
        <div className="p-6 border border-border-subtle flex gap-5 hover:border-secondary/40 transition-colors">
          <span className="material-symbols-outlined text-3xl text-secondary flex-shrink-0">flight</span>
          <div>
            <p className="font-bold text-lg text-academic-navy">Di chuyển &amp; Đón tiếp</p>
            <p className="text-sm text-academic-slate mt-1">Sân bay Tân Sơn Nhất cách địa điểm <strong>5 phút</strong> di chuyển. Dịch vụ đưa đón sẽ được thông báo sau.</p>
          </div>
        </div>
      </div>
    </div>

    {/*  Map placeholder  */}
    <div className="relative fade-up">
      <div className="absolute -top-8 -right-8 w-64 h-64 bg-secondary/20 -z-10"></div>
      <div className="overflow-hidden border border-border-subtle shadow-xl">
        <iframe
          src={cfg.map_embed_url || 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3918.7862892097957!2d106.66237757480784!3d10.833839289310086!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3174de99d5fb23e9%3A0x9c82a9a3f9ab40ed!2zQuG7h25oIHZp4buHbiBRdeG6n24geSAxNzU!5e0!3m2!1svi!2svn!4v1713671234567!5m2!1svi!2svn'}
          width="100%" height="400" style={{ border: 0 }} allowFullScreen loading="lazy"
          title="Bản đồ Bệnh viện Quân y 175"></iframe>
      </div>
    </div>
  </div>
</section>

{/*  ═══════════════════════ SPONSORS ═══════════════════════  */}
<section className="py-16 bg-white border-t border-border-subtle" id="sponsors">
  <div className="max-w-7xl mx-auto px-6">
    <div className="text-center mb-12 fade-up">
      <span className="text-[10px] font-bold text-secondary tracking-[0.3em] uppercase">Nhà Tài Trợ</span>
      <h2 className="text-4xl font-extrabold tracking-tight text-academic-navy mt-2">Đồng hành cùng {cfg.event_name}</h2>
    </div>

    {(['Kim cương', 'Vàng', 'Bạc', 'Đồng', 'Khác'] as const).map(tier => {
      const tierSponsors = sponsors.filter(s => s.sponsorship_package === tier);
      if (tierSponsors.length === 0) return null;

      const tierStyles: Record<string, { border: string; bg: string; label: string; labelColor: string; logoH: string; cols: string }> = {
        'Kim cương': { border: 'border-[#b9f2ff]/60', bg: 'bg-gradient-to-br from-[#e0f7ff] to-[#f0fdff]', label: '💎 Kim Cương', labelColor: 'text-[#0891b2]', logoH: 'h-20', cols: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' },
        'Vàng':      { border: 'border-amber-200',    bg: 'bg-gradient-to-br from-amber-50 to-yellow-50',  label: '🥇 Vàng',      labelColor: 'text-amber-600',   logoH: 'h-16', cols: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' },
        'Bạc':       { border: 'border-slate-200',    bg: 'bg-gradient-to-br from-slate-50 to-gray-50',    label: '🥈 Bạc',       labelColor: 'text-slate-500',   logoH: 'h-12', cols: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5' },
        'Đồng':      { border: 'border-orange-200',   bg: 'bg-gradient-to-br from-orange-50 to-amber-50',  label: '🥉 Đồng',      labelColor: 'text-orange-500',  logoH: 'h-10', cols: 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6' },
        'Khác':      { border: 'border-gray-100',     bg: 'bg-gray-50',                                    label: '🤝 Đồng hành', labelColor: 'text-gray-500',    logoH: 'h-9',  cols: 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6' },
      };
      const st = tierStyles[tier];

      return (
        <div key={tier} className="mb-10 fade-up">
          <div className="flex items-center gap-3 mb-4">
            <span className={`text-sm font-extrabold uppercase tracking-widest ${st.labelColor}`}>{st.label}</span>
            <div className="flex-1 h-px bg-border-subtle"/>
          </div>
          <div className={`grid ${st.cols} gap-4`}>
            {tierSponsors.map(sp => (
              <div key={sp.id} className={`rounded-2xl border ${st.border} ${st.bg} flex flex-col items-center justify-center gap-2 p-5 hover:shadow-lg transition-shadow`}>
                {sp.logo_url
                  ? <img src={normalizePublicStorageUrl(sp.logo_url) || sp.logo_url} alt={sp.name} className={`${st.logoH} w-auto object-contain`}/>
                  : <span className="font-black text-academic-navy tracking-tighter text-lg text-center">{sp.name}</span>
                }
              </div>
            ))}
          </div>
        </div>
      );
    })}

    {sponsors.length === 0 && (
      <div className="text-center py-10 text-gray-400 text-sm">
        Thông tin nhà tài trợ sẽ được cập nhật sớm.
      </div>
    )}

    <div className="mt-10 text-center fade-up">
      <a href={`mailto:${cfg.contact_email}`}
        className="inline-flex items-center gap-2 px-8 py-3 border-2 border-secondary text-secondary font-bold text-sm rounded-full hover:bg-secondary hover:text-white transition-all uppercase tracking-widest">
        <span className="material-symbols-outlined text-base">handshake</span> Trở thành Nhà tài trợ
      </a>
    </div>
  </div>
</section>

{/*  ═══════════════════════ FOOTER ═══════════════════════  */}
<footer className="bg-academic-navy text-white py-10 px-6 border-t-4 border-secondary">
  <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">

    {/*  Brand  */}
    <div className="col-span-1 md:col-span-2 space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-secondary rounded-sm flex items-center justify-center font-black text-white text-xl tracking-tighter">VS</div>
        <span className="text-2xl font-black tracking-tighter">{cfg.event_name}</span>
      </div>
      <p className="text-white/40 text-xs leading-relaxed max-w-md">
        {cfg.footer_description || `Hội Phẫu thuật Tạo hình Thẩm mỹ Việt Nam (VSAPS) là cơ quan chuyên môn hàng đầu về y học thẩm mỹ tại Việt Nam.
        ${cfg.event_name} là diễn đàn quốc tế uy tín cho sự xuất sắc trong khoa học phẫu thuật thẩm mỹ.`}
      </p>
      <div className="flex gap-3">
        <a href={cfg.social_facebook || 'https://facebook.com'} target="_blank" className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center hover:bg-secondary hover:border-secondary transition-colors">
          <span className="text-xs font-bold">fb</span>
        </a>
        <a href={cfg.social_youtube || 'https://youtube.com'} target="_blank" className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center hover:bg-secondary hover:border-secondary transition-colors">
          <span className="material-symbols-outlined text-sm">smart_display</span>
        </a>
        <a href={`mailto:${cfg.contact_email}`} className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center hover:bg-secondary hover:border-secondary transition-colors">
          <span className="material-symbols-outlined text-sm">mail</span>
        </a>
      </div>
    </div>

    {/*  Links  */}
    <div>
      <h5 className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-6">Liên kết Học thuật</h5>
      <ul className="space-y-3 text-xs text-white/60">
        <li><a className="hover:text-white transition-colors" href="#">Mời gửi bài báo cáo</a></li>
        <li><a className="hover:text-white transition-colors" href="#speakers">Ban Khoa học</a></li>
        <li><a className="hover:text-white transition-colors" href="#program">Chứng nhận CME</a></li>
        <li><a className="hover:text-white transition-colors" href="#">Lưu trữ hội nghị các năm</a></li>
        <li><a className="hover:text-white transition-colors" href="#/register-delegate">Đăng ký tham dự</a></li>
      </ul>
    </div>

    {/*  Contact  */}
    <div>
      <h5 className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-6">Ban Thư ký</h5>
      <p className="text-xs text-white/60 leading-relaxed mb-4">
        {cfg.contact_email}<br/>
        +84 (28) 3895 4941<br/><br/>
        <strong className="text-white/40">Văn phòng:</strong><br/>
        786 Nguyễn Kiệm, Gò Vấp, TP.HCM
      </p>
      <div className="pt-4 border-t border-white/10">
        <p className="text-[10px] text-white/30 uppercase tracking-widest">© 2026 VSAPS. Bảo lưu mọi quyền.</p>
      </div>
    </div>
  </div>
</footer>

      {/* Video Modal */}
      {videoModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-primary/80 backdrop-blur-sm p-4" onClick={() => setVideoModalOpen(false)}>
          <div className="relative w-full max-w-4xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setVideoModalOpen(false)} className="absolute -top-10 right-0 text-white/70 hover:text-white text-sm font-bold uppercase tracking-widest flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">close</span> Đóng
            </button>
            <div className="aspect-video bg-primary border border-white/10 flex items-center justify-center">
              {cfg.hero_video_url ? (
                <iframe
                  src={cfg.hero_video_url}
                  className="w-full h-full"
                  allowFullScreen
                  title="Video Highlight VSAPS"
                />
              ) : (
                <p className="text-white/40 text-sm">Video Highlight {cfg.event_name} sẽ được cập nhật sớm.</p>
              )}
            </div>
          </div>
        </div>
      )}

      <BackToTop />
    </div>
  );
}

const BackToTop: React.FC = () => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const h = () => setShow(window.scrollY > 400);
    window.addEventListener('scroll', h); return () => window.removeEventListener('scroll', h);
  }, []);
  return (
    <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`fixed bottom-6 right-6 w-12 h-12 bg-secondary text-white rounded-sm flex items-center justify-center shadow-lg z-40 transition-all duration-300 ${show ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      aria-label="Lên đầu trang">
      <span className="material-symbols-outlined text-xl">arrow_upward</span>
    </button>
  );
};
