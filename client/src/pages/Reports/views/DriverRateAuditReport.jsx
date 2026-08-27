"use client";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ExcelJS from "exceljs";
import api from "../../../api.js";
import "../css/driverRateAudit.css";

const now = new Date();
const currentYear = now.getFullYear();

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const fmtRand = (n) =>
  n == null ? "—" : "R " + Number(n).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CATEGORIES = [
  { key: "mismatch", label: "Big / Negative Discrepancies", color: "#c0392b", showExpected: true, showFlag: true },
  { key: "routeMissing", label: "Route Missing", color: "#b9770e", showExpected: false, showFlag: true },
  { key: "noFieldRate", label: "No Field Rate", color: "#8e44ad", showExpected: false, showFlag: false },
  { key: "skipped", label: "Skipped", color: "#7f8c8d", showExpected: false, showFlag: false },
];

const CATEGORY_HINTS = {
  mismatch:
    "Routes where the stored leg rate differs from the looked-up correct rate by ≥ R500, or is higher than it (negative). Take these to the boss for the corrected values — nothing is changed automatically.",
  routeMissing:
    "No rate period covers this route on the leg's date (route renamed/deleted, or a date gap), so the correct rate can't be re-derived. Subbie legs with a stored rate under R500 are flagged SUBBIE < R500 — review these with the boss.",
  noFieldRate:
    "A rate period exists for the route and date, but the specific field needed (subbie/driver × 6m/12m) is blank, so no rate could be resolved.",
  skipped: "Leg has no date or no driver assigned, so a rate can't be resolved at all.",
};

