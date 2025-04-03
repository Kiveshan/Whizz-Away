"use client"

import { useState, useEffect } from "react"
import "../css/containerdetails.css"
import { useNavigate, useLocation } from "react-router-dom"
import "../css/components.css"
import ErrorModal from "../components/ErrorModal"
import API_CONFIG from "../utils/api-config"

const BMcontrollerInstructionDetails = () => {
  const navigate = useNavigate()
  const location = useLocation()

  // API base URL from config
  const API_BASE_URL = API_CONFIG.BASE_URL

  // Get data from location state
  const { controllerData, isImport, instructionId } = location.state || {
    controllerData: null,
    isImport: false,
    instructionId: null,
  }

  // State for container data
  const [containers, setContainers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [successMessage, setSuccessMessage] = useState("")

  // State for error modal
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    message: "",
  })

  // Fetch existing containers if instructionId is provided
  useEffect(() => {
    if (instructionId) {
      fetchContainers(instructionId)
    } else if (controllerData) {
      initializeContainers()
    } else {
      // Redirect back if no data
      navigate("/BMcontrollerinstructions")
    }
  }, [instructionId, controllerData, navigate])

  // Fetch containers for the given instruction ID
  const fetchContainers = async (id) => {
    setIsLoading(true)
    try {
      console.log(`Fetching containers for instruction ID: ${id}`)
      const response = await fetch(`${API_BASE_URL}/api/containers/${id}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        // If containers don't exist yet, initialize based on controllerData
        if (response.status === 404) {
          console.log("No containers found, initializing from controller data")
          initializeContainers()
          return
        }

        const text = await response.text()
        console.error("Response not OK:", text)
        throw new Error(`Failed to fetch containers: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log("Containers data received:", data)

      if (data && data.length > 0) {
        // Map container data to our format
        const containersList = data.map((container, index) => ({
          id: index + 1,
          containerKey: container.containerkey,
          containerNum: container.containernum ? container.containernum.toString() : "",
          weight: container.weight !== null ? container.weight.toString() : "",
          containerType: determineContainerType(index, controllerData),
        }))

        // Ensure the number of containers matches the counts in controllerData
        const updatedContainersList = syncContainersWithCounts(containersList)

        setContainers(updatedContainersList)
      } else {
        // If no containers found, initialize based on controllerData
        initializeContainers()
      }
    } catch (error) {
      console.error("Error fetching containers:", error)
      // If error, initialize based on controllerData
      initializeContainers()
    } finally {
      setIsLoading(false)
    }
  }

  // Sync containers with the counts from controllerData
  const syncContainersWithCounts = (containersList) => {
    if (!controllerData) return containersList

    const sixMCount = controllerData.num_six_meters || 0
    const twelveMCount = controllerData.num_twelve_meters || 0
    const abnormalCount = controllerData.num_abnormal || 0

    // Count current containers by type
    const currentCounts = {
      "6m": 0,
      "12m": 0,
      Abnormal: 0,
    }

    containersList.forEach((container) => {
      currentCounts[container.containerType]++
    })

    let result = [...containersList]
    let nextId = containersList.length + 1

    // Add missing containers
    for (let i = currentCounts["6m"]; i < sixMCount; i++) {
      result.push({
        id: nextId++,
        containerKey: null,
        containerNum: "",
        weight: "",
        containerType: "6m",
      })
    }

    for (let i = currentCounts["12m"]; i < twelveMCount; i++) {
      result.push({
        id: nextId++,
        containerKey: null,
        containerNum: "",
        weight: "",
        containerType: "12m",
      })
    }

    for (let i = currentCounts["Abnormal"]; i < abnormalCount; i++) {
      result.push({
        id: nextId++,
        containerKey: null,
        containerNum: "",
        weight: "",
        containerType: "Abnormal",
      })
    }

    // Remove excess containers
    if (
      currentCounts["6m"] > sixMCount ||
      currentCounts["12m"] > twelveMCount ||
      currentCounts["Abnormal"] > abnormalCount
    ) {
      // Filter containers to keep only the required number of each type
      const filteredContainers = []
      const typeCounts = { "6m": 0, "12m": 0, Abnormal: 0 }

      for (const container of result) {
        if (
          typeCounts[container.containerType] <
          (container.containerType === "6m"
            ? sixMCount
            : container.containerType === "12m"
              ? twelveMCount
              : abnormalCount)
        ) {
          filteredContainers.push(container)
          typeCounts[container.containerType]++
        }
      }

      // Reassign IDs to maintain sequential order
      result = filteredContainers.map((container, index) => ({
        ...container,
        id: index + 1,
      }))
    }

    return result
  }

  // Determine container type based on index and controller data
  const determineContainerType = (index, data) => {
    if (!data) return "Unknown"

    const sixMCount = data.num_six_meters || 0
    const twelveMCount = data.num_twelve_meters || 0

    if (index < sixMCount) return "6m"
    if (index < sixMCount + twelveMCount) return "12m"
    return "Abnormal"
  }

  // Initialize containers based on container counts
  const initializeContainers = () => {
    if (controllerData) {
      const containersList = []
      let containerId = 1

      // Add 6m containers
      for (let i = 0; i < (controllerData.num_six_meters || 0); i++) {
        containersList.push({
          id: containerId++,
          containerKey: null, // New container, no key yet
          containerNum: "",
          weight: "",
          containerType: "6m",
        })
      }

      // Add 12m containers
      for (let i = 0; i < (controllerData.num_twelve_meters || 0); i++) {
        containersList.push({
          id: containerId++,
          containerKey: null, // New container, no key yet
          containerNum: "",
          weight: "",
          containerType: "12m",
        })
      }

      // Add abnormal containers
      for (let i = 0; i < (controllerData.num_abnormal || 0); i++) {
        containersList.push({
          id: containerId++,
          containerKey: null, // New container, no key yet
          containerNum: "",
          weight: "",
          containerType: "Abnormal",
        })
      }

      setContainers(containersList)
      setIsLoading(false)
    }
  }

  // Handle back button click
  const handleBackClick = () => {
    // Navigate back to BMcontrollerinstructions with the instructionId
    navigate("/BMcontrollerinstructions", {
      state: {
        instructionId: instructionId,
      },
    })
  }

  // Style for non-editable fields
  const nonEditableStyle = {
    backgroundColor: "#f0f0f0",
    cursor: "not-allowed",
    opacity: 0.7,
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

      {/* Success Message */}
      {successMessage && (
        <div
          className="success-message"
          style={{
            backgroundColor: "#d4edda",
            color: "#155724",
            padding: "10px",
            borderRadius: "4px",
            margin: "10px 0",
            textAlign: "center",
          }}
        >
          {successMessage}
        </div>
      )}

      <div className="container-details-wrapper">
        <div className="content">
          <br />

          {isLoading ? (
            <div style={{ textAlign: "center", padding: "20px" }}>
              <p>Loading container data...</p>
            </div>
          ) : (
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
                          readOnly
                          className="container-input"
                          style={nonEditableStyle}
                        />
                      </td>
                      {isImport && (
                        <td>
                          <input
                            type="text"
                            value={container.weight}
                            readOnly
                            className="container-input"
                            style={nonEditableStyle}
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default BMcontrollerInstructionDetails

