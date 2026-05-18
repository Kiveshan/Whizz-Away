# Whizz-Away — Claude Code Context

## Project Overview

Logistics SaaS platform (Node.js + React). Multi-tenant: single shared PostgreSQL DB, `company_reg_num` is the tenant key on every table. Branch: `kiveshan-saas`.

## Stack

- **Server**: Node.js (ES modules), Express, PostgreSQL (`pg` pool), JWT auth, Passport.js, AWS S3
- **Client**: React 18, React Router, Axios (`client/src/api.js`)
- **Auth**: JWT (2h expiry) in `Authorization: Bearer` header; decoded by `server/middleware/auth.js` → `req.user`
- **Deploy**: AWS Elastic Beanstalk + RDS

## Repo Layout

```
server/
  config/database.js       # pool + query() helper
  middleware/auth.js        # verifyToken, verifyAdminAccess
  models/                   # DB queries — always accept company_reg_num as last param
  controllers/              # Extract req.user.company_reg_num, pass to model
  routes/index.js           # All routes registered here
  utils/statementGenerator.js
  utils/subcontractorStatementGeneration.js
client/src/
  api.js                    # Axios instance with auth interceptor
  pages/                    # Feature pages
  components/               # Shared UI (FeatureGatedCard, Card, Modal…)
  hooks/                    # Custom React hooks
```

## Multi-Tenant Rules (critical)

Every model function must:
1. Accept `company_reg_num` as its last parameter
2. Include `WHERE company_reg_num = $N` on every SELECT
3. Include `AND company_reg_num = $N` on UPDATE/DELETE WHERE clauses
4. Include `company_reg_num` column in every INSERT

Every controller must pass `req.user.company_reg_num` to every model call.

Every route that touches tenant data must include `verifyToken` middleware.

**Pattern:**
```js
// Model
export const getAll = async (company_reg_num) => {
  return query(`SELECT * FROM table WHERE company_reg_num = $1`, [company_reg_num]);
};

// Controller
const items = await getAll(req.user.company_reg_num);

// Route
router.get("/api/items", verifyToken, getAllHandler);
```

## Key Files to Know

| File | Purpose |
|------|---------|
| `server/middleware/auth.js` | JWT verification; sets `req.user` |
| `server/config/secrets.js` | `JWT_SECRET` env var (must be set) |
| `server/routes/index.js` | All route registration |
| `server/utils/statementGenerator.js` | Monthly statement + aging analysis generation |
| `client/src/api.js` | Axios — 401 triggers `window.location.href = "/"` |
| `client/src/components/FeatureGatedCard.jsx` | Subscription-gated dashboard cards |

## Roles

| roleid | Access |
|--------|--------|
| 1 | Company admin |
| 2 | Controller |
| 3 | Finance clerk |
| 4 | Director |
| 7 | Super admin |
| 8 | Creditors |

## Database Migrations

Files in `server/database/migrations/` — run in order:
- `002`: Add `company_reg_num` to `m5_client`, `m5_trucks`, `m5_trailers`
- `005`: Add `company_reg_num` to all remaining business tables
- `006`: Fix `expense_types.company_reg_num` type (integer → varchar)

After adding columns, backfill then add NOT NULL. See migration files for step-by-step instructions.

## Environment Variables Required

```
JWT_SECRET          # 64-char hex, stable across restarts
RDS_HOSTNAME
RDS_USERNAME
RDS_PASSWORD
RDS_DB_NAME
RDS_PORT
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
S3_BUCKET_NAME
```

## Common Patterns

**Adding a new feature endpoint:**
1. Model in `server/models/<domain>/` — filter by `company_reg_num`
2. Controller in `server/controllers/<domain>/` — pass `req.user.company_reg_num`
3. Route in `server/routes/<domain>/` — always add `verifyToken`
4. Register route in `server/routes/index.js`

**Public endpoints** (no verifyToken): `/api/landing/stats`, auth routes

**Subscription gating**: Wrap dashboard cards in `<FeatureGatedCard featureKey="..." />`

## What NOT to Do

- Never remove `company_reg_num` filter from a model query
- Never add an endpoint to the `publicEndpoints` whitelist in `auth.js` unless it truly needs no auth
- Never use `window.location.href = "/"` redirects inside components (causes reload loops on the landing page if an API call 401s)
- Never run migrations 005/006 Step 2 (NOT NULL) before the backfill step returns 0 NULLs
