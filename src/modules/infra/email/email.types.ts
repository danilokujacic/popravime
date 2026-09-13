export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export interface WelcomeJobPayload {
  to: string;
  fullName: string;
}

export interface OfferReceivedJobPayload {
  to: string;
  customerName: string;
  providerName: string;
  requestId: string;
}

export interface OfferAcceptedJobPayload {
  to: string;
  providerName: string;
  requestId: string;
}

export interface StatusChangeJobPayload {
  to: string;
  customerName: string;
  status: string;
  requestId: string;
}

export interface ReviewCreatedJobPayload {
  to: string;
  providerName: string;
  rating: number;
  requestId: string;
}

export interface VerificationApprovedJobPayload {
  to: string;
  providerName: string;
}

export interface VerificationRejectedJobPayload {
  to: string;
  providerName: string;
  reviewNotes: string | null;
}

export interface NewMessageJobPayload {
  to: string;
  recipientName: string;
  senderName: string;
}

export interface NewInquiryJobPayload {
  to: string;
  providerName: string;
  senderName: string;
}

export interface NewRepairRequestJobPayload {
  to: string;
  providerName: string;
  categoryName: string;
  cityName: string;
  // Full URL, built once when the job is enqueued (config isn't available down in
  // email.processor.ts's pure template functions) — see RepairRequestsService.
  previewUrl: string;
}

export type EmailJob =
  | { kind: 'welcome'; payload: WelcomeJobPayload }
  | { kind: 'offer-received'; payload: OfferReceivedJobPayload }
  | { kind: 'offer-accepted'; payload: OfferAcceptedJobPayload }
  | { kind: 'status-change'; payload: StatusChangeJobPayload }
  | { kind: 'review-created'; payload: ReviewCreatedJobPayload }
  | { kind: 'verification-approved'; payload: VerificationApprovedJobPayload }
  | { kind: 'verification-rejected'; payload: VerificationRejectedJobPayload }
  | { kind: 'new-message'; payload: NewMessageJobPayload }
  | { kind: 'new-inquiry'; payload: NewInquiryJobPayload }
  | { kind: 'new-repair-request'; payload: NewRepairRequestJobPayload };
