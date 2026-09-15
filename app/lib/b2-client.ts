import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

function getS3Client() {
  let endpoint = process.env.B2_ENDPOINT || 'https://s3.us-east-005.backblazeb2.com';
  if (!endpoint.startsWith('http')) {
    endpoint = `https://${endpoint}`;
  }

  const region = process.env.B2_REGION || 'us-east-005';
  const accessKeyId = process.env.B2_KEY_ID || process.env.B2_ACCESS_KEY_ID || '';
  const secretAccessKey = process.env.B2_APPLICATION_KEY || process.env.B2_SECRET_ACCESS_KEY || '';

  return new S3Client({
    endpoint,
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export async function uploadFileToB2(
  buffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  const bucketName = process.env.B2_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('B2_BUCKET_NAME environment variable is not configured in .env.local');
  }

  const client = getS3Client();

  // Create unique file key with clean name
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const key = `attachments/${timestamp}-${safeName}`;

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read',
    })
  );

  // Format public URL for Backblaze B2 S3 public bucket
  let endpointHost = process.env.B2_ENDPOINT || 's3.us-east-005.backblazeb2.com';
  endpointHost = endpointHost.replace(/^https?:\/\//, '');

  // Standard S3 public URL format: https://<bucket>.<endpoint>/<key>
  const publicUrl = `https://${bucketName}.${endpointHost}/${key}`;
  return publicUrl;
}
