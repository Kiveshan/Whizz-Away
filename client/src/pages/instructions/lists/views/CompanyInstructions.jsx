"use client"

import { useState, useEffect, useMemo } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import "../../css/controller-ui.css"
import api from "../../../../api"
import Pagination from "../../../../components/Pagination"
import { ControllerSubNav } from "../../../../components/instructions/ControllerSubNav"
import {
  shipmentTypeId,
  shipmentTypeLabel,
  statusPillClass,
  formatDate,
  WEIGHT_UNITS,
} from "../../../../utils/instructions/display"

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]
const FIRST_YEAR = 2023
const YEARS = Array.from({ length: new Date().getFullYear() - FIRST_YEAR + 1 }, (_, i) => String(FIRST_YEAR + i))
const RECORDS_PER_PAGE = 10

// Filter keys stay the strings other screens pass back in location.state.
const TYPE_FILTERS = [
  { key: "import", label: "Import", typeId: "1" },
  { key: "export", label: "Export", typeId: "2" },
  { key: "cross-haul", label: "Cross-Haul", typeId: "3" },
  { key: "cross-haul-break-bulk", label: "Cross-Haul (Break Bulk)", typeId: "4" },
  { key: "add-on", label: "Add-On", typeId: "5" },
]
const STATUS_FILTERS = ["New", "In Progress", "Completed"]

// New first, then In Progress, then Completed; anything else last.
const STATUS_PRIORITY = { new: 1, "in progress": 3, completed: 4 }
const statusPriority = (status) => STATUS_PRIORITY[(status || "").toLowerCase()] || 5

const instructionKey = (item) => item.m1controllerkey || item.m1key

const invoiceNumber = (item) =>
  (shipmentTypeId(item) === "5" ? item.addon_invoice_number : item.invoice_num) || "N/A"

// Weight-based instructions (Break Bulk type 4, or a weight-mode Add-On type 5)
// never have containers, so they skip the container check for assignment.
const isAssignmentBlocked = (item) => {
  const typeId = shipmentTypeId(item)
  const isWeightBased = typeId === "4" || (typeId === "5" && WEIGHT_UNITS.includes(item.rateweight))
  return item.has_valid_containers !== true && !isWeightBased
}

