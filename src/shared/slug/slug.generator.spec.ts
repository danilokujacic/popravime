import { SlugGenerator } from './slug.generator';

describe('SlugGenerator', () => {
  it('lowercases and dashes plain text', () => {
    expect(SlugGenerator.Generate("Ana's Repair Shop")).toBe('ana-s-repair-shop');
  });

  it('transliterates Montenegrin diacritics', () => {
    expect(SlugGenerator.Generate('Đorđević Servis')).toBe('djordjevic-servis');
    expect(SlugGenerator.Generate('Čačak Šumadija Žabljak Ćuprija')).toBe(
      'cacak-sumadija-zabljak-cuprija',
    );
  });

  it('trims leading and trailing dashes', () => {
    expect(SlugGenerator.Generate('  Popravime!! ')).toBe('popravime');
  });

  describe('GenerateUnique', () => {
    it('returns the base slug when it is not taken', async () => {
      const result = await SlugGenerator.GenerateUnique('Ana Repair', () =>
        Promise.resolve(false),
      );

      expect(result).toBe('ana-repair');
    });

    it('appends an incrementing suffix until an available slug is found', async () => {
      const taken = new Set(['ana-repair', 'ana-repair-2']);

      const result = await SlugGenerator.GenerateUnique('Ana Repair', (candidate) =>
        Promise.resolve(taken.has(candidate)),
      );

      expect(result).toBe('ana-repair-3');
    });
  });
});
