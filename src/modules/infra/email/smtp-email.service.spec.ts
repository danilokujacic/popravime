import { SmtpEmailService } from './smtp-email.service';
import { EmailConfig } from '../../../config/email.config';

const sendMail = jest.fn();

jest.mock('nodemailer', () => ({
  createTransport: () => ({ sendMail }),
}));

function BuildConfig(): EmailConfig {
  return {
    host: 'smtp.example.com',
    port: 587,
    secure: false,
    user: 'user',
    password: 'password',
    from: 'no-reply@popravime.me',
  };
}

describe('SmtpEmailService', () => {
  beforeEach(() => {
    sendMail.mockReset();
  });

  it('reports the accepted recipients and message id on success', async () => {
    sendMail.mockResolvedValue({
      accepted: ['user@popravime.me'],
      rejected: [],
      messageId: '<message-1@smtp>',
    });

    const service = new SmtpEmailService(BuildConfig());

    const result = await service.Send({
      to: 'user@popravime.me',
      subject: 'Hello',
      html: '<p>Hello</p>',
    });

    expect(result).toEqual({
      accepted: ['user@popravime.me'],
      rejected: [],
      messageId: '<message-1@smtp>',
    });
  });

  it('propagates a rejection when the SMTP relay errors', async () => {
    const smtpError = new Error('535 authentication failed');
    sendMail.mockRejectedValue(smtpError);

    const service = new SmtpEmailService(BuildConfig());

    await expect(
      service.Send({
        to: 'user@popravime.me',
        subject: 'Hello',
        html: '<p>Hello</p>',
      }),
    ).rejects.toThrow(smtpError);
  });
});
