import { StorageCleanupService } from './storage-cleanup.service';
import type { StorageService } from './storage.service.interface';

function BuildService(
  overrides?: Partial<Record<keyof StorageService, jest.Mock>>,
) {
  const storage = {
    ExtractPrivateKey: jest
      .fn()
      .mockImplementation((value: string) =>
        value.startsWith('private:') ? value.slice('private:'.length) : null,
      ),
    ExtractKey: jest
      .fn()
      .mockImplementation((value: string) =>
        value.startsWith('https://cdn.example.com/')
          ? value.slice('https://cdn.example.com/'.length)
          : null,
      ),
    Delete: jest.fn().mockResolvedValue(undefined),
    DeletePrivate: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as StorageService;

  return { service: new StorageCleanupService(storage), storage };
}

describe('StorageCleanupService.DeleteByUrls', () => {
  it('routes private references to the private bucket and public URLs to the public one', async () => {
    const { service, storage } = BuildService();

    const failures = await service.DeleteByUrls([
      'private:a.jpg',
      'https://cdn.example.com/b.jpg',
    ]);

    expect(failures).toBe(0);
    expect(storage.DeletePrivate).toHaveBeenCalledWith('a.jpg');
    expect(storage.Delete).toHaveBeenCalledWith('b.jpg');
  });

  it('ignores values that are neither, and counts failed deletions', async () => {
    const { service } = BuildService({
      DeletePrivate: jest.fn().mockRejectedValue(new Error('boom')),
    });

    const failures = await service.DeleteByUrls([
      'https://elsewhere.example.com/x.jpg',
      'private:a.jpg',
    ]);

    expect(failures).toBe(1);
  });
});
