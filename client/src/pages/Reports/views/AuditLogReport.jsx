"use client";

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api.js";
import Pagination from "../../../components/Pagination";
import "../css/auditLogReport.css";

const PAGE_SIZE = 25;

// Entities are discovered from the data (the server returns the distinct
// entity_type values present), so a newly audited area shows up here without a
// front-end change. This map only supplies nicer labels for the ones we know.
const ENTITY_LABELS = {
  addon: "Add-ons",
  audit: "Audit log",
  auth: "Authentication",
  client: "Clients",
  client_rate: "Client rates",
  company: "Companies",
  credit_note: "Credit notes",
  document: "Documents",
  driver_rate: "Driver rates",
  employee: "Employees",
  expense: "Expenses",
  expense_type: "Expense types",
  instruction: "Instructions",
  invoice: "Invoices",
  leg: "Legs",
  payment: "Payments",
  purchase_order: "Purchase orders",
  report: "Reports",
  statement: "Statements",
  subcontractor: "Subcontractors",
  supplier: "Suppliers",
  trailer: "Trailers",
  truck: "Trucks",
  user: "Users",
  wage: "Wages",
};

const entityLabel = (value) =>
  ENTITY_LABELS[value] || value.replaceAll("_", " ");

// The audit table grows without bound, so the viewer opens on a recent window
// rather than the whole history: every query then rides the timestamp index
// instead of scanning years of rows. Clearing the date fields still shows
// everything — it is just no longer the default.
const DEFAULT_WINDOW_DAYS = 30;

const isoDaysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};

// `embedded` drops the report-page chrome (back button, subtitle) for callers
// — like the Admin dashboard — that already provide their own frame. It also
// switches off the System Admin actor filter: the Reports view (Manager/
// Director) hides Admin's own actions, but the Admin dashboard's own audit
// tab should still show everything, including Admin's actions.
function AuditLogReport({ embedded = false }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [countIsCapped, setCountIsCapped] = useState(false);
  const [actionTypes, setActionTypes] = useState([]);
  const [entityTypes, setEntityTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(1);
  const [actionType, setActionType] = useState("");
  const [entityType, setEntityType] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [from, setFrom] = useState(() => isoDaysAgo(DEFAULT_WINDOW_DAYS));
  const [to, setTo] = useState("");

  const fetchAuditLog = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("/api/admin/audit-log", {
        params: {
          page,
          limit: PAGE_SIZE,
          actionType: actionType || undefined,
          entityType: entityType || undefined,
          search: search || undefined,
          from: from || undefined,
          to: to || undefined,
          hideAdminActors: embedded ? undefined : true,
        },
      });
      setItems(response.data.items);
      setTotalItems(response.data.totalItems);
      setCountIsCapped(Boolean(response.data.countIsCapped));
      setActionTypes(response.data.actionTypes || []);
      setEntityTypes(response.data.entityTypes || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to load audit log");
    } finally {
      setLoading(false);
    }
  }, [page, actionType, entityType, search, from, to, embedded]);

  useEffect(() => {
    fetchAuditLog();
  }, [fetchAuditLog]);

  // Reset to page 1 whenever a filter changes.
  const withPageReset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const applySearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const clearFilters = () => {
    setActionType("");
    setEntityType("");
    setSearch("");
    setSearchInput("");
    setFrom(isoDaysAgo(DEFAULT_WINDOW_DAYS));
    setTo("");
    setPage(1);
  };

  const filtersActive =
    actionType || entityType || search || to || from !== isoDaysAgo(DEFAULT_WINDOW_DAYS);

  const formatTimestamp = (ts) =>
    new Date(ts).toLocaleString("en-ZA", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  return (
    <div className={`alr-wrapper ${embedded ? "alr-embedded" : ""}`}>
      {!embedded && (
        <>
          <div className="header-actions">
            <button onClick={() => navigate("/reports")} className="back-button">
              Back
            </button>
          </div>

          <p className="alr-subtitle">
            Every tracked action across the system — logins, approvals, edits and
            deletions — with who did it, when, and what happened. Read-only.
          </p>
        </>
      )}

      <div className="alr-panel">
        <form className="alr-filters" onSubmit={applySearch}>
          <div className="alr-field">
            <label>Action</label>
            <select
              value={actionType}
              onChange={(e) => withPageReset(setActionType)(e.target.value)}
              aria-label="Filter by action"
            >
              <option value="">All actions</option>
              {actionTypes.map((type) => (
                <option key={type} value={type}>
                  {type.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <div className="alr-field">
            <label>Entity</label>
            <select
              value={entityType}
              onChange={(e) => withPageReset(setEntityType)(e.target.value)}
              aria-label="Filter by entity"
            >
              <option value="">All entities</option>
              {entityTypes.map((type) => (
                <option key={type} value={type}>
                  {entityLabel(type)}
                </option>
              ))}
            </select>
          </div>

          <div className="alr-field">
            <label>From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => withPageReset(setFrom)(e.target.value)}
              aria-label="From date"
            />
          </div>
          <div className="alr-field">
            <label>To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => withPageReset(setTo)(e.target.value)}
              aria-label="To date"
            />
          </div>

          <div className="alr-field alr-field-search">
            <label>Search</label>
            <input
              type="text"
              placeholder="Actor, target, path or details…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search audit log"
            />
          </div>

          <div className="alr-filter-actions">
            <button type="submit" className="alr-search-btn">Search</button>
            {filtersActive && (
              <button type="button" className="alr-clear-btn" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>
        </form>

        <div className="alr-summary-line">
          {countIsCapped ? (
            <>More than {totalItems.toLocaleString()} matching entries — narrow the date range to get an exact count.</>
          ) : (
            <>{totalItems.toLocaleString()} matching {totalItems === 1 ? "entry" : "entries"}.</>
          )}
          {from && !to && from === isoDaysAgo(DEFAULT_WINDOW_DAYS) && (
            <> Showing the last {DEFAULT_WINDOW_DAYS} days; clear the from-date to search all history.</>
          )}
        </div>

        {error && <div className="alr-error-banner">{error}</div>}

        {loading ? (
          <div className="alr-loading">
            <div className="alr-loading-bar" />
            <p>Loading audit log…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="alr-empty-state">
            <p>No audit entries match the current filters.</p>
          </div>
        ) : (
          <>
            <div className="alr-table-container">
              <table className="alr-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>Actor</th>
                    <th>Target</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((entry) => (
                    <tr key={entry.audit_id} className="alr-row">
                      <td className="alr-timestamp">{formatTimestamp(entry.timestamp)}</td>
                      <td>
                        <span className="alr-action-badge">
                          {entry.action_type.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td>{entry.entity_type ? entityLabel(entry.entity_type) : "—"}</td>
                      <td>
                        {entry.actor_name ||
                          (entry.admin_id != null ? `User ${entry.admin_id}` : "—")}
                      </td>
                      <td>{entry.target_name || entry.target_id || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              totalRecords={totalItems}
              recordsPerPage={PAGE_SIZE}
              currentPage={page}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default AuditLogReport;
