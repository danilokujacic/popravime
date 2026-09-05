import { DataSourceOptions } from 'typeorm';

export interface DataSourceCredentials {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl?: boolean;
}

export function BuildDataSourceOptions(
  credentials: DataSourceCredentials,
): DataSourceOptions {
  return {
    type: 'postgres',
    host: credentials.host,
    port: credentials.port,
    username: credentials.username,
    password: credentials.password,
    database: credentials.database,
    ssl: credentials.ssl ? { rejectUnauthorized: true } : false,
    synchronize: false,
    invalidWhereValuesBehavior: { undefined: 'ignore' },
    entities: [`${__dirname}/../modules/**/entities/*.entity{.ts,.js}`],
    migrations: [`${__dirname}/migrations/*{.ts,.js}`],
  };
}
