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
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Quản lý Báo cáo viên</h1>
                    <p className="text-gray-500 text-sm mt-1 font-medium">Theo dõi bài báo cáo và hồ sơ chuyên gia.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchSpeakers} className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors shadow-sm flex items-center">
                        <span className="material-symbols-outlined text-lg">refresh</span>
                    </button>
                    <button onClick={() => openModal()} className="px-5 py-2.5 bg-[#eb248e] text-white font-bold rounded-xl hover:bg-[#d61f81] transition-all shadow-sm flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg font-black">add</span>
                        Thêm Báo cáo viên
                    </button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[300px] relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                        <input 
                            type="text" 
                            placeholder="Tìm theo tên, email, đơn vị..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all text-sm"
                        />
                    </div>
                    <select 
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                        className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all text-sm font-medium bg-gray-50/50"
                    >
                        <option value="All">Tất cả trạng thái</option>
                        <option value={Status.PENDING}>Chờ duyệt</option>
                        <option value={Status.APPROVED}>Đã duyệt</option>
                        <option value={Status.REJECTED}>Từ chối</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50/80 text-[11px] font-bold tracking-wider text-gray-400 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4">Chuyên gia</th>
                            <th className="px-6 py-4">Bài báo cáo & Đơn vị</th>
                            <th className="px-6 py-4">Trạng thái</th>
                            <th className="px-6 py-4 text-right">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="py-24 text-center">
                                    <SpinnerIcon className="w-10 h-10 mx-auto text-secondary animate-spin" />
                                    <p className="text-gray-400 mt-4 text-sm font-medium">Đang kết nối dữ liệu...</p>
                                </td>
                            </tr>
                        ) : filteredSpeakers.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="py-24 text-center">
                                    <div className="text-gray-300 mb-2">
                                        <span className="material-symbols-outlined text-5xl">person_search</span>
                                    </div>
                                    <p className="text-gray-400 text-sm font-medium">Không tìm thấy báo cáo viên phù hợp.</p>
                                </td>
                            </tr>
                        ) : filteredSpeakers.map(s => (
                            <tr key={s.id} className="hover:bg-gray-50/80 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <img src={s.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.full_name)}&background=random&size=100`} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm ring-1 ring-gray-100" alt="" />
                                            {s.country && s.country !== 'Việt Nam' && (
                                                <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full shadow-sm ring-1 ring-gray-100">
                                                    <span className="text-[10px]" title={s.country}>🌍</span>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-800 text-[14px] leading-tight">{s.academic_rank} {s.full_name}</div>
                                            <div className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[12px]">mail</span>
                                                {s.email}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-xs font-bold text-secondary tracking-tight line-clamp-1">{s.report_title_vn}</div>
                                    <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-1 font-medium">
                                        <span className="material-symbols-outlined text-[13px]">apartment</span>
                                        {s.workplace}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <select 
                                        value={s.status}
                                        onChange={(e) => handleStatusChange(s.id, e.target.value as Status)}
                                        className={`text-[11px] font-bold px-4 py-1.5 rounded-full border-none focus:ring-0 cursor-pointer shadow-sm transition-all ${
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
                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openViewModal(s)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Xem chi tiết">
                                            <span className="material-symbols-outlined text-lg">visibility</span>
                                        </button>
                                        <button onClick={() => openModal(s)} className="p-2 text-gray-500 hover:text-secondary hover:bg-secondary/5 rounded-xl transition-all" title="Sửa">
                                            <span className="material-symbols-outlined text-lg">edit</span>
                                        </button>
                                        <button onClick={() => handleDelete(s.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Xóa">
                                            <span className="material-symbols-outlined text-lg">delete</span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal Sửa/Thêm */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">{isNew ? 'Thêm Báo cáo viên' : 'Chỉnh sửa Hồ sơ'}</h2>
                                <p className="text-sm text-gray-500 font-medium">Cập nhật thông tin chuyên gia và bài báo cáo.</p>
                            </div>
                            <button onClick={closeModal} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white hover:shadow-sm transition-all text-gray-400 hover:text-gray-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto px-8 py-8">
                            {error && (
                                <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm font-bold rounded-2xl border border-red-100 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-lg">error</span>
                                    {error}
                                </div>
                            )}
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-6 p-4 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                                        <div className="relative group">
                                            <img src={editingSpeaker.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(editingSpeaker.full_name || 'BCV')}&background=random&size=200`} className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-md transition-all group-hover:brightness-90" alt="" />
                                            <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-2xl">
                                                <span className="material-symbols-outlined text-white">photo_camera</span>
                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'avatar_url')} />
                                            </label>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-700 mb-1">Ảnh đại diện</p>
                                            <p className="text-[11px] text-gray-400 font-medium leading-relaxed">Định dạng JPG, PNG. <br/>Dung lượng tối đa 2MB.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[13px] font-bold text-gray-600 mb-2">Học hàm/Học vị</label>
                                            <input type="text" name="academic_rank" value={editingSpeaker.academic_rank || ''} onChange={handleChange} placeholder="VD: PGS. TS. BS." className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all text-sm font-medium" />
                                        </div>
                                        <div>
                                            <label className="block text-[13px] font-bold text-gray-600 mb-2">Họ và tên *</label>
                                            <input type="text" name="full_name" value={editingSpeaker.full_name || ''} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all text-sm font-medium" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[13px] font-bold text-gray-600 mb-2">Email *</label>
                                            <input type="email" name="email" value={editingSpeaker.email || ''} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all text-sm font-medium" />
                                        </div>
                                        <div>
                                            <label className="block text-[13px] font-bold text-gray-600 mb-2">Số điện thoại</label>
                                            <input type="text" name="phone" value={editingSpeaker.phone || ''} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all text-sm font-medium" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[13px] font-bold text-gray-600 mb-2">Đơn vị công tác</label>
                                        <input type="text" name="workplace" value={editingSpeaker.workplace || ''} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all text-sm font-medium" />
                                    </div>

                                    <div>
                                        <label className="block text-[13px] font-bold text-gray-600 mb-2">Quốc gia</label>
                                        <input type="text" name="country" value={editingSpeaker.country || ''} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all text-sm font-medium" />
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[13px] font-bold text-gray-600 mb-2">Tên bài báo cáo (Tiếng Việt)</label>
                                        <textarea name="report_title_vn" value={editingSpeaker.report_title_vn || ''} onChange={handleChange} rows={2} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all text-sm font-medium leading-relaxed" />
                                    </div>

                                    <div>
                                        <label className="block text-[13px] font-bold text-gray-600 mb-2">Tên bài báo cáo (Tiếng Anh)</label>
                                        <textarea name="report_title_en" value={editingSpeaker.report_title_en || ''} onChange={handleChange} rows={2} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all text-sm font-medium leading-relaxed italic" />
                                    </div>

                                    <div>
                                        <label className="block text-[13px] font-bold text-gray-600 mb-2">Tóm tắt bài báo cáo</label>
                                        <textarea name="abstract_text" value={editingSpeaker.abstract_text || ''} onChange={handleChange} rows={4} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all text-[13px] font-medium leading-relaxed" />
                                    </div>

                                    <div className="p-4 bg-secondary/5 rounded-2xl border border-secondary/10 flex items-center justify-between">
                                        <div>
                                            <p className="text-[13px] font-bold text-secondary mb-1">Trạng thái hồ sơ</p>
                                            <p className="text-[11px] text-gray-500 font-medium italic">Xác nhận quyền trình bày của chuyên gia.</p>
                                        </div>
                                        <select name="status" value={editingSpeaker.status || ''} onChange={handleChange} className="px-4 py-2 bg-white border border-secondary/20 rounded-xl outline-none text-xs font-bold text-secondary">
                                            <option value={Status.PENDING}>Chờ duyệt</option>
                                            <option value={Status.APPROVED}>Đã duyệt</option>
                                            <option value={Status.REJECTED}>Từ chối</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-8 py-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
                            <button onClick={closeModal} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 transition-all">Hủy</button>
                            <button onClick={handleSave} disabled={loading || isUploading} className="px-10 py-2.5 bg-secondary text-white font-bold rounded-xl hover:bg-secondary-dark transition-all shadow-md shadow-secondary/20 disabled:opacity-50 flex items-center gap-2">
                                {loading ? (
                                    <>
                                        <SpinnerIcon className="w-4 h-4 animate-spin" />
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
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800 tracking-tight">Chi tiết Báo cáo viên</h2>
                            <button onClick={closeModal} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-all text-gray-400">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-8 py-8">
                            <div className="flex flex-col md:flex-row gap-8">
                                <div className="w-full md:w-64 space-y-6 text-center md:text-left">
                                    <img src={viewingSpeaker.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(viewingSpeaker.full_name)}&background=random&size=200`} className="w-48 h-48 mx-auto md:mx-0 rounded-3xl object-cover border-4 border-white shadow-xl" alt="" />
                                    <div>
                                        <h3 className="text-2xl font-bold text-[#061D5F] leading-tight mb-2">{viewingSpeaker.academic_rank} {viewingSpeaker.full_name}</h3>
                                        <div className="inline-flex items-center px-4 py-1.5 bg-gray-50 rounded-full border border-gray-100 text-[11px] font-bold text-gray-500 tracking-wider">
                                            {viewingSpeaker.speaker_type || 'Báo cáo viên'}
                                        </div>
                                    </div>
                                    <div className="space-y-3 pt-4 border-t border-gray-50">
                                        <div className="flex items-center gap-3 text-sm font-medium text-gray-600">
                                            <span className="material-symbols-outlined text-gray-400">mail</span>
                                            {viewingSpeaker.email}
                                        </div>
                                        <div className="flex items-center gap-3 text-sm font-medium text-gray-600">
                                            <span className="material-symbols-outlined text-gray-400">call</span>
                                            {viewingSpeaker.phone || 'Chưa cập nhật'}
                                        </div>
                                        <div className="flex items-center gap-3 text-sm font-medium text-gray-600">
                                            <span className="material-symbols-outlined text-gray-400">apartment</span>
                                            {viewingSpeaker.workplace}
                                        </div>
                                        <div className="flex items-center gap-3 text-sm font-medium text-gray-600">
                                            <span className="material-symbols-outlined text-gray-400">public</span>
                                            {viewingSpeaker.country || 'Việt Nam'}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 space-y-8">
                                    <div className="p-6 bg-secondary/5 rounded-3xl border border-secondary/10">
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className="material-symbols-outlined text-secondary">clinical_notes</span>
                                            <h4 className="text-[11px] font-bold text-secondary uppercase tracking-widest">Đề tài báo cáo</h4>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-sm font-bold text-gray-800 leading-relaxed">{viewingSpeaker.report_title_vn}</p>
                                                {viewingSpeaker.report_title_en && (
                                                    <p className="text-xs text-gray-500 mt-2 italic font-medium">{viewingSpeaker.report_title_en}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-gray-400">description</span>
                                            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Nội dung tóm tắt</h4>
                                        </div>
                                        <div className="text-[13px] text-gray-600 leading-relaxed font-medium bg-gray-50 p-6 rounded-3xl border border-gray-100 whitespace-pre-wrap">
                                            {viewingSpeaker.abstract_text || 'Chưa có nội dung tóm tắt.'}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        {viewingSpeaker.abstract_file_url && (
                                            <a href={viewingSpeaker.abstract_file_url} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-3 p-4 bg-white border border-gray-100 rounded-2xl hover:shadow-md transition-all group">
                                                <span className="material-symbols-outlined text-blue-500 group-hover:scale-110 transition-transform">picture_as_pdf</span>
                                                <span className="text-xs font-bold text-gray-700">File Abstract</span>
                                            </a>
                                        )}
                                        {viewingSpeaker.report_file_url && (
                                            <a href={viewingSpeaker.report_file_url} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-3 p-4 bg-white border border-gray-100 rounded-2xl hover:shadow-md transition-all group">
                                                <span className="material-symbols-outlined text-emerald-500 group-hover:scale-110 transition-transform">slideshow</span>
                                                <span className="text-xs font-bold text-gray-700">File Báo cáo</span>
                                            </a>
                                        )}
                                        {viewingSpeaker.cv_file_url && (
                                            <a href={viewingSpeaker.cv_file_url} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-3 p-4 bg-white border border-gray-100 rounded-2xl hover:shadow-md transition-all group">
                                                <span className="material-symbols-outlined text-amber-500 group-hover:scale-110 transition-transform">article</span>
                                                <span className="text-xs font-bold text-gray-700">Hồ sơ CV</span>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="px-8 py-6 border-t border-gray-50 flex justify-end">
                            <button onClick={closeModal} className="px-8 py-2.5 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-700 transition-all shadow-lg shadow-gray-200 text-sm">Đóng</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SpeakerManagement;
