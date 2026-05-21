# Whizz-Away SaaS Manual Test Checklist

**Test password for all accounts:** `Test@1234`

Run seed first:
```bash
node --env-file=.env server/database/seed_saas_test.js
```

Cleanup when done:
```bash
node --env-file=.env server/database/seed_saas_test.js --cleanup
```

---

## 1. Authentication & Subscription Status Routing

### 1.1 — Active accounts route to the correct dashboard
| Login email | Expected redirect | Pass? |
|---|---|---|
| `bm.lite@test.whizz` | `/Dashboard` (Lite dashboard) | |
| `fc.lite@test.whizz` | `/FDashboard` | |
| `bm.prof@test.whizz` | `/Dashboard` | |
| `ctrl.prof@test.whizz` | `/ControllerDashboard` | |
| `dir.prof@test.whizz` | `/DirectorDashboard` | |
| `bm.grow@test.whizz` | `/Dashboard` | |
| `bm.ent@test.whizz` | `/Dashboard` | |
| `cred.ent@test.whizz` | `/CreditorsDashboard` | |
| `superadmin@whizzaway.test` | `/AdminDashboard` | |

### 1.2 — Trial account
| Action | Expected behaviour | Pass? |
|---|---|---|
| Login as `bm.trial@test.whizz` | Reaches dashboard | |
| Check banner | Trial banner visible with ≤7 days remaining countdown | |
| JWT contains `subscription_status: "trial"` | Inspect Network → `/api/auth/login` response | |

### 1.3 — Expired trial (inactive)
| Action | Expected behaviour | Pass? |
|---|---|---|
| Login as `bm.trexp@test.whizz` | Redirected to `/pending-activation` | |
| Cannot access any feature pages | Returns 403 or redirect | |

### 1.4 — Suspended account
| Action | Expected behaviour | Pass? |
|---|---|---|
| Login as `bm.susp@test.whizz` | Redirected to `/suspended` | |
| Employee `fc.susp@test.whizz` also blocked | Same `/suspended` redirect | |

### 1.5 — Cancelled account
| Action | Expected behaviour | Pass? |
|---|---|---|
| Login as `bm.canc@test.whizz` | Redirected to `/account-cancelled` | |

### 1.6 — Pending (no plan) account
| Action | Expected behaviour | Pass? |
|---|---|---|
| Login as `bm.pend@test.whizz` | Redirected to `/pending-activation` | |

---

## 2. Feature Gating — Dashboard Cards

Login as each Business Manager and verify locked/unlocked state of feature cards.

### 2.1 — Lite (`bm.lite@test.whizz`)
| Feature | Expected | Pass? |
|---|---|---|
| Instructions | **Unlocked** | |
| Assignment | **Unlocked** | |
| Invoice | **Unlocked** | |
| Statements | **Unlocked** | |
| Manage | **Unlocked** | |
| Add-ons | **Locked** (requires Professional) | |
| Analytics | **Locked** (requires Professional) | |
| Reports | **Locked** (requires Professional) | |
| Payroll | **Locked** (requires Growth) | |
| Biometric | **Locked** (requires Growth) | |
| VAT | **Locked** (requires Growth) | |
| Creditors | **Locked** (requires Enterprise) | |

### 2.2 — Professional (`bm.prof@test.whizz`)
| Feature | Expected | Pass? |
|---|---|---|
| Instructions, Assignment, Invoice, Statements, Manage | **Unlocked** | |
| Add-ons, Analytics, Reports | **Unlocked** | |
| Payroll | **Locked** (requires Growth) | |
| Biometric | **Locked** (requires Growth) | |
| VAT | **Locked** (requires Growth) | |
| Creditors | **Locked** (requires Enterprise) | |

### 2.3 — Growth (`bm.grow@test.whizz`)
| Feature | Expected | Pass? |
|---|---|---|
| Instructions → VAT (11 features) | **All Unlocked** | |
| Creditors | **Locked** (requires Enterprise) | |
| Priority Support | **Locked** (requires Enterprise) | |

### 2.4 — Enterprise (`bm.ent@test.whizz`)
| Feature | Expected | Pass? |
|---|---|---|
| All 13 features | **All Unlocked** | |
| Creditors card visible | Yes | |

