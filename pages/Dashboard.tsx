import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Status, Task, Submission, Speaker } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { UsersIcon } from '../components/icons/UsersIcon';
import { SponsorsIcon } from '../components/icons/SponsorsIcon';
import { TasksIcon } from '../components/icons/TasksIcon';
import { SpeakersIcon } from '../components/icons/SpeakersIcon';

type DashboardRole = 'Quản trị viên' | 'Thành viên BTC' | 'Tình nguyện viên' | 'Báo cáo viên' | 'Đại biểu' | 'Nhà tài trợ';

const formatDate = (dateString?: string | null) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Ngày không hợp lệ';
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const AccessDenied: React.FC = () => (
  <div className="min-h-screen bg-[#f8f6f6] px-4 py-10">
    <div className="mx-auto max-w-2xl rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
      <h1 className="text-3xl font-black text-red-600">Truy cập bị từ chối</h1>
      <p className="mt-3 text-gray-600">Bạn không có quyền xem trang này.</p>
    </div>
  </div>
);

const StatCard: React.FC<{ label: string; value: string; accent: string }> = ({ label, value, accent }) => (
  <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
    <p className="text-sm text-gray-500">{label}</p>
    <p className={`mt-2 text-3xl font-black ${accent}`}>{value}</p>
  </div>
);

