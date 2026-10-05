import { pool } from "../../config/database.js"
import {
  agingForAllClients,
  outstandingAsAt,
  dayBefore,
} from "../statements/statementDerivation.js"

// Define monthNames for numeric-to-name conversion
const monthNames = {
  1: "January",
  2: "February",
  3: "March",
  4: "April",
  5: "May",
  6: "June",
  7: "July",
  8: "August",
  9: "September",
  10: "October",
  11: "November",
  12: "December",
}

// Shared helper — converts a month name + year into a UTC date range
const getDateRange = (month, year) => {
  const monthNum = new Date(`${month.trim()} 1, ${year}`).getMonth() + 1
  const paddedMonth = String(monthNum).padStart(2, '0')
  const dateFrom = `${year}-${paddedMonth}-01`
  const nextMonth = monthNum === 12 ? 1 : monthNum + 1
  const nextYear = monthNum === 12 ? parseInt(year) + 1 : parseInt(year)
  const dateTo = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
  return { dateFrom, dateTo }
}

// ---------------------------------------------------------------------------
// Categories and VAT
//
// Every analytic reports its values as categories, each an { ex, vat } pair:
// the VAT-exclusive amount and the VAT on it. The client stacks the categories
// and its per-chart VAT toggle shows ex or ex + vat, so both views come from
// the same numbers. Where the VAT on an amount comes from:
//   * invoices, credit notes, subcontractor rates: the instruction's rate
//     (m1_controller.vat, a percentage; none when NULL — as the VAT recon does)
//   * add-ons: add_ons.amount INCLUDES 15% VAT when vat_applied
//   * fuel and other purchase orders: the cost is captured excl. VAT and the
//     "Input VAT" amount is stored on the PO (purchase_orders.vat, repeated on
//     every row of the PO; fuel joins its PO via expenses_m2.orderno = ponum).
//     No VAT recorded = no VAT.
//   * wages: no VAT
// Credit notes are negative categories.
// ---------------------------------------------------------------------------
const SA_VAT_DIVISOR = "1.15"

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100
const cat = (ex = 0, vat = 0) => ({ ex: round2(ex), vat: round2(vat) })
const negCat = (c) => cat(-c.ex, -c.vat)
const inclVat = (c) => (c ? c.ex + c.vat : 0)
const sumCats = (categories) =>
  round2(Object.values(categories).reduce((sum, c) => sum + inclVat(c), 0))

// add_ons.amount is VAT-inclusive when vat_applied; these give its parts.
const addOnExSql = (alias) =>
  `(CASE WHEN COALESCE(${alias}.vat_applied, true) THEN ${alias}.amount / ${SA_VAT_DIVISOR} ELSE ${alias}.amount END)`

// VAT on a fuel expense row of expenses_with_po_v (alias e): its PO's Input VAT.
const fuelVatSql = (alias) =>
  `COALESCE((SELECT MAX(pov.vat) FROM purchase_orders pov WHERE pov.ponum = ${alias}.orderno), 0)`

// A PO's Input VAT, counted once: on the PO's first row (the row that also
// carries the PO total). Use as a column of purchase_orders (alias po).
const poVatSql = (alias) => `
  (CASE WHEN ${alias}.po_id = (SELECT MIN(p1.po_id) FROM purchase_orders p1 WHERE p1.ponum = ${alias}.ponum)
        THEN COALESCE((SELECT MAX(p2.vat) FROM purchase_orders p2 WHERE p2.ponum = ${alias}.ponum), 0)
        ELSE 0 END)`

const getFuelExpenses = async (client, month, year) => {
  const query = `
    SELECT t.truckregnum,
           SUM(e.expensecost) AS total_cost,
           SUM(${fuelVatSql("e")}) AS total_vat
    FROM expenses_with_po_v e
    JOIN m5_trucks t ON e.truckid = t.m5truckskey
    WHERE e.type = 'fuel'
    AND TRIM(to_char(e.expense_date, 'Month')) = $1
    AND EXTRACT(YEAR FROM e.expense_date)::text = $2
    AND t.is_subcontractor = false
    AND t.status = true
    GROUP BY t.truckregnum
    ORDER BY total_cost DESC
  `
  const result = await client.query(query, [month, year])
  console.log(`Fuel per truck query returned ${result.rows.length} rows`)

  return result.rows.map((row) => ({
    truckregnum: row.truckregnum,
    total_cost: Number.parseFloat(row.total_cost),
    categories: { fuel: cat(row.total_cost, row.total_vat) },
    month_name: month.trim(),
    year: year.toString(),
  }))
}

// Turnover = invoices (VAT-inclusive) + add-ons - credit notes (VAT-inclusive).
// Turnover for a date range, by category: invoices (by invoice date), add-ons
// (by add-on date) and credit notes (by credit note date, negative).
const calculateMonthlyTurnoverBreakdown = async (client, dateFrom, dateTo, clientId = null) => {
  const params = [dateFrom, dateTo]
  if (clientId) params.push(clientId)

  const invoiceQuery = `
    SELECT
      COALESCE(SUM(m.total_cost), 0) AS ex,
      COALESCE(SUM(m.total_cost * COALESCE(m.vat, 0)::numeric / 100), 0) AS vat
    FROM invoice i
    JOIN m1_controller m ON i.m1key = m.m1key
    WHERE i.date >= $1
      AND i.date < $2
      ${clientId ? "AND i.clientid = $3" : ""}
  `

  const addOnQuery = `
    SELECT
      COALESCE(SUM(${addOnExSql("a")}), 0) AS ex,
      COALESCE(SUM(a.amount - ${addOnExSql("a")}), 0) AS vat
    FROM add_ons a
    WHERE a.date >= $1
      AND a.date < $2
      ${clientId ? "AND a.client_id = $3" : ""}
  `

  // credit_notes.amount holds VAT-exclusive line amounts; the VAT is the
  // instruction's rate (the same gross the statements use).
  const creditQuery = `
    SELECT
      COALESCE(SUM(amt.amount), 0) AS ex,
      COALESCE(SUM(amt.amount * COALESCE(m.vat, 0)::numeric / 100), 0) AS vat
    FROM credit_notes cn
    CROSS JOIN LATERAL unnest(cn.amount) AS amt(amount)
    LEFT JOIN m1_controller m ON m.m1key = cn.m1key
    WHERE cn.creditnote_date >= $1
      AND cn.creditnote_date < $2
      ${clientId ? "AND cn.client_id = $3" : ""}
  `

  const [invoiceResult, addOnResult, creditResult] = await Promise.all([
    client.query(invoiceQuery, params),
    client.query(addOnQuery, params),
    client.query(creditQuery, params),
  ])

  const row = (result) => cat(result.rows[0]?.ex, result.rows[0]?.vat)
  return {
    invoices: row(invoiceResult),
    addons: row(addOnResult),
    creditNotes: negCat(row(creditResult)),
  }
}

// Turnover = invoices + add-ons - credit notes, VAT-inclusive.
const calculateMonthlyTurnover = async (client, dateFrom, dateTo, clientId = null) =>
  sumCats(await calculateMonthlyTurnoverBreakdown(client, dateFrom, dateTo, clientId))

