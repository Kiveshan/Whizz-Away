/**
 * SaaS Test Seed — Whizz-Away
 *
 * Creates isolated test companies covering every plan tier, subscription status,
 * role type, and edge case needed for manual QA of the SaaS implementation.
 *
 * Run:
 *   node --env-file=.env server/database/seed_saas_test.js
 *
 * Universal test password for ALL accounts: Test@1234
 *
 * To wipe seed data:
 *   node --env-file=.env server/database/seed_saas_test.js --cleanup
 */

import { pool } from "../config/database.js";
import bcrypt from "bcrypt";

// ─── Config ──────────────────────────────────────────────────────────────────

const TEST_PASSWORD = "Test@1234";
const CLEANUP_FLAG  = process.argv.includes("--cleanup");

// All test company_reg_num values start with "TEST-" for easy identification/cleanup
const TEST_COMPANIES = [
  "TEST-LITE-001",
  "TEST-PROF-001",
  "TEST-GROW-001",
  "TEST-ENT-001",
  "TEST-TRIAL-001",
  "TEST-TREXP-001",
  "TEST-SUSP-001",
  "TEST-CANC-001",
  "TEST-PEND-001",
  "TEST-OVER-001",
];

const SUPER_ADMIN_EMAIL = "superadmin@whizzaway.test";

// ─── Cleanup ─────────────────────────────────────────────────────────────────

