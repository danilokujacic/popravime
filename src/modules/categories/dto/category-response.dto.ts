export class CategoryResponseDto {
  id: string;
  name: string;
  slug: string;
  iconUrl: string | null;
  parentCategoryId: string | null;
}
