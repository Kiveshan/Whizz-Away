"use client";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../css/UploadInstructionDocuments.css";
import api from "../../../api";
import InvoicePreviewModal from "../../invoices/views/InviewPreviewModal.jsx"; // Add this import

const UploadInstructionDocuments = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const clientId = location.state?.clientId;
  const instructionId = location.state?.instructionId;
  
  // Add preview modal state
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);

  const [isCompleted, setIsCompleted] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [docName, setDocName] = useState("");
  const [docType, setDocType] = useState("Delivery Note");
  const [legNumber, setLegNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [legs, setLegs] = useState([]);
  const [currentLeg, setCurrentLeg] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitMessage, setSubmitMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(isCompleted);
  const [shipmentType, setShipmentType] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});
  const [containerCount, setContainerCount] = useState(0);
  const [rateWeight, setRateWeight] = useState(null);
  const [weightUnit, setWeightUnit] = useState("kg");
  const [containersReachedCount, setContainersReachedCount] = useState(0);
  const [isDocumentPage, setIsDocumentPage] = useState(true);

  // Add modal states
  const [showFinishConfirmModal, setShowFinishConfirmModal] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showRemoveConfirmModal, setShowRemoveConfirmModal] = useState(false);
  const [documentToRemove, setDocumentToRemove] = useState({
    index: null,
    name: "",
  });

  const isWeightBasedInstruction = () => {
    return rateWeight && rateWeight.toLowerCase() !== "container";
  };

  const isShipmentType3 = () => {
    return shipmentType === 3;
  };

  const getAvailableDocumentTypes = () => {
    const types = ["Instruction Document", "Delivery Note"];
    if (showEmptyTurningDepotOption()) {
      types.push("Empty Turning Depot Document");
    }
    return types;
  };

  useEffect(() => {
    if (instructionId) {
      fetchLegs();
      fetchDocuments();
      fetchInstructionStatus();
      fetchContainers();
      fetchInstructionRateWeightAndUnit();
      if (location.state?.shipmentType !== undefined) {
        console.log(
          "Using shipmentType from location state:",
          location.state.shipmentType
        );
        const shipmentTypeValue = Number(location.state.shipmentType);
        setShipmentType(shipmentTypeValue);
        setDebugInfo((prev) => ({
          ...prev,
          shipmentTypeFromState: location.state.shipmentType,
          shipmentTypeValueFromState: shipmentTypeValue,
        }));
      } else {
        fetchShipmentType();
      }
    }
  }, [instructionId]);

  const fetchContainers = async () => {
    try {
      const response = await api.get(
        `/containers/instruction/${instructionId}`
      );
      console.log("Containers for instruction:", response.data);
      setContainerCount(response.data.length);
      const reachedCount = await countContainersReachingDestination();
      setContainersReachedCount(reachedCount);
    } catch (error) {
      console.error("Error fetching containers:", error);
      setContainerCount(0);
      setContainersReachedCount(0);
    }
  };

  const fetchShipmentType = async () => {
    try {
      console.log("Fetching shipment type for instruction ID:", instructionId);
      const response = await api.get(
        `/instructions/${instructionId}/shipment-type`
      );
      console.log("Shipment type API response:", response.data);
      const shipmentTypeValue = Number(response.data.shipment_type);
      console.log("Setting shipment type to:", shipmentTypeValue);
      setShipmentType(shipmentTypeValue);
      setDebugInfo((prev) => ({
        ...prev,
        shipmentTypeFromAPI: response.data.shipment_type,
        shipmentTypeValueFromAPI: shipmentTypeValue,
      }));
    } catch (error) {
      console.error("Error fetching shipment type:", error);
      setDebugInfo((prev) => ({
        ...prev,
        shipmentTypeError: error.message,
      }));
    }
  };

  const fetchInstructionStatus = async () => {
    if (location.state?.isCompleted !== undefined) {
      setIsCompleted(location.state.isCompleted);
      return;
    }
    try {
      const response = await api.get(`/instructions/${instructionId}`);
      setIsCompleted(
        response.data.status === "Completed" || response.data.is_completed
      );
    } catch (error) {
      console.error("Error fetching instruction:", error);
    }
  };

  const fetchLegs = async () => {
    try {
      const response = await api.get(`/legs/${instructionId}`);
      setLegs(response.data);
      if (response.data.length > 0 && !currentLeg) {
        setCurrentLeg(response.data[0].legnumber);
        setLegNumber(response.data[0].legnumber);
      }
    } catch (error) {
      console.error("Error fetching legs:", error);
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      console.log("Fetching documents for instruction ID:", instructionId);
      const response = await api.get(`/documents/${instructionId}`);
      console.log("Fetched documents:", response.data);
      setDocuments(response.data);
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLegClick = (legNumber) => {
    const legIndex = legs.findIndex((leg) => leg.legnumber === legNumber);
    if (legIndex === -1) {
      console.error(`Could not find leg with number ${legNumber}`);
      return;
    }
    console.log(
      `Navigating to leg index ${legIndex} (leg number ${legNumber})`
    );
    navigate("/update-instructions", {
      state: {
        clientId,
        instructionId,
        selectedLegIndex: legIndex,
        isCompleted: isCompleted,
        shipmentType: shipmentType,
      },
      replace: true,
    });
    setIsDocumentPage(false);
  };

  // NEW: Handle invoice preview
  const handlePreviewInvoice = async () => {
    // Clear any previous messages and open preview
    setSubmitMessage("");
    setShowInvoicePreview(true);
  };

  const validateDocumentUpload = () => {
    if (!selectedFile || !docName) {
      setSubmitMessage("Error: Please select a file and enter a document name");
      return false;
    }
    const allowedFileTypes = /\.(jpg|jpeg|png|pdf)$/i;
    if (!allowedFileTypes.test(selectedFile.name)) {
      setSubmitMessage("Error: Only JPG, PNG, and PDF files are allowed");
      return false;
    }
    const maxSize = 100 * 1024 * 1024; // 10MB in bytes
    if (selectedFile.size > maxSize) {
      setSubmitMessage("Error: File size exceeds 10MB limit");
      return false;
    }
    if (docType === "Instruction Document") {
      const instructionDocs = documents.filter(
        (doc) => doc.type === "Instruction Document"
      );
      if (instructionDocs.length >= 1) {
        setSubmitMessage("Error: Only 1 Instruction Document is allowed");
        return false;
      }
      return true;
    }
    if (docType === "Delivery Note") {
      const legDeliveryNotes = documents.filter(
        (doc) => doc.type === "Delivery Note"
      );
      if (
        !isWeightBasedInstruction() &&
        legDeliveryNotes.length >= containersReachedCount
      ) {
        setSubmitMessage(`Error: Too many delivery notes`);
        return false;
      }
      return true;
    }
    if (docType === "Empty Turning Depot Document") {
      if (!legNumber) {
        setSubmitMessage(
          "Error: Please select a leg number for the Empty Turning Depot Document"
        );
        return false;
      }
      if (
        !legs.some((leg) => leg.legnumber.toString() === legNumber.toString())
      ) {
        setSubmitMessage(`Error: Leg ${legNumber} does not exist`);
        return false;
      }
      const emptyTurningDocs = documents.filter(
        (doc) => doc.type === "Empty Turning Depot Document"
      );
      if (emptyTurningDocs.length >= 1) {
        setSubmitMessage(
          "Error: Only 1 Empty Turning Depot Document is allowed"
        );
        return false;
      }
      return true;
    }
    return true;
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setSelectedFile(selectedFile);
      if (selectedFile.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setFilePreview(event.target.result);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        setFilePreview(null);
      }
    }
  };

  const handleRemove = async (index) => {
    const docToRemove = documents[index];
    setDocumentToRemove({ index, name: docToRemove.name });
    setShowRemoveConfirmModal(true);
  };

  const confirmRemove = async () => {
    try {
      const index = documentToRemove.index;
      const docToRemove = documents[index];
      if (docToRemove.id) {
        await api.delete(`/documents/${docToRemove.id}`);
      }
      const newDocs = [...documents];
      newDocs.splice(index, 1);
      setDocuments(newDocs);
      setShowRemoveConfirmModal(false);
    } catch (error) {
      console.error("Error removing document:", error);
      setShowRemoveConfirmModal(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setSubmitMessage("");
    setIsSubmitting(true);
    setUploadProgress(0);
    if (!validateDocumentUpload()) {
      setIsSubmitting(false);
      return;
    }
    let progressInterval;
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("name", docName);
      formData.append("type", docType);
      formData.append("instructionId", instructionId);
      if (docType !== "Instruction Document") {
        formData.append("legNumber", legNumber);
      } else {
        formData.append("legNumber", "1");
      }
      const simulateProgress = () => {
        let progress = 0;
        const interval = setInterval(() => {
          progress += 5;
          if (progress >= 90) {
            clearInterval(interval);
          } else {
            setUploadProgress(progress);
          }
        }, 200);
        return interval;
      };
      progressInterval = simulateProgress();
      console.log("Sending document upload request with data:", {
        name: docName,
        type: docType,
        instructionId,
        legNumber: docType !== "Instruction Document" ? legNumber : "1",
      });
      const response = await api.post("/documents/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      clearInterval(progressInterval);
      setUploadProgress(100);
      console.log("Upload successful:", response.data);
      const newDocument = {
        id: response.data.id,
        name: docName,
        type: docType,
        date: new Date().toLocaleDateString("en-GB"),
        legNumber: docType !== "Instruction Document" ? legNumber : "1",
        url: response.data.url,
      };
      setDocuments([...documents, newDocument]);
      setDocName("");
      setSelectedFile(null);
      setFilePreview(null);
      setDocType(isShipmentType3() ? "Delivery Note" : "Instruction Document");
      if (document.getElementById("fileInput")) {
        document.getElementById("fileInput").value = "";
      }
      setSubmitMessage("Document uploaded successfully!");
      fetchDocuments();
    } catch (error) {
      console.error("Error uploading document:", error);
      setSubmitMessage(`Error: ${error.message}`);
      clearInterval(progressInterval);
      setUploadProgress(0);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setDocName("");
    setSelectedFile(null);
    setFilePreview(null);
    if (document.getElementById("fileInput")) {
      document.getElementById("fileInput").value = "";
    }
  };

  const handleBackClick = () => {
    navigate("/update-instructions", {
      state: {
        clientId,
        instructionId,
        selectedLegIndex: 0,
        timestamp: Date.now(),
      },
      replace: true,
    });
  };

  const handleFinish = () => {
    const instructionDocs = documents.filter(
      (doc) => doc.type === "Instruction Document"
    );
    const deliveryNotes = documents.filter(
      (doc) => doc.type === "Delivery Note"
    );
    if (instructionDocs.length !== 1) {
      setSubmitMessage("Error: Exactly 1 Instruction Document is required");
      return;
    }
    if (
      !isWeightBasedInstruction() &&
      deliveryNotes.length !== containersReachedCount
    ) {
      setSubmitMessage(
        `Error: Exactly ${containersReachedCount} Delivery Notes are required (one per container)`
      );
      return;
    }
    setShowFinishConfirmModal(true);
  };

  const completeInstruction = async () => {
    try {
      await api.put(`/instructions/${instructionId}/complete`, {
        status: "Completed",
      });
      console.log("Instruction marked as completed, now generating invoice...");
      const invoiceResponse = await api.post(
        `/generate-invoice/${instructionId}`
      );
      console.log("Invoice generated successfully:", invoiceResponse.data);
      setShowSuccessPopup(true);
      setTimeout(() => {
        setShowSuccessPopup(false);
        navigate("/instructions", {
          state: { clientId },
          replace: true,
        });
      }, 2000);
    } catch (error) {
      console.error("Error completing instruction:", error);
      setSubmitMessage(`Error: ${error.message}`);
    } finally {
      setShowFinishConfirmModal(false);
    }
  };

  const canFinish = () => {
    const instructionDocs = documents.filter(
      (doc) => doc.type === "Instruction Document"
    );
    const deliveryNotes = documents.filter(
      (doc) => doc.type === "Delivery Note"
    );
    const emptyTurningDocs = documents.filter(
      (doc) => doc.type === "Empty Turning Depot Document"
    );
    const basicRequirements =
      instructionDocs.length === 1 &&
      (isWeightBasedInstruction() ||
        deliveryNotes.length === containersReachedCount);
    if (showEmptyTurningDepotOption()) {
      return basicRequirements && emptyTurningDocs.length === 1;
    }
    return basicRequirements;
  };

  const showEmptyTurningDepotOption = () => {
    console.log(
      "Checking if we should show Empty Turning Depot Document option. Shipment type:",
      shipmentType
    );
    return shipmentType === 1;
  };

  const countContainersReachingDestination = async () => {
    try {
      const instructionResponse = await api.get(
        `/instructions/${instructionId}/details`
      );
      const dropoff = instructionResponse.data.dropoff;
      const normalizedDropoff = dropoff?.toLowerCase().replace(/\s/g, "");
      const legsResponse = await api.get(`/legs/${instructionId}`);
      const legsData = legsResponse.data;
      const containersResponse = await api.get(
        `/containers/instruction/${instructionId}`
      );
      const instructionContainers = containersResponse.data;
      const containersReachingDropoff = new Set();
      legsData.forEach((leg) => {
        const normalizedLegDestination = leg.destination
          ?.toLowerCase()
          .replace(/\s/g, "");
        if (
          normalizedLegDestination === normalizedDropoff &&
          leg.drivers &&
          leg.drivers.length > 0
        ) {
          leg.drivers.forEach((driver) => {
            if (driver.containernumber) {
              containersReachingDropoff.add(driver.containernumber.toString());
            }
          });
        }
      });
      console.log(
        "Containers reaching final destination:",
        Array.from(containersReachingDropoff)
      );
      console.log(
        "Total instruction containers:",
        instructionContainers.length
      );
      console.log("Containers reached count:", containersReachingDropoff.size);
      return containersReachingDropoff.size;
    } catch (error) {
      console.error("Error counting containers reaching destination:", error);
      return 0;
    }
  };

  const fetchInstructionRateWeightAndUnit = async () => {
    if (!instructionId) return;
    try {
      const response = await api.get(`/instructions/${instructionId}/details`);
      const rateWeightValue = response.data.rateweight;
      setRateWeight(rateWeightValue);
      const isWeight =
        rateWeightValue && rateWeightValue.toLowerCase() !== "container";
      if (isWeight) {
        const unit = rateWeightValue.toLowerCase().includes("ton")
          ? "ton"
          : "kg";
        setWeightUnit(unit);
      }
    } catch (error) {
      console.error("Error fetching rate weight:", error);
    }
  };

  return (
    <div className="instruction-container">
      <div>
        <button className="back-button" onClick={handleBackClick}>
          Back
        </button>
      </div>
      <div className="steps">
        {legs.map((leg) => (
          <button
            key={leg.legkey}
            className={`step-btn ${
              currentLeg === leg.legnumber && !isDocumentPage ? "active" : ""
            }`}
            onClick={() => handleLegClick(leg.legnumber)}
          >
            Leg {leg.legnumber}
          </button>
        ))}
        <button
          className="step-btn document-btn active"
          onClick={() => setIsDocumentPage(true)}
        >
          Document
        </button>
      </div>
      {!isCompleted ? (
        <div className="upload-card">
          <h3 className="document-title">
            Documentation for Instruction Completion
          </h3>
          <div
            className="upload-box"
            onClick={() => document.getElementById("fileInput").click()}
          >
            <div className="upload-content">
              <p>{selectedFile ? selectedFile.name : "Drop files here"}</p>
              <p>
                Supported formats: PNG, JPG, PDF OR{" "}
                <span className="browse-link">Browse files</span>
              </p>
              <input
                type="file"
                id="fileInput"
                style={{ display: "none" }}
                accept=".png,.jpg,.jpeg,.pdf"
                onChange={handleFileChange}
              />
            </div>
            {filePreview && (
              <div className="file-preview">
                <img
                  src={filePreview || "/placeholder.svg"}
                  alt="File Preview"
                />
              </div>
            )}
            {selectedFile && selectedFile.type === "application/pdf" && (
              <div className="file-preview">
                <p>PDF document selected</p>
              </div>
            )}
          </div>
          <div className="form">
            <input
              type="text"
              placeholder="Document Name"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
            />
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="dropdown"
            >
              {getAvailableDocumentTypes().map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {submitMessage && (
              <div
                className={`submit-message ${
                  submitMessage.includes("Error") ? "error" : "success"
                }`}
              >
                {submitMessage}
              </div>
            )}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="upload-progress">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <div className="progress-text">
                  Upload Progress: {uploadProgress}%
                </div>
              </div>
            )}
            <div className="form-actions">
              <button className="cancel-btn" onClick={handleCancel}>
                Cancel
              </button>
              <button
                className="upload-btn"
                onClick={handleUpload}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="view-only-section">
          <h3 className="document-title">Documentation for Instruction</h3>
        </div>
      )}
      <div className="document-table-container">
        {loading ? (
          <p>Loading documents...</p>
        ) : (
          <table className="document-table">
            <thead>
              <tr>
                <th>Document Name</th>
                <th>Document Type</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.length === 0 ? (
                <tr>
                  <td colSpan="5">No documents found</td>
                </tr>
              ) : (
                documents.map((doc, index) => (
                  <tr key={index}>
                    <td>{doc.name}</td>
                    <td>{doc.type}</td>
                    <td>{doc.date}</td>
                    <td>
                      {!isCompleted && (
                        <button
                          onClick={() => handleRemove(index)}
                          className="remove-btn"
                        >
                          Remove
                        </button>
                      )}
                      <button
                        className="view-btn"
                        onClick={() => doc.url && window.open(doc.url)}
                        disabled={!doc.url}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
      <div className="requirements-section">
        <h4>Document Requirements:</h4>
        <ul>
          <li
            style={{
              color:
                documents.filter((doc) => doc.type === "Instruction Document")
                  .length === 1
                  ? "green"
                  : "red",
            }}
          >
            Instruction Document:{" "}
            {
              documents.filter((doc) => doc.type === "Instruction Document")
                .length
            }
            /1
          </li>
          <li
            style={{
              color:
                isWeightBasedInstruction() ||
                documents.filter((doc) => doc.type === "Delivery Note")
                  .length === containersReachedCount
                  ? "green"
                  : "red",
            }}
          >
            {isWeightBasedInstruction()
              ? `Delivery Notes: ${
                  documents.filter((doc) => doc.type === "Delivery Note").length
                }`
              : `Delivery Notes: ${
                  documents.filter((doc) => doc.type === "Delivery Note").length
                }/${containersReachedCount}`}
          </li>
          {showEmptyTurningDepotOption() && !isShipmentType3() && (
            <li
              style={{
                color:
                  documents.filter(
                    (doc) => doc.type === "Empty Turning Depot Document"
                  ).length === 1
                    ? "green"
                    : "red",
              }}
            >
              Empty Turning Depot Document:{" "}
              {
                documents.filter(
                  (doc) => doc.type === "Empty Turning Depot Document"
                ).length
              }
              /1
            </li>
          )}
        </ul>
      </div>
      
      {/* NEW: Action Buttons Section */}
      <div className="action-buttons">
        <button
          className="preview-btn"
          onClick={handlePreviewInvoice}
          title={"Preview the invoice"}
        >
          Preview Invoice
        </button>
        
        <button
          className="finish-btn"
          onClick={handleFinish}
          disabled={!canFinish() || isCompleted}
          style={{
            opacity: canFinish() && !isCompleted ? 1 : 0.5,
            cursor: canFinish() && !isCompleted ? "pointer" : "not-allowed",
          }}
          title={!canFinish() ? "Complete all required documents first" : "Complete this instruction and generate invoice"}
        >
        Finish Instruction
        </button>
      </div>

      {/* Finish Confirmation Modal */}
      {showFinishConfirmModal && (
        <div className="modal-wrapper">
          <div className="modal-backdrop animate-fadeIn"></div>
          <div className="modal-container animate-scaleIn">
            <div className="modal-header">
              <p className="modal-description">
                Are you sure you wish to complete instruction? Once completed,
                edit functionality will be unavailable.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="modal-btn modal-btn-secondary"
                onClick={() => setShowFinishConfirmModal(false)}
              >
                No
              </button>
              <button
                className="modal-btn modal-btn-primary"
                onClick={completeInstruction}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="toast-popup">Instruction complete!</div>
      )}

      {/* Remove Document Confirmation Modal */}
      {showRemoveConfirmModal && (
        <div className="modal-wrapper">
          <div className="modal-backdrop animate-fadeIn"></div>
          <div className="modal-container animate-scaleIn">
            <div className="modal-header">
              <p className="modal-description">
                Are you sure you want to remove this file?
              </p>
            </div>
            <div className="modal-body">
              <div className="p-2 text-center">
                <span className="text-gray-700">
                  File: <strong>{documentToRemove.name}</strong>
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="modal-btn modal-btn-secondary"
                onClick={() => setShowRemoveConfirmModal(false)}
              >
                No
              </button>
              <button
                className="modal-btn modal-btn-primary"
                onClick={confirmRemove}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW: Invoice Preview Modal */}
      {showInvoicePreview && (
        <InvoicePreviewModal
          instructionId={instructionId}
          clientId={clientId}
          shipmentType={shipmentType}
          isOpen={showInvoicePreview}
          onClose={() => setShowInvoicePreview(false)}
        />
      )}
    </div>
  );
};

export default UploadInstructionDocuments;