import { Check, Edit2, Plus, Trash2, Users, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Method, sendRequest } from '~/clients/api';
import {
  AlertDialog,
  Button,
  Card,
  DataTable,
  Empty,
  ErrorState,
  Field,
  IconButton,
  Input,
  PageHeader,
  SearchInput,
  Select,
  Sheet,
  SkeletonTable,
  StatusBadge,
  toast,
  type ColumnDef,
} from '~/lib/bleecker';
import { isSuperAdmin } from '~/state/selectors/auth';

type UserData = {
  id: number;
  name: string;
  email: string;
  last_name?: string;
};

type Membership = {
  id: number;
  teams_id: number;
  users_id: number;
  role: number;
  user?: UserData;
};

type Team = {
  id: number;
  name: string;
  slug: string;
  memberships?: Membership[];
};

const ROLE_OPTIONS = [
  { label: 'Owner · administrator', value: '1' },
  { label: 'Maintainer · editor', value: '2' },
  { label: 'Member · viewer', value: '3' },
];

function memberName(membership: Membership) {
  if (!membership.user) return `User ${membership.users_id}`;
  return `${membership.user.name} ${membership.user.last_name ?? ''}`.trim();
}

export default function TeamsPage() {
  const superAdmin = useSelector(isSuperAdmin);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMemberships, setTeamMemberships] = useState<Membership[]>([]);
  const [membershipsLoading, setMembershipsLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [newRole, setNewRole] = useState('1');
  const [savingMember, setSavingMember] = useState(false);
  const [editingMembershipId, setEditingMembershipId] = useState<number | null>(null);
  const [editRole, setEditRole] = useState('1');
  const [pendingRemoval, setPendingRemoval] = useState<Membership | null>(null);
  const sheetTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!sheetOpen && selectedTeam) sheetTriggerRef.current?.focus();
  }, [sheetOpen, selectedTeam]);

  const checkTeamHasOwner = (excludeMembershipId?: number) =>
    teamMemberships.some((membership) => membership.role === 1 && membership.id !== excludeMembershipId);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [teamsData, usersData] = await Promise.all([
        sendRequest(Method.GET, 'authorization/teams'),
        sendRequest(Method.GET, 'authorization/users'),
      ]);
      setTeams(Array.isArray(teamsData) ? teamsData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (cause: any) {
      setError(cause?.response?.status === 403 ? 'You do not have permission to view the team directory.' : 'Pompeii could not load teams.');
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
    return teams.filter((team) => [team.name, team.slug].some((value) => value.toLowerCase().includes(query)));
  }, [search, teams]);

  const loadMembershipsForTeam = async (teamId: number) => {
    setMembershipsLoading(true);
    try {
      const result = await sendRequest(Method.GET, `authorization/teams/${teamId}/memberships`);
      setTeamMemberships(Array.isArray(result) ? result : []);
    } catch {
      setTeamMemberships([]);
      toast.error('Could not load team members');
    } finally {
      setMembershipsLoading(false);
    }
  };

  const openTeamSheet = (team: Team) => {
    setSelectedTeam(team);
    setSheetOpen(true);
    setSelectedUserId('');
    setNewRole('1');
    setEditingMembershipId(null);
    void loadMembershipsForTeam(team.id);
  };

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

  const handleAddMember = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedTeam || !selectedUserId) return;
    setSavingMember(true);
    try {
      await sendRequest(Method.POST, 'authorization/memberships', {
        teams_id: selectedTeam.id,
        users_id: Number(selectedUserId),
        role: Number(newRole),
      });
      await loadMembershipsForTeam(selectedTeam.id);
      setSelectedUserId('');
      setNewRole('1');
      toast.success('Member added');
    } catch {
      toast.error('Member could not be added');
    } finally {
      setSavingMember(false);
    }
  };

  const removeMember = async () => {
    if (!selectedTeam || !pendingRemoval) return;
    setSavingMember(true);
    try {
      await sendRequest(Method.DELETE, `authorization/memberships/${pendingRemoval.id}`);
      await loadMembershipsForTeam(selectedTeam.id);
      setPendingRemoval(null);
      toast.success('Member removed');
    } catch {
      toast.error('Member could not be removed');
    } finally {
      setSavingMember(false);
    }
  };

  const handleUpdateMember = async (membershipId: number) => {
    if (!selectedTeam) return;
    setSavingMember(true);
    try {
      await sendRequest(Method.PATCH, `authorization/memberships/${membershipId}`, { role: Number(editRole) });
      await loadMembershipsForTeam(selectedTeam.id);
      setEditingMembershipId(null);
      toast.success('Membership role updated');
    } catch {
      toast.error('Membership role could not be updated');
    } finally {
      setSavingMember(false);
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
    { key: 'id', header: 'Reference', sortable: true, cell: (team) => <span className="app-secondary-copy text-xs text-text-secondary tabular-nums">TM-{team.id}</span> },
    { key: 'status', header: 'Status', sortable: false, cell: () => <StatusBadge label="Active" variant="live" /> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      sortable: false,
      cell: (team) => (
        <Button
          onClick={(event) => {
            sheetTriggerRef.current = event.currentTarget;
            openTeamSheet(team);
          }}
          size="sm"
          variant="secondary"
        >
          <Users size={14} /> Members
        </Button>
      ),
    },
  ];

  return (
    <div className="app-page space-y-8">
      <PageHeader
        className="app-page-header [&_h1]:font-medium"
        title="Teams"
        description="Membership boundaries and the operating scopes they define."
      />

      {superAdmin && (
        <Card className="grid gap-6 md:grid-cols-[0.72fr_1.28fr] md:items-end" padding="lg" variant="outlined">
          <div>
            <p className="app-section-label text-desert">Organization</p>
            <h2 className="mt-2 text-xl font-medium">Create a team</h2>
            <p className="app-secondary-copy mt-2 text-sm leading-6 text-text-secondary">Establish a new scope before assigning members or applications.</p>
          </div>
          <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={createTeam}>
            <Field className="flex-1" label="Team name" required><Input autoComplete="off" required value={name} onChange={(event) => setName(event.target.value)} /></Field>
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

      <Sheet
        description={selectedTeam ? `Legacy memberships for ${selectedTeam.name}. Configurable role scope is managed in Governance.` : ''}
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        side="right"
        title="Manage team members"
      >
        {selectedTeam && (
          <div className="space-y-8">
            {superAdmin && (
              <form className="space-y-4" onSubmit={handleAddMember}>
                <div>
                  <p className="app-section-label text-desert">New membership</p>
                  <h3 className="mt-2 text-lg font-medium">Add a person</h3>
                </div>
                <Field label="Person" required>
                  <Select
                    aria-label="Person"
                    onChange={setSelectedUserId}
                    options={users
                      .filter((user) => !teamMemberships.some((membership) => membership.users_id === user.id))
                      .map((user) => ({ label: `${user.name} ${user.last_name ?? ''} · ${user.email}`.trim(), value: String(user.id) }))}
                    placeholder="Choose person"
                    value={selectedUserId}
                  />
                </Field>
                <Field label="Membership role" description="Legacy feature metadata only. Assign authorization roles in Governance." required>
                  <Select aria-label="Membership role" onChange={setNewRole} options={checkTeamHasOwner() ? ROLE_OPTIONS.filter((role) => role.value !== '1') : ROLE_OPTIONS} value={newRole} />
                </Field>
                <Button disabled={!selectedUserId || savingMember} fullWidth loading={savingMember} type="submit"><Plus size={15} /> Add member</Button>
              </form>
            )}

            <div className="border-t border-sand/20 pt-6 dark:border-white/[0.08]">
              <p className="app-section-label">Current members</p>
              {membershipsLoading ? (
                <div className="mt-4" aria-busy="true"><SkeletonTable rows={4} columns={2} /></div>
              ) : teamMemberships.length ? (
                <ul className="mt-4 divide-y divide-sand/20 border-y border-sand/20 dark:divide-white/[0.08] dark:border-white/[0.08]">
                  {teamMemberships.map((membership) => {
                    const roleLabel = ROLE_OPTIONS.find((role) => role.value === String(membership.role))?.label ?? `Custom ${membership.role}`;
                    const isEditing = editingMembershipId === membership.id;
                    return (
                      <li className="flex min-w-0 items-center gap-3 py-4" key={membership.id}>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{memberName(membership)}</p>
                          <p className="app-secondary-copy mt-0.5 truncate text-xs text-text-secondary">{membership.user?.email || 'Email unavailable'}</p>
                          {isEditing ? (
                            <div className="mt-2"><Select aria-label={`Role for ${memberName(membership)}`} onChange={setEditRole} options={checkTeamHasOwner(membership.id) ? ROLE_OPTIONS.filter((role) => role.value !== '1') : ROLE_OPTIONS} size="sm" value={editRole} /></div>
                          ) : (
                            <p className="app-secondary-copy mt-1 text-xs text-text-secondary">{roleLabel}</p>
                          )}
                        </div>
                        {superAdmin && (
                          <div className="flex items-center gap-1">
                            {isEditing ? (
                              <>
                                <IconButton aria-label={`Save role for ${memberName(membership)}`} disabled={savingMember} onClick={() => void handleUpdateMember(membership.id)} size="sm" variant="ghost"><Check size={15} className="text-sea" /></IconButton>
                                <IconButton aria-label="Cancel role edit" disabled={savingMember} onClick={() => setEditingMembershipId(null)} size="sm" variant="ghost"><X size={15} /></IconButton>
                              </>
                            ) : (
                              <>
                                <IconButton aria-label={`Edit role for ${memberName(membership)}`} disabled={savingMember} onClick={() => { setEditRole(String(membership.role)); setEditingMembershipId(membership.id); }} size="sm" variant="ghost"><Edit2 size={14} /></IconButton>
                                <IconButton aria-label={`Remove ${memberName(membership)} from team`} disabled={savingMember} onClick={() => setPendingRemoval(membership)} size="sm" variant="ghost"><Trash2 size={14} className="text-terracotta" /></IconButton>
                              </>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <Empty className="mt-4 py-10" title="No members" description="No one is assigned to this team yet." />
              )}
            </div>
          </div>
        )}
      </Sheet>

      <AlertDialog
        confirmLabel="Remove member"
        confirmLoading={savingMember}
        description={pendingRemoval && selectedTeam ? `${memberName(pendingRemoval)} will lose membership in ${selectedTeam.name}.` : ''}
        isOpen={Boolean(pendingRemoval)}
        onCancel={() => setPendingRemoval(null)}
        onConfirm={() => void removeMember()}
        title="Remove team member?"
        variant="destructive"
      />
    </div>
  );
}
