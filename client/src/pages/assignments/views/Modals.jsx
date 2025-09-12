import React from 'react';

// Shared modal styles (moved from UpdateInstruction.jsx)
export const modalAnimation = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes scaleIn {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.2s ease-out forwards;
  }
  
  .animate-scaleIn {
    animation: scaleIn 0.3s ease-out forwards;
  }
  
  .modal-wrapper {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
  }
  
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(37, 99, 235, 0.9) 0%, rgba(79, 70, 229, 0.9) 100%);
    z-index: 40;
  }
  
  .modal-container {
    background: white;
    border-radius: 12px;
    width: 400px;
    max-width: 90vw;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    z-index: 50;
    overflow: hidden;
  }
  
  .modal-header {
    padding: 20px 24px 0;
  }
  
  .modal-title {
    font-size: 18px;
    font-weight: 600;
    color: #111827;
    margin-bottom: 8px;
  }
  
  .modal-description {
    font-size: 14px;
    color: #6B7280;
    margin-bottom: 16px;
  }
  
  .modal-body {
    padding: 0 24px 16px;
  }
  
  .modal-item {
    display: flex;
    align-items: flex-start;
    padding: 8px 0;
  }
  
  .modal-bullet {
    min-width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #3b82f6;
    margin-right: 12px;
    margin-top: 6px;
  }
  
  .modal-item-text {
    font-size: 14px;
    color: #374151;
  }
  
  .modal-footer {
    padding: 16px 24px 20px;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }
  
  .modal-btn {
    padding: 8px 16px;
    border-radius: 6px;
    font-weight: 500;
    font-size: 14px;
    transition: all 0.2s;
  }
  
  .modal-btn-secondary {
    background-color: #F3F4F6;
    color: #374151;
  }
  
  .modal-btn-secondary:hover {
    background-color: #E5E7EB;
  }
  
  .modal-btn-primary {
    background-color: #4F46E5;
    color: white;
  }
  
  .modal-btn-primary:hover {
    background-color: #4338CA;
  }
