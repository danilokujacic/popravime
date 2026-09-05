import { BadRequestException } from '@nestjs/common';
import { ValidationFieldError } from '../validation/validation-field-error.interface';

export class ValidationFieldsException extends BadRequestException {
  constructor(
    public readonly fields: ValidationFieldError[],
    message: string,
  ) {
    super({ message, code: 'VALIDATION_ERROR', fields });
  }
}
