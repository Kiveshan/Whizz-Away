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
    },
  ])

  // Initialize rates when clientData changes
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
          })),
        )
      } else {
        // Start with one empty rate
        setRates([
          {
            starting_point: "",
            destination: "",
            "6m_rate": "",
            "12m_rate": "",
            surcharges: "",
          },
        ])
      }
    }
  }, [clientData])

  // Show loading state
  if (loading) {
    return <div className="loading">Loading client rates...</div>
  }

  // Show error if no client data
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

    // Validate that we have at least one complete rate
    const validRates = rates.filter(
      (rate) => rate.starting_point.trim() && rate.destination.trim() && (rate["6m_rate"] || rate["12m_rate"]),
    )

    if (validRates.length === 0) {
      alert("Please provide at least one complete rate with starting point, destination, and either 6m or 12m rate.")
      return
    }

    const success = await onSave(validRates)
    if (success) {
      // Form will be closed by parent component
    }
  }

  return (
    <form className="manage-add-client-form" onSubmit={handleSubmit} noValidate>
      <div className="client-rates-header">
        <h2>Manage Rates for {clientData.client}</h2>
        <div className="client-info">
          <p>
            <strong>Representative:</strong> {clientData.representative}
          </p>
          <p>
            <strong>Email:</strong> {clientData.email}
          </p>
        </div>
      </div>

      <div className="rates-section">
        <div className="rates-header">
          <h3>Client Rates</h3>
          <button type="button" onClick={addRate} className="add-rate-button">
            + Add Another Rate
          </button>
        </div>

        {rates.map((rate, index) => (
          <div key={index} className="rate-entry">
            <div className="rate-entry-header">
              <h4>Rate #{index + 1}</h4>
              {rates.length > 1 && (
                <button type="button" onClick={() => removeRate(index)} className="remove-rate-button">
                  Remove
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
                  onChange={(e) => handleRateChange(index, "starting_point", e.target.value)}
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
                  onChange={(e) => handleRateChange(index, "destination", e.target.value)}
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
                  onChange={(e) => handleRateChange(index, "6m_rate", e.target.value)}
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
                  onChange={(e) => handleRateChange(index, "12m_rate", e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="manage-form-group">
                <label>
                  <strong>Surcharges (R) - Optional</strong>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={rate.surcharges}
                  onChange={(e) => handleRateChange(index, "surcharges", e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        ))}

        <div className="rates-summary">
          <p>
            <strong>Total Rates:</strong>{" "}
            {
              rates.filter(
                (rate) =>
                  rate.starting_point.trim() && rate.destination.trim() && (rate["6m_rate"] || rate["12m_rate"]),
              ).length
            }
          </p>
          <p className="rates-note">* At least one rate (6m or 12m) is required for each route</p>
        </div>
      </div>

      <div className="manage-button-container">
        <button type="submit" className="manage-save-button" disabled={loading}>
          {loading ? "Saving..." : "Save All Rates"}
        </button>
        <button type="button" onClick={onCancel} className="manage-cancel-button">
          Cancel
        </button>
      </div>
    </form>
  )
}

export default ClientRatesForm
