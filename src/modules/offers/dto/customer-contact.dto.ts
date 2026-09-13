// Only ever attached to an Accepted offer, and only for the viewer entitled to it (the offer's
// own provider owner, or an admin) — see OffersService.ResolveCustomerContactForOffer. Never
// present on a pending/rejected/withdrawn offer, and never for a customer viewing their own
// offers (they already know their own contact details).
export class CustomerContactDto {
  fullName: string;
  email: string;
  phone: string | null;
}