---

## 3. Feature Gating — Backend API (403 checks)

Use browser DevTools Network tab or a REST client. All calls include the JWT from login.

### 3.1 — Lite blocks Professional features
| API call as `bm.lite@test.whizz` | Expected | Pass? |
|---|---|---|
| `GET /api/analytics/*` | 403 `FEATURE_NOT_AVAILABLE` | |
| `GET /api/reports/*` | 403 `FEATURE_NOT_AVAILABLE` | |
| `GET /api/addons/*` | 403 `FEATURE_NOT_AVAILABLE` | |

### 3.2 — Professional blocks Growth features
| API call as `bm.prof@test.whizz` | Expected | Pass? |
|---|---|---|
| `GET /api/wages/*` (payroll) | 403 `FEATURE_NOT_AVAILABLE` | |
| `GET /api/vat-recon/*` | 403 `FEATURE_NOT_AVAILABLE` | |

### 3.3 — Growth blocks Enterprise features
| API call as `bm.grow@test.whizz` | Expected | Pass? |
|---|---|---|
| `GET /api/subcontractors/*` or creditors endpoint | 403 `FEATURE_NOT_AVAILABLE` | |

---

## 4. Role-Based Plan Enforcement (Adding Employees)

Login as `bm.lite@test.whizz` and try to add employees via Manage → Employees.

### 4.1 — Lite plan role restrictions
| Role to add | Expected | Pass? |
|---|---|---|
| Finance Clerk (roleid=3) | **Allowed** (minimum: lite) | |
| Driver (roleid=5) | **Allowed** (no minimum) | |
| Controller (roleid=2) | 403 `PLAN_UPGRADE_REQUIRED` — requires Professional | |
| Director (roleid=4) | 403 `PLAN_UPGRADE_REQUIRED` — requires Professional | |
| Creditors Clerk (roleid=8) | 403 `PLAN_UPGRADE_REQUIRED` — requires Growth | |

### 4.2 — Professional plan role restrictions
Login as `bm.prof@test.whizz`:
| Role to add | Expected | Pass? |
|---|---|---|
| Controller, Director | **Allowed** | |
| Creditors Clerk (roleid=8) | 403 — requires Growth | |

### 4.3 — Growth / Enterprise
Login as `bm.grow@test.whizz` or `bm.ent@test.whizz`:
| Role to add | Expected | Pass? |
|---|---|---|
| Creditors Clerk (roleid=8) | **Allowed** | |

---

## 5. Usage Limits & Overage Warnings

### 5.1 — Lite at user limit (TEST-LITE-001, currently 2/2 active users)
Login as `bm.lite@test.whizz`, go to Manage → Employees → Add Employee:
| Action | Expected | Pass? |
|---|---|---|
| Add a new Finance Clerk | Request succeeds BUT response includes `usageWarning` object | |
| Warning message content | "You have reached your plan limit of 2 users. Adding this employee will incur an overage charge of R300/month." | |
| Employee is still created | Yes (overage is a warning, not a block) | |

### 5.2 — Lite at truck limit (TEST-OVER-001, 6/5 trucks already)
Login as `bm.over@test.whizz`, go to Manage → Trucks → Add Truck:
| Action | Expected | Pass? |
|---|---|---|
| Add a new truck | Succeeds with `usageWarning` about truck overage | |
| Warning message content | "You have reached your plan limit of 5 trucks. Adding this truck will incur an overage charge of R250/month." | |

### 5.3 — Enterprise has no limits
Login as `bm.ent@test.whizz`:
| Action | Expected | Pass? |
|---|---|---|
| Add employees up to 10+ | No warnings appear | |
| Add trucks up to 10+ | No warnings appear | |

---

## 6. Super Admin Panel

Login as `superadmin@whizzaway.test`:
| Action | Expected | Pass? |
|---|---|---|
| Redirected to `/AdminDashboard` | Yes | |
| Can see all test companies in company list | Yes (TEST-LITE-001 etc. visible) | |
| Can assign a plan to `TEST-PEND-001` | Success — triggers `plan_assigned` billing event | |
| Can suspend `TEST-PROF-001` | Sets subscription_status → `suspended` | |
| Can reactivate `TEST-SUSP-001` | Sets subscription_status → `active` | |
| Cannot access tenant data routes (no company_reg_num bypass) | 403 or scoped to admin | |

