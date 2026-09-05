import { appConfig } from './app.config';
import { databaseConfig } from './database.config';
import { redisConfig } from './redis.config';
import { jwtConfig } from './jwt.config';
import { passwordConfig } from './password.config';
import { storageConfig } from './storage.config';
import { emailConfig } from './email.config';
import { throttleConfig } from './throttle.config';
import { geocodingConfig } from './geocoding.config';
import { oauthConfig } from './oauth.config';

export const ConfigNamespaces = [
  appConfig,
  databaseConfig,
  redisConfig,
  jwtConfig,
  passwordConfig,
  storageConfig,
  emailConfig,
  throttleConfig,
  geocodingConfig,
  oauthConfig,
];
