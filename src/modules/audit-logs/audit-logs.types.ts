export interface LogActionInput {
  actorId?: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

export interface ListAuditLogsFilter {
  actorId?: string;
  entityType?: string;
  action?: string;
}
