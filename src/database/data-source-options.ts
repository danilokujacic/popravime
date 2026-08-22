import { DataSourceOptions } from 'typeorm';

export interface DataSourceCredentials {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export function BuildDataSourceOptions(credentials: DataSourceCredentials): DataSourceOptions {
  return {
    type: 'postgres',
    host: credentials.host,
    port: credentials.port,
    username: credentials.username,
    password: credentials.password,
    database: credentials.database,
    synchronize: false,
    entities: [`${__dirname}/../modules/**/entities/*.entity{.ts,.js}`],
    migrations: [`${__dirname}/migrations/*{.ts,.js}`],
  };
}