function DriverRateAuditReport() {
  const navigate = useNavigate();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(currentYear);
  const [running, setRunning] = useState(false);
  const [audit, setAudit] = useState(null);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [activeCategory, setActiveCategory] = useState("mismatch");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ key: null, dir: "desc" });

  const years = Array.from({ length: 6 }, (_, i) => currentYear - 4 + i);

  const runAudit = async () => {
    setRunning(true);
    setAudit(null);
    setError(null);
    setSearch("");
    setSort({ key: null, dir: "desc" });
    try {
      const res = await api.get("/api/driver-rates/month-audit", {
        params: { year, month },
        timeout: 60000,
      });
      setAudit(res.data);
      setActiveCategory("mismatch");
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Audit failed");
    } finally {
      setRunning(false);
    }
  };

  const s = audit?.summary;

  const rawRowsByCategory = useMemo(() => {
    if (!audit) return {};
    return {
      mismatch: audit.mismatch || [],
      routeMissing: audit.routeMissing || [],
      noFieldRate: audit.noFieldRate || [],
      skipped: audit.skipped || [],
    };
  }, [audit]);

  const visibleCategories = useMemo(
    () => CATEGORIES.filter((c) => (rawRowsByCategory[c.key] || []).length > 0 || c.key === "mismatch" || c.key === "routeMissing"),
    [rawRowsByCategory]
  );

  const activeMeta = CATEGORIES.find((c) => c.key === activeCategory) || CATEGORIES[0];

  const filteredRows = useMemo(() => {
    const rows = rawRowsByCategory[activeCategory] || [];
    let out = rows;
    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter((r) =>
        [r.client, r.route, r.role, r.container, r.legkey, r.m1key]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      );
    }
    if (sort.key) {
      out = [...out].sort((a, b) => {
        const av = a[sort.key] ?? 0;
        const bv = b[sort.key] ?? 0;
        if (av < bv) return sort.dir === "asc" ? -1 : 1;
        if (av > bv) return sort.dir === "asc" ? 1 : -1;
        return 0;
      });
    }
    return out;
  }, [rawRowsByCategory, activeCategory, search, sort]);

  const toggleSort = (key) => {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }
    );
  };

  const addDiffSheet = (workbook, name, rows, { showExpected, showFlag } = {}) => {
    const sheet = workbook.addWorksheet(name);
    const columns = [
      { header: "Leg", key: "legkey", width: 10 },
      { header: "Instr.", key: "m1key", width: 12 },
      { header: "Client", key: "client", width: 20 },
      { header: "Route", key: "route", width: 24 },
      { header: "Date", key: "date", width: 14 },
      { header: "Role", key: "role", width: 10 },
      { header: "Cont.", key: "container", width: 12 },
      { header: "Stored", key: "stored_rate", width: 14 },
    ];
    if (showExpected) {
      columns.push({ header: "Correct", key: "expected_rate", width: 14 });
      columns.push({ header: "Delta", key: "delta", width: 14 });
    }
    if (showFlag) {
      columns.push({ header: "Flag", key: "flag", width: 18 });
    }
    sheet.columns = columns;
    (rows || []).forEach((r) => sheet.addRow(r));
    sheet.getColumn("stored_rate").numFmt = "R #,##0.00";
    if (showExpected) {
      sheet.getColumn("expected_rate").numFmt = "R #,##0.00";
      sheet.getColumn("delta").numFmt = "R #,##0.00";
    }
    sheet.getRow(1).font = { bold: true };
  };

  const handleExportToExcel = async () => {
    if (!audit) return;
    setExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.created = new Date();
      workbook.modified = new Date();

      const readMeSheet = workbook.addWorksheet("Read Me");
      readMeSheet.columns = [
        { header: "Sheet", key: "sheet", width: 28 },
        { header: "What it means", key: "description", width: 90 },
      ];
      readMeSheet.addRow({
        sheet: "Summary",
        description: `Headline counts for the ${months[month - 1]} ${year} audit — how many legs were checked and how they were bucketed.`,
      });
      readMeSheet.addRow({
        sheet: "Big-Negative Discrepancies",
        description: CATEGORY_HINTS.mismatch,
      });
      readMeSheet.addRow({
        sheet: "Route Missing",
        description: CATEGORY_HINTS.routeMissing,
      });
      if (audit.noFieldRate.length > 0) {
        readMeSheet.addRow({ sheet: "No Field Rate", description: CATEGORY_HINTS.noFieldRate });
      }
      if (audit.skipped.length > 0) {
        readMeSheet.addRow({ sheet: "Skipped", description: CATEGORY_HINTS.skipped });
      }
      readMeSheet.getRow(1).font = { bold: true };
      readMeSheet.eachRow((row) => {
        row.alignment = { wrapText: true, vertical: "top" };
      });

      const summarySheet = workbook.addWorksheet("Summary");
      summarySheet.columns = [
        { header: "Metric", key: "metric", width: 32 },
        { header: "Value", key: "value", width: 16 },
      ];
      summarySheet.addRow({ metric: "Period", value: `${months[month - 1]} ${year}` });
      summarySheet.addRow({});
      summarySheet.addRow({ metric: "Total legs", value: audit.totalLegs });
      summarySheet.addRow({ metric: "Big / negative discrepancies", value: audit.mismatchShown });
      summarySheet.addRow({ metric: "Route-missing subbie < R500", value: audit.routeMissingSubbieLow ?? 0 });
      summarySheet.addRow({ metric: "Already correct", value: s.MATCH });
      summarySheet.addRow({ metric: "Route missing", value: s.ROUTE_MISSING });
      summarySheet.addRow({ metric: "No field rate", value: s.NO_FIELD_RATE });
      summarySheet.addRow({ metric: "Skipped", value: s.SKIPPED });
      summarySheet.getRow(1).font = { bold: true };

      addDiffSheet(workbook, "Big-Negative Discrepancies", audit.mismatch, { showExpected: true, showFlag: true });
      addDiffSheet(workbook, "Route Missing", audit.routeMissing, { showFlag: true });
      if (audit.noFieldRate.length > 0) addDiffSheet(workbook, "No Field Rate", audit.noFieldRate);
      if (audit.skipped.length > 0) addDiffSheet(workbook, "Skipped", audit.skipped);

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `driver-rate-audit-${months[month - 1]}-${year}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setError(err.message || "Failed to export to Excel");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="driver-rate-audit-wrapper">
      <div className="header-actions">
        <button onClick={() => navigate("/reports")} className="back-button">
          Back
        </button>
      </div>

      <div className="dra-header">
        <h1>Driver Rate Audit</h1>
        <p className="dra-subtitle">
          Re-derives the correct driver rate for every leg on instructions created in the chosen
          month, using the same rules the app uses, and flags the discrepancies worth reviewing.
          Read-only — correct any values manually in Manage → Driver Rates.
        </p>
      </div>

      <div className="dra-controls-card">
        <div className="dra-field">
          <label>Month</label>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {months.map((name, i) => (
              <option key={i + 1} value={i + 1}>{name}</option>
            ))}
          </select>
        </div>
        <div className="dra-field">
          <label>Year</label>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button className="dra-run-btn" onClick={runAudit} disabled={running}>
          {running ? "Running audit…" : "Run Audit"}
        </button>
        {audit && (
          <button className="dra-export-btn" onClick={handleExportToExcel} disabled={exporting}>
            {exporting ? "Exporting…" : "Export to Excel"}
          </button>
        )}
      </div>

      {error && <div className="dra-error-banner">{error}</div>}

      {running && (
        <div className="dra-loading">
          <div className="dra-loading-bar" />
          <p>Crunching legs for {months[month - 1]} {year}…</p>
        </div>
      )}

      {!audit && !running && !error && (
        <div className="dra-empty-state">
          <p>Pick a month and year, then run the audit to see discrepancies.</p>
        </div>
      )}

      {audit && !running && (
        <>
          <div className="dra-summary-grid">
            <StatCard label="Total legs" value={audit.totalLegs} color="#34495e" />
            <StatCard
              label="Big / negative"
              value={audit.mismatchShown}
              color="#c0392b"
              active={activeCategory === "mismatch"}
              onClick={() => setActiveCategory("mismatch")}
            />
            <StatCard
              label="Route-missing subbie < R500"
              value={audit.routeMissingSubbieLow ?? 0}
              color="#d35400"
              active={activeCategory === "routeMissing"}
              onClick={() => setActiveCategory("routeMissing")}
            />
            <StatCard label="Already correct" value={s.MATCH} color="#1a7a3f" />
            <StatCard
              label="Route missing"
              value={s.ROUTE_MISSING}
              color="#b9770e"
              active={activeCategory === "routeMissing"}
              onClick={() => setActiveCategory("routeMissing")}
            />
            <StatCard
              label="No field rate"
              value={s.NO_FIELD_RATE}
              color="#8e44ad"
              active={activeCategory === "noFieldRate"}
              onClick={() => (s.NO_FIELD_RATE > 0 ? setActiveCategory("noFieldRate") : null)}
            />
            <StatCard
              label="Skipped"
              value={s.SKIPPED}
              color="#7f8c8d"
              active={activeCategory === "skipped"}
              onClick={() => (s.SKIPPED > 0 ? setActiveCategory("skipped") : null)}
            />
          </div>

          <div className="dra-tabs">
            {visibleCategories.map((c) => (
              <button
                key={c.key}
                className={`dra-tab ${activeCategory === c.key ? "active" : ""}`}
                style={{ "--tab-color": c.color }}
                onClick={() => setActiveCategory(c.key)}
              >
                {c.label}
                <span className="dra-tab-count">{(rawRowsByCategory[c.key] || []).length}</span>
              </button>
            ))}
          </div>

          <div className="dra-panel">
            <p className="dra-hint">{CATEGORY_HINTS[activeCategory]}</p>

            <div className="dra-search-row">
              <input
                type="text"
                placeholder="Search client, route, driver role, leg or instruction…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <span className="dra-search-count">
                  {filteredRows.length} of {(rawRowsByCategory[activeCategory] || []).length}
                </span>
              )}
            </div>

            <DiffTable
              rows={filteredRows}
              showExpected={activeMeta.showExpected}
              showFlag={activeMeta.showFlag}
              sort={sort}
              onSort={toggleSort}
            />
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, color, active, onClick }) {
  const clickable = typeof onClick === "function";
  return (
    <div
      className={`dra-stat-card ${active ? "active" : ""} ${clickable ? "clickable" : ""}`}
      style={{ "--stat-color": color }}
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      <div className="dra-stat-label">{label}</div>
      <div className="dra-stat-value">{value}</div>
    </div>
  );
}

function SortHeader({ label, sortKey, sort, onSort, align }) {
  const isActive = sort.key === sortKey;
  return (
    <th
      className={`dra-th ${sortKey ? "sortable" : ""}`}
      style={align ? { textAlign: align } : undefined}
      onClick={sortKey ? () => onSort(sortKey) : undefined}
    >
      {label}
      {sortKey && <span className={`dra-sort-arrow ${isActive ? "active" : ""}`}>{isActive && sort.dir === "asc" ? "▲" : "▼"}</span>}
    </th>
  );
}

function DiffTable({ rows, showExpected, showFlag, sort, onSort }) {
  if (!rows || rows.length === 0) {
    return <p className="dra-no-rows">No rows match.</p>;
  }
  return (
    <div className="dra-table-container">
      <table className="dra-table">
        <thead>
          <tr>
            <SortHeader label="Leg" sortKey="legkey" sort={sort} onSort={onSort} />
            <SortHeader label="Instr." sortKey="m1key" sort={sort} onSort={onSort} />
            <SortHeader label="Client" sortKey="client" sort={sort} onSort={onSort} />
            <SortHeader label="Route" sortKey="route" sort={sort} onSort={onSort} />
            <SortHeader label="Date" sortKey="date" sort={sort} onSort={onSort} />
            <th className="dra-th">Role</th>
            <th className="dra-th">Cont.</th>
            <SortHeader label="Stored" sortKey="stored_rate" sort={sort} onSort={onSort} align="right" />
            {showExpected && <SortHeader label="Correct" sortKey="expected_rate" sort={sort} onSort={onSort} align="right" />}
            {showExpected && <SortHeader label="Δ" sortKey="delta" sort={sort} onSort={onSort} align="right" />}
            {showFlag && <th className="dra-th">Flag</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.legkey} className="dra-row">
              <td className="dra-td">{r.legkey}</td>
              <td className="dra-td">{r.m1key}</td>
              <td className="dra-td">{r.client}</td>
              <td className="dra-td">{r.route}</td>
              <td className="dra-td">{r.date}</td>
              <td className="dra-td">
                <span className={`dra-role-badge ${r.role === "subbie" ? "subbie" : "driver"}`}>{r.role}</span>
              </td>
              <td className="dra-td">{r.container}</td>
              <td className="dra-td dra-td-right">{fmtRand(r.stored_rate)}</td>
              {showExpected && <td className="dra-td dra-td-right dra-td-strong">{fmtRand(r.expected_rate)}</td>}
              {showExpected && (
                <td className={`dra-td dra-td-right ${r.delta >= 0 ? "dra-delta-pos" : "dra-delta-neg"}`}>
                  {r.delta >= 0 ? "+" : ""}{fmtRand(r.delta)}
                </td>
              )}
              {showFlag && (
                <td className="dra-td">
                  {r.flag && (
                    <span className={`dra-flag ${r.flag.includes("NEGATIVE") ? "danger" : "warning"}`}>{r.flag}</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DriverRateAuditReport;
