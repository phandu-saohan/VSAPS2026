import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Speaker, Status } from '../types';

const Reports: React.FC = () => {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'All' | string>('All');

  useEffect(() => {
    fetchApprovedReports();
  }, []);

  const fetchApprovedReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('speakers')
      .select('*')
      .eq('status', Status.APPROVED)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSpeakers(data);
    }
    setLoading(false);
  };

  const filteredReports = useMemo(() => {
    return speakers.filter(s => {
      const typeMatch = filterType === 'All' || s.speaker_type === filterType;
      const searchMatch = !searchTerm || (
        (s.report_title_vn && s.report_title_vn.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.report_title_en && s.report_title_en.toLowerCase().includes(searchTerm.toLowerCase())) ||
        s.full_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      return typeMatch && searchMatch;
    });
  }, [speakers, searchTerm, filterType]);

  const Header = () => (
    <nav className="bg-[#061D5F] text-white sticky top-0 z-50 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#F95E8B] rounded-sm flex items-center justify-center font-black text-white text-lg">VS</div>
          <div className="h-8 w-px bg-white/20"></div>
          <span className="text-sm font-semibold tracking-widest uppercase hidden sm:inline">VSAPS 2026</span>
        </Link>
        <div className="hidden lg:flex items-center gap-6">
          <Link className="text-xs font-bold uppercase tracking-widest hover:text-[#F95E8B] transition-colors" to="/">Trang chủ</Link>
          <Link className="text-xs font-bold uppercase tracking-widest text-[#F95E8B]" to="/reports">Danh sách báo cáo</Link>
          <Link className="text-xs font-bold uppercase tracking-widest text-white/80 hover:text-[#F95E8B]" to="/register-delegate">Đăng ký Đại biểu</Link>
          <Link to="/login" className="ml-4 px-5 py-2 bg-[#F95E8B] text-white text-xs font-bold uppercase rounded-sm hover:brightness-110 transition-all">Đăng nhập →</Link>
        </div>
      </div>
    </nav>
  );

  const Footer = () => (
    <footer className="bg-[#061D5F] text-white px-6 py-12 mt-auto">
      <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-white/10 text-center">
        <p className="text-[10px] text-white/30 uppercase tracking-widest">© 2026 VSAPS. Bảo lưu mọi quyền.</p>
      </div>
    </footer>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] font-sans">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold text-[#061D5F] mb-4">Danh sách Bài báo cáo</h1>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Khám phá các bài báo cáo khoa học từ các chuyên gia hàng đầu tại hội nghị VSAPS 2026.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-8 justify-center">
          <input
            type="text"
            placeholder="Tìm kiếm tên bài báo cáo, báo cáo viên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-96 px-5 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F95E8B]"
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full sm:w-48 px-5 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#F95E8B]"
          >
            <option value="All">Tất cả vai trò</option>
            <option value="Báo cáo viên">Báo cáo viên</option>
            <option value="Chủ tọa">Chủ tọa</option>
            <option value="Chủ tọa/Báo cáo viên">Chủ tọa/Báo cáo viên</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-[#061D5F]/20 border-t-[#F95E8B] rounded-full animate-spin"></div>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100">
            <span className="material-symbols-outlined text-6xl text-gray-300 mb-4 block">search_off</span>
            <p className="text-gray-500 font-medium">Không tìm thấy bài báo cáo nào phù hợp.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReports.map(speaker => (
              <Link to={`/reports/${speaker.id}`} key={speaker.id} className="group bg-white rounded-3xl shadow-sm border border-gray-100 p-6 hover:shadow-xl transition-all flex flex-col h-full hover:-translate-y-1">
                <div className="flex items-start gap-4 mb-4">
                  <img src={speaker.avatar_url || `https://i.pravatar.cc/150?u=${speaker.id}`} alt={speaker.full_name} className="w-16 h-16 rounded-full object-cover border-2 border-gray-100 group-hover:border-[#F95E8B] transition-colors" />
                  <div>
                    <h3 className="font-bold text-gray-900 group-hover:text-[#F95E8B] transition-colors line-clamp-1">{speaker.academic_rank} {speaker.full_name}</h3>
                    <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{speaker.workplace}</p>
                    <span className="inline-block px-2 py-1 mt-2 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase rounded-md tracking-wider">
                      {speaker.speaker_type}
                    </span>
                  </div>
                </div>
                <div className="flex-1 mt-2">
                  <h4 className="text-lg font-bold text-[#061D5F] leading-snug line-clamp-3 mb-2">
                    {speaker.report_title_vn}
                  </h4>
                  {speaker.report_title_en && (
                    <p className="text-sm text-gray-500 italic line-clamp-2">
                      {speaker.report_title_en}
                    </p>
                  )}
                </div>
                <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center text-sm font-semibold text-[#F95E8B] group-hover:text-blue-600">
                  <span>Xem chi tiết</span>
                  <span className="material-symbols-outlined transform group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Reports;
