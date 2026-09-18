export interface PurgeOutcome {
  records: number;
  fileUrls: string[];
}

export interface PurgeSummary {
  inactiveAccounts: number;
  requests: number;
  inquiries: number;
  contactMessages: number;
  expiredConfirmations: number;
  files: number;
  failedFileDeletions: number;
}

export interface PurgeCutoffs {
  inactiveAccounts: Date;
  completedRequests: Date;
  unacceptedRequests: Date;
  inquiries: Date;
  contactMessages: Date;
}
