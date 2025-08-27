"use client"

import { useState, useEffect } from "react"

const ClientRatesForm = ({ clientData, loading, onSave, onCancel }) => {
  const [rates, setRates] = useState([
    {
      starting_point: "",
      destination: "",
      "6m_rate": "",
      "12m_rate": "",
      surcharges: "",
      hazardous: "",
    },
  ])
  const [isFormValid, setIsFormValid] = useState(false)

  useEffect(() => {
    console.log("ClientRatesForm received clientData:", clientData)
    if (clientData) {
      if (clientData.rates && clientData.rates.length > 0) {
        setRates(
          clientData.rates.map((rate) => ({
            client_rate_id: rate.client_rate_id,
            starting_point: rate.starting_point || "",
            destination: rate.destination || "",
            "6m_rate": rate["6m_rate"] || "",
            "12m_rate": rate["12m_rate"] || "",
            surcharges: rate.surcharges || "",
            hazardous: rate.hazardous || "",
          })),
        )
      } else {
        setRates([
          {
            starting_point: "",
            destination: "",
            "6m_rate": "",
            "12m_rate": "",
            surcharges: "",
            hazardous: "",
          },
        ])
      }
    }
  }, [clientData])

  useEffect(() => {
    // Validate that each rate has starting_point, destination, and at least one of 6m_rate or 12m_rate
    const isValid = rates.every(
      (rate) =>
        rate.starting_point.trim() &&
        rate.destination.trim() &&
        (rate["6m_rate"].toString().trim() || rate["12m_rate"].toString().trim()),
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
        surcharges: "",
        hazardous: "",
      },
    ])
  }

  const removeRate = (index) => {
    if (rates.length > 1) {
      const updatedRates = rates.filter((_, i) => i !== index)
      setRates(updatedRates)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isFormValid) {
      alert("Please provide at least one complete rate with starting point, destination, and either 6m or 12m rate for each route.")
      return
    }
    const success = await onSave(rates) // Send all rates since they're validated
    if (success) {
      // Form will be closed by parent component
    }
  }

  // Group rates into chunks of 5 for rendering rows
  const rateRows = []
  for (let i = 0; i < rates.length; i += 5) {
    rateRows.push(rates.slice(i, i + 5))
  }

  return (
    <form className="manage-add-client-form" onSubmit={handleSubmit} noValidate>
      <div className="rates-section">
        <div className="rates-header">
          <h3>Client Rates</h3>
        </div>

        {rateRows.map((row, rowIndex) => (
          <div key={rowIndex} className="rate-row">
            {row.map((rate, index) => (
              <div key={rowIndex * 5 + index} className="rate-entry">
                <div className="rate-entry-header">
                  <h4>Rate #{rowIndex * 5 + index + 1}</h4>
                  {rates.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRate(rowIndex * 5 + index)}
                      className="remove-rate-button"
                      aria-label="Remove rate"
                    >
                      🗑️
                    </button>
                  )}
                </div>

                <div className="manage-form-grid">
                  <div className="manage-form-group">
                    <label>
                      <strong>Starting Point *</strong>
                    </label>
                    <input
                      type="text"
                      value={rate.starting_point}
                      onChange={(e) => handleRateChange(rowIndex * 5 + index, "starting_point", e.target.value)}
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
                      onChange={(e) => handleRateChange(rowIndex * 5 + index, "destination", e.target.value)}
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
                      onChange={(e) => handleRateChange(rowIndex * 5 + index, "6m_rate", e.target.value)}
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
                      onChange={(e) => handleRateChange(rowIndex * 5 + index, "12m_rate", e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="manage-form-group">
                    <label>
                      <strong>Surcharges (R)</strong>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={rate.surcharges}
                      onChange={(e) => handleRateChange(rowIndex * 5 + index, "surcharges", e.target.value)}
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
                      onChange={(e) => handleRateChange(rowIndex * 5 + index, "hazardous", e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}

        <div className="rates-summary">
          <p>
            <strong>Total Rates:</strong>{" "}
            {
              rates.filter(
                (rate) =>
                  rate.starting_point.trim() &&
                  rate.destination.trim() &&
                  (rate["6m_rate"].toString().trim() || rate["12m_rate"].toString().trim()),
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
  )
}

export default ClientRatesForm