import { EmailJobContent } from '../infra/email/email.types';

export enum NotificationType {
  NewOffer = 'new_offer',
  OfferAccepted = 'offer_accepted',
  StatusChange = 'status_change',
  NewReview = 'new_review',
  VerificationApproved = 'verification_approved',
  VerificationRejected = 'verification_rejected',
  NewMessage = 'new_message',
  NewInquiry = 'new_inquiry',
  NewRepairRequest = 'new_repair_request',
  OfferAcceptedConfirmation = 'offer_accepted_confirmation',
  OfferCancelled = 'offer_cancelled',
  RequestReopened = 'request_reopened',
}

export type NotificationMessageParams = Record<string, string | number>;

export interface NotifyInput {
  userId: string;
  type: NotificationType;
  messageKey: string;
  messageParams?: NotificationMessageParams;
  relatedEntityType?: string;
  relatedEntityId?: string;
  email: EmailJobContent;
}
