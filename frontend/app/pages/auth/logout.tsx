import { useEffect, useState } from 'react';
import { Navigate } from 'react-router';
import { useLogout } from '../../hooks/useAuth';
import { Button, ErrorState, LoadingSpinner } from '~/lib/bleecker';

export default function Logout() {
  const { logout } = useLogout();
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    void logout()
      .then(() => { if (active) setComplete(true); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, []);

  if (complete) return <Navigate to="/login" replace />;

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-5">
      <h1 className="sr-only">{error ? 'Sign-out was interrupted' : 'Signing out'}</h1>
      {error ? (
        <ErrorState title="Sign-out was interrupted" description="Your session could not be closed cleanly." icon={null} />
      ) : (
        <div className="flex flex-col items-center gap-4" aria-busy="true" role="status">
          <LoadingSpinner size="lg" />
          <p className="app-secondary-copy text-sm text-text-secondary">Closing your session…</p>
        </div>
      )}
      {error && <Button as="a" className="ml-4" href="/">Return to dashboard</Button>}
    </main>
  );
}
