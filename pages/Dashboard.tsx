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
  <div>
    <h1 className="text-3xl font-bold text-red-600">Truy cập bị từ chối</h1>
    <p className="mt-2 text-gray-600">Bạn không có quyền xem trang này.</p>
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
        const paidSponsorValue = sponsorsData.filter(item => item.status === Status.PAYMENT_CONFIRMED).reduce((sum, item) => sum + (item.amount || 0), 0);

        setStats({
          attendees: submissionsRes.count ?? 0,
          speakers: speakersRes.count ?? 0,
          sponsors: sponsorsData.filter(item => item.status === Status.PAYMENT_CONFIRMED).length,
          tasks: tasksRes.count ?? 0,
          totalSponsorValue,
          paidSponsorValue,
          pendingSponsorValue: totalSponsorValue - paidSponsorValue,
        });

        setRecentSubmissions(recentSubmissionsRes.data || []);
        setRecentSpeakers(recentSpeakersRes.data || []);
        setUpcomingTasks(upcomingTasksRes.data as Task[] || []);
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
  if (loading) return <div>Đang tải dữ liệu bảng điều khiển...</div>;
  if (error) return <div className="text-red-500">Lỗi: {error}</div>;

  return (
    <div className="min-h-screen bg-[#f8f6f6] text-[#221610]">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="rounded-3xl bg-gradient-to-br from-[#1e0f24] to-[#361a41] px-5 py-6 text-white shadow-lg sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.3em] text-[#f7b2d0] font-bold">{role || 'Hệ thống'}</p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.03em] sm:text-4xl">
                Chào mừng trở lại, {profile?.full_name?.split(' ').pop() || 'bạn'}!
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-white/80 sm:text-base">{subtitle}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[520px]">
              {[
                { label: 'Đăng ký', value: stats.attendees.toString(), tone: 'bg-white/10' },
                { label: 'BCV', value: stats.speakers.toString(), tone: 'bg-white/10' },
                { label: 'N.Tài trợ', value: stats.sponsors.toString(), tone: 'bg-white/10' },
                { label: 'Công việc', value: stats.tasks.toString(), tone: 'bg-white/10' },
              ].map((item) => (
                <div key={item.label} className={`rounded-2xl border border-white/10 ${item.tone} px-4 py-3 backdrop-blur-sm`}>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/60">{item.label}</p>
                  <p className="mt-1 text-2xl font-black text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <section className="lg:col-span-8 space-y-6">
            {(isSponsor || isStaff) && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <p className="text-sm text-gray-500">Tổng giá trị tài trợ</p>
                  <p className="mt-2 text-2xl font-black text-blue-600">{new Intl.NumberFormat('vi-VN').format(stats.totalSponsorValue)} đ</p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <p className="text-sm text-gray-500">Đã thanh toán</p>
                  <p className="mt-2 text-2xl font-black text-green-600">{new Intl.NumberFormat('vi-VN').format(stats.paidSponsorValue)} đ</p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <p className="text-sm text-gray-500">Chờ thanh toán</p>
                  <p className="mt-2 text-2xl font-black text-orange-500">{new Intl.NumberFormat('vi-VN').format(stats.pendingSponsorValue)} đ</p>
                </div>
              </div>
            )}

            {isStaff && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Link to="/submissions" className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-center gap-4">
                    <div className="rounded-2xl bg-blue-50 p-3"><UsersIcon className="h-6 w-6 text-blue-500" /></div>
                    <div><p className="text-xs uppercase tracking-widest text-gray-400">Tổng đăng ký</p><p className="text-2xl font-black text-gray-800">{stats.attendees}</p></div>
                  </div>
                </Link>
                <Link to="/speakers-list" className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-center gap-4">
                    <div className="rounded-2xl bg-pink-50 p-3"><SpeakersIcon className="h-6 w-6 text-pink-500" /></div>
                    <div><p className="text-xs uppercase tracking-widest text-gray-400">Báo cáo viên</p><p className="text-2xl font-black text-gray-800">{stats.speakers}</p></div>
                  </div>
                </Link>
                <Link to="/sponsors" className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-center gap-4">
                    <div className="rounded-2xl bg-purple-50 p-3"><SponsorsIcon className="h-6 w-6 text-purple-500" /></div>
                    <div><p className="text-xs uppercase tracking-widest text-gray-400">Nhà tài trợ</p><p className="text-2xl font-black text-gray-800">{stats.sponsors}</p></div>
                  </div>
                </Link>
                <Link to="/tasks" className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-center gap-4">
                    <div className="rounded-2xl bg-slate-50 p-3"><TasksIcon className="h-6 w-6 text-slate-500" /></div>
                    <div><p className="text-xs uppercase tracking-widest text-gray-400">Công việc</p><p className="text-2xl font-black text-gray-800">{stats.tasks}</p></div>
                  </div>
                </Link>
              </div>
            )}

            {isSponsor && (
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-800">Thông tin nhanh dành cho đối tác</h3>
                  <div className="mt-4 space-y-3 text-sm leading-7 text-gray-600">
                    <p>• Tài liệu sự kiện và thông báo hậu cần được cập nhật tại kho tài liệu.</p>
                    <p>• Theo dõi trạng thái tài trợ và các mục hỗ trợ từ Ban tổ chức.</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-800">Hành động nhanh</h3>
                  <div className="mt-4 space-y-3">
                    {quickActions.map((action) => <Link key={action.href} to={action.href} className="block rounded-xl bg-blue-50 px-4 py-3 font-semibold text-blue-700 transition hover:bg-blue-100">{action.label}</Link>)}
                  </div>
                </div>
              </div>
            )}

            {isSpeaker && (
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
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
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-800">Tác vụ nhanh</h3>
                  <div className="mt-4 space-y-3">
                    {quickActions.map((action) => <Link key={action.href} to={action.href} className="block rounded-xl bg-pink-50 px-4 py-3 font-semibold text-pink-700 transition hover:bg-pink-100">{action.label}</Link>)}
                  </div>
                </div>
              </div>
            )}

            {isDelegate && (
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-800">Thông tin tham dự</h3>
                  <div className="mt-4 space-y-3 text-sm leading-7 text-gray-600">
                    <p>• Trạng thái đăng ký: <span className="font-semibold text-gray-800">Đã xác thực</span></p>
                    <p>• Tài liệu hội nghị: <span className="font-semibold text-gray-800">Đã sẵn sàng</span></p>
                    <p>• Chứng chỉ CME: <span className="font-semibold text-gray-800">Sẽ được cập nhật sau sự kiện</span></p>
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-800">Hành động nhanh</h3>
                  <div className="mt-4 space-y-3">
                    {quickActions.map((action) => <Link key={action.href} to={action.href} className="block rounded-xl bg-green-50 px-4 py-3 font-semibold text-green-700 transition hover:bg-green-100">{action.label}</Link>)}
                  </div>
                </div>
              </div>
            )}

            {isVolunteer && (
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
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
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-800">Hỗ trợ nhanh</h3>
                  <div className="mt-4 space-y-3">
                    {quickActions.map((action) => <Link key={action.href} to={action.href} className="block rounded-xl bg-slate-50 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-100">{action.label}</Link>)}
                  </div>
                </div>
              </div>
            )}

            {isStaff && (
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-800">Đăng ký gần đây</h3>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-gray-100 text-xs font-bold uppercase tracking-widest text-gray-400">
                      <tr><th className="pb-3">Họ tên</th><th className="pb-3">Loại</th><th className="pb-3 text-right">Trạng thái</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {recentSubmissions.length > 0 ? recentSubmissions.map((sub) => (
                        <tr key={sub.id} className="transition hover:bg-gray-50">
                          <td className="py-3 font-medium text-gray-700">{sub.full_name}</td>
                          <td className="py-3 text-gray-500">{sub.attendee_type}</td>
                          <td className="py-3 text-right">{sub.status}</td>
                        </tr>
                      )) : <tr><td colSpan={3} className="py-4 text-center text-gray-400">Chưa có đăng ký nào.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          <aside className="lg:col-span-4 space-y-6">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800">Điều hướng nhanh</h3>
              <div className="mt-4 space-y-3">
                {quickActions.map((action) => <Link key={action.href} to={action.href} className="block rounded-xl bg-slate-50 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-100">{action.label}</Link>)}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800">Trạng thái hệ thống</h3>
              <div className="mt-4 space-y-3 text-sm text-gray-600">
                <p>• Giao diện đã tối ưu cho mobile.</p>
                <p>• Dữ liệu hiển thị theo vai trò người dùng.</p>
                <p>• Kết nối Supabase đang hoạt động để tải dữ liệu động.</p>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
