import re

with open('c:/VSAPS2026/pages/SpeakerRegistration.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update initialFormData to include abstract_text_en and remove abstract_file_url logic.
# Wait, abstract_file_url is still in types, so we just don't send it or send empty.
# We need to add abstract_text_en to formData state.
content = content.replace("abstract_text: '',", "abstract_text: '',\n        abstract_text_en: '',")

# Add a state for tabs
content = content.replace("const [error, setError] = useState('');", "const [error, setError] = useState('');\n    const [activeLangTab, setActiveLangTab] = useState<'vi' | 'en'>('vi');")

# Add abstract_text_en to speakerData payload
content = content.replace("abstract_text: formData.abstract_text,", "abstract_text: formData.abstract_text,\n                abstract_text_en: formData.abstract_text_en,")

# 2. Refactor CKEditor logic to handle both tabs.
# Since we have tabs, switching tabs could unmount the editor, or we have two editors, or we re-initialize.
# The easiest way in React without unmounting is using `display: none` for the inactive tab content.
# So both textareas/divs are always rendered, just hidden.
# I'll create two refs and initialize two editors.

ckeditor_hooks = """    const abstractEditorRef = useRef<any>(null);
    const abstractEnEditorRef = useRef<any>(null);

    useEffect(() => {
        if (window.ClassicEditor) {
            const initEditor = (id: string, ref: React.MutableRefObject<any>, field: 'abstract_text' | 'abstract_text_en') => {
                const element = document.querySelector<HTMLElement>(`#${id}`);
                if (element && !ref.current) {
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
                        .catch((err: any) => console.error("Editor init error:", err));
                }
            };

            initEditor('abstract_text_editor', abstractEditorRef, 'abstract_text');
            initEditor('abstract_text_en_editor', abstractEnEditorRef, 'abstract_text_en');
        }
        return () => {
            if (abstractEditorRef.current) {
                abstractEditorRef.current.destroy().catch(console.error);
                abstractEditorRef.current = null;
            }
            if (abstractEnEditorRef.current) {
                abstractEnEditorRef.current.destroy().catch(console.error);
                abstractEnEditorRef.current = null;
            }
        };
    }, []);
"""

# Replace the old hook
old_hook_regex = re.compile(r"    const abstractEditorRef = useRef<any>\(null\);.*?return \(\) => \{.*?\};\n    \}, \[\]\);\n", re.DOTALL)
content = old_hook_regex.sub(ckeditor_hooks, content)

# 3. Refactor the Right Column
right_col_regex = re.compile(r"\{/\* RIGHT COLUMN: Report Details \*/\}.*?<div className=\"flex justify-end pt-6 mt-6 border-t border-gray-100\">", re.DOTALL)

new_right_col = """{/* RIGHT COLUMN: Report Details */}
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

                                {/* COMMON FIELD */}
                                <div className="mt-4 pt-4 border-t border-gray-100 w-1/2">
                                    <FileUploadBox label="Tệp bài báo cáo đầy đủ" field="report_file_url" accept=".pdf,.ppt,.pptx,.doc,.docx" icon="slideshow" />
                                </div>
                            </div>

                            <div className="flex justify-end pt-6 mt-6 border-t border-gray-100">"""

content = right_col_regex.sub(new_right_col, content)

with open('c:/VSAPS2026/pages/SpeakerRegistration.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated SpeakerRegistration.tsx")
