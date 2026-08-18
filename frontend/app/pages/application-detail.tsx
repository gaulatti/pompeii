import {
  ArrowLeft,
  Download,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
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
  FileInput,
  IconButton,
  Input,
  PageHeader,
  SearchInput,
  SkeletonTable,
  toast,
  type ColumnDef,
} from '~/lib/bleecker';
import { isSuperAdmin } from '~/state/selectors/auth';

type Application = {
  id: number;
  name: string;
  slug: string;
  team_id: number;
  cognito_user_pool_id?: string;
  cognito_client_id?: string;
};

type Permission = {
  id: number;
  application_id: number;
  key: string;
  description?: string | null;
};

type ManifestPermission = { key: string; description?: string };

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function parseCsv(text: string): ManifestPermission[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ',') {
      row.push(cell);
      cell = '';
    } else if (character === '\n') {
      row.push(cell.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }
  if (quoted) throw new Error('CSV contains an unterminated quoted field.');
  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ''));
    rows.push(row);
  }
  const nonEmpty = rows.filter((candidate) =>
    candidate.some((value) => value.trim()),
  );
  if (!nonEmpty.length) throw new Error('CSV file is empty.');
  const headers = nonEmpty[0].map((value) => value.trim().toLowerCase());
  const keyIndex = headers.indexOf('key');
  const descriptionIndex = headers.indexOf('description');
  if (keyIndex < 0) throw new Error('CSV header must include “key”.');
  return nonEmpty.slice(1).map((values) => ({
    key: values[keyIndex]?.trim() ?? '',
    description:
      descriptionIndex >= 0 && values[descriptionIndex]?.trim()
        ? values[descriptionIndex].trim()
        : undefined,
  }));
}

function parseManifest(file: File, text: string): ManifestPermission[] {
  if (file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv') {
    return parseCsv(text);
  }
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error('JSON must contain an array.');
  return parsed.map((item) => ({
    key: typeof item?.key === 'string' ? item.key : '',
    description:
      typeof item?.description === 'string' ? item.description : undefined,
  }));
}

