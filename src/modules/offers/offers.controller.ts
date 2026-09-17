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
import { Throttle } from '@nestjs/throttler';
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
import {
  OFFER_CREATE_THROTTLE,
  OFFER_STATUS_THROTTLE,
} from '../infra/rate-limit/rate-limit.constants';

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
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedResult<OfferResponseDto>> {
    const result = await this.offersService.ListForViewer(
      {
        requestId: query.requestId,
        providerId: query.providerId,
        status: query.status,
      },
      user,
      query.page,
      query.limit,
    );

    const items = await Promise.all(
      result.items.map(async (offer) => {
        const [customerContact, providerContact] = await Promise.all([
          this.offersService.ResolveCustomerContactForOffer(offer, user),
          this.offersService.ResolveProviderContactForOffer(offer, user),
        ]);
        return OfferResponseMapper.ToDto(offer, customerContact, providerContact);
      }),
    );
    return { ...result, items };
  }

  @Get(':id')
  async FindOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OfferResponseDto> {
    const offer = await this.offersService.FindByIdForViewer(id, user);
    const [customerContact, providerContact] = await Promise.all([
      this.offersService.ResolveCustomerContactForOffer(offer, user),
      this.offersService.ResolveProviderContactForOffer(offer, user),
    ]);
    return OfferResponseMapper.ToDto(offer, customerContact, providerContact);
  }

  @Throttle(OFFER_CREATE_THROTTLE)
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

  @Throttle(OFFER_STATUS_THROTTLE)
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
