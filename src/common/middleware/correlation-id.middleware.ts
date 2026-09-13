import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { CORRELATION_ID_HEADER } from '../constants/correlation.constants';

// Registered via `app.use()` in main.ts, ahead of `app.listen()` — Nest only wires up
// module-registered middleware (pino-http, ClsMiddleware) once `init()` runs as part of
// `listen()`, so this always runs first and sets `req.id` before either of them do. pino-http
// reuses a pre-existing `req.id` instead of generating its own (`req.id = req.id ||
// genReqId(...)`), and ClsMiddleware's `setup` hook reads the same `req.id` — one correlation ID
// feeds both without depending on the relative order Nest applies their own middleware in.
export function CorrelationIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const inbound = req.headers[CORRELATION_ID_HEADER];
  const correlationId =
    (Array.isArray(inbound) ? inbound[0] : inbound) || randomUUID();

  req.id = correlationId;
  res.setHeader(CORRELATION_ID_HEADER, correlationId);
  next();
}
