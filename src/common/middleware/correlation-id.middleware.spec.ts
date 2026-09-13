import type { Request, Response } from 'express';
import { CorrelationIdMiddleware } from './correlation-id.middleware';
import { CORRELATION_ID_HEADER } from '../constants/correlation.constants';

function BuildResponse(): { headers: Record<string, string> } & Response {
  const headers: Record<string, string> = {};
  return {
    headers,
    setHeader: (name: string, value: string) => {
      headers[name] = value;
    },
  } as unknown as { headers: Record<string, string> } & Response;
}

describe('CorrelationIdMiddleware', () => {
  it('generates a correlation id when none is supplied', () => {
    const req = { headers: {} } as unknown as Request;
    const res = BuildResponse();
    const next = jest.fn();

    CorrelationIdMiddleware(req, res, next);

    expect(req.id).toEqual(expect.any(String));
    expect(req.id).toHaveLength(36);
    expect(res.headers[CORRELATION_ID_HEADER]).toBe(req.id);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('reuses an inbound correlation id instead of generating a new one', () => {
    const req = {
      headers: { [CORRELATION_ID_HEADER]: 'client-supplied-id' },
    } as unknown as Request;
    const res = BuildResponse();
    const next = jest.fn();

    CorrelationIdMiddleware(req, res, next);

    expect(req.id).toBe('client-supplied-id');
    expect(res.headers[CORRELATION_ID_HEADER]).toBe('client-supplied-id');
  });

  it('uses the first value when the header is supplied more than once', () => {
    const req = {
      headers: { [CORRELATION_ID_HEADER]: ['first-id', 'second-id'] },
    } as unknown as Request;
    const res = BuildResponse();
    const next = jest.fn();

    CorrelationIdMiddleware(req, res, next);

    expect(req.id).toBe('first-id');
  });
});
