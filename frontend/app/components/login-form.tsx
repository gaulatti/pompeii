import { LockKeyhole, LogIn } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { signInWithRedirect } from 'aws-amplify/auth';
import { rememberReturnTo } from '~/auth/return-to';
import { useAuthStatus } from '~/hooks/useAuth';
import { Button, Card, IconBadge, LoadingSpinner, toast } from '~/lib/bleecker';
import { isTestAuth } from '~/auth/session';

export function LoginForm() {
  const { isAuthenticated, isLoaded } = useAuthStatus();
  const [signingIn, setSigningIn] = useState(false);
  const location = useLocation();
  const requestedReturnTo = useMemo(
    () => new URLSearchParams(location.search).get('returnTo'),
    [location.search],
  );

  if (isTestAuth()) {
    return (
      <div className="flex min-h-80 flex-col items-center justify-center gap-4" role="status">
        <LoadingSpinner size="lg" />
        <p className="app-secondary-copy text-sm text-text-secondary">Opening the local test session…</p>
      </div>
    );
  }

  useEffect(() => {
    if (requestedReturnTo) rememberReturnTo(requestedReturnTo);
  }, [requestedReturnTo]);

  if (!isLoaded || isAuthenticated) {
    return (
      <div
        className="flex min-h-80 flex-col items-center justify-center gap-4"
        aria-busy="true"
        role="status"
      >
        <LoadingSpinner size="lg" />
        <p className="app-secondary-copy text-sm text-text-secondary">
          Checking your session…
        </p>
      </div>
    );
  }

  const signIn = async () => {
    setSigningIn(true);
    try {
      rememberReturnTo(requestedReturnTo);
      await signInWithRedirect({ provider: 'Google' });
    } catch {
      setSigningIn(false);
      toast.error('Sign-in could not begin', {
        description: 'Please retry or contact your administrator.',
      });
    }
  };

  return (
    <Card className="w-full" padding="lg" variant="elevated">
      <div className="flex items-start justify-between gap-6">
        <IconBadge size="lg" variant="primary">
          <LogIn size={24} />
        </IconBadge>
        <div className="flex items-center gap-2 text-text-secondary">
          <LockKeyhole size={13} />
          <span className="app-secondary-copy text-[11px]">Secure SSO</span>
        </div>
      </div>
      <div className="mt-10">
        <p className="app-section-label text-desert">Pompeii administration</p>
        <h1 className="mt-3 text-3xl font-medium tracking-refined">
          Welcome back.
        </h1>
        <p className="app-secondary-copy mt-3 max-w-sm text-sm leading-6 text-text-secondary">
          Sign in with your organization account to continue to the
          authorization control center.
        </p>
      </div>
      <Button
        className="mt-8 justify-center"
        disabled={signingIn}
        fullWidth
        loading={signingIn}
        onClick={() => void signIn()}
        size="lg"
      >
        <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.107-1.453-.267-2.133H12.48z"
          />
        </svg>
        Continue with Google
      </Button>
      <p className="app-secondary-copy mt-5 text-center text-xs leading-5 text-text-secondary">
        Access is governed by your organization’s identity and authorization
        policies.
      </p>
    </Card>
  );
}
