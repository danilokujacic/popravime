import { EmailConfirmationsService } from './email-confirmations.service';
import { EmailConfirmationsRepository } from './email-confirmations.repository';
import { EmailConfirmation } from './entities/email-confirmation.entity';
import { DomainNotFoundException } from '../../common/exceptions/not-found.exception';
import { DomainConflictException } from '../../common/exceptions/conflict.exception';

function BuildRecord(
  overrides?: Partial<EmailConfirmation>,
): EmailConfirmation {
  return {
    id: 'confirmation-1',
    slug: 'a-slug',
    email: 'ana@popravime.me',
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: new Date(),
    ...overrides,
  };
}

function BuildService(overrides?: {
  repository?: Partial<EmailConfirmationsRepository>;
}) {
  const repository = {
    DeleteAllForEmail: jest.fn().mockResolvedValue(undefined),
    Create: jest
      .fn()
      .mockImplementation((value) =>
        Promise.resolve({ id: 'confirmation-1', ...value }),
      ),
    FindBySlug: jest.fn().mockResolvedValue(null),
    DeleteById: jest.fn().mockResolvedValue(undefined),
    ...overrides?.repository,
  } as unknown as EmailConfirmationsRepository;

  const config = { ttlSeconds: 3600 };

  const logger = {
    warn: jest.fn(),
  } as unknown as ConstructorParameters<typeof EmailConfirmationsService>[2];

  const service = new EmailConfirmationsService(repository, config, logger);

  return { service, repository, logger };
}

describe('EmailConfirmationsService.Create', () => {
  it('invalidates any earlier link for the email before issuing a fresh one', async () => {
    const { service, repository } = BuildService();

    const result = await service.Create('ana@popravime.me');

    expect(repository.DeleteAllForEmail).toHaveBeenCalledWith(
      'ana@popravime.me',
    );
    expect(repository.Create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'ana@popravime.me',
        slug: expect.any(String),
      }),
    );
    expect(result.slug).toEqual(expect.any(String));
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});

describe('EmailConfirmationsService.Confirm', () => {
  it('rejects an unknown slug', async () => {
    const { service, logger } = BuildService({
      repository: { FindBySlug: jest.fn().mockResolvedValue(null) },
    });

    await expect(service.Confirm('missing')).rejects.toBeInstanceOf(
      DomainNotFoundException,
    );
    expect(logger.warn).toHaveBeenCalled();
  });

  it('deletes the record and returns the email for a still-valid slug', async () => {
    const record = BuildRecord();
    const { service, repository } = BuildService({
      repository: { FindBySlug: jest.fn().mockResolvedValue(record) },
    });

    const result = await service.Confirm('a-slug');

    expect(result).toBe('ana@popravime.me');
    expect(repository.DeleteById).toHaveBeenCalledWith('confirmation-1');
  });

  it('deletes the record and rejects an expired slug', async () => {
    const record = BuildRecord({ expiresAt: new Date(Date.now() - 1000) });
    const { service, repository, logger } = BuildService({
      repository: { FindBySlug: jest.fn().mockResolvedValue(record) },
    });

    await expect(service.Confirm('a-slug')).rejects.toBeInstanceOf(
      DomainConflictException,
    );
    expect(repository.DeleteById).toHaveBeenCalledWith('confirmation-1');
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ confirmationId: 'confirmation-1' }),
      expect.any(String),
    );
  });

  it('a second attempt on the same (now-deleted) slug is treated as unknown', async () => {
    const { service } = BuildService({
      repository: { FindBySlug: jest.fn().mockResolvedValue(null) },
    });

    await expect(service.Confirm('a-slug')).rejects.toBeInstanceOf(
      DomainNotFoundException,
    );
  });
});
