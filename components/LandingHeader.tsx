import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface LandingHeaderProps {
  active?: 'home' | 'speakers' | 'register' | 'login' | 'other';
  showSearch?: boolean;
  onSearchChange?: (value: string) => void;
  searchValue?: string;
}

const linkBase = 'text-white/90 hover:text-[#f7b2d0] transition-colors';

const LandingHeader: React.FC<LandingHeaderProps> = ({ active = 'other', showSearch = false, onSearchChange, searchValue = '' }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-academic-navy text-white border-b border-white/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 py-3">
          <Link to="/" className="flex items-center gap-4">
            <div className="w-10 h-10 bg-secondary rounded-sm flex items-center justify-center font-black text-white text-lg tracking-tighter">VS</div>
            <div className="h-8 w-px bg-white/20" />
            <span className="text-sm font-semibold tracking-widest uppercase hidden sm:inline">VSAPS 2026</span>
          </Link>

          <div className="hidden lg:flex items-center gap-8">
            <Link className={`${linkBase} text-xs font-bold uppercase tracking-widest ${active === 'home' ? 'text-secondary' : ''}`} to="/">Giới thiệu</Link>
            <a className={`${linkBase} text-xs font-bold uppercase tracking-widest`} href="#program">Chương trình</a>
            <Link className={`${linkBase} text-xs font-bold uppercase tracking-widest ${active === 'speakers' ? 'text-secondary' : ''}`} to="/speakers-list">Diễn giả</Link>
            <a className={`${linkBase} text-xs font-bold uppercase tracking-widest`} href="#venue">Địa điểm</a>
            <Link className={`${linkBase} text-xs font-bold uppercase tracking-widest ${active === 'register' ? 'text-secondary' : ''}`} to="/register-delegate">Đăng ký</Link>
            <Link to="/login" className="ml-4 px-6 py-2 bg-secondary text-white text-xs font-bold uppercase rounded-sm hover:brightness-110 transition-all">Đăng nhập →</Link>
          </div>

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

        <div className={`lg:hidden overflow-hidden border-t border-white/10 transition-all duration-300 ${menuOpen ? 'max-h-80 opacity-100 py-4' : 'max-h-0 opacity-0'}`}>
          <div className="space-y-4">
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
