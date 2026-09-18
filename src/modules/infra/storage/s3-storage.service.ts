import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { StorageService } from './storage.service.interface';
import {
  PRIVATE_REFERENCE_PREFIX,
  PrivateUploadResult,
  UploadFileInput,
  UploadFileResult,
} from './storage.types';
import { StorageConfig } from '../../../config/storage.config';

const SAFE_FILE_NAME_MAX_LENGTH = 100;

function SanitizeFileName(fileName: string): string {
  const sanitized = fileName
    .replace(/[^A-Za-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '');

  return sanitized.slice(0, SAFE_FILE_NAME_MAX_LENGTH) || 'file';
}

function BuildKey(fileName: string): string {
  return `${randomUUID()}-${SanitizeFileName(fileName)}`;
}

export class S3StorageService implements StorageService {
  private readonly client: S3Client;

  constructor(private readonly config: StorageConfig) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
    });
  }

  async Upload(input: UploadFileInput): Promise<UploadFileResult> {
    const key = BuildKey(input.fileName);
    await this.Put(this.config.bucket, key, input);
    return { key, url: this.GetUrl(key) };
  }

  async UploadPrivate(input: UploadFileInput): Promise<PrivateUploadResult> {
    if (!this.config.privateBucket) {
      const uploaded = await this.Upload(input);
      return { key: uploaded.key, reference: uploaded.url };
    }

    const key = BuildKey(input.fileName);
    await this.Put(this.config.privateBucket, key, input);
    return { key, reference: `${PRIVATE_REFERENCE_PREFIX}${key}` };
  }

  async Delete(key: string): Promise<void> {
    await this.Remove(this.config.bucket, key);
  }

  async DeletePrivate(key: string): Promise<void> {
    await this.Remove(this.RequirePrivateBucket(), key);
  }

  GetUrl(key: string): string {
    return `${this.config.publicUrl}/${key}`;
  }

  ExtractKey(url: string): string | null {
    const prefix = `${this.config.publicUrl}/`;
    return url.startsWith(prefix) ? url.slice(prefix.length) : null;
  }

  ExtractPrivateKey(reference: string): string | null {
    return reference.startsWith(PRIVATE_REFERENCE_PREFIX)
      ? reference.slice(PRIVATE_REFERENCE_PREFIX.length)
      : null;
  }

  async SignUrl(key: string): Promise<string> {
    return await getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.RequirePrivateBucket(), Key: key }),
      { expiresIn: this.config.signedUrlTtlSeconds },
    );
  }

  private RequirePrivateBucket(): string {
    if (!this.config.privateBucket) {
      throw new Error('STORAGE_PRIVATE_BUCKET is not configured');
    }
    return this.config.privateBucket;
  }

  private async Put(
    bucket: string,
    key: string,
    input: UploadFileInput,
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: input.buffer,
        ContentType: input.contentType,
      }),
    );
  }

  private async Remove(bucket: string, key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: key }),
    );
  }
}
