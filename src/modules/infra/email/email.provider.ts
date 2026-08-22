import { FactoryProvider } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { emailConfig } from '../../../config/email.config';
import { SmtpEmailService } from './smtp-email.service';
import { EMAIL_SERVICE } from '../../../common/constants/di-tokens';

export const EmailProvider: FactoryProvider = {
  provide: EMAIL_SERVICE,
  inject: [emailConfig.KEY],
  useFactory: (config: ConfigType<typeof emailConfig>) => new SmtpEmailService(config),
};
