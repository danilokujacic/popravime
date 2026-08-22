import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

export class DomainNotFoundException extends DomainException {
  readonly httpStatus = HttpStatus.NOT_FOUND;
}
