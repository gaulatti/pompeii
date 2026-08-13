import { ArrowLeft, Check, Edit2, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
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
  Select,
  SkeletonTable,
  StatusBadge,
  toast,
  type ColumnDef,
} from '~/lib/bleecker';

type Application = { id: number; name: string; team_id: number };
type Feature = { id: number; name: string; default_value: string; slug?: string };
type Membership = {
  id: number;
  users_id: number;
  user?: { name: string; last_name?: string; email?: string };
};
type Override = {
  id: number;
  membership_id: number;
  level: string;
  membership?: Membership;
};

const LEVEL_OPTIONS = [
  { label: 'C · Control', value: 'C' },
  { label: 'T1 · Treatment 1', value: 'T1' },
  { label: 'T2 · Treatment 2', value: 'T2' },
  { label: 'T3 · Treatment 3', value: 'T3' },
];

function overrideUser(override: Override) {
  const user = override.membership?.user;
  return user ? `${user.name} ${user.last_name ?? ''}`.trim() : `User ${override.membership?.users_id ?? 'unknown'}`;
}

export default function PermissionDetailPage() {
  const { appId, id } = useParams();
  const [feature, setFeature] = useState<Feature | null>(null);
  const [app, setApp] = useState<Application | null>(null);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [teamMemberships, setTeamMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [membershipId, setMembershipId] = useState('');
  const [overrideLevel, setOverrideLevel] = useState('C');
  const [savingOverride, setSavingOverride] = useState(false);
  const [featureName, setFeatureName] = useState('');
  const [featureDefault, setFeatureDefault] = useState('C');
  const [savingFeature, setSavingFeature] = useState(false);
  const [editingOverrideId, setEditingOverrideId] = useState<number | null>(null);
  const [editLevel, setEditLevel] = useState('C');
  const [pendingRemoval, setPendingRemoval] = useState<Override | null>(null);

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const appData = await sendRequest(Method.GET, `authorization/applications/${appId}`);
      const [featureData, overrideData, memberData] = await Promise.all([
        sendRequest(Method.GET, `authorization/features/${id}`),
        sendRequest(Method.GET, `authorization/features/${id}/permissions`),
        sendRequest(Method.GET, `authorization/teams/${appData.team_id}/memberships`),
      ]);
      setFeature(featureData ?? null);
      setFeatureName(featureData?.name || '');
      setFeatureDefault(featureData?.default_value || 'C');
      setOverrides(Array.isArray(overrideData) ? overrideData : []);
      setTeamMemberships(Array.isArray(memberData) ? memberData : []);
      setApp(appData);
    } catch (cause: any) {
      const status = cause?.response?.status;
      setError(status === 404 ? 'This permission or its application no longer exists.' : status === 403 ? 'You do not have permission to manage this feature.' : 'Pompeii could not load this permission.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (id && appId) void loadData();
  }, [id, appId]);

  const saveFeature = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!featureName.trim() || !id) return;
    setSavingFeature(true);
    try {
      const updated = await sendRequest(Method.PATCH, `authorization/features/${id}`, {
        name: featureName.trim(),
        default_value: featureDefault,
      });
      setFeature((current) => current ? { ...current, ...updated } : updated);
      toast.success('Permission settings saved');
    } catch {
      toast.error('Permission settings could not be saved');
    } finally {
      setSavingFeature(false);
    }
  };

  const addOverride = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!membershipId || !feature) return;
    setSavingOverride(true);
    try {
      await sendRequest(Method.POST, 'authorization/permissions', {
        membership_id: Number(membershipId),
        feature_id: feature.id,
        level: overrideLevel,
      });
      setMembershipId('');
      setOverrideLevel('C');
      await loadData(false);
      toast.success('Override assigned');
    } catch {
      toast.error('Override could not be assigned');
    } finally {
      setSavingOverride(false);
    }
  };

  const removeOverride = async () => {
    if (!pendingRemoval) return;
    setSavingOverride(true);
    try {
      await sendRequest(Method.DELETE, `authorization/permissions/${pendingRemoval.id}`);
      setPendingRemoval(null);
      await loadData(false);
      toast.success('Override removed');
    } catch {
      toast.error('Override could not be removed');
    } finally {
      setSavingOverride(false);
    }
  };

  const updateOverride = async (override: Override) => {
    if (!feature) return;
    setSavingOverride(true);
    try {
      await sendRequest(Method.POST, 'authorization/permissions', {
        membership_id: override.membership_id,
        feature_id: feature.id,
        level: editLevel,
      });
      setEditingOverrideId(null);
      await loadData(false);
      toast.success('Override updated');
    } catch {
      toast.error('Override could not be updated');
    } finally {
      setSavingOverride(false);
    }
  };

  const columns: ColumnDef<Override>[] = [
    {
      key: 'user',
      header: 'Person',
      sortable: true,
      cell: (override) => (
        <div className="min-w-52">
          <p className="font-medium">{overrideUser(override)}</p>
          <p className="app-secondary-copy mt-0.5 text-xs text-text-secondary">{override.membership?.user?.email || `Membership ${override.membership_id}`}</p>
        </div>
      ),
    },
    {
      key: 'level',
      header: 'Override level',
      sortable: true,
      cell: (override) => editingOverrideId === override.id ? (
        <Select aria-label={`Override level for ${overrideUser(override)}`} onChange={setEditLevel} options={LEVEL_OPTIONS} size="sm" value={editLevel} />
      ) : (
        <StatusBadge label={override.level} variant={override.level === 'C' ? 'default' : 'info'} />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      sortable: false,
      cell: (override) => {
        const editing = editingOverrideId === override.id;
        return (
          <div className="flex justify-end gap-1">
            {editing ? (
              <>
                <IconButton aria-label={`Save override for ${overrideUser(override)}`} disabled={savingOverride} onClick={() => void updateOverride(override)} size="sm" variant="ghost"><Check size={15} className="text-sea" /></IconButton>
                <IconButton aria-label="Cancel override edit" disabled={savingOverride} onClick={() => setEditingOverrideId(null)} size="sm" variant="ghost"><X size={15} /></IconButton>
              </>
            ) : (
              <>
                <IconButton aria-label={`Edit override for ${overrideUser(override)}`} onClick={() => { setEditLevel(override.level); setEditingOverrideId(override.id); }} size="sm" variant="ghost"><Edit2 size={15} /></IconButton>
                <IconButton aria-label={`Remove override for ${overrideUser(override)}`} onClick={() => setPendingRemoval(override)} size="sm" variant="ghost"><Trash2 size={15} className="text-terracotta" /></IconButton>
              </>
            )}
          </div>
        );
      },
    },
  ];

  if (loading) {
    return <div className="app-page space-y-8" aria-busy="true"><PageHeader className="app-page-header" title="Permission override" description="Loading policy and team members…" /><SkeletonTable rows={5} columns={3} /></div>;
  }

  if (error || !feature) {
    return (
      <div className="app-page space-y-8">
        <PageHeader className="app-page-header" title="Permission unavailable" description="The requested policy could not be displayed." />
        <ErrorState title="Permission unavailable" description={error || 'This permission could not be found.'} onRetry={() => void loadData()} />
      </div>
    );
  }

  const eligibleMemberships = teamMemberships.filter((membership) => !overrides.some((override) => override.membership_id === membership.id));

  return (
    <div className="app-page space-y-8">
      <PageHeader
        className="app-page-header [&_h1]:font-medium"
        title={feature.name}
        description={`Global default ${feature.default_value} · ${app?.name || `Application ${appId}`}`}
        actions={<Button as="a" href={`/applications/${appId}`} size="sm" variant="secondary"><ArrowLeft size={14} /> Back to application</Button>}
      />

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Card padding="lg" variant="outlined">
          <p className="app-section-label text-desert">Default policy</p>
          <h2 className="mt-2 text-xl font-medium">Permission settings</h2>
          <p className="app-secondary-copy mt-2 text-sm leading-6 text-text-secondary">The global default applies when a person has no explicit team override.</p>
          <form className="mt-6 grid gap-4 sm:grid-cols-[1fr_12rem_auto] sm:items-end" onSubmit={saveFeature}>
            <Field label="Permission name" required><Input required value={featureName} onChange={(event) => setFeatureName(event.target.value)} /></Field>
            <Field label="Global default" required><Select aria-label="Global default" onChange={setFeatureDefault} options={LEVEL_OPTIONS} value={featureDefault} /></Field>
            <Button disabled={!featureName.trim() || savingFeature || (featureName === feature.name && featureDefault === feature.default_value)} loading={savingFeature} type="submit">Save settings</Button>
          </form>
        </Card>

        <Card padding="lg" variant="subtle">
          <p className="app-section-label text-desert">Exception policy</p>
          <h2 className="mt-2 text-xl font-medium">Assign override</h2>
          <p className="app-secondary-copy mt-2 text-sm leading-6 text-text-secondary">An override applies to one team membership and supersedes the global default.</p>
          <form className="mt-6 grid gap-4 sm:grid-cols-[1fr_10rem_auto] sm:items-end" onSubmit={addOverride}>
            <Field label="Team member" required>
              <Select
                aria-label="Team member"
                onChange={setMembershipId}
                options={eligibleMemberships.map((membership) => ({ label: membership.user ? `${membership.user.name} ${membership.user.last_name ?? ''}`.trim() : `User ${membership.users_id}`, value: String(membership.id) }))}
                placeholder={eligibleMemberships.length ? 'Choose person' : 'No eligible members'}
                value={membershipId}
              />
            </Field>
            <Field label="Override level" required><Select aria-label="Override level" onChange={setOverrideLevel} options={LEVEL_OPTIONS} value={overrideLevel} /></Field>
            <Button disabled={!membershipId || savingOverride} loading={savingOverride} type="submit"><Plus size={15} /> Add</Button>
          </form>
        </Card>
      </div>

      <section aria-labelledby="override-directory-title" className="space-y-5">
        <div><p className="app-section-label text-desert">Team exceptions</p><h2 id="override-directory-title" className="mt-2 text-xl font-medium">{overrides.length} active {overrides.length === 1 ? 'override' : 'overrides'}</h2></div>
        {overrides.length ? (
          <DataTable caption={`Authorization overrides for ${feature.name}`} columns={columns} data={overrides} getRowKey={(override) => String(override.id)} />
        ) : (
          <Empty title="No overrides" description="Every team member currently receives the global default for this permission." />
        )}
      </section>

      <AlertDialog
        confirmLabel="Remove override"
        confirmLoading={savingOverride}
        description={pendingRemoval ? `${overrideUser(pendingRemoval)} will return to the global default of ${feature.default_value}.` : ''}
        isOpen={Boolean(pendingRemoval)}
        onCancel={() => setPendingRemoval(null)}
        onConfirm={() => void removeOverride()}
        title="Remove permission override?"
        variant="destructive"
      />
    </div>
  );
}
