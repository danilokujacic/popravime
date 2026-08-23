import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { ConfigType } from '@nestjs/config';
import { DataSource } from 'typeorm';
import {
  addTransactionalDataSource,
  getDataSourceByName,
} from 'typeorm-transactional';
import { databaseConfig } from '../config/database.config';
import { BuildDataSourceOptions } from './data-source-options';

const TRANSACTIONAL_DATA_SOURCE_NAME = 'default';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [databaseConfig.KEY],
      useFactory: (config: ConfigType<typeof databaseConfig>) =>
        BuildDataSourceOptions(config),
      dataSourceFactory: (options) => {
        if (!options) {
          throw new Error('Database options were not provided');
        }
        const existing = getDataSourceByName(TRANSACTIONAL_DATA_SOURCE_NAME);
        if (existing) {
          return Promise.resolve(existing);
        }
        return Promise.resolve(
          addTransactionalDataSource(new DataSource(options)),
        );
      },
    }),
  ],
})
export class DatabaseModule {}
