/**
 * Demo Seed — Premier Freight Solutions (Pty) Ltd
 * company_reg_num: DEMO-ENT-PREMIER
 *
 * Enterprise-tier demo company with comprehensive operational data covering
 * every module: instructions, containers, legs, invoicing, partial payments,
 * aging analysis, statements, payroll, creditors, POs, expenses, and
 * subcontractor statements.
 *
 * Run:
 *   node --env-file=.env server/database/seed_demo_premier.js
 *
 * Cleanup only:
 *   node --env-file=.env server/database/seed_demo_premier.js --cleanup
 *
 * Demo password for ALL accounts: Demo@1234
 * Primary demo login:             admin@premierfreight.co.za  (Business Manager)
 */

import { pool } from "../config/database.js";
import bcrypt from "bcrypt";

const DEMO_CRN      = "DEMO-ENT-PREMIER";
const DEMO_PASSWORD = "Test@1234";
const CLEANUP_FLAG  = process.argv.includes("--cleanup");

// ─── Date helpers ─────────────────────────────────────────────────────────────

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
};

const daysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
};

// Returns the last day of the month N months ago as a full ISO timestamp.
// Used for wages.employee_date — the unique constraint is per employee per month/year.
const lastDayOfMonthAgo = (n) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - n + 1); // first of next target month
  d.setDate(0);                       // back one day = last of target month
  return d.toISOString();
};

// First day of the current month as a date string (YYYY-MM-DD)
const firstOfCurrentMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
};

// ─── Cleanup ──────────────────────────────────────────────────────────────────

