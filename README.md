# Pompeii Service

Centralized authn + authz + feature flag management plane.

## Architecture

- **Backend** — NestJS administration REST API plus private gRPC authorization API
- **Frontend** — React Router app (Vite dev server)
- **Auth** — AWS Cognito (same pool as alcantara)
- **Deploy** — Backend via Docker → GHCR → on-prem SSH; Frontend via npm build → S3 → CloudFront

## Deployment

The two GitHub Actions workflows mirror the established Auburndale and Mistify
deployment patterns:

- `frontend-deploy.yml` typechecks and builds the static React app, uploads it
  to S3, and invalidates the CloudFront entry point.
- `backend-deploy.yml` tests and builds one Docker image, pushes it to GHCR,
  and deploys it to the on-premises host over SSH. That single container runs
  both the REST administration API and the authorization gRPC service, exposed
  through `HTTP_PORT` and `GRPC_PORT`. Database migrations run before the
  process starts, and deployment succeeds only after both the REST health route
  and gRPC TCP listener are ready.

Both workflows run on pushes to `main` that touch their respective application
or workflow and may also be started manually with `workflow_dispatch`.

All commits must follow the Conventional Commits format, such as
`feat(auth): add service identity validation`. Running `npm install` at the
repository root installs the versioned Husky `commit-msg` hook. GitHub Actions
also validates every pushed commit and every pull request, so the policy is not
limited to an individual developer's local Git configuration.

Repository secrets required by the backend workflow are `DEPLOYMENT_TOKEN`,
`DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `COGNITO_USER_POOL_ID`,
`COGNITO_CLIENT_ID`, `COGNITO_ALLOWED_CLIENT_IDS`, and `DATABASE_URL`. Backend
variables are `HTTP_PORT`, `GRPC_PORT`, `AWS_REGION`, `LOGS_GROUP`, and
`ALLOWED_ORIGINS`; `AUTHZ_DECISION_CACHE_TTL_MS`,
`AUTHZ_DECISION_CACHE_MAX_ENTRIES`, `SERVICE_FQDN`, `ASSETS_BUCKET_NAME`, and
`DB_SSL` are optional.

The frontend workflow requires AWS credential secrets and the repository
variables `AWS_REGION`, `BUCKET_NAME`, `DISTRIBUTION_ID`, `VITE_API_FQDN`,
`VITE_FQDN`, `VITE_LOGIN_REDIRECT_ORIGINS`, `VITE_LOGIN_REDIRECT_SCHEMES`,
`VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_CLIENT_ID`, and
`VITE_USER_POOL_DOMAIN`.

## Dev Setup

```bash
# Start backend
docker compose up -d

# Start frontend (native, faster HMR)
cd frontend && npm run dev
```

Backend runs on `http://localhost:3187`, frontend on `http://localhost:5187`.

## Environment

Copy `.env.example` or use the existing `.env` files in `backend/` and `frontend/`.

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `COGNITO_USER_POOL_ID` | Cognito pool ID |
| `COGNITO_CLIENT_ID` | Cognito app client ID |
| `COGNITO_ALLOWED_CLIENT_IDS` | Comma-separated Auburndale, Angelina, Alcantara, and Celesti client IDs whose ID tokens client services may submit to gRPC, in addition to Pompeii's own client ID |
| `GRPC_PORT` | Private authorization gRPC port (default `50087`) |
| `AUTHZ_DECISION_CACHE_TTL_MS` | Allow/deny cache TTL in milliseconds (default `5000`) |
| `AUTHZ_DECISION_CACHE_MAX_ENTRIES` | Maximum in-memory authorization decisions retained per instance (default `10000`) |
| `VITE_API_PORT` | Backend port for local dev |
| `VITE_API_FQDN` | Backend FQDN for production |
| `VITE_FQDN` | Frontend FQDN for Cognito redirects |
| `VITE_LOGIN_REDIRECT_ORIGINS` | Comma-separated Auburndale, Angelina, Alcantara, and Celesti origins Pompeii may redirect to after login |
| `VITE_LOGIN_REDIRECT_SCHEMES` | Explicit native callback schemes Pompeii may redirect to (for example `celesti`) |

## Schema

Run `cd backend && npm run db:migrate` when deploying schema changes.

## Authorization

Client services request allow/deny decisions through the private
`pompeii.authorization.v1.AuthorizationService` gRPC API. The REST API is an
authenticated administration surface and does not expose an authorization
decision endpoint. The versioned contract is at
`backend/src/proto/authorization.proto`.

RBAC permissions are separate from application feature overrides. Roles may be
assigned globally or to a team; a team-scoped decision evaluates both its team
assignments and global assignments. Decisions are denied by default and cached
briefly.

Verified identities presented by client services are registered in Pompeii on
their first authorization request. Registration grants no permissions: an
administrator must assign an Auburndale, Angelina, Alcantara, Celesti, or custom
role in Governance before the client request is allowed.

The client application permission catalog and its default viewer/operator/admin
roles are installed by `20260812210000-add-client-application-permissions.js`.
Client services send their namespaced permission key and the end-user Cognito ID
token to the gRPC `Authorize` method; they fail closed when Pompeii denies or is
unavailable.

## Centralized login

Pompeii is the only user-facing login surface. Auburndale, Angelina, Alcantara,
and Celesti redirect unauthenticated browsers to `/login?returnTo=...` on the
Pompeii frontend. Pompeii validates the destination against
`VITE_LOGIN_REDIRECT_ORIGINS`, completes Cognito login, and returns the browser
to the client. The client then performs a transparent app-client OAuth exchange
against the existing Cognito SSO session; Cognito tokens never appear in the
redirect URL. Each client origin must remain registered as a callback URL on
its own Cognito app client.

## Superadmin

The RBAC migration maps the legacy owner of team `1` to a global
`platform-admin` assignment. Other legacy membership roles become team-scoped
system-role assignments once, during migration. Membership changes do not
modify RBAC assignments; new roles and mappings are configurable only through
the protected governance API.

## Team Filtering

Select a team in the header to scope Users and Applications views to that team.
