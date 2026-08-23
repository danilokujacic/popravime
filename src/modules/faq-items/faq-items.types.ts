export interface CreateFaqItemInput {
  question: string;
  answer: string;
  category: string;
  sortOrder?: number;
}

export interface UpdateFaqItemInput {
  question?: string;
  answer?: string;
  category?: string;
  sortOrder?: number;
}
