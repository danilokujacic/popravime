import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

export class DomainValidationException extends DomainException {
  readonly httpStatus = HttpStatus.UNPROCESSABLE_ENTITY;
}
