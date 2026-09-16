import { ReviewCreatedJobPayload } from '../email.types';
import { Locale } from '../../../users/users.types';
import { BuildEmailLayout } from './shared/email-layout';

const MESSAGES = {
  [Locale.Me]: {
    subject: 'Dobili ste novu recenziju',
    body: (providerName: string, rating: number, requestId: string) =>
      `<p>Zdravo ${providerName},</p><p>Dobili ste recenziju sa ${rating}/5 zvjezdica za prijavu kvara ${requestId}.</p>`,
  },
  [Locale.En]: {
    subject: 'You received a new review',
    body: (providerName: string, rating: number, requestId: string) =>
      `<p>Hi ${providerName},</p><p>You received a ${rating}-star review for repair request ${requestId}.</p>`,
  },
} satisfies Record<
  Locale,
  {
    subject: string;
    body: (providerName: string, rating: number, requestId: string) => string;
  }
>;

export function BuildReviewCreatedEmail(payload: ReviewCreatedJobPayload): {
  subject: string;
  html: string;
} {
  const messages = MESSAGES[payload.locale];

  return {
    subject: messages.subject,
    html: BuildEmailLayout({
      locale: payload.locale,
      bodyHtml: messages.body(
        payload.providerName,
        payload.rating,
        payload.requestId,
      ),
    }),
  };
}
