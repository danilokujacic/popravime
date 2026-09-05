import type { ValidationError } from 'class-validator';
import { CaseMapper } from '../../shared/case-mapper/case-mapper';
import { ValidationFieldError } from './validation-field-error.interface';

function ToScreamingSnakeCase(constraintName: string): string {
  return constraintName
    .replace(/[A-Z]/g, (letter) => `_${letter}`)
    .toUpperCase();
}

export function BuildValidationFields(
  errors: ValidationError[],
): ValidationFieldError[] {
  return errors.map((error) => ({
    field: CaseMapper.KeyToSnakeCase(error.property),
    codes: Object.keys(error.constraints ?? {}).map(ToScreamingSnakeCase),
  }));
}
