import 'reflect-metadata';
import { AppDataSource } from '../data-source';
import { SeedAdditionalCategories } from './additional-categories.seed';

async function RunSeed(): Promise<void> {
  await AppDataSource.initialize();

  await SeedAdditionalCategories(AppDataSource);

  await AppDataSource.destroy();
}

RunSeed()
  .then(() => {
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
