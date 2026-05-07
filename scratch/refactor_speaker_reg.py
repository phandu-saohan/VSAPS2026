import re

with open('c:/VSAPS2026/pages/SpeakerRegistration.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update initialFormData
content = content.replace("report_title_en: '',\n        speaker_type: 'Báo cáo viên' as Speaker['speaker_type'],",
                          "report_title_en: '',\n        abstract_text: '',\n        speaker_type: 'Báo cáo viên' as Speaker['speaker_type'],")

# 2. Add abstract_text to speakerData
content = content.replace("report_title_en: formData.report_title_en,\n                speaker_type: formData.speaker_type,",
                          "report_title_en: formData.report_title_en,\n                abstract_text: formData.abstract_text,\n                speaker_type: formData.speaker_type,")

# 3. Add SupabaseUploadAdapterPlugin for CKEditor
ckeditor_plugin = """
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
"""
content = content.replace("const toTitleCase", ckeditor_plugin + "\nconst toTitleCase")

# 4. Add useRef and useEffect for CKEditor
ckeditor_hooks = """    const abstractEditorRef = useRef<any>(null);

    useEffect(() => {
        if (window.ClassicEditor) {
            const element = document.querySelector<HTMLElement>('#abstract_text_editor');
            if (element && !abstractEditorRef.current) {
                window.ClassicEditor
                    .create(element, {
                        extraPlugins: [SupabaseUploadAdapterPlugin],
                        toolbar: {
                            items: ['undo', 'redo', '|', 'heading', '|', 'bold', 'italic', '|', 'link', 'bulletedList', 'numberedList', 'blockQuote', '|', 'imageInsert'],
                            shouldNotGroupWhenFull: true
                        },
                    })
                    .then((editor: any) => {
                        abstractEditorRef.current = editor;
                        editor.model.document.on('change:data', () => {
                            setFormData(prev => ({ ...prev, abstract_text: editor.getData() }));
                        });
                    })
                    .catch((err: any) => console.error("Editor init error:", err));
            }
        }
        return () => {
            if (abstractEditorRef.current) {
                abstractEditorRef.current.destroy().catch(console.error);
                abstractEditorRef.current = null;
            }
        };
    }, []);
"""
content = content.replace("const [error, setError] = useState('');", "const [error, setError] = useState('');\n" + ckeditor_hooks)

# 5. Replace the form layout
# Find the start of Steps Progress and end of the form
start_idx = content.find("{/* Steps Progress */}")
end_idx = content.find("<p className=\"text-center mt-8 text-sm text-gray-400\">Đã có tài khoản?")

if start_idx != -1 and end_idx != -1:
    new_layout = """
                <div className="max-w-7xl mx-auto">
                    {error && <p className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-sm text-center mb-6 max-w-2xl mx-auto">{error}</p>}
                    
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* LEFT COLUMN: Account & Identity */}
                        <div className="lg:col-span-1 bg-white rounded-3xl shadow-sm border border-gray-100 p-8 space-y-5 h-fit">
                            <h2 className="text-xl font-bold text-[#061D5F] flex items-center gap-2"><span className="material-symbols-outlined">person</span> Tài khoản & Định danh</h2>
                            
                            {/* Avatar upload */}
                            <div className="flex flex-col items-center gap-3 pb-4 border-b border-gray-100">
                                <div className="relative">
                                    {avatarPreview || uploadedUrls.avatar_url ? (
                                        <img src={avatarPreview || uploadedUrls.avatar_url} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-[#061D5F]/10"/>
                                    ) : (
                                        <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border-4 border-gray-200">
                                            <span className="material-symbols-outlined text-4xl text-gray-300">person</span>
                                        </div>
                                    )}
                                    <label className="absolute bottom-0 right-0 w-8 h-8 bg-[#F95E8B] rounded-full flex items-center justify-center cursor-pointer hover:brightness-110 shadow-lg">
                                        {uploading.avatar_url ? <SpinnerIcon className="w-4 h-4 text-white"/> : <span className="material-symbols-outlined text-sm text-white">photo_camera</span>}
                                        <input type="file" className="sr-only" accept="image/*" onChange={e => handleFileChange(e, 'avatar_url')} disabled={uploading.avatar_url}/>
                                    </label>
                                </div>
                                <span className="text-xs text-gray-400">Ảnh đại diện</span>
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
                            </div>

                            <div className="space-y-4 pt-4 border-t border-gray-100">
                                <FileUploadBox label="Ảnh Hộ chiếu/CCCD" field="passport_url" accept="image/*" icon="id_card" />
                                <FileUploadBox label="Sơ yếu lý lịch khoa học" field="cv_file_url" accept=".pdf,.doc,.docx" icon="description" />
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Report Details */}
                        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 p-8 space-y-5 h-fit">
                            <h2 className="text-xl font-bold text-[#061D5F] flex items-center gap-2"><span className="material-symbols-outlined">description</span> Thông tin bài báo cáo</h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Vai trò tham gia</label>
                                    <select name="speaker_type" value={formData.speaker_type} onChange={handleChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500">
                                        {['Báo cáo viên', 'Chủ tọa', 'Chủ tọa/Báo cáo viên'].map(role => (
                                            <option key={role} value={role}>{role}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tên bài báo cáo (Tiếng Việt) <span className="text-red-500">*</span></label>
                                    <textarea name="report_title_vn" value={formData.report_title_vn} onChange={handleChange} required rows={2} placeholder="Nhập tiêu đề bài báo cáo bằng tiếng Việt"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tên bài báo cáo (Tiếng Anh)</label>
                                    <textarea name="report_title_en" value={formData.report_title_en} onChange={handleChange} rows={2} placeholder="Enter presentation title in English"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                                </div>
                                
                                {/* CKEditor for Abstract */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tóm tắt báo cáo (Abstract) <span className="text-red-500">*</span></label>
                                    <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                                        <div id="abstract_text_editor"></div>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2">Bạn có thể sử dụng công cụ soạn thảo ở trên để định dạng văn bản tóm tắt hoặc chèn hình ảnh minh họa.</p>
                                </div>

                                <div className="md:col-span-1">
                                    <FileUploadBox label="Tệp bài tóm tắt (Abstract)" field="abstract_file_url" accept=".pdf,.doc,.docx" icon="article" />
                                </div>
                                <div className="md:col-span-1">
                                    <FileUploadBox label="Tệp bài báo cáo đầy đủ" field="report_file_url" accept=".pdf,.ppt,.pptx,.doc,.docx" icon="slideshow" />
                                </div>
                            </div>

                            <div className="flex justify-end pt-6 mt-6 border-t border-gray-100">
                                <button type="submit" disabled={isSubmitting || Object.values(uploading).some(v => v)} className="px-8 py-3 bg-[#F95E8B] text-white font-bold rounded-xl hover:brightness-110 disabled:opacity-50 flex items-center gap-2">
                                    {isSubmitting ? <><SpinnerIcon className="w-5 h-5"/> Đang gửi...</> : <><span className="material-symbols-outlined">send</span> Hoàn tất đăng ký</>}
                                </button>
                            </div>
                        </div>
                    </form>
                    
                    """
    
    content = content[:start_idx] + new_layout + content[end_idx:]

with open('c:/VSAPS2026/pages/SpeakerRegistration.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated SpeakerRegistration.tsx")