async function cleanup(client) {
  console.log("Cleaning up seed data...");
  const placeholders = TEST_COMPANIES.map((_, i) => `$${i + 1}`).join(", ");

  await client.query(`DELETE FROM billing_events   WHERE company_reg_num IN (${placeholders})`, TEST_COMPANIES);
  await client.query(`DELETE FROM company_usage    WHERE company_reg_num IN (${placeholders})`, TEST_COMPANIES);
  await client.query(`DELETE FROM m5_trucks        WHERE company_reg_num IN (${placeholders})`, TEST_COMPANIES);
  await client.query(`DELETE FROM m5_client        WHERE company_reg_num IN (${placeholders})`, TEST_COMPANIES);
  await client.query(`DELETE FROM m5_employee      WHERE company_reg_num IN (${placeholders})`, TEST_COMPANIES);
  await client.query(`DELETE FROM usertable        WHERE company_reg_num IN (${placeholders})`, TEST_COMPANIES);
  await client.query(`DELETE FROM usertable        WHERE email = $1`, [SUPER_ADMIN_EMAIL]);

  console.log("Seed data removed.");
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function insertCompany(client, {
  company_reg_num, companyname, roleid = 1, status = "active",
  subscription_tier, subscription_status, trial_ends_at = null,
  setup_fee_paid = true, plan_approved_by = "seed@whizzaway.test",
  plan_notes = null,
}) {
  await client.query(
    `INSERT INTO usertable (
      companyname, company_reg_num, dateofreg, status, roleid,
      vat_reg_num, account_num, name_of_acc, bank, branch, branch_code,
      address, suburb,
      subscription_tier, subscription_status, trial_ends_at,
      setup_fee_paid, plan_approved_by, plan_notes
    ) VALUES (
      $1, $2, CURRENT_DATE, $3, $4,
      '4520123456', '62012345678', $1, 'FNB', 'Sandton', '251655',
      '1 Test Street', 'Sandton',
      $5, $6, $7,
      $8, $9, $10
    )`,
    [
      companyname, company_reg_num, status, roleid,
      subscription_tier, subscription_status, trial_ends_at,
      setup_fee_paid, plan_approved_by, plan_notes,
    ]
  );
}

async function insertEmployee(client, {
  name, surname, email, hashedPassword, cellnum = "0821234567",
  company_reg_num, roleid, status = true, base_salary = null,
}) {
  await client.query(
    `INSERT INTO m5_employee (
      name, surname, email, password, cellnum,
      company_reg_num, roleid, status, base_salary
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [name, surname, email, hashedPassword, cellnum, company_reg_num, roleid, status, base_salary]
  );
}

async function insertTruck(client, { truckregnum, model, vin_num, company_reg_num, is_subcontractor = false, status = true }) {
  await client.query(
    `INSERT INTO m5_trucks (truckregnum, model, vin_num, trailersize, status, is_subcontractor, company_reg_num)
     VALUES ($1, $2, $3, 'Flat Deck', $4, $5, $6)`,
    [truckregnum, model, vin_num, status, is_subcontractor, company_reg_num]
  );
}

async function insertClient(client, { clientname, representative, email, company_reg_num }) {
  await client.query(
    `INSERT INTO m5_client (client, representative, email, companyaddress, city, status, company_reg_num)
     VALUES ($1, $2, $3, '10 Commerce Drive', 'Johannesburg', true, $4)`,
    [clientname, representative, email, company_reg_num]
  );
}

async function insertBillingEvent(client, { company_reg_num, event_type, old_value = null, new_value, performed_by = "seed@whizzaway.test", notes = null }) {
  await client.query(
    `INSERT INTO billing_events (company_reg_num, event_type, old_value, new_value, performed_by, notes)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [company_reg_num, event_type, old_value, new_value, performed_by, notes]
  );
}

async function insertUsageSnapshot(client, { company_reg_num, user_count, truck_count, overage_users = 0, overage_trucks = 0, overage_amount = 0 }) {
  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  firstOfMonth.setHours(0, 0, 0, 0);
  await client.query(
    `INSERT INTO company_usage (company_reg_num, snapshot_month, user_count, truck_count, overage_users, overage_trucks, overage_amount)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (company_reg_num, snapshot_month) DO UPDATE
       SET user_count = EXCLUDED.user_count, truck_count = EXCLUDED.truck_count,
           overage_users = EXCLUDED.overage_users, overage_trucks = EXCLUDED.overage_trucks,
           overage_amount = EXCLUDED.overage_amount`,
    [company_reg_num, firstOfMonth, user_count, truck_count, overage_users, overage_trucks, overage_amount]
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Always wipe existing seed data first — makes the script fully idempotent
    await cleanup(client);

    if (CLEANUP_FLAG) {
      await client.query("COMMIT");
      return;
    }

    const hash = await bcrypt.hash(TEST_PASSWORD, 10);
    console.log("Seeding test companies...\n");

    // ═══════════════════════════════════════════════════════════════════════
    // 1. LITE — Active subscription, at user limit (2/2), under truck limit
    // ═══════════════════════════════════════════════════════════════════════
    {
      const crn = "TEST-LITE-001";
      await insertCompany(client, {
        company_reg_num: crn, companyname: "Lite Haulage (Test)",
        subscription_tier: "lite", subscription_status: "active",
        plan_notes: "Seeded: Lite active, at user cap",
      });
      // Business Manager (roleid=1) — counts toward user limit
      await insertEmployee(client, { name: "Lebo", surname: "Dlamini", email: "bm.lite@test.whizz", hashedPassword: hash, company_reg_num: crn, roleid: 1 });
      // Finance Clerk (roleid=3) — 2nd user = AT LIMIT
      await insertEmployee(client, { name: "Thandi", surname: "Nkosi", email: "fc.lite@test.whizz", hashedPassword: hash, company_reg_num: crn, roleid: 3 });
      // Driver (roleid=5) — inactive, doesn't count toward limit
      await insertEmployee(client, { name: "Sipho", surname: "Mokoena", email: "driver.lite@test.whizz", hashedPassword: hash, company_reg_num: crn, roleid: 5, status: false });
      // 3 trucks (under the 5-truck limit)
      await insertTruck(client, { truckregnum: "CA 101 LT", model: "Volvo FH", vin_num: "VIN-LT-001", company_reg_num: crn });
      await insertTruck(client, { truckregnum: "CA 102 LT", model: "DAF XF", vin_num: "VIN-LT-002", company_reg_num: crn });
      await insertTruck(client, { truckregnum: "CA 103 LT", model: "Mercedes Actros", vin_num: "VIN-LT-003", company_reg_num: crn });
      await insertClient(client, { clientname: "Lite Client A", representative: "John Smith", email: "clienta@lite.test", company_reg_num: crn });
      await insertBillingEvent(client, { company_reg_num: crn, event_type: "plan_assigned", new_value: "lite", notes: "Initial seed" });
      await insertUsageSnapshot(client, { company_reg_num: crn, user_count: 2, truck_count: 3 });
      console.log("✓ TEST-LITE-001 — Lite, active, at user limit (2/2)");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 2. PROFESSIONAL — Active, normal usage
    // ═══════════════════════════════════════════════════════════════════════
    {
      const crn = "TEST-PROF-001";
      await insertCompany(client, {
        company_reg_num: crn, companyname: "Pro Logistics (Test)",
        subscription_tier: "professional", subscription_status: "active",
        plan_notes: "Seeded: Professional active",
      });
      await insertEmployee(client, { name: "Kagiso", surname: "Sithole", email: "bm.prof@test.whizz", hashedPassword: hash, company_reg_num: crn, roleid: 1 });
      await insertEmployee(client, { name: "Naledi", surname: "Tau", email: "fc.prof@test.whizz", hashedPassword: hash, company_reg_num: crn, roleid: 3 });
      await insertEmployee(client, { name: "Ruan", surname: "Botha", email: "ctrl.prof@test.whizz", hashedPassword: hash, company_reg_num: crn, roleid: 2 });
      await insertEmployee(client, { name: "Zanele", surname: "Khumalo", email: "dir.prof@test.whizz", hashedPassword: hash, company_reg_num: crn, roleid: 4 });
      await insertEmployee(client, { name: "Moses", surname: "Dube", email: "driver1.prof@test.whizz", hashedPassword: hash, company_reg_num: crn, roleid: 5, base_salary: 12000 });
      await insertEmployee(client, { name: "Lucky", surname: "Mkhize", email: "driver2.prof@test.whizz", hashedPassword: hash, company_reg_num: crn, roleid: 5, base_salary: 12000 });
      // 8 own trucks + 2 subcontractor trucks
      for (let i = 1; i <= 8; i++) {
        await insertTruck(client, { truckregnum: `GP ${100 + i} PR`, model: "Scania R450", vin_num: `VIN-PR-00${i}`, company_reg_num: crn });
      }
      await insertTruck(client, { truckregnum: "NW 501 PR", model: "MAN TGX", vin_num: "VIN-PR-SUB1", company_reg_num: crn, is_subcontractor: true });
      await insertTruck(client, { truckregnum: "NW 502 PR", model: "MAN TGX", vin_num: "VIN-PR-SUB2", company_reg_num: crn, is_subcontractor: true });
      await insertClient(client, { clientname: "Pro Client A", representative: "Sarah Jones", email: "clienta@prof.test", company_reg_num: crn });
      await insertClient(client, { clientname: "Pro Client B", representative: "Mike Lee", email: "clientb@prof.test", company_reg_num: crn });
      await insertBillingEvent(client, { company_reg_num: crn, event_type: "plan_assigned", new_value: "professional" });
      await insertUsageSnapshot(client, { company_reg_num: crn, user_count: 6, truck_count: 8 });
      console.log("✓ TEST-PROF-001 — Professional, active, full role set");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 3. GROWTH — Active, payroll/vat/biometric features unlocked
    // ═══════════════════════════════════════════════════════════════════════
    {
      const crn = "TEST-GROW-001";
      await insertCompany(client, {
        company_reg_num: crn, companyname: "Growth Transport (Test)",
        subscription_tier: "growth", subscription_status: "active",
        plan_notes: "Seeded: Growth active",
      });
      await insertEmployee(client, { name: "Ayanda", surname: "Zulu", email: "bm.grow@test.whizz", hashedPassword: hash, company_reg_num: crn, roleid: 1 });
      await insertEmployee(client, { name: "Pieter", surname: "van Wyk", email: "fc.grow@test.whizz", hashedPassword: hash, company_reg_num: crn, roleid: 3 });
      await insertEmployee(client, { name: "Mpho", surname: "Molefe", email: "ctrl.grow@test.whizz", hashedPassword: hash, company_reg_num: crn, roleid: 2 });
      await insertEmployee(client, { name: "Fatima", surname: "Patel", email: "dir.grow@test.whizz", hashedPassword: hash, company_reg_num: crn, roleid: 4 });
      await insertEmployee(client, { name: "Jabu", surname: "Ndlovu", email: "yard.grow@test.whizz", hashedPassword: hash, company_reg_num: crn, roleid: 9 });
      for (let i = 1; i <= 5; i++) {
        await insertEmployee(client, { name: `Driver${i}`, surname: "Growth", email: `driver${i}.grow@test.whizz`, hashedPassword: hash, company_reg_num: crn, roleid: 5, base_salary: 13000 });
      }
      for (let i = 1; i <= 15; i++) {
        await insertTruck(client, { truckregnum: `KZN ${200 + i} GR`, model: "Volvo FH16", vin_num: `VIN-GR-${i.toString().padStart(3, "0")}`, company_reg_num: crn });
      }
      await insertClient(client, { clientname: "Growth Client A", representative: "Tina Brown", email: "clienta@grow.test", company_reg_num: crn });
      await insertClient(client, { clientname: "Growth Client B", representative: "Alan Green", email: "clientb@grow.test", company_reg_num: crn });
      await insertClient(client, { clientname: "Growth Client C", representative: "Nomsa Dlamini", email: "clientc@grow.test", company_reg_num: crn });
      await insertBillingEvent(client, { company_reg_num: crn, event_type: "plan_upgraded", old_value: "professional", new_value: "growth", notes: "Upgraded for payroll feature" });
      await insertUsageSnapshot(client, { company_reg_num: crn, user_count: 9, truck_count: 15 });
      console.log("✓ TEST-GROW-001 — Growth, active, payroll/VAT/biometric unlocked");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 4. ENTERPRISE — Active, all features including creditors
    // ═══════════════════════════════════════════════════════════════════════
    {
      const crn = "TEST-ENT-001";
      await insertCompany(client, {
        company_reg_num: crn, companyname: "Enterprise Freight (Test)",
        subscription_tier: "enterprise", subscription_status: "active",
        plan_notes: "Seeded: Enterprise active — all features",
      });
      await insertEmployee(client, { name: "Nomvula", surname: "Mahlangu", email: "bm.ent@test.whizz", hashedPassword: hash, company_reg_num: crn, roleid: 1 });
      await insertEmployee(client, { name: "Gareth", surname: "Hopkins", email: "fc.ent@test.whizz", hashedPassword: hash, company_reg_num: crn, roleid: 3 });
      await insertEmployee(client, { name: "Andile", surname: "Ngcobo", email: "ctrl.ent@test.whizz", hashedPassword: hash, company_reg_num: crn, roleid: 2 });
      await insertEmployee(client, { name: "Chantelle", surname: "Erasmus", email: "dir.ent@test.whizz", hashedPassword: hash, company_reg_num: crn, roleid: 4 });
      // Creditors Clerk — only available on Enterprise
      await insertEmployee(client, { name: "Thabo", surname: "Mokoena", email: "cred.ent@test.whizz", hashedPassword: hash, company_reg_num: crn, roleid: 8 });
      await insertEmployee(client, { name: "Precious", surname: "Cele", email: "yard.ent@test.whizz", hashedPassword: hash, company_reg_num: crn, roleid: 9 });
      for (let i = 1; i <= 5; i++) {
        await insertEmployee(client, { name: `EnterpriseDriver${i}`, surname: "ENT", email: `driver${i}.ent@test.whizz`, hashedPassword: hash, company_reg_num: crn, roleid: 5, base_salary: 15000 });
      }
      for (let i = 1; i <= 10; i++) {
        await insertTruck(client, { truckregnum: `EC ${300 + i} EN`, model: "Mercedes Actros", vin_num: `VIN-EN-${i.toString().padStart(3, "0")}`, company_reg_num: crn });
      }
      await insertClient(client, { clientname: "ENT Client A", representative: "Rosy Adams", email: "clienta@ent.test", company_reg_num: crn });
      await insertClient(client, { clientname: "ENT Client B", representative: "Henry Fox", email: "clientb@ent.test", company_reg_num: crn });
      await insertBillingEvent(client, { company_reg_num: crn, event_type: "plan_assigned", new_value: "enterprise", notes: "Enterprise from launch" });
      await insertUsageSnapshot(client, { company_reg_num: crn, user_count: 11, truck_count: 10 });
      console.log("✓ TEST-ENT-001 — Enterprise, active, creditors clerk included");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 5. TRIAL — Professional, on active trial (expires in 7 days)
    // ═══════════════════════════════════════════════════════════════════════
    {
      const crn = "TEST-TRIAL-001";
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 7);
      await insertCompany(client, {
        company_reg_num: crn, companyname: "Trial Transport (Test)",
        subscription_tier: "professional", subscription_status: "trial",
        trial_ends_at: trialEnd, setup_fee_paid: false,
        plan_notes: "Seeded: Professional trial — 7 days remaining",
      });
      await insertEmployee(client, { name: "Busi", surname: "Hadebe", email: "bm.trial@test.whizz", hashedPassword: hash, company_reg_num: crn, roleid: 1 });
      await insertEmployee(client, { name: "Trevor", surname: "Nkuna", email: "fc.trial@test.whizz", hashedPassword: hash, company_reg_num: crn, roleid: 3 });
      await insertTruck(client, { truckregnum: "LP 401 TR", model: "Scania P360", vin_num: "VIN-TR-001", company_reg_num: crn });
      await insertClient(client, { clientname: "Trial Client A", representative: "Craig Nel", email: "clienta@trial.test", company_reg_num: crn });
      await insertBillingEvent(client, { company_reg_num: crn, event_type: "trial_started", new_value: "professional", notes: "7-day trial started" });
      await insertUsageSnapshot(client, { company_reg_num: crn, user_count: 2, truck_count: 1 });
      console.log("✓ TEST-TRIAL-001 — Professional, trial (7 days left), trial banner should show");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 6. TRIAL EXPIRED — Lite, trial ended (should redirect to pending-activation)
    // ═══════════════════════════════════════════════════════════════════════
    {
      const crn = "TEST-TREXP-001";
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() - 3); // expired 3 days ago
      await insertCompany(client, {
        company_reg_num: crn, companyname: "Expired Trial Co (Test)",
        subscription_tier: "lite", subscription_status: "inactive",
        trial_ends_at: trialEnd, setup_fee_paid: false,
        plan_notes: "Seeded: Lite trial expired 3 days ago",
      });
      await insertEmployee(client, { name: "Dumisani", surname: "Sibiya", email: "bm.trexp@test.whizz", hashedPassword: hash, company_reg_num: crn, roleid: 1 });
      await insertBillingEvent(client, { company_reg_num: crn, event_type: "trial_started", new_value: "lite" });
      await insertBillingEvent(client, { company_reg_num: crn, event_type: "trial_expired", old_value: "trial", new_value: "inactive", notes: "Trial not converted" });
      console.log("✓ TEST-TREXP-001 — Lite, trial expired, login should route to /pending-activation");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 7. SUSPENDED — Professional, billing suspended
    // ═══════════════════════════════════════════════════════════════════════
    {
      const crn = "TEST-SUSP-001";
      await insertCompany(client, {
        company_reg_num: crn, companyname: "Suspended Hauliers (Test)",
        subscription_tier: "professional", subscription_status: "suspended",
        plan_notes: "Seeded: Payment failure — suspended",
      });
      await insertEmployee(client, { name: "Sbu", surname: "Mthembu", email: "bm.susp@test.whizz", hashedPassword: hash, company_reg_num: crn, roleid: 1 });
      await insertEmployee(client, { name: "Lindiwe", surname: "Vilakazi", email: "fc.susp@test.whizz", hashedPassword: hash, company_reg_num: crn, roleid: 3 });
      await insertBillingEvent(client, { company_reg_num: crn, event_type: "plan_assigned", new_value: "professional" });
      await insertBillingEvent(client, { company_reg_num: crn, event_type: "account_suspended", old_value: "active", new_value: "suspended", performed_by: "system", notes: "Payment failed after 3 retries" });
      console.log("✓ TEST-SUSP-001 — Professional, suspended, login should route to /suspended");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 8. CANCELLED — Growth, user-requested cancellation
    // ═══════════════════════════════════════════════════════════════════════
    {
      const crn = "TEST-CANC-001";
      await insertCompany(client, {
        company_reg_num: crn, companyname: "Cancelled Cargo (Test)",
        subscription_tier: "growth", subscription_status: "cancelled",
        plan_notes: "Seeded: User cancelled subscription",
      });
      await insertEmployee(client, { name: "Siphamandla", surname: "Nzama", email: "bm.canc@test.whizz", hashedPassword: hash, company_reg_num: crn, roleid: 1 });
      await insertBillingEvent(client, { company_reg_num: crn, event_type: "plan_assigned", new_value: "growth" });
      await insertBillingEvent(client, { company_reg_num: crn, event_type: "account_suspended", old_value: "active", new_value: "cancelled", performed_by: "bm.canc@test.whizz", notes: "User requested cancellation" });
      console.log("✓ TEST-CANC-001 — Growth, cancelled, login should route to /account-cancelled");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 9. PENDING ACTIVATION — No plan assigned yet (new signup, awaiting admin)
    // ═══════════════════════════════════════════════════════════════════════
    {
      const crn = "TEST-PEND-001";
      await insertCompany(client, {
        company_reg_num: crn, companyname: "Pending Parcels (Test)",
        subscription_tier: "none", subscription_status: "inactive",
        setup_fee_paid: false, plan_approved_by: null,
        plan_notes: "Requested plan: professional",
      });
      await insertEmployee(client, { name: "Nkosi", surname: "Ntanzi", email: "bm.pend@test.whizz", hashedPassword: hash, company_reg_num: crn, roleid: 1 });
      console.log("✓ TEST-PEND-001 — No plan, inactive, login should route to /pending-activation");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 10. OVERAGE — Lite, OVER user limit (3/2) AND truck limit (6/5)
    // ═══════════════════════════════════════════════════════════════════════
    {
      const crn = "TEST-OVER-001";
      await insertCompany(client, {
        company_reg_num: crn, companyname: "Overage Operators (Test)",
        subscription_tier: "lite", subscription_status: "active",
        plan_notes: "Seeded: Lite — over user AND truck limit for overage testing",
      });
      await insertEmployee(client, { name: "Vusi", surname: "Mkhize", email: "bm.over@test.whizz", hashedPassword: hash, company_reg_num: crn, roleid: 1 });
      await insertEmployee(client, { name: "Zanele", surname: "Shabalala", email: "fc.over@test.whizz", hashedPassword: hash, company_reg_num: crn, roleid: 3 });
      // 3rd active employee = 1 over the Lite limit of 2 → overage warning when adding next
      await insertEmployee(client, { name: "Koos", surname: "Pretorius", email: "fc2.over@test.whizz", hashedPassword: hash, company_reg_num: crn, roleid: 3 });
      // 6 own trucks = 1 over the Lite limit of 5 → overage warning
      for (let i = 1; i <= 6; i++) {
        await insertTruck(client, { truckregnum: `WC ${400 + i} OV`, model: "Hino 700", vin_num: `VIN-OV-${i.toString().padStart(3, "0")}`, company_reg_num: crn });
      }
      await insertBillingEvent(client, { company_reg_num: crn, event_type: "plan_assigned", new_value: "lite" });
      // Snapshot reflects current overage
      await insertUsageSnapshot(client, { company_reg_num: crn, user_count: 3, truck_count: 6, overage_users: 1, overage_trucks: 1, overage_amount: 550 });
      console.log("✓ TEST-OVER-001 — Lite, active, 3/2 users & 6/5 trucks (overage scenario)");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SUPER ADMIN — Whizz-Away internal staff (roleid=7, in usertable)
    // ═══════════════════════════════════════════════════════════════════════
    {
      await client.query(
        `INSERT INTO usertable (
          name, surname, email, password,
          companyname, company_reg_num, dateofreg, status, roleid,
          account_num, name_of_acc, bank, branch, branch_code,
          address, suburb,
          subscription_tier, subscription_status, setup_fee_paid
        ) VALUES (
          'Whizz', 'Admin', $1, $2,
          'Whizz-Away Internal', 'WHIZZ-ADMIN-001', CURRENT_DATE, 'active', 7,
          '00000000001', 'Whizz-Away (Pty) Ltd', 'FNB', 'Head Office', '250655',
          '1 Admin Road', 'Sandton',
          'enterprise', 'active', TRUE
        )`,
        [SUPER_ADMIN_EMAIL, hash]
      );
      console.log("✓ Super admin — superadmin@whizzaway.test");
    }

    await client.query("COMMIT");
    printSummary();
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Seed failed — rolled back:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

function printSummary() {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                       WHIZZ-AWAY SAAS TEST ACCOUNTS                         ║
║                   Universal password: Test@1234                              ║
╠══════════════════╦══════════════╦══════════════╦══════════════════════════════╣
║ Company          ║ Plan         ║ Status       ║ Login email                  ║
╠══════════════════╬══════════════╬══════════════╬══════════════════════════════╣
║ Lite Haulage     ║ Lite         ║ active       ║ bm.lite@test.whizz           ║
║                  ║              ║              ║ fc.lite@test.whizz           ║
╠══════════════════╬══════════════╬══════════════╬══════════════════════════════╣
║ Pro Logistics    ║ Professional ║ active       ║ bm.prof@test.whizz           ║
║                  ║              ║              ║ fc.prof@test.whizz           ║
║                  ║              ║              ║ ctrl.prof@test.whizz         ║
║                  ║              ║              ║ dir.prof@test.whizz          ║
║                  ║              ║              ║ driver1.prof@test.whizz      ║
╠══════════════════╬══════════════╬══════════════╬══════════════════════════════╣
║ Growth Transport ║ Growth       ║ active       ║ bm.grow@test.whizz           ║
║                  ║              ║              ║ fc.grow@test.whizz           ║
║                  ║              ║              ║ ctrl.grow@test.whizz         ║
║                  ║              ║              ║ dir.grow@test.whizz          ║
║                  ║              ║              ║ yard.grow@test.whizz         ║
╠══════════════════╬══════════════╬══════════════╬══════════════════════════════╣
║ Enterprise Frt   ║ Enterprise   ║ active       ║ bm.ent@test.whizz            ║
║                  ║              ║              ║ fc.ent@test.whizz            ║
║                  ║              ║              ║ ctrl.ent@test.whizz          ║
║                  ║              ║              ║ dir.ent@test.whizz           ║
║                  ║              ║              ║ cred.ent@test.whizz          ║
║                  ║              ║              ║ yard.ent@test.whizz          ║
╠══════════════════╬══════════════╬══════════════╬══════════════════════════════╣
║ Trial Transport  ║ Professional ║ trial        ║ bm.trial@test.whizz          ║
║                  ║              ║ (7 days)     ║ fc.trial@test.whizz          ║
╠══════════════════╬══════════════╬══════════════╬══════════════════════════════╣
║ Expired Trial Co ║ Lite         ║ inactive     ║ bm.trexp@test.whizz          ║
║                  ║              ║ (trial done) ║                              ║
╠══════════════════╬══════════════╬══════════════╬══════════════════════════════╣
║ Suspended Haulrs ║ Professional ║ suspended    ║ bm.susp@test.whizz           ║
╠══════════════════╬══════════════╬══════════════╬══════════════════════════════╣
║ Cancelled Cargo  ║ Growth       ║ cancelled    ║ bm.canc@test.whizz           ║
╠══════════════════╬══════════════╬══════════════╬══════════════════════════════╣
║ Pending Parcels  ║ none         ║ inactive     ║ bm.pend@test.whizz           ║
╠══════════════════╬══════════════╬══════════════╬══════════════════════════════╣
║ Overage Ops      ║ Lite         ║ active       ║ bm.over@test.whizz           ║
║                  ║              ║ (over limit) ║ fc.over@test.whizz           ║
╠══════════════════╬══════════════╬══════════════╬══════════════════════════════╣
║ SUPER ADMIN      ║ —            ║ —            ║ superadmin@whizzaway.test     ║
╚══════════════════╩══════════════╩══════════════╩══════════════════════════════╝
`);
}

seed();
