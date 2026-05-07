import re

with open('c:/VSAPS2026/pages/SpeakerRegistration.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
content = content.replace("import { DEFAULT_LANDING_CONFIG, LandingConfig } from '../types/landing';", 
                          "import { DEFAULT_LANDING_CONFIG, LandingConfig } from '../types/landing';\nimport Cropper from 'react-easy-crop';")

# 2. initialFormData and state
content = content.replace("abstract_text_en: '',", "abstract_text_en: '',\n        keywords: '',")
content = content.replace("abstract_text_en: formData.abstract_text_en,", "abstract_text_en: formData.abstract_text_en,\n                keywords: formData.keywords,")

crop_state = """    const [crop, setCrop] = useState({ x: 0, y: 0 });
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
            setAvatarPreview(URL.createObjectURL(croppedFile));
            const publicUrl = await uploadFileToStorage(croppedFile, 'event_assets', 'speakers/avatar_url');
            if (publicUrl) {
                setUploadedUrls(prev => ({ ...prev, avatar_url: publicUrl }));
                addToast('Tải lên ảnh đại diện thành công.', 'success');
            } else {
                addToast('Tải lên ảnh đại diện thất bại.', 'error');
                setAvatarPreview('');
            }
            setUploading(prev => ({ ...prev, avatar_url: false }));
        } catch (e) {
            console.error(e);
            addToast('Lỗi khi cắt ảnh', 'error');
        }
    };
"""

content = content.replace("const [error, setError] = useState('');", "const [error, setError] = useState('');\n" + crop_state)

# Need to import useCallback
content = content.replace("import React, { useState, useEffect, useRef } from 'react';", "import React, { useState, useEffect, useRef, useCallback } from 'react';")

# 3. Modify handleFileChange to intercept avatar_url
handle_file_replace = """    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: keyof Speaker) => {
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

            setUploading(prev => ({ ...prev, [fieldName]: true }));"""

content = content.replace("""    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: keyof Speaker) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setUploading(prev => ({ ...prev, [fieldName]: true }));""", handle_file_replace)

# 4. Replace Avatar Area to be clickable entirely
avatar_area_old = """                            {/* Avatar upload */}
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
                            </div>"""

avatar_area_new = """                            {/* Avatar upload */}
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
                            </div>"""

content = content.replace(avatar_area_old, avatar_area_new)

# 5. Add Keywords field below Abstract
keywords_field = """                                </div>

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
                                </div>"""

# Replace the common field area
common_field_old = """                                {/* COMMON FIELD */}
                                <div className="mt-4 pt-4 border-t border-gray-100 w-1/2">
                                    <FileUploadBox label="Tệp bài báo cáo đầy đủ" field="report_file_url" accept=".pdf,.ppt,.pptx,.doc,.docx" icon="slideshow" />
                                </div>"""

content = content.replace(common_field_old, keywords_field)

# 6. Add Crop Modal UI
crop_modal = """
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
"""

content = content.replace("            <Footer />", crop_modal + "\n            <Footer />")

with open('c:/VSAPS2026/pages/SpeakerRegistration.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated SpeakerRegistration.tsx")
