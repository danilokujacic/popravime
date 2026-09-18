import { ProviderResponseDto } from './provider-response.dto';

// Only ever returned to the provider's own owner (GET /providers/me, Create, Update) — it's
// their own contact info, not a public-facing leak. See ProviderResponseDto for why phone/email
// are absent there.
export class ProviderOwnerResponseDto extends ProviderResponseDto {
  phone: string | null;
  email: string | null;
  approved: boolean;
}
