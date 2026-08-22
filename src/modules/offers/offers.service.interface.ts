import { Offer } from './entities/offer.entity';
import { CreateOfferInput, ListOffersFilter } from './offers.types';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

export interface IOffersService {
  Create(providerOwnerId: string, input: CreateOfferInput): Promise<Offer>;
  Accept(offerId: string, customerId: string): Promise<Offer>;
  Reject(offerId: string, customerId: string): Promise<Offer>;
  Withdraw(offerId: string, providerOwnerId: string): Promise<Offer>;
  FindById(id: string): Promise<Offer>;
  List(
    filter: ListOffersFilter,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Offer>>;
}
