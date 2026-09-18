import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { PrivateFileUrlInterceptor } from './private-file-url.interceptor';
import { FileUrlService } from './file-url.service';

function BuildInterceptor() {
  const fileUrlService = {
    Resolve: jest
      .fn()
      .mockImplementation((value: string) =>
        Promise.resolve(`signed(${value})`),
      ),
    ResolveMany: jest
      .fn()
      .mockImplementation((values: string[]) =>
        Promise.resolve(values.map((value) => `signed(${value})`)),
      ),
  } as unknown as FileUrlService;

  return new PrivateFileUrlInterceptor(fileUrlService);
}

function Run(body: unknown): Promise<unknown> {
  const handler: CallHandler = { handle: () => of(body) };
  return lastValueFrom(
    BuildInterceptor().intercept({} as ExecutionContext, handler),
  );
}

describe('PrivateFileUrlInterceptor', () => {
  it('signs photo urls on a single response', async () => {
    const result = await Run({
      id: 'r1',
      photoUrls: ['private:a', 'private:b'],
    });

    expect(result).toEqual({
      id: 'r1',
      photoUrls: ['signed(private:a)', 'signed(private:b)'],
    });
  });

  it('signs attachment and document urls, and leaves null alone', async () => {
    const result = await Run([
      { attachmentUrl: 'private:x' },
      { attachmentUrl: null },
      { documentUrl: 'private:d' },
    ]);

    expect(result).toEqual([
      { attachmentUrl: 'signed(private:x)' },
      { attachmentUrl: null },
      { documentUrl: 'signed(private:d)' },
    ]);
  });

  it('reaches into paginated lists and nested objects', async () => {
    const result = await Run({
      total: 1,
      items: [{ photoUrls: ['private:a'] }],
      export: { repairRequests: [{ photoUrls: ['private:b'] }] },
    });

    expect(result).toEqual({
      total: 1,
      items: [{ photoUrls: ['signed(private:a)'] }],
      export: { repairRequests: [{ photoUrls: ['signed(private:b)'] }] },
    });
  });

  it('keeps dates and unrelated fields intact', async () => {
    const createdAt = new Date('2026-09-18T00:00:00Z');

    const result = await Run({
      createdAt,
      imageUrl: 'https://cdn.example.com/g.jpg',
    });

    expect(result).toEqual({
      createdAt,
      imageUrl: 'https://cdn.example.com/g.jpg',
    });
    expect((result as { createdAt: Date }).createdAt).toBeInstanceOf(Date);
  });
});
