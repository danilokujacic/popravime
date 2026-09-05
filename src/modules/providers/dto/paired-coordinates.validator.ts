import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

interface CoordinatesDto {
  latitude?: string | null;
  longitude?: string | null;
}

@ValidatorConstraint({ name: 'PairedCoordinates' })
export class PairedCoordinatesConstraint
  implements ValidatorConstraintInterface
{
  validate(_value: unknown, args: ValidationArguments): boolean {
    const dto = args.object as CoordinatesDto;
    return (dto.latitude == null) === (dto.longitude == null);
  }

  defaultMessage(): string {
    return 'latitude and longitude must be provided together';
  }
}