---

## 7. Subcontractor Truck Isolation

Login as `bm.prof@test.whizz` (has 8 own + 2 subcontractor trucks):
| Action | Expected | Pass? |
|---|---|---|
| Manage → Trucks list | Shows 8 trucks (subcontractor trucks excluded) | |
| Usage limit count | Counts 8 own trucks only (under 15 limit) | |
| Subcontractor trucks not in overage calculation | Confirmed via `checkTruckUsageLimits` | |

---

## 8. Tenant Data Isolation

Confirm no cross-tenant data leaks between any two active companies.
| Action | Expected | Pass? |
|---|---|---|
| Login as `bm.lite@test.whizz`, view clients | Only "Lite Client A" appears | |
| Login as `bm.prof@test.whizz`, view clients | Only "Pro Client A", "Pro Client B" appear | |
| Login as `bm.grow@test.whizz`, view trucks | Only 15 Growth trucks (KZN 201-215) appear | |
| Login as `bm.ent@test.whizz`, view trucks | Only 10 Enterprise trucks (EC 301-310) appear | |

---

## 9. Billing Events Audit Trail

Verify billing events were created (run in DB or via admin panel):
```sql
SELECT company_reg_num, event_type, old_value, new_value, performed_by, created_at
FROM billing_events
WHERE company_reg_num LIKE 'TEST-%'
ORDER BY created_at;
```
| Expected events | Pass? |
|---|---|
| TEST-LITE-001: `plan_assigned` | |
| TEST-PROF-001: `plan_assigned` | |
| TEST-GROW-001: `plan_upgraded` (professional → growth) | |
| TEST-ENT-001: `plan_assigned` | |
| TEST-TRIAL-001: `trial_started` | |
| TEST-TREXP-001: `trial_started` + `trial_expired` | |
| TEST-SUSP-001: `plan_assigned` + `account_suspended` | |
| TEST-CANC-001: `plan_assigned` + `account_suspended` (cancelled) | |

---

## 10. Company Usage Snapshots

```sql
SELECT company_reg_num, user_count, truck_count, overage_users, overage_trucks, overage_amount
FROM company_usage
WHERE company_reg_num LIKE 'TEST-%';
```
| Company | Expected | Pass? |
|---|---|---|
| TEST-LITE-001 | 2 users, 3 trucks, 0 overage | |
| TEST-PROF-001 | 6 users, 8 trucks, 0 overage | |
| TEST-GROW-001 | 9 users, 15 trucks, 0 overage | |
| TEST-ENT-001 | 11 users, 10 trucks, 0 overage | |
| TEST-OVER-001 | 3 users, 6 trucks, 1 overage_user, 1 overage_truck, R550 overage | |

---

## Quick DB Verification Queries

```sql
-- Check all test companies and their subscription state
SELECT company_reg_num, companyname, subscription_tier, subscription_status,
       trial_ends_at, setup_fee_paid
FROM usertable
WHERE company_reg_num LIKE 'TEST-%'
ORDER BY company_reg_num;

-- Count employees per test company
SELECT company_reg_num, roleid, COUNT(*) as count, bool_and(status) as all_active
FROM m5_employee
WHERE company_reg_num LIKE 'TEST-%'
GROUP BY company_reg_num, roleid
ORDER BY company_reg_num, roleid;

-- Count own trucks per test company (excluding subcontractors)
SELECT company_reg_num, COUNT(*) as own_trucks
FROM m5_trucks
WHERE company_reg_num LIKE 'TEST-%'
  AND (is_subcontractor = false OR is_subcontractor IS NULL)
GROUP BY company_reg_num;

-- Verify plan features are seeded
SELECT plan_key, COUNT(*) as feature_count
FROM plan_features
GROUP BY plan_key
ORDER BY plan_key;
-- Expected: enterprise=13, growth=11, professional=8, lite=5
```
