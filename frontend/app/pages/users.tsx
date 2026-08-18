import { ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Method, sendRequest } from '~/clients/api';
import {
  Button,
  DataTable,
  Empty,
  ErrorState,
  PageHeader,
  SearchInput,
  SkeletonTable,
  StatusBadge,
  type ColumnDef,
} from '~/lib/bleecker';
import { getCurrentTeam } from '~/state/selectors/teams';

type RoleAssignment = {
  id: number;
  team_id: number | null;
  role?: { key: string; name: string };
  team?: { id: number; name: string };
};

type UserData = {
  id: number;
  sub?: string;
  name: string;
  email: string;
  last_name?: string;
  is_active?: boolean;
  last_seen_at?: string | null;
  roleAssignments?: RoleAssignment[];
};

function userName(user: UserData) {
  return `${user.name ?? ''} ${user.last_name ?? ''}`.trim() || user.email;
}

function assignmentLabel(assignment: RoleAssignment) {
  const role = assignment.role?.name ?? assignment.role?.key ?? 'Role';
  return assignment.team_id === null
    ? `${role} · Global`
    : `${role} · ${assignment.team?.name ?? `Team ${assignment.team_id}`}`;
}

export default function UsersPage() {
  const currentTeam = useSelector(getCurrentTeam);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = currentTeam ? { team_id: currentTeam.id } : undefined;
      const result = await sendRequest(Method.GET, 'authorization/users', params);
      setUsers(Array.isArray(result) ? result : []);
    } catch (cause: any) {
      setError(
        cause?.response?.status === 403
          ? 'You do not have permission to view users in this scope.'
          : 'Pompeii could not load the user directory.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [currentTeam?.id]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) =>
      [userName(user), user.email, user.sub].some((value) =>
        value?.toLowerCase().includes(query),
      ),
    );
  }, [search, users]);

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
      cell: (user) => (
        <StatusBadge
          label={user.is_active === false ? 'Inactive' : 'Active'}
          variant={user.is_active === false ? 'offline' : 'live'}
        />
      ),
    },
    {
      key: 'roleAssignments',
      header: 'RBAC access',
      sortable: false,
      cell: (user) =>
        user.roleAssignments?.length ? (
          <div className="space-y-1">
            {user.roleAssignments.map((assignment) => (
              <p className="text-xs text-text-secondary" key={assignment.id}>
                {assignmentLabel(assignment)}
              </p>
            ))}
          </div>
        ) : (
          <span className="text-xs text-text-secondary">No roles assigned</span>
        ),
    },
    {
      key: 'last_seen_at',
      header: 'Last seen',
      sortable: true,
      cell: (user) => (
        <span className="app-secondary-copy whitespace-nowrap text-xs text-text-secondary">
          {user.last_seen_at ? new Date(user.last_seen_at).toLocaleString() : 'Not recorded'}
        </span>
      ),
    },
  ];

  return (
    <div className="app-page space-y-8">
      <PageHeader
        actions={
          <Button as="a" href="/governance" variant="secondary">
            <ShieldCheck size={15} /> Manage RBAC roles
          </Button>
        }
        className="app-page-header [&_h1]:font-medium"
        title="People"
        description={
          currentTeam
            ? `Provisioned identities with global or ${currentTeam.name} role assignments.`
            : 'Provisioned identities and their role assignments.'
        }
      />

      <section aria-labelledby="user-directory-title" className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="app-section-label text-desert">Identity directory</p>
            <h2 id="user-directory-title" className="mt-2 text-xl font-medium">
              {filteredUsers.length} {filteredUsers.length === 1 ? 'person' : 'people'}
            </h2>
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
          <div aria-busy="true"><SkeletonTable rows={7} columns={4} /></div>
        ) : error ? (
          <ErrorState title="User directory unavailable" description={error} onRetry={() => void loadData()} />
        ) : filteredUsers.length === 0 ? (
          <Empty
            title={search ? 'No matching people' : 'No users found'}
            description={
              search
                ? 'Clear or refine your search.'
                : 'No identities have a global or selected-team role assignment.'
            }
            action={search ? <Button onClick={() => setSearch('')} variant="secondary">Clear search</Button> : undefined}
          />
        ) : (
          <DataTable caption="Provisioned users" columns={columns} data={filteredUsers} getRowKey={(user) => String(user.id)} />
        )}
      </section>
    </div>
  );
}
