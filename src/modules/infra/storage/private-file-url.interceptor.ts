import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { from, mergeMap, Observable } from 'rxjs';
import { FileUrlService } from './file-url.service';

const FILE_FIELDS = new Set(['photoUrls', 'attachmentUrl', 'documentUrl']);

function IsRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  );
}

function IsStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

@Injectable()
export class PrivateFileUrlInterceptor implements NestInterceptor {
  constructor(private readonly fileUrlService: FileUrlService) {}

  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next
      .handle()
      .pipe(mergeMap((body: unknown) => from(this.Sign(body))));
  }

  private async Sign(value: unknown): Promise<unknown> {
    if (Array.isArray(value)) {
      return Promise.all(value.map((item) => this.Sign(item)));
    }
    if (!IsRecord(value)) {
      return value;
    }

    for (const [key, item] of Object.entries(value)) {
      value[key] = await this.SignField(key, item);
    }
    return value;
  }

  private async SignField(key: string, item: unknown): Promise<unknown> {
    if (!FILE_FIELDS.has(key)) {
      return this.Sign(item);
    }
    if (typeof item === 'string') {
      return this.fileUrlService.Resolve(item);
    }
    return IsStringArray(item) ? this.fileUrlService.ResolveMany(item) : item;
  }
}
