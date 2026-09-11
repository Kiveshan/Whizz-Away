"use client"

import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import "../../css/controller-ui.css"
import api from "../../../../api"
import Pagination from "../../../../components/Pagination"
import { ControllerSubNav } from "../../../../components/instructions/ControllerSubNav"

const RECORDS_PER_PAGE = 10

const matchesClientText = (client, q) =>
  `${client.companyname || ""} ${client.representative || ""} ${client.email || ""}`
    .toLowerCase()
    .includes(q)

const CompanyInstructionView = () => {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [searchLoading, setSearchLoading] = useState(false)
  // Client ids owning an instruction whose container number / client ref
  // matches the search (server-side). Null when no search is active.
  const [searchMatchingClientIds, setSearchMatchingClientIds] = useState(null)

  useEffect(() => {
    const fetchClientStats = async () => {
      try {
        setLoading(true)
        const response = await api.get("/api/instructions/client-instruction-stats")
        setClients(
          (response.data || []).map((client) => ({
            ...client,
            new_count: Number.parseInt(client.new_count) || 0,
            in_progress_count: Number.parseInt(client.in_progress_count) || 0,
            completed_count: Number.parseInt(client.completed_count) || 0,
          })),
        )
      } catch (err) {
        console.error("Error fetching client statistics:", err)
        setError(err.response?.data?.message || err.message || "Failed to load client data. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchClientStats()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setSearchMatchingClientIds(null)
      setSearchLoading(false)
      return
    }

    const runSearch = async () => {
      try {
        setSearchLoading(true)
        const response = await api.get(`/api/instructions/search?q=${encodeURIComponent(debouncedSearch.trim())}`)
        const clientIds = new Set(
          (response.data || [])
            .flatMap((i) => [i.client, i.clientid, i.m5clientkey, i.client_id, i.client_key, i.clientId])
            .filter(Boolean)
            .map((id) => String(id).trim()),
        )
        setSearchMatchingClientIds(clientIds)
      } catch (err) {
        console.error("Error running instruction search", err)
      } finally {
        setSearchLoading(false)
      }
    }

    runSearch()
  }, [debouncedSearch])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch])

  // A client matches on its own details (company / rep / email) or because one
  // of its instructions matched the container / client ref search.
  const filteredClients = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(
      (client) =>
        matchesClientText(client, q) || searchMatchingClientIds?.has(String(client.m5clientkey).trim()),
    )
  }, [clients, debouncedSearch, searchMatchingClientIds])

  const totalNew = clients.reduce((sum, client) => sum + client.new_count, 0)
  const indexOfFirstRecord = (currentPage - 1) * RECORDS_PER_PAGE
  const currentClients = filteredClients.slice(indexOfFirstRecord, indexOfFirstRecord + RECORDS_PER_PAGE)

  const handleView = (client) => {
    const q = debouncedSearch.trim()
    // Only carry the search into the instruction list when it matched an
    // instruction; a company-name match would otherwise filter it to nothing.
    const matchedViaInstruction = q && !matchesClientText(client, q.toLowerCase())
    navigate("/CompanyInstructions", {
      state: {
        clientId: client.m5clientkey,
        clientName: client.companyname,
        containerSearch: matchedViaInstruction ? q : undefined,
      },
    })
  }

  return (
    <div className="wa-page">
      <ControllerSubNav active="clients" />

      <div className="wa-container">
        <div className="wa-card">
          <div className="wa-card-head">
            <div>
              <h2 className="wa-card-title">Clients</h2>
              {!loading && !error && (
                <div className="wa-muted">
                  {totalNew > 0
                    ? `${totalNew} new instruction${totalNew === 1 ? "" : "s"} waiting across ${clients.filter((c) => c.new_count > 0).length} client(s)`
                    : "No new instructions"}
                </div>
              )}
            </div>
            <input
              type="text"
              className="wa-input wa-search"
              placeholder="Search company, rep, email, container no. or client ref…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search clients"
            />
          </div>

          {loading ? (
            <div className="wa-state">Loading clients…</div>
          ) : error ? (
            <div className="wa-state is-error">{error}</div>
          ) : (
            <>
              <div className="wa-table-wrap">
                <table className="wa-table">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Representative</th>
                      <th>Email</th>
                      <th className="is-center">New</th>
                      <th className="is-center">In Progress</th>
                      <th className="is-center">Completed</th>
                      <th>Instructions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentClients.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="wa-empty">
                          {searchLoading
                            ? "Searching…"
                            : search.trim()
                              ? "No clients match that search."
                              : "No client data available."}
                        </td>
                      </tr>
                    ) : (
                      currentClients.map((client) => (
                        <tr key={client.m5clientkey}>
                          <td className="is-strong">{client.companyname}</td>
                          <td>{client.representative}</td>
                          <td>{client.email}</td>
                          <td className="is-center">
                            <span className={`wa-pill ${client.new_count > 0 ? "wa-pill-new" : "wa-pill-neutral"}`}>
                              {client.new_count}
                            </span>
                          </td>
                          <td className="is-center">{client.in_progress_count}</td>
                          <td className="is-center">{client.completed_count}</td>
                          <td>
                            <button type="button" className="wa-btn wa-btn-primary" onClick={() => handleView(client)}>
                              View
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="wa-pagination">
                <Pagination
                  totalRecords={filteredClients.length}
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

export default CompanyInstructionView