const clientName = async (client, clientId) =>
  (await client.query("SELECT client FROM m5_client WHERE m5clientkey = $1", [clientId]))
    .rows[0]?.client || ""

const getTurnoverPerMonth = async (client, month, year, clientId = null) => {
  const { dateFrom, dateTo } = getDateRange(month, year)
  const period = { month_name: month.trim(), year: year.toString() }

  const total = await calculateMonthlyTurnoverBreakdown(client, dateFrom, dateTo)
  const turnoverData = [
    { client: "Total Turnover", turnover: sumCats(total), categories: total, ...period },
  ]

  if (clientId) {
    const name = await clientName(client, clientId)
    if (name) {
      const scoped = await calculateMonthlyTurnoverBreakdown(client, dateFrom, dateTo, clientId)
      turnoverData.unshift({ client: name, turnover: sumCats(scoped), categories: scoped, ...period })
    }
  }

  return turnoverData
}

// Payments Received per Month, by what each payment line settled. A payment
// is VAT-inclusive; its VAT is the settled item's: an invoice at its
// instruction's rate, an add-on at 15% when vat_applied. Any other line type
// carries no known VAT.
const getPaymentsReceivedPerMonth = async (client, month, year, clientId = null) => {
  const query = (withClient) => `
    WITH lines AS (
      SELECT
        li.item->>'type' AS item_type,
        (li.item->>'this_payment')::numeric AS paid,
        CASE li.item->>'type'
          WHEN 'Invoice' THEN 1 + COALESCE((
            SELECT m.vat FROM invoice i JOIN m1_controller m ON m.m1key = i.m1key
            WHERE i.ikey = (li.item->>'id')::int), 0)::numeric / 100
          WHEN 'Add-on' THEN (
            SELECT CASE WHEN COALESCE(a.vat_applied, true) THEN ${SA_VAT_DIVISOR} ELSE 1 END
            FROM add_ons a WHERE a.addon_id = (li.item->>'id')::int)
          ELSE 1
        END AS vat_factor
      FROM payment_m3 p
      CROSS JOIN LATERAL jsonb_array_elements(p.line_items) AS li(item)
      WHERE TRIM(TO_CHAR((li.item->>'line_date')::date, 'Month')) = $1
        AND EXTRACT(YEAR FROM (li.item->>'line_date')::date)::TEXT = $2
        ${withClient ? "AND p.clientid = $3" : ""}
    )
    SELECT
      CASE item_type WHEN 'Invoice' THEN 'invoicePayments'
                     WHEN 'Add-on' THEN 'addonPayments'
                     ELSE 'otherPayments' END AS category,
      COALESCE(SUM(paid / COALESCE(vat_factor, 1)), 0) AS ex,
      COALESCE(SUM(paid - paid / COALESCE(vat_factor, 1)), 0) AS vat
    FROM lines
    GROUP BY 1
  `

  const breakdown = async (withClient) => {
    const result = await client.query(
      query(withClient),
      withClient ? [month, year, clientId] : [month, year]
    )
    const categories = {
      invoicePayments: cat(),
      addonPayments: cat(),
      otherPayments: cat(),
    }
    for (const row of result.rows) categories[row.category] = cat(row.ex, row.vat)
    return categories
  }

  const period = { month: month.trim(), year: year.toString() }
  const totalCategories = await breakdown(false)
  const data = [
    {
      name: "Total Payments",
      amount: sumCats(totalCategories),
      categories: totalCategories,
      type: "total",
      ...period,
    },
  ]

  if (clientId) {
    const name = await clientName(client, clientId)
    if (name) {
      const categories = await breakdown(true)
      data.push({ name, amount: sumCats(categories), categories, type: "client", ...period })
    }
  }

  return data
}

// List distinct clients that have payments for the given month/year
const getPaymentClients = async (client, month, year) => {
  const query = `
    SELECT DISTINCT c.m5clientkey, c.client
    FROM payment_m3 p
    JOIN m5_client c ON p.clientid = c.m5clientkey
    CROSS JOIN LATERAL jsonb_array_elements(p.line_items) AS li(item)
    WHERE TRIM(TO_CHAR((li.item->>'line_date')::date, 'Month')) = $1
      AND EXTRACT(YEAR FROM (li.item->>'line_date')::date)::TEXT = $2
    ORDER BY c.client
  `
  const res = await client.query(query, [month, year])
  return res.rows.map((row) => ({ m5clientkey: row.m5clientkey, client: row.client }))
}

const getAllClients = async (client) => {
  const query = `
    SELECT m5clientkey, client
    FROM m5_client
    WHERE status = true
    ORDER BY client
  `
  const result = await client.query(query)
  console.log("Clients query result:", result.rows)
  console.log(`Query returned ${result.rows.length} rows`)
  return result.rows.map((row) => ({
    m5clientkey: row.m5clientkey,
    client: row.client,
  }))
}

const getAllSubcontractors = async (client) => {
  const query = `
    SELECT 
      MIN(userid) AS userid,
      companyname,
      subei_reg_num
    FROM m5_employee
    WHERE roleid = 6
    GROUP BY companyname, subei_reg_num
    ORDER BY companyname
  `
  const result = await client.query(query)
  console.log("Subcontractors query result:", result.rows)
  console.log(`Query returned ${result.rows.length} rows`)
  return result.rows.map((row) => ({
    userid: row.userid,
    companyname: row.companyname,
    subei_reg_num: row.subei_reg_num,
  }))
}

const getAllTrucks = async (client) => {
  const query = `
    SELECT m5truckskey, truckregnum
    FROM m5_trucks
    WHERE is_subcontractor = false AND status = true
    ORDER BY truckregnum
  `
  const result = await client.query(query)
  console.log("Trucks query result:", result.rows)
  console.log(`Query returned ${result.rows.length} rows`)
  return result.rows.map((row) => ({
    m5truckskey: row.m5truckskey,
    truckregnum: row.truckregnum,
  }))
}

// Aging comes from the same derivation as client statements
// (models/statements/statementDerivation.js), so these reports and the
// statement pages cannot disagree.
//
// The selected month keeps the meaning the old statement-table query gave it:
// statements were dated the 1st of the month AFTER the one they covered, so
// "September" is the position at the close of August. A month that has not
// started yet returns nothing, as it did when no statement row existed for it.
const agingAsAtForMonth = (month, year) => {
  const index = Object.values(monthNames).indexOf(String(month || "").trim())
  if (index < 0 || !/^\d{4}$/.test(String(year || "").trim())) {
    throw new Error(`Invalid month/year "${month} ${year}"`)
  }
  const firstOfMonth = `${String(year).trim()}-${String(index + 1).padStart(2, "0")}-01`
  if (firstOfMonth > new Date().toISOString().slice(0, 10)) return null
  return dayBefore(firstOfMonth)
}

const ZERO_AGING = { current: 0, "30days": 0, "60days": 0, "90days": 0 }

const toAgingRow = (buckets) => ({
  current: buckets.current,
  thirtyDays: buckets["30days"],
  sixtyDays: buckets["60days"],
  ninetyDays: buckets["90days"],
})

