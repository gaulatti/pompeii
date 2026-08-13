const RETURN_TO_KEY = 'pompeii:return-to';

function allowedOrigins(): Set<string> {
  const configured =
    (import.meta.env.VITE_LOGIN_REDIRECT_ORIGINS as string | undefined)
      ?.split(',')
      .map((value) => value.trim())
      .filter(Boolean) ?? [];
  const origins = configured.flatMap((value) => {
    try {
      return [new URL(value).origin];
    } catch {
      return [];
    }
  });
  return new Set([window.location.origin, ...origins]);
}

export function validateReturnTo(value: string | null): string | null {
  if (!value) return null;
  try {
    const target = new URL(value);
    if (!['http:', 'https:'].includes(target.protocol)) {
      const schemes = (
        (import.meta.env.VITE_LOGIN_REDIRECT_SCHEMES as string | undefined) ??
        ''
      )
        .split(',')
        .map((scheme) => scheme.trim().replace(/:$/, ''))
        .filter(Boolean);
      const requestedScheme = target.protocol.replace(/:$/, '');
      return schemes.includes(requestedScheme) &&
        !target.username &&
        !target.password
        ? target.toString()
        : null;
    }
    if (
      import.meta.env.DEV &&
      (target.hostname === 'localhost' || target.hostname === '127.0.0.1')
    ) {
      return target.toString();
    }
    return allowedOrigins().has(target.origin) ? target.toString() : null;
  } catch {
    return null;
  }
}

export function rememberReturnTo(value: string | null): string | null {
  const target = validateReturnTo(value);
  if (target) sessionStorage.setItem(RETURN_TO_KEY, target);
  return target;
}

export function takeReturnTo(): string | null {
  const target = validateReturnTo(sessionStorage.getItem(RETURN_TO_KEY));
  sessionStorage.removeItem(RETURN_TO_KEY);
  return target;
}

export function addSsoHandoff(target: string): string {
  const returnTo = new URL(target);
  if (!['http:', 'https:'].includes(returnTo.protocol)) {
    returnTo.searchParams.set('pompeii_sso', '1');
    return returnTo.toString();
  }
  const handoff = new URL('/login', returnTo.origin);
  handoff.searchParams.set('pompeii_sso', '1');
  handoff.searchParams.set(
    'returnTo',
    returnTo.pathname === '/login'
      ? '/'
      : `${returnTo.pathname}${returnTo.search}${returnTo.hash}`,
  );
  return handoff.toString();
}
