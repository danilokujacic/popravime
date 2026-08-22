import { QueryFailedError } from 'typeorm';
import { DomainConflictException } from '../common/exceptions/conflict.exception';
import { DomainNotFoundException } from '../common/exceptions/not-found.exception';
import { DomainException } from '../common/exceptions/domain.exception';

const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';

interface PostgresDriverError {
  code: string;
  constraint?: string;
}

interface ConflictMapping {
  constraint: string;
  code: string;
  message: string;
}

const CONFLICT_MAPPINGS: ConflictMapping[] = [
  {
    constraint: 'users_email_key',
    code: 'EMAIL_TAKEN',
    message: 'Email is already registered',
  },
  {
    constraint: 'providers_slug_key',
    code: 'PROVIDER_SLUG_TAKEN',
    message: 'Provider slug is already in use',
  },
  {
    constraint: 'cities_slug_key',
    code: 'CITY_SLUG_TAKEN',
    message: 'City slug is already in use',
  },
  {
    constraint: 'categories_slug_key',
    code: 'CATEGORY_SLUG_TAKEN',
    message: 'Category slug is already in use',
  },
];

function IsPostgresDriverError(value: unknown): value is PostgresDriverError {
  return typeof value === 'object' && value !== null && 'code' in value;
}

export function IsQueryFailedError(error: unknown): error is QueryFailedError {
  return error instanceof QueryFailedError;
}

function MapUniqueViolation(constraint: string | undefined): DomainException {
  const mapping = CONFLICT_MAPPINGS.find(
    (entry) => entry.constraint === constraint,
  );
  if (!mapping) {
    return new DomainConflictException(
      'PERSISTENCE_CONFLICT',
      'Duplicate value violates a unique constraint',
    );
  }
  return new DomainConflictException(mapping.code, mapping.message);
}

export class PersistenceErrorMapper {
  static ToDomain(error: QueryFailedError): DomainException {
    const driverError: unknown = error.driverError;

    if (!IsPostgresDriverError(driverError)) {
      return new DomainConflictException(
        'PERSISTENCE_CONFLICT',
        'Unexpected persistence error',
      );
    }

    if (driverError.code === UNIQUE_VIOLATION) {
      return MapUniqueViolation(driverError.constraint);
    }

    if (driverError.code === FOREIGN_KEY_VIOLATION) {
      return new DomainNotFoundException(
        'REFERENCED_ENTITY_NOT_FOUND',
        'A referenced entity does not exist',
      );
    }

    return new DomainConflictException(
      'PERSISTENCE_CONFLICT',
      'Unexpected persistence error',
    );
  }
}
