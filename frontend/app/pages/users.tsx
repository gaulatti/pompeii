import { Check, Edit2, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Method, sendRequest } from '~/clients/api';
import {
  AlertDialog,
  Button,
  DataTable,
  Empty,
  ErrorState,
  Field,
  IconButton,
  PageHeader,
  SearchInput,
  Select,
  Sheet,
  SkeletonTable,
  StatusBadge,
  toast,
  type ColumnDef,
} from '~/lib/bleecker';
import { getCurrentTeam } from '~/state/selectors/teams';
import { isSuperAdmin } from '~/state/selectors/auth';

type Membership = {
  id: number;
  teams_id: number;
  users_id: number;
  role: number;
  team?: { id: number; name: string };
};

type UserData = {
  id: number;
  sub: string;
  name: string;
  email: string;
  last_name?: string;
  is_active?: boolean;
  last_seen_at?: string | null;
  memberships?: Membership[];
};

type Team = { id: number; name: string };

const ROLE_OPTIONS = [
  { label: 'Owner · administrator', value: '1' },
  { label: 'Maintainer · editor', value: '2' },
  { label: 'Member · viewer', value: '3' },
];

function userName(user: UserData) {
  return `${user.name ?? ''} ${user.last_name ?? ''}`.trim() || user.email;
}

