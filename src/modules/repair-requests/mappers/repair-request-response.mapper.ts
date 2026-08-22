import { RepairRequest } from '../entities/repair-request.entity';
import { RepairRequestResponseDto } from '../dto/repair-request-response.dto';

export class RepairRequestResponseMapper {
  static ToDto(this: void, request: RepairRequest): RepairRequestResponseDto {
    const dto = new RepairRequestResponseDto();
    dto.id = request.id;
    dto.customerId = request.customerId;
    dto.categoryId = request.categoryId;
    dto.brand = request.brand;
    dto.model = request.model;
    dto.description = request.description;
    dto.photoUrls = request.photoUrls;
    dto.cityId = request.cityId;
    dto.urgency = request.urgency;
    dto.status = request.status;
    dto.acceptedOfferId = request.acceptedOfferId;
    dto.createdAt = request.createdAt;
    return dto;
  }
}
