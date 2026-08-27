"use client";

import { Fragment, useState, useEffect, useCallback } from "react";
import api from "../../../api.js";
import Pagination from "../../../components/Pagination";
import "../css/AuditLogViewer.css";

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

const OUTCOMES = [
  { value: "", label: "All outcomes" },
  { value: "SUCCESS", label: "Successful" },
  { value: "FAILURE", label: "Failed" },
  { value: "DENIED", label: "Denied" },
];

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

function AuditLogViewer() {
  const [items, setItems] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [countIsCapped, setCountIsCapped] = useState(false);
  const [actionTypes, setActionTypes] = useState([]);
  const [entityTypes, setEntityTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const [page, setPage] = useState(1);
  const [actionType, setActionType] = useState("");
  const [entityType, setEntityType] = useState("");
  const [outcome, setOutcome] = useState("");
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
          outcome: outcome || undefined,
          search: search || undefined,
          from: from || undefined,
          to: to || undefined,
        },
      });
      setItems(response.data.items);
      setTotalItems(response.data.totalItems);
      setCountIsCapped(Boolean(response.data.countIsCapped));
      setActionTypes(response.data.actionTypes || []);
      setEntityTypes(response.data.entityTypes || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, actionType, entityType, outcome, search, from, to]);

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

  const formatTimestamp = (ts) =>
    new Date(ts).toLocaleString("en-ZA", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const toggleRow = (id) => setExpandedId((current) => (current === id ? null : id));

  return (
    <div className="audit-log-viewer">
      <h2>Audit Log</h2>

      <form className="audit-filters" onSubmit={applySearch}>
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

        <select
          value={outcome}
          onChange={(e) => withPageReset(setOutcome)(e.target.value)}
          aria-label="Filter by outcome"
        >
          {OUTCOMES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={from}
          onChange={(e) => withPageReset(setFrom)(e.target.value)}
          aria-label="From date"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => withPageReset(setTo)(e.target.value)}
          aria-label="To date"
        />

        <input
          type="text"
          placeholder="Search actor, target, path or details..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          aria-label="Search audit log"
        />
        <button type="submit">Search</button>
      </form>

      <div className="audit-summary">
        {countIsCapped ? (
          <>
            More than {totalItems.toLocaleString()} matching entries — narrow the date
            range to get an exact count.
          </>
        ) : (
          <>{totalItems.toLocaleString()} matching entries.</>
        )}
        {from && !to && from === isoDaysAgo(DEFAULT_WINDOW_DAYS) && (
          <> Showing the last {DEFAULT_WINDOW_DAYS} days; clear the from-date to search all history.</>
        )}
      </div>

      {error && <div className="error">Error: {error}</div>}

      {loading ? (
        <div className="loading">Loading audit log...</div>
      ) : items.length === 0 ? (
        <div className="no-audit-entries">No audit entries match the current filters.</div>
      ) : (
        <>
          <table className="audit-log-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Actor</th>
                <th>Target</th>
                <th>Outcome</th>
                <th>Request</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {items.map((entry) => (
                <Fragment key={entry.audit_id}>
                  <tr
                    className="audit-row"
                    onClick={() => toggleRow(entry.audit_id)}
                  >
                    <td className="audit-timestamp">{formatTimestamp(entry.timestamp)}</td>
                    <td>
                      <span className="audit-action-badge">
                        {entry.action_type.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td>{entry.entity_type ? entityLabel(entry.entity_type) : "—"}</td>
                    <td>
                      {entry.actor_name ||
                        (entry.admin_id != null ? `User ${entry.admin_id}` : "—")}
                    </td>
                    <td>{entry.target_name || entry.target_id || "—"}</td>
                    <td>
                      <span
                        className={`audit-outcome audit-outcome-${(
                          entry.outcome || "unknown"
                        ).toLowerCase()}`}
                      >
                        {entry.outcome || "—"}
                        {entry.status_code ? ` ${entry.status_code}` : ""}
                      </span>
                    </td>
                    <td className="audit-request">
                      {entry.http_method ? (
                        <>
                          <strong>{entry.http_method}</strong> {entry.request_path}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="audit-details">{entry.details}</td>
                  </tr>
                  {expandedId === entry.audit_id && (
                    <tr className="audit-metadata-row">
                      <td colSpan={8}>
                        <dl className="audit-metadata-facts">
                          <div>
                            <dt>IP address</dt>
                            <dd>{entry.ip_address || "—"}</dd>
                          </div>
                          <div>
                            <dt>Duration</dt>
                            <dd>{entry.duration_ms != null ? `${entry.duration_ms} ms` : "—"}</dd>
                          </div>
                          <div>
                            <dt>Actor role</dt>
                            <dd>{entry.actor_role ?? "—"}</dd>
                          </div>
                          <div>
                            <dt>User agent</dt>
                            <dd>{entry.user_agent || "—"}</dd>
                          </div>
                        </dl>
                        {entry.metadata ? (
                          <pre className="audit-metadata">
                            {JSON.stringify(entry.metadata, null, 2)}
                          </pre>
                        ) : (
                          <div className="audit-metadata-empty">
                            No request payload recorded for this entry.
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>

          <Pagination
            totalRecords={totalItems}
            recordsPerPage={PAGE_SIZE}
            currentPage={page}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}

export default AuditLogViewer;
