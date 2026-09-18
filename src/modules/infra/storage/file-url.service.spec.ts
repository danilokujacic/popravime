import { FileUrlService } from './file-url.service';
import type { StorageService } from './storage.service.interface';

function BuildService() {
  const storage = {
    ExtractPrivateKey: jest
      .fn()
      .mockImplementation((value: string) =>
        value.startsWith('private:') ? value.slice('private:'.length) : null,
      ),
    SignUrl: jest
      .fn()
      .mockImplementation((key: string) =>
        Promise.resolve(`https://signed.example/${key}`),
      ),
  } as unknown as StorageService;

  return { service: new FileUrlService(storage), storage };
}

describe('FileUrlService', () => {
  it('signs a private reference', async () => {
    const { service } = BuildService();

    await expect(service.Resolve('private:a.jpg')).resolves.toBe(
      'https://signed.example/a.jpg',
    );
  });

  it('leaves a legacy public URL untouched', async () => {
    const { service, storage } = BuildService();

    await expect(
      service.Resolve('https://cdn.example.com/a.jpg'),
    ).resolves.toBe('https://cdn.example.com/a.jpg');
    expect(storage.SignUrl).not.toHaveBeenCalled();
  });

  it('resolves a mixed list in order', async () => {
    const { service } = BuildService();

    await expect(
      service.ResolveMany(['private:a.jpg', 'https://cdn.example.com/b.jpg']),
    ).resolves.toEqual([
      'https://signed.example/a.jpg',
      'https://cdn.example.com/b.jpg',
    ]);
  });
});
