import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

export class DomainConflictException extends DomainException {
  readonly httpStatus = HttpStatus.CONFLICT;
}
