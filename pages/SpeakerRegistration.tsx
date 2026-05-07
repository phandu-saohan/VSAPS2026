import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, uploadFileToStorage } from '../supabaseClient';
import { Speaker, Status } from '../types';
import { useToast } from '../contexts/ToastContext';
import { SpinnerIcon } from '../components/icons/SpinnerIcon';
import { DEFAULT_LANDING_CONFIG, LandingConfig } from '../types/landing';
import Cropper from 'react-easy-crop';


declare global {
  interface Window {
    ClassicEditor: any;
  }
}

function SupabaseUploadAdapterPlugin(editor: any) {
    editor.plugins.get('FileRepository').createUploadAdapter = (loader: any) => {
        return new SupabaseUploadAdapter(loader);
    };
}

class SupabaseUploadAdapter {
    private loader: any;
    constructor(loader: any) { this.loader = loader; }
    upload() {
        return this.loader.file.then((file: File) => new Promise((resolve, reject) => {
            uploadFileToStorage(file, 'event_assets', 'speaker_notes_images')
                .then(publicUrl => publicUrl ? resolve({ default: publicUrl }) : reject('Upload failed.'))
                .catch(reject);
        }));
    }
    abort() {}
}

const toTitleCase = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

type UploadingState = Partial<Record<keyof Speaker, boolean>>;
type FileNamesState = Partial<Record<keyof Speaker, string>>;

