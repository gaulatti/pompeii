import { ArrowLeft, ArrowRight, Download, Plus, Upload } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router';
import { Method, sendRequest } from '~/clients/api';
import {
  Button,
  Card,
  DataTable,
  Empty,
  ErrorState,
  Field,
  FileInput,
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

type Application = {
  id: number;
  name: string;
  slug: string;
  team_id: number;
  cognito_user_pool_id?: string;
  cognito_client_id?: string;
  login_redirect_origins: string[];
  login_redirect_schemes: string[];
};
type Feature = {
  id: number;
  name: string;
  slug: string;
  default_value: string;
  description?: string;
};

const SAMPLE_FEATURE = {
  name: 'Account Access',
  default_value: 'C',
  description: 'Can access the account section',
};

const LEVEL_OPTIONS = [
  { label: 'C · Control', value: 'C' },
  { label: 'T1 · Treatment 1', value: 'T1' },
  { label: 'T2 · Treatment 2', value: 'T2' },
  { label: 'T3 · Treatment 3', value: 'T3' },
];

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

export default function ApplicationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const superAdmin = useSelector(isSuperAdmin);
  const [app, setApp] = useState<Application | null>(null);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [featureName, setFeatureName] = useState('');
  const [featureDefault, setFeatureDefault] = useState('C');
  const [savingFeature, setSavingFeature] = useState(false);
  const [userPoolId, setUserPoolId] = useState('');
  const [clientId, setClientId] = useState('');
  const [redirectOrigins, setRedirectOrigins] = useState('');
  const [redirectSchemes, setRedirectSchemes] = useState('');
  const [savingApplication, setSavingApplication] = useState(false);

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const [appData, featureData] = await Promise.all([
        sendRequest(Method.GET, `authorization/applications/${id}`),
        sendRequest(Method.GET, `authorization/applications/${id}/features`),
      ]);
      setApp(appData ?? null);
      setUserPoolId(appData?.cognito_user_pool_id ?? '');
      setClientId(appData?.cognito_client_id ?? '');
      setRedirectOrigins((appData?.login_redirect_origins ?? []).join(', '));
      setRedirectSchemes((appData?.login_redirect_schemes ?? []).join(', '));
      setFeatures(Array.isArray(featureData) ? featureData : []);
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

  const filteredFeatures = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return features;
    return features.filter((feature) =>
      [feature.name, feature.slug, feature.description ?? ''].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [features, search]);

  const createFeature = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!featureName.trim() || !app) return;
    setSavingFeature(true);
    try {
      await sendRequest(Method.POST, 'authorization/features', {
        application_id: app.id,
        name: featureName.trim(),
        default_value: featureDefault,
      });
      setFeatureName('');
      setFeatureDefault('C');
      await loadData(false);
      toast.success('Permission registered');
    } catch {
      toast.error('Permission could not be registered');
    } finally {
      setSavingFeature(false);
    }
  };

  const saveApplication = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!app || !userPoolId.trim() || !clientId.trim()) return;
    setSavingApplication(true);
    try {
      const updated = await sendRequest(
        Method.PATCH,
        `authorization/applications/${app.id}`,
        {
          cognito_user_pool_id: userPoolId.trim(),
          cognito_client_id: clientId.trim(),
          login_redirect_origins: redirectOrigins
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
          login_redirect_schemes: redirectSchemes
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
        },
      );
      setApp(updated);
      setRedirectOrigins((updated?.login_redirect_origins ?? []).join(', '));
      setRedirectSchemes((updated?.login_redirect_schemes ?? []).join(', '));
      toast.success('Application configuration updated');
    } catch {
      toast.error('Application configuration could not be updated');
    } finally {
      setSavingApplication(false);
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !app) return;
    setImportErrors([]);
    setImporting(true);
    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed)) {
        setImportErrors(['The file must contain a JSON array of permissions.']);
        return;
      }

      const errors: string[] = [];
      parsed.forEach((item, index) => {
        if (!item.name || typeof item.name !== 'string')
          errors.push(`Item ${index + 1}: “name” is required.`);
        if (
          !item.default_value ||
          !LEVEL_OPTIONS.some((option) => option.value === item.default_value)
        ) {
          errors.push(
            `Item ${index + 1}: “default_value” must be C, T1, T2, or T3.`,
          );
        }
      });
      if (errors.length) {
        setImportErrors(errors);
        return;
      }

      await sendRequest(Method.POST, 'authorization/features/bulk', {
        application_id: app.id,
        features: parsed.map((feature) => ({
          name: feature.name,
          slug: feature.slug,
          default_value: feature.default_value,
          description: feature.description,
        })),
      });
      await loadData(false);
      toast.success('Permissions imported', {
        description: `${parsed.length} ${parsed.length === 1 ? 'item' : 'items'} processed.`,
      });
    } catch (cause: any) {
      setImportErrors([cause?.message || 'The JSON file could not be parsed.']);
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const columns: ColumnDef<Feature>[] = [
    {
      key: 'name',
      header: 'Permission',
      sortable: true,
      cell: (feature) => (
        <div className="min-w-56">
          <p className="font-medium">{feature.name}</p>
          <p className="app-secondary-copy mt-0.5 text-xs text-text-secondary">
            {feature.description || feature.slug}
          </p>
        </div>
      ),
    },
    {
      key: 'slug',
      header: 'Key',
      sortable: true,
      cell: (feature) => (
        <span className="app-secondary-copy text-xs text-text-secondary">
          {feature.slug}
        </span>
      ),
    },
    {
      key: 'default_value',
      header: 'Global default',
      align: 'center',
      sortable: true,
      cell: (feature) => (
        <StatusBadge
          label={feature.default_value}
          variant={feature.default_value === 'C' ? 'default' : 'info'}
        />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      sortable: false,
      cell: (feature) => (
        <Button
          onClick={() =>
            navigate(`/applications/${id}/permissions/${feature.id}`)
          }
          size="sm"
          variant="secondary"
        >
          Manage overrides <ArrowRight size={14} />
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="app-page space-y-8" aria-busy="true">
        <PageHeader
          className="app-page-header"
          title="Application policy"
          description="Loading feature permissions…"
        />
        <SkeletonTable rows={6} columns={4} />
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="app-page space-y-8">
        <PageHeader
          className="app-page-header"
          title="Application unavailable"
          description="Feature policy could not be displayed."
        />
        <ErrorState
          title="Application unavailable"
          description={error || 'This application could not be found.'}
          onRetry={() => void loadData()}
        />
      </div>
    );
  }

  return (
    <div className="app-page space-y-8">
      <PageHeader
        className="app-page-header [&_h1]:font-medium"
        title={app.name}
        description={`Feature permissions and individual authorization overrides · ${app.slug}`}
        actions={
          <div className="flex flex-wrap gap-3">
            <Button as="a" href="/applications" size="sm" variant="ghost">
              <ArrowLeft size={14} /> Applications
            </Button>
            <Button
              onClick={() =>
                downloadJson('sample-features.json', [SAMPLE_FEATURE])
              }
              size="sm"
              variant="secondary"
            >
              <Download size={14} /> Sample
            </Button>
            <Button
              onClick={() =>
                downloadJson(
                  `${app.slug || 'application'}-features.json`,
                  features.map(
                    ({ name, slug, default_value, description }) => ({
                      name,
                      slug,
                      default_value,
                      description,
                    }),
                  ),
                )
              }
              size="sm"
              variant="secondary"
            >
              <Download size={14} /> Export
            </Button>
          </div>
        }
      />

      {superAdmin && (
        <div className="space-y-5">
          <Card padding="lg" variant="outlined">
            <p className="app-section-label text-desert">
              Authentication boundary
            </p>
            <h2 className="mt-2 text-xl font-medium">Cognito application</h2>
            <p className="app-secondary-copy mt-2 text-sm leading-6 text-text-secondary">
              Only signed ID tokens whose issuer matches this user pool and
              whose audience matches this app-client ID are accepted. Login
              handoffs are limited to the registered web origins and native
              schemes.
            </p>
            <form
              className="mt-5 grid gap-4 sm:grid-cols-2 sm:items-end"
              onSubmit={saveApplication}
            >
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
              <Field
                label="Login redirect origins"
                description="Comma-separated web origins, including scheme and port."
              >
                <Input
                  placeholder="https://app.example, http://localhost:5173"
                  value={redirectOrigins}
                  onChange={(event) => setRedirectOrigins(event.target.value)}
                />
              </Field>
              <Field
                label="Native redirect schemes"
                description="Comma-separated custom schemes without a colon."
              >
                <Input
                  placeholder="celesti"
                  value={redirectSchemes}
                  onChange={(event) => setRedirectSchemes(event.target.value)}
                />
              </Field>
              <Button
                className="sm:col-span-2"
                disabled={
                  !userPoolId.trim() || !clientId.trim() || savingApplication
                }
                loading={savingApplication}
                type="submit"
              >
                Save application configuration
              </Button>
            </form>
          </Card>

          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <Card padding="lg" variant="outlined">
              <p className="app-section-label text-desert">Feature policy</p>
              <h2 className="mt-2 text-xl font-medium">Register permission</h2>
              <form
                className="mt-5 grid gap-4 sm:grid-cols-[1fr_12rem_auto] sm:items-end"
                onSubmit={createFeature}
              >
                <Field label="Permission name" required>
                  <Input
                    placeholder="Account access"
                    required
                    value={featureName}
                    onChange={(event) => setFeatureName(event.target.value)}
                  />
                </Field>
                <Field label="Global default" required>
                  <Select
                    aria-label="Global default"
                    onChange={setFeatureDefault}
                    options={LEVEL_OPTIONS}
                    value={featureDefault}
                  />
                </Field>
                <Button
                  disabled={!featureName.trim() || savingFeature}
                  loading={savingFeature}
                  type="submit"
                >
                  <Plus size={15} /> Register
                </Button>
              </form>
            </Card>

            <Card padding="lg" variant="subtle">
              <div className="flex items-center gap-2 text-desert">
                <Upload size={15} />
                <p className="app-section-label text-inherit">Bulk import</p>
              </div>
              <h2 className="mt-2 text-xl font-medium">Import JSON</h2>
              <p className="app-secondary-copy mt-2 text-sm leading-6 text-text-secondary">
                Validate a permission manifest and add it to this application.
              </p>
              <Field
                className="mt-5"
                label="Permission manifest"
                description="JSON files only. Import validates the complete file before submitting."
                error={
                  importErrors.length
                    ? 'Resolve the validation issues below.'
                    : undefined
                }
              >
                <FileInput
                  accept="application/json,.json"
                  aria-label="Permission manifest"
                  disabled={importing}
                  onChange={handleFileChange}
                />
              </Field>
              {importing && (
                <p
                  className="app-secondary-copy mt-3 text-sm text-text-secondary"
                  role="status"
                >
                  Importing permissions…
                </p>
              )}
            </Card>
          </div>
        </div>
      )}

      {importErrors.length > 0 && (
        <Card
          className="border-terracotta/25 bg-terracotta/[0.045]"
          padding="md"
          variant="outlined"
        >
          <div role="alert" aria-live="assertive">
            <p className="font-medium text-terracotta">
              Import needs attention
            </p>
            <ul className="app-secondary-copy mt-2 list-disc space-y-1 pl-5 text-sm text-text-secondary">
              {importErrors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        </Card>
      )}

      <section
        aria-labelledby="permission-directory-title"
        className="space-y-5"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="app-section-label text-desert">Permission registry</p>
            <h2
              id="permission-directory-title"
              className="mt-2 text-xl font-medium"
            >
              {filteredFeatures.length}{' '}
              {filteredFeatures.length === 1 ? 'permission' : 'permissions'}
            </h2>
          </div>
          <SearchInput
            aria-label="Search permissions"
            className="w-full sm:w-72"
            onChange={(event) => setSearch(event.target.value)}
            onClear={() => setSearch('')}
            placeholder="Search permission or key"
            value={search}
          />
        </div>
        {filteredFeatures.length ? (
          <DataTable
            caption={`Feature permissions for ${app.name}`}
            columns={columns}
            data={filteredFeatures}
            getRowKey={(feature) => String(feature.id)}
          />
        ) : (
          <Empty
            title={search ? 'No matching permissions' : 'No permissions found'}
            description={
              search
                ? 'Clear or refine your search.'
                : 'Register the first permission to define this application’s authorization behavior.'
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
    </div>
  );
}
