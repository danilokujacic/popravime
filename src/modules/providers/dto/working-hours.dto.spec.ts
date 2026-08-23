import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { WorkingHoursDto } from './working-hours.dto';

async function ValidateWorkingHours(
  plain: Record<string, unknown>,
): Promise<number> {
  const instance = plainToInstance(WorkingHoursDto, plain, {
    excludeExtraneousValues: false,
  });
  const errors = await validate(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return errors.length;
}

describe('WorkingHoursDto', () => {
  it('accepts a valid full week', async () => {
    const errorCount = await ValidateWorkingHours({
      monday: { open: '09:00', close: '17:00' },
      tuesday: { open: '09:00', close: '17:00' },
      wednesday: { open: '09:00', close: '17:00' },
      thursday: { open: '09:00', close: '17:00' },
      friday: { open: '09:00', close: '17:00' },
      saturday: null,
      sunday: null,
    });

    expect(errorCount).toBe(0);
  });

  it('rejects an invalid time format', async () => {
    const errorCount = await ValidateWorkingHours({
      monday: { open: '9am', close: '17:00' },
    });

    expect(errorCount).toBeGreaterThan(0);
  });

  it('rejects an unknown weekday key', async () => {
    const errorCount = await ValidateWorkingHours({
      funday: { open: '09:00', close: '17:00' },
    });

    expect(errorCount).toBeGreaterThan(0);
  });
});
