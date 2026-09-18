export interface PurgeOutcome {
  records: number;
  fileUrls: string[];
}

export interface PurgeSummary {
  inactiveAccounts: number;
  acceptanceRecords: number;
  requests: number;
  inquiries: number;
  contactMessages: number;
  expiredConfirmations: number;
  files: number;
  failedFileDeletions: number;
}

export interface PurgeCutoffs {
  inactiveAccounts: Date;
  acceptanceRecords: Date;
  completedRequests: Date;
  unacceptedRequests: Date;
  inquiries: Date;
  contactMessages: Date;
}