const SpeakerRegistration: React.FC = () => {
    const { addToast } = useToast();
    const navigate = useNavigate();
    
    const [cfg, setCfg] = useState<LandingConfig>(DEFAULT_LANDING_CONFIG);
    const [cfgLoading, setCfgLoading] = useState(true);
    const [menuOpen, setMenuOpen] = useState(false);
    const [step, setStep] = useState(1);

    // Fetch config from DB for venue/date in header
    useEffect(() => {
      (async () => {
        const { data } = await supabase.from('settings').select('landing_config').eq('id', 1).single();
        if (data?.landing_config) setCfg(p => ({ ...p, ...(data.landing_config as Partial<LandingConfig>) }));
        setCfgLoading(false);
      })();
    }, []);

    const initialFormData = {
        full_name: '',
        academic_rank: '',
        email: '',
        phone: '',
        workplace: '',
        report_title_vn: '',
        report_title_en: '',
        abstract_text: '',
        abstract_text_en: '',
        keywords: '',
        speaker_type: 'Báo cáo viên' as Speaker['speaker_type'],
        password: '',
        confirmPassword: '',
        country: 'Việt Nam',
    };

    const [formData, setFormData] = useState(initialFormData);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploading, setUploading] = useState<UploadingState>({});
    const [fileNames, setFileNames] = useState<FileNamesState>({});
    const [uploadedUrls, setUploadedUrls] = useState<Partial<Record<keyof Speaker, string>>>({});
    const [avatarPreview, setAvatarPreview] = useState('');
    const [error, setError] = useState('');
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);

    const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<File> => {
        const image = new Image();
        image.src = imageSrc;
        await new Promise(resolve => { image.onload = resolve; });
        const canvas = document.createElement('canvas');
        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('No 2d context');
        ctx.drawImage(
            image,
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            pixelCrop.width,
            pixelCrop.height
        );
        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (!blob) return reject(new Error('Canvas is empty'));
                const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
                resolve(file);
            }, 'image/jpeg');
        });
    };

    const handleConfirmCrop = async () => {
        if (!imageToCrop || !croppedAreaPixels) return;
        try {
            const croppedFile = await getCroppedImg(imageToCrop, croppedAreaPixels);
            setIsCropModalOpen(false);
            setImageToCrop(null);
            
            // Upload the cropped file
            setUploading(prev => ({ ...prev, avatar_url: true }));

            // Convert to base64 data URL and store directly in DB
            // (Storage upload bypassed due to self-hosted storage service limitations)
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                setAvatarPreview(base64);
                setUploadedUrls(prev => ({ ...prev, avatar_url: base64 }));
                setUploading(prev => ({ ...prev, avatar_url: false }));
                setIsCropModalOpen(false);
                setImageToCrop(null);
                addToast('Ảnh đại diện đã sẵn sàng.', 'success');
            };
            reader.onerror = () => {
                addToast('Không thể đọc file ảnh.', 'error');
                setUploading(prev => ({ ...prev, avatar_url: false }));
            };
            reader.readAsDataURL(croppedFile);
            return; // wait for reader.onloadend
        } catch (e: any) {
            console.error(e);
            addToast(`Lỗi khi cắt ảnh: ${e.message || e}`, 'error');
            setUploading(prev => ({ ...prev, avatar_url: false }));
            setAvatarPreview('');
        }
    };

    const [activeLangTab, setActiveLangTab] = useState<'vi' | 'en'>('vi');
    const abstractEditorRef = useRef<any>(null);
    const abstractEnEditorRef = useRef<any>(null);

    useEffect(() => {
        if (window.ClassicEditor) {
            const initEditor = (id: string, ref: React.MutableRefObject<any>, field: 'abstract_text' | 'abstract_text_en') => {
                const element = document.querySelector<HTMLElement>(`#${id}`);
                if (element && !ref.current && !element.dataset.editorInit) {
                    element.dataset.editorInit = 'true';
                    window.ClassicEditor
                        .create(element, {
                            extraPlugins: [SupabaseUploadAdapterPlugin],
                            toolbar: {
                                items: ['undo', 'redo', '|', 'heading', '|', 'bold', 'italic', '|', 'link', 'bulletedList', 'numberedList', 'blockQuote', '|', 'imageInsert'],
                                shouldNotGroupWhenFull: true
                            },
                        })
                        .then((editor: any) => {
                            ref.current = editor;
                            // Set styling to increase height
                            editor.editing.view.change((writer: any) => {
                                writer.setStyle('min-height', '300px', editor.editing.view.document.getRoot());
                            });
                            
                            editor.model.document.on('change:data', () => {
                                setFormData(prev => ({ ...prev, [field]: editor.getData() }));
                            });
                        })
                        .catch((err: any) => {
                            delete element.dataset.editorInit;
                            console.error("Editor init error:", err);
                        });
                }
            };

            initEditor('abstract_text_editor', abstractEditorRef, 'abstract_text');
            initEditor('abstract_text_en_editor', abstractEnEditorRef, 'abstract_text_en');
        }
        return () => {
            if (abstractEditorRef.current) {
                abstractEditorRef.current.destroy().catch(console.error);
                abstractEditorRef.current = null;
                const el = document.querySelector<HTMLElement>('#abstract_text_editor');
                if (el) delete el.dataset.editorInit;
            }
            if (abstractEnEditorRef.current) {
                abstractEnEditorRef.current.destroy().catch(console.error);
                abstractEnEditorRef.current = null;
                const elEn = document.querySelector<HTMLElement>('#abstract_text_en_editor');
                if (elEn) delete elEn.dataset.editorInit;
            }
        };
    }, []);

    const [isSuccess, setIsSuccess] = useState(false);
    
    const notifyAdmins = async (fullName: string) => {
        const { data: admins, error } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'Quản trị viên');
        
        if (error || !admins) return;

        const message = `Có Báo cáo viên mới đăng ký tài khoản: ${fullName}.`;
        const link = '/speakers';

        const notificationsToInsert = admins.map(admin => ({
            user_id: admin.id,
            message,
            link,
            read: false,
        }));
        
        await supabase.from('notifications').insert(notificationsToInsert);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'full_name') {
            setFormData(prev => ({...prev, [name]: toTitleCase(value)}));
        } else {
            setFormData(prev => ({...prev, [name]: value}));
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: keyof Speaker) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            
            if (fieldName === 'avatar_url') {
                const reader = new FileReader();
                reader.onload = () => {
                    setImageToCrop(reader.result as string);
                    setIsCropModalOpen(true);
                };
                reader.readAsDataURL(file);
                return;
            }

            setUploading(prev => ({ ...prev, [fieldName]: true }));
            setFileNames(prev => ({ ...prev, [fieldName]: file.name }));


            const folderMap = {
                avatar_url: 'speakers/avatar_url',
                passport_url: 'speakers/passport_url',
                abstract_file_url: 'speakers/abstract_file_url',
                report_file_url: 'speakers/report_file_url',
                cv_file_url: 'speakers/cv_files',
            };
            const folder = folderMap[fieldName as keyof typeof folderMap] || 'speakers/other';

            const publicUrl = await uploadFileToStorage(file, 'event_assets', folder);
            
            if (publicUrl) {
                setUploadedUrls(prev => ({ ...prev, [fieldName]: publicUrl }));
                addToast(`Tải lên ${file.name} thành công.`, 'success');
            } else {
                addToast(`Tải lên ${file.name} thất bại. Vui lòng thử lại.`, 'error');
                setFileNames(prev => ({ ...prev, [fieldName]: undefined }));
            }
            
            setUploading(prev => ({ ...prev, [fieldName]: false }));
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.full_name || !formData.email || !formData.password || !formData.confirmPassword || !formData.academic_rank || !formData.workplace || !formData.report_title_vn) {
            setError('Vui lòng điền đầy đủ các trường bắt buộc (*).');
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            setError('Mật khẩu xác nhận không khớp.');
            return;
        }
        if (formData.password.length < 6) {
            setError('Mật khẩu phải có ít nhất 6 ký tự.');
            return;
        }

        setIsSubmitting(true);
        try {
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.full_name,
                        role: 'Báo cáo viên'
                    }
                }
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('Không thể tạo tài khoản người dùng.');

            const speakerData: any = {
                full_name: formData.full_name,
                academic_rank: formData.academic_rank,
                email: formData.email,
                phone: formData.phone,
                workplace: formData.workplace,
                report_title_vn: formData.report_title_vn,
                report_title_en: formData.report_title_en,
                abstract_text: formData.abstract_text,
                abstract_text_en: formData.abstract_text_en,
                keywords: formData.keywords,
                speaker_type: formData.speaker_type,
                status: Status.PENDING,
                user_id: authData.user.id,
                ...uploadedUrls
            };

            const { error: insertError } = await supabase
                .from('speakers')
                .insert([speakerData]);
            
            if (insertError) {
                throw insertError;
            }

            await notifyAdmins(formData.full_name);
            setIsSuccess(true);
            
        } catch (err: any) {
            let message = err.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
            if (message.includes('Error sending confirmation email')) {
                message = 'Lỗi gửi email xác nhận. Vui lòng kiểm tra cấu hình SMTP.';
            }
            setError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    /* ═══ HEADER ═══ */
    const Header = () => (
      <nav className="bg-[#061D5F] text-white sticky top-0 z-50 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
          <a href="#/" className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#F95E8B] rounded-sm flex items-center justify-center font-black text-white text-lg">VS</div>
            <div className="h-8 w-px bg-white/20"></div>
            <span className="text-sm font-semibold tracking-widest uppercase hidden sm:inline">VSAPS 2026</span>
          </a>
          <div className="hidden lg:flex items-center gap-6">
            <a className="text-xs font-bold uppercase tracking-widest hover:text-[#F95E8B] transition-colors" href="#/">Trang chủ</a>
            <a className="text-xs font-bold uppercase tracking-widest text-white/80 hover:text-[#F95E8B]" href="#/register-delegate">Đăng ký Đại biểu</a>
            <a className="text-xs font-bold uppercase tracking-widest text-[#F95E8B]" href="#/register-speaker">Đăng ký Báo cáo viên</a>
            <a href="#/login" className="ml-4 px-5 py-2 bg-[#F95E8B] text-white text-xs font-bold uppercase rounded-sm hover:brightness-110 transition-all">Đăng nhập →</a>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="lg:hidden"><span className="material-symbols-outlined text-2xl">menu</span></button>
        </div>
        <div className={`lg:hidden overflow-hidden bg-[#061D5F] border-t border-white/10 transition-all duration-300 ${menuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-6 py-4 space-y-4">
            <a className="block text-xs font-bold uppercase tracking-widest text-white/80 hover:text-[#F95E8B]" href="#/">Trang chủ</a>
            <a className="block text-xs font-bold uppercase tracking-widest text-white/80 hover:text-[#F95E8B]" href="#/register-delegate">Đăng ký Đại biểu</a>
            <a className="block text-xs font-bold uppercase tracking-widest text-[#F95E8B]" href="#/register-speaker">Đăng ký Báo cáo viên</a>
            <a href="#/login" className="block px-6 py-3 bg-[#F95E8B] text-white text-xs font-bold uppercase text-center rounded-sm">Đăng nhập →</a>
          </div>
        </div>
      </nav>
    );

    /* ═══ FOOTER ═══ */
    const Footer = () => (
      <footer className="bg-[#061D5F] text-white px-6 py-12 mt-auto">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#F95E8B] rounded-sm flex items-center justify-center font-black text-lg">VS</div>
              <span className="text-xl font-black tracking-tighter">VSAPS 2026</span>
            </div>
            <p className="text-white/40 text-xs leading-relaxed max-w-sm">Hội Phẫu thuật Tạo hình Thẩm mỹ Việt Nam. 11–14 tháng 12, 2026 tại Bệnh viện Quân y 175, TP.HCM.</p>
          </div>
          <div>
            <h5 className="text-[10px] font-bold uppercase tracking-widest text-[#F95E8B] mb-4">Liên kết</h5>
            <ul className="space-y-2 text-xs text-white/50">
              <li><a href="#/" className="hover:text-white">Trang chủ</a></li>
              <li><a href="#/register-delegate" className="hover:text-white">Đăng ký Đại biểu</a></li>
              <li><a href="#/login" className="hover:text-white">Đăng nhập</a></li>
            </ul>
          </div>
          <div>
            <h5 className="text-[10px] font-bold uppercase tracking-widest text-[#F95E8B] mb-4">Ban Thư ký</h5>
            <p className="text-xs text-white/50 leading-relaxed">vsapsevents@gmail.com<br/>+84 (28) 3895 4941<br/><br/>786 Nguyễn Kiệm, Gò Vấp, TP.HCM</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-white/10">
          <p className="text-[10px] text-white/30 uppercase tracking-widest">© 2026 VSAPS. Bảo lưu mọi quyền.</p>
        </div>
      </footer>
    );

    const FileUploadBox = ({ label, field, accept, icon = "cloud_upload", required = false }: { label: string, field: keyof Speaker, accept: string, icon?: string, required?: boolean }) => {
        const isUp = uploading[field];
        const isDone = !!uploadedUrls[field];
        const name = fileNames[field];

        return (
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{label} {required && <span className="text-red-500">*</span>}</label>
                <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${isDone ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-[#061D5F]'}`}>
                    {isDone ? (
                        <>
                            <span className="material-symbols-outlined text-3xl text-green-500">check_circle</span>
                            <span className="text-sm font-semibold text-green-700 mt-1 truncate px-2 max-w-full">{name || 'Đã tải lên'}</span>
                        </>
                    ) : isUp ? (
                        <SpinnerIcon className="w-8 h-8 text-[#061D5F]" />
                    ) : (
                        <>
                            <span className="material-symbols-outlined text-3xl text-gray-400">{icon}</span>
                            <span className="text-sm text-gray-500 mt-1">Nhấn để tải tệp</span>
                            <span className="text-xs text-gray-400 mt-1">{accept.replace(/,/g, ', ')}</span>
                        </>
                    )}
                    <input type="file" className="sr-only" accept={accept} onChange={e => handleFileChange(e, field)} disabled={isUp} />
                </label>
            </div>
        );
    };

    if (isSuccess) return (
      <div className="min-h-screen flex flex-col bg-[#F8FAFC] font-sans">
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-white rounded-3xl shadow-xl p-10 text-center animate-fade-in">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-4xl text-green-600">check_circle</span>
            </div>
            <h1 className="text-3xl font-extrabold text-[#061D5F] mb-3">Đăng ký thành công!</h1>
            <p className="text-gray-500 mb-8 leading-relaxed">
              Cảm ơn <span className="font-bold">{formData.full_name}</span> đã đăng ký báo cáo viên. 
              Tài khoản của bạn đã được tạo. Vui lòng chờ Ban tổ chức duyệt thông tin bài báo cáo.
            </p>
            <div className="flex flex-col gap-3">
              <Link to="/login" className="inline-block px-8 py-3 bg-[#061D5F] text-white font-bold rounded-xl hover:bg-blue-900 transition-colors">Đến trang Đăng nhập</Link>
              <Link to="/" className="inline-block px-8 py-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-colors">Quay về trang chủ</Link>
            </div>
          </div>
        </div>
        <Footer />
        <style>{`.animate-fade-in { animation: fadeIn 0.6s ease-out forwards; } @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      </div>
    );

    const steps = ['Định danh', 'Bài báo cáo'];

    return (
        <div className="min-h-screen flex flex-col bg-[#F8FAFC] font-sans">
            <Header />
            <div className="flex-1 py-10 px-4">
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-extrabold text-[#061D5F]">Đăng ký Báo cáo viên</h1>
                    <p className="text-gray-400 mt-1 text-sm">{cfgLoading ? 'Đang tải...' : `${cfg.event_date_display} · ${cfg.event_venue_display}`}</p>
                </div>

                
                <div className="max-w-7xl mx-auto">
                    {error && <p className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-sm text-center mb-6 max-w-2xl mx-auto">{error}</p>}
                    
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* LEFT COLUMN: Account & Identity */}
                        <div className="lg:col-span-1 bg-white rounded-3xl shadow-sm border border-gray-100 p-8 space-y-5 h-fit">
                            <h2 className="text-xl font-bold text-[#061D5F] flex items-center gap-2"><span className="material-symbols-outlined">person</span> Tài khoản & Định danh</h2>
                            
                            {/* Avatar upload */}
                            <div className="flex flex-col items-center gap-3 pb-4 border-b border-gray-100">
                                <label className="relative cursor-pointer group rounded-full block">
                                    {avatarPreview || uploadedUrls.avatar_url ? (
                                        <img src={avatarPreview || uploadedUrls.avatar_url} alt="Avatar" className="w-28 h-28 rounded-full object-cover border-4 border-[#061D5F]/10 group-hover:border-[#F95E8B] transition-colors"/>
                                    ) : (
                                        <div className="w-28 h-28 rounded-full bg-gray-100 flex items-center justify-center border-4 border-gray-200 group-hover:border-[#F95E8B] transition-colors">
                                            <span className="material-symbols-outlined text-4xl text-gray-400 group-hover:text-[#F95E8B] transition-colors">add_a_photo</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        {uploading.avatar_url ? <SpinnerIcon className="w-6 h-6 text-white"/> : <span className="material-symbols-outlined text-white text-2xl">edit</span>}
                                    </div>
                                    <input type="file" className="sr-only" accept="image/*" onChange={e => handleFileChange(e, 'avatar_url')} disabled={uploading.avatar_url}/>
                                </label>
                                <span className="text-sm font-semibold text-gray-700">Ảnh đại diện</span>
                                <span className="text-xs text-gray-400 text-center">Bấm vào khung ảnh để tải lên<br/>(Hỗ trợ tự động cắt ảnh 1:1)</span>
                            </div>

                            <div className="space-y-4">
                                {[
                                    {n:'academic_rank',l:'Học hàm/Học vị',r:true,ph:'VD: PGS.TS.BS'},
                                    {n:'full_name',l:'Họ và tên',r:true,ph:'Nhập đầy đủ họ và tên'},
                                    {n:'email',l:'Email (Tài khoản)',r:true,ph:'email@example.com',t:'email'},
                                    {n:'phone',l:'Số điện thoại',r:true,ph:'0901 234 567',t:'tel'},
                                    {n:'password',l:'Mật khẩu',r:true,ph:'Tối thiểu 6 ký tự',t:'password'},
                                    {n:'confirmPassword',l:'Xác nhận mật khẩu',r:true,ph:'Nhập lại mật khẩu',t:'password'},
                                ].map(x => (
                                    <div key={x.n}>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">{x.l} {x.r && <span className="text-red-500">*</span>}</label>
                                        <input name={x.n} type={x.t||'text'} value={(formData as any)[x.n]} onChange={handleChange} required={x.r} placeholder={x.ph}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                ))}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nơi công tác <span className="text-red-500">*</span></label>
                                    <input name="workplace" value={formData.workplace} onChange={handleChange} required placeholder="Tên bệnh viện, trung tâm hoặc cơ sở y tế"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Quốc gia <span className="text-red-500">*</span></label>
                                    <select name="country" value={formData.country} onChange={handleChange} required
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="Việt Nam">Việt Nam</option>
                                        <option value="Hoa Kỳ">Hoa Kỳ</option>
                                        <option value="Hàn Quốc">Hàn Quốc</option>
                                        <option value="Nhật Bản">Nhật Bản</option>
                                        <option value="Pháp">Pháp</option>
                                        <option value="Đức">Đức</option>
                                        <option value="Singapore">Singapore</option>
                                        <option value="Thái Lan">Thái Lan</option>
                                        <option value="Đài Loan">Đài Loan</option>
                                        <option value="Khác">Khác</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-gray-100">
                                <FileUploadBox label="Sơ yếu lý lịch khoa học" field="cv_file_url" accept=".pdf,.doc,.docx" icon="description" />
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Report Details */}
                        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 p-8 space-y-5 h-fit">
                            <h2 className="text-xl font-bold text-[#061D5F] flex items-center gap-2"><span className="material-symbols-outlined">description</span> Thông tin bài báo cáo</h2>
                            
                            {/* Tabs Header */}
                            <div className="flex border-b border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setActiveLangTab('vi')}
                                    className={`py-3 px-6 font-bold text-sm border-b-2 transition-colors ${activeLangTab === 'vi' ? 'border-[#F95E8B] text-[#F95E8B]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                >
                                    Tiếng Việt (Bắt buộc)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveLangTab('en')}
                                    className={`py-3 px-6 font-bold text-sm border-b-2 transition-colors ${activeLangTab === 'en' ? 'border-[#F95E8B] text-[#F95E8B]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                >
                                    Tiếng Anh
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-5 mt-4">
                                {/* TAB TIẾNG VIỆT */}
                                <div className={`${activeLangTab === 'vi' ? 'block' : 'hidden'} space-y-5`}>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tên bài báo cáo (Tiếng Việt) <span className="text-red-500">*</span></label>
                                        <textarea name="report_title_vn" value={formData.report_title_vn} onChange={handleChange} required={activeLangTab === 'vi'} rows={2} placeholder="Nhập tiêu đề bài báo cáo bằng tiếng Việt"
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tóm tắt báo cáo (Abstract) <span className="text-red-500">*</span></label>
                                        <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 min-h-[300px]">
                                            <div id="abstract_text_editor"></div>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-2">Định dạng văn bản tóm tắt hoặc chèn hình ảnh minh họa bằng công cụ soạn thảo.</p>
                                    </div>
                                </div>

                                {/* TAB TIẾNG ANH */}
                                <div className={`${activeLangTab === 'en' ? 'block' : 'hidden'} space-y-5`}>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tên bài báo cáo (Tiếng Anh)</label>
                                        <textarea name="report_title_en" value={formData.report_title_en} onChange={handleChange} rows={2} placeholder="Enter presentation title in English"
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tóm tắt báo cáo (Abstract in English)</label>
                                        <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 min-h-[300px]">
                                            <div id="abstract_text_en_editor"></div>
                                        </div>
                                    </div>
                                </div>

                                {/* KEYWORDS & FILE UPLOAD */}
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <div className="mb-6">
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Từ khóa tìm kiếm (Keywords) <span className="text-red-500">*</span></label>
                                        <input name="keywords" value={formData.keywords} onChange={handleChange} required placeholder="VD: Nâng mũi, Thẩm mỹ nội khoa, Mắt..."
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                        <p className="text-xs text-gray-400 mt-1">Nhập các từ khóa liên quan đến bài báo cáo, phân cách bằng dấu phẩy.</p>
                                    </div>
                                    
                                    <div className="w-1/2">
                                        <FileUploadBox label="Tệp bài báo cáo đầy đủ" field="report_file_url" accept=".pdf,.ppt,.pptx,.doc,.docx" icon="slideshow" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-6 mt-6 border-t border-gray-100">
                                <button type="submit" disabled={isSubmitting || Object.values(uploading).some(v => v)} className="px-8 py-3 bg-[#F95E8B] text-white font-bold rounded-xl hover:brightness-110 disabled:opacity-50 flex items-center gap-2">
                                    {isSubmitting ? <><SpinnerIcon className="w-5 h-5"/> Đang gửi...</> : <><span className="material-symbols-outlined">send</span> Hoàn tất đăng ký</>}
                                </button>
                            </div>
                        </div>
                    </form>
                    
                    <p className="text-center mt-8 text-sm text-gray-400">Đã có tài khoản? <Link to="/login" className="text-[#061D5F] font-bold hover:underline">Đăng nhập</Link></p>
                </div>
            </div>

            {/* Crop Modal */}
            {isCropModalOpen && imageToCrop && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-[#061D5F] text-lg">Cắt ảnh đại diện</h3>
                            <button type="button" onClick={() => setIsCropModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="relative w-full h-[400px] bg-gray-900">
                            <Cropper
                                image={imageToCrop}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                cropShape="round"
                                showGrid={false}
                                onCropChange={setCrop}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                            />
                        </div>
                        <div className="p-4 bg-white border-t border-gray-100 space-y-4">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-gray-400 text-sm">zoom_out</span>
                                <input
                                    type="range"
                                    value={zoom}
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    aria-labelledby="Zoom"
                                    onChange={(e) => setZoom(Number(e.target.value))}
                                    className="w-full accent-[#F95E8B]"
                                />
                                <span className="material-symbols-outlined text-gray-400 text-sm">zoom_in</span>
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setIsCropModalOpen(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200">
                                    Hủy
                                </button>
                                <button type="button" onClick={handleConfirmCrop} className="flex-1 py-3 bg-[#F95E8B] text-white font-bold rounded-xl hover:brightness-110">
                                    Xác nhận cắt
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
};

export default SpeakerRegistration;