export default function ApplicationDetailPage() {
  const { id } = useParams();
  const superAdmin = useSelector(isSuperAdmin);
  const [app, setApp] = useState<Application | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [userPoolId, setUserPoolId] = useState('');
  const [clientId, setClientId] = useState('');
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [pendingRemoval, setPendingRemoval] = useState<Permission | null>(null);

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const [applicationData, permissionData] = await Promise.all([
        sendRequest(Method.GET, `authorization/applications/${id}`),
        sendRequest(
          Method.GET,
          `authorization/applications/${id}/rbac-permissions`,
        ),
      ]);
      setApp(applicationData ?? null);
      setUserPoolId(applicationData?.cognito_user_pool_id ?? '');
      setClientId(applicationData?.cognito_client_id ?? '');
      setPermissions(Array.isArray(permissionData) ? permissionData : []);
    } catch (cause: any) {
      const status = cause?.response?.status;
      setError(
        status === 404
          ? 'This application no longer exists.'
          : status === 403
            ? 'You do not have permission to view this application.'
            : 'Pompeii could not load the application.',
      );
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (id) void loadData();
  }, [id]);

  const filteredPermissions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return permissions;
    return permissions.filter((permission) =>
      [permission.key, permission.description ?? ''].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [permissions, search]);

  const registerPermissions = async (manifest: ManifestPermission[]) => {
    if (!app) return;
    await sendRequest(
      Method.POST,
      `authorization/applications/${app.id}/rbac-permissions`,
      { permissions: manifest },
    );
    await loadData(false);
  };

  const registerOne = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!key.trim()) return;
    setSaving(true);
    try {
      await registerPermissions([
        { key: key.trim(), description: description.trim() || undefined },
      ]);
      setKey('');
      setDescription('');
      toast.success('Permission registered');
    } catch (cause: any) {
      toast.error('Permission could not be registered', {
        description:
          cause?.response?.data?.message ??
          'Check that the key is unique and belongs to this application.',
      });
    } finally {
      setSaving(false);
    }
  };

  const importManifest = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportErrors([]);
    try {
      const manifest = parseManifest(file, await file.text());
      if (!manifest.length)
        throw new Error('Manifest contains no permissions.');
      const errors = manifest.flatMap((permission, index) =>
        permission.key.trim() ? [] : [`Row ${index + 1}: “key” is required.`],
      );
      if (errors.length) {
        setImportErrors(errors);
        return;
      }
      await registerPermissions(manifest);
      toast.success('Permission manifest imported', {
        description: `${manifest.length} ${manifest.length === 1 ? 'permission' : 'permissions'} registered.`,
      });
    } catch (cause: any) {
      const message = cause?.response?.data?.message;
      setImportErrors([
        typeof message === 'string'
          ? message
          : cause?.message || 'Manifest could not be imported.',
      ]);
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const saveApplication = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!app || !userPoolId.trim() || !clientId.trim()) return;
    setSaving(true);
    try {
      const updated = await sendRequest(
        Method.PATCH,
        `authorization/applications/${app.id}`,
        {
          cognito_user_pool_id: userPoolId.trim(),
          cognito_client_id: clientId.trim(),
        },
      );
      setApp(updated);
      toast.success('Application authentication updated');
    } catch {
      toast.error('Application authentication could not be updated');
    } finally {
      setSaving(false);
    }
  };

  const removePermission = async () => {
    if (!app || !pendingRemoval) return;
    setSaving(true);
    try {
      await sendRequest(
        Method.DELETE,
        `authorization/applications/${app.id}/rbac-permissions/${pendingRemoval.id}`,
      );
      setPendingRemoval(null);
      await loadData(false);
      toast.success('Permission removed');
    } catch {
      toast.error('Permission could not be removed');
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnDef<Permission>[] = [
    {
      key: 'key',
      header: 'Permission key',
      sortable: true,
      cell: (permission) => (
        <span className="font-medium">{permission.key}</span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      sortable: true,
      cell: (permission) => (
        <span className="app-secondary-copy text-sm text-text-secondary">
          {permission.description || 'No description'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      sortable: false,
      cell: (permission) =>
        superAdmin ? (
          <IconButton
            aria-label={`Remove ${permission.key}`}
            onClick={() => setPendingRemoval(permission)}
            size="sm"
            variant="ghost"
          >
            <Trash2 className="text-terracotta" size={14} />
          </IconButton>
        ) : null,
    },
  ];

  if (loading) {
    return (
      <div className="app-page" aria-busy="true">
        <SkeletonTable rows={6} columns={3} />
      </div>
    );
  }
  if (error || !app) {
    return (
      <div className="app-page">
        <ErrorState
          title="Application unavailable"
          description={error || 'Application not found.'}
          onRetry={() => void loadData()}
        />
      </div>
    );
  }

  return (
    <div className="app-page space-y-8">
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-3">
            <Button as="a" href="/applications" size="sm" variant="ghost">
              <ArrowLeft size={14} /> Applications
            </Button>
            <Button as="a" href="/governance" size="sm" variant="secondary">
              <ShieldCheck size={14} /> Role mappings
            </Button>
            <Button
              onClick={() =>
                downloadJson(
                  `${app.slug}-permissions.json`,
                  permissions.map(
                    ({
                      key: permissionKey,
                      description: permissionDescription,
                    }) => ({
                      key: permissionKey,
                      description: permissionDescription,
                    }),
                  ),
                )
              }
              size="sm"
              variant="secondary"
            >
              <Download size={14} /> Export JSON
            </Button>
          </div>
        }
        className="app-page-header [&_h1]:font-medium"
        title={app.name}
        description={`Cognito application and permission catalog · ${app.slug}`}
      />

      {superAdmin && (
        <div className="grid gap-5 xl:grid-cols-2">
          <Card padding="lg" variant="outlined">
            <p className="app-section-label text-desert">Authentication</p>
            <h2 className="mt-2 text-xl font-medium">Cognito registration</h2>
            <p className="app-secondary-copy mt-2 text-sm text-text-secondary">
              This application owns its login flow. Pompeii verifies its ID
              tokens during gRPC authorization.
            </p>
            <form className="mt-5 space-y-4" onSubmit={saveApplication}>
              <Field label="Cognito user-pool ID" required>
                <Input
                  required
                  value={userPoolId}
                  onChange={(event) => setUserPoolId(event.target.value)}
                />
              </Field>
              <Field label="Cognito app-client ID" required>
                <Input
                  required
                  value={clientId}
                  onChange={(event) => setClientId(event.target.value)}
                />
              </Field>
              <Button
                disabled={saving || !userPoolId.trim() || !clientId.trim()}
                loading={saving}
                type="submit"
              >
                Save authentication
              </Button>
            </form>
          </Card>

          <Card padding="lg" variant="outlined">
            <p className="app-section-label text-desert">Permission catalog</p>
            <h2 className="mt-2 text-xl font-medium">Register permission</h2>
            <form className="mt-5 space-y-4" onSubmit={registerOne}>
              <Field
                label="Permission key"
                description={`Must start with ${app.slug}:`}
                required
              >
                <Input
                  placeholder={`${app.slug}:resource:read`}
                  required
                  value={key}
                  onChange={(event) => setKey(event.target.value)}
                />
              </Field>
              <Field label="Description">
                <Input
                  placeholder="Read application resources"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </Field>
              <Button
                disabled={saving || !key.trim()}
                loading={saving}
                type="submit"
              >
                <Plus size={15} /> Register permission
              </Button>
            </form>
          </Card>

          <Card className="xl:col-span-2" padding="lg" variant="subtle">
            <div className="flex items-center gap-2 text-desert">
              <Upload size={15} />
              <p className="app-section-label text-inherit">
                Bulk registration
              </p>
            </div>
            <h2 className="mt-2 text-xl font-medium">Import JSON or CSV</h2>
            <p className="app-secondary-copy mt-2 text-sm text-text-secondary">
              JSON accepts an array of <code>{'{ key, description }'}</code>.
              CSV requires a <code>key</code> header and accepts an optional{' '}
              <code>description</code> column. The complete manifest is
              validated before any rows are written.
            </p>
            <div className="mt-5 flex flex-wrap items-end gap-3">
              <Field
                className="min-w-72 flex-1"
                label="Permission manifest"
                error={
                  importErrors.length
                    ? 'Resolve the validation issues below.'
                    : undefined
                }
              >
                <FileInput
                  accept="application/json,text/csv,.json,.csv"
                  aria-label="Permission manifest"
                  disabled={importing}
                  onChange={importManifest}
                />
              </Field>
              <Button
                onClick={() =>
                  downloadJson(`${app.slug}-permissions.sample.json`, [
                    {
                      key: `${app.slug}:resource:read`,
                      description: 'Read resources',
                    },
                    {
                      key: `${app.slug}:resource:write`,
                      description: 'Manage resources',
                    },
                  ])
                }
                variant="secondary"
              >
                <Download size={14} /> JSON sample
              </Button>
            </div>
            {importErrors.length > 0 && (
              <ul
                className="mt-4 list-disc space-y-1 pl-5 text-sm text-terracotta"
                role="alert"
              >
                {importErrors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      <section
        aria-labelledby="permission-directory-title"
        className="space-y-5"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="app-section-label text-desert">Registered contract</p>
            <h2
              id="permission-directory-title"
              className="mt-2 text-xl font-medium"
            >
              {filteredPermissions.length}{' '}
              {filteredPermissions.length === 1 ? 'permission' : 'permissions'}
            </h2>
          </div>
          <SearchInput
            aria-label="Search permissions"
            className="w-full sm:w-72"
            onChange={(event) => setSearch(event.target.value)}
            onClear={() => setSearch('')}
            placeholder="Search permission or description"
            value={search}
          />
        </div>
        {filteredPermissions.length ? (
          <DataTable
            caption={`Permissions registered for ${app.name}`}
            columns={columns}
            data={filteredPermissions}
            getRowKey={(permission) => String(permission.id)}
          />
        ) : (
          <Empty
            title={
              search ? 'No matching permissions' : 'No permissions registered'
            }
            description={
              search
                ? 'Clear or refine your search.'
                : 'An administrator must register this application’s permission contract before its backend can receive allowed gRPC decisions.'
            }
            action={
              search ? (
                <Button onClick={() => setSearch('')} variant="secondary">
                  Clear search
                </Button>
              ) : undefined
            }
          />
        )}
      </section>

      <AlertDialog
        confirmLabel="Remove permission"
        confirmLoading={saving}
        description={
          pendingRemoval
            ? `${pendingRemoval.key} will be removed from this application and every role mapping that references it.`
            : ''
        }
        isOpen={Boolean(pendingRemoval)}
        onCancel={() => setPendingRemoval(null)}
        onConfirm={() => void removePermission()}
        title="Remove registered permission?"
        variant="destructive"
      />
    </div>
  );
}
