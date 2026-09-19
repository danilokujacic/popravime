import { EmailAdmission, EmailJob } from './email.types';

export interface IEmailAdmissionService {
  Admit(kind: EmailJob['kind']): Promise<EmailAdmission>;
}
