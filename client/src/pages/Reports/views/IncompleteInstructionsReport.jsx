"use client";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ExcelJS from "exceljs";
import api from "../../../api.js";
import "../css/driverRateAudit.css";

const toIsoDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const today = new Date();
const defaultFrom = toIsoDate(new Date(today.getFullYear(), today.getMonth() - 2, 1));
const defaultTo = toIsoDate(today);

const STATUS_FILTERS = [
  { key: "all", label: "All not completed", color: "#34495e" },
  { key: "new", label: "New", color: "#b9770e" },
  { key: "in progress", label: "In Progress", color: "#1a5276" },
];

const COLUMNS = [
  { header: "Instr.", key: "m1key", width: 10 },
  { header: "Client", key: "client", width: 26 },
  { header: "KSM File Ref", key: "ksm_file_ref", width: 16 },
  { header: "Client File Ref", key: "client_file_ref", width: 18 },
  { header: "Booking Ref", key: "booking_ref", width: 16 },
  { header: "Type", key: "shipment_type", width: 16 },
  { header: "Pickup", key: "pickup", width: 20 },
  { header: "Drop-off", key: "dropoff", width: 20 },
  { header: "Status", key: "status", width: 14 },
  { header: "Created", key: "created_at", width: 12 },
  { header: "Days Open", key: "days_open", width: 11 },
];

const normStatus = (s) => String(s || "").trim().toLowerCase();

