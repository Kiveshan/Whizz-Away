# app: client-whizz (the OG)

The original, client-specific Whizz Away app — single-tenant. This is the
**reference variant** the monorepo skeleton is derived from.

It is composed of:

- `client/` — React (react-scripts) frontend
- `server/` — Express API + Postgres
- `.platform/` — Elastic Beanstalk nginx config (moved into `server/` at deploy time)

## Run locally (from repo root)

```bash
npm run bootstrap      # installs packages/* + client + server (client/server
                       # are installed in isolation, NOT hoisted — CRA needs it)
npm run dev            # == dev:client-whizz — server + client together
```

> The CRA client is deliberately kept out of npm workspace hoisting: hoisting
> lifts `eslint-plugin-jest` to the repo root where react-scripts' bundled
> eslint can't resolve its `jest/globals` env, breaking the build. Only
> `packages/*` are hoisted workspaces.

## Deploy

`.github/workflows/deploy-staging.yaml` (branch `staging`) and
`deploy-main.yaml` (branch `main`) build `client/`, drop the build into
`server/public`, and ship `server/` to Elastic Beanstalk. Paths point at
`apps/client-whizz/…` after the monorepo restructure.

## Migration status

Today this app still owns all the shared logic. As the migration proceeds
(steps 2–4), shared models/controllers/services/UI move out into
`packages/core` and `packages/features`, and this app shrinks toward a thin
composition layer + a `variant-config` manifest — exactly like `apps/saas`
and future client apps.
