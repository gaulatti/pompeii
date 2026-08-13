import { ArrowRight, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { Method, sendRequest } from '~/clients/api';
import {
  Button,
  Card,
  DataTable,
  Empty,
  ErrorState,
  Field,
  Input,
  PageHeader,
  SearchInput,
  Select,
  SkeletonTable,
  StatusBadge,
  toast,
  type ColumnDef,
} from '~/lib/bleecker';
import { isSuperAdmin } from '~/state/selectors/auth';
import { getCurrentTeam } from '~/state/selectors/teams';

type Application = { id: number; name: string; slug: string; team_id: number };
type Team = { id: number; name: string };

export default function ApplicationsPage() {
  const superAdmin = useSelector(isSuperAdmin);
  const currentTeam = useSelector(getCurrentTeam);
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [appName, setAppName] = useState('');
  const [appTeamId, setAppTeamId] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = currentTeam ? { team_id: currentTeam.id } : undefined;
      const [appsData, teamsData] = await Promise.all([
        sendRequest(Method.GET, 'authorization/applications', params),
        sendRequest(Method.GET, 'authorization/teams'),
      ]);
      setApplications(Array.isArray(appsData) ? appsData : []);
      setTeams(Array.isArray(teamsData) ? teamsData : []);
      setAppTeamId((current) => current || (currentTeam ? String(currentTeam.id) : ''));
    } catch (cause: any) {
      setError(cause?.response?.status === 403 ? 'You do not have permission to view applications in this scope.' : 'Pompeii could not load applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [currentTeam?.id]);

  const filteredApplications = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return applications;
    return applications.filter((app) => {
      const team = teams.find((candidate) => candidate.id === app.team_id);
      return [app.name, app.slug, team?.name ?? ''].some((value) => value.toLowerCase().includes(query));
    });
  }, [applications, search, teams]);

  const createApp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!appName.trim() || !appTeamId) return;
    setSaving(true);
    try {
      await sendRequest(Method.POST, 'authorization/applications', {
        name: appName.trim(),
        team_id: Number(appTeamId),
      });
      setAppName('');
      await loadData();
      toast.success('Application registered');
    } catch {
      toast.error('Application could not be registered');
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnDef<Application>[] = [
    {
      key: 'name',
      header: 'Application',
      sortable: true,
      cell: (app) => (
        <div className="min-w-52">
          <p className="font-medium">{app.name}</p>
          <p className="app-secondary-copy mt-0.5 text-xs text-text-secondary">{app.slug}</p>
        </div>
      ),
    },
    {
      key: 'team_id',
      header: 'Team scope',
      sortable: true,
      cell: (app) => teams.find((team) => team.id === app.team_id)?.name ?? `Team ${app.team_id}`,
    },
    { key: 'status', header: 'Status', sortable: false, cell: () => <StatusBadge label="Configured" variant="live" /> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      sortable: false,
      cell: (app) => <Button onClick={() => navigate(`/applications/${app.id}`)} size="sm" variant="secondary">Open permissions <ArrowRight size={14} /></Button>,
    },
  ];

  return (
    <div className="app-page space-y-8">
      <PageHeader
        className="app-page-header [&_h1]:font-medium"
        title="Applications"
        description={currentTeam ? `Feature policy and overrides for ${currentTeam.name}.` : 'Registered applications and their feature policy.'}
      />

      {superAdmin && (
        <Card className="grid gap-6 md:grid-cols-[0.68fr_1.32fr] md:items-end" padding="lg" variant="outlined">
          <div>
            <p className="app-section-label text-desert">Registry</p>
            <h2 className="mt-2 text-xl font-medium">Register application</h2>
            <p className="app-secondary-copy mt-2 text-sm leading-6 text-text-secondary">Create an application boundary before adding feature-level permissions.</p>
          </div>
          <form className="grid gap-3 sm:grid-cols-[0.8fr_1.2fr_auto] sm:items-end" onSubmit={createApp}>
            <Field label="Team scope" required><Select aria-label="Team scope" onChange={setAppTeamId} options={teams.map((team) => ({ label: team.name, value: String(team.id) }))} placeholder="Choose team" value={appTeamId} /></Field>
            <Field label="Application name" required><Input required value={appName} onChange={(event) => setAppName(event.target.value)} /></Field>
            <Button disabled={saving || !appName.trim() || !appTeamId} loading={saving} type="submit"><Plus size={15} /> Register</Button>
          </form>
        </Card>
      )}

      <section aria-labelledby="application-directory-title" className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="app-section-label text-desert">Feature policy</p>
            <h2 id="application-directory-title" className="mt-2 text-xl font-medium">{filteredApplications.length} {filteredApplications.length === 1 ? 'application' : 'applications'}</h2>
          </div>
          <SearchInput aria-label="Search applications" className="w-full sm:w-72" onChange={(event) => setSearch(event.target.value)} onClear={() => setSearch('')} placeholder="Search app, slug, or team" value={search} />
        </div>

        {loading ? (
          <div aria-busy="true"><SkeletonTable rows={6} columns={4} /></div>
        ) : error ? (
          <ErrorState title="Application registry unavailable" description={error} onRetry={() => void loadData()} />
        ) : filteredApplications.length === 0 ? (
          <Empty
            title={search ? 'No matching applications' : 'No applications found'}
            description={search ? 'Clear or refine your search.' : 'Register the first application to begin defining feature policy.'}
            action={search ? <Button onClick={() => setSearch('')} variant="secondary">Clear search</Button> : undefined}
          />
        ) : (
          <DataTable caption="Registered applications" columns={columns} data={filteredApplications} getRowKey={(app) => String(app.id)} />
        )}
      </section>
    </div>
  );
}
