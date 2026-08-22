import { createTransport, Transporter } from 'nodemailer';
import { EmailService } from './email.service.interface';
import { SendEmailInput } from './email.types';
import { EmailConfig } from '../../../config/email.config';

export class SmtpEmailService implements EmailService {
  private readonly transporter: Transporter;

  constructor(private readonly config: EmailConfig) {
    this.transporter = createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user
        ? { user: config.user, pass: config.password }
        : undefined,
    });
  }

  async Send(input: SendEmailInput): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
  }
}
