import { FaqItem } from './entities/faq-item.entity';
import { CreateFaqItemInput, UpdateFaqItemInput } from './faq-items.types';

export interface IFaqItemsService {
  List(): Promise<FaqItem[]>;
  FindById(id: string): Promise<FaqItem>;
  Create(adminId: string, input: CreateFaqItemInput): Promise<FaqItem>;
  Update(
    id: string,
    adminId: string,
    input: UpdateFaqItemInput,
  ): Promise<FaqItem>;
  Delete(id: string, adminId: string): Promise<void>;
}
