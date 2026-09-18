import { S3StorageService } from './s3-storage.service';
import { StorageConfig } from '../../../config/storage.config';

const mockSend = jest.fn().mockResolvedValue({});

const mockGetSignedUrl = jest.fn().mockResolvedValue('https://signed.example');

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  PutObjectCommand: jest.fn().mockImplementation((input) => input),
  DeleteObjectCommand: jest.fn().mockImplementation((input) => input),
  GetObjectCommand: jest.fn().mockImplementation((input: unknown) => input),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args) as unknown,
}));

function BuildConfig(overrides?: Partial<StorageConfig>): StorageConfig {
  return {
    endpoint: 'https://storage.example.com',
    region: 'auto',
    bucket: 'bucket',
    privateBucket: 'private-bucket',
    accessKey: 'access',
    secretKey: 'secret',
    forcePathStyle: true,
    publicUrl: 'https://cdn.example.com',
    signedUrlTtlSeconds: 900,
    ...overrides,
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

  it('uploads a private file to the private bucket and returns a private reference', async () => {
    const service = new S3StorageService(BuildConfig());

    const result = await service.UploadPrivate({
      buffer: Buffer.from('data'),
      fileName: 'photo.jpg',
      contentType: 'image/jpeg',
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ Bucket: 'private-bucket', Key: result.key }),
    );
    expect(result.reference).toBe(`private:${result.key}`);
  });

  it('uploads a public file to the public bucket', async () => {
    const service = new S3StorageService(BuildConfig());

    const result = await service.Upload({
      buffer: Buffer.from('data'),
      fileName: 'photo.jpg',
      contentType: 'image/jpeg',
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ Bucket: 'bucket', Key: result.key }),
    );
  });

  it('deletes from the bucket matching the visibility', async () => {
    const service = new S3StorageService(BuildConfig());

    await service.Delete('a.jpg');
    await service.DeletePrivate('b.jpg');

    expect(mockSend).toHaveBeenCalledWith({ Bucket: 'bucket', Key: 'a.jpg' });
    expect(mockSend).toHaveBeenCalledWith({
      Bucket: 'private-bucket',
      Key: 'b.jpg',
    });
  });

  it('signs a private key against the private bucket with the configured lifetime', async () => {
    const service = new S3StorageService(BuildConfig());

    const url = await service.SignUrl('b.jpg');

    expect(url).toBe('https://signed.example');
    expect(mockGetSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      { Bucket: 'private-bucket', Key: 'b.jpg' },
      { expiresIn: 900 },
    );
  });

  it('tells private references from public URLs', () => {
    const service = new S3StorageService(BuildConfig());

    expect(service.ExtractPrivateKey('private:abc.jpg')).toBe('abc.jpg');
    expect(
      service.ExtractPrivateKey('https://cdn.example.com/abc.jpg'),
    ).toBeNull();
    expect(service.ExtractKey('https://cdn.example.com/abc.jpg')).toBe(
      'abc.jpg',
    );
    expect(service.ExtractKey('private:abc.jpg')).toBeNull();
  });

  describe('without a private bucket configured', () => {
    it('keeps "private" uploads in the public bucket and returns their public URL', async () => {
      const service = new S3StorageService(BuildConfig({ privateBucket: '' }));

      const result = await service.UploadPrivate({
        buffer: Buffer.from('data'),
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({ Bucket: 'bucket', Key: result.key }),
      );
      expect(result.reference).toBe(`https://cdn.example.com/${result.key}`);
    });

    it('refuses to sign or delete private keys, since none can exist', async () => {
      const service = new S3StorageService(BuildConfig({ privateBucket: '' }));

      await expect(service.SignUrl('a.jpg')).rejects.toThrow(
        'STORAGE_PRIVATE_BUCKET is not configured',
      );
      await expect(service.DeletePrivate('a.jpg')).rejects.toThrow(
        'STORAGE_PRIVATE_BUCKET is not configured',
      );
    });
  });
});
