"use client"

import { useRef } from "react"
import { extractFilenameFromUrl } from "../../utils/helpers"

const EmployeeForm = ({ employee, loading, isEditing, onSave, onCancel, onChange, onDeleteDocument }) => {
  const emailRef = useRef(null)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!e.target.checkValidity()) {
      e.target.reportValidity()
      return
    }

    const success = await onSave(employee, emailRef)
    if (!success) {
      // Form validation failed, stay on form
      return
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (file && file.type === "application/pdf" && (employee.documents?.length || 0) < 3) {
      onChange("documents", [...(employee.documents || []), file])
    }
  }

  const removeDocument = (index) => {
    const updatedDocs = [...(employee.documents || [])]
    updatedDocs.splice(index, 1)
    onChange("documents", updatedDocs)
  }

  return (
    <form className="manage-add-employee-form" onSubmit={handleSubmit} noValidate>
      <h3>{isEditing ? "Edit Employee" : "Add New Employee"}</h3>

      <div
        className="manage-form-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "16px",
        }}
      >
        {/* Personal Details */}
        <div className="manage-form-group">
          <label>
            Name <span style={{ color: "red" }}>*</span>
          </label>
          <input type="text" value={employee.name || ""} onChange={(e) => onChange("name", e.target.value)} required />
        </div>

        <div className="manage-form-group">
          <label>
            Surname <span style={{ color: "red" }}>*</span>
          </label>
          <input
            type="text"
            value={employee.surname || ""}
            onChange={(e) => onChange("surname", e.target.value)}
            required
          />
        </div>

        <div className="manage-form-group">
          <label>Telephone Number</label>
          <input
            type="text"
            value={employee.telephonenum || ""}
            onChange={(e) => onChange("telephonenum", e.target.value)}
          />
        </div>

        <div className="manage-form-group">
          <label>Cell Number</label>
          <input
            type="text"
            value={employee.cellnum || ""}
            onChange={(e) => onChange("cellnum", e.target.value)}
            required
          />
        </div>

        <div className="manage-form-group">
          <label>Employee Number</label>
          <input
            type="text"
            value={employee.employeenum || ""}
            onChange={(e) => onChange("employeenum", e.target.value)}
            required
          />
        </div>

        <div className="manage-form-group">
          <label>Base Salary</label>
          <input
            type="number"
            value={employee.base_salary || ""}
            onChange={(e) => onChange("base_salary", e.target.value)}
            required
          />
        </div>

        <div className="manage-form-group">
          <label>
            Email <span style={{ color: "red" }}>*</span>
          </label>
          <input
            ref={emailRef}
            type="email"
            value={employee.email || ""}
            onChange={(e) => {
              emailRef.current?.setCustomValidity("")
              onChange("email", e.target.value)
            }}
            required
          />
        </div>

        <div className="manage-form-group">
          <label>
            Password <span style={{ color: "red" }}>*</span>
          </label>
          <input
            type="password"
            value={employee.password || ""}
            onChange={(e) => onChange("password", e.target.value)}
            required={!isEditing}
          />
        </div>

        <div className="manage-form-group">
          <label>
            <strong>Role</strong>
          </label>
          <select
            className="dropdown"
            value={employee.roleid || ""}
            onChange={(e) => onChange("roleid", Number.parseInt(e.target.value))}
          >
            <option value="">Select Role</option>
            <option value="2">Controller</option>
            <option value="4">Director</option>
            <option value="5">Driver</option>
            <option value="3">Finance Clerk</option>
            <option value="0">Yard Staff</option>
          </select>
        </div>

        {/* Deductions */}
        <div style={{ gridColumn: "1 / span 3" }}>
          <h3 style={{ textAlign: "center", marginTop: "30px" }}>Employee Salary Deductions</h3>
        </div>

        <div className="manage-form-group">
          <label>Income Tax (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={employee.income_tax_rate || ""}
            onChange={(e) => onChange("income_tax_rate", e.target.value)}
          />
        </div>

        <div className="manage-form-group">
          <label>UIF (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={employee.deduction_uif || ""}
            onChange={(e) => onChange("deduction_uif", e.target.value)}
          />
        </div>

        <div className="manage-form-group">
          <label>Loan</label>
          <input
            type="number"
            min="0"
            value={employee.deduction_loan || ""}
            onChange={(e) => onChange("deduction_loan", e.target.value)}
          />
        </div>

        <div className="manage-form-group">
          <label>Bonus</label>
          <input
            type="number"
            min="0"
            value={employee.deduction_bonus || ""}
            onChange={(e) => onChange("deduction_bonus", e.target.value)}
          />
        </div>

        <div className="manage-form-group">
          <label>Savings</label>
          <input
            type="number"
            min="0"
            value={employee.deduction_savings || ""}
            onChange={(e) => onChange("deduction_savings", e.target.value)}
          />
        </div>

        <div className="manage-form-group">
          <label>Damage</label>
          <input
            type="number"
            min="0"
            value={employee.deduction_damage || ""}
            onChange={(e) => onChange("deduction_damage", e.target.value)}
          />
        </div>

        <div className="manage-form-group">
          <label>Other Deductions</label>
          <input
            type="number"
            min="0"
            value={employee.deduction_other_deductions || ""}
            onChange={(e) => onChange("deduction_other_deductions", e.target.value)}
          />
        </div>

        {/* Document Upload */}
        <div className="manage-form-group" style={{ gridColumn: "1 / span 3" }}>
          <label>
            <strong>Upload Documents (PDF Only, Max 3)</strong>
          </label>
          <div
            style={{
              border: "2px dashed #ccc",
              borderRadius: "12px",
              padding: "20px",
              textAlign: "center",
              backgroundColor: "#f9f9f9",
            }}
          >
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              disabled={(employee.documents?.length || 0) >= 3}
            />
            <small>
              {(employee.documents?.length || 0) >= 3
                ? "Maximum of 3 PDF documents uploaded"
                : "Upload PDF documents only"}
            </small>
          </div>

          {/* Document Lists */}
          <div style={{ marginTop: "15px" }}>
            {isEditing && employee.existingDocuments?.length > 0 && (
              <>
                <h4>Previously Uploaded Documents</h4>
                {employee.existingDocuments.map((url, index) => (
                  <div
                    key={`existing-${index}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <span style={{ flexGrow: 1 }}>{extractFilenameFromUrl(url)}</span>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        marginRight: "10px",
                        backgroundColor: "#4CAF50",
                        color: "white",
                        padding: "6px 12px",
                        borderRadius: "4px",
                        textDecoration: "none",
                        fontSize: "0.85rem",
                      }}
                    >
                      View
                    </a>
                    <button
                      type="button"
                      onClick={() => onDeleteDocument("employee", employee.userid, url)}
                      style={{
                        backgroundColor: "#f44336",
                        color: "white",
                        border: "none",
                        padding: "6px 12px",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </>
            )}

            {employee.documents?.length > 0 && (
              <>
                <h4>Newly Uploaded Documents</h4>
                {employee.documents.map((doc, index) => (
                  <div
                    key={`new-${index}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <span style={{ flexGrow: 1 }}>{doc.name}</span>
                    <a
                      href={URL.createObjectURL(doc)}
                      download={doc.name}
                      style={{
                        marginRight: "10px",
                        backgroundColor: "#4CAF50",
                        color: "white",
                        padding: "6px 12px",
                        borderRadius: "4px",
                        textDecoration: "none",
                        fontSize: "0.85rem",
                      }}
                    >
                      Download
                    </a>
                    <button
                      type="button"
                      onClick={() => removeDocument(index)}
                      style={{
                        backgroundColor: "#f44336",
                        color: "white",
                        border: "none",
                        padding: "6px 12px",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div
        className="manage-button-container"
        style={{
          marginTop: "30px",
          display: "flex",
          gap: "16px",
          justifyContent: "center",
        }}
      >
        <button type="submit" className="manage-save-button" disabled={loading}>
          {loading ? "Saving..." : "Confirm Employee Register"}
        </button>
        <button type="button" onClick={onCancel} className="manage-cancel-button">
          Cancel
        </button>
      </div>
    </form>
  )
}

export default EmployeeForm