function IncompleteInstructionsReport() {
  const navigate = useNavigate();
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ key: null, dir: "desc" });

  const runReport = async () => {
    if (!from || !to || from > to) {
      setError("Choose a valid date range (From must be on or before To).");
      return;
    }
    setRunning(true);
    setReport(null);
    setError(null);
    setSearch("");
    setStatusFilter("all");
    setSort({ key: null, dir: "desc" });
    try {
      const res = await api.get("/api/reports/incomplete-instructions", { params: { from, to } });
      setReport(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to run report");
    } finally {
      setRunning(false);
    }
  };

  const rows = useMemo(() => report?.rows || [], [report]);

  const counts = useMemo(() => {
    const c = { all: rows.length, new: 0, "in progress": 0 };
    rows.forEach((r) => {
      const s = normStatus(r.status);
      if (s in c) c[s] += 1;
    });
    return c;
  }, [rows]);

  const oldestDaysOpen = useMemo(
    () => rows.reduce((max, r) => Math.max(max, Number(r.days_open) || 0), 0),
    [rows]
  );

  const filteredRows = useMemo(() => {
    let out = statusFilter === "all" ? rows : rows.filter((r) => normStatus(r.status) === statusFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter((r) =>
        [r.m1key, r.client, r.ksm_file_ref, r.client_file_ref, r.booking_ref, r.pickup, r.dropoff]
          .filter((v) => v != null)
          .some((v) => String(v).toLowerCase().includes(q))
      );
    }
    if (sort.key) {
      out = [...out].sort((a, b) => {
        const av = a[sort.key] ?? "";
        const bv = b[sort.key] ?? "";
        if (av < bv) return sort.dir === "asc" ? -1 : 1;
        if (av > bv) return sort.dir === "asc" ? 1 : -1;
        return 0;
      });
    }
    return out;
  }, [rows, statusFilter, search, sort]);

  const toggleSort = (key) => {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }
    );
  };

  const handleExportToExcel = async () => {
    if (!report) return;
    setExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.created = new Date();
      workbook.modified = new Date();

      const summarySheet = workbook.addWorksheet("Summary");
      summarySheet.columns = [
        { header: "Metric", key: "metric", width: 32 },
        { header: "Value", key: "value", width: 24 },
      ];
      summarySheet.addRow({ metric: "Period (instruction created)", value: `${report.from} to ${report.to}` });
      summarySheet.addRow({ metric: "Excludes", value: "Completed instructions and add-on instructions" });
      summarySheet.addRow({});
      summarySheet.addRow({ metric: "Total not completed", value: counts.all });
      summarySheet.addRow({ metric: "New", value: counts.new });
      summarySheet.addRow({ metric: "In Progress", value: counts["in progress"] });
      summarySheet.addRow({ metric: "Oldest (days open)", value: oldestDaysOpen });
      summarySheet.getRow(1).font = { bold: true };

      const sheet = workbook.addWorksheet("Instructions");
      sheet.columns = COLUMNS;
      rows.forEach((r) => sheet.addRow(r));
      sheet.getRow(1).font = { bold: true };
      sheet.views = [{ state: "frozen", ySplit: 1 }];
      sheet.autoFilter = { from: "A1", to: { row: 1, column: COLUMNS.length } };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `incomplete-instructions-${report.from}-to-${report.to}.xlsx`;
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
        <p className="dra-subtitle">
          Lists every instruction created in the chosen date range that is still New or In Progress.
          Completed instructions and add-on instructions are excluded. Days Open counts from the
          instruction's created date to today.
        </p>
      </div>

      <div className="dra-controls-card">
        <div className="dra-field">
          <label htmlFor="iir-from">From</label>
          <input id="iir-from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="dra-field">
          <label htmlFor="iir-to">To</label>
          <input id="iir-to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button className="dra-run-btn" onClick={runReport} disabled={running}>
          {running ? "Running…" : "Run Report"}
        </button>
        {report && (
          <button className="dra-export-btn" onClick={handleExportToExcel} disabled={exporting || rows.length === 0}>
            {exporting ? "Exporting…" : "Export to Excel"}
          </button>
        )}
      </div>

      {error && <div className="dra-error-banner">{error}</div>}

      {running && (
        <div className="dra-loading">
          <div className="dra-loading-bar" />
          <p>Finding incomplete instructions…</p>
        </div>
      )}

      {!report && !running && !error && (
        <div className="dra-empty-state">
          <p>Pick a date range, then run the report to see instructions that are not completed.</p>
        </div>
      )}

      {report && !running && (
        <>
          <div className="dra-summary-grid">
            {STATUS_FILTERS.map((f) => (
              <StatCard
                key={f.key}
                label={f.label}
                value={counts[f.key]}
                color={f.color}
                active={statusFilter === f.key}
                onClick={() => setStatusFilter(f.key)}
              />
            ))}
            <StatCard label="Oldest (days open)" value={oldestDaysOpen} color="#c0392b" />
          </div>

          <div className="dra-panel">
            <div className="dra-search-row">
              <input
                type="text"
                placeholder="Search instruction, client, file ref, booking ref, pickup or drop-off…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <span className="dra-search-count">
                {filteredRows.length} of {rows.length}
              </span>
            </div>

            {filteredRows.length === 0 ? (
              <p className="dra-no-rows">
                {rows.length === 0 ? "No incomplete instructions in this date range." : "No rows match."}
              </p>
            ) : (
              <div className="dra-table-container">
                <table className="dra-table">
                  <thead>
                    <tr>
                      {COLUMNS.map((col) => (
                        <SortHeader
                          key={col.key}
                          label={col.header}
                          sortKey={col.key}
                          sort={sort}
                          onSort={toggleSort}
                          align={col.key === "days_open" ? "right" : undefined}
                        />
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((r) => (
                      <tr key={r.m1key} className="dra-row">
                        <td className="dra-td">{r.m1key}</td>
                        <td className="dra-td">{r.client}</td>
                        <td className="dra-td">{r.ksm_file_ref}</td>
                        <td className="dra-td">{r.client_file_ref}</td>
                        <td className="dra-td">{r.booking_ref}</td>
                        <td className="dra-td">{r.shipment_type}</td>
                        <td className="dra-td">{r.pickup}</td>
                        <td className="dra-td">{r.dropoff}</td>
                        <td className="dra-td">
                          <span className={`dra-flag ${normStatus(r.status) === "new" ? "warning" : "danger"}`}>
                            {r.status || "—"}
                          </span>
                        </td>
                        <td className="dra-td">{r.created_at}</td>
                        <td className="dra-td dra-td-right dra-td-strong">{r.days_open}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
      className="dra-th sortable"
      style={align ? { textAlign: align } : undefined}
      onClick={() => onSort(sortKey)}
    >
      {label}
      <span className={`dra-sort-arrow ${isActive ? "active" : ""}`}>{isActive && sort.dir === "asc" ? "▲" : "▼"}</span>
    </th>
  );
}

export default IncompleteInstructionsReport;