// Each bucket as a category: the ex-VAT aging (the same items aged on their
// VAT-exclusive values) and the VAT, which is the gross aging minus that.
const agingCategories = (gross, ex) => ({
  current: cat(ex.current, gross.current - ex.current),
  thirtyDays: cat(ex["30days"], gross["30days"] - ex["30days"]),
  sixtyDays: cat(ex["60days"], gross["60days"] - ex["60days"]),
  ninetyDays: cat(ex["90days"], gross["90days"] - ex["90days"]),
})

// Summed in cents so the total is exact.
const sumBuckets = (agingMap) => {
  const cents = { current: 0, "30days": 0, "60days": 0, "90days": 0 }
  for (const { buckets } of agingMap.values()) {
    for (const bucket of Object.keys(cents)) cents[bucket] += Math.round(buckets[bucket] * 100)
  }
  return Object.fromEntries(Object.entries(cents).map(([bucket, value]) => [bucket, value / 100]))
}

const getAgingAnalysis = async (client, month, year, clientId = null) => {
  const asAt = agingAsAtForMonth(month, year)
  if (!asAt) return []
  const period = { month: String(month).trim(), year: String(year).trim() }

  if (clientId) {
    const name = await clientName(client, clientId)
    if (!name) return []
    const [gross, ex] = await Promise.all([
      outstandingAsAt(client, Number(clientId), asAt),
      outstandingAsAt(client, Number(clientId), asAt, { exVat: true }),
    ])
    return [{
      client: name,
      ...toAgingRow(gross.buckets),
      categories: agingCategories(gross.buckets, ex.buckets),
      ...period,
    }]
  }

  const [gross, ex] = await Promise.all([
    agingForAllClients(client, asAt),
    agingForAllClients(client, asAt, { exVat: true }),
  ])
  const grossTotals = sumBuckets(gross)
  return [{
    client: "Total Aging",
    ...toAgingRow(grossTotals),
    categories: agingCategories(grossTotals, sumBuckets(ex)),
    ...period,
  }]
}

const getDebtorAgeAnalysisPerClient = async (client, month, year) => {
  const asAt = agingAsAtForMonth(month, year)
  if (!asAt) return []

  const [clients, aging] = await Promise.all([
    client.query("SELECT m5clientkey, client FROM m5_client ORDER BY client"),
    agingForAllClients(client, asAt),
  ])

  return clients.rows.map((row) => ({
    clientId: row.m5clientkey,
    client: row.client,
    ...toAgingRow(aging.get(row.m5clientkey)?.buckets || ZERO_AGING),
  }))
}

const getTurnoverVsDieselCost = async (numericMonth, year) => {
  const month = monthNames[numericMonth]
  const { dateFrom, dateTo } = getDateRange(month, year)
  const [turnover, dieselResult] = await Promise.all([
    calculateMonthlyTurnoverBreakdown(pool, dateFrom, dateTo),
    pool.query(
      `SELECT
         COALESCE(SUM(e.expensecost), 0) AS ex,
         COALESCE(SUM(${fuelVatSql("e")}), 0) AS vat
       FROM expenses_with_po_v e
       WHERE e.expense_date >= $1
         AND e.expense_date < $2
         AND e.type = 'fuel'`,
      [dateFrom, dateTo]
    ),
  ])

  const diesel = { fuel: cat(dieselResult.rows[0]?.ex, dieselResult.rows[0]?.vat) }
  return [
    {
      month,
      year,
      totalTurnover: sumCats(turnover),
      dieselCost: sumCats(diesel),
      categories: { ...turnover, ...diesel },
    },
  ]
}

