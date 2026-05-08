import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Task, Profile, Status, TaskComment } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

// Helper to format date
const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return 'Ngày không hợp lệ';
    }
    return date.toLocaleDateString('vi-VN');
};

// Helper to get display value for a status.
// Handles cases where DB stores English keys for some task statuses.
const getStatusDisplay = (status: string | null | undefined): string => {
    if (!status) return 'Chờ duyệt'; 
    switch (status) {
        case 'IN_PROGRESS': return 'Đang thực hiện';
        case 'COMPLETED': return 'Hoàn thành';
        case 'PENDING': return 'Chờ duyệt';
        default: return status; 
    }
};

const AccessDenied: React.FC = () => (
    <div>
        <h1 className="text-3xl font-bold text-red-600">Truy cập bị từ chối</h1>
        <p className="mt-2 text-gray-600">Bạn không có quyền xem trang này.</p>
    </div>
);

const Tasks: React.FC = () => {
    const { profile: currentUser, createNotification, hasPermission } = useAuth();
    const { addToast } = useToast();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [profiles, setProfiles] = useState<Pick<Profile, 'id' | 'full_name'>[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Partial<Task>>({});
    const [isNew, setIsNew] = useState(false);
    
    const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
    
    const [filterStatus, setFilterStatus] = useState<string>('All');
    const [filterAssignee, setFilterAssignee] = useState<'All' | 'Me' | string>('All');

    const [comments, setComments] = useState<TaskComment[]>([]);
    const [newComment, setNewComment] = useState('');
    const commentsEndRef = useRef<HTMLDivElement>(null);

    // Setup realtime comments when modal is open
    useEffect(() => {
        if (!isModalOpen || !editingTask.id) return;
        
        const fetchComments = async () => {
            const { data, error } = await supabase
                .from('task_comments')
                .select(`
                    *,
                    profiles:user_id(full_name, avatar, role)
                `)
                .eq('task_id', editingTask.id)
                .order('created_at', { ascending: true });
            
            if (!error && data) {
                // @ts-ignore
                setComments(data);
                scrollToBottom();
            }
        };

        fetchComments();

        const channel = supabase
            .channel(`task_comments_${editingTask.id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'task_comments', filter: `task_id=eq.${editingTask.id}` },
                async (payload) => {
                    const { data: profileData } = await supabase
                        .from('profiles')
                        .select('full_name, avatar, role')
                        .eq('id', payload.new.user_id)
                        .single();

                    const newCmt: TaskComment = {
                        ...(payload.new as TaskComment),
                        profiles: profileData
                    };

                    setComments((current) => [...current, newCmt]);
                    scrollToBottom();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isModalOpen, editingTask.id]);

    const scrollToBottom = () => {
        setTimeout(() => {
            commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !currentUser || !editingTask.id) return;

        const content = newComment.trim();
        setNewComment(''); // optimistic clear

        const { error } = await supabase.from('task_comments').insert([
            {
                task_id: editingTask.id,
                user_id: currentUser.id,
                content: content
            }
        ]);

        if (error) {
            addToast('Lỗi khi gửi bình luận: ' + error.message, 'error');
        } else {
            // Check if we need to notify assignee
            if (editingTask.assignee_id && editingTask.assignee_id !== currentUser.id) {
                createNotification({
                    user_id: editingTask.assignee_id,
                    message: `${currentUser.full_name} đã bình luận vào công việc "${editingTask.title}"`,
                    link: '/tasks'
                });
            }
        }
    };


    useEffect(() => {
        if (hasPermission('tasks:view')) {
            fetchTasks();
            fetchProfiles();
        } else {
            setLoading(false);
        }
    }, [hasPermission]);

    const fetchTasks = async () => {
        setLoading(true);
        setError(null);
        const { data, error } = await supabase
            .from('tasks')
            .select(`*, profiles(full_name, avatar)`)
            .order('due_date', { ascending: true });

        if (error) {
            setError('Lỗi khi tải công việc: ' + error.message);
        } else {
            setTasks(data || []);
        }
        setLoading(false);
    };

    const fetchProfiles = async () => {
        const { data, error } = await supabase.from('profiles').select('id, full_name');
        if (error) console.error("Error fetching profiles:", error.message);
        else setProfiles(data || []);
    };

    const sendPushNotification = async (userIds: string[], title: string, message: string) => {
        if (!userIds || userIds.length === 0) return;
        
        // The URL the user will be directed to when they click the notification.
        const url = `${window.location.origin}/#/tasks`;

        try {
            const { error } = await supabase.functions.invoke('send-onesignal-notification', {
                body: {
                    userIds,
                    title,
                    message,
                    url,
                },
            });
            if (error) {
                throw error;
            }
            console.log('Push notification sent successfully to:', userIds);
        } catch (err: any) {
            console.error('Error sending push notification:', err);
            // Attempt to get the detailed error message from the function's response
            const detailedError = err.context?.data?.error || err.message;
            addToast(`Gửi thông báo đẩy thất bại: ${detailedError}`, 'error');
        }
    };

    const openModal = (task: Partial<Task> | null = null) => {
        const canPerformAction = task ? hasPermission('tasks:edit') : hasPermission('tasks:create');
        if (!canPerformAction) {
            alert("Bạn không có quyền thực hiện hành động này.");
            return;
        }

        if (task) {
            setIsNew(false);
            setEditingTask(task);
        } else {
            setIsNew(true);
            setEditingTask({
                title: '',
                description: '',
                status: 'Chờ duyệt',
                due_date: new Date().toISOString().split('T')[0],
                assignee_id: currentUser?.id,
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingTask({});
        setTaskToDelete(null);
        setError(null);
        setComments([]);
        setNewComment('');
    };

    const handleSave = async () => {
        const permissionToCheck = isNew ? 'tasks:create' : 'tasks:edit';
        if (!hasPermission(permissionToCheck)) {
            setError("Bạn không có quyền thực hiện hành động này.");
            return;
        }
        if (!editingTask.title) {
            setError("Tiêu đề công việc không được để trống.");
            return;
        }
        setLoading(true);
        setError(null);

        const originalTask = isNew ? null : tasks.find(t => t.id === editingTask.id);
        const { profiles: _removedProfiles, ...taskData } = editingTask;

        if (isNew) {
            delete taskData.id;
        }

        try {
            const request = isNew
                ? supabase.from('tasks').insert([taskData])
                : supabase.from('tasks').update(taskData).eq('id', editingTask.id!);
            
            const { data: savedData, error } = await request.select().single();

            if (error || !savedData) {
                throw error || new Error("Không thể lưu và lấy lại dữ liệu công việc.");
            }
            
            // --- OneSignal Push Notification Logic ---
            const newAssigneeId = savedData.assignee_id;
            const oldAssigneeId = originalTask?.assignee_id;
            const taskTitle = savedData.title;
            const assignerName = currentUser?.full_name || 'Hệ thống';

            if (isNew) {
                if (newAssigneeId) {
                    await sendPushNotification(
                        [newAssigneeId],
                        'Công việc mới được giao',
                        `${assignerName} đã giao cho bạn công việc mới: "${taskTitle}"`
                    );
                }
            } else { // It's an update
                if (newAssigneeId && newAssigneeId !== oldAssigneeId) {
                    // Re-assigned
                    await sendPushNotification(
                        [newAssigneeId],
                        'Bạn có công việc mới',
                        `${assignerName} đã giao cho bạn công việc: "${taskTitle}"`
                    );
                    if (oldAssigneeId) {
                        await sendPushNotification(
                            [oldAssigneeId],
                            'Công việc đã được gỡ bỏ',
                            `Công việc "${taskTitle}" đã được giao cho người khác.`
                        );
                    }
                } else if (!newAssigneeId && oldAssigneeId) {
                    // Un-assigned
                     await sendPushNotification(
                        [oldAssigneeId],
                        'Công việc đã được gỡ bỏ',
                        `Bạn đã được gỡ khỏi công việc "${originalTask?.title}".`
                    );
                } else if (newAssigneeId) {
                    // Details updated, assignee same
                     await sendPushNotification(
                        [newAssigneeId],
                        'Công việc được cập nhật',
                        `Thông tin công việc "${taskTitle}" đã được cập nhật.`
                    );
                }
            }
            
            // In-app notification logic
            if (editingTask.assignee_id && (!originalTask || originalTask.assignee_id !== editingTask.assignee_id)) {
                await createNotification({
                    user_id: editingTask.assignee_id,
                    message: `Bạn được giao công việc: "${editingTask.title}"`,
                    link: '/tasks'
                });

                const assignee = profiles.find(p => p.id === editingTask.assignee_id);
                if (assignee) {
                    addToast(`Đã giao công việc "${editingTask.title}" cho ${assignee.full_name}.`, 'success');
                }
            } else {
                 addToast('Đã lưu công việc thành công!', 'success');
            }

            fetchTasks();
            closeModal();
        } catch (err: any) {
            const errorMessage = 'Lỗi khi lưu công việc: ' + (err.message || 'Đã xảy ra lỗi.');
            setError(errorMessage);
            addToast(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (task: Task) => {
        if (!hasPermission('tasks:delete')) {
            alert("Bạn không có quyền thực hiện hành động này.");
            return;
        }
        setTaskToDelete(task);
    }

    const confirmDelete = async () => {
        if (!taskToDelete || !hasPermission('tasks:delete')) return;

        const { assignee_id: assigneeId, title: taskTitle } = taskToDelete;

        const { error } = await supabase.from('tasks').delete().eq('id', taskToDelete.id);
        if (error) {
            const errorMessage = 'Lỗi khi xóa công việc: ' + error.message;
            setError(errorMessage);
            addToast(errorMessage, 'error');
        } else {
            if (assigneeId) {
                await sendPushNotification(
                    [assigneeId],
                    'Công việc đã bị xóa',
                    `Công việc "${taskTitle}" mà bạn được giao đã bị xóa.`
                );
            }
            setTasks(tasks.filter(t => t.id !== taskToDelete.id));
            setTaskToDelete(null);
            addToast('Đã xóa công việc thành công.', 'success');
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEditingTask(prev => ({ ...prev, [name]: value }));
    };

    const renderStatusBadge = (status: string) => {
        const displayStatus = getStatusDisplay(status);
        const statusMap: { [key: string]: string } = {
          'Hoàn thành': 'bg-green-100 text-green-800',
          'Đang thực hiện': 'bg-blue-100 text-blue-800',
          'Chờ duyệt': 'bg-yellow-100 text-yellow-800',
          'Từ chối': 'bg-red-100 text-red-800',
        };
        return (
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusMap[displayStatus] || 'bg-gray-100 text-gray-800'}`}>
            {displayStatus}
          </span>
        );
    };
    
    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            const statusMatch = filterStatus === 'All' || t.status === filterStatus;
            let assigneeMatch = true;
            if (filterAssignee === 'Me') {
                assigneeMatch = t.assignee_id === currentUser?.id;
            } else if (filterAssignee !== 'All') {
                assigneeMatch = t.assignee_id === filterAssignee;
            }
            return statusMatch && assigneeMatch;
        });
    }, [tasks, filterStatus, filterAssignee, currentUser]);

    if (!hasPermission('tasks:view')) {
        return <AccessDenied />;
    }

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Quản lý Công việc</h1>
                    <p className="mt-2 text-gray-600">Phân công và theo dõi tiến độ các công việc của ban tổ chức.</p>
                </div>
                {hasPermission('tasks:create') && (
                    <button onClick={() => openModal()} className="px-4 py-2 bg-secondary text-white font-semibold rounded-lg hover:bg-secondary-dark transition-colors w-full md:w-auto">
                        + Thêm công việc
                    </button>
                )}
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 md:space-x-4 mb-4">
                <select 
                    value={filterStatus} 
                    onChange={e => setFilterStatus(e.target.value)}
                    className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                >
                    <option value="All">Tất cả trạng thái</option>
                    <option value="Chờ duyệt">Chờ duyệt</option>
                    <option value="Đang thực hiện">Đang thực hiện</option>
                    <option value="Hoàn thành">Hoàn thành</option>
                </select>
                <select 
                    value={filterAssignee} 
                    onChange={e => setFilterAssignee(e.target.value)}
                    className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                >
                    <option value="All">Tất cả thành viên</option>
                    <option value="Me">Giao cho tôi</option>
                    {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
            </div>

            <div className="bg-white shadow rounded-lg overflow-x-auto">
                 {loading && <p className="p-4">Đang tải...</p>}
                {error && !isModalOpen && <p className="p-4 text-red-500">{error}</p>}
                {!loading && filteredTasks.length === 0 && <p className="p-4">Không có công việc nào.</p>}
                {!loading && filteredTasks.length > 0 && (
                    <table className="min-w-full divide-y divide-gray-200 responsive-table">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Công việc</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người thực hiện</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hạn chót</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 lg:divide-y-0">
                            {filteredTasks.map(t => (
                                <tr key={t.id}>
                                    <td data-label="Công việc" className="px-6 py-4 whitespace-normal">
                                        <div className="text-sm font-medium text-gray-800">{t.title}</div>
                                        <div className="text-sm text-gray-500 max-w-md truncate">{t.description}</div>
                                    </td>
                                    <td data-label="Người thực hiện" className="px-6 py-4 whitespace-nowrap">
                                        {t.profiles ? (
                                            <div className="flex items-center">
                                                <img className="h-8 w-8 rounded-full object-cover" src={t.profiles.avatar || `https://i.pravatar.cc/150?u=${t.assignee_id}`} alt={t.profiles.full_name} loading="lazy" />
                                                <span className="ml-2 text-sm text-gray-800">{t.profiles.full_name}</span>
                                            </div>
                                        ) : <span className="text-xs text-gray-400">Chưa giao</span>}
                                    </td>
                                    <td data-label="Hạn chót" className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatDate(t.due_date)}</td>
                                    <td data-label="Trạng thái" className="px-6 py-4 whitespace-nowrap">{renderStatusBadge(t.status)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium actions-cell">
                                        {hasPermission('tasks:edit') && <button onClick={() => openModal(t)} className="text-secondary hover:text-secondary-dark mr-4">Sửa</button>}
                                        {hasPermission('tasks:delete') && <button onClick={() => handleDelete(t)} className="text-red-600 hover:text-red-800">Xoá</button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            
             {isModalOpen && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                     <div className={`bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 w-full max-h-[95vh] overflow-hidden flex flex-col ${isNew ? 'max-w-lg' : 'max-w-5xl'}`}>
                        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[#061D5F] to-[#0b2a86] flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">{isNew ? 'Thêm công việc mới' : 'Chi tiết công việc'}</h2>
                            <button onClick={closeModal} className="text-white/80 hover:text-white hover:bg-white/10 rounded-full p-1 transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>

                        <div className={`flex flex-col ${!isNew ? 'lg:flex-row' : ''} overflow-hidden h-full flex-1`}>
                            {/* Cột Trái: Chi tiết & Form chỉnh sửa */}
                            <div className={`p-6 overflow-y-auto border-gray-200 bg-gray-50/40 flex-1 ${!isNew ? 'lg:w-1/2 lg:border-r' : 'w-full'}`}>
                                {error && <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded-xl">{error}</p>}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700">Tiêu đề</label>
                                        <input type="text" name="title" value={editingTask.title || ''} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-xl shadow-sm focus:ring-[#061D5F] focus:border-[#061D5F]"/>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700">Mô tả</label>
                                        <textarea name="description" value={editingTask.description || ''} onChange={handleChange} rows={!isNew ? 3 : 4} className="mt-1 block w-full border-gray-300 rounded-xl shadow-sm focus:ring-[#061D5F] focus:border-[#061D5F]"/>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700">Người thực hiện</label>
                                            <select name="assignee_id" value={editingTask.assignee_id || ''} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-xl shadow-sm focus:ring-[#061D5F] focus:border-[#061D5F]">
                                                <option value="">-- Chọn thành viên --</option>
                                                {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700">Hạn chót</label>
                                            <input type="date" name="due_date" value={editingTask.due_date || ''} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-xl shadow-sm focus:ring-[#061D5F] focus:border-[#061D5F]"/>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700">Trạng thái</label>
                                        <select name="status" value={editingTask.status || ''} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-xl shadow-sm focus:ring-[#061D5F] focus:border-[#061D5F]">
                                            <option value="Chờ duyệt">Chờ duyệt</option>
                                            <option value="Đang thực hiện">Đang thực hiện</option>
                                            <option value="Hoàn thành">Hoàn thành</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end space-x-3">
                                    <button onClick={closeModal} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 active:scale-[0.98] transition-all font-medium shadow-sm">Đóng</button>
                                    <button onClick={handleSave} disabled={loading} className="px-4 py-2 bg-[#061D5F] text-white rounded-xl hover:bg-[#0b2a86] active:scale-[0.98] transition-all disabled:opacity-50 font-medium shadow-md">
                                        {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                                    </button>
                                </div>
                            </div>

                            {/* Cột Phải: Trao đổi / Bình luận (Chỉ hiện khi Xem chi tiết) */}
                            {!isNew && (
                                <div className="flex flex-col flex-1 h-[400px] lg:h-auto lg:w-1/2 bg-gray-50 border-t lg:border-t-0 border-gray-200">
                                    <div className="px-6 py-3 border-b border-gray-200 bg-gray-100 flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-gray-700">Thảo luận công việc</h3>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                        {comments.length === 0 ? (
                                            <div className="text-center text-sm text-gray-500 mt-10">Chưa có bình luận nào.</div>
                                        ) : (
                                            comments.map(c => {
                                                const isMe = c.user_id === currentUser?.id;
                                                return (
                                                    <div key={c.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                        {!isMe && (
                                                            <img 
                                                                src={c.profiles?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.profiles?.full_name || 'User')}&background=random`} 
                                                                alt="avatar" 
                                                                className="w-8 h-8 rounded-full shadow-sm mr-2 mt-1"
                                                            />
                                                        )}
                                                        <div className={`max-w-[80%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                                                            {!isMe && <span className="text-xs font-semibold text-gray-600 ml-1 mb-1">{c.profiles?.full_name}</span>}
                                                            <div className={`px-4 py-2 rounded-xl text-sm ${isMe ? 'bg-secondary text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'}`}>
                                                                <p className="whitespace-pre-wrap">{c.content}</p>
                                                            </div>
                                                            <span className="text-[10px] text-gray-400 mt-1 mx-1">
                                                                {new Date(c.created_at).toLocaleString('vi-VN')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                        <div ref={commentsEndRef} />
                                    </div>
                                    <div className="p-4 bg-white border-t border-gray-200">
                                        <form onSubmit={handleAddComment} className="flex space-x-2">
                                            <input
                                                type="text"
                                                value={newComment}
                                                onChange={(e) => setNewComment(e.target.value)}
                                                placeholder="Thêm bình luận..."
                                                className="flex-1 px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#061D5F] bg-white"
                                            />
                                            <button 
                                                type="submit" 
                                                disabled={!newComment.trim()}
                                                className="p-2 bg-[#061D5F] text-white rounded-full hover:bg-[#0b2a86] focus:outline-none focus:ring-2 focus:ring-[#061D5F] disabled:opacity-50 active:scale-[0.98] transition-all shadow-sm"
                                            >
                                                <svg className="w-4 h-4 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            )}
                        </div>
                     </div>
                 </div>
            )}
            
            {taskToDelete && (
                 <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                     <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 w-full max-w-md overflow-hidden">
                         <div className="px-6 py-4 bg-gradient-to-r from-[#061D5F] to-[#0b2a86]">
                             <h2 className="text-xl font-bold text-white">Xác nhận xóa</h2>
                         </div>
                         <div className="p-6 bg-gray-50/40">
                             <p className="text-gray-700">Bạn có chắc chắn muốn xóa công việc <span className="font-semibold text-gray-900">"{taskToDelete.title}"</span>?</p>
                             <div className="mt-6 flex justify-end space-x-3">
                                 <button onClick={() => setTaskToDelete(null)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 active:scale-[0.98] transition-all">Hủy</button>
                                 <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 active:scale-[0.98] transition-all shadow-sm">Xóa</button>
                             </div>
                         </div>
                     </div>
                 </div>
            )}
        </div>
    );
};

export default Tasks;
