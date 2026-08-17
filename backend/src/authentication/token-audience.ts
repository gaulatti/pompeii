import { JwtPayload } from 'jsonwebtoken';

export function tokenAudience(payload: JwtPayload): string | null {
  if (typeof payload.aud === 'string' && payload.aud.trim()) {
    return payload.aud.trim();
  }
  if (Array.isArray(payload.aud)) {
    const audience = payload.aud.find(
      (value): value is string => typeof value === 'string' && !!value.trim(),
    );
    return audience?.trim() ?? null;
  }
  return null;
}