// Shared turnover-per-truck allocation, used by every truck-level income report
// so they can never disagree. Returns the CTE bodies (no leading WITH) ending in
// an IncomePerTruck(truckregnumber, total_income) CTE; callers prepend WITH and
// append their own CTEs/SELECT. Bind params: $1 = month name, $2 = year text,
// $3 = m5truckskey (only when truckFilter is supplied).
//
// How a job's value is split across trucks (all four rules applied here):
//   1. Weighted by the work each truck did across the whole job. A leg is a
//      route (A -> B) carrying only some of the job's containers, and legs vary
//      widely in size (e.g. 20, 10, 15, 25), so legs are NOT worth an equal
//      slice. A truck gets value * its work / the job's total work, where work is:
//        - container jobs: containers moved (each container on each leg is one
//          move); a truck on a leg with no container numbers counts as one move.
//        - jobs with no container numbers (break bulk, billed per ton): tons
//          carried (legs_m2.vgm), or the number of loads if no tonnage is recorded.
//   2. VAT treated the same for every job: regular jobs use total_cost (already
//      ex-VAT); add-on jobs (shipment_type 5) use the add-on amount with VAT
//      removed when vat_applied, so add-on trucks aren't overstated by 15%.
//   3. Bucketed by the leg date (when the work was done), not the capture date.
//   4. Unassigned legs (no truck) are excluded, so the full job value is credited
//      to the trucks that actually did the work rather than leaking away.
//   5. Credit notes are deducted. Each credit_notes line is for one container
//      (amount[i] ↔ containerids[i], ex-VAT, so it matches the ex-VAT turnover).
//      The line comes off the trucks that moved that container on the job: split
//      equally across the legs the container was on, then equally between the
//      trucks that carried it on each leg, in the month of that leg (the work
//      it reverses). A line whose container is on no assigned leg is spread over
//      the job's trucks in the same shares as the job's turnover, so no credit
//      is dropped.
// Each contribution keeps its category (instructions / addons / creditNotes)
// and the VAT on it (see "Categories and VAT" above), so IncomePerTruck gives
// <category>_ex and <category>_vat per truck; total_income is the ex-VAT net.
const truckIncomeCTE = (truckFilter = "") => `
    AssignedLegs AS (
      SELECT DISTINCT
        l.m1key,
        l.legnumber,
        l.truckregnumber,
        NULLIF(TRIM(l.containernumber), '') AS containernumber,
        l.vgm,
        l.date AS leg_date
      FROM legs_m2 l
      WHERE l.truckregnumber IS NOT NULL
        AND TRIM(l.truckregnumber) <> ''
    ),
    TruckLegRaw AS (
      SELECT
        m1key,
        legnumber,
        truckregnumber,
        COUNT(DISTINCT containernumber) AS containers,
        COALESCE(SUM(vgm) FILTER (WHERE containernumber IS NULL), 0) AS tons,
        COUNT(*) FILTER (WHERE containernumber IS NULL) AS loads,
        MIN(leg_date) AS leg_date
      FROM AssignedLegs
      GROUP BY m1key, legnumber, truckregnumber
    ),
    JobBasis AS (
      SELECT m1key, SUM(containers) AS job_containers, SUM(tons) AS job_tons
      FROM TruckLegRaw
      GROUP BY m1key
    ),
    TruckLeg AS (
      SELECT
        r.m1key,
        r.truckregnumber,
        r.leg_date,
        (CASE WHEN jb.job_containers > 0 THEN GREATEST(r.containers, 1)
              WHEN jb.job_tons > 0 THEN r.tons
              ELSE r.loads END)::numeric AS work
      FROM TruckLegRaw r
      JOIN JobBasis jb ON r.m1key = jb.m1key
    ),
    WorkPerJob AS (
      SELECT m1key, SUM(work) AS job_work
      FROM TruckLeg
      GROUP BY m1key
    ),
    TruckLegShare AS (
      -- Fraction of the job's value each truck-leg earns; sums to 1 per job.
      SELECT
        tl.m1key,
        tl.truckregnumber,
        tl.leg_date,
        tl.work / NULLIF(wpj.job_work, 0) AS share
      FROM TruckLeg tl
      JOIN WorkPerJob wpj ON tl.m1key = wpj.m1key
    ),
    JobValue AS (
      SELECT
        m.m1key,
        CASE WHEN m.shipment_type = 5 THEN 'addons' ELSE 'instructions' END AS category,
        CASE WHEN m.shipment_type = 5
             THEN COALESCE(${addOnExSql("ao")}, 0)
             ELSE COALESCE(m.total_cost, 0) END AS job_ex,
        CASE WHEN m.shipment_type = 5
             THEN COALESCE(ao.amount - ${addOnExSql("ao")}, 0)
             ELSE COALESCE(m.total_cost, 0) * COALESCE(m.vat, 0)::numeric / 100 END AS job_vat
      FROM m1_controller m
      LEFT JOIN add_ons ao ON m.addon_id = ao.addon_id
    ),
    CreditLines AS (
      SELECT
        cn.creditnote_id,
        u.ord,
        cn.m1key,
        u.amount,
        COALESCE(m.vat, 0)::numeric / 100 AS vat_rate,
        UPPER(TRIM(c.containernum)) AS containernum
      FROM credit_notes cn
      CROSS JOIN LATERAL unnest(cn.amount, cn.containerids) WITH ORDINALITY AS u(amount, containerid, ord)
      LEFT JOIN container c ON c.containerkey = u.containerid
      LEFT JOIN m1_controller m ON m.m1key = cn.m1key
      WHERE cn.m1key IS NOT NULL
        AND u.amount IS NOT NULL
    ),
    CreditMoves AS (
      -- Every leg/truck that moved the credited container on that job.
      SELECT
        cl.creditnote_id,
        cl.ord,
        al.legnumber,
        al.truckregnumber,
        MIN(al.leg_date) AS leg_date,
        MAX(cl.amount) AS amount,
        MAX(cl.vat_rate) AS vat_rate
      FROM CreditLines cl
      JOIN AssignedLegs al
        ON al.m1key = cl.m1key
        AND UPPER(TRIM(al.containernumber)) = cl.containernum
      GROUP BY cl.creditnote_id, cl.ord, al.legnumber, al.truckregnumber
    ),
    CreditMoveCounts AS (
      SELECT
        creditnote_id,
        ord,
        legnumber,
        -- one row per leg after the GROUP BY, so this counts the line's legs
        COUNT(*) OVER (PARTITION BY creditnote_id, ord) AS legs_for_line,
        COUNT(*) AS trucks_on_leg_for_line
      FROM CreditMoves
      GROUP BY creditnote_id, ord, legnumber
    ),
    CreditAlloc AS (
      SELECT
        cm.truckregnumber,
        cm.leg_date,
        cm.vat_rate,
        cm.amount / cmc.legs_for_line / cmc.trucks_on_leg_for_line AS credit
      FROM CreditMoves cm
      JOIN CreditMoveCounts cmc
        ON cmc.creditnote_id = cm.creditnote_id
        AND cmc.ord = cm.ord
        AND cmc.legnumber = cm.legnumber
      UNION ALL
      SELECT
        s.truckregnumber,
        s.leg_date,
        cl.vat_rate,
        cl.amount * s.share AS credit
      FROM CreditLines cl
      JOIN TruckLegShare s ON s.m1key = cl.m1key
      WHERE NOT EXISTS (
        SELECT 1 FROM CreditMoves cm
        WHERE cm.creditnote_id = cl.creditnote_id AND cm.ord = cl.ord
      )
    ),
    TruckContributions AS (
      SELECT
        s.truckregnumber,
        s.leg_date,
        jv.category,
        jv.job_ex * s.share AS ex,
        jv.job_vat * s.share AS vat
      FROM TruckLegShare s
      JOIN JobValue jv ON jv.m1key = s.m1key
      UNION ALL
      SELECT truckregnumber, leg_date, 'creditNotes', -credit, -credit * vat_rate
      FROM CreditAlloc
    ),
    IncomePerTruck AS (
      SELECT
        tc.truckregnumber,
        SUM(tc.ex) AS total_income,
        COALESCE(SUM(tc.ex) FILTER (WHERE tc.category = 'instructions'), 0) AS instructions_ex,
        COALESCE(SUM(tc.vat) FILTER (WHERE tc.category = 'instructions'), 0) AS instructions_vat,
        COALESCE(SUM(tc.ex) FILTER (WHERE tc.category = 'addons'), 0) AS addons_ex,
        COALESCE(SUM(tc.vat) FILTER (WHERE tc.category = 'addons'), 0) AS addons_vat,
        COALESCE(SUM(tc.ex) FILTER (WHERE tc.category = 'creditNotes'), 0) AS credit_ex,
        COALESCE(SUM(tc.vat) FILTER (WHERE tc.category = 'creditNotes'), 0) AS credit_vat
      FROM TruckContributions tc
      JOIN m5_trucks t ON tc.truckregnumber = t.truckregnum
      WHERE t.is_subcontractor = false
        AND t.status = true
        AND TRIM(TO_CHAR(tc.leg_date, 'Month')) = $1
        AND EXTRACT(YEAR FROM tc.leg_date)::TEXT = $2
        ${truckFilter}
      GROUP BY tc.truckregnumber
    )`

// IncomePerTruck category columns, for callers that join it to other CTEs.
const INCOME_CATEGORY_COLUMNS = ["instructions", "addons", "credit"]
  .flatMap((c) => [`i.${c}_ex`, `i.${c}_vat`])
  .join(", ")

// IncomePerTruck columns as categories. Nulls (a truck with no income on one
// side of a FULL JOIN) become zero.
const truckIncomeCategories = (row) => ({
  instructions: cat(row.instructions_ex, row.instructions_vat),
  addons: cat(row.addons_ex, row.addons_vat),
  creditNotes: cat(row.credit_ex, row.credit_vat),
})

const getTurnoverPerTruck = async (client, month, year) => {
  const query = `
    WITH ${truckIncomeCTE()}
    SELECT *, COALESCE(total_income, 0) AS total_turnover
    FROM IncomePerTruck
    ORDER BY total_turnover DESC
  `

  const result = await client.query(query, [month, year])
  console.log(`Turnover per truck query returned ${result.rows.length} rows`)

  return result.rows.map((row) => ({
    truckregnumber: row.truckregnumber,
    total_turnover: Number.parseFloat(row.total_turnover || 0),
    categories: truckIncomeCategories(row),
    month_name: month.trim(),
    year: year.toString(),
  }))
}

