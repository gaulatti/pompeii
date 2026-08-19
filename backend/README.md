# Pompeii Service

NestJS-based authentication and authorization service.

## Protocols

- REST API (Fastify): fixed container port `3187`
- private gRPC (`pompeii.authorization.v1.AuthorizationService`): port
  `50087`

## Database

The service is now PostgreSQL-oriented.

Production loads `DATABASE_URL` and `ALLOWED_ORIGINS` from the object selected
by `UNIQUE_KEY` in `SECRET_ARN`. Secrets load
before both migrations and Nest startup. Docker Compose owns local backend
configuration: it provides PostgreSQL 17 and a single `DATABASE_URL`, waits for
the database health check, and applies migrations before starting Nest. No
backend env file is required for local development.
PostgreSQL transport settings belong in `DATABASE_URL`; append
`?sslmode=require` when the target requires SSL. Production does not force SSL
for databases whose connection URL does not request it.

## Auth

- Cognito JWT validation via JWKS
- Cognito user-pool and app-client IDs are managed on database `applications`
  records. Multiple applications may share a registered pool/client pair. REST
  and gRPC tokens are rejected unless their issuer and `aud` claim match a
  registered pair; gRPC additionally checks that the requested permission is
  owned by an application registered for that client.
- ID tokens (`token_use=id`) are enforced

The private gRPC service exposes `Authenticate` for active identity resolution
without an RBAC grant and `Authorize` for permission decisions. Identity-only
client products should not create placeholder permissions merely to obtain a
verified subject.

Each application owns its Cognito registration, roles, and permission catalog.
Roles can only map permissions from the same application. Client applications
own their login flow and send their end-user ID token to their backend; that
backend asks Pompeii for an authorization decision over gRPC.

There is no backend Cognito environment variable or Secrets Manager field.
The deployment workflow passes the existing public frontend Cognito variables
to a one-shot migration container. The self-registration migration creates or
updates Pompeii's own team and application record before replacing the running
service; those inputs are not retained in the backend runtime environment.

After the first verified identity signs in, run the **Bootstrap Platform
Administrator** GitHub Actions workflow with that active Pompeii user ID. The
guarded command creates the first global `platform-admin` assignment and an
administrative audit event. It is idempotent for the same user and refuses to
replace an existing administrator. All later role assignments use Pompeii's
governance UI/API.

## Setup

```bash
npm install
npm run build
```

## Run

```bash
npm run start:dev
```

## Migrations

```bash
npm run db:migrate
```

## Health endpoint

- `GET /authorization/health`

## Notes

- Team, membership, and permission management endpoints are available under `/authorization`.
- Feature context resolution is team-scoped to the application owner team.
