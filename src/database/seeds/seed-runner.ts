import 'reflect-metadata';
import { AppDataSource } from '../data-source';
import { SeedCities } from './cities.seed';
import { SeedCategories } from './categories.seed';

async function RunSeeds(): Promise<void> {
  await AppDataSource.initialize();

  await SeedCities(AppDataSource);
  await SeedCategories(AppDataSource);

  await AppDataSource.destroy();
}

RunSeeds()
  .then(() => {
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
