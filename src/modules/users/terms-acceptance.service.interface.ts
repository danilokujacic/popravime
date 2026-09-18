export interface ITermsAcceptanceService {
  HasAccepted(userId: string): Promise<boolean>;
  Invalidate(userId: string): Promise<void>;
}
