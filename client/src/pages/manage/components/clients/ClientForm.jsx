"use client"

import { useRef } from "react"

const ClientForm = ({ client, loading, isEditing, onSave, onCancel, onChange }) => {
  const emailRef = useRef(null)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!e.target.checkValidity()) {
      e.target.reportValidity()
      return
    }

    console.log("Client form data before save:", client)

    const success = await onSave(client, emailRef)
    if (!success) {
      return
    }
  }

  const handleNumberChange = (field, value) => {
    if (value === "" || (!isNaN(value) && Number.parseFloat(value) >= 0)) {
      onChange(field, value)
    }
  }

  return (
    <form className="client-form" onSubmit={handleSubmit} noValidate>
      <h2>{isEditing ? "Edit Client" : "Add New Client"}</h2>

      <div className="client-form-grid">
        <div className="client-form-group">
          <label>
            <strong>Company Name</strong>
          </label>
          <input
            type="text"
            value={client.client || ""}
            onChange={(e) => onChange("client", e.target.value)}
            required
          />
        </div>

        <div className="client-form-group">
          <label>
            <strong>Representative Name</strong>
          </label>
          <input
            type="text"
            value={client.representative || ""}
            onChange={(e) => onChange("representative", e.target.value)}
            required
          />
        </div>

        <div className="client-form-group">
          <label>
            <strong>Cell Number</strong>
          </label>
          <input
            type="text"
            value={client.cellnum || ""}
            onChange={(e) => onChange("cellnum", e.target.value)}
            required
          />
        </div>

        <div className="client-form-group">
          <label>
            <strong>Email Address</strong>
          </label>
          <input
            ref={emailRef}
            type="email"
            value={client.email || ""}
            onChange={(e) => {
              emailRef.current?.setCustomValidity("")
              onChange("email", e.target.value)
            }}
            required
          />
        </div>

        <div className="client-form-group">
          <label>
            <strong>Street Address</strong>
          </label>
          <input
            type="text"
            value={client.streetaddress || ""}
            onChange={(e) => onChange("streetaddress", e.target.value)}
            required
          />
        </div>

        <div className="client-form-group">
          <label>
            <strong>City</strong>
          </label>
          <input type="text" value={client.city || ""} onChange={(e) => onChange("city", e.target.value)} required />
        </div>

        <div className="client-form-group">
          <label>
            <strong>Suburb</strong>
          </label>
          <input
            type="text"
            value={client.suburb || ""}
            onChange={(e) => onChange("suburb", e.target.value)}
            required
          />
        </div>

        <div className="client-form-group">
          <label>
            <strong>Postal Code</strong>
          </label>
          <input
            type="text"
            value={client.postalcode || ""}
            onChange={(e) => onChange("postalcode", e.target.value)}
            required
          />
        </div>

        <div className="client-form-group">
          <label>
            <strong>Company Address</strong>
          </label>
          <input
            type="text"
            value={client.companyaddress || ""}
            onChange={(e) => onChange("companyaddress", e.target.value)}
            required
          />
        </div>

        <div className="client-form-group">
          <label>
            <strong>Client Reg. Number</strong>
          </label>
          <input
            type="text"
            value={client.client_reg_num || ""}
            onChange={(e) => onChange("client_reg_num", e.target.value)}
            required
          />
        </div>

        <div className="client-form-group">
          <label>
            <strong>VAT Reg. Number</strong>
          </label>
          <input
            type="text"
            value={client.vatregno || ""}
            onChange={(e) => onChange("vatregno", e.target.value)}
            required
          />
        </div>

        <div className="client-form-group">
          <label>
            <strong>Payment Type</strong>
          </label>
          <select className="client-dropdown" value={client.payment_type || ""} onChange={(e) => onChange("payment_type", e.target.value)} required>
            <option value="">Select Payment Type</option>
            <option value="Cash">Cash</option>
            <option value="Credit">Credit</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Cheque">Cheque</option>
          </select>
        </div>
      </div>

      <div className="client-button-container">
        <button type="submit" className="client-save-button" disabled={loading}>
          {loading ? "Saving..." : "Save Client"}
        </button>
        <button type="button" onClick={onCancel} className="client-cancel-button">
          Cancel
        </button>
      </div>
    </form>
  )
}

export default ClientForm