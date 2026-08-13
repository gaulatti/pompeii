import {
  Clock3,
  KeyRound,
  LockKeyhole,
  Plus,
  ShieldCheck,
  Trash2,
  UserCog,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Method, sendRequest } from '~/clients/api';
import {
  AlertDialog,
  Button,
  Card,
  Checkbox,
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
  StatCard,
  StatusBadge,
  Tabs,
  toast,
  type ColumnDef,
} from '~/lib/bleecker';

type Permission = {
  id: number;
  key: string;
  description?: string | null;
};

type Role = {
  id: number;
  key: string;
  name: string;
  description?: string | null;
  is_system: boolean;
  permissions?: Permission[];
};

type Team = { id: number; name: string };

type User = {
  id: number;
  email: string;
  name: string;
  last_name?: string;
  is_active?: boolean;
  last_seen_at?: string | null;
};

type Assignment = {
  id: number;
  role_id: number;
  team_id?: number | null;
  role?: Role;
};

type AuditLog = {
  id: number;
  actor_user_id?: number | null;
  action: string;
  target_type: string;
  target_id?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  created_at?: string;
};

type ConfirmState =
  | { kind: 'assignment'; assignment: Assignment }
  | { kind: 'role'; role: Role }
  | { kind: 'user-status'; user: User }
  | null;

const tabs = [
  { id: 'access', label: 'People & access' },
  { id: 'roles', label: 'Roles & permissions' },
  { id: 'audit', label: 'Audit trail' },
];

function displayName(user: User) {
  return `${user.name ?? ''} ${user.last_name ?? ''}`.trim() || user.email;
}

function formatAction(action: string) {
  return action.replaceAll('.', ' · ').replaceAll('_', ' ');
}