export default function UsersPage() {
  const superAdmin = useSelector(isSuperAdmin);
  const currentTeam = useSelector(getCurrentTeam);
  const [users, setUsers] = useState<UserData[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [newRole, setNewRole] = useState('1');
  const [savingAction, setSavingAction] = useState(false);
  const [editingMembershipId, setEditingMembershipId] = useState<number | null>(null);
  const [editRole, setEditRole] = useState('1');
  const [pendingRemoval, setPendingRemoval] = useState<Membership | null>(null);
  const sheetTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!sheetOpen && selectedUser) sheetTriggerRef.current?.focus();
  }, [sheetOpen, selectedUser]);

  const checkTeamHasOwner = (teamId: number, excludeUserId?: number) =>
    users.some((user) =>
      user.id !== excludeUserId && user.memberships?.some((membership) => membership.teams_id === teamId && membership.role === 1),
    );

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const params = currentTeam ? { team_id: currentTeam.id } : undefined;
      const [usersData, teamsData] = await Promise.all([
        sendRequest(Method.GET, 'authorization/users', params),
        sendRequest(Method.GET, 'authorization/teams'),
      ]);
      const nextUsers = Array.isArray(usersData) ? usersData : [];
      setUsers(nextUsers);
      setTeams(Array.isArray(teamsData) ? teamsData : []);
      setSelectedUser((current) => current ? nextUsers.find((user) => user.id === current.id) ?? current : null);
      return nextUsers;
    } catch (cause: any) {
      setError(cause?.response?.status === 403 ? 'You do not have permission to view users in this scope.' : 'Pompeii could not load the user directory.');
      return [];
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [currentTeam?.id]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) =>
      [userName(user), user.email, user.sub].some((value) => value?.toLowerCase().includes(query)),
    );
  }, [search, users]);

  const openUserSheet = (user: UserData) => {
    setSelectedUser(user);
    setSheetOpen(true);
    setSelectedTeamId('');
    setNewRole('1');
    setEditingMembershipId(null);
  };

  const handleAddMembership = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedUser || !selectedTeamId) return;
    setSavingAction(true);
    try {
      await sendRequest(Method.POST, 'authorization/memberships', {
        users_id: selectedUser.id,
        teams_id: Number(selectedTeamId),
        role: Number(newRole),
      });
      await loadData(false);
      setSelectedTeamId('');
      setNewRole('1');
      toast.success('Team membership added');
    } catch {
      toast.error('Membership could not be added');
    } finally {
      setSavingAction(false);
    }
  };

  const removeMembership = async () => {
    if (!pendingRemoval) return;
    setSavingAction(true);
    try {
      await sendRequest(Method.DELETE, `authorization/memberships/${pendingRemoval.id}`);
      await loadData(false);
      setPendingRemoval(null);
      toast.success('Team membership removed');
    } catch {
      toast.error('Membership could not be removed');
    } finally {
      setSavingAction(false);
    }
  };

  const handleUpdateMembership = async (membershipId: number) => {
    setSavingAction(true);
    try {
      await sendRequest(Method.PATCH, `authorization/memberships/${membershipId}`, { role: Number(editRole) });
      await loadData(false);
      setEditingMembershipId(null);
      toast.success('Membership role updated');
    } catch {
      toast.error('Membership role could not be updated');
    } finally {
      setSavingAction(false);
    }
  };

  const columns: ColumnDef<UserData>[] = [
    {
      key: 'name',
      header: 'Person',
      sortable: true,
      cell: (user) => (
        <div className="min-w-52">
          <p className="font-medium">{userName(user)}</p>
          <p className="app-secondary-copy mt-0.5 text-xs text-text-secondary">{user.email}</p>
        </div>
      ),
    },
    {
      key: 'is_active',
      header: 'Account',
      sortable: true,
      cell: (user) => <StatusBadge label={user.is_active === false ? 'Inactive' : 'Active'} variant={user.is_active === false ? 'offline' : 'live'} />,
    },
    {
      key: 'memberships',
      header: 'Team access',
      sortable: false,
      cell: (user) => <span className="tabular-nums">{user.memberships?.length ?? 0} {user.memberships?.length === 1 ? 'team' : 'teams'}</span>,
    },
    {
      key: 'last_seen_at',
      header: 'Last seen',
      sortable: true,
      cell: (user) => <span className="app-secondary-copy whitespace-nowrap text-xs text-text-secondary">{user.last_seen_at ? new Date(user.last_seen_at).toLocaleString() : 'Not recorded'}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      sortable: false,
      cell: (user) => (
        <Button
          onClick={(event) => {
            sheetTriggerRef.current = event.currentTarget;
            openUserSheet(user);
          }}
          size="sm"
          variant="secondary"
        >
          Manage teams
        </Button>
      ),
    },
  ];

  return (
    <div className="app-page space-y-8">
      <PageHeader
        className="app-page-header [&_h1]:font-medium"
        title="People"
        description={currentTeam ? `Provisioned identities visible in ${currentTeam.name}.` : 'Provisioned identities and their team access.'}
        actions={<Button as="a" href="/governance" variant="secondary">Manage RBAC roles</Button>}
      />

      <section aria-labelledby="user-directory-title" className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="app-section-label text-desert">Identity directory</p>
            <h2 id="user-directory-title" className="mt-2 text-xl font-medium">{filteredUsers.length} {filteredUsers.length === 1 ? 'person' : 'people'}</h2>
          </div>
          <SearchInput
            aria-label="Search users"
            className="w-full sm:w-72"
            onChange={(event) => setSearch(event.target.value)}
            onClear={() => setSearch('')}
            placeholder="Search name, email, or subject"
            value={search}
          />
        </div>

        {loading ? (
          <div aria-busy="true"><SkeletonTable rows={7} columns={5} /></div>
        ) : error ? (
          <ErrorState title="User directory unavailable" description={error} onRetry={() => void loadData()} />
        ) : filteredUsers.length === 0 ? (
          <Empty
            title={search ? 'No matching people' : 'No users found'}
            description={search ? 'Clear or refine your search.' : 'No users are provisioned in this scope yet.'}
            action={search ? <Button onClick={() => setSearch('')} variant="secondary">Clear search</Button> : undefined}
          />
        ) : (
          <DataTable caption="Provisioned users" columns={columns} data={filteredUsers} getRowKey={(user) => String(user.id)} />
        )}
      </section>

      <Sheet
        description={selectedUser ? `Legacy team memberships for ${userName(selectedUser)}. Configurable RBAC roles are managed in Governance.` : ''}
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        side="right"
        title="Manage team access"
      >
        {selectedUser && (
          <div className="space-y-8">
            {superAdmin && (
              <form className="space-y-4" onSubmit={handleAddMembership}>
                <div>
                  <p className="app-section-label text-desert">New membership</p>
                  <h3 className="mt-2 text-lg font-medium">Add to a team</h3>
                </div>
                <Field label="Team" required>
                  <Select
                    aria-label="Team"
                    onChange={setSelectedTeamId}
                    options={teams
                      .filter((team) => !selectedUser.memberships?.some((membership) => membership.teams_id === team.id))
                      .map((team) => ({ label: team.name, value: String(team.id) }))}
                    placeholder="Choose team"
                    value={selectedTeamId}
                  />
                </Field>
                <Field label="Membership role" description="Legacy feature metadata only. Assign authorization roles in Governance." required>
                  <Select
                    aria-label="Membership role"
                    onChange={setNewRole}
                    options={selectedTeamId && checkTeamHasOwner(Number(selectedTeamId), selectedUser.id) ? ROLE_OPTIONS.filter((role) => role.value !== '1') : ROLE_OPTIONS}
                    value={newRole}
                  />
                </Field>
                <Button disabled={!selectedTeamId || savingAction} fullWidth loading={savingAction} type="submit"><Plus size={15} /> Add membership</Button>
              </form>
            )}

            <div className="border-t border-sand/20 pt-6 dark:border-white/[0.08]">
              <p className="app-section-label">Current teams</p>
              {selectedUser.memberships?.length ? (
                <ul className="mt-4 divide-y divide-sand/20 border-y border-sand/20 dark:divide-white/[0.08] dark:border-white/[0.08]">
                  {selectedUser.memberships.map((membership) => {
                    const roleLabel = ROLE_OPTIONS.find((role) => role.value === String(membership.role))?.label ?? `Custom ${membership.role}`;
                    const isEditing = editingMembershipId === membership.id;
                    return (
                      <li className="flex min-w-0 items-center gap-3 py-4" key={membership.id}>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{membership.team?.name || `Team ${membership.teams_id}`}</p>
                          {isEditing ? (
                            <div className="mt-2">
                              <Select
                                aria-label={`Role in ${membership.team?.name || 'team'}`}
                                onChange={setEditRole}
                                options={checkTeamHasOwner(membership.teams_id, selectedUser.id) ? ROLE_OPTIONS.filter((role) => role.value !== '1') : ROLE_OPTIONS}
                                size="sm"
                                value={editRole}
                              />
                            </div>
                          ) : (
                            <p className="app-secondary-copy mt-1 text-xs text-text-secondary">{roleLabel}</p>
                          )}
                        </div>
                        {superAdmin && (
                          <div className="flex items-center gap-1">
                            {isEditing ? (
                              <>
                                <IconButton aria-label="Save membership role" disabled={savingAction} onClick={() => void handleUpdateMembership(membership.id)} size="sm" variant="ghost"><Check size={15} className="text-sea" /></IconButton>
                                <IconButton aria-label="Cancel role edit" disabled={savingAction} onClick={() => setEditingMembershipId(null)} size="sm" variant="ghost"><X size={15} /></IconButton>
                              </>
                            ) : (
                              <>
                                <IconButton aria-label={`Edit role in ${membership.team?.name || 'team'}`} disabled={savingAction} onClick={() => { setEditRole(String(membership.role)); setEditingMembershipId(membership.id); }} size="sm" variant="ghost"><Edit2 size={14} /></IconButton>
                                <IconButton aria-label={`Remove membership from ${membership.team?.name || 'team'}`} disabled={savingAction} onClick={() => setPendingRemoval(membership)} size="sm" variant="ghost"><Trash2 size={14} className="text-terracotta" /></IconButton>
                              </>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <Empty className="mt-4 py-10" title="No team memberships" description="This person is not assigned to a team yet." />
              )}
            </div>
          </div>
        )}
      </Sheet>

      <AlertDialog
        confirmLabel="Remove membership"
        confirmLoading={savingAction}
        description={pendingRemoval ? `${userName(selectedUser!)} will lose their membership in ${pendingRemoval.team?.name || `team ${pendingRemoval.teams_id}`}.` : ''}
        isOpen={Boolean(pendingRemoval)}
        onCancel={() => setPendingRemoval(null)}
        onConfirm={() => void removeMembership()}
        title="Remove team membership?"
        variant="destructive"
      />
    </div>
  );
}
