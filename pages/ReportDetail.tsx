import React, { useState, useEffect } from 'react';
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
    'Đài Loan': 'tw'
  };
  return map[country || ''] || 'un';
};

const ReportDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [speaker, setSpeaker] = useState<Speaker | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportDetails();
  }, [id]);

  const fetchReportDetails = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('speakers')
      .select('*')
      .eq('id', Number(id))
      .single();

    if (!error && data) {
      setSpeaker(data);
    }
    setLoading(false);
  };

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
          <Link className="text-xs font-bold uppercase tracking-widest text-[#F95E8B]" to="/speakers-list">Diễn giả</Link>
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
      <main className="flex-1 w-full px-4 sm:px-8 py-8 lg:py-12 max-w-6xl mx-auto">
        <Link to="/speakers-list" className="inline-flex items-center gap-2 text-gray-500 hover:text-[#F95E8B] font-semibold mb-8 transition-colors">
          <span className="material-symbols-outlined text-sm">arrow_back</span> Quay lại danh sách
        </Link>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-[#061D5F]/20 border-t-[#F95E8B] rounded-full animate-spin"></div>
          </div>
        ) : !speaker ? (
          <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100">
            <span className="material-symbols-outlined text-6xl text-gray-300 mb-4 block">error_outline</span>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Không tìm thấy bài báo cáo</h2>
            <p className="text-gray-500">Báo cáo này không tồn tại hoặc đã bị gỡ.</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header Section */}
    <div className="bg-gradient-to-r from-[#061D5F] to-[#1e3a8a] px-8 py-12 text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTAgMEgxMDBWMTAwSDBWMHoiIGZpbGw9InVybCgjZ3JhZGllbnQpIi8+CjxkZWZzPgo8cmFkaWFsR3JhZGllbnQgaWQ9ImdyYWRpZW50IiBjeD0iNTAlIiBjeT0iNTAlIiByPSI4MCUiPgo8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMDYxRDVGIi8+CjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2Y5NWU4YiIvPgo8L3JhZGlhbEdyYWRpZW50Pgo8L2RlZnM+Cjwvc3ZnPg==')] opacity-10"></div>
              <span className="inline-block px-4 py-2 bg-white/20 backdrop-blur-sm text-white text-sm font-bold uppercase rounded-xl tracking-wider mb-8 shadow-lg border border-white/20 inline-flex items-center gap-2">
                <span className="material-symbols-outlined text-xs">label</span>
                {speaker.speaker_type}
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-[0.9] mb-6 drop-shadow-lg">{speaker.report_title_vn}</h1>
              {speaker.report_title_en && (
                <p className="text-xl md:text-2xl text-white/90 italic font-light max-w-2xl leading-relaxed drop-shadow-md">{speaker.report_title_en}</p>
              )}
            </div>

            {/* Content Section */}
            <div className="grid grid-cols-1 lg:grid-cols-5 xl:grid-cols-6 gap-4 lg:gap-6 p-6 lg:p-8 xl:p-10">
              {/* Speaker Info (Left Col) */}
              <div className="lg:col-span-1 xl:col-span-2 space-y-4 sticky lg:top-4 self-start">
                <div className="flex flex-col items-center text-center p-6 bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 group relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#F95E8B]/5 to-blue-500/5 blur-xl"></div>
                  <div className="w-28 h-28 rounded-full border-4 border-white shadow-xl ring-4 ring-white/50 bg-gradient-to-br from-blue-100 to-pink-100 flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform duration-300 mb-4 relative">
                    <img 
                      src={speaker.avatar_url || `https://i.pravatar.cc/160?u=${speaker.id}`} 
                      alt={speaker.full_name} 
                      className="w-28 h-28 rounded-full object-cover shadow-lg"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#F95E8B]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full flex items-end justify-center pb-4">
                      <span className="material-symbols-outlined text-white text-lg font-bold drop-shadow-lg">verified</span>
                    </div>
                  </div>
                  <h3 className="text-2xl lg:text-3xl font-black bg-gradient-to-r from-gray-900 to-[#061D5F] bg-clip-text text-transparent drop-shadow-lg mb-2 px-2 py-1">{speaker.academic_rank} {speaker.full_name}</h3>
                  <p className="text-sm text-gray-500 mt-2 flex flex-col items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">apartment</span>
                      {speaker.workplace}
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/30 mt-3 hover:shadow-xl transition-all duration-300 hover:scale-105">
                      <img 
                        src={`https://flagcdn.com/w40/${getCountryCode(speaker.country)}.png`} 
                        className="w-6 h-auto shadow-md rounded-full ring-2 ring-white/50" 
                        alt={speaker.country || ''} 
                      />
                      <span className="text-sm font-bold uppercase tracking-wider text-gray-800">{speaker.country || 'Việt Nam'}</span>
                    </div>
                  </p>
                </div>
                
                <div className="space-y-4 pt-4">
                  {speaker.abstract_file_url && (
                    <a href={speaker.abstract_file_url} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-800 rounded-2xl hover:from-blue-100 hover:to-indigo-100 transition-all duration-300 font-semibold shadow-md hover:shadow-xl hover:-translate-y-1 border border-blue-100/50">
                      <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:bg-blue-200 transition-colors shadow-lg">
                        <span className="material-symbols-outlined text-xl">description</span>
                      </div>
                      <div>
                        <p className="font-bold text-lg">File Tóm Tắt</p>
                        <p className="text-sm text-blue-700 opacity-80">(Abstract PDF)</p>
                      </div>
                      <span className="ml-auto material-symbols-outlined text-2xl group-hover:rotate-[-10deg] transition-transform">download</span>
                    </a>
                  )}
                  {speaker.report_file_url && (
                    <a href={speaker.report_file_url} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 p-6 bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-800 rounded-2xl hover:from-emerald-100 hover:to-green-100 transition-all duration-300 font-semibold shadow-md hover:shadow-xl hover:-translate-y-1 border border-emerald-100/50">
                      <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center group-hover:bg-emerald-200 transition-colors shadow-lg">
                        <span className="material-symbols-outlined text-xl">picture_as_pdf</span>
                      </div>
                      <div>
                        <p className="font-bold text-lg">File Báo Cáo Đầy Đủ</p>
                        <p className="text-sm text-emerald-700 opacity-80">(Full Report)</p>
                      </div>
                      <span className="ml-auto material-symbols-outlined text-2xl group-hover:rotate-[-10deg] transition-transform">download</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Abstract Content (Main Content) */}
              <div className="lg:col-span-3 lg:pr-12">
                <h2 className="text-3xl lg:text-4xl font-black bg-gradient-to-r from-[#061D5F] to-gray-800 bg-clip-text text-transparent mb-8 flex items-center gap-3 pb-4 border-b-4 border-[#061D5F]/20 pt-4 animate-fade-in">
                  <span className="material-symbols-outlined text-4xl text-[#F95E8B] -rotate-3">article</span>
                  <span>Tóm Tắt Báo Cáo</span>
                </h2>
                {speaker.abstract_text ? (
                  <div 
                    className="prose prose-lg prose-headings:font-black prose-headings:text-[#061D5F] prose-a:text-[#F95E8B] prose-strong:font-bold prose-lead:text-2xl md:text-3xl prose-lead:font-light prose-p:leading-relaxed prose-blockquote:border-l-[#F95E8B] prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:text-slate-700 prose-li:marker:text-[#F95E8B] prose-pre:bg-gray-900 prose-pre:text-white prose-code:bg-gray-100 prose-code:font-mono prose-code:px-2 prose-code:py-1 prose-code:rounded prose-hr:border-[#061D5F]/20 max-w-none text-gray-700 leading-[1.8] p-8 bg-gray-50/50 rounded-3xl backdrop-blur-sm border border-gray-100/50 shadow-inner hover:shadow-md transition-shadow duration-300"
                    dangerouslySetInnerHTML={{ __html: speaker.abstract_text }}
                  />
                ) : (
                  <div className="p-8 border-2 border-dashed border-gray-200 rounded-2xl text-center text-gray-500">
                    Nội dung tóm tắt chưa được cập nhật.
                  </div>
                )}
                {speaker.abstract_text_en && (
                  <div className="mt-12">
                    <h2 className="text-3xl lg:text-4xl font-black bg-gradient-to-r from-[#061D5F] to-gray-800 bg-clip-text text-transparent mb-8 flex items-center gap-3 pb-4 border-b-4 border-[#061D5F]/20 pt-4 animate-fade-in delay-200">
                      <span className="material-symbols-outlined text-4xl text-emerald-500 -rotate-6 scale-110">language</span>
                      <span>Abstract (English)</span>
                    </h2>
                    <div 
                      className="prose prose-lg prose-headings:font-black prose-headings:text-emerald-700 prose-a:text-[#F95E8B] prose-strong:font-bold prose-lead:text-2xl md:text-3xl prose-lead:font-light prose-p:leading-relaxed prose-blockquote:border-l-emerald-500 prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:text-slate-700 prose-li:marker:text-emerald-500 prose-pre:bg-gray-900 prose-pre:text-white prose-code:bg-gray-100 prose-code:font-mono prose-code:px-2 prose-code:py-1 prose-code:rounded prose-hr:border-emerald-500/20 max-w-none text-gray-700 leading-[1.8] p-8 bg-emerald-50/30 rounded-3xl backdrop-blur-sm border border-emerald-100/50 shadow-inner hover:shadow-md transition-shadow duration-300"
                      dangerouslySetInnerHTML={{ __html: speaker.abstract_text_en }}
                    />
                  </div>
                )}
                
                {speaker.keywords && (
                  <div className="mt-8 pt-6 border-t border-gray-100">
                    <h3 className="text-lg font-bold text-gray-700 uppercase tracking-wider mb-6 flex items-center gap-2 pt-8 pb-4 border-t-2 border-gray-100">
                      <span className="material-symbols-outlined text-xl text-[#F95E8B]">sell</span>
                      Từ Khóa Liên Quan
                    </h3>
                    <div className="flex flex-wrap gap-3 p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-3xl border border-gray-100 shadow-md">
                      {speaker.keywords.split(',').map((kw, i) => (
                        <span key={i} className="px-6 py-3 bg-white hover:bg-gradient-to-r hover:from-[#F95E8B] hover:to-pink-500 hover:text-white transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1 hover:scale-105 border border-gray-200 rounded-2xl text-sm font-bold text-gray-800 cursor-pointer group relative overflow-hidden">
                          <span className="relative z-10">#{kw.trim()}</span>
                          <div className="absolute inset-0 bg-gradient-to-r from-[#F95E8B]/0 to-pink-500/0 group-hover:from-[#F95E8B]/20 group-hover:to-pink-500/20"></div>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ReportDetail;
