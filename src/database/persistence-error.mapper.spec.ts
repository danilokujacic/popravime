import { QueryFailedError } from 'typeorm';
import { PersistenceErrorMapper } from './persistence-error.mapper';
import { DomainConflictException } from '../common/exceptions/conflict.exception';
import { DomainNotFoundException } from '../common/exceptions/not-found.exception';

function BuildDriverError(overrides: { code?: string; constraint?: string }): Error {
  return Object.assign(new Error('driver error'), overrides);
}

function BuildQueryFailedError(driverError: Error): QueryFailedError {
  return new QueryFailedError('SELECT 1', [], driverError);
}

describe('PersistenceErrorMapper', () => {
  it('maps a unique violation on users_email_key to EMAIL_TAKEN', () => {
    const error = BuildQueryFailedError(
      BuildDriverError({ code: '23505', constraint: 'users_email_key' }),
    );

    const result = PersistenceErrorMapper.ToDomain(error);

    expect(result).toBeInstanceOf(DomainConflictException);
    expect(result.code).toBe('EMAIL_TAKEN');
  });

  it('maps an unrecognized unique violation to a generic conflict', () => {
    const error = BuildQueryFailedError(
      BuildDriverError({ code: '23505', constraint: 'unknown_constraint' }),
    );

    const result = PersistenceErrorMapper.ToDomain(error);

    expect(result).toBeInstanceOf(DomainConflictException);
    expect(result.code).toBe('PERSISTENCE_CONFLICT');
  });

  it('maps a foreign key violation to a not-found exception', () => {
    const error = BuildQueryFailedError(BuildDriverError({ code: '23503' }));

    const result = PersistenceErrorMapper.ToDomain(error);

    expect(result).toBeInstanceOf(DomainNotFoundException);
    expect(result.code).toBe('REFERENCED_ENTITY_NOT_FOUND');
  });

  it('falls back to a generic conflict for an unrecognized driver error shape', () => {
    const error = BuildQueryFailedError(new Error('unexpected shape'));

    const result = PersistenceErrorMapper.ToDomain(error);

    expect(result).toBeInstanceOf(DomainConflictException);
    expect(result.code).toBe('PERSISTENCE_CONFLICT');
  });
});
