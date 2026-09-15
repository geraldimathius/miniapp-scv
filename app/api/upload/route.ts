import { NextRequest, NextResponse } from 'next/server';
import { uploadFileToCloudinary } from '@/app/lib/cloudinary';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tidak ada file yang dipilih.' },
        { status: 400 }
      );
    }

    const uploadedUrls: string[] = [];

    for (const file of files) {
      if (typeof file === 'string') continue;

      // Validate file size (e.g. max 15MB per file)
      if (file.size > 15 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, error: `File ${file.name} melebihi batas maksimal 15MB.` },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const contentType = file.type || 'image/jpeg';
      const fileUrl = await uploadFileToCloudinary(buffer, file.name, contentType);
      uploadedUrls.push(fileUrl);
    }

    return NextResponse.json({
      success: true,
      data: uploadedUrls,
      message: `Berhasil mengunggah ${uploadedUrls.length} file ke Cloudinary.`,
    });
  } catch (error: any) {
    console.error('Upload error to Cloudinary:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Gagal mengunggah file ke Cloudinary. Periksa konfigurasi di .env.local',
      },
      { status: 500 }
    );
  }
}
