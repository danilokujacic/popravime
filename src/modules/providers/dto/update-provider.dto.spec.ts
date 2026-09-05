import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateProviderDto } from './update-provider.dto';

async function ValidateUpdateProvider(
  plain: Record<string, unknown>,
): Promise<number> {
  const instance = plainToInstance(UpdateProviderDto, plain, {
    excludeExtraneousValues: false,
  });
  const errors = await validate(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return errors.length;
}

describe('UpdateProviderDto', () => {
  it('accepts an empty payload', async () => {
    const errorCount = await ValidateUpdateProvider({});

    expect(errorCount).toBe(0);
  });

  it('accepts a payload with a valid coordinate pair', async () => {
    const errorCount = await ValidateUpdateProvider({
      latitude: '42.430400',
      longitude: '19.259400',
    });

    expect(errorCount).toBe(0);
  });

  it('accepts coordinates supplied alongside an address change', async () => {
    const errorCount = await ValidateUpdateProvider({
      address: 'New address 5',
      latitude: '42.430400',
      longitude: '19.259400',
    });

    expect(errorCount).toBe(0);
  });

  it('rejects latitude without longitude', async () => {
    const errorCount = await ValidateUpdateProvider({
      latitude: '42.430400',
    });

    expect(errorCount).toBeGreaterThan(0);
  });

  it('rejects longitude without latitude', async () => {
    const errorCount = await ValidateUpdateProvider({
      longitude: '19.259400',
    });

    expect(errorCount).toBeGreaterThan(0);
  });

  it('rejects an out-of-range coordinate', async () => {
    const errorCount = await ValidateUpdateProvider({
      latitude: '200',
      longitude: '19.259400',
    });

    expect(errorCount).toBeGreaterThan(0);
  });
});