export default function GovernancePage() {
  const [activeTab, setActiveTab] = useState('access');
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userSheetOpen, setUserSheetOpen] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [roleId, setRoleId] = useState('');
  const [scope, setScope] = useState('global');

  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleKey, setRoleKey] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [permissionKey, setPermissionKey] = useState('');
  const [permissionDescription, setPermissionDescription] = useState('');
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const sheetTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!userSheetOpen && selectedUser) sheetTriggerRef.current?.focus();
  }, [selectedUser, userSheetOpen]);

  const loadGovernance = async () => {
    setLoading(true);
    setError(null);
    try {
      const [roleData, permissionData, userData, teamData, auditData] = await Promise.all([
        sendRequest(Method.GET, 'authorization/roles'),
        sendRequest(Method.GET, 'authorization/rbac-permissions'),
        sendRequest(Method.GET, 'authorization/users'),
        sendRequest(Method.GET, 'authorization/teams'),
        sendRequest(Method.GET, 'authorization/audit-logs', { limit: 200 }),
      ]);
      const nextRoles = Array.isArray(roleData) ? roleData : [];
      setRoles(nextRoles);
      setPermissions(Array.isArray(permissionData) ? permissionData : []);
      setUsers(Array.isArray(userData) ? userData : []);
      setTeams(Array.isArray(teamData) ? teamData : []);
      setAuditLogs(Array.isArray(auditData) ? auditData : []);
      setSelectedRoleId((current) => current ?? nextRoles[0]?.id ?? null);
    } catch (cause: any) {
      const status = cause?.response?.status;
      setError(
        status === 403
          ? 'Your current role does not include governance read access.'
          : 'Pompeii could not load the governance workspace.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadGovernance();
  }, []);

  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? null;

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) =>
      [displayName(user), user.email].some((value) => value.toLowerCase().includes(query)),
    );
  }, [userSearch, users]);

  const loadAssignments = async (user: User) => {
    setAssignmentsLoading(true);
    try {
      const data = await sendRequest(Method.GET, `authorization/users/${user.id}/role-assignments`);
      setAssignments(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Could not load role assignments');
      setAssignments([]);
    } finally {
      setAssignmentsLoading(false);
    }
  };

  const openUser = (user: User) => {
    setSelectedUser(user);
    setUserSheetOpen(true);
    setRoleId('');
    setScope('global');
    void loadAssignments(user);
  };

  const closeUser = () => {
    setUserSheetOpen(false);
  };

  const createRole = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!roleName.trim() || !roleKey.trim()) return;
    setSaving(true);
    try {
      await sendRequest(Method.POST, 'authorization/roles', {
        name: roleName.trim(),
        key: roleKey.trim().toLowerCase().replace(/\s+/g, '-'),
        description: roleDescription.trim() || undefined,
      });
      setRoleName('');
      setRoleKey('');
      setRoleDescription('');
      toast.success('Role created');
      await loadGovernance();
    } catch {
      toast.error('Role could not be created', { description: 'Check that the role key is unique.' });
    } finally {
      setSaving(false);
    }
  };

  const createPermission = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!permissionKey.trim()) return;
    setSaving(true);
    try {
      await sendRequest(Method.POST, 'authorization/rbac-permissions', {
        key: permissionKey.trim().toLowerCase(),
        description: permissionDescription.trim() || undefined,
      });
      setPermissionKey('');
      setPermissionDescription('');
      toast.success('Permission registered');
      await loadGovernance();
    } catch {
      toast.error('Permission could not be registered', { description: 'Check that the permission key is unique.' });
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = async (permission: Permission, checked: boolean) => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      await sendRequest(
        checked ? Method.PUT : Method.DELETE,
        `authorization/roles/${selectedRole.id}/permissions/${permission.id}`,
      );
      toast.success(checked ? 'Permission added' : 'Permission removed');
      await loadGovernance();
    } catch {
      toast.error('Role mapping could not be updated');
    } finally {
      setSaving(false);
    }
  };

  const addAssignment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedUser || !roleId) return;
    setSaving(true);
    try {
      await sendRequest(Method.POST, 'authorization/role-assignments', {
        user_id: selectedUser.id,
        role_id: Number(roleId),
        team_id: scope === 'global' ? null : Number(scope),
      });
      toast.success('Role assigned', {
        description: scope === 'global' ? 'Access applies globally.' : 'Access is limited to the selected team.',
      });
      setRoleId('');
      await loadAssignments(selectedUser);
      const logs = await sendRequest(Method.GET, 'authorization/audit-logs', { limit: 200 });
      setAuditLogs(Array.isArray(logs) ? logs : []);
    } catch {
      toast.error('Role assignment could not be saved');
    } finally {
      setSaving(false);
    }
  };

  const confirmAction = async () => {
    if (!confirmState) return;
    setSaving(true);
    try {
      if (confirmState.kind === 'assignment') {
        await sendRequest(Method.DELETE, `authorization/role-assignments/${confirmState.assignment.id}`);
        if (selectedUser) await loadAssignments(selectedUser);
        toast.success('Role assignment removed');
      } else if (confirmState.kind === 'role') {
        await sendRequest(Method.DELETE, `authorization/roles/${confirmState.role.id}`);
        setSelectedRoleId(null);
        await loadGovernance();
        toast.success('Role deleted');
      } else {
        const nextActive = !confirmState.user.is_active;
        const updated = await sendRequest(Method.PATCH, `authorization/users/${confirmState.user.id}/active`, {
          is_active: nextActive,
        });
        setUsers((current) => current.map((user) => user.id === confirmState.user.id ? { ...user, ...updated } : user));
        toast.success(nextActive ? 'User activated' : 'User deactivated');
      }
      setConfirmState(null);
    } catch {
      toast.error('The administrative change could not be completed');
    } finally {
      setSaving(false);
    }
  };

  const userColumns: ColumnDef<User>[] = [
    {
      key: 'name',
      header: 'Person',
      sortable: true,
      cell: (user) => (
        <div className="min-w-44">
          <p className="font-medium">{displayName(user)}</p>
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
      key: 'last_seen_at',
      header: 'Last seen',
      sortable: true,
      cell: (user) => <span className="app-secondary-copy text-xs text-text-secondary">{user.last_seen_at ? new Date(user.last_seen_at).toLocaleString() : 'Not recorded'}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      sortable: false,
      cell: (user) => (
        <div className="flex justify-end gap-2">
          <Button
            onClick={(event) => {
              sheetTriggerRef.current = event.currentTarget;
              openUser(user);
            }}
            size="sm"
            variant="secondary"
          >
            Manage access
          </Button>
          <Button
            onClick={() => setConfirmState({ kind: 'user-status', user })}
            size="sm"
            variant={user.is_active === false ? 'subtle' : 'ghost'}
          >
            {user.is_active === false ? 'Activate' : 'Deactivate'}
          </Button>
        </div>
      ),
    },
  ];

  const auditColumns: ColumnDef<AuditLog>[] = [
    {
      key: 'action',
      header: 'Administrative action',
      sortable: true,
      cell: (log) => (
        <div className="min-w-52">
          <p className="font-medium capitalize">{formatAction(log.action)}</p>
          <p className="app-secondary-copy mt-0.5 text-xs text-text-secondary">{log.target_type}{log.target_id ? ` · ${log.target_id}` : ''}</p>
        </div>
      ),
    },
    {
      key: 'actor_user_id',
      header: 'Actor',
      cell: (log) => {
        const actor = users.find((user) => user.id === log.actor_user_id);
        return actor ? displayName(actor) : log.actor_user_id ? `User ${log.actor_user_id}` : 'System';
      },
    },
    {
      key: 'createdAt',
      header: 'Occurred',
      align: 'right',
      sortable: true,
      cell: (log) => {
        const timestamp = log.createdAt ?? log.created_at;
        return <span className="app-secondary-copy whitespace-nowrap text-xs text-text-secondary">{timestamp ? new Date(timestamp).toLocaleString() : 'Unknown'}</span>;
      },
    },
  ];

  if (loading) {
    return (
      <div className="app-page space-y-8" aria-busy="true">
        <PageHeader className="app-page-header" title="Governance" description="Loading roles, assignments, and audit history…" />
        <SkeletonTable rows={7} columns={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-page space-y-8">
        <PageHeader className="app-page-header" title="Governance unavailable" description="Roles, assignments, and audit history could not be displayed." />
        <ErrorState title="Governance is unavailable" description={error} onRetry={() => void loadGovernance()} />
      </div>
    );
  }

  return (
    <div className="app-page space-y-8">
      <PageHeader
        className="app-page-header [&_h1]:font-medium"
        title="Governance & access"
        description="Identity, authority, and every sensitive administrative action—quietly accounted for."
        actions={<StatusBadge label="Policy enforced" variant="live" description="Backend checks remain authoritative" />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="People" value={users.length} description="Provisioned identities" icon={<UserCog size={17} />} />
        <StatCard title="Roles" value={roles.length} description="Global and team-ready" icon={<ShieldCheck size={17} />} />
        <StatCard title="Permissions" value={permissions.length} description="Administrative capabilities" icon={<KeyRound size={17} />} />
        <StatCard title="Audit events" value={auditLogs.length} description="Most recent retained view" icon={<Clock3 size={17} />} />
      </div>

      <Tabs aria-label="Governance sections" activeTab={activeTab} onChange={setActiveTab} tabs={tabs} />

      {activeTab === 'access' && (
        <section aria-labelledby="people-access-title" className="space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="app-section-label text-desert">Authorized people</p>
              <h2 id="people-access-title" className="mt-2 text-xl font-medium">{filteredUsers.length} identities</h2>
            </div>
            <SearchInput
              aria-label="Search people"
              className="w-full sm:w-72"
              onChange={(event) => setUserSearch(event.target.value)}
              onClear={() => setUserSearch('')}
              placeholder="Search name or email"
              value={userSearch}
            />
          </div>
          {filteredUsers.length ? (
            <DataTable caption="People and account access" columns={userColumns} data={filteredUsers} getRowKey={(user) => String(user.id)} />
          ) : (
            <Empty title="No people match" description="Clear or refine your search to see provisioned identities." action={<Button onClick={() => setUserSearch('')} variant="secondary">Clear search</Button>} />
          )}
        </section>
      )}

      {activeTab === 'roles' && (
        <section aria-labelledby="roles-title" className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
          <div className="space-y-5">
            <Card padding="lg" variant="surface">
              <p className="app-section-label text-desert">Role catalog</p>
              <h2 id="roles-title" className="mt-2 text-xl font-medium">Configurable roles</h2>
              <p className="app-secondary-copy mt-2 text-sm leading-6 text-text-secondary">System roles are managed by Pompeii migrations. Custom roles can be safely removed.</p>
              <div className="mt-6 space-y-2">
                {roles.map((role) => (
                  <button
                    aria-pressed={selectedRoleId === role.id}
                    className={`flex min-h-12 w-full items-center gap-3 rounded-[var(--radius-ui)] border px-3 text-left transition-[background-color,border-color,transform] duration-[var(--motion-control)] ease-premium active:translate-y-px ${selectedRoleId === role.id ? 'border-sea/35 bg-sea/[0.06] dark:border-accent-blue/30 dark:bg-accent-blue/[0.07]' : 'border-sand/20 hover:bg-light-sand/40 dark:border-white/[0.07] dark:hover:bg-white/[0.035]'}`}
                    key={role.id}
                    onClick={() => setSelectedRoleId(role.id)}
                    type="button"
                  >
                    <LockKeyhole size={15} className="text-text-secondary" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{role.name}</span>
                      <span className="app-secondary-copy block truncate text-[11px] text-text-secondary">{role.key}</span>
                    </span>
                    <StatusBadge label={role.is_system ? 'System' : 'Custom'} variant={role.is_system ? 'info' : 'default'} />
                  </button>
                ))}
              </div>
            </Card>

            <Card padding="lg" variant="subtle">
              <h3 className="text-lg font-medium">Create custom role</h3>
              <form className="mt-5 space-y-4" onSubmit={createRole}>
                <Field label="Role name" required><Input required value={roleName} onChange={(event) => setRoleName(event.target.value)} /></Field>
                <Field label="Role key" description="Use a stable identifier such as billing-reviewer." required><Input required value={roleKey} onChange={(event) => setRoleKey(event.target.value)} /></Field>
                <Field label="Description" optional><Input value={roleDescription} onChange={(event) => setRoleDescription(event.target.value)} /></Field>
                <Button disabled={saving || !roleName.trim() || !roleKey.trim()} loading={saving} type="submit"><Plus size={15} /> Create role</Button>
              </form>
            </Card>
          </div>

          <div className="space-y-5">
            <Card padding="lg" variant="elevated">
              {selectedRole ? (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-sand/20 pb-5 dark:border-white/[0.08]">
                    <div>
                      <p className="app-section-label text-desert">Permission mapping</p>
                      <h2 className="mt-2 text-2xl font-medium">{selectedRole.name}</h2>
                      <p className="app-secondary-copy mt-2 max-w-xl text-sm leading-6 text-text-secondary">{selectedRole.description || 'No description has been added for this role.'}</p>
                    </div>
                    {!selectedRole.is_system && (
                      <Button onClick={() => setConfirmState({ kind: 'role', role: selectedRole })} size="sm" variant="destructive"><Trash2 size={14} /> Delete role</Button>
                    )}
                  </div>
                  <div className="mt-6 grid gap-3 md:grid-cols-2">
                    {permissions.map((permission) => {
                      const checked = selectedRole.permissions?.some((current) => current.id === permission.id) ?? false;
                      return (
                        <Checkbox
                          checked={checked}
                          containerClassName="rounded-[var(--radius-ui)] border border-sand/20 p-4 dark:border-white/[0.08]"
                          description={permission.description || 'No additional description.'}
                          disabled={saving}
                          key={permission.id}
                          label={permission.key}
                          onChange={(event) => void togglePermission(permission, event.target.checked)}
                        />
                      );
                    })}
                  </div>
                </>
              ) : (
                <Empty title="Select a role" description="Choose a role to review its effective permission mapping." />
              )}
            </Card>

            <Card padding="lg" variant="outlined">
              <h3 className="text-lg font-medium">Register permission</h3>
              <p className="app-secondary-copy mt-2 text-sm leading-6 text-text-secondary">Permission keys become available to every role mapping. Enforcement still occurs on backend operations.</p>
              <form className="mt-5 grid gap-4 md:grid-cols-[0.8fr_1.2fr_auto] md:items-end" onSubmit={createPermission}>
                <Field label="Permission key" required><Input placeholder="resource:action" required value={permissionKey} onChange={(event) => setPermissionKey(event.target.value)} /></Field>
                <Field label="Description" optional><Input value={permissionDescription} onChange={(event) => setPermissionDescription(event.target.value)} /></Field>
                <Button disabled={saving || !permissionKey.trim()} loading={saving} type="submit">Register</Button>
              </form>
            </Card>
          </div>
        </section>
      )}

      {activeTab === 'audit' && (
        <section aria-labelledby="audit-title" className="space-y-5">
          <div>
            <p className="app-section-label text-desert">Administrative record</p>
            <h2 id="audit-title" className="mt-2 text-xl font-medium">Recent sensitive actions</h2>
            <p className="app-secondary-copy mt-2 text-sm text-text-secondary">The service returns the most recent 200 entries for this operational view.</p>
          </div>
          {auditLogs.length ? (
            <DataTable caption="Administrative audit history" columns={auditColumns} data={auditLogs} getRowKey={(log) => String(log.id)} />
          ) : (
            <Empty title="No audit history" description="Sensitive administrative actions will appear here as they occur." icon={<Clock3 size={26} />} />
          )}
        </section>
      )}

      <Sheet
        description={selectedUser ? `Global and team-scoped roles for ${displayName(selectedUser)}` : ''}
        isOpen={userSheetOpen}
        onClose={closeUser}
        side="right"
        title="Manage role assignments"
      >
        {selectedUser && (
          <div className="space-y-8">
            <form className="space-y-4" onSubmit={addAssignment}>
              <div>
                <p className="app-section-label text-desert">Grant access</p>
                <h3 className="mt-2 text-lg font-medium">New role assignment</h3>
              </div>
              <Field label="Role" required>
                <Select aria-label="Role" options={roles.map((role) => ({ label: role.name, value: String(role.id) }))} placeholder="Choose role" value={roleId} onChange={setRoleId} />
              </Field>
              <Field label="Scope" description="Global applies across every team. Team scope is evaluated only for that team." required>
                <Select
                  aria-label="Assignment scope"
                  options={[{ label: 'Global · all teams', value: 'global' }, ...teams.map((team) => ({ label: `Team · ${team.name}`, value: String(team.id) }))]}
                  value={scope}
                  onChange={setScope}
                />
              </Field>
              <Button disabled={!roleId || saving} loading={saving} type="submit" fullWidth><Plus size={15} /> Assign role</Button>
            </form>

            <div className="border-t border-sand/20 pt-6 dark:border-white/[0.08]">
              <p className="app-section-label">Current assignments</p>
              {assignmentsLoading ? (
                <div className="mt-4"><SkeletonTable rows={3} columns={2} /></div>
              ) : assignments.length ? (
                <ul className="mt-4 divide-y divide-sand/20 border-y border-sand/20 dark:divide-white/[0.08] dark:border-white/[0.08]">
                  {assignments.map((assignment) => {
                    const role = assignment.role ?? roles.find((current) => current.id === assignment.role_id);
                    const team = teams.find((current) => current.id === assignment.team_id);
                    return (
                      <li className="flex items-center gap-4 py-4" key={assignment.id}>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{role?.name || `Role ${assignment.role_id}`}</p>
                          <p className="app-secondary-copy mt-1 text-xs text-text-secondary">{team ? `Team · ${team.name}` : 'Global · all teams'}</p>
                        </div>
                        <IconButton aria-label={`Remove ${role?.name || 'role'} assignment`} onClick={() => setConfirmState({ kind: 'assignment', assignment })} size="sm" variant="ghost"><Trash2 size={15} className="text-terracotta" /></IconButton>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <Empty className="mt-4 py-10" title="No role assignments" description="This person has no global or team-scoped RBAC roles." />
              )}
            </div>
          </div>
        )}
      </Sheet>

      <AlertDialog
        confirmLabel={confirmState?.kind === 'user-status' && confirmState.user.is_active === false ? 'Activate user' : confirmState?.kind === 'user-status' ? 'Deactivate user' : 'Remove'}
        confirmLoading={saving}
        description={
          confirmState?.kind === 'role'
            ? `Remove the custom role “${confirmState.role.name}”? Existing assignments will lose this authority.`
            : confirmState?.kind === 'assignment'
              ? 'This person will immediately lose the authority provided by this assignment.'
              : confirmState?.kind === 'user-status'
                ? confirmState.user.is_active === false
                  ? `${displayName(confirmState.user)} will be able to authorize requests again.`
                  : `${displayName(confirmState.user)} will be denied by every authorization decision.`
                : ''
        }
        isOpen={Boolean(confirmState)}
        onCancel={() => setConfirmState(null)}
        onConfirm={() => void confirmAction()}
        title={confirmState?.kind === 'role' ? 'Delete custom role?' : confirmState?.kind === 'assignment' ? 'Remove role assignment?' : confirmState?.kind === 'user-status' && confirmState.user.is_active === false ? 'Activate this user?' : 'Deactivate this user?'}
        variant={confirmState?.kind === 'user-status' && confirmState.user.is_active === false ? 'default' : 'destructive'}
      />
    </div>
  );
}