// A subcontractor's share of the turnover: each job's ex-VAT value split
// equally across its legs, then across the drivers on each leg — counted once
// per (job, leg, driver). legs_m2 has a row per container moved, so summing
// the raw rows multiplied a driver's share by their container count (August
// 2026 showed subcontractor turnover at 275% of total turnover). Jobs are
// taken by capture date (created_at); VAT is the instruction's rate.
const subcontractorTurnoverQuery = (withSubcontractor) => `
  WITH DistinctLegs AS (
    SELECT m1key, COUNT(DISTINCT legnumber) AS num_legs
    FROM legs_m2
    GROUP BY m1key
  ),
  DriverCountsPerLeg AS (
    SELECT m1key, legnumber, COUNT(DISTINCT driverid) AS drivers_per_leg
    FROM legs_m2
    GROUP BY m1key, legnumber
  ),
  LegDrivers AS (
    SELECT DISTINCT m1key, legnumber, driverid
    FROM legs_m2
  )
  SELECT
    ${withSubcontractor ? "COALESCE(e.companyname, 'Unknown') AS companyname," : ""}
    SUM(m.total_cost / dl.num_legs / dcpl.drivers_per_leg) AS ex,
    SUM(m.total_cost * COALESCE(m.vat, 0)::numeric / 100 / dl.num_legs / dcpl.drivers_per_leg) AS vat
  FROM LegDrivers l
  JOIN m1_controller m ON l.m1key = m.m1key
  JOIN DistinctLegs dl ON l.m1key = dl.m1key
  JOIN DriverCountsPerLeg dcpl ON l.m1key = dcpl.m1key AND l.legnumber = dcpl.legnumber
  JOIN m5_employee e ON l.driverid = e.userid
  WHERE e.roleid = 6
    AND m.created_at >= $1
    AND m.created_at < $2
    ${withSubcontractor ? "AND e.subei_reg_num = $3" : ""}
  GROUP BY ${withSubcontractor ? "COALESCE(e.companyname, 'Unknown')" : "()"}
`

const totalTurnoverRow = (categories, month, year) => ({
  name: "Total Turnover",
  value: sumCats(categories),
  type: "total",
  categories,
  month: month.trim(),
  year: year.toString(),
})

const getSubcontractorTurnoverPerMonth = async (client, month, year) => {
  const { dateFrom, dateTo } = getDateRange(month, year)
  const [turnover, subbieResult] = await Promise.all([
    calculateMonthlyTurnoverBreakdown(client, dateFrom, dateTo),
    client.query(
      subcontractorTurnoverQuery(false),
      [dateFrom, dateTo]
    ),
  ])

  const subbie = { subcontractorTurnover: cat(subbieResult.rows[0]?.ex, subbieResult.rows[0]?.vat) }
  return [
    totalTurnoverRow(turnover, month, year),
    {
      name: "Total Subcontractor Turnover",
      value: sumCats(subbie),
      type: "subcontractor",
      categories: subbie,
      month: month.trim(),
      year: year.toString(),
    },
  ]
}

const getSubcontractorVsTurnover = async (client, month, year, subcontractorId = null) => {
  const { dateFrom, dateTo } = getDateRange(month, year)
  const [turnover, subbieResult] = await Promise.all([
    calculateMonthlyTurnoverBreakdown(client, dateFrom, dateTo),
    subcontractorId
      ? client.query(subcontractorTurnoverQuery(true), [dateFrom, dateTo, subcontractorId])
      : Promise.resolve({ rows: [] }),
  ])

  const data = [totalTurnoverRow(turnover, month, year)]
  const row = subbieResult.rows[0]
  if (row) {
    const categories = { subcontractorTurnover: cat(row.ex, row.vat) }
    data.push({
      name: row.companyname,
      value: sumCats(categories),
      type: "subcontractor",
      categories,
      month: month.trim(),
      year: year.toString(),
    })
  }
  return data
}

// What a subcontractor was paid (legs_m2.driverrate, by leg date), plus VAT at
// the instruction's rate — the same rule as the VAT recon's subbie rates.
const subcontractorExpenseQuery = (withSubcontractor) => `
  SELECT
    ${withSubcontractor ? "COALESCE(e.companyname, 'Unknown') AS companyname," : ""}
    COALESCE(SUM(l.driverrate), 0) AS ex,
    COALESCE(SUM(l.driverrate * COALESCE(m.vat, 0)::numeric / 100), 0) AS vat
  FROM legs_m2 l
  JOIN m5_employee e ON l.driverid = e.userid
  LEFT JOIN m1_controller m ON l.m1key = m.m1key
  WHERE e.roleid = 6
    AND TRIM(TO_CHAR(l.date, 'Month')) = $1
    AND EXTRACT(YEAR FROM l.date)::TEXT = $2
    ${withSubcontractor ? "AND e.subei_reg_num = $3" : ""}
  GROUP BY ${withSubcontractor ? "COALESCE(e.companyname, 'Unknown')" : "()"}
`

const getTurnoverVsSubbieExpense = async (client, month, year, subcontractorId = null) => {
  const { dateFrom, dateTo } = getDateRange(month, year)
  const [turnover, subbieResult] = await Promise.all([
    calculateMonthlyTurnoverBreakdown(client, dateFrom, dateTo),
    subcontractorId
      ? client.query(subcontractorExpenseQuery(true), [month, year, subcontractorId])
      : Promise.resolve({ rows: [] }),
  ])

  const data = [totalTurnoverRow(turnover, month, year)]
  const row = subbieResult.rows[0]
  if (row) {
    const categories = { subcontractorExpense: cat(row.ex, row.vat) }
    data.push({
      name: row.companyname,
      value: sumCats(categories),
      type: "subcontractor",
      categories,
      month: month.trim(),
      year: year.toString(),
    })
  }
  return data
}

// Fuel per in-house truck (expenses_m2 via expenses_with_po_v, as the Fuel per
// Truck chart reads it), with the Input VAT of each slip's PO.
const fuelPerTruckCTE = (truckFilter = "") => `
    FuelPerTruck AS (
      SELECT
        t.truckregnum AS truckregnumber,
        COALESCE(SUM(e.expensecost), 0) AS fuel_ex,
        COALESCE(SUM(${fuelVatSql("e")}), 0) AS fuel_vat
      FROM expenses_with_po_v e
      JOIN m5_trucks t ON e.truckid = t.m5truckskey
      WHERE e.type = 'fuel'
        AND t.is_subcontractor = false
        AND t.status = true
        AND TRIM(to_char(e.expense_date, 'Month')) = $1
        AND EXTRACT(YEAR FROM e.expense_date)::TEXT = $2
        ${truckFilter}
      GROUP BY t.truckregnum
    )`

const getTurnoverVsFuelPerTruck = async (client, month, year, truckId = null) => {
  const params = [month, year]
  const truckFilter = truckId ? "AND t.m5truckskey = $3" : ""
  if (truckId) params.push(truckId)

  const query = `
    WITH ${truckIncomeCTE(truckFilter)},
    ${fuelPerTruckCTE(truckFilter)}
    SELECT
      ${INCOME_CATEGORY_COLUMNS},
      f.fuel_ex,
      f.fuel_vat,
      COALESCE(i.truckregnumber, f.truckregnumber) AS truckregnumber,
      COALESCE(i.total_income, 0) AS total_turnover,
      COALESCE(f.fuel_ex, 0) AS total_fuel_cost
    FROM IncomePerTruck i
    FULL OUTER JOIN FuelPerTruck f ON i.truckregnumber = f.truckregnumber
    ORDER BY total_turnover DESC, total_fuel_cost DESC
  `

  const result = await client.query(query, params)
  console.log(`Turnover vs fuel per truck query returned ${result.rows.length} rows`)

  return result.rows.map((row) => ({
    truckregnumber: row.truckregnumber,
    total_turnover: Number.parseFloat(row.total_turnover || 0),
    total_fuel_cost: Number.parseFloat(row.total_fuel_cost || 0),
    categories: {
      ...truckIncomeCategories(row),
      fuel: cat(row.fuel_ex, row.fuel_vat),
    },
    month_name: month.trim(),
    year: year.toString(),
  }))
}

