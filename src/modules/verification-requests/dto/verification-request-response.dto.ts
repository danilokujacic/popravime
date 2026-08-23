import { VerificationRequestStatus } from '../verification-requests.types';

export class VerificationRequestResponseDto {
  id: string;
  providerId: string;
  documentUrl: string;
  aprNumber: string;
  status: VerificationRequestStatus;
  reviewedByAdminId: string | null;
  reviewNotes: string | null;
  submittedAt: Date;
  reviewedAt: Date | null;
}
