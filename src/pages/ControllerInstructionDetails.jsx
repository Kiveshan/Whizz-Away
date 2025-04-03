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
  const { controllerData, isImport, instructionId, clientId, clientName, selectedMonth, selectedYear, activeFilter } =
    location.state || {
      controllerData: null,
      isImport: false,
      instructionId: null,
      clientId: null,
      clientName: null,
      selectedMonth: null,
      selectedYear: null,
      activeFilter: null,
    }

  // Log the received state for debugging
  console.log("ControllerInstructionDetails received state:", location.state)
  console.log("ControllerInstructionDetails - clientId:", clientId)
  console.log("ControllerInstructionDetails - clientName:", clientName)
  console.log("ControllerInstructionDetails - selectedMonth:", selectedMonth)
  console.log("ControllerInstructionDetails - selectedYear:", selectedYear)
  console.log("ControllerInstructionDetails - activeFilter:", activeFilter)

  // State for container data
  const [containers, setContainers] = useState([])
  const [originalContainers, setOriginalContainers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [successMessage, setSuccessMessage] = useState("")

  // State for error modal
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    message: "",
  })

  // Add this function to calculate total cost
  const calculateTotalCost = () => {
    if (!controllerData || !controllerData.rate) return 0

    const rate = Number.parseFloat(controllerData.rate)
    if (isNaN(rate)) return 0

    if (controllerData.rateWeight === "Container") {
      // For Container: rate × total_number_of_containers
      const totalContainers =
        controllerData.num_six_meters + controllerData.num_twelve_meters + controllerData.num_abnormal
      return rate * totalContainers
    } else {
      // For kg or m³: rate × weight_value
      const weight = Number.parseFloat(controllerData.weight)
      if (isNaN(weight)) return 0
      return rate * weight
    }
  }

  // Fetch existing containers if instructionId is provided
  useEffect(() => {
    if (instructionId) {
      fetchContainers(instructionId)
    } else if (controllerData) {
      initializeContainers()
    } else {
      // Redirect back if no data - pass all state back
      navigate("/ControllerInstructions", {
        state: {
          clientId,
          clientName,
          selectedMonth,
          selectedYear,
          activeFilter,
        },
      })
    }
  }, [instructionId, controllerData, navigate, clientId, clientName, selectedMonth, selectedYear, activeFilter])

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
        setOriginalContainers([...updatedContainersList])
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
          weight: isImport ? "" : null,
          containerType: "6m",
        })
      }

      // Add 12m containers
      for (let i = 0; i < (controllerData.num_twelve_meters || 0); i++) {
        containersList.push({
          id: containerId++,
          containerKey: null, // New container, no key yet
          containerNum: "",
          weight: isImport ? "" : null,
          containerType: "12m",
        })
      }

      // Add abnormal containers
      for (let i = 0; i < (controllerData.num_abnormal || 0); i++) {
        containersList.push({
          id: containerId++,
          containerKey: null, // New container, no key yet
          containerNum: "",
          weight: isImport ? "" : null,
          containerType: "Abnormal",
        })
      }

      setContainers(containersList)
      setOriginalContainers([...containersList])
      setIsLoading(false)
    } else {
      // Redirect back if no data
      navigate("/ControllerInstructions")
    }
  }

  // Count containers by type
  const countContainersByType = () => {
    const counts = {
      "6m": 0,
      "12m": 0,
      Abnormal: 0,
    }

    containers.forEach((container) => {
      counts[container.containerType]++
    })

    return counts
  }

  // Handle container input change
  const handleContainerChange = (id, field, value) => {
    setContainers((prevContainers) =>
      prevContainers.map((container) => (container.id === id ? { ...container, [field]: value } : container)),
    )
  }

  // Update the handleAddContainer function to recalculate total_cost
  const handleAddContainer = (containerType) => {
    setContainers((prevContainers) => [
      ...prevContainers,
      {
        id: prevContainers.length + 1,
        containerKey: null, // New container, no key yet
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

      // Recalculate total_cost if rateWeight is Container
      if (controllerData.rateWeight === "Container") {
        controllerData.total_cost = calculateTotalCost()
      }
    }
  }

  // Update the handleDeleteContainer function to recalculate total_cost
  const handleDeleteContainer = (id) => {
    const containerToDelete = containers.find((container) => container.id === id)

    setContainers((prevContainers) => {
      const filteredContainers = prevContainers.filter((container) => container.id !== id)

      // Reassign IDs to maintain sequential order
      return filteredContainers.map((container, index) => ({
        ...container,
        id: index + 1,
      }))
    })

    // Update container counts in controllerData
    if (controllerData && containerToDelete) {
      if (containerToDelete.containerType === "6m") {
        controllerData.num_six_meters = Math.max(0, (controllerData.num_six_meters || 0) - 1)
      } else if (containerToDelete.containerType === "12m") {
        controllerData.num_twelve_meters = Math.max(0, (controllerData.num_twelve_meters || 0) - 1)
      } else if (containerToDelete.containerType === "Abnormal") {
        controllerData.num_abnormal = Math.max(0, (controllerData.num_abnormal || 0) - 1)
      }

      // Recalculate total_cost if rateWeight is Container
      if (controllerData.rateWeight === "Container") {
        controllerData.total_cost = calculateTotalCost()
      }
    }
  }

  // Validate containers
  const validateContainers = () => {
    // Validate container counts match the specified counts in controllerData
    const counts = countContainersByType()

    if (counts["6m"] !== (controllerData.num_six_meters || 0)) {
      setErrorModal({
        isOpen: true,
        message: `The number of 6m containers (${counts["6m"]}) does not match the specified count (${controllerData.num_six_meters || 0}).`,
      })
      return false
    }

    if (counts["12m"] !== (controllerData.num_twelve_meters || 0)) {
      setErrorModal({
        isOpen: true,
        message: `The number of 12m containers (${counts["12m"]}) does not match the specified count (${controllerData.num_twelve_meters || 0}).`,
      })
      return false
    }

    if (counts["Abnormal"] !== (controllerData.num_abnormal || 0)) {
      setErrorModal({
        isOpen: true,
        message: `The number of Abnormal containers (${counts["Abnormal"]}) does not match the specified count (${controllerData.num_abnormal || 0}).`,
      })
      return false
    }

    // Validate container numbers
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

  // Handle back button click - preserve form data and pass all state back
  const handleBackClick = () => {
    // Update container counts in controllerData based on actual containers
    if (controllerData) {
      const counts = countContainersByType()
      controllerData.num_six_meters = counts["6m"]
      controllerData.num_twelve_meters = counts["12m"]
      controllerData.num_abnormal = counts["Abnormal"]
    }

    // Navigate back to ControllerInstructions with the updated form data and all state parameters
    navigate("/ControllerInstructions", {
      state: {
        preservedFormData: controllerData,
        instructionId: instructionId,
        clientId: clientId,
        clientName: clientName,
        selectedMonth: selectedMonth,
        selectedYear: selectedYear,
        activeFilter: activeFilter,
      },
    })
  }

  // Format date from MM/DD/YYYY to ISO
  const formatDateForSubmission = (displayDate) => {
    if (!displayDate) return ""
    const [month, day, year] = displayDate.split("/")
    return `${year}-${month}-${day}`
  }

  // Format time from hh:mm AM/PM to HH:MM:SS
  const formatTimeForSubmission = (displayTime) => {
    if (!displayTime) return ""
    const [timePart, ampm] = displayTime.split(" ")
    let [hours, minutes] = timePart.split(":")
    hours = Number.parseInt(hours, 10)

    if (ampm === "PM" && hours < 12) {
      hours += 12
    } else if (ampm === "AM" && hours === 12) {
      hours = 0
    }

    return `${hours.toString().padStart(2, "0")}:${minutes}:00`
  }

  // Add this debugging function to log all properties of controllerData
  const logControllerData = () => {
    console.log("ControllerData properties:")
    for (const key in controllerData) {
      console.log(`${key}: ${controllerData[key]}`)
    }
  }

  // Update the handleSubmit function to ensure total_cost is calculated and properly formatted
  const handleSubmit = async () => {
    if (!validateContainers()) {
      return
    }

    try {
      // Ensure total_cost and weight are properly set in controllerData
      if (controllerData.rateWeight === "Container") {
        controllerData.total_cost = calculateTotalCost()
        controllerData.weight = null // Set weight to null for Container rate
      } else {
        // For kg or m³, ensure weight is a valid number
        if (!controllerData.weight || isNaN(Number.parseFloat(controllerData.weight))) {
          setErrorModal({
            isOpen: true,
            message: `Weight must be provided when rate is per ${controllerData.rateWeight}`,
          })
          return
        }
        controllerData.total_cost = calculateTotalCost()
      }

      // Log all properties of controllerData for debugging
      logControllerData()

      // Log the values for debugging
      console.log("Before API call - total_cost:", controllerData.total_cost)
      console.log("Before API call - weight:", controllerData.weight)

      // Prepare data for API with explicit total_cost and weight
      const data = {
        controllerData: {
          ...controllerData,
          // Ensure these fields are explicitly included and properly formatted
          total_cost: Number.parseFloat(controllerData.total_cost || 0),
          weight: controllerData.rateWeight !== "Container" ? Number.parseFloat(controllerData.weight || 0) : null,
        },
        containerData: containers.map((container) => ({
          containerNum: container.containerNum,
          weight: isImport ? Number.parseFloat(container.weight || 0) : null,
        })),
      }

      console.log("Sending data to API:", JSON.stringify(data, null, 2))

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
                    <th>Actions</th>
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
                      <td>
                        <button
                          onClick={() => handleDeleteContainer(container.id)}
                          className="delete-button"
                          style={{
                            backgroundColor: "#dc3545",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            padding: "5px 10px",
                            cursor: "pointer",
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

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

