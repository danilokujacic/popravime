import { DataSource } from 'typeorm';
import { SlugGenerator } from '../../shared/slug/slug.generator';

const CATEGORY_NAMES = [
  'Mobile phones',
  'Computers',
  'Gaming consoles',
  'TV/Monitors',
  'Air conditioning and heating',
  'White goods',
];

export async function SeedCategories(dataSource: DataSource): Promise<void> {
  for (const name of CATEGORY_NAMES) {
    const slug = SlugGenerator.Generate(name);
    await dataSource.query(
      `INSERT INTO "categories" ("name", "slug")
       VALUES ($1, $2)
       ON CONFLICT ("slug") DO NOTHING`,
      [name, slug],
    );
  }
}
