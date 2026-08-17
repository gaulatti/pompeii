# Browser testing

Local Docker Compose runs with guarded test authentication. Start it with
`docker compose up --build`, then open `http://localhost:5187`. The frontend
automatically obtains a signed test token from `GET /__test/session`; no login,
cookie injection, or Cognito account is required.

Agents must test the real browser UI and authenticated API path. Do not mock the
frontend API. `AUTH_MODE=test` is local-only, refuses `NODE_ENV=production`, and
requires a 32+ character `TEST_AUTH_SECRET`. Production continues to use
Cognito. Run `npm test -- --runInBand` and `npm run build` in `backend`, plus
`npm run typecheck` and `npm run build` in `frontend`, after auth changes.
