import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

export class DomainForbiddenException extends DomainException {
  readonly httpStatus = HttpStatus.FORBIDDEN;
}
