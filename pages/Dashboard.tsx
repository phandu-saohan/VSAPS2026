import React, { useEffect, useMemo, useState } from 'react';
import LandingHeader from '../components/LandingHeader';
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
    <div className="min-h-screen bg-[#f8f6f6]">
      <LandingHeader active="other" logoUrl="/images/logo-vsaps.png" eventName="VSAPS 2026" />
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <p className="text-xs uppercase tracking-[0.3em] text-secondary font-bold">{role || 'Hệ thống'}</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-800">Chào mừng trở lại, {profile?.full_name?.split(' ').pop()}!</h1>
        <p className="mt-2 text-gray-600">{subtitle}</p>
      </div>

      {(isSponsor || isStaff) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <p className="text-[13px] text-gray-400 font-medium mb-2">Tổng giá trị tài trợ</p>
            <p className="text-3xl font-bold text-blue-600">{new Intl.NumberFormat('vi-VN').format(stats.totalSponsorValue)} đ</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <p className="text-[13px] text-gray-400 font-medium mb-2">Đã thanh toán</p>
            <p className="text-3xl font-bold text-green-600">{new Intl.NumberFormat('vi-VN').format(stats.paidSponsorValue)} đ</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <p className="text-[13px] text-gray-400 font-medium mb-2">Chờ thanh toán</p>
            <p className="text-3xl font-bold text-orange-500">{new Intl.NumberFormat('vi-VN').format(stats.pendingSponsorValue)} đ</p>
          </div>
        </div>
      )}

      {isStaff && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link to="/submissions" className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center space-x-4">
            <div className="p-3 rounded-2xl bg-blue-50"><UsersIcon className="w-6 h-6 text-blue-500" /></div>
            <div><p className="text-[12px] text-gray-400 font-medium">Tổng đăng ký</p><p className="text-2xl font-bold text-gray-800">{stats.attendees}</p></div>
          </Link>
          <Link to="/speakers-list" className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center space-x-4">
            <div className="p-3 rounded-2xl bg-pink-50"><SpeakersIcon className="w-6 h-6 text-pink-500" /></div>
            <div><p className="text-[12px] text-gray-400 font-medium">Báo cáo viên</p><p className="text-2xl font-bold text-gray-800">{stats.speakers}</p></div>
          </Link>
          <Link to="/sponsors" className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center space-x-4">
            <div className="p-3 rounded-2xl bg-purple-50"><SponsorsIcon className="w-6 h-6 text-purple-500" /></div>
            <div><p className="text-[12px] text-gray-400 font-medium">Nhà tài trợ</p><p className="text-2xl font-bold text-gray-800">{stats.sponsors}</p></div>
          </Link>
          <Link to="/tasks" className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center space-x-4">
            <div className="p-3 rounded-2xl bg-slate-50"><TasksIcon className="w-6 h-6 text-slate-500" /></div>
            <div><p className="text-[12px] text-gray-400 font-medium">Công việc</p><p className="text-2xl font-bold text-gray-800">{stats.tasks}</p></div>
          </Link>
        </div>
      )}

      {isSponsor && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Thông tin nhanh dành cho đối tác</h3>
            <div className="space-y-4 text-sm text-gray-600">
              <p>• Tài liệu sự kiện và thông báo hậu cần được cập nhật tại kho tài liệu.</p>
              <p>• Theo dõi trạng thái tài trợ và các mục hỗ trợ từ Ban tổ chức.</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Hành động nhanh</h3>
            <div className="space-y-3">
              {quickActions.map(action => <Link key={action.href} to={action.href} className="block px-4 py-3 rounded-xl bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100">{action.label}</Link>)}
            </div>
          </div>
        </div>
      )}

      {isSpeaker && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Bài báo cáo gần đây</h3>
            <div className="space-y-4">
              {recentSpeakers.length > 0 ? recentSpeakers.map(sp => (
                <div key={sp.id} className="border-b border-gray-100 pb-3 last:border-b-0">
                  <p className="font-medium text-gray-700">{sp.full_name}</p>
                  <p className="text-sm text-gray-500 truncate">{sp.report_title_vn}</p>
                  <p className="text-xs text-gray-400 mt-1">{sp.status}</p>
                </div>
              )) : <p className="text-sm text-gray-400">Chưa có báo cáo viên nào.</p>}
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Tác vụ nhanh</h3>
            <div className="space-y-3">
              {quickActions.map(action => <Link key={action.href} to={action.href} className="block px-4 py-3 rounded-xl bg-pink-50 text-pink-700 font-semibold hover:bg-pink-100">{action.label}</Link>)}
            </div>
          </div>
        </div>
      )}

      {isDelegate && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Thông tin tham dự</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <p>• Trạng thái đăng ký: <span className="font-semibold text-gray-800">Đã xác thực</span></p>
              <p>• Tài liệu hội nghị: <span className="font-semibold text-gray-800">Đã sẵn sàng</span></p>
              <p>• Chứng chỉ CME: <span className="font-semibold text-gray-800">Sẽ được cập nhật sau sự kiện</span></p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Hành động nhanh</h3>
            <div className="space-y-3">
              {quickActions.map(action => <Link key={action.href} to={action.href} className="block px-4 py-3 rounded-xl bg-green-50 text-green-700 font-semibold hover:bg-green-100">{action.label}</Link>)}
            </div>
          </div>
        </div>
      )}

      {isVolunteer && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Công việc của bạn</h3>
            <div className="space-y-4">
              {upcomingTasks.length > 0 ? upcomingTasks.slice(0, 3).map(task => (
                <div key={task.id} className="border-b border-gray-100 pb-3 last:border-b-0">
                  <p className="font-medium text-gray-700">{task.title}</p>
                  <p className="text-sm text-gray-500">Hạn: {formatDate(task.due_date)}</p>
                </div>
              )) : <p className="text-sm text-gray-400">Chưa có công việc được giao.</p>}
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Hỗ trợ nhanh</h3>
            <div className="space-y-3">
              {quickActions.map(action => <Link key={action.href} to={action.href} className="block px-4 py-3 rounded-xl bg-slate-50 text-slate-700 font-semibold hover:bg-slate-100">{action.label}</Link>)}
            </div>
          </div>
        </div>
      )}

      {isStaff && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Đăng ký gần đây</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-400 uppercase font-bold border-b border-gray-100">
                  <tr><th className="pb-3">Họ tên</th><th className="pb-3">Loại</th><th className="pb-3 text-right">Trạng thái</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentSubmissions.length > 0 ? recentSubmissions.map(sub => (
                    <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 font-medium text-gray-700">{sub.full_name}</td>
                      <td className="py-3 text-gray-500">{sub.attendee_type}</td>
                      <td className="py-3 text-right">{sub.status}</td>
                    </tr>
                  )) : <tr><td colSpan={3} className="py-4 text-center text-gray-400">Chưa có đăng ký nào.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Tác vụ nhanh</h3>
            <div className="space-y-3">
              {quickActions.map(action => <Link key={action.href} to={action.href} className="block px-4 py-3 rounded-xl bg-slate-50 text-slate-700 font-semibold hover:bg-slate-100">{action.label}</Link>)}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Dashboard;