const CompanyInstructions = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    clientId,
    clientName,
    selectedMonth: initialMonth,
    selectedYear: initialYear,
    activeFilter: initialFilter,
    containerSearch: initialSearch,
  } = location.state || {}

  const now = new Date()
  // Arriving with a container search clears month/year so every match is visible.
  const [selectedMonth, setSelectedMonth] = useState(initialMonth ?? (initialSearch ? "" : MONTHS[now.getMonth()]))
  const [selectedYear, setSelectedYear] = useState(initialYear ?? (initialSearch ? "" : String(now.getFullYear())))
  const [activeFilter, setActiveFilter] = useState(initialFilter || "All")
  const [instructions, setInstructions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [search, setSearch] = useState(initialSearch || "")
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch || "")
  const [searchLoading, setSearchLoading] = useState(false)
  // m1keys whose containers / client ref match the search (server-side).
  const [searchMatchedKeys, setSearchMatchedKeys] = useState(null)

  useEffect(() => {
    const fetchInstructions = async () => {
      try {
        setLoading(true)
        const response = await api.get("/api/instructions/instructions")
        const data = response.data || []
        // The endpoint returns every client's instructions, and the client id can
        // sit on any of several fields depending on the query behind the row.
        const clientIdStr = clientId != null ? String(clientId).trim() : ""
        setInstructions(
          clientIdStr
            ? data.filter((item) =>
                [item.client, item.clientid, item.m5clientkey, item.client_id, item.client_key, item.clientId].some(
                  (id) => id !== undefined && id !== null && String(id).trim() === clientIdStr,
                ),
              )
            : data,
        )
      } catch (err) {
        console.error("Error fetching instructions:", err)
        setError(`Failed to load instructions: ${err.response?.data?.message || err.message || "Unknown error"}`)
      } finally {
        setLoading(false)
      }
    }

    fetchInstructions()
  }, [clientId])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setSearchMatchedKeys(null)
      setSearchLoading(false)
      return
    }

    const runSearch = async () => {
      try {
        setSearchLoading(true)
        const params = new URLSearchParams({ q: debouncedSearch.trim() })
        if (clientId) params.append("clientId", clientId)
        const response = await api.get(`/api/instructions/search?${params}`)
        setSearchMatchedKeys(new Set((response.data || []).map((i) => String(i.m1key))))
      } catch (err) {
        console.error("Error running instruction search", err)
      } finally {
        setSearchLoading(false)
      }
    }

    runSearch()
  }, [debouncedSearch, clientId])

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedMonth, selectedYear, activeFilter, debouncedSearch])

  const periodScoped = useMemo(
    () =>
      instructions.filter((item) => {
        if (!selectedMonth && !selectedYear) return true
        if (!item.startingdate) return false
        const date = new Date(item.startingdate)
        if (selectedMonth && MONTHS[date.getMonth()] !== selectedMonth) return false
        if (selectedYear && String(date.getFullYear()) !== selectedYear) return false
        return true
      }),
    [instructions, selectedMonth, selectedYear],
  )

  const filteredInstructions = useMemo(() => {
    const filter = (activeFilter || "All").toLowerCase()
    const typeFilter = TYPE_FILTERS.find((f) => f.key === filter)
    const isStatusFilter = STATUS_FILTERS.some((s) => s.toLowerCase() === filter)
    const q = debouncedSearch.trim().toLowerCase()

    return periodScoped
      .filter((item) => {
        if (typeFilter) return shipmentTypeId(item) === typeFilter.typeId
        if (isStatusFilter) return (item.status || "").toLowerCase() === filter
        return true
      })
      .filter((item) => {
        if (!q) return true
        const refs = [instructionKey(item), item.booking_ref, item.client_ref, item.ksm_file_ref, invoiceNumber(item)]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        return refs.includes(q) || Boolean(searchMatchedKeys?.has(String(item.m1key)))
      })
      .sort(
        (a, b) =>
          statusPriority(a.status) - statusPriority(b.status) ||
          Number.parseInt(instructionKey(b) || 0) - Number.parseInt(instructionKey(a) || 0),
      )
  }, [periodScoped, activeFilter, debouncedSearch, searchMatchedKeys])

  const indexOfFirstRecord = (currentPage - 1) * RECORDS_PER_PAGE
  const currentInstructions = filteredInstructions.slice(indexOfFirstRecord, indexOfFirstRecord + RECORDS_PER_PAGE)

  const listState = { clientId, clientName, selectedMonth, selectedYear, activeFilter }
  const period = [selectedMonth, selectedYear].filter(Boolean).join(" ") || "all dates"

  const renderChip = (key, label) => (
    <button
      key={key}
      type="button"
      className={`wa-chip ${(activeFilter || "All").toLowerCase() === key.toLowerCase() ? "is-active" : ""}`}
      onClick={() => setActiveFilter(key)}
    >
      {label}
    </button>
  )

  return (
    <div className="wa-page">
      <ControllerSubNav active="clients" backLabel="← Clients" onBack={() => navigate("/CompanyInstructionView")} />

      <div className="wa-container">
        <div className="wa-card">
          <div className="wa-card-head" style={{ marginBottom: 0 }}>
            <h2 className="wa-card-title">{clientName ? `${clientName} · Instructions` : "Instructions"}</h2>
            {!loading && !error && (
              <div className="wa-muted">
                {searchLoading
                  ? "Searching…"
                  : `${filteredInstructions.length} of ${periodScoped.length} instructions · ${period}`}
              </div>
            )}
          </div>

          <div className="wa-chips">
            {renderChip("All", "All")}
            {TYPE_FILTERS.map((f) => renderChip(f.key, f.label))}
            <span className="wa-chip-divider" aria-hidden="true" />
            {STATUS_FILTERS.map((s) => renderChip(s, s))}
          </div>

          <div className="wa-toolbar">
            <input
              type="text"
              className="wa-input wa-search"
              placeholder="Search instruction no, booking / client / KSM ref, container no…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search instructions"
            />
            <select
              className="wa-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              aria-label="Month"
            >
              <option value="">All months</option>
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <select
              className="wa-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              aria-label="Year"
            >
              <option value="">All years</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="wa-state">Loading instructions…</div>
          ) : error ? (
            <div className="wa-state is-error">{error}</div>
          ) : (
            <>
              <div className="wa-table-wrap">
                <table className="wa-table">
                  <thead>
                    <tr>
                      <th>Instruction No</th>
                      <th>Invoice No</th>
                      <th>Booking Ref</th>
                      <th>Client Ref</th>
                      <th>KSM File Ref</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th colSpan={2}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentInstructions.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="wa-empty">
                          {searchLoading ? "Searching…" : "No instructions match this filter."}
                        </td>
                      </tr>
                    ) : (
                      currentInstructions.map((item) => {
                        const id = instructionKey(item)
                        return (
                          <tr key={id}>
                            <td className="is-strong">{id}</td>
                            <td>{invoiceNumber(item)}</td>
                            <td>{item.booking_ref || "N/A"}</td>
                            <td>{item.client_ref || "N/A"}</td>
                            <td>{item.ksm_file_ref || "N/A"}</td>
                            <td>{shipmentTypeLabel(item)}</td>
                            <td>
                              <span className={`wa-pill ${statusPillClass(item.status)}`}>{item.status || "—"}</span>
                            </td>
                            <td>{formatDate(item.startingdate)}</td>
                            <td>
                              <button
                                type="button"
                                className="wa-btn wa-btn-primary"
                                onClick={() =>
                                  navigate("/Viewcontrollerinstructions", {
                                    // The by-id endpoint has no invoice number, so carry it over.
                                    state: { instructionId: id, invoiceNo: invoiceNumber(item), ...listState },
                                  })
                                }
                              >
                                View
                              </button>
                            </td>
                            <td>
                              {isAssignmentBlocked(item) ? (
                                <span className="wa-tooltip">
                                  <button type="button" className="wa-btn wa-btn-secondary" disabled>
                                    Assignment
                                  </button>
                                  <span className="wa-tooltip-text">Allocate containers to proceed to assignment</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className="wa-btn wa-btn-secondary"
                                  onClick={() =>
                                    navigate("/DirectorManagerViewAssignment", {
                                      state: { instructionId: id, ...listState },
                                    })
                                  }
                                >
                                  Assignment
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="wa-pagination">
                <Pagination
                  totalRecords={filteredInstructions.length}
                  recordsPerPage={RECORDS_PER_PAGE}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default CompanyInstructions
