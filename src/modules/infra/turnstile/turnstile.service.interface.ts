export interface ITurnstileService {
  Verify(token: string | null, remoteIp: string): Promise<boolean>;
}
