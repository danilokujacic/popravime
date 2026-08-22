import { CaseMapper } from './case-mapper';

describe('CaseMapper', () => {
  it('converts top-level camelCase keys to snake_case', () => {
    const result = CaseMapper.ToSnakeCase({ fullName: 'Ana Petrović' });

    expect(result).toEqual({ full_name: 'Ana Petrović' });
  });

  it('converts nested objects and arrays recursively', () => {
    const result = CaseMapper.ToSnakeCase({
      businessName: 'Ana Repair',
      workingHours: [{ dayOfWeek: 'monday', isOpen: true }],
    });

    expect(result).toEqual({
      business_name: 'Ana Repair',
      working_hours: [{ day_of_week: 'monday', is_open: true }],
    });
  });

  it('leaves Date instances untouched', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');

    const result = CaseMapper.ToSnakeCase({ createdAt });

    expect(result).toEqual({ created_at: createdAt });
  });

  it('leaves primitives and null untouched', () => {
    expect(CaseMapper.ToSnakeCase('plain-string')).toBe('plain-string');
    expect(CaseMapper.ToSnakeCase(42)).toBe(42);
    expect(CaseMapper.ToSnakeCase(null)).toBeNull();
  });

  it('converts class instances, not just plain object literals', () => {
    class SampleDto {
      fullName = 'Ana Petrović';
      emailVerified = true;
    }

    const result = CaseMapper.ToSnakeCase(new SampleDto());

    expect(result).toEqual({ full_name: 'Ana Petrović', email_verified: true });
  });
});
