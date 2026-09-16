import { Locale } from '../../../../users/users.types';

interface EmailLayoutInput {
  locale: Locale;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

const FOOTER_TEXT: Record<Locale, string> = {
  [Locale.Me]: 'Ovo je automatska poruka sa Popravime — nemojte odgovarati na nju.',
  [Locale.En]: "This is an automated message from Popravime — please don't reply to it.",
};

export function BuildEmailLayout(input: EmailLayoutInput): string {
  const cta =
    input.ctaLabel && input.ctaUrl
      ? `<p style="margin:32px 0 0;"><a href="${input.ctaUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;">${input.ctaLabel}</a></p>`
      : '';

  return `
<!DOCTYPE html>
<html lang="${input.locale}">
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background:#2563eb;padding:20px 24px;">
                <span style="color:#ffffff;font-size:18px;font-weight:700;">Popravime</span>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;color:#18181b;font-size:15px;line-height:1.6;">
                ${input.bodyHtml}
                ${cta}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px;background:#fafafa;color:#71717a;font-size:12px;">
                ${FOOTER_TEXT[input.locale]}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`.trim();
}
