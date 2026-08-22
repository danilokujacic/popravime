import { DataSource } from 'typeorm';
import { SlugGenerator } from '../../shared/slug/slug.generator';

interface CitySeed {
  name: string;
  region: 'Northern' | 'Central' | 'Southern';
}

const CITIES: CitySeed[] = [
  { name: 'Podgorica', region: 'Central' },
  { name: 'Cetinje', region: 'Central' },
  { name: 'Danilovgrad', region: 'Central' },
  { name: 'Nikšić', region: 'Central' },
  { name: 'Tuzi', region: 'Central' },
  { name: 'Bar', region: 'Southern' },
  { name: 'Budva', region: 'Southern' },
  { name: 'Herceg Novi', region: 'Southern' },
  { name: 'Kotor', region: 'Southern' },
  { name: 'Tivat', region: 'Southern' },
  { name: 'Ulcinj', region: 'Southern' },
  { name: 'Andrijevica', region: 'Northern' },
  { name: 'Berane', region: 'Northern' },
  { name: 'Bijelo Polje', region: 'Northern' },
  { name: 'Gusinje', region: 'Northern' },
  { name: 'Kolašin', region: 'Northern' },
  { name: 'Mojkovac', region: 'Northern' },
  { name: 'Petnjica', region: 'Northern' },
  { name: 'Plav', region: 'Northern' },
  { name: 'Pljevlja', region: 'Northern' },
  { name: 'Plužine', region: 'Northern' },
  { name: 'Rožaje', region: 'Northern' },
  { name: 'Šavnik', region: 'Northern' },
  { name: 'Žabljak', region: 'Northern' },
];

export async function SeedCities(dataSource: DataSource): Promise<void> {
  for (const city of CITIES) {
    const slug = SlugGenerator.Generate(city.name);
    await dataSource.query(
      `INSERT INTO "cities" ("name", "slug", "region", "is_active")
       VALUES ($1, $2, $3, true)
       ON CONFLICT ("slug") DO NOTHING`,
      [city.name, slug, city.region],
    );
  }
}
