export enum VerificationRequestStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
}

export interface SubmitVerificationRequestInput {
  providerId: string;
  aprNumber: string;
  document: {
    buffer: Buffer;
    fileName: string;
    contentType: string;
  };
}

export interface ReviewVerificationRequestInput {
  reviewNotes?: string;
}

export interface ListVerificationRequestsFilter {
  status?: VerificationRequestStatus;
}