// Truck Income vs Truck Expenses (per truck)
//
// Income per truck = the shared allocation (truckIncomeCTE) so it matches
// Turnover Per Truck exactly.
//
// Expense per truck has two sources that are deliberately kept from
// double-counting each other:
//   * Fuel comes from expenses_with_po_v (type = 'fuel', expensecost) exactly as
//     the Fuel-per-Truck / Diesel charts read it, keyed on expenses_m2.truckid.
//   * Everything else (parts, repairs, tyres, towing, etc.) comes from
//     purchase_orders, EXCLUDING the fuel expense type (5) because those fuel POs
//     are the same money already captured above via expenses_m2.
//
// Non-fuel purchase_orders carry no truckid in the data — only a free-text
// reg_no — so they are matched to a truck by a normalised registration key
// (upper-cased, stripped of everything but A-Z/0-9). Rows that match no active
// in-house truck (blank regs, "workshop", trailers, sub/inactive trucks) collect
// under a single "Unassigned / Workshop" row so no spend is silently dropped.
// When a specific truck is selected that bucket is excluded.
const getTruckIncomeVsExpense = async (client, month, year, truckId = null) => {
  const params = [month, year]
  const truckFilter = truckId ? "AND t.m5truckskey = $3" : ""
  const otherTruckFilter = truckId ? "AND tk.m5truckskey = $3" : ""
  if (truckId) params.push(truckId)

  const query = `
    WITH ${truckIncomeCTE(truckFilter)},
    ${fuelPerTruckCTE(truckFilter)},
    TruckKeys AS (
      SELECT
        m5truckskey,
        truckregnum,
        regexp_replace(upper(truckregnum), '[^A-Z0-9]', '', 'g') AS norm
      FROM m5_trucks
      WHERE is_subcontractor = false AND status = true
    ),
    OtherPerTruck AS (
      SELECT
        COALESCE(tk.truckregnum, 'Unassigned / Workshop') AS truckregnumber,
        COALESCE(SUM(po.total), 0) AS other_ex,
        COALESCE(SUM(${poVatSql("po")}), 0) AS other_vat
      FROM purchase_orders po
      LEFT JOIN TruckKeys tk
        ON tk.norm <> ''
        AND regexp_replace(upper(COALESCE(po.reg_no, '')), '[^A-Z0-9]', '', 'g') = tk.norm
      WHERE COALESCE(po.expense_type_id, 0) <> 5
        AND TRIM(to_char(po.date, 'Month')) = $1
        AND EXTRACT(YEAR FROM po.date)::TEXT = $2
        ${otherTruckFilter}
      GROUP BY COALESCE(tk.truckregnum, 'Unassigned / Workshop')
    )
    SELECT
      ${INCOME_CATEGORY_COLUMNS},
      f.fuel_ex,
      f.fuel_vat,
      o.other_ex,
      o.other_vat,
      COALESCE(i.truckregnumber, f.truckregnumber, o.truckregnumber) AS truckregnumber,
      COALESCE(i.total_income, 0) AS total_income,
      COALESCE(f.fuel_ex, 0) AS fuel_cost,
      COALESCE(o.other_ex, 0) AS other_cost,
      COALESCE(f.fuel_ex, 0) + COALESCE(o.other_ex, 0) AS total_expense
    FROM IncomePerTruck i
    FULL OUTER JOIN FuelPerTruck f ON i.truckregnumber = f.truckregnumber
    FULL OUTER JOIN OtherPerTruck o
      ON COALESCE(i.truckregnumber, f.truckregnumber) = o.truckregnumber
    ORDER BY total_income DESC, total_expense DESC
  `

  const result = await client.query(query, params)
  console.log(`Truck income vs expense query returned ${result.rows.length} rows`)

  return result.rows.map((row) => {
    const income = Number.parseFloat(row.total_income || 0)
    const expense = Number.parseFloat(row.total_expense || 0)
    return {
      truckregnumber: row.truckregnumber,
      total_income: income,
      fuel_cost: Number.parseFloat(row.fuel_cost || 0),
      other_cost: Number.parseFloat(row.other_cost || 0),
      total_expense: expense,
      profit: round2(income - expense),
      categories: {
        ...truckIncomeCategories(row),
        fuel: cat(row.fuel_ex, row.fuel_vat),
        maintenance: cat(row.other_ex, row.other_vat),
      },
      month_name: month.trim(),
      year: year.toString(),
    }
  })
}

// Company expenses for a month, by category. Fuel is expenses_m2 (as every fuel
// chart reads it); "parts" is every other purchase order — fuel POs are left
// out because they are the same money as the expenses_m2 fuel rows (counting
// both double-counted fuel). Subcontractors are their driver rates by leg date.
const monthlyExpenseBreakdown = async (client, month, year, { creditNotes = false } = {}) => {
  const params = [month, year]
  const fuelQuery = `
    SELECT COALESCE(SUM(e.expensecost), 0) AS ex, COALESCE(SUM(${fuelVatSql("e")}), 0) AS vat
    FROM expenses_with_po_v e
    WHERE e.type = 'fuel'
      AND TRIM(to_char(e.expense_date, 'Month')) = $1
      AND EXTRACT(YEAR FROM e.expense_date)::text = $2
  `
  const partsQuery = `
    SELECT COALESCE(SUM(po.total), 0) AS ex, COALESCE(SUM(${poVatSql("po")}), 0) AS vat
    FROM purchase_orders po
    WHERE COALESCE(po.expense_type_id, 0) <> 5
      AND TRIM(to_char(po.date, 'Month')) = $1
      AND EXTRACT(YEAR FROM po.date)::text = $2
  `
  const creditNotesQuery = `
    SELECT
      COALESCE(SUM(amt.amount), 0) AS ex,
      COALESCE(SUM(amt.amount * COALESCE(m.vat, 0)::numeric / 100), 0) AS vat
    FROM credit_notes cn
    CROSS JOIN LATERAL unnest(cn.amount) AS amt(amount)
    LEFT JOIN m1_controller m ON m.m1key = cn.m1key
    WHERE TRIM(to_char(cn.creditnote_date, 'Month')) = $1
      AND EXTRACT(YEAR FROM cn.creditnote_date)::text = $2
  `

  const [fuel, parts, subbies, credits] = await Promise.all([
    client.query(fuelQuery, params),
    client.query(partsQuery, params),
    client.query(subcontractorExpenseQuery(false), params),
    creditNotes ? client.query(creditNotesQuery, params) : Promise.resolve(null),
  ])

  const row = (result) => cat(result.rows[0]?.ex, result.rows[0]?.vat)
  const categories = {
    fuel: row(fuel),
    parts: row(parts),
    subcontractors: row(subbies),
  }
  if (credits) categories.creditNotes = row(credits)
  return categories
}

