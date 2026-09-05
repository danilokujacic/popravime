import { S3StorageService } from './s3-storage.service';
import { StorageConfig } from '../../../config/storage.config';

const mockSend = jest.fn().mockResolvedValue({});

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  PutObjectCommand: jest.fn().mockImplementation((input) => input),
  DeleteObjectCommand: jest.fn().mockImplementation((input) => input),
}));

function BuildConfig(): StorageConfig {
  return {
    endpoint: 'https://storage.example.com',
    region: 'auto',
    bucket: 'bucket',
    accessKey: 'access',
    secretKey: 'secret',
    forcePathStyle: true,
    publicUrl: 'https://cdn.example.com',
  };
}

describe('S3StorageService', () => {
  beforeEach(() => {
    mockSend.mockClear();
  });

  it('stores a normal file name unchanged aside from the uuid prefix', async () => {
    const service = new S3StorageService(BuildConfig());

    const result = await service.Upload({
      buffer: Buffer.from('data'),
      fileName: 'photo.jpg',
      contentType: 'image/jpeg',
    });

    expect(result.key).toMatch(/^[0-9a-f-]{36}-photo\.jpg$/);
  });

  it('strips path separators and spaces from the file name', async () => {
    const service = new S3StorageService(BuildConfig());

    const result = await service.Upload({
      buffer: Buffer.from('data'),
      fileName: '../../etc/passwd copy.jpg',
      contentType: 'image/jpeg',
    });

    expect(result.key).not.toContain('/');
    expect(result.key).not.toContain('..');
    expect(result.key).not.toContain(' ');
  });

  it('caps the sanitized file name length', async () => {
    const service = new S3StorageService(BuildConfig());
    const longName = `${'a'.repeat(500)}.jpg`;

    const result = await service.Upload({
      buffer: Buffer.from('data'),
      fileName: longName,
      contentType: 'image/jpeg',
    });

    const sanitizedName = result.key.slice(37);
    expect(sanitizedName.length).toBeLessThanOrEqual(100);
  });

  it('falls back to a default name when nothing safe remains', async () => {
    const service = new S3StorageService(BuildConfig());

    const result = await service.Upload({
      buffer: Buffer.from('data'),
      fileName: '???///...',
      contentType: 'image/jpeg',
    });

    expect(result.key).toMatch(/^[0-9a-f-]{36}-file$/);
  });
});
