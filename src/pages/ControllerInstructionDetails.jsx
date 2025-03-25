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
  const { controllerData, isImport } = location.state || { controllerData: null, isImport: false }

  // State for container data
  const [containers, setContainers] = useState([])

  // State for error modal
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    message: "",
  })

  // Initialize containers based on numContainers
  useEffect(() => {
    if (controllerData) {
      const initialContainers = Array(controllerData.numContainers)
        .fill()
        .map((_, index) => ({
          id: index + 1,
          containerNum: "",
          weight: isImport ? "" : null,
        }))
      setContainers(initialContainers)
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

  // Add a new container
  const handleAddContainer = () => {
    setContainers((prevContainers) => [
      ...prevContainers,
      {
        id: prevContainers.length + 1,
        containerNum: "",
        weight: isImport ? "" : null,
      },
    ])

    // Update numContainers in controllerData
    if (controllerData) {
      controllerData.numContainers += 1
    }
  }

  // Validate containers
  const validateContainers = () => {
    for (const container of containers) {
      if (!container.containerNum) {
        setErrorModal({
          isOpen: true,
          message: `Please enter a container number for container #${container.id}`,
        })
        return false
      }

      if (isImport && (container.weight === "" || isNaN(Number.parseFloat(container.weight)))) {
        setErrorModal({
          isOpen: true,
          message: `Please enter a valid weight for container #${container.id}`,
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
          })
          // Navigate after user closes the modal
          setTimeout(() => {
            navigate("/Controller_Dashboard")
          }, 3000)
        } else {
          // Navigate back to controller dashboard or another page
          navigate("/Controller_Dashboard")
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
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
        message={errorModal.message}
      />

      <button className="back-button" onClick={handleBackClick}>
        {" "}
        Back
      </button>
      <div className="container-details-wrapper">
        <div className="content">
          <div className="add-container-section">
            <button className="add-container-button" onClick={handleAddContainer}>
              Add Container
            </button>
          </div>

          <br />

          <div className="container-table-wrapper">
            <table className="container-table1">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Container Number</th>
                  {isImport && <th>Weight</th>}
                </tr>
              </thead>
              <tbody>
                {containers.map((container, index) => (
                  <tr key={container.id} className={index % 2 === 1 ? "even-row" : ""}>
                    <td>{container.id}</td>
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

