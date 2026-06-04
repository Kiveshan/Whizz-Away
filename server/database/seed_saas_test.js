/**
 * SaaS Test Seed — Whizz-Away
 *
 * Creates isolated test companies covering every plan tier, subscription status,
 * role type, and edge case needed for manual QA of the SaaS implementation.
 * Also seeds full operational data (instructions, legs, invoices, payments,
 * wages, expenses, etc.) so every module in the QA guide has pre-existing data
 * to work with.
 *
 * Run:
 *   node --env-file=.env server/database/seed_saas_test.js
 *
 * Universal test password for ALL accounts: Test@1234
 *
 * To wipe seed data only (no re-seed):
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

  // ── Operational data (must be deleted before master/entity data) ──────────
  // Payments reference invoices and clients
  await client.query(`DELETE FROM payment_m3      WHERE company_reg_num IN (${placeholders})`, TEST_COMPANIES);
  // Add-ons reference clients
  await client.query(`DELETE FROM add_ons         WHERE company_reg_num IN (${placeholders})`, TEST_COMPANIES);
  // Credit notes reference clients and instructions
  await client.query(`DELETE FROM credit_notes    WHERE company_reg_num IN (${placeholders})`, TEST_COMPANIES);
  // Invoices reference instructions and clients
  await client.query(`DELETE FROM invoice         WHERE company_reg_num IN (${placeholders})`, TEST_COMPANIES);
  // Legs reference instructions
  await client.query(`DELETE FROM legs_m2         WHERE company_reg_num IN (${placeholders})`, TEST_COMPANIES);
  // Containers reference instructions and have company_reg_num
  await client.query(`DELETE FROM container       WHERE company_reg_num IN (${placeholders})`, TEST_COMPANIES);
  // Instructions
  await client.query(`DELETE FROM m1_controller   WHERE company_reg_num IN (${placeholders})`, TEST_COMPANIES);
  // Wages reference employees
  await client.query(`DELETE FROM wages           WHERE company_reg_num IN (${placeholders})`, TEST_COMPANIES);
  // Fuel/expenses reference trucks
  await client.query(`DELETE FROM expenses_m2     WHERE company_reg_num IN (${placeholders})`, TEST_COMPANIES);
  // Purchase orders reference expense_types and suppliers
  await client.query(`DELETE FROM purchase_orders WHERE company_reg_num IN (${placeholders})`, TEST_COMPANIES);
  // Suppliers (CASCADE deletes supplier_expense_types)
  await client.query(`DELETE FROM suppliers       WHERE company_reg_num IN (${placeholders})`, TEST_COMPANIES);
  // Expense types
  await client.query(`DELETE FROM expense_types   WHERE company_reg_num IN (${placeholders})`, TEST_COMPANIES);
  // Driver rates
  await client.query(`DELETE FROM m5_driver_rate  WHERE company_reg_num IN (${placeholders})`, TEST_COMPANIES);
  // Trailers
  await client.query(`DELETE FROM m5_trailers     WHERE company_reg_num IN (${placeholders})`, TEST_COMPANIES);

  // ── Master / subscription data ────────────────────────────────────────────
  await client.query(`DELETE FROM billing_events   WHERE company_reg_num IN (${placeholders})`, TEST_COMPANIES);
  await client.query(`DELETE FROM company_usage    WHERE company_reg_num IN (${placeholders})`, TEST_COMPANIES);
  await client.query(`DELETE FROM aging_analysis   WHERE company_reg_num IN (${placeholders})`, TEST_COMPANIES);
  await client.query(`DELETE FROM m5_client_rate   WHERE company_reg_num IN (${placeholders})`, TEST_COMPANIES);
  await client.query(`DELETE FROM m5_client        WHERE company_reg_num IN (${placeholders})`, TEST_COMPANIES);
  await client.query(`DELETE FROM m5_trucks        WHERE company_reg_num IN (${placeholders})`, TEST_COMPANIES);
  await client.query(`DELETE FROM m5_employee      WHERE company_reg_num IN (${placeholders})`, TEST_COMPANIES);
  await client.query(`DELETE FROM usertable        WHERE company_reg_num IN (${placeholders})`, TEST_COMPANIES);
  await client.query(`DELETE FROM usertable        WHERE email = $1`, [SUPER_ADMIN_EMAIL]);

  console.log("Seed data removed.");
}

// ─── Base entity helpers ──────────────────────────────────────────────────────

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
  const result = await client.query(
    `INSERT INTO m5_employee (
      name, surname, email, password, cellnum,
      company_reg_num, roleid, status, base_salary
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING userid`,
    [name, surname, email, hashedPassword, cellnum, company_reg_num, roleid, status, base_salary]
  );
  return result.rows[0].userid;
}

async function insertTruck(client, { truckregnum, model, vin_num, company_reg_num, is_subcontractor = false, status = true, license_expiry = null }) {
  await client.query(
    `INSERT INTO m5_trucks (truckregnum, model, vin_num, trailersize, status, is_subcontractor, truck_license_expiry, company_reg_num)
     VALUES ($1, $2, $3, 'Flat Deck', $4, $5, $6, $7)`,
    [truckregnum, model, vin_num, status, is_subcontractor, license_expiry, company_reg_num]
  );
}

async function insertClient(client, { clientname, representative, email, company_reg_num, status = true }) {
  const result = await client.query(
    `INSERT INTO m5_client (client, representative, email, companyaddress, city, status, company_reg_num)
     VALUES ($1, $2, $3, '10 Commerce Drive', 'Johannesburg', $4, $5)
     RETURNING m5clientkey`,
    [clientname, representative, email, status, company_reg_num]
  );
  return result.rows[0].m5clientkey;
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

// ─── Main entity seed ─────────────────────────────────────────────────────────

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
      // Trucks: 6 normal + 2 with expiry dates set + 2 subcontractor (not counted toward limit)
      // GP 101 PR — license expiring in 20 days (triggers the "expiring soon" notification)
      const expiringIn20 = new Date();
      expiringIn20.setDate(expiringIn20.getDate() + 20);
      await insertTruck(client, { truckregnum: "GP 101 PR", model: "Scania R450", vin_num: "VIN-PR-001", company_reg_num: crn, license_expiry: expiringIn20.toISOString().split("T")[0] });
      // GP 102 PR — license already expired 5 days ago (triggers the "expired" critical alert)
      const expiredDaysAgo = new Date();
      expiredDaysAgo.setDate(expiredDaysAgo.getDate() - 5);
      await insertTruck(client, { truckregnum: "GP 102 PR", model: "Scania R450", vin_num: "VIN-PR-002", company_reg_num: crn, license_expiry: expiredDaysAgo.toISOString().split("T")[0] });
      // Remaining own trucks with no expiry set (fine)
      await insertTruck(client, { truckregnum: "GP 103 PR", model: "Scania R450", vin_num: "VIN-PR-003", company_reg_num: crn });
      await insertTruck(client, { truckregnum: "GP 104 PR", model: "Scania R450", vin_num: "VIN-PR-004", company_reg_num: crn });
      await insertTruck(client, { truckregnum: "GP 105 PR", model: "Scania R450", vin_num: "VIN-PR-005", company_reg_num: crn });
      await insertTruck(client, { truckregnum: "GP 106 PR", model: "Scania R450", vin_num: "VIN-PR-006", company_reg_num: crn });
      await insertTruck(client, { truckregnum: "GP 107 PR", model: "Scania R450", vin_num: "VIN-PR-007", company_reg_num: crn });
      await insertTruck(client, { truckregnum: "GP 108 PR", model: "Scania R450", vin_num: "VIN-PR-008", company_reg_num: crn });
      // Subcontractor trucks — excluded from usage count
      await insertTruck(client, { truckregnum: "NW 501 PR", model: "MAN TGX", vin_num: "VIN-PR-SUB1", company_reg_num: crn, is_subcontractor: true });
      await insertTruck(client, { truckregnum: "NW 502 PR", model: "MAN TGX", vin_num: "VIN-PR-SUB2", company_reg_num: crn, is_subcontractor: true });
      // Clients: A and B are active, C is inactive (for inactive-client-in-dropdown test)
      await insertClient(client, { clientname: "Pro Client A", representative: "Sarah Jones", email: "clienta@prof.test", company_reg_num: crn });
      await insertClient(client, { clientname: "Pro Client B", representative: "Mike Lee", email: "clientb@prof.test", company_reg_num: crn });
      await insertClient(client, { clientname: "Pro Client C (Inactive)", representative: "Test Person", email: "clientc@prof.test", company_reg_num: crn, status: false });
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

    // ── Commit base entity data, then seed operational data ──────────────
    await client.query("COMMIT");
    console.log("\nBase seed committed. Seeding operational data...\n");

    await client.query("BEGIN");
    await operationalSeed(client);
    await client.query("COMMIT");

    printSummary();
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Seed failed — rolled back:", err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// ─── Operational data seed ────────────────────────────────────────────────────
//
// Adds transactional data to TEST-PROF-001 (instructions → legs → invoice →
// payment → add-on → credit note → POs → fuel expenses) and wage slips to
// TEST-GROW-001. This gives every QA module a pre-existing starting state so
// tests don't depend on creating data from scratch.

async function operationalSeed(client) {

  // ── 1. Resolve IDs we need from the entity data just inserted ────────────

  const firstShipkeyRow = await client.query(
    `SELECT shipkey FROM shipment ORDER BY shipkey LIMIT 1`
  );
  if (!firstShipkeyRow.rows.length) throw new Error("No rows in shipment table — run schema first");
  const shipkey = firstShipkeyRow.rows[0].shipkey;

  // TEST-PROF-001 employees
  const profEmps = await client.query(
    `SELECT userid, email FROM m5_employee WHERE company_reg_num = 'TEST-PROF-001'`
  );
  const profEmpMap = Object.fromEntries(profEmps.rows.map(r => [r.email, r.userid]));
  const driver1Id = profEmpMap["driver1.prof@test.whizz"];
  const driver2Id = profEmpMap["driver2.prof@test.whizz"];

  // TEST-PROF-001 clients
  const profClients = await client.query(
    `SELECT m5clientkey, client FROM m5_client WHERE company_reg_num = 'TEST-PROF-001'`
  );
  const profClientMap = Object.fromEntries(profClients.rows.map(r => [r.client, r.m5clientkey]));
  const clientAKey = profClientMap["Pro Client A"];
  const clientBKey = profClientMap["Pro Client B"];

  // TEST-GROW-001 drivers
  const growDrivers = await client.query(
    `SELECT userid, email FROM m5_employee
     WHERE company_reg_num = 'TEST-GROW-001' AND roleid = 5
     ORDER BY userid LIMIT 2`
  );
  const growDriver1Id = growDrivers.rows[0]?.userid;
  const growDriver2Id = growDrivers.rows[1]?.userid;

  // TEST-ENT-001 clients
  const entClients = await client.query(
    `SELECT m5clientkey, client FROM m5_client WHERE company_reg_num = 'TEST-ENT-001'`
  );
  const entClientMap = Object.fromEntries(entClients.rows.map(r => [r.client, r.m5clientkey]));
  const entClientAKey = entClientMap["ENT Client A"];

  // ── 2. TEST-PROF-001 — Expense types ─────────────────────────────────────

  const etFuelRes = await client.query(
    `INSERT INTO expense_types (expense, company_reg_num) VALUES ('Fuel', 'TEST-PROF-001') RETURNING id`
  );
  const etFuelId = etFuelRes.rows[0].id;

  const etMaintRes = await client.query(
    `INSERT INTO expense_types (expense, company_reg_num) VALUES ('Maintenance', 'TEST-PROF-001') RETURNING id`
  );
  const etMaintId = etMaintRes.rows[0].id;

  await client.query(
    `INSERT INTO expense_types (expense, company_reg_num) VALUES ('Tyres', 'TEST-PROF-001')`
  );

  console.log("  ✓ TEST-PROF-001 — Expense types: Fuel, Maintenance, Tyres");

  // ── 3. TEST-PROF-001 — Suppliers ─────────────────────────────────────────

  const sup1Res = await client.query(
    `INSERT INTO suppliers (supplier, representative, email, city, payment_type, company_reg_num)
     VALUES ('Cape Fuels (Test)', 'Faisal Davids', 'fuel@capefuels.test', 'Cape Town', 'EFT', 'TEST-PROF-001')
     RETURNING supplier_id`
  );
  const supplier1Id = sup1Res.rows[0].supplier_id;
  await client.query(
    `INSERT INTO supplier_expense_types (se_id, expense_type_id) VALUES ($1, $2)`,
    [supplier1Id, etFuelId]
  );

  const sup2Res = await client.query(
    `INSERT INTO suppliers (supplier, representative, email, city, payment_type, company_reg_num)
     VALUES ('SA Auto Parts (Test)', 'Johan Botha', 'parts@saautoparts.test', 'Johannesburg', 'EFT', 'TEST-PROF-001')
     RETURNING supplier_id`
  );
  const supplier2Id = sup2Res.rows[0].supplier_id;
  await client.query(
    `INSERT INTO supplier_expense_types (se_id, expense_type_id) VALUES ($1, $2)`,
    [supplier2Id, etMaintId]
  );

  console.log("  ✓ TEST-PROF-001 — Suppliers: Cape Fuels, SA Auto Parts");

  // ── 4. TEST-PROF-001 — Trailers (with expiry edge-case dates) ─────────────

  const trailerExpiringDate = new Date();
  trailerExpiringDate.setDate(trailerExpiringDate.getDate() + 20);

  const trailerExpiredDate = new Date();
  trailerExpiredDate.setDate(trailerExpiredDate.getDate() - 5);

  await client.query(
    `INSERT INTO m5_trailers (trailerregnum, trailersize, model, vin_num, trailer_license_expiry, status, company_reg_num)
     VALUES ('TEST-TR-001', '6m', 'Henred Fruehauf', 'VIN-TR-001', $1, true, 'TEST-PROF-001')`,
    [trailerExpiringDate.toISOString().split("T")[0]]
  );
  await client.query(
    `INSERT INTO m5_trailers (trailerregnum, trailersize, model, vin_num, trailer_license_expiry, status, company_reg_num)
     VALUES ('TEST-TR-002', '12m', 'SA Truck Bodies', 'VIN-TR-002', $1, true, 'TEST-PROF-001')`,
    [trailerExpiredDate.toISOString().split("T")[0]]
  );

  console.log("  ✓ TEST-PROF-001 — Trailers: TEST-TR-001 (expiring in 20d), TEST-TR-002 (expired 5d ago)");

  // ── 5. TEST-PROF-001 — Driver rates ──────────────────────────────────────
  //
  // Four rate records covering the key test scenarios:
  //   A. Active (open-ended)   — Durban Port → Johannesburg, 2024-01-01 to NULL
  //   B. Expired               — Durban Port → Johannesburg, 2023-01-01 to 2023-12-31
  //   C. Active (different rt) — Cape Town Port → Johannesburg, 2024-06-01 to NULL
  //   D. Overlap pair          — Polokwane → Johannesburg:
  //        D1: 2025-01-01 to 2025-03-31  (ends before D2 starts, but D2 also starts before D1 ends)
  //        D2: 2025-03-15 to NULL        → overlaps with D1 by 16 days

  await client.query(
    `INSERT INTO m5_driver_rate (startingpoint, destination,
       driver_six_meter_rate, driver_twelve_meter_rate,
       subie_six_meter_rate, subie_twelve_meter_rate,
       effective_from, effective_to, company_reg_num)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    ["Durban Port", "Johannesburg", 3500.00, 4500.00, 3000.00, 4000.00,
     "2024-01-01", null, "TEST-PROF-001"]
  );

  await client.query(
    `INSERT INTO m5_driver_rate (startingpoint, destination,
       driver_six_meter_rate, driver_twelve_meter_rate,
       subie_six_meter_rate, subie_twelve_meter_rate,
       effective_from, effective_to, company_reg_num)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    ["Durban Port", "Johannesburg", 3200.00, 4200.00, 2800.00, 3800.00,
     "2023-01-01", "2023-12-31", "TEST-PROF-001"]
  );

  await client.query(
    `INSERT INTO m5_driver_rate (startingpoint, destination,
       driver_six_meter_rate, driver_twelve_meter_rate,
       subie_six_meter_rate, subie_twelve_meter_rate,
       effective_from, effective_to, company_reg_num)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    ["Cape Town Port", "Johannesburg", 5500.00, 7000.00, 5000.00, 6500.00,
     "2024-06-01", null, "TEST-PROF-001"]
  );

  // Overlap pair — D1 and D2 intentionally overlap (2025-03-15 to 2025-03-31)
  await client.query(
    `INSERT INTO m5_driver_rate (startingpoint, destination,
       driver_six_meter_rate, driver_twelve_meter_rate,
       subie_six_meter_rate, subie_twelve_meter_rate,
       effective_from, effective_to, company_reg_num)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    ["Polokwane", "Johannesburg", 2800.00, 3800.00, null, null,
     "2025-01-01", "2025-03-31", "TEST-PROF-001"]
  );
  await client.query(
    `INSERT INTO m5_driver_rate (startingpoint, destination,
       driver_six_meter_rate, driver_twelve_meter_rate,
       subie_six_meter_rate, subie_twelve_meter_rate,
       effective_from, effective_to, company_reg_num)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    ["Polokwane", "Johannesburg", 3100.00, 4100.00, null, null,
     "2025-03-15", null, "TEST-PROF-001"]
  );

  console.log("  ✓ TEST-PROF-001 — Driver rates: active (Durban→JHB), expired, Cape Town→JHB, overlap pair (Polokwane→JHB)");

  // ── 6. TEST-PROF-001 — Client rates ──────────────────────────────────────

  await client.query(
    `INSERT INTO m5_client_rate
       (clientid, starting_point, destination, "6m_rate", "12m_rate",
        surcharges, surcharge12m, hazardous, vgm, set_rate, company_reg_num)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [clientAKey, "Durban Port", "Johannesburg", 4200.00, 5200.00,
     null, null, null, null, null, "TEST-PROF-001"]
  );

  await client.query(
    `INSERT INTO m5_client_rate
       (clientid, starting_point, destination, "6m_rate", "12m_rate",
        surcharges, surcharge12m, hazardous, vgm, set_rate, company_reg_num)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [clientBKey, "Cape Town Port", "Johannesburg", 6500.00, 8000.00,
     null, null, null, null, null, "TEST-PROF-001"]
  );

  console.log("  ✓ TEST-PROF-001 — Client rates: Pro Client A (Durban→JHB), Pro Client B (Cape Town→JHB)");

  // ── 7. TEST-PROF-001 — Instructions ──────────────────────────────────────
  //
  //   Instruction 1 (COMPLETED + INVOICED) — client A, Durban Port → JHB, 2×6m
  //   Instruction 2 (IN PROGRESS + LEGS)   — client A, Durban Port → JHB, 2×6m
  //   Instruction 3 (NEW, no legs)          — client B, Cape Town → JHB, 1×12m

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
  const stackDate   = new Date(); stackDate.setDate(stackDate.getDate() + 7);
  const lastFreeDate = new Date(); lastFreeDate.setDate(lastFreeDate.getDate() + 14);

  const instr1Res = await client.query(
    `INSERT INTO public.m1_controller (
       client, "ksmFileRef", shipment_type, pickup, dropoff,
       stackdate, "lastFreeDate", "clientFileRef", rateweight,
       description, status, vat,
       num_six_meters, num_twelve_meters, num_abnormal, num_breakbulk,
       weight, total_cost, booking_ref, vessel_name,
       rateper_6, rateper_12, rateper_abnormal, rateper_breakbulk, unitrate,
       is_set_rate, historical_set_rate, created_at, company_reg_num
     ) VALUES (
       $1, $2, $3, $4, $5,
       $6, $7, $8, $9,
       $10, $11, $12,
       $13, $14, $15, $16,
       $17, $18, $19, $20,
       $21, $22, $23, $24, $25,
       $26, $27, $28, $29
     ) RETURNING m1key`,
    [
      clientAKey, "KSM-TEST-001", shipkey, "Durban Port", "Johannesburg",
      stackDate.toISOString().split("T")[0], lastFreeDate.toISOString().split("T")[0],
      "CLF-TEST-001", "Container",
      "Seed test cargo — instruction 1", "complete", 15,
      2, 0, 0, 0,
      null, 8400.00, "BK-TEST-001", "MSC Soleil",
      4200.00, null, null, null, null,
      false, null, thirtyDaysAgo.toISOString().split("T")[0], "TEST-PROF-001",
    ]
  );
  const m1key1 = instr1Res.rows[0].m1key;

  const instr2Res = await client.query(
    `INSERT INTO public.m1_controller (
       client, "ksmFileRef", shipment_type, pickup, dropoff,
       stackdate, "lastFreeDate", "clientFileRef", rateweight,
       description, status, vat,
       num_six_meters, num_twelve_meters, num_abnormal, num_breakbulk,
       weight, total_cost, booking_ref, vessel_name,
       rateper_6, rateper_12, rateper_abnormal, rateper_breakbulk, unitrate,
       is_set_rate, historical_set_rate, created_at, company_reg_num
     ) VALUES (
       $1, $2, $3, $4, $5,
       $6, $7, $8, $9,
       $10, $11, $12,
       $13, $14, $15, $16,
       $17, $18, $19, $20,
       $21, $22, $23, $24, $25,
       $26, $27, $28, $29
     ) RETURNING m1key`,
    [
      clientAKey, "KSM-TEST-002", shipkey, "Durban Port", "Johannesburg",
      stackDate.toISOString().split("T")[0], lastFreeDate.toISOString().split("T")[0],
      "CLF-TEST-002", "Container",
      "Seed test cargo — instruction 2", "In Progress", 15,
      2, 0, 0, 0,
      null, 8400.00, "BK-TEST-002", "MSC Capella",
      4200.00, null, null, null, null,
      false, null, fifteenDaysAgo.toISOString().split("T")[0], "TEST-PROF-001",
    ]
  );
  const m1key2 = instr2Res.rows[0].m1key;

  const instr3Res = await client.query(
    `INSERT INTO public.m1_controller (
       client, "ksmFileRef", shipment_type, pickup, dropoff,
       stackdate, "lastFreeDate", "clientFileRef", rateweight,
       description, status, vat,
       num_six_meters, num_twelve_meters, num_abnormal, num_breakbulk,
       weight, total_cost, booking_ref, vessel_name,
       rateper_6, rateper_12, rateper_abnormal, rateper_breakbulk, unitrate,
       is_set_rate, historical_set_rate, created_at, company_reg_num
     ) VALUES (
       $1, $2, $3, $4, $5,
       $6, $7, $8, $9,
       $10, $11, $12,
       $13, $14, $15, $16,
       $17, $18, $19, $20,
       $21, $22, $23, $24, $25,
       $26, $27, $28, $29
     ) RETURNING m1key`,
    [
      clientBKey, "KSM-TEST-003", shipkey, "Cape Town Port", "Johannesburg",
      stackDate.toISOString().split("T")[0], lastFreeDate.toISOString().split("T")[0],
      "CLF-TEST-003", "Container",
      "Seed test cargo — instruction 3", "New", 15,
      0, 1, 0, 0,
      null, 8000.00, "BK-TEST-003", "MSC Flaminia",
      null, 8000.00, null, null, null,
      false, null, new Date().toISOString().split("T")[0], "TEST-PROF-001",
    ]
  );
  const m1key3 = instr3Res.rows[0].m1key;

  console.log(`  ✓ TEST-PROF-001 — Instructions: ${m1key1} (complete), ${m1key2} (in progress), ${m1key3} (new)`);

  // ── 8. TEST-PROF-001 — Containers ────────────────────────────────────────
  //
  // Capture the containerkey of TCKU-SEED-001 — the credit note (section 13)
  // needs integer containerkeys, not string container numbers.

  const containerInsertSql = `
    INSERT INTO public.container (
      containernum, weight, m1key, container_type, cargo_description,
      "Hazardous", "Add Surcharges", "Surcharge Amount", "Hazardous Amount",
      is_12m_surcharge, surcharge_12m_amount,
      file_ref, vgm, "vgm amount", company_reg_num
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
    RETURNING containerkey
  `;

  // Instruction 1: 2×6m — capture first containerkey for credit note
  const cnt1Res = await client.query(containerInsertSql,
    ["TCKU-SEED-001", 24000, m1key1, "6m", "General Cargo",
     false, false, 0, 0, false, 0, "FILE-001", false, 0, "TEST-PROF-001"]);
  const containerkey1 = cnt1Res.rows[0].containerkey;

  await client.query(containerInsertSql,
    ["TCKU-SEED-002", 22000, m1key1, "6m", "General Cargo",
     false, false, 0, 0, false, 0, "FILE-002", false, 0, "TEST-PROF-001"]);

  // Instruction 2: 2×6m
  await client.query(containerInsertSql,
    ["TCKU-SEED-003", 20000, m1key2, "6m", "General Cargo",
     false, false, 0, 0, false, 0, "FILE-003", false, 0, "TEST-PROF-001"]);

  await client.query(containerInsertSql,
    ["TCKU-SEED-004", 18000, m1key2, "6m", "General Cargo",
     false, false, 0, 0, false, 0, "FILE-004", false, 0, "TEST-PROF-001"]);

  // Instruction 3: 1×12m
  await client.query(containerInsertSql,
    ["TCKU-SEED-005", 30000, m1key3, "12m", "Machinery",
     false, false, 0, 0, true, 0, "FILE-005", false, 0, "TEST-PROF-001"]);

  console.log("  ✓ TEST-PROF-001 — Containers: 5 total across 3 instructions");

  // ── 9. TEST-PROF-001 — Legs ───────────────────────────────────────────────
  //
  // Instruction 1 (completed): 2 legs — used to verify "rate in use" on the
  //   active Durban→JHB rate, and to populate the invoice's truck field.
  // Instruction 2 (in progress): 1 leg assigned — used for assignment module tests.

  const legDate1 = thirtyDaysAgo.toISOString().split("T")[0];
  const legDate2 = fifteenDaysAgo.toISOString().split("T")[0];

  await client.query(
    `INSERT INTO legs_m2 (
       legnumber, startingpoint, destination, driverrate,
       m1key, driverid, truckregnumber, containernumber, vgm, date,
       company_reg_num
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [1, "Durban Port", "Johannesburg", 3500.00,
     m1key1, driver1Id, "GP 101 PR", "TCKU-SEED-001", 0, legDate1, "TEST-PROF-001"]
  );
  await client.query(
    `INSERT INTO legs_m2 (
       legnumber, startingpoint, destination, driverrate,
       m1key, driverid, truckregnumber, containernumber, vgm, date,
       company_reg_num
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [2, "Durban Port", "Johannesburg", 3500.00,
     m1key1, driver2Id, "GP 102 PR", "TCKU-SEED-002", 0, legDate1, "TEST-PROF-001"]
  );
  await client.query(
    `INSERT INTO legs_m2 (
       legnumber, startingpoint, destination, driverrate,
       m1key, driverid, truckregnumber, containernumber, vgm, date,
       company_reg_num
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [1, "Durban Port", "Johannesburg", 3500.00,
     m1key2, driver1Id, "GP 103 PR", "TCKU-SEED-003", 0, legDate2, "TEST-PROF-001"]
  );

  console.log("  ✓ TEST-PROF-001 — Legs: 2 on instr-1, 1 on instr-2");

  // ── 10. TEST-PROF-001 — Invoice for instruction 1 ─────────────────────────

  const invoiceDate = thirtyDaysAgo.toISOString().split("T")[0];
  const invoiceRes = await client.query(
    `INSERT INTO invoice (clientid, m1key, invoice_num, groupid, date, company_reg_num)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING ikey`,
    [clientAKey, m1key1, "INV-SEED-001", null, invoiceDate, "TEST-PROF-001"]
  );
  const invoice1Key = invoiceRes.rows[0].ikey;

  console.log(`  ✓ TEST-PROF-001 — Invoice INV-SEED-001 (ikey=${invoice1Key}) for instruction ${m1key1}`);

  // ── 11. TEST-PROF-001 — Partial payment against invoice 1 ─────────────────
  //
  // Invoice total = R8400 × 1.15 VAT = R9660. Seed a partial payment of R5000
  // so the outstanding balance (R4660) is visible in statements/aging.

  const paymentDate = new Date();
  paymentDate.setDate(paymentDate.getDate() - 20);
  const paymentDateStr = paymentDate.toISOString().split("T")[0];

  const lineItems = JSON.stringify([
    {
      type: "Invoice",
      id: invoice1Key,
      invoice_num: "INV-SEED-001",
      amount_to_pay: 5000.00,
      this_payment: 5000.00,
      line_date: paymentDateStr,
    }
  ]);

  await client.query(
    `INSERT INTO payment_m3 (clientid, amount, reference, fileupload, invoiceid, addon_id, line_items, company_reg_num)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)`,
    [clientAKey, 5000.00, "EFT-SEED-REF-001", paymentDateStr,
     invoice1Key, null, lineItems, "TEST-PROF-001"]
  );

  // Update m1_controller.paid_amount to reflect partial payment
  await client.query(
    `UPDATE m1_controller SET paid_amount = 5000.00 WHERE m1key = $1 AND company_reg_num = 'TEST-PROF-001'`,
    [m1key1]
  );

  console.log("  ✓ TEST-PROF-001 — Payment EFT-SEED-REF-001 (R5000 partial of R9660 total)");

  // ── 12. TEST-PROF-001 — Add-on for Pro Client A ───────────────────────────

  const addonDate = new Date();
  addonDate.setDate(addonDate.getDate() - 10);

  await client.query(
    `INSERT INTO public.add_ons (
       client_id, items, amount, date, invoice_number,
       group_id, created_at, vat_applied, booking_ref, client_ref, vessel_number,
       company_reg_num
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [
      clientAKey,
      // items is jsonb — must be valid JSON, not a bare string
      JSON.stringify({ description: "Hazardous Cargo Surcharge (Test)" }),
      500.00,
      addonDate.toISOString().split("T")[0],
      "AO-SEED-001",
      null,
      addonDate.toISOString().split("T")[0],   // created_at is DATE, strip time
      false,
      "BK-TEST-001",
      "CLF-TEST-001",
      "MSC Soleil",
      "TEST-PROF-001",
    ]
  );

  console.log("  ✓ TEST-PROF-001 — Add-on AO-SEED-001 (R500 hazardous surcharge for Pro Client A)");

  // ── 13. TEST-PROF-001 — Credit note for Pro Client A ─────────────────────

  const creditNoteDate = new Date();
  creditNoteDate.setDate(creditNoteDate.getDate() - 5);

  // Schema: amount double precision[]  containerids integer[]
  // Pass native PostgreSQL arrays — pg driver handles JS arrays as array literals.
  await client.query(
    `INSERT INTO credit_notes (
       client_id, creditnote_date, amount, containerids,
       doc_no, m1key, description, account_no, company_reg_num
     ) VALUES ($1,$2,$3::double precision[],$4::integer[],$5,$6,$7,$8,$9)`,
    [
      clientAKey,
      creditNoteDate.toISOString().split("T")[0],
      [420.00],            // amount  → double precision[]
      [containerkey1],     // containerids → integer[] using the real containerkey PK
      "CN-SEED-001",
      m1key1,
      "Partial rate correction on container TCKU-SEED-001",
      "62012345678",
      "TEST-PROF-001",
    ]
  );

  console.log("  ✓ TEST-PROF-001 — Credit note CN-SEED-001 (R420 against instruction 1)");

  // ── 14. TEST-PROF-001 — Purchase orders ──────────────────────────────────

  // PO 1: Fuel — linked to truck GP 101 PR
  const truckPo1Res = await client.query(
    `SELECT m5truckskey FROM m5_trucks WHERE truckregnum = 'GP 101 PR' AND company_reg_num = 'TEST-PROF-001'`
  );
  const truck1Key = truckPo1Res.rows[0]?.m5truckskey || null;

  await client.query(
    `INSERT INTO purchase_orders (
       expense_type_id, supplier_id, reg_no, attention_to, received_by,
       quantity, unit_price, description, subbie, date, ponum, total, truckid, company_reg_num
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [
      etFuelId, supplier1Id, "GP 101 PR", "Moses Dube", "Kagiso Sithole",
      0, 0,
      "Diesel fill-up — GP 101 PR",
      false,
      paymentDateStr,
      "PO-SEED-001",
      850.00,
      truck1Key,
      "TEST-PROF-001",
    ]
  );

  // PO 2: Maintenance — no truck (general workshop job)
  await client.query(
    `INSERT INTO purchase_orders (
       expense_type_id, supplier_id, reg_no, attention_to, received_by,
       quantity, unit_price, description, subbie, date, ponum, total, truckid, company_reg_num
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [
      etMaintId, supplier2Id, null, "Ruan Botha", "Kagiso Sithole",
      2, 1200.00,
      "Brake pad replacement — workshop service",
      false,
      paymentDateStr,
      "PO-SEED-002",
      2400.00,
      null,
      "TEST-PROF-001",
    ]
  );

  console.log("  ✓ TEST-PROF-001 — Purchase orders: PO-SEED-001 (fuel, GP 101 PR), PO-SEED-002 (maintenance)");

  // ── 15. TEST-PROF-001 — Fuel expenses ────────────────────────────────────

  const truckPo2Res = await client.query(
    `SELECT m5truckskey FROM m5_trucks WHERE truckregnum = 'GP 103 PR' AND company_reg_num = 'TEST-PROF-001'`
  );
  const truck3Key = truckPo2Res.rows[0]?.m5truckskey || null;

  await client.query(
    `INSERT INTO public.expenses_m2
       (type, documentfrom, expensecost, description, slipname,
        slipuploaddate, truckid, driverid, orderno, company_reg_num)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      "fuel", "Cape Fuels Sandton",
      850.00, "Diesel fill-up — GP 101 PR",
      "slip_seed_001.jpg",
      paymentDateStr,
      truck1Key, driver1Id, "ORD-SEED-001", "TEST-PROF-001",
    ]
  );

  await client.query(
    `INSERT INTO public.expenses_m2
       (type, documentfrom, expensecost, description, slipname,
        slipuploaddate, truckid, driverid, orderno, company_reg_num)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      "fuel", "Cape Fuels Durban",
      620.00, "Diesel fill-up — GP 103 PR",
      "slip_seed_002.jpg",
      paymentDateStr,
      truck3Key, driver2Id, "ORD-SEED-002", "TEST-PROF-001",
    ]
  );

  console.log("  ✓ TEST-PROF-001 — Fuel expenses: ORD-SEED-001 (R850, GP 101 PR), ORD-SEED-002 (R620, GP 103 PR)");

  // ── 16. TEST-GROW-001 — Wage slips for 2 drivers (current month) ──────────

  if (growDriver1Id && growDriver2Id) {
    // Use the last day of the current month as the wage date
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const wageDate = lastDayOfMonth.toISOString();

    await client.query(
      `INSERT INTO wages (employeeid, total_earnings, total_deductions, net_pay, employee_date, company_reg_num)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT ON CONSTRAINT unique_wage_per_employee_month_year
       DO UPDATE SET total_earnings = EXCLUDED.total_earnings,
                     total_deductions = EXCLUDED.total_deductions,
                     net_pay = EXCLUDED.net_pay`,
      [growDriver1Id, 13000.00, 1430.00, 11570.00, wageDate, "TEST-GROW-001"]
    );

    await client.query(
      `INSERT INTO wages (employeeid, total_earnings, total_deductions, net_pay, employee_date, company_reg_num)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT ON CONSTRAINT unique_wage_per_employee_month_year
       DO UPDATE SET total_earnings = EXCLUDED.total_earnings,
                     total_deductions = EXCLUDED.total_deductions,
                     net_pay = EXCLUDED.net_pay`,
      [growDriver2Id, 13000.00, 1430.00, 11570.00, wageDate, "TEST-GROW-001"]
    );

    console.log("  ✓ TEST-GROW-001 — Wage slips: 2 drivers for current month (R13000 gross / R11570 net)");
  } else {
    console.warn("  ⚠ TEST-GROW-001 — Could not find growth drivers; wage slips skipped");
  }

  // ── 17. TEST-ENT-001 — Expense types + supplier + PO ─────────────────────

  const etPartsRes = await client.query(
    `INSERT INTO expense_types (expense, company_reg_num) VALUES ('Parts', 'TEST-ENT-001') RETURNING id`
  );
  const etPartsId = etPartsRes.rows[0].id;

  await client.query(
    `INSERT INTO expense_types (expense, company_reg_num) VALUES ('Services', 'TEST-ENT-001')`
  );

  const entSup1Res = await client.query(
    `INSERT INTO suppliers (supplier, representative, email, city, payment_type, company_reg_num)
     VALUES ('ENT Parts Supplier (Test)', 'James Kirk', 'parts@entsupplier.test', 'Johannesburg', 'EFT', 'TEST-ENT-001')
     RETURNING supplier_id`
  );
  const entSupplier1Id = entSup1Res.rows[0].supplier_id;
  await client.query(
    `INSERT INTO supplier_expense_types (se_id, expense_type_id) VALUES ($1, $2)`,
    [entSupplier1Id, etPartsId]
  );

  await client.query(
    `INSERT INTO purchase_orders (
       expense_type_id, supplier_id, reg_no, attention_to, received_by,
       quantity, unit_price, description, subbie, date, ponum, total, truckid, company_reg_num
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [
      etPartsId, entSupplier1Id, null, "Gareth Hopkins", "Nomvula Mahlangu",
      4, 350.00,
      "Filter kit replacement",
      false,
      new Date().toISOString().split("T")[0],
      "PO-ENT-SEED-001",
      1400.00,
      null,
      "TEST-ENT-001",
    ]
  );

  console.log("  ✓ TEST-ENT-001 — Expense types (Parts, Services), supplier, PO-ENT-SEED-001");

  console.log("\nOperational seed complete.");
}

// ─── Summary ──────────────────────────────────────────────────────────────────

function printSummary() {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                       WHIZZ-AWAY SAAS TEST ACCOUNTS                         ║
║                   Universal password: Test@1234                              ║
╠══════════════════════╦══════════════╦══════════════╦══════════════════════════╣
║ Company              ║ Plan         ║ Status       ║ Login email              ║
╠══════════════════════╬══════════════╬══════════════╬══════════════════════════╣
║ Lite Haulage         ║ Lite         ║ active       ║ bm.lite@test.whizz       ║
║                      ║              ║              ║ fc.lite@test.whizz       ║
╠══════════════════════╬══════════════╬══════════════╬══════════════════════════╣
║ Pro Logistics        ║ Professional ║ active       ║ bm.prof@test.whizz       ║
║ (+ full op data)     ║              ║              ║ fc.prof@test.whizz       ║
║                      ║              ║              ║ ctrl.prof@test.whizz     ║
║                      ║              ║              ║ dir.prof@test.whizz      ║
║                      ║              ║              ║ driver1.prof@test.whizz  ║
╠══════════════════════╬══════════════╬══════════════╬══════════════════════════╣
║ Growth Transport     ║ Growth       ║ active       ║ bm.grow@test.whizz       ║
║ (+ wage slips)       ║              ║              ║ fc.grow@test.whizz       ║
║                      ║              ║              ║ ctrl.grow@test.whizz     ║
║                      ║              ║              ║ dir.grow@test.whizz      ║
║                      ║              ║              ║ yard.grow@test.whizz     ║
╠══════════════════════╬══════════════╬══════════════╬══════════════════════════╣
║ Enterprise Freight   ║ Enterprise   ║ active       ║ bm.ent@test.whizz        ║
║ (+ PO data)          ║              ║              ║ fc.ent@test.whizz        ║
║                      ║              ║              ║ ctrl.ent@test.whizz      ║
║                      ║              ║              ║ dir.ent@test.whizz       ║
║                      ║              ║              ║ cred.ent@test.whizz      ║
║                      ║              ║              ║ yard.ent@test.whizz      ║
╠══════════════════════╬══════════════╬══════════════╬══════════════════════════╣
║ Trial Transport      ║ Professional ║ trial        ║ bm.trial@test.whizz      ║
║                      ║              ║ (7 days)     ║ fc.trial@test.whizz      ║
╠══════════════════════╬══════════════╬══════════════╬══════════════════════════╣
║ Expired Trial Co     ║ Lite         ║ inactive     ║ bm.trexp@test.whizz      ║
║                      ║              ║ (trial done) ║                          ║
╠══════════════════════╬══════════════╬══════════════╬══════════════════════════╣
║ Suspended Hauliers   ║ Professional ║ suspended    ║ bm.susp@test.whizz       ║
╠══════════════════════╬══════════════╬══════════════╬══════════════════════════╣
║ Cancelled Cargo      ║ Growth       ║ cancelled    ║ bm.canc@test.whizz       ║
╠══════════════════════╬══════════════╬══════════════╬══════════════════════════╣
║ Pending Parcels      ║ none         ║ inactive     ║ bm.pend@test.whizz       ║
╠══════════════════════╬══════════════╬══════════════╬══════════════════════════╣
║ Overage Operators    ║ Lite         ║ active       ║ bm.over@test.whizz       ║
║                      ║              ║ (over limit) ║ fc.over@test.whizz       ║
╠══════════════════════╬══════════════╬══════════════╬══════════════════════════╣
║ SUPER ADMIN          ║ —            ║ —            ║ superadmin@whizzaway.test ║
╚══════════════════════╩══════════════╩══════════════╩══════════════════════════╝

── TEST-PROF-001 operational data ───────────────────────────────────────────
  Routes:      Durban Port → JHB (active rate + expired rate)
               Cape Town Port → JHB (active rate)
               Polokwane → JHB (OVERLAPPING rate pair — use for overlap test)
  Trailers:    TEST-TR-001 (expiring in 20 days), TEST-TR-002 (expired 5 days ago)
  Trucks:      GP 101 PR (license expiring in 20d), GP 102 PR (license expired 5d ago)
  Clients:     Pro Client A (active), Pro Client B (active), Pro Client C (INACTIVE)
  Instructions: KSM-TEST-001 (complete, invoiced, partial payment)
                KSM-TEST-002 (in progress, 1 leg assigned)
                KSM-TEST-003 (new, no legs)
  Invoice:     INV-SEED-001  →  R9660 total, R5000 paid, R4660 outstanding
  Add-on:      AO-SEED-001   →  R500 hazardous surcharge (Pro Client A)
  Credit note: CN-SEED-001   →  R420 credit against instruction 1
  POs:         PO-SEED-001 (fuel, Cape Fuels, GP 101 PR)
               PO-SEED-002 (maintenance, SA Auto Parts, no slip yet)
  Fuel exp:    ORD-SEED-001 (R850, GP 101 PR), ORD-SEED-002 (R620, GP 103 PR)

── TEST-GROW-001 operational data ───────────────────────────────────────────
  Wages:       Driver1 + Driver2, current month (R13000 gross / R11570 net)

── TEST-ENT-001 operational data ────────────────────────────────────────────
  Expense types: Parts, Services
  Supplier:    ENT Parts Supplier (Test)
  PO:          PO-ENT-SEED-001 (R1400, filter kit)
`);
}

seed();
