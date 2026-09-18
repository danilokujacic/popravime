import { DataSource } from 'typeorm';
import { SlugGenerator } from '../../shared/slug/slug.generator';

const ADDITIONAL_CATEGORY_NAMES = [
  'Parketi',
  'Svijetla',
  'Ugradnja kamera',
  'Fotografija',
  'Moleraj',
  'Autoslep',
  'Gips',
  'Opremanje stana',
  'Selidbe',
];

export async function SeedAdditionalCategories(dataSource: DataSource): Promise<void> {
  for (const name of ADDITIONAL_CATEGORY_NAMES) {
    const slug = SlugGenerator.Generate(name);
    await dataSource.query(
      `INSERT INTO "categories" ("name", "slug")
       VALUES ($1, $2)
       ON CONFLICT ("slug") DO NOTHING`,
      [name, slug],
    );
  }
}
