import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { BuildDataSourceOptions } from './data-source-options';

loadEnv();

export const AppDataSource = new DataSource(
  BuildDataSourceOptions({
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: Number(process.env.DATABASE_PORT ?? 5432),
    username: process.env.DATABASE_USER ?? '',
    password: process.env.DATABASE_PASSWORD ?? '',
    database: process.env.DATABASE_NAME ?? '',
    ssl: process.env.DATABASE_SSL === 'true',
  }),
);
