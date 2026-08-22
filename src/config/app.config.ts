import { registerAs } from '@nestjs/config';

export type NodeEnv = 'development' | 'test' | 'production';

export interface AppConfig {
  nodeEnv: NodeEnv;
  port: number;
}

function ParseNodeEnv(value: string | undefined): NodeEnv {
  if (value === 'production' || value === 'test') {
    return value;
  }
  return 'development';
}

export const appConfig = registerAs('app', (): AppConfig => ({
  nodeEnv: ParseNodeEnv(process.env.NODE_ENV),
  port: Number(process.env.PORT ?? 3000),
}));
