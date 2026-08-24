import { registerAs } from '@nestjs/config';

export type NodeEnv = 'development' | 'test' | 'production';

export interface AppConfig {
  nodeEnv: NodeEnv;
  port: number;
  corsOrigins: string[] | true;
}

function ParseNodeEnv(value: string | undefined): NodeEnv {
  if (value === 'production' || value === 'test') {
    return value;
  }
  return 'development';
}

function ParseCorsOrigins(value: string | undefined): string[] | true {
  if (!value || value === '*') {
    return true;
  }
  return value.split(',').map((origin) => origin.trim());
}

export const appConfig = registerAs('app', (): AppConfig => ({
  nodeEnv: ParseNodeEnv(process.env.NODE_ENV),
  port: Number(process.env.PORT ?? 3000),
  corsOrigins: ParseCorsOrigins(process.env.CORS_ORIGIN),
}));
