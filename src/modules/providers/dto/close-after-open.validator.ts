import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import type { WorkingHoursRangeDto } from './working-hours.dto';

@ValidatorConstraint({ name: 'CloseAfterOpen' })
export class CloseAfterOpenConstraint implements ValidatorConstraintInterface {
  validate(close: string, args: ValidationArguments): boolean {
    const range = args.object as WorkingHoursRangeDto;
    if (typeof range.open !== 'string' || typeof close !== 'string') {
      return true;
    }
    return range.open < close;
  }

  defaultMessage(): string {
    return 'close must be later than open';
  }
}
