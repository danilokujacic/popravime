import { Locale } from '../../users/users.types';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export interface SendEmailResult {
  accepted: string[];
  rejected: string[];
  messageId: string | null;
}

// Every job payload carries the recipient's locale — templates render fully localized subject
// and HTML from it rather than always defaulting to English.
export interface BaseJobPayload {
  to: string;
  locale: Locale;
}

export interface WelcomeJobPayload extends BaseJobPayload {
  fullName: string;
}

export interface EmailConfirmationJobPayload extends BaseJobPayload {
  fullName: string;
  // Full URL, built once when the job is enqueued — see AuthService.
  confirmUrl: string;
}

export interface OfferReceivedJobPayload extends BaseJobPayload {
  customerName: string;
  providerName: string;
  requestId: string;
}

export interface OfferAcceptedJobPayload extends BaseJobPayload {
  providerName: string;
  requestId: string;
  // Contact info matters more than the in-app chat here — put it straight in the email rather
  // than making the provider log in and open a conversation thread to get it.
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  previewUrl: string;
}

export interface OfferAcceptedCustomerJobPayload extends BaseJobPayload {
  customerName: string;
  providerName: string;
  providerEmail: string | null;
  providerPhone: string | null;
  providerWebsite: string | null;
  previewUrl: string;
}

export interface StatusChangeJobPayload extends BaseJobPayload {
  customerName: string;
  status: string;
  requestId: string;
}

export interface ReviewCreatedJobPayload extends BaseJobPayload {
  providerName: string;
  rating: number;
  requestId: string;
}

export interface VerificationApprovedJobPayload extends BaseJobPayload {
  providerName: string;
}

export interface VerificationRejectedJobPayload extends BaseJobPayload {
  providerName: string;
  reviewNotes: string | null;
}

export interface NewMessageJobPayload extends BaseJobPayload {
  recipientName: string;
  senderName: string;
}

export interface NewInquiryJobPayload extends BaseJobPayload {
  providerName: string;
  senderName: string;
}

export interface NewRepairRequestJobPayload extends BaseJobPayload {
  providerName: string;
  categoryName: string;
  cityName: string;
  // Full URL, built once when the job is enqueued (config isn't available down in
  // email.processor.ts's pure template functions) — see RepairRequestsService.
  previewUrl: string;
}

export interface OfferCancelledJobPayload extends BaseJobPayload {
  providerName: string;
  requestId: string;
}

// What an email job renders — the kind/payload pair. Callers that never touch the queue
// directly (they go through NotificationsService.Notify) only ever construct this part; it's
// NotificationsService's job to attach the metadata below before enqueuing, not theirs.
export type EmailJobContent =
  | { kind: 'welcome'; payload: WelcomeJobPayload }
  | { kind: 'email-confirmation'; payload: EmailConfirmationJobPayload }
  | { kind: 'offer-received'; payload: OfferReceivedJobPayload }
  | { kind: 'offer-accepted'; payload: OfferAcceptedJobPayload }
  | {
      kind: 'offer-accepted-customer';
      payload: OfferAcceptedCustomerJobPayload;
    }
  | { kind: 'status-change'; payload: StatusChangeJobPayload }
  | { kind: 'review-created'; payload: ReviewCreatedJobPayload }
  | { kind: 'verification-approved'; payload: VerificationApprovedJobPayload }
  | { kind: 'verification-rejected'; payload: VerificationRejectedJobPayload }
  | { kind: 'new-message'; payload: NewMessageJobPayload }
  | { kind: 'new-inquiry'; payload: NewInquiryJobPayload }
  | { kind: 'new-repair-request'; payload: NewRepairRequestJobPayload }
  | { kind: 'offer-cancelled'; payload: OfferCancelledJobPayload };

// Queue/job metadata, not email content — kept separate from EmailJobContent so the many
// call sites that only ever describe *what* to send (they go through
// NotificationsService.Notify) never need to know about correlation ids. Required (not
// optional): every path that reaches the queue must supply the correlation id of the request
// (or job) that triggered this email, so its send lifecycle stays traceable in Loki. See
// openspec/changes/add-grafana-loki-observability/specs/observability/request-correlation.
export interface EmailJobMetadata {
  correlationId: string;
}

export type EmailJob = EmailJobMetadata & EmailJobContent;
