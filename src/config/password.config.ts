import { registerAs } from '@nestjs/config';

export interface PasswordConfig {
  saltRounds: number;
}

export const passwordConfig = registerAs(
  'password',
  (): PasswordConfig => ({
    saltRounds: Number(process.env.BCRYPT_SALT_ROUNDS ?? 10),
  }),
);
