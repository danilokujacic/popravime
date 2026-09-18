import type { Request } from 'express';
import { TermsAcceptanceEvidence } from './users.types';

const USER_AGENT_MAX_LENGTH = 500;

export function BuildTermsEvidence(
  request: Request,
  version: string,
  documentHash: string,
): TermsAcceptanceEvidence {
  const userAgent = request.headers['user-agent'];
  return {
    version,
    documentHash,
    ipAddress: request.clientIp ?? request.ip ?? null,
    userAgent: userAgent ? userAgent.slice(0, USER_AGENT_MAX_LENGTH) : null,
  };
}
