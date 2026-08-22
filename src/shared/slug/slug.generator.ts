const DIACRITIC_MAP: Record<string, string> = {
  č: 'c',
  ć: 'c',
  š: 's',
  ž: 'z',
  đ: 'dj',
  Č: 'c',
  Ć: 'c',
  Š: 's',
  Ž: 'z',
  Đ: 'dj',
};

const COMBINING_MARKS = /[̀-ͯ]/g;

function Transliterate(text: string): string {
  return text.replace(/[čćšžđČĆŠŽĐ]/g, (char) => DIACRITIC_MAP[char] ?? char);
}

export class SlugGenerator {
  static Generate(text: string): string {
    return Transliterate(text)
      .normalize('NFKD')
      .replace(COMBINING_MARKS, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  static async GenerateUnique(
    text: string,
    isTaken: (candidate: string) => Promise<boolean>,
  ): Promise<string> {
    const base = SlugGenerator.Generate(text);
    let candidate = base;
    let suffix = 2;

    while (await isTaken(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }
}
