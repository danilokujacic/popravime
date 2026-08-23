import { VerificationRequest } from '../entities/verification-request.entity';
import { VerificationRequestResponseDto } from '../dto/verification-request-response.dto';

export class VerificationRequestResponseMapper {
  static ToDto(
    this: void,
    request: VerificationRequest,
  ): VerificationRequestResponseDto {
    const dto = new VerificationRequestResponseDto();
    dto.id = request.id;
    dto.providerId = request.providerId;
    dto.documentUrl = request.documentUrl;
    dto.aprNumber = request.aprNumber;
    dto.status = request.status;
    dto.reviewedByAdminId = request.reviewedByAdminId;
    dto.reviewNotes = request.reviewNotes;
    dto.submittedAt = request.submittedAt;
    dto.reviewedAt = request.reviewedAt;
    return dto;
  }
}