async function cleanup(client) {
  console.log(`Cleaning up ${DEMO_CRN}...`);
  const c = DEMO_CRN;

  // Children before parents (FK order)
  await client.query(`DELETE FROM subcontractor_statements    WHERE company_reg_num = $1`, [c]);
  await client.query(`DELETE FROM base_salary_history         WHERE company_reg_num = $1`, [c]);
  await client.query(`DELETE FROM employee_deduction_history  WHERE company_reg_num = $1`, [c]);
  await client.query(`DELETE FROM wages                       WHERE company_reg_num = $1`, [c]);
  await client.query(`DELETE FROM payment_m3                  WHERE company_reg_num = $1`, [c]);
  await client.query(`DELETE FROM add_ons                     WHERE company_reg_num = $1`, [c]);
  await client.query(`DELETE FROM credit_notes                WHERE company_reg_num = $1`, [c]);
  await client.query(`DELETE FROM invoice                     WHERE company_reg_num = $1`, [c]);
  await client.query(`DELETE FROM legs_m2                     WHERE company_reg_num = $1`, [c]);
  await client.query(`DELETE FROM container                   WHERE company_reg_num = $1`, [c]);
  await client.query(`DELETE FROM m1_controller               WHERE company_reg_num = $1`, [c]);
  await client.query(`DELETE FROM expenses_m2                 WHERE company_reg_num = $1`, [c]);
  await client.query(`DELETE FROM purchase_orders             WHERE company_reg_num = $1`, [c]);
  await client.query(`DELETE FROM supplier_expense_types      WHERE se_id IN (SELECT supplier_id FROM suppliers WHERE company_reg_num = $1)`, [c]);
  await client.query(`DELETE FROM suppliers                   WHERE company_reg_num = $1`, [c]);
  await client.query(`DELETE FROM expense_types               WHERE company_reg_num = $1`, [c]);
  await client.query(`DELETE FROM m5_driver_rate              WHERE company_reg_num = $1`, [c]);
  await client.query(`DELETE FROM m5_client_rate              WHERE company_reg_num = $1`, [c]);
  await client.query(`DELETE FROM statements                  WHERE company_reg_num = $1`, [c]);
  await client.query(`DELETE FROM aging_analysis              WHERE company_reg_num = $1`, [c]);
  await client.query(`DELETE FROM m5_trailers                 WHERE company_reg_num = $1`, [c]);
  await client.query(`DELETE FROM m5_client                   WHERE company_reg_num = $1`, [c]);
  await client.query(`DELETE FROM m5_trucks                   WHERE company_reg_num = $1`, [c]);
  await client.query(`DELETE FROM billing_events              WHERE company_reg_num = $1`, [c]);
  await client.query(`DELETE FROM company_usage               WHERE company_reg_num = $1`, [c]);
  await client.query(`DELETE FROM m5_employee                 WHERE company_reg_num = $1`, [c]);
  await client.query(`DELETE FROM usertable                   WHERE company_reg_num = $1`, [c]);

  console.log("Cleanup complete.");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await cleanup(client);

    if (CLEANUP_FLAG) {
      await client.query("COMMIT");
      return;
    }

    const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
    console.log("Seeding Premier Freight Solutions (Pty) Ltd...\n");

    // ── 1. USERTABLE — company shell ─────────────────────────────────────────
    // name/surname added so getManagers() (assignmentModel) returns a valid row.

    await client.query(
      `INSERT INTO usertable (
         name, surname,
         companyname, company_reg_num, dateofreg, status, roleid,
         vat_reg_num, account_num, name_of_acc, bank, branch, branch_code,
         address, suburb,
         subscription_tier, subscription_status, setup_fee_paid,
         plan_approved_by, plan_notes
       ) VALUES (
         'Rajan', 'Naidoo',
         $1, $2, CURRENT_DATE, 'active', 1,
         '4560123456', '62098765432', 'Premier Freight Solutions (Pty) Ltd',
         'Standard Bank', 'Durban Branch', '045026',
         '14 Harbour Drive', 'Durban',
         'enterprise', 'active', TRUE,
         'seed@whizzaway.test', 'Demo company — Enterprise tier, all features enabled'
       )`,
      ["Premier Freight Solutions (Pty) Ltd", DEMO_CRN]
    );
    console.log("  ✓ usertable company shell (Rajan Naidoo, enterprise/active)");

    // ── 2. M5_EMPLOYEE — 5 portal users + 3 drivers + 2 subcontractors ───────

    const insertEmp = async (f) => {
      const r = await client.query(
        `INSERT INTO m5_employee
           (name, surname, email, password, cellnum,
            company_reg_num, roleid, status, base_salary,
            subei_reg_num, companyname, contact_person, location)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING userid`,
        [
          f.name, f.surname, f.email, hash,
          f.cell     ?? "0820000000",
          DEMO_CRN,
          f.roleid,
          f.status   ?? true,
          f.salary   ?? null,
          f.subei    ?? null,
          f.company  ?? null,
          f.contact  ?? null,
          f.location ?? null,
        ]
      );
      return r.rows[0].userid;
    };

    // Portal users
    const adminId      = await insertEmp({ name:"Rajan",   surname:"Naidoo",       email:"admin@premierfreight.co.za",      roleid:1, cell:"0831001001" });
    const ctrlId       = await insertEmp({ name:"Thabo",   surname:"Mokoena",      email:"controller@premierfreight.co.za", roleid:2, cell:"0831001002" });
    const financeId    = await insertEmp({ name:"Priya",   surname:"Pillay",       email:"finance@premierfreight.co.za",    roleid:3, cell:"0831001003" });
    const directorId   = await insertEmp({ name:"Susan",   surname:"van der Berg", email:"director@premierfreight.co.za",   roleid:4, cell:"0831001004" });
    const creditorsId  = await insertEmp({ name:"Lungelo", surname:"Dlamini",      email:"creditors@premierfreight.co.za",  roleid:8, cell:"0831001005" });

    // Owned drivers (roleid 5)
    const siphoId  = await insertEmp({ name:"Sipho",  surname:"Khumalo",   email:"sipho.khumalo@premierfreight.co.za",  roleid:5, salary:18500, cell:"0721001001" });
    const mandlaId = await insertEmp({ name:"Mandla", surname:"Zulu",      email:"mandla.zulu@premierfreight.co.za",    roleid:5, salary:17000, cell:"0721001002" });
    const deonId   = await insertEmp({ name:"Deon",   surname:"Potgieter", email:"deon.potgieter@premierfreight.co.za", roleid:5, salary:16500, cell:"0721001003" });

    // Subcontractors (roleid 6) — subei_reg_num is the grouping key for sub statements
    const sunriseId  = await insertEmp({ name:"Sunrise Haulage", surname:"CC",        email:"dispatch@sunrisehaulage.co.za", roleid:6, subei:"SUBCC-4432", company:"Sunrise Haulage CC",       contact:"Blessing Ndlovu",   location:"Durban" });
    const fastlaneId = await insertEmp({ name:"FastLane",        surname:"Transport", email:"ops@fastlanetransport.co.za",   roleid:6, subei:"SUBCC-8819", company:"FastLane Transport (Pty)", contact:"Gerhard du Plessis", location:"Cape Town" });

    console.log("  ✓ 10 employees (5 portal users, 3 drivers, 2 subcontractors)");

    // ── 3. M5_TRUCKS — 4 owned + 2 subcontractor (one owned near expiry) ─────

    const insertTruck = async (f) => {
      const r = await client.query(
        `INSERT INTO m5_trucks
           (truckregnum, model, vin_num, trailersize, year,
            purchase_price, current_evaluation,
            is_subcontractor, subei_reg_num,
            truck_license_expiry, status, company_reg_num)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,$11)
         RETURNING m5truckskey`,
        [
          f.reg, f.model, f.vin,
          f.size  ?? "12m",
          f.year  ?? 2021,
          f.purchase ?? null,
          f.eval     ?? null,
          f.isSub    ?? false,
          f.subei    ?? null,
          f.expiry   ?? null,
          DEMO_CRN,
        ]
      );
      return r.rows[0].m5truckskey;
    };

    const truck1Key = await insertTruck({ reg:"ND 45 678 GP", model:"Volvo FH16 2022",      vin:"VIN-PFS-001", year:2022, purchase:1850000, eval:1450000, expiry:daysFromNow(290) });
    const truck2Key = await insertTruck({ reg:"ND 12 345 GP", model:"MAN TGX 480 2021",     vin:"VIN-PFS-002", year:2021, purchase:1650000, eval:1200000, expiry:daysFromNow(178) });
    const truck3Key = await insertTruck({ reg:"ND 78 901 GP", model:"Mercedes Actros 2023", vin:"VIN-PFS-003", size:"6m", year:2023, purchase:980000,  eval:860000,  expiry:daysFromNow(77) });
    const truck4Key = await insertTruck({ reg:"ND 33 100 GP", model:"DAF XF 2018",          vin:"VIN-PFS-004", year:2018, purchase:1200000, eval:680000,  expiry:daysFromNow(24) }); // <30d → alert!
    await insertTruck(                  { reg:"SRH 4432 CC",  model:"Scania R500 2020",      vin:"VIN-PFS-SUB1", isSub:true, subei:"SUBCC-4432", expiry:daysFromNow(41) });
    await insertTruck(                  { reg:"FLT 8819 CC",  model:"Volvo FM 460 2019",     vin:"VIN-PFS-SUB2", isSub:true, subei:"SUBCC-8819", expiry:daysFromNow(89) });

    console.log("  ✓ 6 trucks (4 owned incl. near-expiry alert, 2 subcontractor)");

    // ── 4. M5_TRAILERS ───────────────────────────────────────────────────────

    await client.query(
      `INSERT INTO m5_trailers
         (trailerregnum, trailersize, model, vin_num, year, trailer_license_expiry, status, company_reg_num)
       VALUES
         ('T-PFS-001','12m','Henred Fruehauf','VIN-TR-PFS-001',2021,$1,true,$4),
         ('T-PFS-002','12m','SA Truck Bodies', 'VIN-TR-PFS-002',2020,$2,true,$4),
         ('T-PFS-003','6m', 'Afrit Trailers',  'VIN-TR-PFS-003',2022,$3,true,$4)`,
      [daysFromNow(225), daysFromNow(189), daysFromNow(292), DEMO_CRN]
    );
    console.log("  ✓ 3 trailers");

    await client.query("COMMIT");
    console.log("\nBase entities committed — seeding operational data...\n");

    // ── Operational data in a fresh transaction ───────────────────────────────
    await client.query("BEGIN");
    await operationalSeed(client, {
      adminId, ctrlId, financeId, directorId, creditorsId,
      siphoId, mandlaId, deonId, sunriseId, fastlaneId,
      truck1Key, truck2Key, truck3Key, truck4Key,
    });
    await client.query("COMMIT");

    printSummary();
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\nSeed FAILED — rolled back:", err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// ─── Operational seed ─────────────────────────────────────────────────────────

async function operationalSeed(client, ids) {
  const { siphoId, mandlaId, deonId, sunriseId, fastlaneId,
          truck1Key, truck2Key, truck3Key, truck4Key } = ids;

  // ── Shipment type lookup ──────────────────────────────────────────────────
  const shipRes = await client.query(
    `SELECT shipkey FROM shipment ORDER BY shipkey LIMIT 1`
  );
  if (!shipRes.rows.length)
    throw new Error("shipment table is empty — run schema migrations first");
  const shipkey = shipRes.rows[0].shipkey;

  // ── 5. EXPENSE TYPES ─────────────────────────────────────────────────────

  const insertET = async (name) => {
    const r = await client.query(
      `INSERT INTO expense_types (expense, company_reg_num) VALUES ($1,$2) RETURNING id`,
      [name, DEMO_CRN]
    );
    return r.rows[0].id;
  };

  const etFuelId  = await insertET("Fuel");
  const etMaintId = await insertET("Maintenance");
  const etTyresId = await insertET("Tyres");
  await insertET("Toll Fees");
  await insertET("Parts");
  console.log("  ✓ 5 expense types");

  // ── 6. SUPPLIERS + SUPPLIER_EXPENSE_TYPES ────────────────────────────────

  const insertSup = async (supplier, rep, email, city, vatregno) => {
    const r = await client.query(
      `INSERT INTO suppliers
         (supplier, representative, email, city, vatregno, payment_type, status, company_reg_num)
       VALUES ($1,$2,$3,$4,$5,'EFT',true,$6) RETURNING supplier_id`,
      [supplier, rep, email, city, vatregno, DEMO_CRN]
    );
    return r.rows[0].supplier_id;
  };

  const sup1Id = await insertSup("BP South Africa (Pty) Ltd", "Gavin Nxumalo",   "gavin@bpsa.co.za",       "Durban",       "4112233445");
  const sup2Id = await insertSup("Bridgestone SA",             "Petros Sithole",  "petros@bridgestone.za",  "Johannesburg", "4556677889");
  const sup3Id = await insertSup("NTK Truck Parts",            "Anton Swanepoel", "anton@ntk.co.za",        "Pretoria",     "4998877665");

  await client.query(
    `INSERT INTO supplier_expense_types (se_id, expense_type_id)
     VALUES ($1,$2), ($3,$4), ($5,$6)`,
    [sup1Id, etFuelId, sup2Id, etTyresId, sup3Id, etMaintId]
  );
  console.log("  ✓ 3 suppliers + expense type mappings");

  // ── 7. CLIENTS ───────────────────────────────────────────────────────────

  const insertClient = async (name, rep, email, address, city, vatregno, paytype) => {
    const r = await client.query(
      `INSERT INTO m5_client
         (client, representative, email, companyaddress, city, vatregno,
          payment_type, status, company_reg_num)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8) RETURNING m5clientkey`,
      [name, rep, email, address, city, vatregno, paytype, DEMO_CRN]
    );
    return r.rows[0].m5clientkey;
  };

  const hapagKey    = await insertClient("Hapag-Lloyd SA (Pty) Ltd", "Mark Steyn",     "mark.steyn@hapag.co.za",   "12 Maritime Place",     "Durban",      "4123456789", "30 days");
  const transnetKey = await insertClient("Transnet Port Terminals",  "Zanele Khumalo", "zanele@transnet.net",       "1 Transnet Plaza",      "Johannesburg","4098765432", "30 days");
  const pnpKey      = await insertClient("Pick n Pay Distribution",  "Anand Gopal",    "agopal@pnp.co.za",          "101 Longmarket Street", "Cape Town",   "4567890123", "30 days");
  const shopriteKey = await insertClient("Shoprite Holdings Ltd",    "Marlene Botha",  "m.botha@shoprite.co.za",    "Cnr William Dabs",      "Brackenfell", "4321098765", "COD");

  console.log("  ✓ 4 clients (Hapag-Lloyd, Transnet, Pick n Pay, Shoprite)");

  // ── 8. CLIENT RATES (3 routes × 4 clients = 12 records) ─────────────────
  // Routes: Durban→Johannesburg | Cape Town→Johannesburg | Durban→Cape Town

  const crQ = `
    INSERT INTO m5_client_rate
      (clientid, starting_point, destination,
       "6m_rate", "12m_rate", surcharges, surcharge12m, hazardous, vgm, set_rate, company_reg_num)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`;

  // Hapag-Lloyd
  await client.query(crQ, [hapagKey,    "Durban",    "Johannesburg", 4200, 7800,  650, null, 950,  380,  null, DEMO_CRN]);
  await client.query(crQ, [hapagKey,    "Cape Town", "Johannesburg", 5100, 9500,  750, null, 1100, 420,  null, DEMO_CRN]);
  await client.query(crQ, [hapagKey,    "Durban",    "Cape Town",    4800, 8900,  700, null, 1000, 400,  null, DEMO_CRN]);
  // Transnet
  await client.query(crQ, [transnetKey, "Durban",    "Johannesburg", 4500, 8200,  600, null, 900,  350,  null, DEMO_CRN]);
  await client.query(crQ, [transnetKey, "Cape Town", "Johannesburg", 5400, 9900,  800, null, 1200, 450,  null, DEMO_CRN]);
  await client.query(crQ, [transnetKey, "Durban",    "Cape Town",    5000, 9200,  720, null, 1050, 410,  null, DEMO_CRN]);
  // Pick n Pay (no hazmat)
  await client.query(crQ, [pnpKey,      "Durban",    "Johannesburg", 3900, 7200,  580, null, null, null, null, DEMO_CRN]);
  await client.query(crQ, [pnpKey,      "Cape Town", "Johannesburg", 4700, 8700,  650, null, null, null, null, DEMO_CRN]);
  await client.query(crQ, [pnpKey,      "Durban",    "Cape Town",    4400, 8100,  620, null, null, null, null, DEMO_CRN]);
  // Shoprite (no hazmat, has VGM)
  await client.query(crQ, [shopriteKey, "Durban",    "Johannesburg", 4100, 7600,  600, null, null, 360,  null, DEMO_CRN]);
  await client.query(crQ, [shopriteKey, "Cape Town", "Johannesburg", 4900, 9100,  700, null, null, 400,  null, DEMO_CRN]);
  await client.query(crQ, [shopriteKey, "Durban",    "Cape Town",    4600, 8500,  650, null, null, 380,  null, DEMO_CRN]);

  console.log("  ✓ 12 client rates (3 routes × 4 clients)");

  // ── 9. DRIVER RATES ──────────────────────────────────────────────────────
  // One rate record per route; no driverid (route-level, not driver-specific).
  // One historical expired record to demonstrate rate history in the UI.

  const drQ = `
    INSERT INTO m5_driver_rate
      (startingpoint, destination,
       driver_six_meter_rate, driver_twelve_meter_rate,
       subie_six_meter_rate,  subie_twelve_meter_rate,
       effective_from, effective_to, company_reg_num)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING m5ratekey`;

  const rk_dbn_jhb = (await client.query(drQ, ["Durban",    "Johannesburg", 1800, 3200, 3400, 6200, "2024-01-01", null,         DEMO_CRN])).rows[0].m5ratekey;
  const rk_cpt_jhb = (await client.query(drQ, ["Cape Town", "Johannesburg", 1950, 3500, 3800, 7000, "2024-01-01", null,         DEMO_CRN])).rows[0].m5ratekey;
  const rk_dbn_cpt = (await client.query(drQ, ["Durban",    "Cape Town",    2100, 3800, 3500, 6400, "2024-01-01", null,         DEMO_CRN])).rows[0].m5ratekey;
  await client.query(drQ,                     ["Johannesburg","Durban",      1800, 3200, 3400, 6200, "2024-01-01", null,         DEMO_CRN]); // return legs
  await client.query(drQ,                     ["Durban",    "Johannesburg", 1600, 2900, 3100, 5800, "2023-01-01", "2023-12-31", DEMO_CRN]); // historical expired

  console.log("  ✓ 5 driver rates (active × 3 routes + JHB return + 1 historical expired)");

  // ── 10. INSTRUCTIONS (7) ─────────────────────────────────────────────────
  //
  //  #1  Hapag    DBN→JHB  2×12m     complete  invoiced  FULLY PAID    (120d ago)
  //  #2  Transnet DBN→JHB  1×12m+6m  complete  invoiced  UNPAID >90d   (95d ago)
  //  #3  PnP      CPT→JHB  3×12m     complete  invoiced  UNPAID 60d    (65d ago)
  //  #4  Hapag    CPT→JHB  2×12m hazmat complete invoiced PARTIAL 30d  (35d ago)
  //  #5  Shoprite DBN→JHB  1×12m+6m  complete  invoiced  PARTIAL curr  (12d ago)
  //  #6  Transnet DBN→CPT  2×12m     In Progress (FastLane subbie)      (3d ago)
  //  #7  PnP      DBN→JHB  1×6m      New                                (today)

  const m1Q = `
    INSERT INTO m1_controller (
      client, "ksmFileRef", shipment_type, pickup, dropoff,
      stackdate, "lastFreeDate", "clientFileRef", rateweight,
      description, status, vat,
      num_six_meters, num_twelve_meters, num_abnormal, num_breakbulk,
      weight, total_cost, rateper_6, rateper_12, rateper_abnormal, rateper_breakbulk,
      surcharge, unitrate, is_set_rate, historical_set_rate,
      booking_ref, vessel_name, paid_amount, payment_status,
      created_at, company_reg_num
    ) VALUES (
      $1,$2,$3,$4,$5,
      $6,$7,$8,$9,
      $10,$11,$12,
      $13,$14,$15,$16,
      $17,$18,$19,$20,$21,$22,
      $23,$24,$25,$26,
      $27,$28,$29,$30,
      $31,$32
    ) RETURNING m1key`;

  const stack     = daysFromNow(14);
  const lastFree  = daysFromNow(21);

  // Instr 1: 2×12m @ 7800 + 2×VGM(380) = 16,360 → gross 16360×1.15 = 18,814 → PAID
  const m1k1 = (await client.query(m1Q, [
    hapagKey,   "PFS-2026-0041", shipkey, "Durban",    "Johannesburg",
    stack, lastFree, "HLL-2026-0041", "Container",
    "Hapag-Lloyd 2×12m DBN→JHB — settled", "complete", 15,
    0, 2, 0, 0,
    null, 16360.00, null, 7800.00, null, null,
    null, null, false, null,
    "HLBK-2026-0041", "MSC Soleil", 18814.00, "paid",
    daysAgo(120), DEMO_CRN,
  ])).rows[0].m1key;

  // Instr 2: 1×12m(8200) + 1×6m(4500) + surcharge(600) = 13,300 → gross 15,295 → UNPAID >90d
  const m1k2 = (await client.query(m1Q, [
    transnetKey,"PFS-2026-0042", shipkey, "Durban",    "Johannesburg",
    stack, lastFree, "TRN-2026-0042", "Container",
    "Transnet DBN→JHB 1×12m+1×6m — OVERDUE 90+ days", "complete", 15,
    1, 1, 0, 0,
    null, 13300.00, 4500.00, 8200.00, null, null,
    null, null, false, null,
    "TRBK-2026-0042", "MSC Capella", 0, "unpaid",
    daysAgo(95), DEMO_CRN,
  ])).rows[0].m1key;

  // Instr 3: 3×12m(8700) + surcharge(580) = 26,680 → gross 30,682 → UNPAID 60d
  const m1k3 = (await client.query(m1Q, [
    pnpKey,     "PFS-2026-0043", shipkey, "Cape Town", "Johannesburg",
    stack, lastFree, "PNP-2026-0043", "Container",
    "Pick n Pay CPT→JHB 3×12m — 60-day overdue", "complete", 15,
    0, 3, 0, 0,
    null, 26680.00, null, 8700.00, null, null,
    null, null, false, null,
    "PNPBK-2026-0043", "MSC Flaminia", 0, "unpaid",
    daysAgo(65), DEMO_CRN,
  ])).rows[0].m1key;

  // Instr 4: 2×12m(9500) + 2×hazmat(1100) + 2×vgm(420) + 2×surcharge(750) = 23,540 → gross 27,071 → PARTIAL
  const m1k4 = (await client.query(m1Q, [
    hapagKey,   "PFS-2026-0044", shipkey, "Cape Town", "Johannesburg",
    stack, lastFree, "HLL-2026-0044", "Container",
    "Hapag-Lloyd CPT→JHB 2×12m Hazmat — partial payment 30d", "complete", 15,
    0, 2, 0, 0,
    null, 23540.00, null, 9500.00, null, null,
    null, null, false, null,
    "HLBK-2026-0044", "MSC Danit", 12500.00, "partial",
    daysAgo(35), DEMO_CRN,
  ])).rows[0].m1key;

  // Instr 5: 1×12m(7600) + 1×6m(4100) + vgm(360) = 12,060 → gross 13,869 → PARTIAL current
  const m1k5 = (await client.query(m1Q, [
    shopriteKey,"PFS-2026-0045", shipkey, "Durban",    "Johannesburg",
    stack, lastFree, "SHR-2026-0045", "Container",
    "Shoprite DBN→JHB 1×12m+1×6m — recent partial payment", "complete", 15,
    1, 1, 0, 0,
    null, 12060.00, 4100.00, 7600.00, null, null,
    null, null, false, null,
    "SHBK-2026-0045", "MSC Rossella", 5000.00, "partial",
    daysAgo(12), DEMO_CRN,
  ])).rows[0].m1key;

  // Instr 6: 2×12m(9200) = 18,400 — In Progress, FastLane subbie, VAT=0 (NON_VAT sub statement)
  const m1k6 = (await client.query(m1Q, [
    transnetKey,"PFS-2026-0046", shipkey, "Durban",    "Cape Town",
    stack, lastFree, "TRN-2026-0046", "Container",
    "Transnet DBN→CPT 2×12m — in transit via FastLane Transport", "In Progress", 0,
    0, 2, 0, 0,
    null, 18400.00, null, 9200.00, null, null,
    null, null, false, null,
    "TRBK-2026-0046", "MSC Katya", 0, "unpaid",
    daysAgo(3), DEMO_CRN,
  ])).rows[0].m1key;

  // Instr 7: 1×6m(3900) — New booking today
  const m1k7 = (await client.query(m1Q, [
    pnpKey,     "PFS-2026-0047", shipkey, "Durban",    "Johannesburg",
    stack, lastFree, "PNP-2026-0047", "Container",
    "Pick n Pay DBN→JHB 1×6m — new booking", "New", 15,
    1, 0, 0, 0,
    null, 3900.00, 3900.00, null, null, null,
    null, null, false, null,
    "PNPBK-2026-0047", "MSC Aurora", 0, "unpaid",
    daysAgo(0), DEMO_CRN,
  ])).rows[0].m1key;

  console.log(`  ✓ 7 instructions (m1keys ${m1k1}–${m1k7})`);

  // ── 11. CONTAINERS (14) ──────────────────────────────────────────────────
  // Column order matches production insertContainerQuery exactly.

  const cntQ = `
    INSERT INTO container (
      containernum, weight, m1key, container_type, cargo_description,
      "Hazardous", "Add Surcharges", "Surcharge Amount", "Hazardous Amount",
      is_12m_surcharge, surcharge_12m_amount,
      file_ref, vgm, "vgm amount", company_reg_num
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
    RETURNING containerkey`;

  // Instr 1 — 2×12m, VGM only
  const ck1 = (await client.query(cntQ, ["HLCU3456781", 28500, m1k1, "12m", "General Merchandise", false, false, 0,   0,    false, 0,   "PFS-0041-A", true,  380, DEMO_CRN])).rows[0].containerkey;
  const ck2 = (await client.query(cntQ, ["HLCU3456782", 27200, m1k1, "12m", "General Merchandise", false, false, 0,   0,    false, 0,   "PFS-0041-B", true,  380, DEMO_CRN])).rows[0].containerkey;
  // Instr 2 — 1×12m with surcharge, 1×6m plain
  await client.query(cntQ,             ["TRNT1234561", 30100, m1k2, "12m", "Steel Coils",          false, true,  0,   0,    true,  600, "PFS-0042-A", false, 0,   DEMO_CRN]);
  await client.query(cntQ,             ["TRNT1234562", 14800, m1k2, "6m",  "Steel Coils",          false, false, 0,   0,    false, 0,   "PFS-0042-B", false, 0,   DEMO_CRN]);
  // Instr 3 — 3×12m (first with 12m surcharge)
  await client.query(cntQ,             ["PNPD9876541", 29000, m1k3, "12m", "Foodstuffs",           false, true,  0,   0,    true,  580, "PFS-0043-A", false, 0,   DEMO_CRN]);
  await client.query(cntQ,             ["PNPD9876542", 26500, m1k3, "12m", "Foodstuffs",           false, false, 0,   0,    false, 0,   "PFS-0043-B", false, 0,   DEMO_CRN]);
  await client.query(cntQ,             ["PNPD9876543", 27800, m1k3, "12m", "Foodstuffs",           false, false, 0,   0,    false, 0,   "PFS-0043-C", false, 0,   DEMO_CRN]);
  // Instr 4 — 2×12m hazmat + VGM + surcharge
  await client.query(cntQ,             ["HLCU7890121", 24000, m1k4, "12m", "Hazardous Chemicals",  true,  true,  0,   1100, true,  750, "PFS-0044-A", true,  420, DEMO_CRN]);
  await client.query(cntQ,             ["HLCU7890122", 23500, m1k4, "12m", "Hazardous Chemicals",  true,  true,  0,   1100, true,  750, "PFS-0044-B", true,  420, DEMO_CRN]);
  // Instr 5 — 1×12m VGM, 1×6m plain
  await client.query(cntQ,             ["SHRT5554431", 31200, m1k5, "12m", "Retail Goods",         false, false, 0,   0,    false, 0,   "PFS-0045-A", true,  360, DEMO_CRN]);
  await client.query(cntQ,             ["SHRT5554432", 16000, m1k5, "6m",  "Retail Goods",         false, false, 0,   0,    false, 0,   "PFS-0045-B", false, 0,   DEMO_CRN]);
  // Instr 6 — 2×12m plain (subbie)
  await client.query(cntQ,             ["TRNT6667771", 28800, m1k6, "12m", "Mining Equipment",     false, false, 0,   0,    false, 0,   "PFS-0046-A", false, 0,   DEMO_CRN]);
  await client.query(cntQ,             ["TRNT6667772", 27500, m1k6, "12m", "Mining Equipment",     false, false, 0,   0,    false, 0,   "PFS-0046-B", false, 0,   DEMO_CRN]);
  // Instr 7 — 1×6m plain
  await client.query(cntQ,             ["PNPD2221111", 15000, m1k7, "6m",  "Foodstuffs",           false, false, 0,   0,    false, 0,   "PFS-0047-A", false, 0,   DEMO_CRN]);

  console.log("  ✓ 14 containers across 7 instructions");

  // ── 12. LEGS_M2 (13) ─────────────────────────────────────────────────────
  // Production saveLeg inserts: legnumber, startingpoint, destination, driverrate,
  // m1key, driverid, truckregnumber, containernumber, vgm, date, company_reg_num
  // m5ratekey and legstatus are nullable extras — safe to include in seed.

  const legQ = `
    INSERT INTO legs_m2 (
      legnumber, startingpoint, destination, driverrate,
      m1key, driverid, truckregnumber, containernumber, vgm,
      date, m5ratekey, legstatus, company_reg_num
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'complete',$12)
    RETURNING legkey`;

  const leg = async (p) => (await client.query(legQ, p)).rows[0].legkey;

  // Instr 1 — Sipho & Mandla, DBN→JHB 12m
  await leg([1,"Durban","Johannesburg",3200, m1k1,siphoId, "ND 45 678 GP","HLCU3456781",0,daysAgo(120),rk_dbn_jhb,DEMO_CRN]);
  await leg([2,"Durban","Johannesburg",3200, m1k1,mandlaId,"ND 12 345 GP","HLCU3456782",0,daysAgo(120),rk_dbn_jhb,DEMO_CRN]);
  // Instr 2 — Deon, DBN→JHB (12m truck + 6m truck)
  await leg([1,"Durban","Johannesburg",3200, m1k2,deonId,  "ND 12 345 GP","TRNT1234561",0,daysAgo(95), rk_dbn_jhb,DEMO_CRN]);
  await leg([2,"Durban","Johannesburg",1800, m1k2,deonId,  "ND 78 901 GP","TRNT1234562",0,daysAgo(95), rk_dbn_jhb,DEMO_CRN]);
  // Instr 3 — Mandla ×2, Sipho ×1, CPT→JHB 12m
  await leg([1,"Cape Town","Johannesburg",3500, m1k3,mandlaId,"ND 45 678 GP","PNPD9876541",0,daysAgo(65),rk_cpt_jhb,DEMO_CRN]);
  await leg([2,"Cape Town","Johannesburg",3500, m1k3,mandlaId,"ND 12 345 GP","PNPD9876542",0,daysAgo(65),rk_cpt_jhb,DEMO_CRN]);
  await leg([3,"Cape Town","Johannesburg",3500, m1k3,siphoId, "ND 45 678 GP","PNPD9876543",0,daysAgo(65),rk_cpt_jhb,DEMO_CRN]);
  // Instr 4 — Sunrise Haulage, CPT→JHB subie 12m rate = 7000
  const legSunrise1 = await leg([1,"Cape Town","Johannesburg",7000, m1k4,sunriseId,"SRH 4432 CC","HLCU7890121",0,daysAgo(35),rk_cpt_jhb,DEMO_CRN]);
  const legSunrise2 = await leg([2,"Cape Town","Johannesburg",7000, m1k4,sunriseId,"SRH 4432 CC","HLCU7890122",0,daysAgo(35),rk_cpt_jhb,DEMO_CRN]);
  // Instr 5 — Sipho 12m, Deon 6m, DBN→JHB
  await leg([1,"Durban","Johannesburg",3200, m1k5,siphoId,"ND 45 678 GP","SHRT5554431",0,daysAgo(12),rk_dbn_jhb,DEMO_CRN]);
  await leg([2,"Durban","Johannesburg",1800, m1k5,deonId, "ND 78 901 GP","SHRT5554432",0,daysAgo(12),rk_dbn_jhb,DEMO_CRN]);
  // Instr 6 — FastLane Transport, DBN→CPT subie 12m rate = 6400
  // Dated 20 days ago so they fall in last month's sub statement window
  const legFast1 = await leg([1,"Durban","Cape Town",6400, m1k6,fastlaneId,"FLT 8819 CC","TRNT6667771",0,daysAgo(20),rk_dbn_cpt,DEMO_CRN]);
  const legFast2 = await leg([2,"Durban","Cape Town",6400, m1k6,fastlaneId,"FLT 8819 CC","TRNT6667772",0,daysAgo(20),rk_dbn_cpt,DEMO_CRN]);

  console.log("  ✓ 13 legs (9 owned driver + 2 Sunrise Haulage + 2 FastLane Transport)");

  // ── 13. INVOICES (5 — one per completed instruction) ─────────────────────

  const invQ = `
    INSERT INTO invoice (clientid, m1key, invoice_num, groupid, date, company_reg_num)
    VALUES ($1,$2,$3,NULL,$4,$5) RETURNING ikey`;

  const inv1 = (await client.query(invQ, [hapagKey,    m1k1, "PFS-INV-0041", daysAgo(120), DEMO_CRN])).rows[0].ikey;
  const inv2 = (await client.query(invQ, [transnetKey, m1k2, "PFS-INV-0042", daysAgo(95),  DEMO_CRN])).rows[0].ikey;
  const inv3 = (await client.query(invQ, [pnpKey,      m1k3, "PFS-INV-0043", daysAgo(65),  DEMO_CRN])).rows[0].ikey;
  const inv4 = (await client.query(invQ, [hapagKey,    m1k4, "PFS-INV-0044", daysAgo(35),  DEMO_CRN])).rows[0].ikey;
  const inv5 = (await client.query(invQ, [shopriteKey, m1k5, "PFS-INV-0045", daysAgo(12),  DEMO_CRN])).rows[0].ikey;

  console.log("  ✓ 5 invoices (PFS-INV-0041 to 0045)");

  // ── 14. PAYMENTS (3) ─────────────────────────────────────────────────────
  // line_items JSONB structure matches what statementGenerator reads.

  const payInsert = async (clientid, invoiceid, invNum, amount, ref, date) => {
    const li = JSON.stringify([{
      type:          "Invoice",
      id:            invoiceid,
      invoice_num:   invNum,
      amount_to_pay: amount,
      this_payment:  amount,
      line_date:     date,
    }]);
    await client.query(
      `INSERT INTO payment_m3
         (clientid, invoiceid, addon_id, amount, reference, fileupload, line_items, company_reg_num)
       VALUES ($1,$2,NULL,$3,$4,$5,$6::jsonb,$7)`,
      [clientid, invoiceid, amount, ref, date, li, DEMO_CRN]
    );
  };

  await payInsert(hapagKey,    inv1, "PFS-INV-0041", 18814.00, "EFT-PFS-REF-0041", daysAgo(90)); // full
  await payInsert(hapagKey,    inv4, "PFS-INV-0044", 12500.00, "EFT-PFS-REF-0044", daysAgo(15)); // partial
  await payInsert(shopriteKey, inv5, "PFS-INV-0045",  5000.00, "EFT-PFS-REF-0045", daysAgo(5));  // partial

  console.log("  ✓ 3 payments (Instr 1 fully paid, Instr 4 + 5 partial)");

  // ── 15. ADD-ONS (3) ──────────────────────────────────────────────────────

  const aoQ = `
    INSERT INTO add_ons
      (client_id, items, amount, date, invoice_number, group_id, created_at,
       vat_applied, booking_ref, client_ref, vessel_number,
       paid_amount, status, company_reg_num)
    VALUES ($1,$2,$3,$4,$5,NULL,$6,$7,$8,$9,$10,$11,$12,$13)`;

  // Hapag — Port Congestion Surcharge (20d ago → current bucket), partial R800 paid
  await client.query(aoQ, [
    hapagKey,
    JSON.stringify({ description: "Port Congestion Surcharge — Durban June 2026" }),
    1800.00, daysAgo(20), "PFS-AO-0051", daysAgo(20),
    true, "HLBK-2026-0044", "HLL-2026-0044", "MSC Danit",
    800.00, "partial", DEMO_CRN,
  ]);

  // Transnet — Dangerous Goods Declaration (100d ago → >90d bucket), unpaid
  await client.query(aoQ, [
    transnetKey,
    JSON.stringify({ description: "Dangerous Goods Declaration Fee — Class 3 Flammable" }),
    2500.00, daysAgo(100), "PFS-AO-0052", daysAgo(100),
    true, "TRBK-2026-0042", "TRN-2026-0042", "MSC Capella",
    0, "unpaid", DEMO_CRN,
  ]);

  // Pick n Pay — Extended Storage Fee (70d ago → 60d bucket), unpaid
  await client.query(aoQ, [
    pnpKey,
    JSON.stringify({ description: "Extended Storage Fee — CPT Depot 14 days" }),
    950.00, daysAgo(70), "PFS-AO-0053", daysAgo(70),
    true, "PNPBK-2026-0043", "PNP-2026-0043", "MSC Flaminia",
    0, "unpaid", DEMO_CRN,
  ]);

  console.log("  ✓ 3 add-ons (Hapag partial, Transnet unpaid, PnP unpaid)");

  // ── 16. CREDIT NOTE (1) ──────────────────────────────────────────────────

  await client.query(
    `INSERT INTO credit_notes
       (client_id, creditnote_date, amount, containerids, doc_no,
        m1key, description, account_no, company_reg_num)
     VALUES ($1,$2,$3::double precision[],$4::integer[],$5,$6,$7,$8,$9)`,
    [
      hapagKey, daysAgo(110),
      [760.00], [ck2],
      "PFS-CN-0001", m1k1,
      "Rate correction — VGM charge incorrectly applied twice on HLCU3456782",
      "62098765432", DEMO_CRN,
    ]
  );
  console.log("  ✓ Credit note PFS-CN-0001 (R760 against HLCU3456782)");

  // ── 17. AGING ANALYSIS (4) + STATEMENTS (4) ──────────────────────────────
  //
  //  All amounts derived from: (total_cost × 1.vat) − paid + (add-on × 1.15) − ao_paid
  //
  //  Hapag   current R1,270   = add-on R1,800×1.15 − R800 paid
  //          30days  R14,571  = Instr 4: R23,540×1.15 − R12,500
  //  Transnet 90days R18,170  = Instr 2: R13,300×1.15 + add-on R2,500×1.15
  //  PnP     60days  R31,774.50 = Instr 3: R26,680×1.15 + add-on R950×1.15
  //  Shoprite current R8,869  = Instr 5: R12,060×1.15 − R5,000

  const agQ = `
    INSERT INTO aging_analysis
      (clientid, current, "30days", "60days", "90days", company_reg_num)
    VALUES ($1,$2,$3,$4,$5,$6) RETURNING aging_key`;

  const agHapag    = (await client.query(agQ, [hapagKey,    1270.00,  14571.00, 0,          0,        DEMO_CRN])).rows[0].aging_key;
  const agTransnet = (await client.query(agQ, [transnetKey, 0,        0,        0,          18170.00, DEMO_CRN])).rows[0].aging_key;
  const agPnP      = (await client.query(agQ, [pnpKey,      0,        0,        31774.50,   0,        DEMO_CRN])).rows[0].aging_key;
  const agShoprite = (await client.query(agQ, [shopriteKey, 8869.00,  0,        0,          0,        DEMO_CRN])).rows[0].aging_key;

  const genDate = firstOfCurrentMonth();

  await client.query(
    `INSERT INTO statements (clientid, agingid, groupid, generation_date, opening_balance, insurance_amount, company_reg_num)
     VALUES ($1,$2,NULL,$5,0,0,$6), ($3,$4,NULL,$5,0,0,$6)`,
    [hapagKey, agHapag, transnetKey, agTransnet, genDate, DEMO_CRN]
  );
  await client.query(
    `INSERT INTO statements (clientid, agingid, groupid, generation_date, opening_balance, insurance_amount, company_reg_num)
     VALUES ($1,$2,NULL,$5,0,0,$6), ($3,$4,NULL,$5,0,0,$6)`,
    [pnpKey, agPnP, shopriteKey, agShoprite, genDate, DEMO_CRN]
  );

  console.log("  ✓ 4 aging analysis records + 4 statements");

  // ── 18. WAGES (9 = 3 drivers × 3 months) ─────────────────────────────────

  const wageRows = [
    [siphoId,  1, 21300.00, 3790.00, 17510.00],  // May
    [siphoId,  2, 20700.00, 3655.00, 17045.00],  // April
    [siphoId,  3, 21800.00, 3905.00, 17895.00],  // March
    [mandlaId, 1, 19700.00, 3480.00, 16220.00],
    [mandlaId, 2, 19000.00, 3310.00, 15690.00],
    [mandlaId, 3, 20200.00, 3620.00, 16580.00],
    [deonId,   1, 18150.00, 3185.00, 14965.00],
    [deonId,   2, 17800.00, 3105.00, 14695.00],
    [deonId,   3, 18400.00, 3240.00, 15160.00],
  ];

  for (const [empid, monthsAgo, earnings, deductions, net] of wageRows) {
    await client.query(
      `INSERT INTO wages
         (employeeid, total_earnings, total_deductions, net_pay, employee_date, company_reg_num)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT ON CONSTRAINT unique_wage_per_employee_month_year
       DO UPDATE SET
         total_earnings   = EXCLUDED.total_earnings,
         total_deductions = EXCLUDED.total_deductions,
         net_pay          = EXCLUDED.net_pay`,
      [empid, earnings, deductions, net, lastDayOfMonthAgo(monthsAgo), DEMO_CRN]
    );
  }
  console.log("  ✓ 9 wage slips (Sipho, Mandla, Deon — March / April / May 2026)");

  // ── 19. EMPLOYEE DEDUCTION HISTORY ───────────────────────────────────────

  for (const [empid, taxRate] of [[siphoId,18],[mandlaId,17],[deonId,16]]) {
    await client.query(
      `INSERT INTO employee_deduction_history
         (employeeid, effective_date, income_tax_rate, deduction_income_tax,
          deduction_uif, deduction_other_deductions,
          deduction_bonus, deduction_savings, deduction_loan, deduction_damage,
          company_reg_num)
       VALUES ($1,'2024-01-01',$2,0,0,0,0,0,0,0,$3)`,
      [empid, taxRate, DEMO_CRN]
    );
  }
  console.log("  ✓ 3 employee deduction history records");

  // ── 20. BASE SALARY HISTORY ──────────────────────────────────────────────

  await client.query(
    `INSERT INTO base_salary_history (userid, base, date, company_reg_num)
     VALUES ($1,18500,'2024-01-01',$4),
            ($2,17000,'2024-01-01',$4),
            ($3,16500,'2024-01-01',$4)`,
    [siphoId, mandlaId, deonId, DEMO_CRN]
  );
  console.log("  ✓ 3 base salary history records");

  // ── 21. PURCHASE ORDERS (4) ──────────────────────────────────────────────

  const poQ = `
    INSERT INTO purchase_orders
      (expense_type_id, supplier_id, reg_no, attention_to, received_by,
       quantity, unit_price, description, subbie, date, ponum, total, truckid, company_reg_num)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`;

  await client.query(poQ, [etFuelId,  sup1Id, "ND 45 678 GP", "Sipho Khumalo",  "Rajan Naidoo",    0, 0,      "Diesel fill-up — Durban depot",            false, daysAgo(15), "PFS-PO-0021", 4850.00,  truck1Key, DEMO_CRN]);
  await client.query(poQ, [etFuelId,  sup1Id, "ND 12 345 GP", "Mandla Zulu",    "Rajan Naidoo",    0, 0,      "Diesel fill-up — Johannesburg depot",       false, daysAgo(10), "PFS-PO-0022", 5120.00,  truck2Key, DEMO_CRN]);
  await client.query(poQ, [etTyresId, sup2Id, "ND 78 901 GP", "Deon Potgieter", "Thabo Mokoena",   4, 3100.00,"Bridgestone 315/80R22.5 tyres set ×4",      false, daysAgo(20), "PFS-PO-0023", 12400.00, truck3Key, DEMO_CRN]);
  await client.query(poQ, [etMaintId, sup3Id, null,           "Priya Pillay",   "Rajan Naidoo",    1, 3200.00,"General service + filters — ND 45 678 GP",  false, daysAgo(5),  "PFS-PO-0024", 3200.00,  truck1Key, DEMO_CRN]);

  console.log("  ✓ 4 purchase orders (2 fuel, 1 tyres, 1 maintenance)");

  // ── 22. EXPENSES_M2 (4) ──────────────────────────────────────────────────

  const expQ = `
    INSERT INTO expenses_m2
      (type, documentfrom, expensecost, description, slipname, slipuploaddate,
       truckid, driverid, orderno, company_reg_num)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`;

  await client.query(expQ, ["fuel",        "BP Durban Harbour",    4850.00,  "Diesel — ND 45 678 GP",           "slip_pfs_0021.jpg", daysAgo(15), truck1Key, siphoId,  "ORD-PFS-0021", DEMO_CRN]);
  await client.query(expQ, ["fuel",        "BP Johannesburg South", 5120.00,  "Diesel — ND 12 345 GP",           "slip_pfs_0022.jpg", daysAgo(10), truck2Key, mandlaId, "ORD-PFS-0022", DEMO_CRN]);
  await client.query(expQ, ["maintenance", "Bridgestone Durban",   12400.00, "Tyres ×4 — ND 78 901 GP",         "slip_pfs_0023.jpg", daysAgo(20), truck3Key, deonId,   "ORD-PFS-0023", DEMO_CRN]);
  await client.query(expQ, ["maintenance", "NTK Truck Parts",       3200.00,  "Full service + filters — ND 45 678 GP","slip_pfs_0024.jpg",daysAgo(5),truck1Key, siphoId, "ORD-PFS-0024", DEMO_CRN]);

  console.log("  ✓ 4 expense records (2 fuel, 1 tyres, 1 maintenance)");

  // ── 23. SUBCONTRACTOR STATEMENTS (2) ─────────────────────────────────────
  //  Sunrise Haulage  (VAT):     2 legs × R7,000 × 1.15 = R16,100
  //  FastLane Transport (NON_VAT): 2 legs × R6,400 × 1.0  = R12,800

  const subDate = firstOfCurrentMonth(); // June 1 — covers May legs

  await client.query(
    `INSERT INTO subcontractor_statements
       (subbie_reg_num, date, amount, legids, vat_status, company_reg_num)
     VALUES ($1,$2,$3,$4::json,$5,$6)`,
    [
      "SUBCC-4432", subDate, 16100.00,
      JSON.stringify([
        { legkey: legSunrise1, driverrate: 7000.00, vatPercentage: 15 },
        { legkey: legSunrise2, driverrate: 7000.00, vatPercentage: 15 },
      ]),
      "VAT", DEMO_CRN,
    ]
  );

  await client.query(
    `INSERT INTO subcontractor_statements
       (subbie_reg_num, date, amount, legids, vat_status, company_reg_num)
     VALUES ($1,$2,$3,$4::json,$5,$6)`,
    [
      "SUBCC-8819", subDate, 12800.00,
      JSON.stringify([
        { legkey: legFast1, driverrate: 6400.00, vatPercentage: 0 },
        { legkey: legFast2, driverrate: 6400.00, vatPercentage: 0 },
      ]),
      "NON_VAT", DEMO_CRN,
    ]
  );

  console.log("  ✓ 2 subcontractor statements (Sunrise VAT R16,100 | FastLane NON-VAT R12,800)");

  // ── 24. BILLING EVENTS (3) ───────────────────────────────────────────────

  await client.query(
    `INSERT INTO billing_events
       (company_reg_num, event_type, old_value, new_value, performed_by, notes)
     VALUES
       ($1,'plan_assigned',    NULL,      'enterprise','seed@whizzaway.test','Enterprise plan assigned at onboarding'),
       ($1,'setup_fee_recorded',NULL,     'R25000',    'seed@whizzaway.test','Setup fee paid — EFT confirmed'),
       ($1,'monthly_fee_recorded','R10500','R10500',   'system',            'June 2026 monthly billing')`,
    [DEMO_CRN]
  );
  console.log("  ✓ 3 billing events");

  // ── 25. COMPANY USAGE SNAPSHOT ────────────────────────────────────────────
  // 5 portal users + 3 drivers = 8 counted staff; subcontractor employees excluded.
  // 4 owned trucks; subcontractor trucks excluded from count.

  const snapMonth = new Date();
  snapMonth.setDate(1);
  snapMonth.setHours(0, 0, 0, 0);

  await client.query(
    `INSERT INTO company_usage
       (company_reg_num, snapshot_month, user_count, truck_count,
        overage_users, overage_trucks, overage_amount)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (company_reg_num, snapshot_month)
     DO UPDATE SET
       user_count     = EXCLUDED.user_count,
       truck_count    = EXCLUDED.truck_count,
       overage_users  = EXCLUDED.overage_users,
       overage_trucks = EXCLUDED.overage_trucks,
       overage_amount = EXCLUDED.overage_amount`,
    [DEMO_CRN, snapMonth, 8, 4, 0, 0, 0]
  );
  console.log("  ✓ Company usage snapshot (8 staff, 4 owned trucks — within Enterprise limits)");
  console.log("\nOperational seed complete.\n");
}

// ─── Summary ──────────────────────────────────────────────────────────────────

function printSummary() {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║          PREMIER FREIGHT SOLUTIONS — DEMO COMPANY CREDENTIALS                ║
║                       Password for all: Test@1234                            ║
╠══════════════════╦════════════════╦══════════════════════════════════════════╣
║ Name             ║ Role           ║ Email                                    ║
╠══════════════════╬════════════════╬══════════════════════════════════════════╣
║ Rajan Naidoo     ║ Admin     (1)  ║ admin@premierfreight.co.za  ← START HERE ║
║ Thabo Mokoena    ║ Controller(2)  ║ controller@premierfreight.co.za          ║
║ Priya Pillay     ║ Finance   (3)  ║ finance@premierfreight.co.za             ║
║ Susan van der B. ║ Director  (4)  ║ director@premierfreight.co.za            ║
║ Lungelo Dlamini  ║ Creditors (8)  ║ creditors@premierfreight.co.za           ║
╠══════════════════╩════════════════╩══════════════════════════════════════════╣
║  company_reg_num: DEMO-ENT-PREMIER   Plan: Enterprise / Active               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  FLEET                                                                       ║
║    ND 45 678 GP  Volvo FH16 2022        expiry: +290 days                    ║
║    ND 12 345 GP  MAN TGX 480 2021       expiry: +178 days                    ║
║    ND 78 901 GP  Mercedes Actros 2023   expiry: +77 days                     ║
║    ND 33 100 GP  DAF XF 2018            expiry: +24 days  ← LICENCE ALERT   ║
║    SRH 4432 CC   Scania R500 (subbie)   Sunrise Haulage CC   SUBCC-4432      ║
║    FLT 8819 CC   Volvo FM 460 (subbie)  FastLane Transport   SUBCC-8819      ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  CLIENT OUTSTANDING                                                          ║
║    Hapag-Lloyd SA     R15,841  current R1,270 + 30d R14,571                  ║
║    Transnet PT        R18,170  >90 days — RED                                ║
║    Pick n Pay Dist    R31,775  60 days — AMBER                               ║
║    Shoprite Holdings   R8,869  current                                       ║
║    ─────────────────────────────────                                         ║
║    TOTAL OUTSTANDING  R74,655                                                ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  INSTRUCTIONS                                                                ║
║    PFS-INV-0041  Hapag  DBN→JHB  2×12m     PAID        R18,814              ║
║    PFS-INV-0042  Trans  DBN→JHB  1×12m+6m  UNPAID      R15,295  >90d !!     ║
║    PFS-INV-0043  PnP    CPT→JHB  3×12m     UNPAID      R30,682  60d         ║
║    PFS-INV-0044  Hapag  CPT→JHB  2×12m haz PARTIAL     R14,571  30d         ║
║    PFS-INV-0045  Shop   DBN→JHB  1×12m+6m  PARTIAL      R8,869  current     ║
║    (no inv)      Trans  DBN→CPT  2×12m     IN PROGRESS (FastLane)            ║
║    (no inv)      PnP    DBN→JHB  1×6m      NEW                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  PAYROLL    Sipho / Mandla / Deon — March, April, May 2026 wage slips        ║
║  EXPENSES   2 fuel (BP) | 1 tyres (Bridgestone) | 1 maintenance (NTK)       ║
║  POs        PFS-PO-0021/0022 fuel | 0023 tyres | 0024 maintenance           ║
║  SUBBIES    Sunrise Haulage VAT R16,100 | FastLane NON-VAT R12,800           ║
║  CREDIT     PFS-CN-0001 R760 against HLCU3456782 (Hapag Instr 1)            ║
╚══════════════════════════════════════════════════════════════════════════════╝

  Run:     node --env-file=.env server/database/seed_demo_premier.js
  Cleanup: node --env-file=.env server/database/seed_demo_premier.js --cleanup
`);
}

seed();
