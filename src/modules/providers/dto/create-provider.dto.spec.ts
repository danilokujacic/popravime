import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProviderDto } from './create-provider.dto';

const VALID_BASE = {
  business_name: 'Ana Repair',
  address: 'Bulevar Svetog Petra Cetinjskog 1',
  city_id: 'c2083c8b-dbfb-4cc2-a212-93c85ad5f2e2',
  category_ids: ['121eecc0-da91-4b20-93a1-b9d186a78344'],
};

async function ValidateCreateProvider(
  plain: Record<string, unknown>,
): Promise<number> {
  const instance = plainToInstance(CreateProviderDto, plain, {
    excludeExtraneousValues: false,
  });
  const errors = await validate(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return errors.length;
}

describe('CreateProviderDto', () => {
  it('accepts a payload with no coordinates', async () => {
    const errorCount = await ValidateCreateProvider(VALID_BASE);

    expect(errorCount).toBe(0);
  });

  it('accepts a payload with a valid coordinate pair', async () => {
    const errorCount = await ValidateCreateProvider({
      ...VALID_BASE,
      latitude: '42.430400',
      longitude: '19.259400',
    });

    expect(errorCount).toBe(0);
  });

  it('rejects latitude without longitude', async () => {
    const errorCount = await ValidateCreateProvider({
      ...VALID_BASE,
      latitude: '42.430400',
    });

    expect(errorCount).toBeGreaterThan(0);
  });

  it('rejects longitude without latitude', async () => {
    const errorCount = await ValidateCreateProvider({
      ...VALID_BASE,
      longitude: '19.259400',
    });

    expect(errorCount).toBeGreaterThan(0);
  });

  it('rejects an out-of-range latitude', async () => {
    const errorCount = await ValidateCreateProvider({
      ...VALID_BASE,
      latitude: '200',
      longitude: '19.259400',
    });

    expect(errorCount).toBeGreaterThan(0);
  });

  it('rejects an out-of-range longitude', async () => {
    const errorCount = await ValidateCreateProvider({
      ...VALID_BASE,
      latitude: '42.430400',
      longitude: '200',
    });

    expect(errorCount).toBeGreaterThan(0);
  });
});
