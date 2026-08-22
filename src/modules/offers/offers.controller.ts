import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { OffersService } from './offers.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferStatusDto } from './dto/update-offer-status.dto';
import { ListOffersQueryDto } from './dto/list-offers-query.dto';
import { OfferResponseDto } from './dto/offer-response.dto';
import { OfferResponseMapper } from './mappers/offer-response.mapper';
import { Offer } from './entities/offer.entity';
import { OfferStatus } from './offers.types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

type OfferAction = (
  service: OffersService,
  offerId: string,
  requesterId: string,
) => Promise<Offer>;

const STATUS_ACTIONS: Record<
  OfferStatus.Accepted | OfferStatus.Rejected | OfferStatus.Withdrawn,
  OfferAction
> = {
  [OfferStatus.Accepted]: (service, offerId, requesterId) =>
    service.Accept(offerId, requesterId),
  [OfferStatus.Rejected]: (service, offerId, requesterId) =>
    service.Reject(offerId, requesterId),
  [OfferStatus.Withdrawn]: (service, offerId, requesterId) =>
    service.Withdraw(offerId, requesterId),
};

@Controller('offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Get()
  async List(
    @Query() query: ListOffersQueryDto,
  ): Promise<PaginatedResult<OfferResponseDto>> {
    const result = await this.offersService.List(
      {
        requestId: query.requestId,
        providerId: query.providerId,
        status: query.status,
      },
      query.page,
      query.limit,
    );

    return { ...result, items: result.items.map(OfferResponseMapper.ToDto) };
  }

  @Get(':id')
  async FindOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OfferResponseDto> {
    const offer = await this.offersService.FindById(id);
    return OfferResponseMapper.ToDto(offer);
  }

  @Post()
  async Create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOfferDto,
  ): Promise<OfferResponseDto> {
    const offer = await this.offersService.Create(user.id, {
      requestId: dto.requestId,
      providerId: dto.providerId,
      priceMin: dto.priceMin,
      priceMax: dto.priceMax,
      estimatedDuration: dto.estimatedDuration,
      partsType: dto.partsType,
      message: dto.message,
    });
    return OfferResponseMapper.ToDto(offer);
  }

  @Patch(':id/status')
  async UpdateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateOfferStatusDto,
  ): Promise<OfferResponseDto> {
    const action = STATUS_ACTIONS[dto.status];
    const offer = await action(this.offersService, id, user.id);
    return OfferResponseMapper.ToDto(offer);
  }
}
