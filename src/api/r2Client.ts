// src/api/r2Client.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { useR2Store } from '@/store/useR2Store';

export async function uploadToR2(key: string, body: any, contentType: string): Promise<void> {
  const { accountId, accessKeyId, secretAccessKey, bucketName } = useR2Store.getState().config;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('请先在设置中配置 R2 的 Account ID 和密钥');
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await client.send(command);
}
