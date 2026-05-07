import React, { useState, useEffect, useMemo } from 'react';
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
    'Đài Loan': 'tw'
  };
  return map[country || ''] || 'un';
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
      const matchesSearch =
        s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.workplace.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.academic_rank.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'All' || s.speaker_type === filterType;
      return matchesSearch && matchesType;
    });
  }, [speakers, searchTerm, filterType]);

  /* ═══ HEADER ═══ */
  const Header = () => (
    <nav className="bg-[#061D5F] text-white sticky top-0 z-50 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
        <a href="#/" className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#F95E8B] rounded-sm flex items-center justify-center font-black text-white text-lg">VS</div>
          <div className="h-8 w-px bg-white/20"></div>
          <span className="text-sm font-semibold hidden sm:inline">VSAPS 2026</span>
        </a>
        <div className="hidden lg:flex items-center gap-8">
          <a className="text-sm font-bold hover:text-[#F95E8B] transition-colors" href="#/">Trang chủ</a>
          <a className="text-sm font-bold text-[#F95E8B]" href="#/speakers-list">Diễn giả</a>
          <a className="text-sm font-bold text-white/80 hover:text-[#F95E8B]" href="#/register-delegate">Đăng ký</a>
          <a href="#/login" className="ml-4 px-6 py-2 bg-[#F95E8B] text-white text-sm font-bold rounded-sm hover:brightness-110 transition-all">Đăng nhập →</a>
        </div>
        <button onClick={() => setMenuOpen(!menuOpen)} className="lg:hidden"><span className="material-symbols-outlined text-2xl">menu</span></button>
      </div>
      <div className={`lg:hidden overflow-hidden bg-[#061D5F] border-t border-white/10 transition-all duration-300 ${menuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-6 py-4 space-y-4">
          <a className="block text-sm font-bold text-white/80 hover:text-[#F95E8B]" href="#/">Trang chủ</a>
          <a className="block text-sm font-bold text-[#F95E8B]" href="#/speakers-list">Diễn giả</a>
          <a href="#/login" className="block px-6 py-3 bg-[#F95E8B] text-white text-sm font-bold text-center rounded-sm">Đăng nhập →</a>
        </div>
      </div>
    </nav>
  );

  /* ═══ FOOTER ═══ */
  const Footer = () => (
    <footer className="bg-[#061D5F] text-white px-6 py-12">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#F95E8B] rounded-sm flex items-center justify-center font-black text-xl">VS</div>
            <span className="text-2xl font-black tracking-tighter">VSAPS 2026</span>
          </div>
          <p className="text-white/40 text-sm leading-relaxed max-w-xs font-medium">Hội Phẫu thuật Tạo hình Thẩm mỹ Việt Nam. 11–14 tháng 12, 2026 tại TP.HCM.</p>
        </div>
        <div>
          <h5 className="text-sm font-bold text-[#F95E8B] mb-6">Liên kết</h5>
          <ul className="space-y-3 text-sm font-medium text-white/50">
            <li><a href="#/" className="hover:text-white transition-colors">Trang chủ</a></li>
            <li><a href="#/speakers-list" className="hover:text-white transition-colors">Đội ngũ chuyên gia</a></li>
            <li><a href="#/login" className="hover:text-white transition-colors">Cổng đăng nhập</a></li>
          </ul>
        </div>
        <div>
          <h5 className="text-sm font-bold text-[#F95E8B] mb-6">Thông tin liên hệ</h5>
          <p className="text-sm font-medium text-white/50 leading-relaxed">
            vsapsevents@gmail.com<br/>+84 (28) 3895 4941<br/><br/>786 Nguyễn Kiệm, Gò Vấp, TP.HCM
          </p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-white/10">
        <p className="text-[10px] text-white/20 font-bold">© 2026 VSAPS Conference. All rights reserved.</p>
      </div>
    </footer>
  );

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Header />
      
      <main className="flex-1">
        {/* Banner Section */}
        <div className="bg-[#061D5F] text-white py-20 px-6 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
          <div className="max-w-7xl mx-auto relative z-10">
            <span className="text-[#F95E8B] font-bold text-xs mb-4 block">Scientific Committee</span>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Đội ngũ Chuyên gia</h1>
            <div className="h-1 w-20 bg-[#F95E8B]"></div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="flex flex-col lg:flex-row gap-12">
            
            {/* FILTER SIDEBAR (Left) */}
            <div className="lg:w-1/4">
              <div className="sticky top-28">
                <div className="bg-gray-50 p-8 rounded-sm border border-gray-100">
                  <h3 className="text-xs font-black text-[#061D5F] mb-8">Tìm kiếm chuyên gia</h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="text-[11px] font-bold text-gray-400 mb-3 block">Từ khóa</label>
                      <input
                        type="text"
                        placeholder="Nhập tên hoặc đơn vị..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-sm text-sm focus:ring-1 focus:ring-[#F95E8B] transition-all outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-400 mb-3 block">Phân loại</label>
                      <div className="flex flex-col gap-2">
                        {['All', 'Chủ tọa', 'Báo cáo viên'].map((t) => (
                          <button
                            key={t}
                            onClick={() => setFilterType(t)}
                            className={`text-left px-4 py-3 rounded-sm text-xs font-bold transition-all ${
                              filterType === t 
                              ? 'bg-[#061D5F] text-white' 
                              : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-100'
                            }`}
                          >
                            {t === 'All' ? 'Tất cả' : t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SPEAKER LIST (Right) */}
            <div className="lg:w-3/4">
              {loading ? (
                <div className="space-y-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-32 bg-gray-50 animate-pulse rounded-sm"></div>
                  ))}
                </div>
              ) : filteredSpeakers.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed border-gray-100 rounded-sm">
                  <p className="text-gray-300 font-bold text-sm">Không tìm thấy kết quả phù hợp</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-8">
                  {filteredSpeakers.map((speaker) => (
                    <Link 
                      to={`/reports/${speaker.id}`} 
                      key={speaker.id} 
                      className="group grid grid-cols-10 bg-white border border-gray-100 rounded-sm overflow-hidden hover:border-[#F95E8B] transition-all duration-300"
                    >
                      {/* Image (2/10) */}
                      <div className="col-span-2 relative bg-gray-50 aspect-square lg:aspect-auto overflow-hidden border-r border-gray-50">
                        <img
                          src={speaker.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(speaker.full_name)}&background=random`}
                          alt={speaker.full_name}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      </div>

                      {/* Info (8/10) */}
                      <div className="col-span-8 p-8 flex flex-col justify-center">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="text-[11px] font-bold text-[#F95E8B] mb-1 block">
                              {speaker.academic_rank}
                            </span>
                            <h3 className="text-xl font-black text-[#061D5F] group-hover:text-[#F95E8B] transition-colors">
                              {speaker.full_name}
                            </h3>
                          </div>
                          <span className="text-[10px] font-bold text-gray-300 group-hover:text-[#F95E8B]">Xem chi tiết →</span>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-bold text-gray-500 mb-4">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-gray-200 rounded-full group-hover:bg-[#F95E8B]"></span>
                            {speaker.workplace}
                          </div>
                          <div className="flex items-center gap-1.5 border-l border-gray-200 pl-4">
                            <img 
                              src={`https://flagcdn.com/w20/${getCountryCode(speaker.country)}.png`} 
                              className="w-4 h-auto shadow-sm" 
                              alt={speaker.country || ''} 
                            />
                            <span>{speaker.country || 'Việt Nam'}</span>
                          </div>
                        </div>

                        <div className="pt-5 border-t border-gray-50">
                          <p className="text-[11px] font-bold text-gray-400 mb-1.5">Đề tài báo cáo</p>
                          <p className="text-base font-bold text-[#061D5F] line-clamp-1 italic opacity-70 group-hover:opacity-100 transition-opacity">
                            "{speaker.report_title_vn}"
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PublicSpeakers;
