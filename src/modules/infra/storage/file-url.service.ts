import { Inject, Injectable } from '@nestjs/common';
import { STORAGE_SERVICE } from '../../../common/constants/di-tokens';
import type { StorageService } from './storage.service.interface';

@Injectable()
export class FileUrlService {
  constructor(
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  async Resolve(value: string): Promise<string> {
    const key = this.storage.ExtractPrivateKey(value);
    return key === null ? value : this.storage.SignUrl(key);
  }

  ResolveMany(values: string[]): Promise<string[]> {
    return Promise.all(values.map((value) => this.Resolve(value)));
  }
}