`;

export function MismatchModal({ isOpen, onClose, lastLegDestination, dropoff }) {
  if (!isOpen) return null;
  return (
    <div className="modal-wrapper">
      <div className="modal-backdrop animate-fadeIn"></div>
      <div className="modal-container animate-scaleIn">
        <div className="modal-header">
          <h3 className="modal-title">Destination Mismatch</h3>
          <p className="modal-description">
            The final leg destination doesn't match the instruction dropoff
            location.
          </p>
        </div>
        <div className="modal-body">
          <div className="modal-item">
            <div className="modal-bullet"></div>
            <span className="modal-item-text">
              Last Leg Destination:{" "}
              <strong>{lastLegDestination}</strong>
            </span>
          </div>
          <div className="modal-item">
            <div className="modal-bullet"></div>
            <span className="modal-item-text">
              Instruction Dropoff:{" "}
              <strong>{dropoff}</strong>
            </span>
          </div>
          <div className="modal-item">
            <div className="modal-bullet"></div>
            <span className="modal-item-text">
              Please update the final leg destination or edit the
              instruction.
            </span>
          </div>
        </div>
        <div className="modal-footer">
          <button
            className="modal-btn modal-btn-primary"
            onClick={onClose}
          >
            Okay
          </button>
        </div>
      </div>
    </div>
  );
}
export function ContainerModal({ isOpen, onClose, validationDetails }) {
  if (!isOpen) return null;
  return (
    <div className="modal-wrapper">
      <div className="modal-backdrop animate-fadeIn"></div>
      <div className="modal-container animate-scaleIn">
        <div className="modal-header">
          <div className="flex items-center gap-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="50"
              height="50"
              viewBox="0 0 24 24"
              fill="#FEE2E2"
              stroke="#DC2626"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-red-600 drop-shadow-sm"
            >
              <path d="M12 2L2 19h20L12 2z" />
              <path d="M12 8v4" />
              <circle cx="12" cy="16" r="1" />
            </svg>
            <h3 className="modal-title">
              {validationDetails.isWeightBased 
                ? (validationDetails.missingWeight > 0 ? "Weight Destination Warning" : "Excess Weight Warning")
                : "Container Destination Warning"}
            </h3>
          </div>
          <p className="modal-description">
            {validationDetails.isWeightBased
              ? (validationDetails.missingWeight > 0 
                  ? "Not all weight reaches the final destination."
                  : "More weight is assigned than the instruction total.")
              : "All containers must reach the final destination."}
          </p>
        </div>
        <div className="modal-body">
          <div className="modal-item">
            <div className="modal-bullet"></div>
            <span className="modal-item-text">
              Final Destination: <strong>{validationDetails.dropoff}</strong>
            </span>
          </div>
          {validationDetails.isWeightBased ? (
            <div className="modal-item">
              <div className="modal-bullet"></div>
              <span className="modal-item-text">
                Weight reaching destination: <strong>
                  {(validationDetails.totalWeight - Math.abs(validationDetails.missingWeight)).toFixed(2)}/
                  {validationDetails.totalWeight.toFixed(2)} {validationDetails.weightUnit}
                </strong>
              </span>
            </div>
          ) : (
            validationDetails.missingContainers?.map((container, index) => (
              <div key={index} className="modal-item">
                <div className="modal-bullet"></div>
                <span className="modal-item-text">
                  Container <strong>{container}</strong> does not reach final destination
                </span>
              </div>
            ))
          )}
        </div>
        <div className="modal-footer">
          <button
            className="modal-btn modal-btn-primary"
            onClick={onClose}
          >
            Okay
          </button>
        </div>
      </div>
    </div>
  );
}
export function UnsavedChangesModal({ isOpen, onClose }) {
  if (!isOpen) return null;
  return (
    <div className="modal-wrapper">
      <div className="modal-backdrop animate-fadeIn"></div>
      <div className="modal-container animate-scaleIn">
        <div className="modal-header">
          <h3 className="modal-title">Unsaved Changes</h3>
          <p className="modal-description">
            Please save your changes in the current leg before adding a new
            leg.
          </p>
        </div>
        <div className="modal-footer">
          <button
            className="modal-btn modal-btn-primary"
            onClick={onClose}
          >
            Okay
          </button>
        </div>
      </div>
    </div>
  );
}
export function MissingFieldsModal({ isOpen, onClose, missingFields }) {
  if (!isOpen) return null;
  return (
    <div className="modal-wrapper">
      <div className="modal-backdrop animate-fadeIn"></div>
      <div className="modal-container animate-scaleIn">
        <div className="modal-header">
          <h3 className="modal-title">Missing Required Fields</h3>
          <p className="modal-description">
            Please fill in all required fields before saving.
          </p>
        </div>
        <div className="modal-body">
          {missingFields.map((field, index) => (
            <div key={index} className="modal-item">
              <div className="modal-bullet"></div>
              <span className="modal-item-text">{field}</span>
            </div>
          ))}
        </div>
        <div className="modal-footer">
          <button
            className="modal-btn modal-btn-primary"
            onClick={onClose}
          >
            Okay
          </button>
        </div>
      </div>
    </div>
  );
}
export function NoDriversModal({ isOpen, onClose }) {
  if (!isOpen) return null;
  return (
    <div className="modal-wrapper">
      <div className="modal-backdrop animate-fadeIn"></div>
      <div className="modal-container animate-scaleIn">
        <div className="modal-header">
          <h3 className="modal-title">Driver Required</h3>
          <p className="modal-description">
            Please make sure to add a driver before finalisation.
          </p>
        </div>
        <div className="modal-footer">
          <button
            className="modal-btn modal-btn-primary"
            onClick={onClose}
          >
            Okay
          </button>
        </div>
      </div>
    </div>
  );
}
export function BackConfirmModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;
  return (
    <div className="modal-wrapper">
      <div className="modal-backdrop animate-fadeIn"></div>
      <div className="modal-container animate-scaleIn">
        <div className="modal-header">
          <p className="modal-description" style={{ fontSize: "20px" }}>
            Are you sure you wish to proceed? Unsaved changes will be lost.
          </p>
        </div>
        <div className="modal-footer">
          <button
            className="modal-btn modal-btn-secondary"
            onClick={onClose}
          >
            No
          </button>
          <button
            className="modal-btn modal-btn-primary"
            onClick={onConfirm}
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
}
export function RemoveDriverModal({ isOpen, onClose, onConfirm, driverName }) {
  if (!isOpen) return null;
  return (
    <div className="modal-wrapper">
      <div className="modal-backdrop animate-fadeIn"></div>
      <div className="modal-container animate-scaleIn">
        <div className="modal-header">
          <p className="modal-description" style={{ fontSize: "20px" }}>
            Are you sure you want to remove this driver?
          </p>
        </div>
        <div className="modal-body">
          <div className="p-2 text-center">
            <span className="text-gray-700">
              Removing: <strong>{driverName}</strong>
            </span>
          </div>
        </div>
        <div className="modal-footer">
          <button
            className="modal-btn modal-btn-secondary"
            onClick={onClose}
          >
            No
          </button>
          <button
            className="modal-btn modal-btn-primary"
            onClick={onConfirm}
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
}
export function RemoveLegModal({ isOpen, onClose, onConfirm, legNumber }) {
  if (!isOpen) return null;
  return (
    <div className="modal-wrapper">
      <div className="modal-backdrop animate-fadeIn"></div>
      <div className="modal-container animate-scaleIn">
        <div className="modal-header">
          <p className="modal-description" style={{ fontSize: "20px" }}>
            Are you sure you want to remove this leg?
          </p>
        </div>
        <div className="modal-body">
          <div className="p-2 text-center">
            <span className="text-gray-700">
              Removing: <strong>Leg {legNumber}</strong>
            </span>
          </div>
        </div>
        <div className="modal-footer">
          <button
            className="modal-btn modal-btn-secondary"
            onClick={onClose}
          >
            No
          </button>
          <button
            className="modal-btn modal-btn-primary"
            onClick={onConfirm}
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
}
export function DuplicateDriverModal({ isOpen, onClose, duplicateDriverInfo, getDriverName }) {
  if (!isOpen) return null;
  return (
    <div className="modal-wrapper">
      <div className="modal-backdrop animate-fadeIn"></div>
      <div className="modal-container animate-scaleIn">
        <div className="modal-header">
          <h3 className="modal-title">Identical Driver Information</h3>
          <p className="modal-description">
            A driver with identical information already exists.
          </p>
        </div>
        <div className="modal-body">
          <div className="modal-item">
            <div className="modal-bullet"></div>
            <span className="modal-item-text">
              Driver:{" "}
              <strong>
                {duplicateDriverInfo &&
                  getDriverName(duplicateDriverInfo.driverid)}
              </strong>
            </span>
          </div>
          <div className="modal-item">
            <div className="modal-bullet"></div>
            <span className="modal-item-text">
              Truck: <strong>{duplicateDriverInfo?.truckregnumber}</strong>
            </span>
          </div>
          <div className="modal-item">
            <div className="modal-bullet"></div>
            <span className="modal-item-text">
              Container:{" "}
              <strong>{duplicateDriverInfo?.containernumber}</strong>
            </span>
          </div>
          <div className="modal-item">
            <div className="modal-bullet"></div>
            <span className="modal-item-text">
              Date: <strong>{duplicateDriverInfo?.date}</strong>
            </span>
          </div>
        </div>
        <div className="modal-footer">
          <button
            className="modal-btn modal-btn-primary"
            onClick={onClose}
          >
            Okay
          </button>
        </div>
      </div>
    </div>
  );
}
export function ContainerReachedModal({ isOpen, onClose, containerNumber }) {
  if (!isOpen) return null;
  return (
    <div className="modal-wrapper">
      <div className="modal-backdrop animate-fadeIn"></div>
      <div className="modal-container animate-scaleIn">
        <div className="modal-header">
          <h3 className="modal-title">Container Already Reached Dropoff</h3>
          <p className="modal-description">
            The specified container has already reached its dropoff in a
            previous leg.
          </p>
        </div>
        <div className="modal-body">
          <div className="modal-item">
            <div className="modal-bullet"></div>
            <span className="modal-item-text">
              Container{" "}
              <strong>{containerNumber}</strong> has
              already reached its final destination.
            </span>
          </div>
          <div className="modal-item">
            <div className="modal-bullet"></div>
            <span className="modal-item-text">
              Please select a different container or update the previous
              legs.
            </span>
          </div>
        </div>
        <div className="modal-footer">
          <button
            className="modal-btn modal-btn-primary"
            onClick={onClose}
          >
            Okay
          </button>
        </div>
      </div>
    </div>
  );
}