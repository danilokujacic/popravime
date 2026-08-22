import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { passwordConfig } from '../../config/password.config';

@Injectable()
export class PasswordHasher {
  constructor(
    @Inject(passwordConfig.KEY)
    private readonly config: ConfigType<typeof passwordConfig>,
  ) {}

  Hash(plainText: string): Promise<string> {
    return bcrypt.hash(plainText, this.config.saltRounds);
  }

  Verify(plainText: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainText, hash);
  }
}
