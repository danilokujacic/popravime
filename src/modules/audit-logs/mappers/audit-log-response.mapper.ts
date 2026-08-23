import { AuditLog } from '../entities/audit-log.entity';
import { AuditLogResponseDto } from '../dto/audit-log-response.dto';

export class AuditLogResponseMapper {
  static ToDto(this: void, log: AuditLog): AuditLogResponseDto {
    const dto = new AuditLogResponseDto();
    dto.id = log.id;
    dto.actorId = log.actorId;
    dto.action = log.action;
    dto.entityType = log.entityType;
    dto.entityId = log.entityId;
    dto.metadata = log.metadata;
    dto.createdAt = log.createdAt;
    return dto;
  }
}
