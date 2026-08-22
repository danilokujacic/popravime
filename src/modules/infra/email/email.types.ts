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

export type EmailJob =
  | { kind: 'welcome'; payload: WelcomeJobPayload }
  | { kind: 'offer-received'; payload: OfferReceivedJobPayload }
  | { kind: 'offer-accepted'; payload: OfferAcceptedJobPayload };
