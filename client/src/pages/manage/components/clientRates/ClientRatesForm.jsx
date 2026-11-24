"use client"

import { useState, useEffect } from "react"
import { FaTrash } from "react-icons/fa";

// Scroll a card (or the duplicates summary) into view and flash it.
const revealElement = (id) => {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: "smooth", block: "center" })
  el.classList.remove("rate-entry-flash")
  void el.offsetWidth // restart the flash animation
  el.classList.add("rate-entry-flash")
}

const ClientRatesForm = ({ clientData, loading, onSave, onCancel }) => {
  const [rates, setRates] = useState([
    {
      starting_point: "",
      destination: "",
      "6m_rate": "",
      "12m_rate": "",
      surcharge6M: "",
      surcharge12m: "",
      hazardous: "",
      vgm: "",
      set_rate: "",
      fuel_surcharge: "",
    },
  ])
  const [isFormValid, setIsFormValid] = useState(false)
  const [fuelSurchargeAll, setFuelSurchargeAll] = useState("")
  const [routeSearch, setRouteSearch] = useState("")
  // Element id to scroll to after the next render (used when a jump link
  // targets a card that the search filter is currently hiding).
  const [pendingScrollId, setPendingScrollId] = useState(null)

  useEffect(() => {
    if (!pendingScrollId) return
    revealElement(pendingScrollId)
    setPendingScrollId(null)
  }, [pendingScrollId, routeSearch])

  useEffect(() => {
    console.log("ClientRatesForm received clientData:", clientData)
    if (clientData) {
      if (clientData.rates && clientData.rates.length > 0) {
        // Sort A–Z by starting point, then destination, so related routes (and
        // duplicates) sit next to each other. Only done on load: re-sorting while
        // someone is typing would move the card out from under them.
        const sortKey = (s) => (s || "").trim().replace(/\s+/g, " ").toLowerCase()
        const sorted = [...clientData.rates].sort(
          (a, b) =>
            sortKey(a.starting_point).localeCompare(sortKey(b.starting_point)) ||
            sortKey(a.destination).localeCompare(sortKey(b.destination)) ||
            (a.client_rate_id || 0) - (b.client_rate_id || 0),
        )
        setRates(
          sorted.map((rate) => ({
            client_rate_id: rate.client_rate_id,
            starting_point: rate.starting_point || "",
            destination: rate.destination || "",
            "6m_rate": rate["6m_rate"] !== null && rate["6m_rate"] !== undefined ? rate["6m_rate"] : "",
            "12m_rate": rate["12m_rate"] !== null && rate["12m_rate"] !== undefined ? rate["12m_rate"] : "",
            surcharge6M:
              rate.surcharge6M !== null && rate.surcharge6M !== undefined
                ? rate.surcharge6M
                : rate.surcharges !== null && rate.surcharges !== undefined
                  ? rate.surcharges
                  : "",
            surcharge12m: rate.surcharge12m !== null && rate.surcharge12m !== undefined ? rate.surcharge12m : "",
            hazardous: rate.hazardous !== null && rate.hazardous !== undefined ? rate.hazardous : "",
            vgm: rate.vgm !== null && rate.vgm !== undefined ? rate.vgm : "",
            set_rate: rate.set_rate !== null && rate.set_rate !== undefined ? rate.set_rate : "",
            fuel_surcharge:
              rate.fuel_surcharge !== null && rate.fuel_surcharge !== undefined ? rate.fuel_surcharge : "",
          })),
        )

      } else {
        setRates([
          {
            starting_point: "",
            destination: "",
            "6m_rate": "",
            "12m_rate": "",
            surcharge6M: "",
            surcharge12m: "",
            hazardous: "",
            vgm: "",
            set_rate: "",
            fuel_surcharge: "",
          },
        ])
      }
    }
  }, [clientData])

  useEffect(() => {
    const isValid = rates.every(
      (rate) =>
        rate.starting_point.trim() &&
        rate.destination.trim() &&
        (rate["6m_rate"] !== "" && rate["6m_rate"] !== undefined || rate["12m_rate"] !== "" && rate["12m_rate"] !== undefined),
    )
    setIsFormValid(isValid)
  }, [rates])

  if (loading) {
    return <div className="loading">Loading client rates...</div>
  }

  if (!clientData) {
    return <div className="error">Error: No client data available</div>
  }

  const handleRateChange = (index, field, value) => {
    const updatedRates = [...rates]
    updatedRates[index] = {
      ...updatedRates[index],
      [field]: value,
    }
    setRates(updatedRates)
  }

  const addRate = () => {
    setRates([
      ...rates,
      {
        starting_point: "",
        destination: "",
        "6m_rate": "",
        "12m_rate": "",
        surcharge6M: "",
        surcharge12m: "",
        hazardous: "",
        vgm: "",
        set_rate: "",
        fuel_surcharge: "",
      },
    ])
  }

  // Apply a single fuel surcharge percentage to every rate at once.
  const applyFuelSurchargeToAll = (value) => {
    setRates((prev) => prev.map((rate) => ({ ...rate, fuel_surcharge: value })))
  }

  const removeRate = (index) => {
    if (rates.length > 1) {
      const updatedRates = rates.filter((rate, i) => i !== index)
      console.log("Current rates before removing:", rates)
      console.log("Updated rates after removing:", updatedRates)
      setRates(updatedRates)
    }
  }

  // Duplicate routes: two cards whose starting point + destination are the
  // same once spacing and case are ignored (same rule as the server's save
  // check). The server refuses such a save, so flag the cards here where the
  // user can see and fix them instead of hunting through every card.
  const routeKey = (rate) => {
    const norm = (s) => (s || "").trim().replace(/\s+/g, " ").toLowerCase()
    const sp = norm(rate.starting_point)
    const dest = norm(rate.destination)
    return sp && dest ? `${sp}\u0000${dest}` : null
  }
  const indicesByRoute = new Map()
  rates.forEach((rate, i) => {
    const key = routeKey(rate)
    if (!key) return
    if (!indicesByRoute.has(key)) indicesByRoute.set(key, [])
    indicesByRoute.get(key).push(i)
  })
  const duplicateGroups = [...indicesByRoute.values()].filter((group) => group.length > 1)
  const duplicatesOf = new Map()
  duplicateGroups.forEach((group) => group.forEach((i) => duplicatesOf.set(i, group.filter((j) => j !== i))))

  const scrollToElement = (id) => {
    // The target card may be hidden by the search filter: clear it and let the
    // effect above scroll once the full list has rendered.
    if (!document.getElementById(id) && routeSearch) {
      setRouteSearch("")
      setPendingScrollId(id)
    } else {
      revealElement(id)
    }
  }

  // Search: keep every card's real index (used for ids, delete and edits) and
  // just hide the ones that don't match.
  const searchTerm = routeSearch.trim().replace(/\s+/g, " ").toLowerCase()
  const visibleIndices = rates
    .map((rate, i) => i)
    .filter((i) => {
      if (!searchTerm) return true
      const rate = rates[i]
      const text = `${rate.starting_point} ${rate.destination}`.replace(/\s+/g, " ").toLowerCase()
      // Never hide a card that is still being filled in.
      return !rate.starting_point.trim() || text.includes(searchTerm)
    })

  const routeTitle = (rate) => {
    const sp = rate.starting_point.trim().replace(/\s+/g, " ")
    const dest = rate.destination.trim().replace(/\s+/g, " ")
    if (!sp && !dest) return "New route"
    return `${sp || "?"} → ${dest || "?"}`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isFormValid) {
      alert("Please provide at least one complete rate with starting point, destination, and either 6m or 12m rate for each route.")
      return
    }
    if (duplicateGroups.length > 0) {
      scrollToElement("rate-duplicates-summary")
      return
    }
    const success = await onSave(rates)
    if (success) {
      // Form will be closed by parent component
    }
  }

  return (
    <>
      <style jsx>{`
        .remove-rate-button {
          color: red;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1.2rem;
        }
        .remove-rate-button:hover {
          color: darkred;
        }
        .rate-entry-header {
          align-items: flex-start;
          gap: 8px;
        }
        .rate-entry-title {
          margin: 0;
          font-size: 0.95rem;
          font-weight: 600;
          color: #1f2937;
          line-height: 1.3;
          overflow-wrap: anywhere;
        }
        .rate-entry-number {
          display: inline-block;
          margin-right: 6px;
          padding: 0 6px;
          border-radius: 4px;
          background: #e5e7eb;
          color: #4b5563;
          font-size: 0.75rem;
          font-weight: 500;
          vertical-align: 1px;
        }
        .rate-search {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0 0 1rem;
        }
        .rate-search input {
          flex: 1;
          max-width: 420px;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.95rem;
        }
        .rate-search-count {
          color: #4b5563;
          font-size: 0.9rem;
        }
        .rate-search-clear {
          background: none;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 6px 10px;
          cursor: pointer;
        }
        .rate-search-empty {
          color: #4b5563;
          font-style: italic;
        }
        .rate-entry.rate-entry-duplicate {
          border: 2px solid #d93025;
          background: #fdecea;
        }
        .rate-duplicate-note {
          color: #b3261e;
          font-size: 0.85rem;
          font-weight: 600;
          margin: 0 0 0.5rem;
        }
        .rate-duplicates-summary {
          border: 2px solid #d93025;
          background: #fdecea;
          color: #5f2120;
          border-radius: 8px;
          padding: 0.75rem 1rem;
          margin: 0 0 1rem;
        }
        .rate-duplicates-summary ul {
          margin: 0.5rem 0 0;
          padding-left: 1.25rem;
        }
        .rate-duplicates-summary li {
          margin: 0.25rem 0;
        }
        .rate-jump-link {
          background: none;
          border: none;
          padding: 0 0.15rem;
          color: #b3261e;
          font-weight: 700;
          text-decoration: underline;
          cursor: pointer;
          font-size: inherit;
        }
        .rate-entry-flash {
          animation: rate-entry-flash 1.2s ease-out;
        }
        @keyframes rate-entry-flash {
          0% { box-shadow: 0 0 0 6px rgba(217, 48, 37, 0.6); }
          100% { box-shadow: 0 0 0 0 rgba(217, 48, 37, 0); }
        }
      `}</style>
      <form className="manage-add-client-rate-form" onSubmit={handleSubmit} noValidate>
        <div className="rates-section">
          <div className="rates-header">
            <h3>Client Rates</h3>
            <div className="fuel-surcharge-all">
              <label>
                <strong>Fuel Surcharge (%)</strong>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={fuelSurchargeAll}
                onChange={(e) => setFuelSurchargeAll(e.target.value)}
                placeholder="e.g., 10"
              />
              <button
                type="button"
                className="fuel-surcharge-apply-btn"
                onClick={() => applyFuelSurchargeToAll(fuelSurchargeAll)}
              >
                Apply to all rates
              </button>
            </div>
          </div>

          <div className="rate-search">
            <input
              type="search"
              value={routeSearch}
              onChange={(e) => setRouteSearch(e.target.value)}
              placeholder="Search routes, e.g. PLP or Paisley"
              aria-label="Search routes"
            />
            {searchTerm && (
              <>
                <span className="rate-search-count">
                  Showing {visibleIndices.length} of {rates.length}
                </span>
                <button type="button" className="rate-search-clear" onClick={() => setRouteSearch("")}>
                  Clear
                </button>
              </>
            )}
          </div>

          {duplicateGroups.length > 0 && (
            <div id="rate-duplicates-summary" className="rate-duplicates-summary" role="alert">
              <strong>
                {duplicateGroups.length === 1
                  ? "1 route is listed more than once."
                  : `${duplicateGroups.length} routes are listed more than once.`}
              </strong>{" "}
              Keep one card per route (edit it if the price changed) and delete the others before saving. The duplicate
              cards are outlined in red.
              <ul>
                {duplicateGroups.map((group) => (
                  <li key={group.join("-")}>
                    {rates[group[0]].starting_point.trim()} → {rates[group[0]].destination.trim()}:{" "}
                    {group.map((i, n) => (
                      <span key={i}>
                        {n > 0 && ", "}
                        <button type="button" className="rate-jump-link" onClick={() => scrollToElement(`rate-entry-${i}`)}>
                          Rate #{i + 1}
                        </button>
                      </span>
                    ))}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {visibleIndices.length === 0 && (
            <p className="rate-search-empty">No routes match "{routeSearch.trim()}".</p>
          )}

          <div className="rate-row">
            {visibleIndices.map((i) => {
              const rate = rates[i]
              return (
                <div
                  key={i}
                  id={`rate-entry-${i}`}
                  className={`rate-entry${duplicatesOf.has(i) ? " rate-entry-duplicate" : ""}`}
                >
                  <div className="rate-entry-header">
                    <h4 className="rate-entry-title" title={routeTitle(rate)}>
                      <span className="rate-entry-number">#{i + 1}</span>
                      {routeTitle(rate)}
                    </h4>
                    {rates.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRate(i)}
                        className="remove-rate-button"
                        aria-label="Remove rate"
                      >
                         <FaTrash />
                      </button>
                    )}
                  </div>

                  {duplicatesOf.has(i) && (
                    <p className="rate-duplicate-note">
                      Same route as{" "}
                      {duplicatesOf.get(i).map((j, n) => (
                        <span key={j}>
                          {n > 0 && ", "}
                          <button type="button" className="rate-jump-link" onClick={() => scrollToElement(`rate-entry-${j}`)}>
                            Rate #{j + 1}
                          </button>
                        </span>
                      ))}
                    </p>
                  )}

                  <div className="manage-form-grid">
                    <div className="manage-form-group">
                      <label>
                        <strong>Starting Point *</strong>
                      </label>
                      <input
                        type="text"
                        value={rate.starting_point}
                        onChange={(e) => handleRateChange(i, "starting_point", e.target.value)}
                        placeholder="e.g., Johannesburg"
                        required
                      />
                    </div>

                    <div className="manage-form-group">
                      <label>
                        <strong>Destination *</strong>
                      </label>
                      <input
                        type="text"
                        value={rate.destination}
                        onChange={(e) => handleRateChange(i, "destination", e.target.value)}
                        placeholder="e.g., Cape Town"
                        required
                      />
                    </div>

                    <div className="manage-form-group">
                      <label>
                        <strong>6m Rate (R)</strong>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={rate["6m_rate"]}
                        onChange={(e) => handleRateChange(i, "6m_rate", e.target.value)}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="manage-form-group">
                      <label>
                        <strong>12m Rate (R)</strong>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={rate["12m_rate"]}
                        onChange={(e) => handleRateChange(i, "12m_rate", e.target.value)}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="manage-form-group">
                      <label>
                        <strong>Surcharge 6M (R)</strong>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={rate.surcharge6M}
                        onChange={(e) => handleRateChange(i, "surcharge6M", e.target.value)}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="manage-form-group">
                      <label>
                        <strong>Surcharge 12M (R)</strong>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={rate.surcharge12m}
                        onChange={(e) => handleRateChange(i, "surcharge12m", e.target.value)}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="manage-form-group">
                      <label>
                        <strong>Hazardous (R)</strong>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={rate.hazardous}
                        onChange={(e) => handleRateChange(i, "hazardous", e.target.value)}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="manage-form-group">
                      <label>
                        <strong>VGM (R)</strong>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={rate.vgm}
                        onChange={(e) => handleRateChange(i, "vgm", e.target.value)}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="manage-form-group">
                      <label>
                        <strong>Break Bulk (R)</strong>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={rate.set_rate}
                        onChange={(e) => handleRateChange(i, "set_rate", e.target.value)}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="manage-form-group">
                      <label>
                        <strong>Fuel Surcharge (%)</strong>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={rate.fuel_surcharge}
                        onChange={(e) => handleRateChange(i, "fuel_surcharge", e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="rates-summary">
            <p>
              <strong>Total Rates:</strong>{" "}
              {
                rates.filter(
                  (rate) =>
                    rate.starting_point.trim() &&
                    rate.destination.trim() &&
                    (rate["6m_rate"] !== "" && rate["6m_rate"] !== undefined || rate["12m_rate"] !== "" && rate["12m_rate"] !== undefined),
                ).length
              }
            </p>
            <p className="rates-note">* At least one rate (6m or 12m) is required for each route</p>
          </div>
        </div>

        <div className="manage-button-container">
          <button type="submit" className="manage-save-button" disabled={loading || !isFormValid}>
            {loading ? "Saving..." : "Save"}
          </button>
          
          <button type="button" onClick={addRate} className="add-rate-button">
            + Add
          </button>
        </div>
      </form>
    </>
  )
}

export default ClientRatesForm