"use client"

import { useRef, useState } from "react"
import { extractFilenameFromUrl } from "../../utils/helpers"

const EmployeeForm = ({ employee, loading, isEditing, onSave, onCancel, onChange, onDeleteDocument }) => {
  const emailRef = useRef(null)
  const [alert, setAlert] = useState({ show: false, message: "" })

  // Validate required fields on submit
  const validateForm = () => {
    let isValid = true
    const requiredFields = ['name', 'surname', 'roleid', 'cellnum']
    requiredFields.forEach(field => {
      if (!employee[field]) {
        isValid = false
      }
    })
    return isValid
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) {
      e.target.reportValidity()
      return
    }
    const success = await onSave(employee, emailRef)
    if (!success) {
      return
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    const maxSizeInBytes = 5 * 1024 * 1024 // 5MB in bytes

    if (file) {
      if (file.type !== "application/pdf") {
        setAlert({ show: true, message: "Only PDF files are allowed." })
        return
      }
      if (file.size > maxSizeInBytes) {
        setAlert({ show: true, message: "File size exceeds the 5MB limit." })
        return
      }
      if ((employee.documents?.length || 0) >= 3) {
        setAlert({ show: true, message: "Maximum of 3 documents allowed." })
        return
      }
      setAlert({ show: false, message: "" }) // Clear alert on success
      onChange("documents", [...(employee.documents || []), file])
    }
  }

  const removeDocument = (index) => {
    const updatedDocs = [...(employee.documents || [])]
    updatedDocs.splice(index, 1)
    onChange("documents", updatedDocs)
  }

  const closeAlert = () => {
    setAlert({ show: false, message: "" })
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
          <input
            type="text"
            value={employee.name || ""}
            onChange={(e) => onChange("name", e.target.value)}
            required
          />
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
          <label>
            Telephone Number
          </label>
          <input
            type="text"
            value={employee.telephonenum || ""}
            onChange={(e) => onChange("telephonenum", e.target.value)}
            placeholder="e.g., 1234567890 or +1234567890"
          />
        </div>

        <div className="manage-form-group">
          <label>
            Cell Number <span style={{ color: "red" }}>*</span>
          </label>
          <input
            type="text"
            value={employee.cellnum || ""}
            onChange={(e) => onChange("cellnum", e.target.value)}
            placeholder="e.g., 1234567890 or +1234567890"
            required
          />
        </div>

        <div className="manage-form-group">
          <label>
            Employee Number
          </label>
          <input
            type="text"
            value={employee.erializationnum || ""}
            onChange={(e) => onChange("employeenum", e.target.value)}
          />
        </div>

        <div className="manage-form-group">
          <label>
            Base Salary
          </label>
          <input
            type="number"
            value={employee.base_salary || ""}
            onChange={(e) => onChange("base_salary", e.target.value)}
          />
        </div>

        <div className="manage-form-group">
          <label>
            Email
          </label>
          <input
            ref={emailRef}
            type="email"
            value={employee.email || ""}
            onChange={(e) => {
              emailRef.current?.setCustomValidity("")
              onChange("email", e.target.value)
            }}
          />
        </div>

        <div className="manage-form-group">
          <label>
            Password
          </label>
          <input
            type="password"
            value={employee.password || ""}
            onChange={(e) => onChange("password", e.target.value)}
          />
        </div>

        <div className="manage-form-group">
          <label htmlFor="roleid">
            Role <span style={{ color: "red" }}>*</span>
          </label>
          <select
            id="roleid"
            className="dropdown"
            value={employee.roleid || ""}
            onChange={(e) => onChange("roleid", Number.parseInt(e.target.value))}
            required
          >
            <option value="" disabled>Select Role</option>
            <option value="2">Controller</option>
            <option value="4">Director</option>
            <option value="5">Driver</option>
            <option value="3">Debtors Clerk</option>
            <option value="8">Creditors Clerk</option>
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
         {/* Alert Component */}
      {alert.show && (
        <div className="alert-box">
          <span>{alert.message}</span>
          <button
            type="button"
            className="alert-close"
            onClick={closeAlert}
            aria-label="Close alert"
          >
            &times;
          </button>
        </div>
      )}
        <div className="manage-form-group" style={{ gridColumn: "1 / span 3" }}>
          <label>
            <strong>Upload Documents (PDF Only, Max 3, 5MB each)</strong>
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
                : "Upload PDF documents only (max 5MB each)"}
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
                      Download
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