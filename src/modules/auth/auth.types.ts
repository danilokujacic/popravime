export interface LoginInput {
  email: string;
  password: string;
}

// A plain registration no longer auto-logs in (see AuthService.Register) — there's no session to
// hand back until the address is confirmed, just an acknowledgement of where the link went.
export interface PendingConfirmationResult {
  email: string;
}
