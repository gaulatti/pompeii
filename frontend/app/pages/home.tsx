import type { Route } from './+types/home';
import { ArrowRight, AppWindow, ShieldCheck, Users, UsersRound } from 'lucide-react';
import { Button, Card, PageHeader, StatusBadge } from '~/lib/bleecker';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'pompeii' },
    { name: 'description', content: 'Pompeii authorization dashboard' },
  ];
}

export default function Home() {
  const areas = [
    {
      title: 'People',
      description: 'Review identities, account status, and team access.',
      href: '/users',
      label: 'View users',
      icon: <Users size={19} />,
    },
    {
      title: 'Teams',
      description: 'Organize memberships and the scopes they govern.',
      href: '/teams',
      label: 'View teams',
      icon: <UsersRound size={19} />,
    },
    {
      title: 'Applications',
      description: 'Manage feature defaults and individual overrides.',
      href: '/applications',
      label: 'View applications',
      icon: <AppWindow size={19} />,
    },
  ];

  return (
    <div className="app-page space-y-12">
      <PageHeader
        className="app-page-header [&_h1]:font-medium"
        title="Authorization, without ambiguity."
        description="A precise view of people, teams, applications, and the policies connecting them."
        actions={<StatusBadge label="Workspace ready" variant="live" description="Account and team context loaded" />}
      />

      <section aria-labelledby="workspace-areas-title">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="app-section-label text-desert">Control center</p>
            <h2 id="workspace-areas-title" className="mt-2 text-xl font-medium">Workspace areas</h2>
          </div>
          <p className="app-secondary-copy max-w-md text-sm leading-6 text-text-secondary">
            Administrative changes are validated and audited by Pompeii.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {areas.map((area, index) => (
            <Card key={area.title} className="flex min-h-56 flex-col" padding="lg" variant={index === 0 ? 'elevated' : 'surface'}>
              <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-ui)] border border-sand/25 bg-light-sand/45 text-sea dark:border-white/[0.09] dark:bg-white/[0.04] dark:text-accent-blue">
                {area.icon}
              </div>
              <h3 className="mt-6 text-xl font-medium">{area.title}</h3>
              <p className="app-secondary-copy mt-2 flex-1 text-sm leading-6 text-text-secondary">{area.description}</p>
              <Button as="a" className="mt-6 self-start" href={area.href} variant="link">
                {area.label} <ArrowRight size={14} />
              </Button>
            </Card>
          ))}
        </div>
      </section>

      <Card className="grid gap-7 md:grid-cols-[1.25fr_0.75fr] md:items-center" padding="lg" variant="outlined">
        <div>
          <div className="flex items-center gap-2 text-desert">
            <ShieldCheck size={15} />
            <p className="app-section-label text-inherit">Governance & trust</p>
          </div>
          <h2 className="mt-3 text-2xl font-medium tracking-refined">Roles, scopes, and every sensitive action.</h2>
          <p className="app-secondary-copy mt-3 max-w-2xl text-sm leading-6 text-text-secondary">
            Configure role permissions, assign access globally or by team, and review the administrative audit trail.
          </p>
        </div>
        <div className="flex md:justify-end">
          <Button as="a" href="/governance">
            Open governance <ArrowRight size={14} />
          </Button>
        </div>
      </Card>
    </div>
  );
}
