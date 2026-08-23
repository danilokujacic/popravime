import { FaqItem } from './entities/faq-item.entity';
import { CreateFaqItemInput, UpdateFaqItemInput } from './faq-items.types';

export interface IFaqItemsService {
  List(): Promise<FaqItem[]>;
  FindById(id: string): Promise<FaqItem>;
  Create(input: CreateFaqItemInput): Promise<FaqItem>;
  Update(id: string, input: UpdateFaqItemInput): Promise<FaqItem>;
  Delete(id: string): Promise<void>;
}
