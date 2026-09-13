import type { Request } from 'express';
import type { ClsService } from 'nestjs-cls';
import { CORRELATION_ID_CLS_KEY } from '../constants/correlation.constants';

export function CorrelationClsSetup(cls: ClsService, req: Request): void {
  cls.set(CORRELATION_ID_CLS_KEY, req.id);
}
