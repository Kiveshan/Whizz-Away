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

    const success = await onSave(client, emailRef)
    if (!success) {
      return
    }
  }

  return (
    <form className="manage-add-client-form" onSubmit={handleSubmit} noValidate>
      <h2>{isEditing ? "Edit Client" : "Add New Client"}</h2>

      <div className="manage-form-grid">
        <div className="manage-form-group">
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

        <div className="manage-form-group">
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

        <div className="manage-form-group">
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

        <div className="manage-form-group">
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

        <div className="manage-form-group">
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

        <div className="manage-form-group">
          <label>
            <strong>City</strong>
          </label>
          <input type="text" value={client.city || ""} onChange={(e) => onChange("city", e.target.value)} required />
        </div>

        <div className="manage-form-group">
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

        <div className="manage-form-group">
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

        <div className="manage-form-group">
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

        <div className="manage-form-group">
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

        <div className="manage-form-group">
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
      </div>

      <div className="manage-button-container">
        <button type="submit" className="manage-save-button" disabled={loading}>
          {loading ? "Saving..." : "Save Client"}
        </button>
        <button type="button" onClick={onCancel} className="manage-cancel-button">
          Cancel
        </button>
      </div>
    </form>
  )
}

export default ClientForm
