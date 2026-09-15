import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

function getSanitizedEnv(key: string): string {
  const val = process.env[key] || '';
  // Remove surrounding quotes and trim whitespace
  return val.replace(/^["']|["']$/g, '').trim();
}

export async function uploadFileToCloudinary(
  buffer: Buffer,
  fileName: string,
  mimeType: string = 'image/jpeg'
): Promise<string> {
  const cloudName = getSanitizedEnv('CLOUDINARY_CLOUD_NAME');
  const apiKey = getSanitizedEnv('CLOUDINARY_API_KEY');
  const apiSecret = getSanitizedEnv('CLOUDINARY_API_SECRET');
  const cloudinaryUrl = getSanitizedEnv('CLOUDINARY_URL');

  if (cloudinaryUrl) {
    cloudinary.config({
      cloudinary_url: cloudinaryUrl,
      secure: true,
    });
  } else if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
  } else {
    throw new Error('Konfigurasi Cloudinary belum lengkap di .env.local (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)');
  }

  // Clean filename for public_id
  const cleanName = fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const timestamp = Date.now();
  const publicId = `${timestamp}_${cleanName}`;

  // Use base64 data URI for upload to avoid stream signature mismatches
  const base64Data = buffer.toString('base64');
  const dataUri = `data:${mimeType};base64,${base64Data}`;

  const result: UploadApiResponse = await cloudinary.uploader.upload(dataUri, {
    folder: 'miniapp-scv/attachments',
    public_id: publicId,
    resource_type: 'auto',
  });

  return result.secure_url || result.url;
}

export default cloudinary;