// Income vs Expense uses this as its expense side (its income side is the
// turnover, which already has credit notes deducted — so they are not an
// expense here).
const getAllExpenses = async (client, month, year) => {
  const incomeQuery = `
    SELECT COALESCE(SUM(m.total_cost), 0) AS total_income
    FROM invoice i
    JOIN m1_controller m ON i.m1key = m.m1key
    WHERE TRIM(to_char(i.date, 'Month')) = $1
      AND EXTRACT(YEAR FROM i.date)::text = $2
  `
  const [categories, totalWages, incomeResult] = await Promise.all([
    monthlyExpenseBreakdown(client, month, year),
    getTotalWagesForMonth(client, month, year),
    client.query(incomeQuery, [month, year]),
  ])
  categories.wages = cat(totalWages, 0)

  return {
    expenses: [
      {
        expensedesc: "All Expenses",
        total_cost: sumCats(categories),
        categories,
        month_name: month.trim(),
        year: year.toString(),
      },
    ],
    income: Number.parseFloat(incomeResult.rows[0]?.total_income || 0),
    month: month.trim(),
    year: year.toString(),
  }
}

const getWagesVsExpenses = async (client, month, year) => {
  const [expenses, totalWages] = await Promise.all([
    monthlyExpenseBreakdown(client, month, year, { creditNotes: true }),
    getTotalWagesForMonth(client, month, year),
  ])
  const wages = { wages: cat(totalWages, 0) }
  const period = { month: month.trim(), year: year.toString() }

  return [
    { name: "Wages", value: sumCats(wages), type: "wages", categories: wages, ...period },
    { name: "Expenses", value: sumCats(expenses), type: "expenses", categories: expenses, ...period },
  ]
}

const getClientSubbieCommissionReport = async (client, month, year, clientId) => {
  if (!clientId) {
    throw new Error("clientId is required")
  }

  const trimmedMonth = month?.trim()
  const yearText = year?.toString()

  if (!trimmedMonth || !yearText) {
    throw new Error("Both month and year are required")
  }

  const clientInfoQuery = `
    SELECT m5clientkey, client
    FROM m5_client
    WHERE m5clientkey = $1
  `

  const clientInfoResult = await client.query(clientInfoQuery, [clientId])
  const clientInfo = clientInfoResult.rows[0] || null

  const invoicesQuery = `
    WITH filtered_invoices AS (
      SELECT 
        i.ikey,
        i.invoice_num,
        i.doc_num,
        i.date,
        i.m1key,
        m.total_cost,
        m.vat,
        m.description
      FROM invoice i
      JOIN m1_controller m ON i.m1key = m.m1key
      WHERE i.clientid = $1
        AND TRIM(TO_CHAR(i.date, 'Month')) = $2
        AND EXTRACT(YEAR FROM i.date)::text = $3
    )
    SELECT 
      fi.ikey,
      fi.invoice_num,
      fi.doc_num,
      fi.date,
      fi.m1key,
      fi.total_cost,
      fi.vat,
      fi.description
    FROM filtered_invoices fi
    ORDER BY fi.date ASC
  `

  const addOnsQuery = `
    SELECT 
      ao.addon_id,
      ao.invoice_number,
      ao.date,
      ao.amount,
      ao.booking_ref,
      ao.client_ref
    FROM add_ons ao
    WHERE ao.client_id = $1
      AND TRIM(TO_CHAR(ao.date, 'Month')) = $2
      AND EXTRACT(YEAR FROM ao.date)::text = $3
  `

  // Subbie earnings are bucketed by LEG date (when the trip was driven), the same
  // basis the subcontractor statements use, and scoped to the client via the
  // instruction (m1_controller.client). Amounts are VAT-inclusive (driverrate +
  // instruction VAT) so this total reconciles to the subbie statements rather than
  // the invoice-date / ex-VAT figure that previously under-reported earnings.
  const subcontractorQuery = `
    SELECT
      MIN(e.userid) AS subcontractor_id,
      COALESCE(e.companyname, 'Unknown') AS companyname,
      e.subei_reg_num,
      COUNT(DISTINCT l.legkey) AS leg_count,
      COALESCE(SUM(l.driverrate * (1 + COALESCE(m.vat, 0)::numeric / 100)), 0) AS total_earned
    FROM legs_m2 l
    JOIN m1_controller m ON l.m1key = m.m1key
    JOIN m5_employee e ON l.driverid = e.userid
    WHERE m.client = $1
      AND TRIM(TO_CHAR(l.date, 'Month')) = $2
      AND EXTRACT(YEAR FROM l.date)::text = $3
      AND e.roleid = 6
    GROUP BY e.companyname, e.subei_reg_num
    ORDER BY total_earned DESC
  `

  const params = [clientId, trimmedMonth, yearText]
  const [invoiceResults, subcontractorResults, addOnResults] = await Promise.all([
    client.query(invoicesQuery, params),
    client.query(subcontractorQuery, params),
    client.query(addOnsQuery, params),
  ])

  const instructionInvoiceDetails = invoiceResults.rows.map((row) => {
    const baseAmount = Number.parseFloat(row.total_cost || 0)
    const vatRate = Number.parseFloat(row.vat ?? 0) || 0
    const vatAmount = Number.isFinite(vatRate) ? (baseAmount * vatRate) / 100 : 0
    const grossAmount = baseAmount + vatAmount

    return {
      invoiceId: row.ikey,
      invoiceNumber: row.invoice_num,
      documentNumber: row.doc_num,
      invoiceDate: row.date instanceof Date ? row.date.toISOString() : row.date,
      instructionId: row.m1key,
      description: row.description,
      amount: Number(grossAmount.toFixed(2)),
      amountExVat: Number(baseAmount.toFixed(2)),
      vatRate: Number(vatRate.toFixed(2)),
      vatAmount: Number(vatAmount.toFixed(2)),
      source: "instruction",
    }
  })

  const addOnDetails = addOnResults.rows.map((row) => {
    const amount = Number.parseFloat(row.amount || 0)

    return {
      invoiceId: `addon-${row.addon_id}`,
      invoiceNumber: row.invoice_number || "Add-On Invoice",
      documentNumber: row.booking_ref || null,
      invoiceDate: row.date instanceof Date ? row.date.toISOString() : row.date,
      instructionId: row.client_ref || null,
      description: "Add-On invoice",
      amount: Number(amount.toFixed(2)),
      amountExVat: Number(amount.toFixed(2)),
      vatRate: null,
      vatAmount: null,
      source: "addOn",
    }
  })

  const invoiceDetails = [...instructionInvoiceDetails, ...addOnDetails].sort((a, b) => {
    const numA = a.invoiceNumber || ""
    const numB = b.invoiceNumber || ""
    return numA.localeCompare(numB, undefined, { numeric: true, sensitivity: "base" })
  })

  const totalInvoiceAmount = invoiceDetails.reduce(
    (sum, detail) => sum + (Number.isFinite(detail.amount) ? detail.amount : 0),
    0
  )

  const totalAddOnAmount = addOnDetails.reduce(
    (sum, detail) => sum + (Number.isFinite(detail.amount) ? detail.amount : 0),
    0
  )

  const totalSubbieAmount = subcontractorResults.rows.reduce(
    (sum, row) => sum + Number.parseFloat(row.total_earned || 0),
    0
  )

  const subcontractorBreakdown = subcontractorResults.rows.map((row) => {
    const totalEarned = Number.parseFloat(row.total_earned || 0)
    const percentage = totalSubbieAmount > 0 ? totalEarned / totalSubbieAmount : 0
    return {
      subcontractorId: row.subcontractor_id,
      companyName: row.companyname,
      registrationNumber: row.subei_reg_num,
      legCount: Number.parseInt(row.leg_count, 10) || 0,
      totalEarned,
      percentage,
    }
  })

  const commission = Math.max(totalInvoiceAmount - totalSubbieAmount, 0)

  return {
    client: clientInfo
      ? {
        id: clientInfo.m5clientkey,
        name: clientInfo.client,
      }
      : null,
    period: {
      month: trimmedMonth,
      year: yearText,
    },
    totals: {
      invoiceAmount: Number(totalInvoiceAmount.toFixed(2)),
      subcontractorAmount: Number(totalSubbieAmount.toFixed(2)),
      commission: Number(commission.toFixed(2)),
      addOnAmount: Number(totalAddOnAmount.toFixed(2)),
    },
    invoices: invoiceDetails,
    subcontractors: subcontractorBreakdown,
    addOns: addOnDetails,
  }
}