const Dashboard: React.FC = () => {
  const { profile, hasPermission } = useAuth();
  const role = profile?.role as DashboardRole | undefined;
  const isSponsor = role === 'Nhà tài trợ';
  const isSpeaker = role === 'Báo cáo viên';
  const isDelegate = role === 'Đại biểu';
  const isVolunteer = role === 'Tình nguyện viên';
  const isStaff = role === 'Quản trị viên' || role === 'Thành viên BTC';

  const [stats, setStats] = useState({
    attendees: 0,
    speakers: 0,
    sponsors: 0,
    tasks: 0,
    totalSponsorValue: 0,
    paidSponsorValue: 0,
    pendingSponsorValue: 0,
  });
  const [recentSubmissions, setRecentSubmissions] = useState<Partial<Submission>[]>([]);
  const [recentSpeakers, setRecentSpeakers] = useState<Partial<Speaker>[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (isSponsor) {
          const { data, error: sponsorError } = await supabase
            .from('sponsors')
            .select('amount, status')
            .eq('user_id', profile?.id)
            .single();

          if (sponsorError && sponsorError.code !== 'PGRST116') throw sponsorError;

          const totalSponsorValue = data?.amount || 0;
          const paidSponsorValue = data?.status === Status.PAYMENT_CONFIRMED ? totalSponsorValue : 0;

          setStats({
            attendees: 0,
            speakers: 0,
            sponsors: data?.status === Status.PAYMENT_CONFIRMED ? 1 : 0,
            tasks: 0,
            totalSponsorValue,
            paidSponsorValue,
            pendingSponsorValue: totalSponsorValue - paidSponsorValue,
          });
          setRecentSubmissions([]);
          setRecentSpeakers([]);
          setUpcomingTasks([]);
          return;
        }

        const [submissionsRes, speakersRes, sponsorsRes, tasksRes, recentSubmissionsRes, recentSpeakersRes, upcomingTasksRes] = await Promise.all([
          supabase.from('submissions').select('status', { count: 'exact' }),
          supabase.from('speakers').select('id', { count: 'exact', head: true }).eq('status', Status.APPROVED),
          supabase.from('sponsors').select('amount, status'),
          supabase.from('tasks').select('id', { count: 'exact', head: true }).neq('status', Status.COMPLETED),
          supabase.from('submissions').select('id, full_name, status, attendee_type, registration_time').order('registration_time', { ascending: false }).limit(5),
          supabase.from('speakers').select('id, full_name, report_title_vn, status, academic_rank').order('id', { ascending: false }).limit(5),
          supabase.from('tasks').select('*, profiles(full_name, avatar)').neq('status', Status.COMPLETED).order('due_date', { ascending: true }).limit(5),
        ]);

        if (submissionsRes.error) throw submissionsRes.error;
        if (speakersRes.error) throw speakersRes.error;
        if (sponsorsRes.error) throw sponsorsRes.error;
        if (tasksRes.error) throw tasksRes.error;
        if (recentSubmissionsRes.error) throw recentSubmissionsRes.error;
        if (recentSpeakersRes.error) throw recentSpeakersRes.error;
        if (upcomingTasksRes.error) throw upcomingTasksRes.error;

        const sponsorsData = sponsorsRes.data || [];
        const totalSponsorValue = sponsorsData.reduce((sum, item) => sum + (item.amount || 0), 0);
        const paidSponsorValue = sponsorsData.filter((item) => item.status === Status.PAYMENT_CONFIRMED).reduce((sum, item) => sum + (item.amount || 0), 0);

        setStats({
          attendees: submissionsRes.count ?? 0,
          speakers: speakersRes.count ?? 0,
          sponsors: sponsorsData.filter((item) => item.status === Status.PAYMENT_CONFIRMED).length,
          tasks: tasksRes.count ?? 0,
          totalSponsorValue,
          paidSponsorValue,
          pendingSponsorValue: totalSponsorValue - paidSponsorValue,
        });

        setRecentSubmissions(recentSubmissionsRes.data || []);
        setRecentSpeakers(recentSpeakersRes.data || []);
        setUpcomingTasks((upcomingTasksRes.data as Task[]) || []);
      } catch (err: any) {
        setError(err.message || 'Đã xảy ra lỗi khi tải dữ liệu.');
      } finally {
        setLoading(false);
      }
    };

    if (hasPermission('dashboard:view')) fetchDashboardData();
    else setLoading(false);
  }, [hasPermission, isSponsor, profile?.id]);

  const quickActions = useMemo(() => {
    const items = [
      { label: 'Đăng ký', href: '/submissions' },
      { label: 'Công việc', href: '/tasks' },
      { label: 'Nhà tài trợ', href: '/sponsors' },
      { label: 'Tài chính', href: '/finance' },
    ];

    if (isSponsor) return [{ label: 'Kho tài liệu', href: '/documents' }, { label: 'Chương trình', href: '/program' }];
    if (isSpeaker) return [{ label: 'Cập nhật báo cáo', href: '/speaker-registration' }, { label: 'Tài liệu', href: '/documents' }, { label: 'Chương trình', href: '/program' }];
    if (isDelegate) return [{ label: 'Kho tài liệu', href: '/documents' }, { label: 'Chương trình', href: '/program' }];
    if (isVolunteer) return [{ label: 'Xem công việc', href: '/tasks' }, { label: 'Chương trình', href: '/program' }];
    return items;
  }, [isSponsor, isSpeaker, isDelegate, isVolunteer]);

  const subtitle = isSponsor
    ? 'Theo dõi tài trợ, tài liệu và hỗ trợ đối tác.'
    : isSpeaker
      ? 'Quản lý báo cáo, trạng thái duyệt và tài liệu.'
      : isDelegate
        ? 'Xem thông tin tham dự và tài liệu hội nghị.'
        : isVolunteer
          ? 'Tập trung vào công việc được giao và hỗ trợ vận hành.'
          : 'Đây là tổng quan nhanh về sự kiện VSAPS 2026.';

  if (!hasPermission('dashboard:view')) return <AccessDenied />;
  if (loading) return <div className="min-h-screen bg-[#f8f6f6] px-4 py-10 text-center text-sm text-gray-500">Đang tải dữ liệu bảng điều khiển...</div>;
  if (error) return <div className="min-h-screen bg-[#f8f6f6] px-4 py-10 text-center text-red-500">Lỗi: {error}</div>;

  return (
    <div className="min-h-screen bg-[#f8f6f6] text-[#221610]">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-secondary">{role || 'Hệ thống'}</p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.03em] text-gray-800 sm:text-4xl">
                Chào mừng trở lại, {profile?.full_name?.split(' ').pop() || 'bạn'}!
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-gray-600 sm:text-base">{subtitle}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[520px]">
              <StatCard label="Đăng ký" value={String(stats.attendees)} accent="text-blue-600" />
              <StatCard label="BCV" value={String(stats.speakers)} accent="text-pink-600" />
              <StatCard label="N.Tài trợ" value={String(stats.sponsors)} accent="text-purple-600" />
              <StatCard label="Công việc" value={String(stats.tasks)} accent="text-slate-700" />
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8 space-y-6">
            {(isSponsor || isStaff) && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard label="Tổng giá trị tài trợ" value={`${new Intl.NumberFormat('vi-VN').format(stats.totalSponsorValue)} đ`} accent="text-blue-600" />
                <StatCard label="Đã thanh toán" value={`${new Intl.NumberFormat('vi-VN').format(stats.paidSponsorValue)} đ`} accent="text-green-600" />
                <StatCard label="Chờ thanh toán" value={`${new Intl.NumberFormat('vi-VN').format(stats.pendingSponsorValue)} đ`} accent="text-orange-500" />
              </div>
            )}

            {isStaff && (
              <div className="rounded-3xl border border-gray-100 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">Tổng quan hệ thống</h2>
                    <p className="text-sm text-gray-500">Thống kê nhanh theo vai trò và trạng thái</p>
                  </div>
                  <Link to="/submissions" className="rounded-full bg-[#eb248e] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#d61f81]">+ Thêm giao dịch</Link>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-gray-50 text-xs font-bold uppercase tracking-widest text-gray-400">
                      <tr>
                        <th className="px-5 py-4">Chỉ số</th>
                        <th className="px-5 py-4">Giá trị</th>
                        <th className="px-5 py-4">Mô tả</th>
                        <th className="px-5 py-4 text-right">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {[
                        { label: 'Đăng ký', value: stats.attendees, desc: 'Tổng số đăng ký hiện tại', href: '/submissions' },
                        { label: 'Báo cáo viên', value: stats.speakers, desc: 'Báo cáo viên đã duyệt', href: '/speakers-list' },
                        { label: 'Nhà tài trợ', value: stats.sponsors, desc: 'Số nhà tài trợ đã xác nhận', href: '/sponsors' },
                        { label: 'Công việc', value: stats.tasks, desc: 'Công việc đang mở', href: '/tasks' },
                      ].map((row) => (
                        <tr key={row.label} className="hover:bg-gray-50">
                          <td className="px-5 py-4 font-medium text-gray-700">{row.label}</td>
                          <td className="px-5 py-4 text-lg font-black text-[#1e0f24]">{row.value}</td>
                          <td className="px-5 py-4 text-gray-500">{row.desc}</td>
                          <td className="px-5 py-4 text-right">
                            <Link to={row.href} className="font-semibold text-secondary hover:underline">Xem</Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4 text-sm text-gray-500">
                  <span>Hiển thị 4 mục nhanh</span>
                  <div className="flex gap-2">
                    <button className="rounded-full border border-gray-200 px-3 py-1.5 disabled:opacity-50" disabled>Trước</button>
                    <button className="rounded-full border border-gray-200 px-3 py-1.5 disabled:opacity-50" disabled>Sau</button>
                  </div>
                </div>
              </div>
            )}

            {isSponsor && (
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-800">Thông tin nhanh dành cho đối tác</h3>
                  <div className="mt-4 space-y-3 text-sm leading-7 text-gray-600">
                    <p>• Tài liệu sự kiện và thông báo hậu cần được cập nhật tại kho tài liệu.</p>
                    <p>• Theo dõi trạng thái tài trợ và các mục hỗ trợ từ Ban tổ chức.</p>
                  </div>
                </div>
                <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-800">Hành động nhanh</h3>
                  <div className="mt-4 space-y-3">
                    {quickActions.map((action) => (
                      <Link key={action.href} to={action.href} className="block rounded-xl bg-blue-50 px-4 py-3 font-semibold text-blue-700 transition hover:bg-blue-100">{action.label}</Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {isSpeaker && (
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-800">Bài báo cáo gần đây</h3>
                  <div className="mt-4 space-y-4">
                    {recentSpeakers.length > 0 ? recentSpeakers.map((sp) => (
                      <div key={sp.id} className="border-b border-gray-100 pb-3 last:border-b-0">
                        <p className="font-semibold text-gray-800">{sp.full_name}</p>
                        <p className="text-sm text-gray-500 line-clamp-2">{sp.report_title_vn}</p>
                        <p className="mt-1 text-xs text-gray-400">{sp.status}</p>
                      </div>
                    )) : <p className="text-sm text-gray-400">Chưa có báo cáo viên nào.</p>}
                  </div>
                </div>
                <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-800">Tác vụ nhanh</h3>
                  <div className="mt-4 space-y-3">
                    {quickActions.map((action) => (
                      <Link key={action.href} to={action.href} className="block rounded-xl bg-pink-50 px-4 py-3 font-semibold text-pink-700 transition hover:bg-pink-100">{action.label}</Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {isDelegate && (
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-800">Thông tin tham dự</h3>
                  <div className="mt-4 space-y-3 text-sm leading-7 text-gray-600">
                    <p>• Trạng thái đăng ký: <span className="font-semibold text-gray-800">Đã xác thực</span></p>
                    <p>• Tài liệu hội nghị: <span className="font-semibold text-gray-800">Đã sẵn sàng</span></p>
                    <p>• Chứng chỉ CME: <span className="font-semibold text-gray-800">Sẽ được cập nhật sau sự kiện</span></p>
                  </div>
                </div>
                <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-800">Hành động nhanh</h3>
                  <div className="mt-4 space-y-3">
                    {quickActions.map((action) => (
                      <Link key={action.href} to={action.href} className="block rounded-xl bg-green-50 px-4 py-3 font-semibold text-green-700 transition hover:bg-green-100">{action.label}</Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {isVolunteer && (
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-800">Công việc của bạn</h3>
                  <div className="mt-4 space-y-4">
                    {upcomingTasks.length > 0 ? upcomingTasks.slice(0, 3).map((task) => (
                      <div key={task.id} className="border-b border-gray-100 pb-3 last:border-b-0">
                        <p className="font-semibold text-gray-800">{task.title}</p>
                        <p className="text-sm text-gray-500">Hạn: {formatDate(task.due_date)}</p>
                      </div>
                    )) : <p className="text-sm text-gray-400">Chưa có công việc được giao.</p>}
                  </div>
                </div>
                <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-800">Hỗ trợ nhanh</h3>
                  <div className="mt-4 space-y-3">
                    {quickActions.map((action) => (
                      <Link key={action.href} to={action.href} className="block rounded-xl bg-slate-50 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-100">{action.label}</Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!isStaff && !isSponsor && !isSpeaker && !isDelegate && !isVolunteer && (
              <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                <p className="text-sm text-gray-500">Chưa có nội dung phù hợp với vai trò của bạn.</p>
              </div>
            )}
          </div>

          <aside className="lg:col-span-4 space-y-6">
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800">Điều hướng nhanh</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {quickActions.map((action) => (
                  <Link key={action.href} to={action.href} className="block rounded-xl bg-slate-50 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-100">{action.label}</Link>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800">Trạng thái hệ thống</h3>
              <div className="mt-4 space-y-3 text-sm text-gray-600">
                <p>• Giao diện tối ưu theo phong cách bảng tài chính.</p>
                <p>• Các thẻ số liệu được trình bày rõ ràng, sạch sẽ.</p>
                <p>• Hỗ trợ tốt hơn trên màn hình nhỏ.</p>
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
