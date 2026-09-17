import { Offer } from './entities/offer.entity';
import { CreateOfferInput, ListOffersFilter } from './offers.types';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { CustomerContactDto } from './dto/customer-contact.dto';
import { ProviderContactDto } from './dto/provider-contact.dto';
import { RepairRequest } from '../repair-requests/entities/repair-request.entity';

export interface IOffersService {
  Create(providerOwnerId: string, input: CreateOfferInput): Promise<Offer>;
  Accept(offerId: string, customerId: string): Promise<Offer>;
  Reject(offerId: string, customerId: string): Promise<Offer>;
  Withdraw(offerId: string, providerOwnerId: string): Promise<Offer>;
  Reopen(requestId: string, customerId: string): Promise<RepairRequest>;
  FindById(id: string): Promise<Offer>;
  List(
    filter: ListOffersFilter,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Offer>>;
  ListForViewer(
    filter: ListOffersFilter,
    viewer: AuthenticatedUser,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Offer>>;
  FindByIdForViewer(id: string, viewer: AuthenticatedUser): Promise<Offer>;
  ResolveCustomerContactForOffer(
    offer: Offer,
    viewer: AuthenticatedUser,
  ): Promise<CustomerContactDto | null>;
  ResolveProviderContactForOffer(
    offer: Offer,
    viewer: AuthenticatedUser,
  ): Promise<ProviderContactDto | null>;
}
