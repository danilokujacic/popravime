import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

export class DomainUnauthorizedException extends DomainException {
  readonly httpStatus = HttpStatus.UNAUTHORIZED;
}
