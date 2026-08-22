import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { StorageService } from './storage.service.interface';
import { UploadFileInput, UploadFileResult } from './storage.types';
import { StorageConfig } from '../../../config/storage.config';

export class S3StorageService implements StorageService {
  private readonly client: S3Client;

  constructor(private readonly config: StorageConfig) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
    });
  }

  async Upload(input: UploadFileInput): Promise<UploadFileResult> {
    const key = `${randomUUID()}-${input.fileName}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: input.buffer,
        ContentType: input.contentType,
      }),
    );

    return { key, url: this.GetUrl(key) };
  }

  async Delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      }),
    );
  }

  GetUrl(key: string): string {
    return `${this.config.publicUrl}/${key}`;
  }
}
