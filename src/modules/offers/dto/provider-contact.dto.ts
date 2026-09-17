// Only ever attached to an Accepted offer, and only for the viewer entitled to it (the
// customer who owns the request, or an admin) — see OffersService.ResolveProviderContactForOffer.
// Never present on a pending/rejected/withdrawn/cancelled offer, and never for the provider
// owner viewing their own offers (they already know their own contact details).
export class ProviderContactDto {
  phone: string | null;
  email: string | null;
}