async function calculateTotalPayable(client, employeeId, month, year) {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthIndex = monthNames.indexOf(month);
  if (monthIndex === -1) throw new Error('Invalid month');
  const monthNumber = monthIndex + 1;
  const lastDayOfMonth = new Date(parseInt(year), monthNumber, 0).toISOString().split('T')[0];

  // Get base salary
  let baseSalary = 0;
  const historyBaseQuery = `
    SELECT base
    FROM base_salary_history 
    WHERE userid = $1 AND date <= $2 
    ORDER BY date DESC 
    LIMIT 1
  `;
  const historyBaseRes = await client.query(historyBaseQuery, [employeeId, lastDayOfMonth]);
  if (historyBaseRes.rows.length > 0) {
    baseSalary = parseFloat(historyBaseRes.rows[0].base) || 0;
  } else {
    const currentBaseQuery = `
      SELECT base_salary 
      FROM m5_employee 
      WHERE userid = $1
    `;
    const currentBaseRes = await client.query(currentBaseQuery, [employeeId]);
    if (currentBaseRes.rows.length > 0) {
      baseSalary = parseFloat(currentBaseRes.rows[0].base_salary) || 0;
    }
  }

  // Get legs total
  const legsQuery = `
    SELECT COALESCE(SUM(l.driverrate), 0) as total_legs
    FROM legs_m2 l
    JOIN m1_controller i ON l.m1key = i.m1key
    WHERE l.driverid = $1
      AND EXTRACT(MONTH FROM l.date) = $2
      AND EXTRACT(YEAR FROM l.date) = $3
  `;
  const legsRes = await client.query(legsQuery, [employeeId, monthNumber, year]);
  const totalLegsAmount = parseFloat(legsRes.rows[0].total_legs) || 0;

  let totalEarnings = baseSalary + totalLegsAmount;
  if (totalEarnings === 0) return 0;

  // Get loan deduction
  let loanDeduction = 0;
  const historyDedQuery = `
    SELECT deduction_loan
    FROM employee_deduction_history 
    WHERE employeeid = $1 AND effective_date <= $2 
    ORDER BY effective_date DESC 
    LIMIT 1
  `;
  const historyDedRes = await client.query(historyDedQuery, [employeeId, lastDayOfMonth]);
  if (historyDedRes.rows.length > 0) {
    loanDeduction = parseFloat(historyDedRes.rows[0].deduction_loan) || 0;
  } else {
    const currentDedQuery = `
      SELECT deduction_loan 
      FROM m5_employee 
      WHERE userid = $1
    `;
    const currentDedRes = await client.query(currentDedQuery, [employeeId]);
    if (currentDedRes.rows.length > 0) {
      loanDeduction = parseFloat(currentDedRes.rows[0].deduction_loan) || 0;
    }
  }

  const totalEarningsAfterLoan = totalEarnings - loanDeduction;
  const uifAmount = totalEarningsAfterLoan * 0.01;
  const sdlAmount = totalEarningsAfterLoan * 0.01;
  const coidAmount = totalEarningsAfterLoan * 0.0248;
  const totalAdditions = uifAmount + sdlAmount + coidAmount;
  const totalPayable = totalEarningsAfterLoan + totalAdditions;
  return totalPayable;
}

async function getTotalWagesForMonth(client, month, year) {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthIndex = monthNames.indexOf(month);
  if (monthIndex === -1) throw new Error('Invalid month');
  const monthNumber = monthIndex + 1;

  // Get employees excluding roleid 6
  const employeesQuery = `
    SELECT userid
    FROM m5_employee
    WHERE roleid != 6
  `;
  const empRes = await client.query(employeesQuery);
  const employees = empRes.rows;

  let totalSum = 0;
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  const reportMonth = monthNumber;
  const reportYear = parseInt(year);
  const isPastMonth = (reportYear < currentYear) ||
    (reportYear === currentYear && reportMonth < currentMonth);

  for (const emp of employees) {
    const employeeId = emp.userid;

    // Check stored wage data
    const storedQuery = `
      SELECT net_pay as total_payable
      FROM wages 
      WHERE employeeid = $1 
        AND EXTRACT(MONTH FROM employee_date) = $2 
        AND EXTRACT(YEAR FROM employee_date) = $3
    `;
    const storedRes = await client.query(storedQuery, [employeeId, monthNumber, year]);
    let totalPayable = 0;
    const exists = storedRes.rows.length > 0;

    if (exists) {
      const storedPayable = parseFloat(storedRes.rows[0].total_payable) || 0;
      if (isPastMonth) {
        totalPayable = storedPayable;
      } else {
        totalPayable = await calculateTotalPayable(client, employeeId, month, year);
      }
    } else {
      totalPayable = await calculateTotalPayable(client, employeeId, month, year);
    }

    if (totalPayable > 0) {
      totalSum += totalPayable;
    }
  }

  return totalSum;
}

export {
  calculateMonthlyTurnover,
  getFuelExpenses,
  getTurnoverPerMonth,
  getAllClients,
  getAllSubcontractors,
  getAllTrucks,
  getAgingAnalysis,
  getDebtorAgeAnalysisPerClient,
  getTurnoverVsDieselCost,
  getAllExpenses,
  getTurnoverPerTruck,
  getSubcontractorTurnoverPerMonth,
  getSubcontractorVsTurnover,
  getWagesVsExpenses,
  getTurnoverVsSubbieExpense,
  getTurnoverVsFuelPerTruck,
  getTruckIncomeVsExpense,
  getPaymentsReceivedPerMonth,
  getPaymentClients,
  getClientSubbieCommissionReport,
}