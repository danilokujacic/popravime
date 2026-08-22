import { Params } from 'nestjs-pino';
import { NodeEnv } from '../../config/app.config';

const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body.password',
  'req.body.password_hash',
  'req.body.refresh_token',
  'req.body.access_token',
  '*.password',
  '*.passwordHash',
  '*.password_hash',
  '*.refreshToken',
  '*.refresh_token',
  '*.accessToken',
  '*.access_token',
  '*.secret',
];

export function BuildPinoOptions(nodeEnv: NodeEnv): Params {
  const isDevelopment = nodeEnv === 'development';

  return {
    pinoHttp: {
      level: nodeEnv === 'test' ? 'silent' : 'info',
      redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
      transport: isDevelopment
        ? { target: 'pino-pretty', options: { singleLine: true } }
        : undefined,
      autoLogging: !isDevelopment,
      customProps: () => ({ context: 'HTTP' }),
    },
  };
}
