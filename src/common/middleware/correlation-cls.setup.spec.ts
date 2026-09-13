import type { Request } from 'express';
import type { ClsService } from 'nestjs-cls';
import { CorrelationClsSetup } from './correlation-cls.setup';
import { CORRELATION_ID_CLS_KEY } from '../constants/correlation.constants';

describe('CorrelationClsSetup', () => {
  it('stores the request correlation id under the CLS correlation key', () => {
    const req = { id: 'request-1' } as unknown as Request;
    const cls = { set: jest.fn() } as unknown as ClsService;

    CorrelationClsSetup(cls, req);

    expect(cls.set).toHaveBeenCalledWith(CORRELATION_ID_CLS_KEY, 'request-1');
  });
});
