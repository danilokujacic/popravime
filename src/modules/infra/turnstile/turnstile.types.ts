export const MAX_TURNSTILE_TOKEN_LENGTH = 2048;

export interface SiteverifyResponse {
  success: boolean;
}

export function IsSiteverifyResponse(
  value: unknown,
): value is SiteverifyResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    typeof value.success === 'boolean'
  );
}

export function ExtractErrorCodes(value: unknown): string[] {
  if (
    typeof value === 'object' &&
    value !== null &&
    'error-codes' in value &&
    Array.isArray(value['error-codes'])
  ) {
    return value['error-codes'].filter(
      (code): code is string => typeof code === 'string',
    );
  }
  return [];
}
