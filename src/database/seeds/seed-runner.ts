import 'reflect-metadata';
import { AppDataSource } from '../data-source';
import { SeedCities } from './cities.seed';
import { SeedCategories } from './categories.seed';
import { SeedAdmin } from './admin.seed';
import { SeedProvider } from './provider.seed';
import { SeedCustomer } from './customer.seed';

async function RunSeeds(): Promise<void> {
  await AppDataSource.initialize();

  await SeedCities(AppDataSource);
  await SeedCategories(AppDataSource);
  await SeedAdmin(AppDataSource);
  await SeedProvider(AppDataSource);
  await SeedCustomer(AppDataSource);

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
