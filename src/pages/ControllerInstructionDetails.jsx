"use client"

import { useState, useEffect } from "react"
import "../css/containerdetails.css"
import { useNavigate, useLocation } from "react-router-dom"
import "../css/components.css"
import ErrorModal from "../components/ErrorModal"
import API_CONFIG from "../utils/api-config"

const ContainerDetailsPage = () => {
  const navigate = useNavigate()
  const location = useLocation()

  // API base URL from config
  const API_BASE_URL = API_CONFIG.BASE_URL

  // Get data from location state
  const { controllerData, isImport } = location.state || {
    controllerData: null,
    isImport: false,
  }

  // State for container data
  const [containers, setContainers] = useState([])

  // State for error modal
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    message: "",
  })

  // Initialize containers based on container counts
  useEffect(() => {
    if (controllerData) {
      const containersList = []
      let containerId = 1

      // Add 6m containers
      for (let i = 0; i < (controllerData.num_six_meters || 0); i++) {
        containersList.push({
          id: containerId++,
          containerNum: "",
          weight: isImport ? "" : null,
          containerType: "6m",
        })
      }

      // Add 12m containers
      for (let i = 0; i < (controllerData.num_twelve_meters || 0); i++) {
        containersList.push({
          id: containerId++,
          containerNum: "",
          weight: isImport ? "" : null,
          containerType: "12m",
        })
      }

      // Add abnormal containers
      for (let i = 0; i < (controllerData.num_abnormal || 0); i++) {
        containersList.push({
          id: containerId++,
          containerNum: "",
          weight: isImport ? "" : null,
          containerType: "Abnormal",
        })
      }

      setContainers(containersList)
    } else {
      // Redirect back if no data
      navigate("/ControllerInstructions")
    }
  }, [controllerData, isImport, navigate])

  // Handle container input change
  const handleContainerChange = (id, field, value) => {
    setContainers((prevContainers) =>
      prevContainers.map((container) => (container.id === id ? { ...container, [field]: value } : container)),
    )
  }

  // Add a new container (with specified type)
  const handleAddContainer = (containerType) => {
    setContainers((prevContainers) => [
      ...prevContainers,
      {
        id: prevContainers.length + 1,
        containerNum: "",
        weight: isImport ? "" : null,
        containerType: containerType,
      },
    ])

    // Update container counts in controllerData
    if (controllerData) {
      if (containerType === "6m") {
        controllerData.num_six_meters = (controllerData.num_six_meters || 0) + 1
      } else if (containerType === "12m") {
        controllerData.num_twelve_meters = (controllerData.num_twelve_meters || 0) + 1
      } else if (containerType === "Abnormal") {
        controllerData.num_abnormal = (controllerData.num_abnormal || 0) + 1
      }
    }
  }

  // Validate containers
  const validateContainers = () => {
    for (const container of containers) {
      if (!container.containerNum) {
        setErrorModal({
          isOpen: true,
          message: `Please enter a container number for container #${container.id} (${container.containerType})`,
        })
        return false
      }

      if (isImport && (container.weight === "" || isNaN(Number.parseFloat(container.weight)))) {
        setErrorModal({
          isOpen: true,
          message: `Please enter a valid weight for container #${container.id} (${container.containerType})`,
        })
        return false
      }
    }

    return true
  }

  // Handle back button click - preserve form data
  const handleBackClick = () => {
    // Navigate back to ControllerInstructions with the original form data
    navigate("/ControllerInstructions", {
      state: {
        preservedFormData: controllerData,
      },
    })
  }

  // Submit form
  const handleSubmit = async () => {
    if (!validateContainers()) {
      return
    }

    try {
      // Prepare data for API
      const data = {
        controllerData,
        containerData: containers.map((container) => ({
          containerNum: container.containerNum,
          weight: isImport ? Number.parseFloat(container.weight) : null,
          // No need to include containerType as it's not saved in the container table
        })),
      }

      console.log("Sending data to API:", data)

      // Send data to API
      const response = await fetch(`${API_BASE_URL}/api/save-instruction`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("API error response:", errorText)
        throw new Error(`Failed to save instruction: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      console.log("API response:", result)

      if (result.success) {
        // Show success message if using mock data
        if (result.mockData) {
          setErrorModal({
            isOpen: true,
            message: "Success! (Using mock data: " + result.message + ")",
            onClose: () => {
              // Navigate to ControllerDashboard immediately after closing the modal
              setErrorModal({ isOpen: false, message: "" })
              navigate("/ControllerDashboard")
            },
          })
        } else {
          // Navigate to ControllerDashboard immediately
          navigate("/ControllerDashboard")
        }
      } else {
        throw new Error("Failed to save instruction: " + (result.message || "Unknown error"))
      }
    } catch (error) {
      console.error("Error saving instruction:", error)
      setErrorModal({
        isOpen: true,
        message: error.message || "Failed to save instruction. Please try again.",
      })
    }
  }

  return (
    <>
      {/* Error Modal */}
      {errorModal.isOpen && (
        <ErrorModal
          isOpen={errorModal.isOpen}
          onClose={() => {
            // Check if we have a custom onClose function
            if (errorModal.onClose) {
              errorModal.onClose()
            } else {
              setErrorModal({ ...errorModal, isOpen: false })
            }
          }}
          message={errorModal.message}
        />
      )}

      <button className="back-button" onClick={handleBackClick}>
        Back
      </button>
      <div className="container-details-wrapper">
        <div className="content">
          <div className="add-container-section">
            <button
              className="add-container-button"
              onClick={() => handleAddContainer("6m")}
              style={{ marginRight: "10px" }}
            >
              Add 6m Container
            </button>
            <button
              className="add-container-button"
              onClick={() => handleAddContainer("12m")}
              style={{ marginRight: "10px" }}
            >
              Add 12m Container
            </button>
            <button className="add-container-button" onClick={() => handleAddContainer("Abnormal")}>
              Add Abnormal Container
            </button>
          </div>

          <br />

          <div className="container-table-wrapper">
            <table className="container-table1">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Container Type</th>
                  <th>Container Number</th>
                  {isImport && <th>Weight</th>}
                </tr>
              </thead>
              <tbody>
                {containers.map((container, index) => (
                  <tr key={container.id} className={index % 2 === 1 ? "even-row" : ""}>
                    <td>{container.id}</td>
                    <td>{container.containerType}</td>
                    <td>
                      <input
                        type="text"
                        value={container.containerNum}
                        onChange={(e) => handleContainerChange(container.id, "containerNum", e.target.value)}
                        className="container-input"
                      />
                    </td>
                    {isImport && (
                      <td>
                        <input
                          type="text"
                          value={container.weight}
                          onChange={(e) => handleContainerChange(container.id, "weight", e.target.value)}
                          className="container-input"
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="submit-section">
            <button className="submit-button" onClick={handleSubmit}>
              Submit
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default ContainerDetailsPage

