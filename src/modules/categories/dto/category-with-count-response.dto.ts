export class CategoryWithCountResponseDto {
  id: string;
  slug: string;
  iconUrl: string | null;
  parentCategoryId: string | null;
  providerCount: number;
}
