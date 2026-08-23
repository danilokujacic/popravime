import { EmailJob } from '../infra/email/email.types';

export enum NotificationType {
  NewOffer = 'new_offer',
  OfferAccepted = 'offer_accepted',
  StatusChange = 'status_change',
  NewReview = 'new_review',
  VerificationApproved = 'verification_approved',
  VerificationRejected = 'verification_rejected',
  NewMessage = 'new_message',
  NewInquiry = 'new_inquiry',
}

export interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  email: EmailJob;
}
