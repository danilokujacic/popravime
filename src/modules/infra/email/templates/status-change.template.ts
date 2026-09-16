import { StatusChangeJobPayload } from '../email.types';
import { Locale } from '../../../users/users.types';
import { RequestStatus } from '../../../repair-requests/repair-requests.types';
import { BuildEmailLayout } from './shared/email-layout';

const STATUS_LABELS = {
  [Locale.Me]: {
    [RequestStatus.PendingReview]: 'na čekanju za pregled',
    [RequestStatus.Open]: 'ponovo otvorena',
    [RequestStatus.OffersReceived]: 'primljene ponude',
    [RequestStatus.Accepted]: 'prihvaćena ponuda',
    [RequestStatus.InProgress]: 'u toku',
    [RequestStatus.Completed]: 'završena',
    [RequestStatus.Cancelled]: 'otkazana',
    [RequestStatus.Rejected]: 'odbijena',
  },
  [Locale.En]: {
    [RequestStatus.PendingReview]: 'pending review',
    [RequestStatus.Open]: 'reopened',
    [RequestStatus.OffersReceived]: 'receiving offers',
    [RequestStatus.Accepted]: 'accepted',
    [RequestStatus.InProgress]: 'in progress',
    [RequestStatus.Completed]: 'completed',
    [RequestStatus.Cancelled]: 'cancelled',
    [RequestStatus.Rejected]: 'rejected',
  },
} satisfies Record<Locale, Record<RequestStatus, string>>;

const MESSAGES = {
  [Locale.Me]: {
    subject: 'Status vaše prijave kvara je promijenjen',
    body: (customerName: string, statusLabel: string) =>
      `<p>Zdravo ${customerName},</p><p>Status vaše prijave kvara je sada: <strong>${statusLabel}</strong>.</p>`,
  },
  [Locale.En]: {
    subject: 'Your repair request status changed',
    body: (customerName: string, statusLabel: string) =>
      `<p>Hi ${customerName},</p><p>Your repair request is now: <strong>${statusLabel}</strong>.</p>`,
  },
} satisfies Record<
  Locale,
  { subject: string; body: (customerName: string, statusLabel: string) => string }
>;

export function BuildStatusChangeEmail(payload: StatusChangeJobPayload): {
  subject: string;
  html: string;
} {
  const messages = MESSAGES[payload.locale];
  const statusLabel =
    STATUS_LABELS[payload.locale][payload.status as RequestStatus] ??
    payload.status;

  return {
    subject: messages.subject,
    html: BuildEmailLayout({
      locale: payload.locale,
      bodyHtml: messages.body(payload.customerName, statusLabel),
    }),
  };
}
