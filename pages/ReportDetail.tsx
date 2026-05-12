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

const getShareUrl = (path: string) => `${window.location.origin}${path}`;

type ReportComment = {
  id: number;
  author: string;
  content: string;
  createdAt: string;
};

const ReportDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [speaker, setSpeaker] = useState<Speaker | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [commentText, setCommentText] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('Khách tham dự');
  const [comments, setComments] = useState<ReportComment[]>([]);
  const [commentLoading, setCommentLoading] = useState(true);
  const [commentSaving, setCommentSaving] = useState(false);

  useEffect(() => {
    const fetchItem = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('speakers').select('*').eq('id', Number(id)).eq('status', Status.APPROVED).single();
      if (!error) setSpeaker(data);
      setLoading(false);
    };
    fetchItem();
  }, [id]);

  useEffect(() => {
    const fetchComments = async () => {
      setCommentLoading(true);
      const { data, error } = await supabase
        .from('report_comments')
        .select('id, author, content, created_at')
        .eq('report_id', Number(id))
        .order('created_at', { ascending: false });

      if (!error && data) {
        setComments(
          data.map((comment) => ({
            id: comment.id,
            author: comment.author,
            content: comment.content,
            createdAt: new Date(comment.created_at).toLocaleString('vi-VN', {
              dateStyle: 'short',
              timeStyle: 'short',
            }),
          }))
        );
      }
      setCommentLoading(false);
    };

    fetchComments();
  }, [id]);

  const keywords = useMemo(() => speaker?.keywords?.split(',').map((k) => k.trim()).filter(Boolean) || [], [speaker]);

  return (
    <div className="min-h-screen bg-academic-surface text-academic-slate">
      <LandingHeader active="other" showSearch searchValue={searchTerm} onSearchChange={setSearchTerm} logoUrl="/images/logo-vsaps.png" eventName="VSAPS 2026" />

      <main className="mx-auto w-full max-w-none px-4 py-6 sm:px-6 lg:px-8 lg:py-8 2xl:px-10">
        <div className="rounded-3xl border border-border-subtle bg-white p-5 shadow-sm sm:p-6 lg:p-8">
          <FadeIn className="text-sm text-academic-grey">
            <Link to="/" className="transition hover:text-secondary">Trang chủ</Link>
            <span className="mx-2">/</span>
            <Link to="/speakers-list" className="transition hover:text-secondary">Danh sách báo cáo viên</Link>
            <span className="mx-2">/</span>
            <span className="text-academic-navy">Chi tiết báo cáo</span>
          </FadeIn>
        </div>

        {loading ? (
          <div className="mt-6 grid place-items-center rounded-3xl border border-border-subtle bg-white py-24 shadow-sm"><div className="h-12 w-12 animate-spin rounded-full border-4 border-secondary/20 border-t-secondary" /></div>
        ) : !speaker ? (
          <FadeIn className="mt-6">
            <div className="rounded-3xl border border-dashed border-border-subtle bg-white py-16 text-center shadow-sm">
              <p className="text-lg font-bold text-academic-navy">Không tìm thấy bài báo cáo</p>
              <Link to="/speakers-list" className="mt-6 inline-flex rounded-full bg-secondary px-4 py-2 font-bold text-white transition hover:brightness-110">Quay lại danh sách</Link>
            </div>
          </FadeIn>
        ) : (
          <>
            <div className="mt-6 grid gap-6 lg:grid-cols-12 lg:gap-8">
              <article className="space-y-6 lg:col-span-8">
              <FadeIn>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-secondary">{speaker.category || 'Phẫu thuật tạo hình'}</span>
                    <span className="rounded-full border border-border-subtle bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-academic-slate">{speaker.speaker_type === 'Báo cáo viên' ? 'Báo cáo viên trong nước' : 'Khách mời quốc tế'}</span>
                  </div>
                  <h1 className="text-3xl font-black tracking-[-0.033em] text-academic-navy md:text-4xl lg:text-[42px]">{speaker.report_title_vn}</h1>
                </div>
              </FadeIn>

              <FadeIn>
                <div className="rounded-3xl border border-border-subtle bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <img src={speaker.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(speaker.full_name)}&background=random`} alt={speaker.full_name} className="h-12 w-12 rounded-full object-cover" />
                      <div>
                        <p className="text-xs text-academic-grey">{speaker.workplace}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-academic-surface px-3 py-1 font-semibold text-academic-slate">{speaker.speaker_type}</span>
                      <span className="rounded-full bg-academic-surface px-3 py-1 font-semibold text-academic-slate">{speaker.country || 'Việt Nam'}</span>
                    </div>
                  </div>
                </div>
              </FadeIn>

              {speaker.abstract_text && (
                <FadeIn>
                  <section className="rounded-xl border border-border-subtle bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center gap-3 border-b border-border-subtle pb-3">
                      <span className="material-symbols-outlined text-secondary">subject</span>
                      <h2 className="text-lg font-black text-academic-navy">Tóm tắt</h2>
                    </div>
                    <div className="prose max-w-none prose-p:leading-8 prose-p:text-academic-slate prose-headings:text-academic-navy">
                      <div dangerouslySetInnerHTML={{ __html: speaker.abstract_text }} />
                    </div>
                  </section>
                </FadeIn>
              )}

              {speaker.abstract_text_en && (
                <FadeIn>
                  <section className="rounded-xl border border-border-subtle bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center gap-3 border-b border-border-subtle pb-3">
                      <span className="material-symbols-outlined text-secondary">language</span>
                      <h2 className="text-lg font-black text-academic-navy">Abstract (English)</h2>
                    </div>
                    <div className="prose max-w-none prose-p:leading-8 prose-p:text-academic-slate prose-headings:text-academic-navy">
                      <div dangerouslySetInnerHTML={{ __html: speaker.abstract_text_en }} />
                    </div>
                  </section>
                </FadeIn>
              )}

              {keywords.length > 0 && (
                <FadeIn>
                  <section className="rounded-xl border border-border-subtle bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center gap-3 border-b border-border-subtle pb-3">
                      <span className="material-symbols-outlined text-secondary">sell</span>
                      <h2 className="text-lg font-black text-academic-navy">Từ khóa</h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {keywords.map((kw) => <span key={kw} className="rounded-full border border-border-subtle bg-academic-surface px-3 py-1.5 text-sm font-semibold text-academic-slate">{kw}</span>)}
                    </div>
                  </section>
                </FadeIn>
              )}

              <FadeIn>
                <section className="rounded-xl border border-border-subtle bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center gap-3 border-b border-border-subtle pb-3">
                    <span className="material-symbols-outlined text-secondary">chat</span>
                    <h2 className="text-lg font-black text-academic-navy">Bình luận</h2>
                  </div>

                  <div className="space-y-4">
                    {commentLoading ? (
                      <div className="rounded-xl bg-academic-surface p-4 text-sm text-academic-grey">Đang tải bình luận...</div>
                    ) : comments.length === 0 ? (
                      <div className="rounded-xl bg-academic-surface p-4 text-sm text-academic-grey">Chưa có bình luận nào.</div>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment.id} className="rounded-xl bg-academic-surface p-4">
                          <div className="flex items-center justify-between gap-4">
                            <p className="font-bold text-academic-navy">{comment.author}</p>
                            <span className="text-xs text-academic-grey">{comment.createdAt}</span>
                          </div>
                          <p className="mt-2 text-sm leading-7 text-academic-slate">{comment.content}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-5 space-y-3">
                    <input
                      value={commentAuthor}
                      onChange={(e) => setCommentAuthor(e.target.value)}
                      placeholder="Tên của bạn"
                      className="w-full rounded-xl border border-border-subtle bg-white px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10"
                    />
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      rows={4}
                      placeholder="Viết bình luận của bạn..."
                      className="w-full rounded-xl border border-border-subtle bg-white px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10"
                    />
                    <button
                      disabled={commentSaving}
                      onClick={async () => {
                        const text = commentText.trim();
                        const author = commentAuthor.trim();
                        if (!text || !author || !id) return;
                        setCommentSaving(true);
                        const { data, error } = await supabase.from('report_comments').insert({
                          report_id: Number(id),
                          author,
                          content: text,
                        }).select('id, author, content, created_at').single();

                        if (!error && data) {
                          setComments((current) => [
                            {
                              id: data.id,
                              author: data.author,
                              content: data.content,
                              createdAt: new Date(data.created_at).toLocaleString('vi-VN', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              }),
                            },
                            ...current,
                          ]);
                          setCommentText('');
                        }
                        setCommentSaving(false);
                      }}
                      className="rounded-lg bg-secondary px-4 py-2.5 font-bold text-white transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {commentSaving ? 'Đang gửi...' : 'Gửi bình luận'}
                    </button>
                  </div>
                </section>
              </FadeIn>
            </article>

            <aside className="lg:col-span-4 space-y-6">
              <FadeIn>
                <div className="overflow-hidden rounded-xl border border-border-subtle bg-white shadow-sm">
                  <div className="relative aspect-[4/5] bg-white">
                    <img src={speaker.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(speaker.full_name)}&background=random`} alt={speaker.full_name} className="h-full w-full object-contain bg-white" />
                    <div className="absolute inset-0 bg-gradient-to-t from-academic-navy/10 via-transparent to-transparent" />
                  </div>
                  <div className="space-y-4 p-5">
                    <div className="grid gap-2 text-sm text-academic-slate">
                      <div className="flex items-center justify-between gap-4 rounded-lg bg-academic-surface px-3 py-2">
                        <span className="text-academic-grey">Liên lạc</span>
                        <span className="font-semibold text-academic-navy">{speaker.email || speaker.phone || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 rounded-lg bg-academic-surface px-3 py-2">
                        <span className="text-academic-grey">Quốc gia</span>
                        <span className="font-semibold text-academic-navy">{speaker.country || 'Việt Nam'}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 rounded-lg bg-academic-surface px-3 py-2">
                        <span className="text-academic-grey">Vai trò</span>
                        <span className="font-semibold text-academic-navy">{speaker.speaker_type}</span>
                      </div>
                    </div>
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
                  <p className="text-sm font-bold">Chia sẻ qua mạng xã hội</p>
                  <div className="mt-4 flex gap-3">
                    <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl(`/reports/${speaker?.id || id}`))}`} target="_blank" rel="noreferrer" className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-white/10 px-4 text-sm font-semibold hover:bg-white/15">
                      <span className="material-symbols-outlined text-[18px]">facebook</span> Facebook
                    </a>
                    <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getShareUrl(`/reports/${speaker?.id || id}`))}`} target="_blank" rel="noreferrer" className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-white/10 px-4 text-sm font-semibold hover:bg-white/15">
                      <span className="material-symbols-outlined text-[18px]">share</span> LinkedIn
                    </a>
                  </div>
                  <button
                    onClick={async () => {
                      const url = getShareUrl(`/reports/${speaker?.id || id}`);
                      try {
                        await navigator.clipboard.writeText(url);
                      } catch {
                        window.prompt('Sao chép liên kết', url);
                      }
                    }}
                    className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#e6a1ff] px-4 text-sm font-bold text-[#1e0f24] hover:brightness-110"
                  >
                    <span className="material-symbols-outlined text-[18px]">link</span>
                    Sao chép link
                  </button>
                  <Link to="/speakers-list" className="mt-4 block rounded-lg bg-white px-4 py-2.5 text-center font-bold text-[#1e0f24]">Quay lại danh sách diễn giả</Link>
                </div>
              </FadeIn>
            </aside>
            </div>
          </>
        )}
      </main>

      <footer className="mt-20 bg-[#221610] px-4 pb-8 pt-16 text-white md:px-20">
        <div className="mx-auto w-full max-w-none">
          <div className="grid grid-cols-1 gap-10 border-t border-white/10 pt-8 md:grid-cols-3">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-secondary text-lg font-black text-white">VS</div>
                <h2 className="text-xl font-black tracking-tight">VSAPS</h2>
              </div>
              <p className="text-sm leading-7 text-white/60">
                Hội Phẫu thuật Tạo hình Thẩm mỹ Việt Nam là tổ chức nghề nghiệp hàng đầu của các bác sĩ chuyên khoa phẫu thuật thẩm mỹ tại Việt Nam.
              </p>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-secondary">Liên kết nhanh</h4>
              <ul className="space-y-3 text-sm text-white/60">
                <li><a className="hover:text-white" href="#/">Trang chủ</a></li>
                <li><a className="hover:text-white" href="#/speakers-list">Danh sách báo cáo viên</a></li>
                <li><a className="hover:text-white" href="#/register-delegate">Đăng ký tham dự</a></li>
                <li><a className="hover:text-white" href="#/login">Tài khoản</a></li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-secondary">Liên hệ</h4>
              <ul className="space-y-3 text-sm text-white/60">
                <li>786 Nguyễn Kiệm, Gò Vấp, TP.HCM</li>
                <li>(028) 3895 4941</li>
                <li>vsapsevents@gmail.com</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/40 md:flex-row md:items-center md:justify-between">
            <p>© 2026 VSAPS. Bảo lưu mọi quyền.</p>
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

export default ReportDetail;
