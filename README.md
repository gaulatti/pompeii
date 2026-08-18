# Pompeii Service

Centralized authn + authz + feature flag management plane.

## Architecture

- **Backend** — NestJS administration REST API plus private gRPC authorization API
- **Frontend** — React Router app (Vite dev server)
- **Auth** — AWS Cognito application registrations
- **Infrastructure** — standalone AWS CDK package owned by this repository
- **Deploy** — Backend via Docker → GHCR → on-prem SSH; Frontend via npm build → S3 → CloudFront

## Deployment

The two GitHub Actions workflows mirror the established Auburndale and Mistify
deployment patterns:

- `frontend-deploy.yml` typechecks and builds the static React app, uploads it
  to S3, and invalidates the CloudFront entry point.
- `backend-deploy.yml` tests and builds one Docker image, pushes it to GHCR,
  and deploys it to the on-premises host over SSH. That single container runs
  both the REST administration API and the authorization gRPC service on fixed
  internal ports `3187` and `50087`. Database migrations run before the
  process starts, and deployment succeeds only after both the REST health route
  and gRPC TCP listener are ready.

Both workflows run on pushes to `main` that touch their respective application
or workflow and may also be started manually with `workflow_dispatch`.

The [`infrastructure`](./infrastructure) package provisions Pompeii's private
frontend bucket, CloudFront distribution, Route 53 aliases and certificate,
`/services/pompeii` log group, and scoped GitHub frontend deployment user.
It is self-contained and does not depend on Macondo or any private repository.

All commits must follow the Conventional Commits format, such as
`feat(auth): add service identity validation`. Running `npm install` at the
repository root installs the versioned Husky `commit-msg` hook. GitHub Actions
also validates every pushed commit and every pull request, so the policy is not
limited to an individual developer's local Git configuration.

Repository secrets required by the backend workflow are `DEPLOYMENT_TOKEN`,
`DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `SECRET_ARN`, and `UNIQUE_KEY`.
Backend runtime variables are only deployment coordinates: `HTTP_PORT`,
`GRPC_PORT`, `AWS_REGION`, and `LOGS_GROUP`. The deployment also reuses the
public frontend variables `VITE_COGNITO_USER_POOL_ID` and
`VITE_COGNITO_CLIENT_ID` as inputs to a one-shot database migration container.
They are not retained in the long-running backend.

`SECRET_ARN` identifies the Secrets Manager entry and `UNIQUE_KEY` selects the
Pompeii object inside it. That object contains only `DATABASE_URL` and
`ALLOWED_ORIGINS`. It is loaded before database
migrations or Nest startup; production fails closed when it is unavailable or
incomplete. In production, `DATABASE_URL` always comes from this entry and
cannot be overridden by a container variable. Cognito user-pool and app-client
IDs are application registry data stored in PostgreSQL.

Example Secrets Manager shape (values are illustrative):

```json
{
  "pompeii": {
    "DATABASE_URL": "postgres://...",
    "ALLOWED_ORIGINS": "https://pompeii.example"
  }
}
```

The frontend workflow requires AWS credential secrets and the repository
variables `AWS_REGION`, `BUCKET_NAME`, `DISTRIBUTION_ID`, `VITE_API_FQDN`,
`VITE_FQDN`, `VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_CLIENT_ID`, and
`VITE_USER_POOL_DOMAIN`. Each client owns its own Cognito callback and login
configuration.

## Dev Setup

```bash
# Start backend
docker compose up -d

# Start frontend (native, faster HMR)
cd frontend && npm run dev
```

Backend runs on `http://localhost:3187`, frontend on `http://localhost:5187`.

## Environment

Only the public Cognito identifiers needed to initiate browser login belong in
a local environment file:

```bash
cp frontend/.env.example frontend/.env
```

Docker Compose owns all local backend configuration. It starts a private
PostgreSQL 17 container, supplies the backend connection URL, waits for
PostgreSQL to become healthy, runs migrations, and then starts the backend. The
local browser origin is an application default. PostgreSQL data persists in the
`pompeii-local_postgres-data` named volume.
The minimal backend `.env.example` documents the three Secrets Manager locator
inputs used by deployment: `AWS_REGION`, `SECRET_ARN`, and `UNIQUE_KEY`.
Compose does not consume that file. Production receives `DATABASE_URL` and
`ALLOWED_ORIGINS` exclusively from the selected Secrets Manager object.

The local frontend file contains exactly three public values:
`VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_CLIENT_ID`, and
`VITE_USER_POOL_DOMAIN`. Local API URLs, ports, PostgreSQL,
cache limits, and backend mode are defaults or Compose-owned values and do not
belong in that file.

## Schema

Run `cd backend && npm run db:migrate` when deploying schema changes.

Each application row must have both `cognito_user_pool_id` and
`cognito_client_id` populated before its tokens can be accepted. The
`20260818043000-seed-pompeii-application.js` migration idempotently creates or
updates Pompeii's own team and application record from the deployment-only
inputs. Once access is available, administrators manage client applications
from the Applications screen.

## Authorization

Client services request allow/deny decisions through the private
`pompeii.authorization.v1.AuthorizationService` gRPC API. The REST API is an
authenticated administration surface and does not expose an authorization
decision endpoint. The versioned contract is at
`backend/src/proto/authorization.proto`.

RBAC roles and permissions belong to an application. A database constraint
prevents a role from mapping a permission owned by another application. Roles
may be assigned globally or to a team; a team-scoped decision evaluates both
its team assignments and global assignments. Decisions are denied by default
and cached briefly.

Verified identities presented by client services are registered in Pompeii on
their first authorization request. Registration grants no permissions: an
administrator must register the application catalog and assign one of its roles
in Governance before the client request is allowed.

Client application permission catalogs and roles are registered by an
administrator from the Applications and Governance screens. Catalogs can be
entered individually or imported as JSON or CSV. Pompeii never hardcodes
external service permissions or roles.
Client services send their namespaced permission key and the end-user Cognito ID
token to the gRPC `Authorize` method; they fail closed when Pompeii denies or is
unavailable.

Cognito user-pool and app-client IDs are managed in the `applications`
registry, not backend runtime configuration. Both REST and gRPC accept a signed
ID token only when its issuer matches `applications.cognito_user_pool_id` and
its `aud` claim matches `applications.cognito_client_id`. Applications may
share a Cognito registration; gRPC still requires the requested permission to
belong to an application registered for that client. New applications require
both values, and protected application administration can rotate them.

The schema migration adds both columns without guessing values. A later
self-registration migration supplies Pompeii's own values during deployment;
other client applications are registered through the protected administration
surface. An unconfigured application is deliberately denied.

Each client application owns its login flow and Cognito callback configuration.
After login, its frontend sends the ID token to its own backend. The backend
forwards that token and a registered permission key to Pompeii over gRPC.
Pompeii does not broker redirects or retain client redirect origins/schemes.

## Superadmin

The RBAC migration maps the legacy owner of team `1` to a global
`platform-admin` assignment. Other legacy membership roles become team-scoped
system-role assignments once, during migration. Membership changes do not
modify RBAC assignments; new roles and mappings are configurable only through
the protected governance API.

On a clean database there is no legacy owner. After the first verified identity
signs in, run the **Bootstrap Platform Administrator** GitHub Actions workflow
with that active Pompeii user ID. Its guarded CLI creates the first global
`platform-admin` assignment transactionally, records an administrative audit
event, is idempotent for the same user, and refuses to replace an existing
administrator. It is the only operator bootstrap path; do not insert role
assignments manually. All later assignments use Pompeii Governance.

## Team Filtering

Select a team in the header to scope Users and Applications views to that team.
