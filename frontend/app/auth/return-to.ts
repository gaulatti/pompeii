import { Method, sendPublicRequest } from '~/clients/api';

const RETURN_TO_KEY = 'pompeii:return-to';

function parseReturnTo(value: string | null): string | null {
  if (!value) return null;
  try {
    const target = new URL(value);
    return !target.username && !target.password ? target.toString() : null;
  } catch {
    return null;
  }
}

export function rememberReturnTo(value: string | null): string | null {
  const target = parseReturnTo(value);
  if (target) sessionStorage.setItem(RETURN_TO_KEY, target);
  return target;
}

export function takeReturnTo(): string | null {
  const target = parseReturnTo(sessionStorage.getItem(RETURN_TO_KEY));
  sessionStorage.removeItem(RETURN_TO_KEY);
  return target;
}

export async function resolveReturnTo(
  value: string | null,
): Promise<string | null> {
  const returnTo = parseReturnTo(value);
  if (!returnTo) return null;
  try {
    const response = await sendPublicRequest(
      Method.POST,
      'authorization/login/resolve',
      { returnTo },
    );
    return typeof response?.redirect_to === 'string'
      ? response.redirect_to
      : null;
  } catch {
    return null;
  }
}
