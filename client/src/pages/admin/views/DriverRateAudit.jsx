import { useState } from "react";
import ExcelJS from "exceljs";
import api from "../../../api.js";

const now = new Date();
const currentYear = now.getFullYear();

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const fmtRand = (n) =>
  n == null ? "—" : "R " + Number(n).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Audit driver rates for every leg on instructions CREATED in a chosen month.
// Read-only report: it never changes data. Rate corrections are done manually
// in Manage → Driver Rates after the boss confirms the correct values.
function DriverRateAudit() {
  const [month, setMonth] = useState(4); // default April
  const [year, setYear] = useState(currentYear);
  const [running, setRunning] = useState(false);
  const [audit, setAudit] = useState(null);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  const years = Array.from({ length: 6 }, (_, i) => currentYear - 4 + i);

  const runAudit = async () => {
    setRunning(true);
    setAudit(null);
    setError(null);
    try {
      const res = await api.get("/api/driver-rates/month-audit", {
        params: { year, month },
        timeout: 60000,
      });
      setAudit(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Audit failed");
    } finally {
      setRunning(false);
    }
  };

  const s = audit?.summary;

  const addDiffSheet = (workbook, name, rows, { showExpected, showFlag } = {}) => {
    const sheet = workbook.addWorksheet(name);
    const columns = [
      { header: "Leg", key: "legkey", width: 10 },
      { header: "Instr.", key: "m1key", width: 12 },
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
        description:
          "Legs where the stored driverrate differs from the correct (re-derived) rate by at least R500, or is higher than it (a negative discrepancy). These are the ones to take to the boss for correction — nothing is changed automatically.",
      });
      readMeSheet.addRow({
        sheet: "Route Missing",
        description:
          "Legs where no rate period covers that route on the leg's date (route renamed/deleted, or a date gap), so the correct rate can't be re-derived. Subbie legs with a stored rate under R500 are flagged SUBBIE < R500 for review.",
      });
      if (audit.noFieldRate.length > 0) {
        readMeSheet.addRow({
          sheet: "No Field Rate",
          description:
            "A rate period exists for the route and date, but the specific field needed (subbie/driver × 6m/12m) is blank, so no rate could be resolved.",
        });
      }
      if (audit.skipped.length > 0) {
        readMeSheet.addRow({
          sheet: "Skipped",
          description: "Leg has no date or no driver assigned, so a rate can't be resolved at all.",
        });
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
    <div style={{ maxWidth: 1100 }}>
      <h2 style={{ marginBottom: 4 }}>Driver Rate Audit</h2>
      <p style={{ color: "#666", marginBottom: 20, fontSize: 14 }}>
        Re-derives the correct <code>driverrate</code> for every leg on instructions
        <strong> created in the chosen month</strong>, using the same rules the app uses
        (effective-dated route rate × subbie/driver × 6m/12m), and flags only the
        <strong> big or negative</strong> discrepancies plus <strong>subbie rates under R500</strong>.
        Read-only — review these with the boss and correct the values manually in Manage → Driver Rates.
      </p>

      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <label style={labelStyle}>Month</label>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={selectStyle}>
            {months.map((name, i) => (
              <option key={i + 1} value={i + 1}>{name}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Year</label>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={selectStyle}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button onClick={runAudit} disabled={running} style={buttonStyle(running, "#2e7d32")}>
          {running ? "Running audit…" : "Run Audit"}
        </button>
        {audit && (
          <button onClick={handleExportToExcel} disabled={exporting} style={buttonStyle(exporting, "#1a5276")}>
            {exporting ? "Exporting…" : "Export to Excel"}
          </button>
        )}
      </div>

      {error && (
        <div style={bannerStyle("#fff0f0", "#f5c2c2", "#c0392b")}>{error}</div>
      )}

      {audit && (
        <>
          {/* Summary cards */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "8px 0 20px" }}>
            <SummaryCard label="Total legs" value={audit.totalLegs} color="#34495e" />
            <SummaryCard label="Big / negative" value={audit.mismatchShown} color="#c0392b" />
            <SummaryCard label="Route-missing subbie < R500" value={audit.routeMissingSubbieLow ?? 0} color="#d35400" />
            <SummaryCard label="Already correct" value={s.MATCH} color="#1a7a3f" />
            <SummaryCard label="Route missing" value={s.ROUTE_MISSING} color="#b9770e" />
            <SummaryCard label="No field rate" value={s.NO_FIELD_RATE} color="#8e44ad" />
            <SummaryCard label="Skipped" value={s.SKIPPED} color="#7f8c8d" />
          </div>

          {/* Mismatch table — only big or negative discrepancies */}
          <Section title={`Big / negative discrepancies (${audit.mismatch.length})`} color="#c0392b">
            <p style={hintStyle}>
              Routes where the stored leg rate differs from the looked-up correct rate by
              ≥ R500, or is higher than it (negative). {audit.mismatchHidden} smaller
              discrepancy{audit.mismatchHidden === 1 ? " is" : "s are"} hidden. Take these to
              the boss for the corrected values — nothing is changed automatically.
            </p>
            <DiffTable rows={audit.mismatch} showExpected showFlag />
          </Section>

          {/* Route missing — subbie legs under R500 flagged */}
          <Section title={`Route does not exist — not touched (${audit.routeMissing.length})`} color="#b9770e">
            <p style={hintStyle}>
              No rate period covers this route on the leg's date (route renamed/deleted, or a
              date gap), so the correct rate can't be re-derived. Subbie legs with a stored
              rate under R500 ({audit.routeMissingSubbieLow ?? 0}) are flagged
              <strong> SUBBIE &lt; R500</strong> — review these with the boss.
            </p>
            <DiffTable rows={audit.routeMissing} showFlag />
          </Section>

          {/* No field rate */}
          {audit.noFieldRate.length > 0 && (
            <Section title={`No field rate — not touched (${audit.noFieldRate.length})`} color="#8e44ad">
              <p style={hintStyle}>
                A rate period exists, but the specific field needed
                (subbie/driver × 6m/12m) is blank.
              </p>
              <DiffTable rows={audit.noFieldRate} />
            </Section>
          )}

          {/* Skipped */}
          {audit.skipped.length > 0 && (
            <Section title={`Skipped — not touched (${audit.skipped.length})`} color="#7f8c8d">
              <p style={hintStyle}>Leg has no date or no driver assigned, so a rate can't be resolved.</p>
              <DiffTable rows={audit.skipped} />
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <div style={{ border: `1px solid #e5e7eb`, borderLeft: `4px solid ${color}`, borderRadius: 6, padding: "10px 16px", minWidth: 120 }}>
      <div style={{ fontSize: 12, color: "#777", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function Section({ title, color, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 15, color, borderBottom: `2px solid ${color}22`, paddingBottom: 6, marginBottom: 10 }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function DiffTable({ rows, showExpected, showFlag }) {
  if (!rows || rows.length === 0) {
    return <p style={{ color: "#999", fontSize: 14, fontStyle: "italic" }}>None.</p>;
  }
  return (
    <div style={{ maxHeight: 360, overflow: "auto", border: "1px solid #eee", borderRadius: 6 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "#f5f5f5", position: "sticky", top: 0 }}>
            <th style={thStyle}>Leg</th>
            <th style={thStyle}>Instr.</th>
            <th style={thStyle}>Route</th>
            <th style={thStyle}>Date</th>
            <th style={thStyle}>Role</th>
            <th style={thStyle}>Cont.</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Stored</th>
            {showExpected && <th style={{ ...thStyle, textAlign: "right" }}>Correct</th>}
            {showExpected && <th style={{ ...thStyle, textAlign: "right" }}>Δ</th>}
            {showFlag && <th style={thStyle}>Flag</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.legkey} style={{ borderBottom: "1px solid #f0f0f0" }}>
              <td style={tdStyle}>{r.legkey}</td>
              <td style={tdStyle}>{r.m1key}</td>
              <td style={tdStyle}>{r.route}</td>
              <td style={tdStyle}>{r.date}</td>
              <td style={tdStyle}>
                <span style={{ color: r.role === "subbie" ? "#8e44ad" : "#2980b9", fontWeight: 600 }}>{r.role}</span>
              </td>
              <td style={tdStyle}>{r.container}</td>
              <td style={{ ...tdStyle, textAlign: "right" }}>{fmtRand(r.stored_rate)}</td>
              {showExpected && <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>{fmtRand(r.expected_rate)}</td>}
              {showExpected && (
                <td style={{ ...tdStyle, textAlign: "right", color: r.delta >= 0 ? "#1a7a3f" : "#c0392b" }}>
                  {r.delta >= 0 ? "+" : ""}{fmtRand(r.delta)}
                </td>
              )}
              {showFlag && (
                <td style={tdStyle}>
                  {r.flag && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: r.flag.includes("NEGATIVE") ? "#c0392b" : "#b9770e" }}>
                      {r.flag}
                    </span>
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

const labelStyle = { display: "block", fontSize: 13, color: "#555", marginBottom: 6, fontWeight: 600 };
const selectStyle = { padding: "8px 10px", borderRadius: 4, border: "1px solid #ccc", fontSize: 14 };
const thStyle = { textAlign: "left", padding: "8px 10px", fontWeight: 600, color: "#444", whiteSpace: "nowrap" };
const tdStyle = { padding: "6px 10px", color: "#333", whiteSpace: "nowrap" };
const hintStyle = { color: "#777", fontSize: 13, margin: "0 0 10px" };
const bannerStyle = (bg, border, color) => ({
  marginBottom: 16, padding: 12, background: bg, border: `1px solid ${border}`, borderRadius: 6, color,
});
const buttonStyle = (disabled, color) => ({
  padding: "10px 20px",
  background: disabled ? "#aaa" : color,
  color: "#fff",
  border: "none",
  borderRadius: 6,
  fontSize: 14,
  cursor: disabled ? "not-allowed" : "pointer",
  fontWeight: 600,
});

export default DriverRateAudit;
