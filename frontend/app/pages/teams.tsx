import { Plus, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
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
  SkeletonTable,
  StatusBadge,
  toast,
  type ColumnDef,
} from '~/lib/bleecker';
import { isSuperAdmin } from '~/state/selectors/auth';

type Team = { id: number; name: string; slug: string };

export default function TeamsPage() {
  const superAdmin = useSelector(isSuperAdmin);
  const [teams, setTeams] = useState<Team[]>([]);
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await sendRequest(Method.GET, 'authorization/teams');
      setTeams(Array.isArray(result) ? result : []);
    } catch (cause: any) {
      setError(
        cause?.response?.status === 403
          ? 'You do not have permission to view the team directory.'
          : 'Pompeii could not load teams.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredTeams = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return teams;
    return teams.filter((team) =>
      [team.name, team.slug].some((value) => value.toLowerCase().includes(query)),
    );
  }, [search, teams]);

  const createTeam = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await sendRequest(Method.POST, 'authorization/teams', { name: name.trim() });
      setName('');
      await loadData();
      toast.success('Team created');
    } catch {
      toast.error('Team could not be created', { description: 'Check that the name is unique.' });
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnDef<Team>[] = [
    {
      key: 'name',
      header: 'Team',
      sortable: true,
      cell: (team) => (
        <div className="min-w-52">
          <p className="font-medium">{team.name}</p>
          <p className="app-secondary-copy mt-0.5 text-xs text-text-secondary">{team.slug}</p>
        </div>
      ),
    },
    {
      key: 'id',
      header: 'Reference',
      sortable: true,
      cell: (team) => <span className="app-secondary-copy text-xs text-text-secondary tabular-nums">TM-{team.id}</span>,
    },
    { key: 'status', header: 'Status', sortable: false, cell: () => <StatusBadge label="Active" variant="live" /> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      sortable: false,
      cell: () => (
        <Button as="a" href="/governance" size="sm" variant="secondary">
          <ShieldCheck size={14} /> Manage access
        </Button>
      ),
    },
  ];

  return (
    <div className="app-page space-y-8">
      <PageHeader
        actions={<Button as="a" href="/governance" variant="secondary"><ShieldCheck size={15} /> Manage RBAC roles</Button>}
        className="app-page-header [&_h1]:font-medium"
        title="Teams"
        description="Authorization scopes and the RBAC assignments attached to them."
      />

      {superAdmin && (
        <Card className="grid gap-6 md:grid-cols-[0.72fr_1.28fr] md:items-end" padding="lg" variant="outlined">
          <div>
            <p className="app-section-label text-desert">Organization</p>
            <h2 className="mt-2 text-xl font-medium">Create a team</h2>
            <p className="app-secondary-copy mt-2 text-sm leading-6 text-text-secondary">Establish a scope, then assign configurable roles in Governance.</p>
          </div>
          <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={createTeam}>
            <Field className="flex-1" label="Team name" required>
              <Input autoComplete="off" required value={name} onChange={(event) => setName(event.target.value)} />
            </Field>
            <Button disabled={saving || !name.trim()} loading={saving} type="submit"><Plus size={15} /> Create team</Button>
          </form>
        </Card>
      )}

      <section aria-labelledby="team-directory-title" className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="app-section-label text-desert">Operating scopes</p>
            <h2 id="team-directory-title" className="mt-2 text-xl font-medium">{filteredTeams.length} {filteredTeams.length === 1 ? 'team' : 'teams'}</h2>
          </div>
          <SearchInput aria-label="Search teams" className="w-full sm:w-72" onChange={(event) => setSearch(event.target.value)} onClear={() => setSearch('')} placeholder="Search team or slug" value={search} />
        </div>

        {loading ? (
          <div aria-busy="true"><SkeletonTable rows={6} columns={4} /></div>
        ) : error ? (
          <ErrorState title="Team directory unavailable" description={error} onRetry={() => void loadData()} />
        ) : filteredTeams.length === 0 ? (
          <Empty
            title={search ? 'No matching teams' : 'No teams found'}
            description={search ? 'Clear or refine your search.' : 'Create the first team to establish an authorization scope.'}
            action={search ? <Button onClick={() => setSearch('')} variant="secondary">Clear search</Button> : undefined}
          />
        ) : (
          <DataTable caption="Authorization teams" columns={columns} data={filteredTeams} getRowKey={(team) => String(team.id)} />
        )}
      </section>
    </div>
  );
}
