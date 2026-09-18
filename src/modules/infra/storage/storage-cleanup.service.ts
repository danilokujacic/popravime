import { Inject, Injectable } from '@nestjs/common';
import { STORAGE_SERVICE } from '../../../common/constants/di-tokens';
import type { StorageService } from './storage.service.interface';

@Injectable()
export class StorageCleanupService {
  constructor(
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  async DeleteByUrls(values: string[]): Promise<number> {
    const results = await Promise.allSettled(
      values.flatMap((value) => this.BuildDeletion(value)),
    );
    return results.filter((result) => result.status === 'rejected').length;
  }

  private BuildDeletion(value: string): Promise<void>[] {
    const privateKey = this.storage.ExtractPrivateKey(value);
    if (privateKey !== null) {
      return [this.storage.DeletePrivate(privateKey)];
    }

    const publicKey = this.storage.ExtractKey(value);
    return publicKey === null ? [] : [this.storage.Delete(publicKey)];
  }
}
