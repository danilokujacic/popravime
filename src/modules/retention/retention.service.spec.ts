import { RetentionService } from './retention.service';
import { RetentionRepository } from './retention.repository';
import { StorageCleanupService } from '../infra/storage/storage-cleanup.service';
import { AccountErasureService } from '../account-data/account-erasure.service';

const DAY_MS = 24 * 60 * 60 * 1000;

function BuildService() {
  const retentionRepository = {
    FindInactiveUserIds: jest.fn().mockResolvedValue(['u-1', 'u-2', 'u-3']),
    PurgeClosedRequests: jest
      .fn()
      .mockResolvedValue({ records: 2, fileUrls: ['https://files/a.jpg'] }),
    PurgeInquiries: jest
      .fn()
      .mockResolvedValue({ records: 1, fileUrls: ['https://files/b.pdf'] }),
    PurgeContactMessages: jest.fn().mockResolvedValue(3),
    PurgeExpiredConfirmations: jest.fn().mockResolvedValue(4),
  } as unknown as RetentionRepository;
  const storageCleanupService = {
    DeleteByUrls: jest.fn().mockResolvedValue(1),
  } as unknown as StorageCleanupService;
  const accountErasureService = {
    EraseInactive: jest
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockRejectedValueOnce(new Error('boom')),
  } as unknown as AccountErasureService;
  const logger = {
    info: jest.fn(),
    error: jest.fn(),
  } as unknown as ConstructorParameters<typeof RetentionService>[4];

  const service = new RetentionService(
    retentionRepository,
    storageCleanupService,
    accountErasureService,
    {
      inactiveAccountsDays: 60,
      completedRequestsDays: 730,
      unacceptedRequestsDays: 180,
      inquiriesDays: 365,
      contactMessagesDays: 365,
      batchSize: 500,
      schedulePattern: '0 3 * * *',
    },
    logger,
  );

  return {
    service,
    retentionRepository,
    storageCleanupService,
    accountErasureService,
    logger,
  };
}

describe('RetentionService.Purge', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('purges each data class with the configured cutoffs', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2027-01-01T00:00:00Z'));
    const { service, retentionRepository } = BuildService();
    const now = Date.now();

    await service.Purge();

    expect(retentionRepository.FindInactiveUserIds).toHaveBeenCalledWith(
      new Date(now - 60 * DAY_MS),
      500,
    );
    expect(retentionRepository.PurgeClosedRequests).toHaveBeenCalledWith(
      new Date(now - 730 * DAY_MS),
      new Date(now - 180 * DAY_MS),
      500,
    );
    expect(retentionRepository.PurgeInquiries).toHaveBeenCalledWith(
      new Date(now - 365 * DAY_MS),
      500,
    );
    expect(retentionRepository.PurgeContactMessages).toHaveBeenCalledWith(
      new Date(now - 365 * DAY_MS),
    );
  });

  it('deletes the files of everything purged and reports totals', async () => {
    const { service, storageCleanupService } = BuildService();

    const summary = await service.Purge();

    expect(storageCleanupService.DeleteByUrls).toHaveBeenCalledWith([
      'https://files/a.jpg',
      'https://files/b.pdf',
    ]);
    expect(summary).toEqual({
      inactiveAccounts: 1,
      requests: 2,
      inquiries: 1,
      contactMessages: 3,
      expiredConfirmations: 4,
      files: 2,
      failedFileDeletions: 1,
    });
  });

  it('keeps going when one inactive account fails to erase, and logs it', async () => {
    const { service, accountErasureService, logger } = BuildService();

    const summary = await service.Purge();

    expect(accountErasureService.EraseInactive).toHaveBeenCalledTimes(3);
    expect(summary.inactiveAccounts).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u-3' }),
      expect.any(String),
    );
  });
});
