import { DataSource } from 'typeorm';
import { SlugGenerator } from '../../shared/slug/slug.generator';

const CATEGORY_NAMES = [
  'Mobile phones',
  'Computers',
  'Gaming consoles',
  'TV/Monitors',
  'Air conditioning and heating',
  'White goods',
  'Audio equipment',
  'Cameras and photography',
  'Printers and office equipment',
  'Smart home and wearables',
  'Small kitchen appliances',
  'Vacuum cleaners and floor care',
  'Plumbing',
  'Electrical work',
  'Carpentry and furniture',
  'Painting and decorating',
  'Roofing and waterproofing',
  'Locksmith, doors and windows',
  'Flooring and tiling',
  'Car mechanic',
  'Car electronics and diagnostics',
  'Tires and wheels',
  'Car body and paint',
  'Car air conditioning',
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
