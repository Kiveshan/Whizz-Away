import { useState, useEffect } from "react";
import api from "../../../api.js";

const now = new Date();
const currentYear = now.getFullYear();

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const years = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i);

function RegenerateStatement() {
  const [clients, setClients] = useState([]);
  const [clientsError, setClientsError] = useState(null);
  const [clientId, setClientId] = useState("");
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(now.getMonth() === 0 ? 12 : now.getMonth());
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await api.get("/api/clients");
        setClients(
          res.data.map((c) => ({ id: c.m5clientkey, company: c.companyname }))
        );
      } catch (err) {
        setClientsError(
          err.response?.data?.message || err.message || "Failed to load clients"
        );
      }
    };
    fetchClients();
  }, []);

  const handleRun = async () => {
    if (!clientId) {
      setError("Select a client");
      return;
    }

    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const res = await api.post("/api/statements/regenerate", {
        clientId,
        specificClient: true,
        year,
        month,
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Regeneration failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <h2 style={{ marginBottom: 4 }}>Regenerate Statement</h2>
      <p style={{ color: "#666", marginBottom: 24, fontSize: 14 }}>
        Recomputes a client's statement for a past month from live invoice and
        add-on data. Use this when the stored aging figures have drifted from
        reality — e.g. invoices were deleted or entered late after the
        statement was originally generated.
      </p>

      <div style={{ display: "flex", gap: 24, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <label style={labelStyle}>Client</label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            style={{ ...selectStyle, minWidth: 240 }}
          >
            <option value="">Select a client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.company}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Month covered</label>
          <div style={{ display: "flex", gap: 8 }}>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={selectStyle}>
              {months.map((name, i) => (
                <option key={i + 1} value={i + 1}>{name}</option>
              ))}
            </select>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={selectStyle}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {clientsError && (
        <div style={{ marginBottom: 16, fontSize: 13, color: "#c0392b" }}>
          {clientsError}
        </div>
      )}

      <button onClick={handleRun} disabled={running || !clientId} style={buttonStyle(running || !clientId)}>
        {running ? "Regenerating…" : "Regenerate Statement"}
      </button>

      {error && (
        <div style={{ marginTop: 20, padding: 12, background: "#fff0f0", border: "1px solid #f5c2c2", borderRadius: 6, color: "#c0392b" }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 20, padding: 12, background: "#f0fff4", border: "1px solid #a8e6bb", borderRadius: 6, color: "#1a7a3f" }}>
          {result.message}
        </div>
      )}
    </div>
  );
}

const labelStyle = { display: "block", fontSize: 13, color: "#555", marginBottom: 6, fontWeight: 600 };
const selectStyle = { padding: "8px 10px", borderRadius: 4, border: "1px solid #ccc", fontSize: 14 };
const buttonStyle = (disabled) => ({
  padding: "10px 24px",
  background: disabled ? "#94c4a0" : "#2e7d32",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  fontSize: 15,
  cursor: disabled ? "not-allowed" : "pointer",
  fontWeight: 600,
});

export default RegenerateStatement;
