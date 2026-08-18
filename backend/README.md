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
  records. The app-client ID is unique. REST and gRPC tokens are rejected unless
  their issuer and `aud` claim match the registered pair.
- Web login origins and native callback schemes are stored on the same
  application record. `POST /authorization/login/resolve` is public, but it
  returns a handoff URL only when the requested destination matches one of
  those database-backed lists.
- ID tokens (`token_use=id`) are enforced

There is no backend Cognito environment variable or Secrets Manager field.
Before deploying this migration, populate both Cognito columns for the Pompeii
application record so the admin API can authenticate its own frontend.

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
