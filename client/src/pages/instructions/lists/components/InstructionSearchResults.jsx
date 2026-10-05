import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from "react"
import Pagination from "../../../../components/Pagination"
import "../../css/InstructionSearchResults.css"

// Must match the row height in InstructionSearchResults.css (32px + 1px border).
const ROW_HEIGHT = 33
// Room kept free under the table for the pagination controls.
const SPACE_BELOW_TABLE = 80
const MIN_ROWS = 5
const MAX_ROWS = 25

// "Container" alone isn't useful when an instruction has many containers — name the ones that matched.
const describeMatch = (result) =>
  (result.matched_fields || [])
    .map((field) =>
      field === "Container" && result.matched_containers ? `Container ${result.matched_containers}` : field,
    )
    .join(", ")

// Single-line cell that truncates with "…". When its text doesn't fit, clicking it expands
// the whole row so every cell wraps to show its full text; clicking again collapses it.
const Cell = ({ value, expanded, onToggle, layoutVersion }) => {
  const ref = useRef(null)
  const [truncated, setTruncated] = useState(false)
  const text = value || "N/A"

  useLayoutEffect(() => {
    const el = ref.current
    if (el && !expanded) setTruncated(el.scrollWidth > el.clientWidth)
  }, [text, expanded, layoutVersion])

  const clickable = truncated || expanded
  return (
    <td
      ref={ref}
      className={clickable ? "instruction-search-results-expandable" : undefined}
      title={clickable ? (expanded ? "Click to collapse" : `${text}\n(click to show in full)`) : undefined}
      onClick={clickable ? onToggle : undefined}
    >
      {text}
    </td>
  )
}

/**
 * Matching instructions for an active search on the client overview pages, so a ref that
 * identifies one instruction (KSM file ref, booking ref, ...) is one click from opening it
 * instead of being a filtered client list to dig through.
 *
 * Rows per page are sized to the window so each page of rows fits on screen.
 */
const InstructionSearchResults = ({
  results,
  loading,
  error,
  onRetry,
  onOpenInstruction,
  onOpenClient,
  paginationClassName,
}) => {
  const tableRef = useRef(null)
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedKeys, setExpandedKeys] = useState(() => new Set())
  // Bumped on resize so cells re-check whether their text still fits.
  const [layoutVersion, setLayoutVersion] = useState(0)

  const measure = useCallback(() => {
    if (!tableRef.current) return
    const tableTop = tableRef.current.getBoundingClientRect().top + window.scrollY
    const available = window.innerHeight - tableTop - ROW_HEIGHT /* header row */ - SPACE_BELOW_TABLE
    setPageSize(Math.min(MAX_ROWS, Math.max(MIN_ROWS, Math.floor(available / ROW_HEIGHT))))
  }, [])

  useLayoutEffect(() => {
    measure()
    const onResize = () => {
      measure()
      setLayoutVersion((v) => v + 1)
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [measure])

  // An exact instruction-number hit is almost certainly what was meant, so it goes first;
  // otherwise keep the server's newest-first order.
  const sorted = useMemo(() => {
    const rows = [...(results || [])]
    const isExactKey = (r) => (r.matched_fields || []).includes("Instruction #")
    return rows.sort((a, b) => isExactKey(b) - isExactKey(a))
  }, [results])

  useEffect(() => {
    setCurrentPage(1)
    setExpandedKeys(new Set())
  }, [results, pageSize])

  const toggleExpanded = (key) =>
    setExpandedKeys((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  const clientCount = useMemo(() => new Set(sorted.map((r) => r.client)).size, [sorted])
  const pageRows = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const messageRow = (content) => (
    <tr>
      <td colSpan="8" className="instruction-search-results-message">
        {content}
      </td>
    </tr>
  )

  return (
    <>
      <p className="instruction-search-results-summary">
        {!loading && !error && sorted.length > 0
          ? `${sorted.length} matching ${sorted.length === 1 ? "instruction" : "instructions"} across ${clientCount} ${
              clientCount === 1 ? "client" : "clients"
            }`
          : " "}
      </p>

      <table ref={tableRef} className="instruction-search-results">
        <colgroup>
          <col style={{ width: "11%" }} />
          <col style={{ width: "19%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "13%" }} />
          <col style={{ width: "13%" }} />
          <col style={{ width: "9%" }} />
          <col style={{ width: "13%" }} />
        </colgroup>
        <thead>
          <tr>
            <th>Instruction No</th>
            <th>Client</th>
            <th>KSM File Ref</th>
            <th>Client Ref</th>
            <th>Booking Ref</th>
            <th>Matched On</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading
            ? messageRow("Searching...")
            : error
              ? messageRow(
                  <>
                    {error}{" "}
                    <button type="button" className="instruction-search-results-button" onClick={onRetry}>
                      Try again
                    </button>
                  </>,
                )
              : sorted.length === 0
                ? messageRow(
                    "No instructions match that container, client ref, booking ref, KSM ref or instruction #",
                  )
                : pageRows.map((result) => {
                    const expanded = expandedKeys.has(result.m1key)
                    const cell = (value) => (
                      <Cell
                        value={value}
                        expanded={expanded}
                        onToggle={() => toggleExpanded(result.m1key)}
                        layoutVersion={layoutVersion}
                      />
                    )
                    return (
                      <tr key={result.m1key} className={expanded ? "expanded" : undefined}>
                        {cell(`Instruction ${result.m1key}`)}
                        {cell(result.companyname)}
                        {cell(result.ksm_file_ref)}
                        {cell(result.client_ref)}
                        {cell(result.booking_ref)}
                        {cell(describeMatch(result))}
                        {cell(result.status)}
                        <td>
                          <div className="instruction-search-results-actions">
                            <button
                              type="button"
                              className="instruction-search-results-button"
                              onClick={() => onOpenInstruction(result)}
                            >
                              Open
                            </button>
                            <button
                              type="button"
                              className="instruction-search-results-button secondary"
                              onClick={() => onOpenClient(result)}
                            >
                              Client list
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
        </tbody>
      </table>

      {!loading && !error && sorted.length > pageSize && (
        <div className={paginationClassName}>
          <Pagination
            totalRecords={sorted.length}
            recordsPerPage={pageSize}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </>
  )
}

export default InstructionSearchResults
