"use client"
import { extractFilenameFromUrl } from "../../utils/helpers"

const TrailerForm = ({ trailer, loading, isEditing, onSave, onCancel, onChange, onDeleteDocument }) => {
  // Debug logging
  console.log("TrailerForm props:", {
    trailer: !!trailer,
    loading,
    isEditing,
    onSave: typeof onSave,
    onCancel: typeof onCancel,
    onChange: typeof onChange,
    onDeleteDocument: typeof onDeleteDocument,
  })

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!e.target.checkValidity()) {
      e.target.reportValidity()
      return
    }

    console.log("About to call onSave with:", trailer)
    console.log("onSave type:", typeof onSave)

    if (typeof onSave !== "function") {
      console.error("onSave is not a function! Received:", onSave)
      return
    }

    const success = await onSave(trailer)
    if (!success) {
      return
    }
  }

  const handleFileUpload = (e) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const newFiles = Array.from(files).filter(
        (file) => file.type === "application/pdf" && (trailer.documents?.length || 0) < 3,
      )

      if (newFiles.length > 0) {
        const currentDocs = trailer.documents || []
        const totalDocs = currentDocs.length + newFiles.length

        if (totalDocs <= 3) {
          onChange("documents", [...currentDocs, ...newFiles])
        } else {
          const allowedFiles = newFiles.slice(0, 3 - currentDocs.length)
          onChange("documents", [...currentDocs, ...allowedFiles])
          alert(`Only ${allowedFiles.length} files were added to stay within the 3-file limit.`)
        }
      }
    }
    // Clear the input so the same file can be selected again if needed
    e.target.value = ""
  }

  const removeDocument = (index) => {
    const updatedDocs = [...(trailer.documents || [])]
    updatedDocs.splice(index, 1)
    onChange("documents", updatedDocs)
  }

  // Helper function to check if license is expiring soon
  const isLicenseExpiringSoon = (expiryDate) => {
    if (!expiryDate) return false
    const today = new Date()
    const expiry = new Date(expiryDate)
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0
  }

  const isLicenseExpired = (expiryDate) => {
    if (!expiryDate) return false
    const today = new Date()
    const expiry = new Date(expiryDate)
    return expiry < today
  }

  return (
    <div className="manage-add-truck-form">
      <h2>{isEditing ? "Edit Trailer" : "Add New Trailer"}</h2>

      <form onSubmit={handleSubmit} noValidate>
        <div className="manage-truck-form-grid">
          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>Trailer Registration</label>
            <input
              type="text"
              value={trailer.trailerregnum || ""}
              onChange={(e) => onChange("trailerregnum", e.target.value)}
              required
            />
          </div>

          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>Trailer Size</label>
            <input
              type="text"
              value={trailer.trailersize || ""}
              onChange={(e) => onChange("trailersize", e.target.value)}
              required
            />
          </div>

          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>Year</label>
            <input type="text" value={trailer.year || ""} onChange={(e) => onChange("year", e.target.value)} required />
          </div>

          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>Model</label>
            <input
              type="text"
              value={trailer.model || ""}
              onChange={(e) => onChange("model", e.target.value)}
              required
            />
          </div>

          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>Purchase Price</label>
            <input
              type="text"
              value={trailer.purchase_price || ""}
              onChange={(e) => onChange("purchase_price", e.target.value)}
              required
            />
          </div>

          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>Current Evaluation</label>
            <input
              type="text"
              value={trailer.current_evaluation || ""}
              onChange={(e) => onChange("current_evaluation", e.target.value)}
              required
            />
          </div>

          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>VIN Number</label>
            <input
              type="text"
              value={trailer.vin_num || ""}
              onChange={(e) => onChange("vin_num", e.target.value)}
              required
            />
          </div>

          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>Purchase Date</label>
            <input
              type="date"
              value={
                trailer.trailerpurchasedate ? new Date(trailer.trailerpurchasedate).toISOString().split("T")[0] : ""
              }
              onChange={(e) => onChange("trailerpurchasedate", e.target.value)}
              required
            />
          </div>

          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>
              License Expiry Date
              {trailer.trailer_license_expiry && isLicenseExpired(trailer.trailer_license_expiry) && (
                <span style={{ color: "red", marginLeft: "10px", fontSize: "0.9em" }}>⚠️ EXPIRED</span>
              )}
              {trailer.trailer_license_expiry &&
                !isLicenseExpired(trailer.trailer_license_expiry) &&
                isLicenseExpiringSoon(trailer.trailer_license_expiry) && (
                  <span style={{ color: "orange", marginLeft: "10px", fontSize: "0.9em" }}>⚠️ EXPIRES SOON</span>
                )}
            </label>
            <input
              type="date"
              value={
                trailer.trailer_license_expiry
                  ? new Date(trailer.trailer_license_expiry).toISOString().split("T")[0]
                  : ""
              }
              onChange={(e) => onChange("trailer_license_expiry", e.target.value)}
              style={{
                borderColor:
                  trailer.trailer_license_expiry && isLicenseExpired(trailer.trailer_license_expiry)
                    ? "red"
                    : trailer.trailer_license_expiry && isLicenseExpiringSoon(trailer.trailer_license_expiry)
                      ? "orange"
                      : "",
              }}
              required
            />
            {trailer.trailer_license_expiry && (
              <small
                style={{
                  color: isLicenseExpired(trailer.trailer_license_expiry)
                    ? "red"
                    : isLicenseExpiringSoon(trailer.trailer_license_expiry)
                      ? "orange"
                      : "green",
                  display: "block",
                  marginTop: "5px",
                }}
              >
                {isLicenseExpired(trailer.trailer_license_expiry)
                  ? "License has expired!"
                  : isLicenseExpiringSoon(trailer.trailer_license_expiry)
                    ? `License expires in ${Math.ceil((new Date(trailer.trailer_license_expiry) - new Date()) / (1000 * 60 * 60 * 24))} days`
                    : "License is current"}
              </small>
            )}
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
                multiple
                onChange={handleFileUpload}
                disabled={(trailer.documents?.length || 0) >= 3}
              />
              <small>
                {(trailer.documents?.length || 0) >= 3
                  ? "Maximum of 3 PDF documents uploaded"
                  : "Upload PDF documents only"}
              </small>
            </div>

            {/* Document Lists */}
            <div style={{ marginTop: "15px" }}>
              {isEditing && trailer.existingDocuments?.length > 0 && (
                <>
                  <h4>Previously Uploaded Documents</h4>
                  {trailer.existingDocuments.map((url, index) => (
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
                        onClick={() => onDeleteDocument("trailer", trailer.m5trailerskey, url)}
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

              {trailer.documents?.length > 0 && (
                <>
                  <h4>Newly Uploaded Documents</h4>
                  {trailer.documents.map((doc, index) => (
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

        <button type="submit" className="manage-save-button" disabled={loading}>
          {loading ? "Saving..." : isEditing ? "Update Trailer" : "Add Trailer"}
        </button>

        <button type="button" onClick={onCancel} className="manage-cancel-button">
          Cancel
        </button>
      </form>
    </div>
  )
}

export default TrailerForm
