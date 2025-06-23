"use client"
import { extractFilenameFromUrl } from "../../utils/helpers"

const TruckForm = ({ truck, loading, isEditing, onSave, onCancel, onChange, onDeleteDocument }) => {
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!e.target.checkValidity()) {
      e.target.reportValidity()
      return
    }

    const success = await onSave(truck)
    if (!success) {
      return
    }
  }

  const handleFileUpload = (e) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const newFiles = Array.from(files).filter(
        (file) => file.type === "application/pdf" && (truck.documents?.length || 0) < 3,
      )

      if (newFiles.length > 0) {
        const currentDocs = truck.documents || []
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
    const updatedDocs = [...(truck.documents || [])]
    updatedDocs.splice(index, 1)
    onChange("documents", updatedDocs)
  }

  return (
    <div className="manage-add-truck-form">
      <h2>{isEditing ? "Edit Truck" : "Add New Truck"}</h2>

      <form onSubmit={handleSubmit} noValidate>
        <div className="manage-truck-form-grid">
          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>Truck Registration</label>
            <input
              type="text"
              value={truck.truckregnum || ""}
              onChange={(e) => onChange("truckregnum", e.target.value)}
              required
            />
          </div>

          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>Trailer Size</label>
            <input
              type="text"
              value={truck.trailersize || ""}
              onChange={(e) => onChange("trailersize", e.target.value)}
              required
            />
          </div>

          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>Year</label>
            <input type="text" value={truck.year || ""} onChange={(e) => onChange("year", e.target.value)} required />
          </div>

          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>Model</label>
            <input type="text" value={truck.model || ""} onChange={(e) => onChange("model", e.target.value)} required />
          </div>

          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>Purchase Price</label>
            <input
              type="text"
              value={truck.purchase_price || ""}
              onChange={(e) => onChange("purchase_price", e.target.value)}
              required
            />
          </div>

          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>Current Evaluation</label>
            <input
              type="text"
              value={truck.current_evaluation || ""}
              onChange={(e) => onChange("current_evaluation", e.target.value)}
              required
            />
          </div>

          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>VIN Number</label>
            <input
              type="text"
              value={truck.vin_num || ""}
              onChange={(e) => onChange("vin_num", e.target.value)}
              required
            />
          </div>

          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>Purchase Date</label>
            <input
              type="date"
              value={truck.truckpurchasedate || ""}
              onChange={(e) => onChange("truckpurchasedate", e.target.value)}
              required
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
                multiple
                onChange={handleFileUpload}
                disabled={(truck.documents?.length || 0) >= 3}
              />
              <small>
                {(truck.documents?.length || 0) >= 3
                  ? "Maximum of 3 PDF documents uploaded"
                  : "Upload PDF documents only"}
              </small>
            </div>

            {/* Document Lists */}
            <div style={{ marginTop: "15px" }}>
              {isEditing && truck.existingDocuments?.length > 0 && (
                <>
                  <h4>Previously Uploaded Documents</h4>
                  {truck.existingDocuments.map((url, index) => (
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
                        onClick={() => onDeleteDocument("truck", truck.m5truckskey, url)}
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

              {truck.documents?.length > 0 && (
                <>
                  <h4>Newly Uploaded Documents</h4>
                  {truck.documents.map((doc, index) => (
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
          {loading ? "Saving..." : isEditing ? "Update Truck" : "Add Truck"}
        </button>

        <button type="button" onClick={onCancel} className="manage-cancel-button">
          Cancel
        </button>
      </form>
    </div>
  )
}

export default TruckForm
