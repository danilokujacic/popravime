import { ContactMessagesService } from './contact-messages.service';
import { ContactMessagesRepository } from './contact-messages.repository';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ContactMessage } from './entities/contact-message.entity';
import { ContactMessageStatus } from './contact-messages.types';

function BuildMessage(overrides?: Partial<ContactMessage>): ContactMessage {
  return {
    id: 'message-1',
    name: 'Jane Doe',
    email: 'jane@example.com',
    subject: 'Question',
    message: 'Do you operate in Budva?',
    status: ContactMessageStatus.New,
    ...overrides,
  } as ContactMessage;
}

describe('ContactMessagesService.UpdateStatus', () => {
  function BuildService(message: ContactMessage) {
    const contactMessagesRepository = {
      FindById: jest.fn().mockResolvedValue(message),
      Save: jest
        .fn()
        .mockImplementation((value: ContactMessage) => Promise.resolve(value)),
    } as unknown as ContactMessagesRepository;

    const auditLogsService = {
      Log: jest.fn().mockResolvedValue(undefined),
    } as unknown as AuditLogsService;

    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
    } as unknown as ConstructorParameters<typeof ContactMessagesService>[3];

    const service = new ContactMessagesService(
      contactMessagesRepository,
      auditLogsService,
      { termsVersion: '2026-09-18', termsCacheTtlSeconds: 300 },
      logger,
    );

    return { service, auditLogsService };
  }

  it('records an audit log entry when the status changes', async () => {
    const message = BuildMessage();
    const { service, auditLogsService } = BuildService(message);

    const result = await service.UpdateStatus(
      'message-1',
      'admin-1',
      ContactMessageStatus.InProgress,
    );

    expect(result.status).toBe(ContactMessageStatus.InProgress);
    expect(auditLogsService.Log).toHaveBeenCalledWith({
      actorId: 'admin-1',
      action: 'contact_message.status_changed',
      entityType: 'contact_message',
      entityId: 'message-1',
      metadata: { status: ContactMessageStatus.InProgress },
    });
  });
});
