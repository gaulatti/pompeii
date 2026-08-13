# Pompeii Service

NestJS-based authentication and authorization service.

## Protocols

- REST API (Fastify): port `HTTP_PORT` (default `3000`)
- private gRPC (`pompeii.authorization.v1.AuthorizationService`): port
  `GRPC_PORT` (deployment default `50087`)

## Database

The service is now PostgreSQL-oriented.

Supported DB config modes:

1. `DATABASE_URL` (preferred)
2. Local vars (`USE_LOCAL_DATABASE=true` + `DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD/DB_DATABASE`)
3. AWS Secrets Manager (`DB_CREDENTIALS`)

## Auth

- Cognito JWT validation via JWKS
- Required env: `AWS_REGION`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`
- `COGNITO_ALLOWED_CLIENT_IDS` accepts the comma-separated Auburndale,
  Angelina, Alcantara, and Celesti Cognito app client IDs submitted to gRPC.
- ID tokens (`token_use=id`) are enforced

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
