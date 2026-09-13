import { createTransport, Transporter } from 'nodemailer';
import { EmailService } from './email.service.interface';
import { SendEmailInput, SendEmailResult } from './email.types';
import { EmailConfig } from '../../../config/email.config';
import { MapSentMessageInfo } from './mappers/sent-message-info.mapper';

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

  async Send(input: SendEmailInput): Promise<SendEmailResult> {
    const info = await this.transporter.sendMail({
      from: this.config.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });

    return MapSentMessageInfo(info);
  }
}
