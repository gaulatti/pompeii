import { fetchAuthSession, signOut } from 'aws-amplify/auth';

export type AppSession = {
  userSub?: string;
  token?: string;
  payload?: Record<string, string | undefined>;
};

let testSession: Promise<AppSession> | undefined;

export function isTestAuth(): boolean {
  return import.meta.env.VITE_AUTH_MODE === 'test';
}

export async function getAppSession(): Promise<AppSession> {
  if (isTestAuth()) {
    testSession ??= fetch('http://localhost:3187/__test/session')
      .then(async (response) => {
        if (!response.ok) throw new Error(`Test session failed (${response.status})`);
        return response.json();
      })
      .then(({ accessToken, user }) => ({
        userSub: user.sub,
        token: accessToken,
        payload: user,
      }));
    return testSession;
  }
  const session = await fetchAuthSession();
  return {
    userSub: session.userSub,
    token: session.tokens?.idToken?.toString(),
    payload: session.tokens?.idToken?.payload as Record<string, string | undefined> | undefined,
  };
}

export async function clearAppSession(): Promise<void> {
  if (isTestAuth()) {
    testSession = undefined;
    return;
  }
  await signOut();
}
