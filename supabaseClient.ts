import { createClient } from '@supabase/supabase-js';

// --- IMPORTANT ---
// In development, use a relative URL so Vite proxies requests to Supabase (bypassing CORS).
// In production (Vercel), use the real absolute URL.
const isDev = import.meta.env.DEV;
const SUPABASE_PROD_URL = 'http://vsaps2026-pre0225supabase-8e734b-72-61-123-73.traefik.me';
const supabaseUrl = SUPABASE_PROD_URL;
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Uploads a file to a specified Supabase storage bucket.
 * Converts .webp images to .jpeg before uploading.
 * @param file The file to upload.
 * @param bucket The name of the storage bucket.
 * @param folder The folder within the bucket to upload to.
 * @returns The public URL of the uploaded file, or null on failure.
 */
export const uploadFileToStorage = async (file: File, bucket: string, folder: string): Promise<string | null> => {
    try {
        let fileToUpload = file;
        let fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${file.name.split('.').pop()}`;

        // Convert WEBP to JPEG
        if (file.type === 'image/webp') {
            fileName = fileName.replace('.webp', '.jpeg');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const image = new Image();
            
            const convertedFile = await new Promise<File>((resolve, reject) => {
                image.onload = () => {
                    canvas.width = image.width;
                    canvas.height = image.height;
                    ctx?.drawImage(image, 0, 0);
                    canvas.toBlob(blob => {
                        if (blob) {
                            resolve(new File([blob], fileName, { type: 'image/jpeg' }));
                        } else {
                            reject(new Error('Canvas to Blob conversion failed'));
                        }
                    }, 'image/jpeg', 0.9); // 90% quality
                };
                image.onerror = reject;
                image.src = URL.createObjectURL(file);
            });
            fileToUpload = convertedFile;
        }
        
        const filePath = `${folder}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, fileToUpload);

        if (uploadError) {
            console.error('Supabase upload error:', uploadError.message);
            throw uploadError;
        }

        const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);

        if (!data || !data.publicUrl) {
            console.error('Could not get public URL for uploaded file.');
            return null;
        }

        return data.publicUrl;
    } catch (error) {
        if (error instanceof Error) {
            console.error('Error in uploadFileToStorage:', error.message);
        } else {
            console.error('An unknown error occurred during file upload.');
        }
        return null;
    }
};

/**
 * Generates a URL for a transformed (resized) image from Supabase Storage.
 * @param publicUrl The original public URL of the image.
 * @param width The target width in pixels.
 * @param height The target height in pixels.
 * @returns The transformed image URL, or the original URL if it's invalid.
 */
export const getTransformedImageUrl = (publicUrl: string | null | undefined, width: number, height: number): string | undefined => {
    if (!publicUrl) return undefined;
    try {
        const url = new URL(publicUrl);
        url.searchParams.set('width', String(width));
        url.searchParams.set('height', String(height));
        url.searchParams.set('resize', 'contain'); // Ensures the image fits within the dimensions
        return url.toString();
    } catch (error) {
        console.error("Invalid URL for transformation:", publicUrl);
        return publicUrl; // Return original URL on error
    }
};
