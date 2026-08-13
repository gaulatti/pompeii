import { AppWindow, Home, LogOut, ShieldCheck, Users, UsersRound } from 'lucide-react';
import { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, Navigate, Outlet, useLocation } from 'react-router';
import { OverlaySpinner } from '~/components/spinners';
import { ThemeControl } from '~/components/theme-control';
import { useAuthStatus, useLogout } from '~/hooks/useAuth';
import {
  AdminShell,
  BrandLockup,
  Button,
  Card,
  ErrorState,
  Header,
  Select,
  Sidebar,
  type NavItem,
  type SidebarItem,
} from '~/lib/bleecker';
import { setKickoff } from '~/state/dispatchers/lifecycle';
import { getKickoffError, getKickoffReady } from '~/state/selectors/lifecycle';
import { getCurrentTeam, getTeams } from '~/state/selectors/teams';
import { setCurrentTeam } from '~/state/dispatchers/teams';

function renderAppLink({ children, className, item, onClick }: any) {
  if (item.external) {
    return (
      <a
        href={item.href}
        className={`${className ?? ''} ${item.active ? 'text-sea dark:text-accent-blue' : ''}`}
        onClick={onClick}
        aria-current={item.active ? 'page' : undefined}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      aria-current={item.active ? 'page' : undefined}
      to={item.href}
      className={`${className ?? ''} ${item.active ? 'text-sea dark:text-accent-blue' : ''}`}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}

const PrivateLayout = () => {
  const { isAuthenticated, isLoaded } = useAuthStatus();
  const { logout } = useLogout();
  const isKickoffReady = useSelector(getKickoffReady);
  const kickoffError = useSelector(getKickoffError);
  const teams = useSelector(getTeams);
  const currentTeam = useSelector(getCurrentTeam);
  const dispatch = useDispatch();
  const location = useLocation();

  const teamOptions = useMemo(
    () =>
      teams.map((team) => ({
        label: team.name,
        value: String(team.id),
      })),
    [teams],
  );

  const navigation: (NavItem & { active: boolean })[] = useMemo(
    () => [
      { href: '/', label: 'Home', active: location.pathname === '/' },
      { href: '/users', label: 'Users', active: location.pathname.startsWith('/users') },
      { href: '/teams', label: 'Teams', active: location.pathname.startsWith('/teams') },
      { href: '/applications', label: 'Applications', active: location.pathname.startsWith('/applications') },
      { href: '/governance', label: 'Governance', active: location.pathname.startsWith('/governance') },
    ],
    [location.pathname],
  );

  const sidebarItems: SidebarItem[] = useMemo(
    () => [
      { id: 'home', href: '/', label: 'Overview', icon: <Home size={17} />, active: location.pathname === '/' },
      { id: 'users', href: '/users', label: 'Users', icon: <Users size={17} />, active: location.pathname.startsWith('/users') },
      { id: 'teams', href: '/teams', label: 'Teams', icon: <UsersRound size={17} />, active: location.pathname.startsWith('/teams') },
      { id: 'applications', href: '/applications', label: 'Applications', icon: <AppWindow size={17} />, active: location.pathname.startsWith('/applications') },
      { id: 'governance', href: '/governance', label: 'Governance', icon: <ShieldCheck size={17} />, active: location.pathname.startsWith('/governance') },
    ],
    [location.pathname],
  );

  const renderTeamSelector = (className?: string) => (
    <Select
      aria-label="Current team"
      className={className}
      name="current-team"
      value={currentTeam ? String(currentTeam.id) : ''}
      onChange={(value) => {
        if (!value) return;
        dispatch(setCurrentTeam(Number(value)));
      }}
      options={teamOptions}
      placeholder="Choose team"
      size="sm"
      startIcon={<Users size={15} strokeWidth={1.5} />}
    />
  );

  const operationalControls = (
    <div className="flex min-w-0 items-center gap-2">
      <div className="min-w-0 flex-1">{renderTeamSelector('w-full')}</div>
      <ThemeControl />
      <Button aria-label="Log out" onClick={() => void logout()} size="sm" variant="secondary">
        <LogOut size={14} />
        <span className="hidden sm:inline">Log out</span>
      </Button>
    </div>
  );

  if (isAuthenticated && isLoaded && isKickoffReady) {
    return (
      <AdminShell
        className="h-screen"
        header={
          <Header
            className="lg:hidden"
            brand={{ href: '/', name: 'pompeii' }}
            navigation={navigation}
            renderLink={renderAppLink}
            mobileActions={operationalControls}
            actions={operationalControls}
          />
        }
        sidebar={
          <Sidebar
            className="hidden shrink-0 lg:flex"
            header={
              <div className="px-1">
                <BrandLockup href="/" name="pompeii" renderLink={renderAppLink} />
                <p className="app-secondary-copy mt-2 text-[11px] leading-5 text-text-secondary">
                  Authorization control center
                </p>
              </div>
            }
            items={sidebarItems}
            renderLink={renderAppLink}
            footer={
              <div className="space-y-4 px-1">
                <div>
                  <p className="app-section-label">Active scope</p>
                  <div className="mt-2">{renderTeamSelector('w-full')}</div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <ThemeControl />
                  <Button onClick={() => void logout()} size="sm" variant="ghost">
                    <LogOut size={14} /> Log out
                  </Button>
                </div>
              </div>
            }
          />
        }
        contentClassName="bg-light-sand/25 pt-[72px] dark:bg-background lg:pt-0"
        footer={
          <p className="app-secondary-copy text-xs text-text-secondary">
            Pompeii · authorization decisions remain enforced by the service.
          </p>
        }
      >
        <Outlet />
      </AdminShell>
    );
  }

  if (isAuthenticated && isLoaded && kickoffError) {
    const inactive = kickoffError.status === 401 || kickoffError.message.toLowerCase().includes('inactive');
    return (
      <main className="flex min-h-screen items-center justify-center bg-light-sand/30 px-5 py-12 dark:bg-background">
        <Card className="w-full max-w-xl" padding="lg" variant="elevated">
          <h1 className="sr-only">{inactive ? 'Account access is inactive' : 'Workspace unavailable'}</h1>
          <ErrorState
            title={inactive ? 'Account access is inactive' : 'Workspace could not be prepared'}
            description={inactive ? 'Your identity is valid, but Pompeii has disabled authorization for this account. Contact an administrator to restore access.' : kickoffError.message}
          />
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {!inactive && <Button onClick={() => dispatch(setKickoff())} variant="secondary">Retry</Button>}
            <Button onClick={() => void logout()}>{inactive ? 'Return to sign in' : 'Sign out'}</Button>
          </div>
        </Card>
      </main>
    );
  }

  if (isLoaded && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <OverlaySpinner />;
};

export default PrivateLayout;
