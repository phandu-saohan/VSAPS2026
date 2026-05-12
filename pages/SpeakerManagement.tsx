import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Speaker, Status } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { SpinnerIcon } from '../components/icons/SpinnerIcon';
import { uploadFileToStorage } from '../supabaseClient';

const SpeakerManagement: React.FC = () => {
    const { hasPermission, profile } = useAuth();
    const { addToast } = useToast();
    const [speakers, setSpeakers] = useState<Speaker[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'All' | Status>('All');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isNew, setIsNew] = useState(false);
    const [editingSpeaker, setEditingSpeaker] = useState<Partial<Speaker>>({});
    const [viewingSpeaker, setViewingSpeaker] = useState<Speaker | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchSpeakers();
    }, []);

    const fetchSpeakers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('speakers')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            console.log("Dữ liệu BCV từ bảng speakers:", data);
            setSpeakers(data || []);
        } catch (err: any) {
            addToast('Lỗi khi tải danh sách: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (id: number, newStatus: Status) => {
        try {
            const { error } = await supabase
                .from('speakers')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;
            
            setSpeakers(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
            addToast(`Đã chuyển trạng thái sang: ${newStatus}`, 'success');
        } catch (err: any) {
            addToast('Lỗi khi cập nhật: ' + err.message, 'error');
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa báo cáo viên này?')) return;
        try {
            const { error } = await supabase.from('speakers').delete().eq('id', id);
            if (error) throw error;
            setSpeakers(prev => prev.filter(s => s.id !== id));
            addToast('Đã xóa thành công.', 'success');
        } catch (err: any) {
            addToast('Lỗi khi xóa: ' + err.message, 'error');
        }
    };

    const openModal = (speaker: Partial<Speaker> | null = null) => {
        if (speaker) {
            setIsNew(false);
            setEditingSpeaker(speaker);
        } else {
            setIsNew(true);
            setEditingSpeaker({
                full_name: '',
                status: Status.PENDING,
                speaker_type: 'Báo cáo viên',
                country: 'Việt Nam'
            });
        }
        setIsModalOpen(true);
    };

    const openViewModal = (speaker: Speaker) => {
        setViewingSpeaker(speaker);
        setIsViewModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setIsViewModalOpen(false);
        setEditingSpeaker({});
        setViewingSpeaker(null);
        setError(null);
    };

    const handleSave = async () => {
        if (!editingSpeaker.full_name || !editingSpeaker.email) {
            setError("Họ tên và email không được để trống.");
            return;
        }
        setLoading(true);
        setError(null);

        try {
            const speakerData = { ...editingSpeaker };
            if (isNew) {
                delete speakerData.id;
                const { error } = await supabase.from('speakers').insert([speakerData]);
                if (error) throw error;
                addToast('Đã thêm báo cáo viên mới.', 'success');
            } else {
                const { error } = await supabase.from('speakers').update(speakerData).eq('id', editingSpeaker.id!);
                if (error) throw error;
                addToast('Đã cập nhật thông tin.', 'success');
            }
            fetchSpeakers();
            closeModal();
        } catch (err: any) {
            setError('Lỗi khi lưu: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEditingSpeaker(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, field: keyof Speaker) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setIsUploading(true);
            const folder = field === 'avatar_url' ? 'avatars' : 'documents';
            const publicUrl = await uploadFileToStorage(file, 'event_assets', folder);
            if (publicUrl) {
                setEditingSpeaker(prev => ({ ...prev, [field]: publicUrl }));
            }
            setIsUploading(false);
        }
    };

    const filteredSpeakers = useMemo(() => {
        return speakers.filter(s => {
            const matchesSearch = s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 s.workplace?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = filterStatus === 'All' || s.status === filterStatus;
            return matchesSearch && matchesStatus;
        });
    }, [speakers, searchTerm, filterStatus]);

    if (!hasPermission('speakers:view')) {
        return <div className="p-10 text-center text-red-500 font-bold">Bạn không có quyền truy cập trang này.</div>;
    }

    return (
        <div className="space-y-6 bg-academic-surface text-academic-slate">
            <div className="rounded-3xl border border-border-subtle bg-white p-5 shadow-sm sm:p-6 lg:p-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="max-w-2xl">
                        <p className="text-xs font-bold uppercase tracking-[0.3em] text-secondary">Báo cáo viên</p>
                        <h1 className="mt-2 text-3xl font-black tracking-[-0.03em] text-academic-navy">Quản lý Báo cáo viên</h1>
                        <p className="mt-3 text-sm leading-7 text-academic-grey">Theo dõi bài báo cáo và hồ sơ chuyên gia.</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={fetchSpeakers} className="flex items-center rounded-full border border-border-subtle bg-white p-2.5 text-academic-grey shadow-sm transition hover:bg-academic-surface hover:text-academic-navy">
                            <span className="material-symbols-outlined text-lg">refresh</span>
                        </button>
                        <button onClick={() => openModal()} className="flex items-center gap-2 rounded-full bg-secondary px-5 py-2.5 font-bold text-white shadow-sm transition hover:brightness-110">
                            <span className="material-symbols-outlined text-lg font-black">add</span>
                            Thêm Báo cáo viên
                        </button>
                    </div>
                </div>
            </div>

            <div className="rounded-3xl border border-border-subtle bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap gap-4">
                    <div className="relative min-w-[280px] flex-1">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-academic-grey">search</span>
                        <input 
                            type="text" 
                            placeholder="Tìm theo tên, email, đơn vị..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-2xl border border-border-subtle bg-white pl-10 pr-4 py-2.5 text-sm outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10"
                        />
                    </div>
                    <select 
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                        className="rounded-2xl border border-border-subtle bg-academic-surface px-4 py-2.5 text-sm font-medium outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10"
                    >
                        <option value="All">Tất cả trạng thái</option>
                        <option value={Status.PENDING}>Chờ duyệt</option>
                        <option value={Status.APPROVED}>Đã duyệt</option>
                        <option value={Status.REJECTED}>Từ chối</option>
                    </select>
                </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-border-subtle bg-white shadow-sm">
                <div className="hidden overflow-x-auto md:block">
                    <table className="w-full border-collapse text-left">
                        <thead className="bg-academic-surface text-[11px] font-bold uppercase tracking-widest text-academic-grey">
                            <tr>
                                <th className="px-6 py-4">Chuyên gia</th>
                                <th className="px-6 py-4">Bài báo cáo & Đơn vị</th>
                                <th className="px-6 py-4">Trạng thái</th>
                                <th className="px-6 py-4 text-right">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="py-24 text-center">
                                        <SpinnerIcon className="mx-auto h-10 w-10 animate-spin text-secondary" />
                                        <p className="mt-4 text-sm font-medium text-academic-grey">Đang kết nối dữ liệu...</p>
                                    </td>
                                </tr>
                            ) : filteredSpeakers.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-24 text-center">
                                        <div className="mb-2 text-academic-grey/30">
                                            <span className="material-symbols-outlined text-5xl">person_search</span>
                                        </div>
                                        <p className="text-sm font-medium text-academic-grey">Không tìm thấy báo cáo viên phù hợp.</p>
                                    </td>
                                </tr>
                            ) : filteredSpeakers.map(s => (
                                <tr key={s.id} className="group transition-colors hover:bg-academic-surface/70">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <img src={s.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.full_name)}&background=random&size=100`} className="h-12 w-12 rounded-full border-2 border-white object-cover shadow-sm ring-1 ring-border-subtle" alt="" />
                                                {s.country && s.country !== 'Việt Nam' && (
                                                    <div className="absolute -bottom-1 -right-1 rounded-full bg-white p-0.5 shadow-sm ring-1 ring-border-subtle">
                                                        <span className="text-[10px]" title={s.country}>🌍</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="text-[14px] font-bold leading-tight text-academic-navy">{s.academic_rank} {s.full_name}</div>
                                                <div className="mt-1 flex items-center gap-1 text-[11px] text-academic-grey">
                                                    <span className="material-symbols-outlined text-[12px]">mail</span>
                                                    {s.email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="line-clamp-1 text-xs font-bold tracking-tight text-secondary">{s.report_title_vn}</div>
                                        <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-academic-grey">
                                            <span className="material-symbols-outlined text-[13px]">apartment</span>
                                            {s.workplace}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <select 
                                            value={s.status}
                                            onChange={(e) => handleStatusChange(s.id, e.target.value as Status)}
                                            className={`cursor-pointer rounded-full px-4 py-1.5 text-[11px] font-bold shadow-sm transition hover:brightness-105 focus:outline-none ${
                                                s.status === Status.APPROVED ? 'bg-green-50 text-green-700 ring-1 ring-green-100' : 
                                                s.status === Status.REJECTED ? 'bg-red-50 text-red-700 ring-1 ring-red-100' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'
                                            }`}
                                        >
                                            <option value={Status.PENDING}>Chờ duyệt</option>
                                            <option value={Status.APPROVED}>Đã duyệt</option>
                                            <option value={Status.REJECTED}>Từ chối</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                            <button onClick={() => openViewModal(s)} className="rounded-xl p-2 text-academic-grey transition hover:bg-secondary/10 hover:text-secondary" title="Xem chi tiết">
                                                <span className="material-symbols-outlined text-lg">visibility</span>
                                            </button>
                                            <button onClick={() => openModal(s)} className="rounded-xl p-2 text-academic-grey transition hover:bg-secondary/10 hover:text-secondary" title="Sửa">
                                                <span className="material-symbols-outlined text-lg">edit</span>
                                            </button>
                                            <button onClick={() => handleDelete(s.id)} className="rounded-xl p-2 text-academic-grey transition hover:bg-red-50 hover:text-red-600" title="Xóa">
                                                <span className="material-symbols-outlined text-lg">delete</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="space-y-4 p-4 md:hidden">
                    {loading ? (
                        <div className="rounded-3xl border border-border-subtle bg-academic-surface p-8 text-center">
                            <SpinnerIcon className="mx-auto h-10 w-10 animate-spin text-secondary" />
                            <p className="mt-4 text-sm font-medium text-academic-grey">Đang kết nối dữ liệu...</p>
                        </div>
                    ) : filteredSpeakers.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-border-subtle bg-academic-surface p-8 text-center">
                            <div className="mb-2 text-academic-grey/30">
                                <span className="material-symbols-outlined text-5xl">person_search</span>
                            </div>
                            <p className="text-sm font-medium text-academic-grey">Không tìm thấy báo cáo viên phù hợp.</p>
                        </div>
                    ) : filteredSpeakers.map((s) => (
                        <div key={s.id} className="rounded-3xl border border-border-subtle bg-white p-4 shadow-sm">
                            <div className="flex items-start gap-3">
                                <img src={s.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.full_name)}&background=random&size=100`} className="h-14 w-14 shrink-0 rounded-2xl object-cover ring-1 ring-border-subtle" alt="" />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-bold leading-tight text-academic-navy">{s.academic_rank} {s.full_name}</p>
                                            <p className="mt-1 truncate text-xs text-academic-grey">{s.email}</p>
                                        </div>
                                        {s.country && s.country !== 'Việt Nam' && <span className="text-sm">🌍</span>}
                                    </div>
                                    <p className="mt-2 line-clamp-2 text-sm font-semibold text-secondary">{s.report_title_vn}</p>
                                    <p className="mt-1 line-clamp-2 text-xs text-academic-grey">{s.workplace}</p>
                                </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between gap-3">
                                <select 
                                    value={s.status}
                                    onChange={(e) => handleStatusChange(s.id, e.target.value as Status)}
                                    className={`min-w-0 flex-1 cursor-pointer rounded-2xl px-3 py-2 text-xs font-bold shadow-sm transition hover:brightness-105 focus:outline-none ${
                                        s.status === Status.APPROVED ? 'bg-green-50 text-green-700 ring-1 ring-green-100' : 
                                        s.status === Status.REJECTED ? 'bg-red-50 text-red-700 ring-1 ring-red-100' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'
                                    }`}
                                >
                                    <option value={Status.PENDING}>Chờ duyệt</option>
                                    <option value={Status.APPROVED}>Đã duyệt</option>
                                    <option value={Status.REJECTED}>Từ chối</option>
                                </select>

                                <div className="flex shrink-0 gap-1">
                                    <button onClick={() => openViewModal(s)} className="rounded-xl p-2 text-academic-grey transition hover:bg-secondary/10 hover:text-secondary" title="Xem chi tiết">
                                        <span className="material-symbols-outlined text-lg">visibility</span>
                                    </button>
                                    <button onClick={() => openModal(s)} className="rounded-xl p-2 text-academic-grey transition hover:bg-secondary/10 hover:text-secondary" title="Sửa">
                                        <span className="material-symbols-outlined text-lg">edit</span>
                                    </button>
                                    <button onClick={() => handleDelete(s.id)} className="rounded-xl p-2 text-academic-grey transition hover:bg-red-50 hover:text-red-600" title="Xóa">
                                        <span className="material-symbols-outlined text-lg">delete</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal Sửa/Thêm */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-academic-navy/60 p-4 backdrop-blur-sm">
                    <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-border-subtle bg-white shadow-2xl shadow-academic-navy/10">
                        <div className="flex items-center justify-between border-b border-border-subtle bg-academic-surface px-5 py-4 sm:px-8 sm:py-5">
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-secondary sm:text-xs">Báo cáo viên</p>
                                <h2 className="mt-1 text-xl font-black tracking-tight text-academic-navy sm:mt-2 sm:text-2xl">{isNew ? 'Thêm Báo cáo viên' : 'Chỉnh sửa Hồ sơ'}</h2>
                                <p className="mt-1 hidden text-sm font-medium text-academic-grey sm:block">Cập nhật thông tin chuyên gia và bài báo cáo.</p>
                            </div>
                            <button onClick={closeModal} className="flex h-9 w-9 items-center justify-center rounded-full text-academic-grey transition hover:bg-white hover:text-academic-navy hover:shadow-sm sm:h-10 sm:w-10">
                                <span className="material-symbols-outlined text-[20px] sm:text-2xl">close</span>
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-8">
                            {error && (
                                <div className="mb-6 flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
                                    <span className="material-symbols-outlined text-lg">error</span>
                                    {error}
                                </div>
                            )}
                            
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div className="space-y-5 md:space-y-6">
                                    <div className="flex items-center gap-4 rounded-2xl border border-dashed border-border-subtle bg-academic-surface p-4 sm:gap-6">
                                        <div className="relative group">
                                            <img src={editingSpeaker.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(editingSpeaker.full_name || 'BCV')}&background=random&size=200`} className="h-20 w-20 rounded-2xl object-cover border-4 border-white shadow-md transition group-hover:brightness-90 sm:h-24 sm:w-24" alt="" />
                                            <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-2xl bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                                                <span className="material-symbols-outlined text-white">photo_camera</span>
                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'avatar_url')} />
                                            </label>
                                        </div>
                                        <div>
                                            <p className="mb-1 text-sm font-bold text-academic-navy">Ảnh đại diện</p>
                                            <p className="text-[11px] font-medium leading-relaxed text-academic-grey">Định dạng JPG, PNG. <br/>Dung lượng tối đa 2MB.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-2 block text-[13px] font-bold text-academic-navy">Học hàm/Học vị</label>
                                            <input type="text" name="academic_rank" value={editingSpeaker.academic_rank || ''} onChange={handleChange} placeholder="VD: PGS. TS. BS." className="w-full rounded-2xl border border-border-subtle px-4 py-2.5 text-sm font-medium outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10" />
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-[13px] font-bold text-academic-navy">Họ và tên *</label>
                                            <input type="text" name="full_name" value={editingSpeaker.full_name || ''} onChange={handleChange} className="w-full rounded-2xl border border-border-subtle px-4 py-2.5 text-sm font-medium outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-2 block text-[13px] font-bold text-academic-navy">Email *</label>
                                            <input type="email" name="email" value={editingSpeaker.email || ''} onChange={handleChange} className="w-full rounded-2xl border border-border-subtle px-4 py-2.5 text-sm font-medium outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10" />
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-[13px] font-bold text-academic-navy">Số điện thoại</label>
                                            <input type="text" name="phone" value={editingSpeaker.phone || ''} onChange={handleChange} className="w-full rounded-2xl border border-border-subtle px-4 py-2.5 text-sm font-medium outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-[13px] font-bold text-academic-navy">Đơn vị công tác</label>
                                        <input type="text" name="workplace" value={editingSpeaker.workplace || ''} onChange={handleChange} className="w-full rounded-2xl border border-border-subtle px-4 py-2.5 text-sm font-medium outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10" />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-[13px] font-bold text-academic-navy">Quốc gia</label>
                                        <input type="text" name="country" value={editingSpeaker.country || ''} onChange={handleChange} className="w-full rounded-2xl border border-border-subtle px-4 py-2.5 text-sm font-medium outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10" />
                                    </div>
                                </div>

                                <div className="space-y-5 md:space-y-6">
                                    <div>
                                        <label className="mb-2 block text-[13px] font-bold text-academic-navy">Tên bài báo cáo (Tiếng Việt)</label>
                                        <textarea name="report_title_vn" value={editingSpeaker.report_title_vn || ''} onChange={handleChange} rows={2} className="w-full rounded-2xl border border-border-subtle px-4 py-2.5 text-sm font-medium leading-relaxed outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10" />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-[13px] font-bold text-academic-navy">Tên bài báo cáo (Tiếng Anh)</label>
                                        <textarea name="report_title_en" value={editingSpeaker.report_title_en || ''} onChange={handleChange} rows={2} className="w-full rounded-2xl border border-border-subtle px-4 py-2.5 text-sm font-medium leading-relaxed italic outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10" />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-[13px] font-bold text-academic-navy">Tóm tắt bài báo cáo</label>
                                        <textarea name="abstract_text" value={editingSpeaker.abstract_text || ''} onChange={handleChange} rows={4} className="w-full rounded-2xl border border-border-subtle px-4 py-2.5 text-[13px] font-medium leading-relaxed outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10" />
                                    </div>

                                    <div className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-academic-surface p-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="mb-1 text-[13px] font-bold text-secondary">Trạng thái hồ sơ</p>
                                            <p className="text-[11px] font-medium italic text-academic-grey">Xác nhận quyền trình bày của chuyên gia.</p>
                                        </div>
                                        <select name="status" value={editingSpeaker.status || ''} onChange={handleChange} className="w-full rounded-2xl border border-border-subtle bg-white px-4 py-2 text-xs font-bold text-secondary outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10 sm:w-auto">
                                            <option value={Status.PENDING}>Chờ duyệt</option>
                                            <option value={Status.APPROVED}>Đã duyệt</option>
                                            <option value={Status.REJECTED}>Từ chối</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col-reverse gap-3 border-t border-border-subtle bg-academic-surface px-4 py-4 sm:flex-row sm:justify-end sm:gap-3 sm:px-8 sm:py-5">
                            <button onClick={closeModal} className="w-full rounded-2xl px-6 py-2.5 text-sm font-bold text-academic-grey transition hover:text-academic-navy sm:w-auto">Hủy</button>
                            <button onClick={handleSave} disabled={loading || isUploading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-secondary px-10 py-2.5 font-bold text-white shadow-sm shadow-secondary/20 transition hover:brightness-110 disabled:opacity-50 sm:w-auto">
                                {loading ? (
                                    <>
                                        <SpinnerIcon className="h-4 w-4 animate-spin" />
                                        Đang lưu...
                                    </>
                                ) : 'Lưu hồ sơ'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Xem chi tiết */}
            {isViewModalOpen && viewingSpeaker && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-academic-navy/60 p-4 backdrop-blur-sm">
                    <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-border-subtle bg-white shadow-2xl shadow-academic-navy/10">
                        <div className="flex items-center justify-between border-b border-border-subtle bg-academic-surface px-6 py-5 sm:px-8">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.3em] text-secondary">Báo cáo viên</p>
                                <h2 className="mt-2 text-xl font-black tracking-tight text-academic-navy">Chi tiết Báo cáo viên</h2>
                            </div>
                            <button onClick={closeModal} className="flex h-10 w-10 items-center justify-center rounded-full text-academic-grey transition hover:bg-white hover:text-academic-navy hover:shadow-sm">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 sm:py-8">
                            <div className="flex flex-col gap-8 md:flex-row">
                                <div className="w-full space-y-6 text-center md:w-64 md:text-left">
                                    <img src={viewingSpeaker.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(viewingSpeaker.full_name)}&background=random&size=200`} className="mx-auto h-48 w-48 rounded-3xl border-4 border-white object-cover shadow-xl md:mx-0" alt="" />
                                    <div>
                                        <h3 className="mb-2 text-2xl font-black leading-tight text-academic-navy">{viewingSpeaker.academic_rank} {viewingSpeaker.full_name}</h3>
                                        <div className="inline-flex items-center rounded-full border border-border-subtle bg-academic-surface px-4 py-1.5 text-[11px] font-bold tracking-wider text-academic-grey">
                                            {viewingSpeaker.speaker_type || 'Báo cáo viên'}
                                        </div>
                                    </div>
                                    <div className="space-y-3 border-t border-border-subtle pt-4">
                                        <div className="flex items-center gap-3 text-sm font-medium text-academic-slate">
                                            <span className="material-symbols-outlined text-academic-grey">mail</span>
                                            {viewingSpeaker.email}
                                        </div>
                                        <div className="flex items-center gap-3 text-sm font-medium text-academic-slate">
                                            <span className="material-symbols-outlined text-academic-grey">call</span>
                                            {viewingSpeaker.phone || 'Chưa cập nhật'}
                                        </div>
                                        <div className="flex items-center gap-3 text-sm font-medium text-academic-slate">
                                            <span className="material-symbols-outlined text-academic-grey">apartment</span>
                                            {viewingSpeaker.workplace}
                                        </div>
                                        <div className="flex items-center gap-3 text-sm font-medium text-academic-slate">
                                            <span className="material-symbols-outlined text-academic-grey">public</span>
                                            {viewingSpeaker.country || 'Việt Nam'}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 space-y-8">
                                    <div className="rounded-3xl border border-secondary/10 bg-secondary/5 p-6">
                                        <div className="mb-4 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-secondary">clinical_notes</span>
                                            <h4 className="text-[11px] font-bold uppercase tracking-widest text-secondary">Đề tài báo cáo</h4>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold leading-relaxed text-academic-navy">{viewingSpeaker.report_title_vn}</p>
                                            {viewingSpeaker.report_title_en && (
                                                <p className="mt-2 text-xs font-medium italic text-academic-grey">{viewingSpeaker.report_title_en}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-academic-grey">description</span>
                                            <h4 className="text-[11px] font-bold uppercase tracking-widest text-academic-grey">Nội dung tóm tắt</h4>
                                        </div>
                                        <div className="whitespace-pre-wrap rounded-3xl border border-border-subtle bg-academic-surface p-6 text-[13px] font-medium leading-relaxed text-academic-slate">
                                            {viewingSpeaker.abstract_text || 'Chưa có nội dung tóm tắt.'}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        {viewingSpeaker.abstract_file_url && (
                                            <a href={viewingSpeaker.abstract_file_url} target="_blank" rel="noreferrer" className="group flex items-center justify-center gap-3 rounded-2xl border border-border-subtle bg-white p-4 transition hover:-translate-y-0.5 hover:border-secondary/20 hover:shadow-sm">
                                                <span className="material-symbols-outlined text-secondary transition group-hover:scale-110">picture_as_pdf</span>
                                                <span className="text-xs font-bold text-academic-navy">File Abstract</span>
                                            </a>
                                        )}
                                        {viewingSpeaker.report_file_url && (
                                            <a href={viewingSpeaker.report_file_url} target="_blank" rel="noreferrer" className="group flex items-center justify-center gap-3 rounded-2xl border border-border-subtle bg-white p-4 transition hover:-translate-y-0.5 hover:border-secondary/20 hover:shadow-sm">
                                                <span className="material-symbols-outlined text-secondary transition group-hover:scale-110">slideshow</span>
                                                <span className="text-xs font-bold text-academic-navy">File Báo cáo</span>
                                            </a>
                                        )}
                                        {viewingSpeaker.cv_file_url && (
                                            <a href={viewingSpeaker.cv_file_url} target="_blank" rel="noreferrer" className="group flex items-center justify-center gap-3 rounded-2xl border border-border-subtle bg-white p-4 transition hover:-translate-y-0.5 hover:border-secondary/20 hover:shadow-sm">
                                                <span className="material-symbols-outlined text-secondary transition group-hover:scale-110">article</span>
                                                <span className="text-xs font-bold text-academic-navy">Hồ sơ CV</span>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end border-t border-border-subtle bg-academic-surface px-4 py-4 sm:px-8 sm:py-5">
                            <button onClick={closeModal} className="w-full rounded-2xl bg-secondary px-8 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110 sm:w-auto">Đóng</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SpeakerManagement;
