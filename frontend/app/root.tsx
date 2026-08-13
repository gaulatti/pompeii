import { Amplify, type ResourcesConfig } from 'aws-amplify';
import { useEffect, useState, type JSX } from 'react';
import { Provider } from 'react-redux';
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from 'react-router';
import { AppThemeProvider } from '~/components/theme-control';
import {
  Button,
  Card,
  ErrorState,
  LoadingSpinner,
  Sonner,
} from '~/lib/bleecker';
import type { Route } from './+types/root';
import './app.css';
import { getStore } from './state';
import {
  addSsoHandoff,
  takeReturnTo,
  validateReturnTo,
} from './auth/return-to';
import { useAuthStatus } from './hooks/useAuth';

/**
 * This is important. It enables the OAuth listener for the Auth module.
 *
 * For some reason this is not required in local development, but it is
 * required in production.
 */
import 'aws-amplify/auth/enable-oauth-listener';

/**
 * A function that returns an empty array of links.
 * This function is used to define the links for the route.
 *
 * @returns {Array} An empty array of links.
 */
export const links: Route.LinksFunction = () => [];

/**
 * Configuration for the application.
 *
 * Why this way? Because when running in prod, using import.meta.env
 * directly in the object does not work. Don't ask me why, but only
 * this way works.
 */
const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;
const userPoolClientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
const userPoolDomain =
  import.meta.env.VITE_USER_POOL_DOMAIN || import.meta.env.VITE_COGNITO_DOMAIN;
const fqdn = import.meta.env.VITE_FQDN;

/**
 * Configuration for the AWS Amplify library.
 */
const config: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId,
      userPoolClientId,
      loginWith: {
        oauth: {
          domain: userPoolDomain,
          scopes: ['email', 'openid', 'profile'],
          redirectSignIn: [fqdn],
          redirectSignOut: [`${fqdn}/logout`],
          responseType: 'code',
        },
      },
    },
  },
};
Amplify.configure(config);

/**
 * Creates the Redux store.
 */
const { store } = getStore();

const themeBootScript = `try{var t=localStorage.getItem('theme')==='light'?'light':'dark';document.documentElement.classList.toggle('dark',t==='dark');document.documentElement.style.colorScheme=t}catch(e){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark'}`;

function ClientSonner(): JSX.Element | null {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return mounted ? <Sonner position="bottom-right" /> : null;
}

function LoginReturnBridge(): null {
  const { isAuthenticated, isLoaded } = useAuthStatus();

  useEffect(() => {
    if (!isLoaded || !isAuthenticated) return;
    const requestedReturnTo = validateReturnTo(
      new URLSearchParams(window.location.search).get('returnTo'),
    );
    const storedReturnTo = takeReturnTo();
    const returnTo = requestedReturnTo ?? storedReturnTo;
    if (returnTo) {
      window.location.replace(addSsoHandoff(returnTo));
    } else if (window.location.pathname === '/login') {
      window.location.replace('/');
    }
  }, [isAuthenticated, isLoaded]);

  return null;
}

/**
 * Layout component that sets up the HTML structure and provides theming and state management.
 *
 * @param {Object} props - The properties object.
 * @param {React.ReactNode} props.children - The child components to be rendered within the layout.
 *
 * @returns {JSX.Element} The rendered layout component.
 *
 * @remarks
 * This component uses the `useDarkMode` hook to determine the current theme mode (dark or light).
 * It wraps the children components with a `Provider` for state management and a `Theme` component for theming.
 * Additionally, it includes meta tags, links, and scripts necessary for the application.
 */
export function Layout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en" className="dark h-full" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="anthem"
          content="https://www.youtube.com/watch?v=F90Cw4l-8NY"
        />
        <link rel="icon" href="/favicon.png" />
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <Meta />
        <Links />
      </head>
      <body className="min-h-full antialiased">
        <Provider store={store}>
          <AppThemeProvider>
            <LoginReturnBridge />
            {children}
            <ClientSonner />
            <ScrollRestoration />
            <Scripts />
          </AppThemeProvider>
        </Provider>
      </body>
    </html>
  );
}

export function HydrateFallback(): JSX.Element {
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-background"
      aria-busy="true"
    >
      <div
        className="flex flex-col items-center gap-4 text-text-secondary"
        aria-live="polite"
        role="status"
      >
        <LoadingSpinner size="lg" />
        <p className="app-secondary-copy text-sm">
          Preparing your authorization workspace…
        </p>
      </div>
    </main>
  );
}

/**
 * The main application component that serves as the root of the application.
 * It renders the `Outlet` component, which is a placeholder for nested routes.
 *
 * @returns {JSX.Element} The rendered `Outlet` component.
 */
export default function App(): JSX.Element {
  return <Outlet />;
}

/**
 * ErrorBoundary component to handle and display errors in the application.
 *
 * @param {Route.ErrorBoundaryProps} props - The properties passed to the ErrorBoundary component.
 * @param {Error} props.error - The error object that was thrown.
 *
 * @returns {JSX.Element} The rendered error boundary component.
 *
 * This component displays a user-friendly error message and, in development mode,
 * includes the error stack trace for debugging purposes.
 *
 * - If the error is a route error response with a status of 404, it displays a "404" message
 *   and a "The requested page could not be found." details.
 * - For other route error responses, it displays a generic "Error" message and the status text.
 * - In development mode, if the error is an instance of Error, it displays the error message
 *   and stack trace.
 */
export function ErrorBoundary({
  error,
}: Route.ErrorBoundaryProps): JSX.Element {
  let message = 'Oops!';
  let details = 'An unexpected error occurred.';
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : 'Error';
    details =
      error.status === 404
        ? 'The requested page could not be found.'
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-light-sand/30 px-5 py-12 dark:bg-deep-sea">
      <Card className="w-full max-w-2xl" padding="lg" variant="elevated">
        <h1 className="sr-only">
          {error && isRouteErrorResponse(error) && error.status === 404
            ? 'Page not found'
            : 'Application error'}
        </h1>
        <ErrorState title={message} description={details} />
        <div className="mt-6 flex justify-center">
          <Button as="a" href="/" variant="secondary">
            Return to dashboard
          </Button>
        </div>
        {stack && (
          <details className="mt-8 border-t border-sand/20 pt-5 dark:border-white/[0.08]">
            <summary className="cursor-pointer text-sm font-medium">
              Development details
            </summary>
            <pre className="app-secondary-copy mt-3 max-h-64 w-full overflow-auto rounded-[var(--radius-ui)] bg-light-sand/40 p-4 text-xs dark:bg-black/15">
              <code>{stack}</code>
            </pre>
          </details>
        )}
      </Card>
    </main>
  );
}
