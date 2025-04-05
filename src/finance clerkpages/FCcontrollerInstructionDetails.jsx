"use client"

import { useState, useEffect } from "react"
import "../css/containerdetails.css"
import { useNavigate, useLocation } from "react-router-dom"
import "../css/components.css"
import ErrorModal from "../components/ErrorModal"
import API_CONFIG from "../utils/api-config"

const FCcontrollerInstructionDetails = () => {
  const navigate = useNavigate()
  const location = useLocation()

  // API base URL from config
  const API_BASE_URL = API_CONFIG.BASE_URL

  // Get data from location state - extract ALL parameters
  const {
    controllerData,
    isImport,
    instructionId,
    clientId,
    clientName,
    selectedMonth,
    selectedYear,
    activeFilter,
    preservedContainers, // Add this to receive preserved containers when coming back
  } = location.state || {
    controllerData: null,
    isImport: false,
    instructionId: null,
    clientId: null,
    clientName: null,
    selectedMonth: null,
    selectedYear: null,
    activeFilter: null,
    preservedContainers: null,
  }

  // Log the received state for debugging
  console.log("FCcontrollerInstructionDetails received state:", location.state)
  console.log("FCcontrollerInstructionDetails - clientId:", clientId)
  console.log("FCcontrollerInstructionDetails - clientName:", clientName)
  console.log("FCcontrollerInstructionDetails - selectedMonth:", selectedMonth)
  console.log("FCcontrollerInstructionDetails - selectedYear:", selectedYear)
  console.log("FCcontrollerInstructionDetails - activeFilter:", activeFilter)
  console.log("FCcontrollerInstructionDetails - preservedContainers:", preservedContainers)

  // State for container data
  const [containers, setContainers] = useState([])
  const [originalContainers, setOriginalContainers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [successMessage, setSuccessMessage] = useState("")

  // State to track if data has been modified
  const [isDataModified, setIsDataModified] = useState(false)

  // State to store the updated controller data
  const [updatedControllerData, setUpdatedControllerData] = useState(controllerData || {})

  // State for error modal
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    message: "",
  })

  // Mock functions for now - replace with actual implementations
  const validateContainers = () => {
    // Implement your validation logic here
    return true // Placeholder
  }

  const formatTimeForSubmission = (time) => {
    if (!time) return null
    const [timePart, ampm] = time.split(" ")
    let [hours, minutes] = timePart.split(":")
    hours = Number.parseInt(hours, 10)

    if (ampm === "PM" && hours < 12) {
      hours += 12
    } else if (ampm === "AM" && hours === 12) {
      hours = 0
    }

    return `${hours.toString().padStart(2, "0")}:${minutes}:00`
  }

  const formatDateForSubmission = (displayDate) => {
    if (!displayDate) return null
    const [month, day, year] = displayDate.split("/")
    return `${year}-${month}-${day}`
  }

  // Add beforeunload event listener to warn when navigating away with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDataModified) {
        // Standard way of showing a confirmation dialog
        e.preventDefault()
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?"
        return "You have unsaved changes. Are you sure you want to leave?"
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [isDataModified])

  // Updated handleBackClick to NOT save changes to the database, but pass the full container data
  const handleBackClick = () => {
    // Create state object with all necessary parameters including the updated data
    // but DO NOT save to database
    const stateToPass = {
      preservedFormData: updatedControllerData,
      instructionId: instructionId,
      clientId: clientId,
      clientName: clientName,
      selectedMonth: selectedMonth,
      selectedYear: selectedYear,
      activeFilter: activeFilter,
      // Pass the updated container counts
      containerCounts: {
        num_six_meters: updatedControllerData.num_six_meters,
        num_twelve_meters: updatedControllerData.num_twelve_meters,
        num_abnormal: updatedControllerData.num_abnormal,
      },
      // Pass the full container data to preserve it
      preservedContainers: containers,
    }

    console.log("Navigating back to FCcontrollerinstructions with state:", stateToPass)

    // Navigate back to the form with the updated state
    navigate("/FCcontrollerinstructions", { state: stateToPass })
  }

  // Fetch existing containers if instructionId is provided
  useEffect(() => {
    // If we have preserved containers from navigation, use those but sync with current counts
    if (preservedContainers && preservedContainers.length > 0) {
      console.log("Using preserved containers from navigation:", preservedContainers)
      // Sync preserved containers with the current container counts
      const syncedContainers = syncContainersWithCounts(preservedContainers)
      setContainers(syncedContainers)
      setOriginalContainers([...syncedContainers])
      setIsLoading(false)
      // Mark data as modified if container counts have changed
      if (hasContainerCountsChanged(preservedContainers, controllerData)) {
        setIsDataModified(true)
      }
    }
    // Otherwise, fetch from database or initialize
    else if (instructionId) {
      fetchContainers(instructionId)
    } else if (controllerData) {
      initializeContainers()
      // Mark data as modified if this is a new set of containers
      setIsDataModified(true)
    } else {
      // Redirect back if no data - pass all state back
      navigate("/FCcontrollerinstructions", {
        state: {
          clientId,
          clientName,
          selectedMonth,
          selectedYear,
          activeFilter,
        },
      })
    }

    // Initialize the updatedControllerData with the received controllerData
    if (controllerData) {
      setUpdatedControllerData(controllerData)
    }
  }, [
    instructionId,
    controllerData,
    navigate,
    clientId,
    clientName,
    selectedMonth,
    selectedYear,
    activeFilter,
    preservedContainers,
  ])

  // Check if container counts have changed
  const hasContainerCountsChanged = (containers, controllerData) => {
    if (!controllerData) return false

    const counts = {
      "6m": 0,
      "12m": 0,
      Abnormal: 0,
    }

    containers.forEach((container) => {
      counts[container.containerType]++
    })

    return (
      counts["6m"] !== (controllerData.num_six_meters || 0) ||
      counts["12m"] !== (controllerData.num_twelve_meters || 0) ||
      counts["Abnormal"] !== (controllerData.num_abnormal || 0)
    )
  }

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

        // Check if container counts have changed from what's in the database
        if (hasContainerCountsChanged(updatedContainersList, controllerData)) {
          setIsDataModified(true)
        }
      } else {
        // If no containers found, initialize based on controllerData
        initializeContainers()
        // Mark as modified since we're creating new containers
        setIsDataModified(true)
      }
    } catch (error) {
      console.error("Error fetching containers:", error)
      // If error, initialize based on controllerData
      initializeContainers()
      // Mark as modified since we're creating new containers
      setIsDataModified(true)
    } finally {
      setIsLoading(false)
    }
  }

  // Sync containers with the counts from controllerData
  const syncContainersWithCounts = (containersList) => {
    if (!updatedControllerData) return containersList

    const sixMCount = updatedControllerData.num_six_meters || 0
    const twelveMCount = updatedControllerData.num_twelve_meters || 0
    const abnormalCount = updatedControllerData.num_abnormal || 0

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

    // Remove excess containers if needed
    if (
      currentCounts["6m"] > sixMCount ||
      currentCounts["12m"] > twelveMCount ||
      currentCounts["Abnormal"] > abnormalCount
    ) {
      // First, separate containers by type
      const containersByType = {
        "6m": [],
        "12m": [],
        Abnormal: [],
      }

      result.forEach((container) => {
        containersByType[container.containerType].push(container)
      })

      // For each type, sort by empty first, then remove excess
      const processContainerType = (type, targetCount) => {
        // Sort containers: empty ones first
        containersByType[type].sort((a, b) => {
          const aEmpty = !a.containerNum && !a.weight
          const bEmpty = !b.containerNum && !b.weight
          if (aEmpty && !bEmpty) return -1
          if (!aEmpty && bEmpty) return 1
          return 0
        })

        // Keep only the target count
        containersByType[type] = containersByType[type].slice(0, targetCount)
      }

      processContainerType("6m", sixMCount)
      processContainerType("12m", twelveMCount)
      processContainerType("Abnormal", abnormalCount)

      // Combine all containers back together
      result = [...containersByType["6m"], ...containersByType["12m"], ...containersByType["Abnormal"]]
    }

    // Reassign IDs to maintain sequential order
    return result.map((container, index) => ({
      ...container,
      id: index + 1,
    }))
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
    if (updatedControllerData) {
      const containersList = []
      let containerId = 1

      // Add 6m containers
      for (let i = 0; i < (updatedControllerData.num_six_meters || 0); i++) {
        containersList.push({
          id: containerId++,
          containerKey: null, // New container, no key yet
          containerNum: "",
          weight: "",
          containerType: "6m",
        })
      }

      // Add 12m containers
      for (let i = 0; i < (updatedControllerData.num_twelve_meters || 0); i++) {
        containersList.push({
          id: containerId++,
          containerKey: null, // New container, no key yet
          containerNum: "",
          weight: "",
          containerType: "12m",
        })
      }

      // Add abnormal containers
      for (let i = 0; i < (updatedControllerData.num_abnormal || 0); i++) {
        containersList.push({
          id: containerId++,
          containerKey: null, // New container, no key yet
          containerNum: "",
          weight: "",
          containerType: "Abnormal",
        })
      }

      setContainers(containersList)
      setOriginalContainers([...containersList])
      setIsLoading(false)
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
    setIsDataModified(true)
  }

  // Add this function to calculate total cost
  const calculateTotalCost = () => {
    if (!updatedControllerData || !updatedControllerData.rate) return 0

    const rate = Number.parseFloat(updatedControllerData.rate)
    if (isNaN(rate)) return 0

    if (updatedControllerData.rateWeight === "Container") {
      // For Container: rate × total_number_of_containers
      const totalContainers =
        updatedControllerData.num_six_meters +
        updatedControllerData.num_twelve_meters +
        updatedControllerData.num_abnormal
      return rate * totalContainers
    } else {
      // For kg or m³: rate × weight_value
      const weight = Number.parseFloat(updatedControllerData.weight)
      if (isNaN(weight)) return 0
      return rate * weight
    }
  }

  // Update the handleAddContainer function to only update local state, not the database
  const handleAddContainer = (containerType) => {
    // Add container to local state
    setContainers((prevContainers) => [
      ...prevContainers,
      {
        id: prevContainers.length + 1,
        containerKey: null, // New container, no key yet
        containerNum: "",
        weight: "",
        containerType: containerType,
      },
    ])

    // Update container counts in updatedControllerData
    setUpdatedControllerData((prevData) => {
      const newData = { ...prevData }

      if (containerType === "6m") {
        newData.num_six_meters = (newData.num_six_meters || 0) + 1
      } else if (containerType === "12m") {
        newData.num_twelve_meters = (newData.num_twelve_meters || 0) + 1
      } else if (containerType === "Abnormal") {
        newData.num_abnormal = (newData.num_abnormal || 0) + 1
      }

      // Recalculate total_cost if rateWeight is Container
      if (newData.rateWeight === "Container") {
        const rate = Number.parseFloat(newData.rate)
        if (!isNaN(rate)) {
          const totalContainers = newData.num_six_meters + newData.num_twelve_meters + newData.num_abnormal
          newData.total_cost = rate * totalContainers
        }
      }

      return newData
    })

    setIsDataModified(true)
  }

  // Update the handleDeleteContainer function to only update local state, not the database
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

    // Update container counts in updatedControllerData
    if (containerToDelete) {
      setUpdatedControllerData((prevData) => {
        const newData = { ...prevData }

        if (containerToDelete.containerType === "6m") {
          newData.num_six_meters = Math.max(0, (newData.num_six_meters || 0) - 1)
        } else if (containerToDelete.containerType === "12m") {
          newData.num_twelve_meters = Math.max(0, (newData.num_twelve_meters || 0) - 1)
        } else if (containerToDelete.containerType === "Abnormal") {
          newData.num_abnormal = Math.max(0, (newData.num_abnormal || 0) - 1)
        }

        // Recalculate total_cost if rateWeight is Container
        if (newData.rateWeight === "Container") {
          const rate = Number.parseFloat(newData.rate)
          if (!isNaN(rate)) {
            const totalContainers = newData.num_six_meters + newData.num_twelve_meters + newData.num_abnormal
            newData.total_cost = rate * totalContainers
          }
        }

        return newData
      })
    }

    setIsDataModified(true)
  }

  // Function to save changes to the database
  const saveChangesToDatabase = async () => {
    if (!instructionId) {
      throw new Error("No instruction ID provided")
    }

    // Ensure total_cost is calculated
    const finalControllerData = { ...updatedControllerData }

    if (finalControllerData.rateWeight === "Container") {
      finalControllerData.total_cost = calculateTotalCost()
      finalControllerData.weight = null // Set weight to null for Container rate
    } else {
      // For kg or m³, ensure weight is a valid number
      if (!finalControllerData.weight || isNaN(Number.parseFloat(finalControllerData.weight))) {
        throw new Error(`Please enter a valid weight for ${finalControllerData.rateWeight} rate`)
      }
      finalControllerData.total_cost = calculateTotalCost()
    }

    // First, update the instruction data
    const instructionData = {
      client: Number.parseInt(finalControllerData.clientId),
      task: finalControllerData.task,
      shipment_type: Number.parseInt(finalControllerData.shipmentTypeId),
      pickup: finalControllerData.pickup,
      dropoff: finalControllerData.dropoff,
      hazardous: finalControllerData.hazardous,
      surchages: finalControllerData.surcharges,
      pickuptime: formatTimeForSubmission(finalControllerData.pickupTime),
      pickupdate: formatDateForSubmission(finalControllerData.pickupDate),
      stackdate: formatDateForSubmission(finalControllerData.stackDate),
      deadline: formatDateForSubmission(finalControllerData.deadline),
      fileref: finalControllerData.fileRef,
      rateweight: finalControllerData.rateWeight,
      rate: Number.parseFloat(finalControllerData.rate),
      description: finalControllerData.description,
      status: finalControllerData.status || "In Progress",
      vat: finalControllerData.vat,
      num_six_meters: finalControllerData.num_six_meters,
      num_twelve_meters: finalControllerData.num_twelve_meters,
      num_abnormal: finalControllerData.num_abnormal,
      weight: finalControllerData.rateWeight === "Container" ? null : Number.parseFloat(finalControllerData.weight),
      total_cost: Number.parseFloat(finalControllerData.total_cost),
    }

    console.log("Updating instruction data:", instructionData)

    // Update instruction
    const instructionResponse = await fetch(`${API_BASE_URL}/api/instruction/${instructionId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(instructionData),
    })

    if (!instructionResponse.ok) {
      const errorData = await instructionResponse.json()
      throw new Error(errorData.error || "Failed to update instruction")
    }

    console.log("Instruction updated successfully")

    // Now handle container data
    // Prepare container data for API
    const containerData = containers.map((container) => ({
      containerkey: container.containerKey, // Will be null for new containers
      containernum: Number.parseInt(container.containerNum) || 0,
      weight: isImport ? (container.weight ? Number.parseFloat(container.weight) : null) : null,
      m1key: instructionId,
    }))

    console.log("Sending container data to API:", containerData)

    // Send container data to API
    const containerResponse = await fetch(`${API_BASE_URL}/api/containers/${instructionId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(containerData),
    })

    if (!containerResponse.ok) {
      const errorText = await containerResponse.text()
      console.error("API error response:", errorText)
      throw new Error(`Failed to save containers: ${containerResponse.status} ${containerResponse.statusText}`)
    }

    const result = await containerResponse.json()
    console.log("API response:", result)

    // Update the updatedControllerData with the final values
    setUpdatedControllerData(finalControllerData)
    setIsDataModified(false)

    return result
  }

  // Update the handleSubmit function to ensure total_cost is calculated
  const handleSubmit = async () => {
    if (!validateContainers()) {
      return
    }

    try {
      const result = await saveChangesToDatabase()

      setSuccessMessage("Changes saved successfully!")

      // Clear success message after 3 seconds and navigate back to instructions with all state
      setTimeout(() => {
        setSuccessMessage("")
        navigate("/instructions", {
          state: {
            clientId,
            clientName,
            selectedMonth,
            selectedYear,
            activeFilter,
          },
        })
      }, 3000)
    } catch (error) {
      console.error("Error saving data:", error)
      setErrorModal({
        isOpen: true,
        message: error.message || "Failed to save changes. Please try again.",
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

      {/* Removed the unsaved changes notification as requested */}

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
            <button
              className="submit-button"
              onClick={handleSubmit}
              style={{
                backgroundColor: "#28a745", // Always green as requested
                color: "white",
                border: "none",
                borderRadius: "4px",
                padding: "10px 20px",
                fontSize: "16px",
                cursor: "pointer",
                transition: "background-color 0.3s ease",
              }}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default FCcontrollerInstructionDetails

