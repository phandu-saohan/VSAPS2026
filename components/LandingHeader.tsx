import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface LandingHeaderProps {
  active?: 'home' | 'speakers' | 'register' | 'login' | 'other';
  showSearch?: boolean;
  onSearchChange?: (value: string) => void;
  searchValue?: string;
  logoUrl?: string;
  eventName?: string;
}

const linkBase = 'text-white/90 hover:text-[#f7b2d0] transition-colors';

const LandingHeader: React.FC<LandingHeaderProps> = ({ active = 'other', showSearch = false, onSearchChange, searchValue = '', logoUrl, eventName = 'VSAPS 2026' }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const logoSrc = logoUrl || '/images/logo-vsaps.png';

  return (
    <header className="sticky top-0 z-50 bg-academic-navy text-white border-b border-white/10">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 py-2.5 sm:py-3">
          <Link to="/" className="flex items-center gap-2 min-w-0 flex-1 sm:flex-initial">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center overflow-hidden rounded-sm bg-white/5 ring-1 ring-white/10 flex-shrink-0">
              <img src={logoSrc} alt={eventName} className="h-full w-full object-contain p-1" />
            </div>
            <div className="hidden sm:block h-8 w-px bg-white/20" />
            <span className="min-w-0 truncate text-[11px] sm:text-sm font-semibold uppercase tracking-[0.18em] sm:tracking-widest leading-tight max-w-[8rem] sm:max-w-none whitespace-nowrap">
              {eventName}
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-8">
            <Link className={`${linkBase} text-xs font-bold uppercase tracking-widest ${active === 'home' ? 'text-secondary' : ''}`} to="/">Giới thiệu</Link>
            <a className={`${linkBase} text-xs font-bold uppercase tracking-widest`} href="#program">Chương trình</a>
            <Link className={`${linkBase} text-xs font-bold uppercase tracking-widest ${active === 'speakers' ? 'text-secondary' : ''}`} to="/speakers-list">Diễn giả</Link>
            <a className={`${linkBase} text-xs font-bold uppercase tracking-widest`} href="#venue">Địa điểm</a>
            <Link className={`${linkBase} text-xs font-bold uppercase tracking-widest ${active === 'register' ? 'text-secondary' : ''}`} to="/register-delegate">Đăng ký</Link>
            <Link to="/login" className="ml-4 px-6 py-2 bg-secondary text-white text-xs font-bold uppercase rounded-sm hover:brightness-110 transition-all">Đăng nhập →</Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {showSearch && (
              <div className="hidden sm:flex items-center bg-white/10 rounded-full px-3 py-1.5 w-64 border border-white/10 focus-within:border-secondary/50 transition-all">
                <span className="material-symbols-outlined text-white/60 text-[20px]">search</span>
                <input
                  className="bg-transparent border-none focus:ring-0 text-sm w-full text-white placeholder:text-white/50"
                  placeholder="Tìm kiếm bài viết..."
                  type="text"
                  value={searchValue}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                />
              </div>
            )}
            <button onClick={() => setMenuOpen((v) => !v)} className="lg:hidden text-white focus:outline-none" aria-label="Menu">
              <span className="material-symbols-outlined text-2xl">menu</span>
            </button>
          </div>
        </div>

        <div className={`lg:hidden overflow-hidden border-t border-white/10 transition-all duration-300 ${menuOpen ? 'max-h-[32rem] opacity-100 py-4' : 'max-h-0 opacity-0'}`}>
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2">
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-sm bg-white/5 ring-1 ring-white/10 flex-shrink-0">
                <img src={logoSrc} alt={eventName} className="h-full w-full object-contain p-1" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.16em] text-white leading-tight">{eventName}</p>
                <p className="text-[10px] text-white/50 leading-tight">VSAPS</p>
              </div>
            </div>
            <Link className="block text-xs font-bold uppercase tracking-widest text-secondary" to="/">Giới thiệu</Link>
            <a className="block text-xs font-bold uppercase tracking-widest text-white/80 hover:text-secondary" href="#program">Chương trình</a>
            <Link className="block text-xs font-bold uppercase tracking-widest text-white/80 hover:text-secondary" to="/speakers-list">Diễn giả</Link>
            <a className="block text-xs font-bold uppercase tracking-widest text-white/80 hover:text-secondary" href="#venue">Địa điểm</a>
            <Link className="block text-xs font-bold uppercase tracking-widest text-white/80 hover:text-secondary" to="/register-delegate">Đăng ký</Link>
            <Link to="/login" className="block px-6 py-3 bg-secondary text-white text-xs font-bold uppercase text-center rounded-sm">Đăng nhập →</Link>
          </div>
        </div>
      </div>
    </header>

          <div className="flex items-center gap-3">
            {showSearch && (
              <div className="hidden sm:flex items-center bg-white/10 rounded-full px-3 py-1.5 w-64 border border-white/10 focus-within:border-secondary/50 transition-all">
                <span className="material-symbols-outlined text-white/60 text-[20px]">search</span>
                <input
                  className="bg-transparent border-none focus:ring-0 text-sm w-full text-white placeholder:text-white/50"
                  placeholder="Tìm kiếm bài viết..."
                  type="text"
                  value={searchValue}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                />
              </div>
            )}
            <button onClick={() => setMenuOpen((v) => !v)} className="lg:hidden text-white focus:outline-none" aria-label="Menu">
              <span className="material-symbols-outlined text-2xl">menu</span>
            </button>
          </div>
        </div>

        <div className={`lg:hidden overflow-hidden border-t border-white/10 transition-all duration-300 ${menuOpen ? 'max-h-[32rem] opacity-100 py-4' : 'max-h-0 opacity-0'}`}>
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-2">
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-sm bg-white/5 ring-1 ring-white/10">
                <img src={logoSrc} alt={eventName} className="h-full w-full object-contain p-1" />
              </div>
              <div className="min-w-0">
                <p className="whitespace-nowrap text-xs font-bold uppercase tracking-widest text-white">{eventName}</p>
                <p className="text-[11px] text-white/50">VSAPS</p>
              </div>
            </div>
            <Link className="block text-xs font-bold uppercase tracking-widest text-secondary" to="/">Giới thiệu</Link>
            <a className="block text-xs font-bold uppercase tracking-widest text-white/80 hover:text-secondary" href="#program">Chương trình</a>
            <Link className="block text-xs font-bold uppercase tracking-widest text-white/80 hover:text-secondary" to="/speakers-list">Diễn giả</Link>
            <a className="block text-xs font-bold uppercase tracking-widest text-white/80 hover:text-secondary" href="#venue">Địa điểm</a>
            <Link className="block text-xs font-bold uppercase tracking-widest text-white/80 hover:text-secondary" to="/register-delegate">Đăng ký</Link>
            <Link to="/login" className="block px-6 py-3 bg-secondary text-white text-xs font-bold uppercase text-center rounded-sm">Đăng nhập →</Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default LandingHeader;
