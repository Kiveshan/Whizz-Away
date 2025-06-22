"use client"

import { useState, useEffect } from "react"
import "../../css/containerdetails.css"
import { useNavigate, useLocation } from "react-router-dom"
import "../../../../css/components.css"
import ErrorModal from "../../../../components/ErrorModal.jsx"
import api from "../../../../api" // Import the axios instance

// Add this debug logging function at the top of the file, after imports
const logDebug = (message, data) => {
  console.log(`[FCcontrollerInstructionDetails] ${message}:`, data)
}

const FCcontrollerInstructionDetails = () => {
  const navigate = useNavigate()
  const location = useLocation()

  // Get data from location state
  const {
    controllerData,
    isImport,
    instructionId,
    clientId,
    clientName,
    selectedMonth,
    selectedYear,
    activeFilter,
    preservedContainers, // Check for preserved containers
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
  console.log("FCcontrollerInstructionDetails - controllerData:", controllerData)
  console.log("FCcontrollerInstructionDetails - container counts:", {
    "6m": controllerData?.num_six_meters || 0,
    "12m": controllerData?.num_twelve_meters || 0,
    Abnormal: controllerData?.num_abnormal || 0,
  })
  console.log("FCcontrollerInstructionDetails - preservedContainers:", preservedContainers)

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

  // State for field validation errors
  const [fieldErrors, setFieldErrors] = useState({})

  // Add a new state variable to track controller data changes
  const [updatedControllerData, setUpdatedControllerData] = useState(controllerData || {})

  // Add a state to track if data has been modified
  const [isDataModified, setIsDataModified] = useState(false)

  // Initialize containers based on container counts
  const initializeContainers = () => {
    if (updatedControllerData) {
      const containersList = []
      let containerId = 1

      console.log("Initializing containers with counts:", {
        "6m": updatedControllerData.num_six_meters || 0,
        "12m": updatedControllerData.num_twelve_meters || 0,
        Abnormal: updatedControllerData.num_abnormal || 0,
      })

      // Add 6m containers
      for (let i = 0; i < (updatedControllerData.num_six_meters || 0); i++) {
        containersList.push({
          id: containerId++,
          containerKey: null, // New container, no key yet
          containerNum: "",
          weight: isImport ? "" : null,
          containerType: "6m",
          cargoDescription: "", // Add cargo description field
        })
      }

      // Add 12m containers
      for (let i = 0; i < (updatedControllerData.num_twelve_meters || 0); i++) {
        containersList.push({
          id: containerId++,
          containerKey: null, // New container, no key yet
          containerNum: "",
          weight: isImport ? "" : null,
          containerType: "12m",
          cargoDescription: "", // Add cargo description field
        })
      }

      // Add abnormal containers
      for (let i = 0; i < (updatedControllerData.num_abnormal || 0); i++) {
        containersList.push({
          id: containerId++,
          containerKey: null, // New container, no key yet
          containerNum: "",
          weight: isImport ? "" : null,
          containerType: "Abnormal",
          cargoDescription: "", // Add cargo description field
        })
      }

      setContainers(containersList)
      setOriginalContainers([...containersList])
      setIsLoading(false)
    } else {
      // Redirect back if no data
      navigate("/FCcontrollerinstructions")
    }
  }

  // Fetch existing containers if instructionId is provided
  useEffect(() => {
    if (controllerData) {
      // Initialize updatedControllerData with controllerData
      setUpdatedControllerData(controllerData)
    }

    if (preservedContainers) {
      // Use preserved containers if available
      console.log("Using preserved containers:", preservedContainers)

      // Ensure the number of containers matches the counts in controllerData
      const syncedContainers = syncContainersWithCounts(preservedContainers)

      setContainers(syncedContainers)
      setOriginalContainers([...syncedContainers])
      setIsLoading(false)
    } else if (instructionId) {
      fetchContainers(instructionId)
    } else if (controllerData) {
      // Force a re-initialization when controllerData changes
      initializeContainers()
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

  // Re-initialize containers when updatedControllerData changes
  useEffect(() => {
    if (!preservedContainers && !instructionId && updatedControllerData) {
      initializeContainers()
    }
  }, [updatedControllerData, preservedContainers, instructionId])

  // Fetch containers for the given instruction ID using existing MVC endpoint
  const fetchContainers = async (id) => {
    setIsLoading(true)
    try {
      console.log(`Fetching containers for instruction ID: ${id}`)

      // Use the existing MVC endpoint from instructionRoute.js
      const response = await api.get(`/api/containers/${id}`)

      console.log("Containers data received:", response.data)

      if (response.data && response.data.length > 0) {
        // Map container data to our format
        const containersList = response.data.map((container, index) => ({
          id: index + 1,
          containerKey: container.containerkey,
          containerNum: container.containernum ? container.containernum.toString() : "",
          weight: container.weight !== null ? container.weight.toString() : "",
          containerType: container.container_type || "Unknown",
          cargoDescription: container.cargo_description || "", // Add cargo description field
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

      // Handle axios error response
      if (error.response && error.response.status === 404) {
        console.log("No containers found, initializing from controller data")
        initializeContainers()
        return
      }

      // If error, initialize based on controllerData
      initializeContainers()
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
    let nextId = containersList.length > 0 ? Math.max(...containersList.map((c) => c.id)) + 1 : 1

    // Add missing containers
    for (let i = currentCounts["6m"]; i < sixMCount; i++) {
      result.push({
        id: nextId++,
        containerKey: null,
        containerNum: "",
        weight: isImport ? "" : null,
        containerType: "6m",
        cargoDescription: "", // Add cargo description field
      })
    }

    for (let i = currentCounts["12m"]; i < twelveMCount; i++) {
      result.push({
        id: nextId++,
        containerKey: null,
        containerNum: "",
        weight: isImport ? "" : null,
        containerType: "12m",
        cargoDescription: "", // Add cargo description field
      })
    }

    for (let i = currentCounts["Abnormal"]; i < abnormalCount; i++) {
      result.push({
        id: nextId++,
        containerKey: null,
        containerNum: "",
        weight: isImport ? "" : null,
        containerType: "Abnormal",
        cargoDescription: "", // Add cargo description field
      })
    }

    // Remove excess containers - remove the most recently added containers first
    if (
      currentCounts["6m"] > sixMCount ||
      currentCounts["12m"] > twelveMCount ||
      currentCounts["Abnormal"] > abnormalCount
    ) {
      // For each container type, keep only the required number
      // Sort containers by type and then by ID (to ensure we remove the most recently added first)
      const containersByType = {
        "6m": result.filter((c) => c.containerType === "6m").sort((a, b) => a.id - b.id),
        "12m": result.filter((c) => c.containerType === "12m").sort((a, b) => a.id - b.id),
        Abnormal: result.filter((c) => c.containerType === "Abnormal").sort((a, b) => a.id - b.id),
      }

      // Keep only the required number of each type
      const filteredContainers = [
        ...containersByType["6m"].slice(0, sixMCount),
        ...containersByType["12m"].slice(0, twelveMCount),
        ...containersByType["Abnormal"].slice(0, abnormalCount),
      ]

      // Sort by ID to maintain the original order
      result = filteredContainers.sort((a, b) => a.id - b.id)
    }

    // Reassign IDs to maintain sequential order
    return result.map((container, index) => ({
      ...container,
      id: index + 1,
    }))
  }

  // Handle container input change with real-time validation
  const handleContainerChange = (id, field, value) => {
    if (field === "containerNum") {
      // Get the current container
      const container = containers.find((c) => c.id === id)
      const currentValue = container ? container.containerNum : ""

      // For container numbers, enforce the format: 4 letters followed by 7 numbers
      if (value.length > 11) {
        // Prevent entering more than 11 characters
        return
      }

      // Create a new value by validating each character
      let newValue = ""
      for (let i = 0; i < value.length; i++) {
        const char = value[i]
        if (i < 4) {
          // First 4 positions: only allow letters
          if (/^[a-zA-Z]$/.test(char)) {
            newValue += char
          }
        } else {
          // Positions 5-11: only allow numbers
          if (/^[0-9]$/.test(char)) {
            newValue += char
          }
        }
      }

      // Only update if the filtered value is different from the input
      if (newValue !== value) {
        return
      }

      // Real-time validation
      let error = null
      if (newValue.length > 0 && newValue.length < 11) {
        error = "Does not match correct format (ABCD1234567)"
      } else if (newValue.length === 11 && !/^[a-zA-Z]{4}[0-9]{7}$/.test(newValue)) {
        error = "Does not match correct format (ABCD1234567)"
      }

      // Update field errors
      setFieldErrors((prev) => ({
        ...prev,
        [`container-${id}`]: error,
      }))
    }

    // Update the container value
    setContainers((prevContainers) =>
      prevContainers.map((container) => (container.id === id ? { ...container, [field]: value } : container)),
    )
    setIsDataModified(true)

    // Clear any error for weight field
    if (field === "weight") {
      setFieldErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[`weight-${id}`]
        return newErrors
      })
    }
  }

  // Update the handleAddContainer function to use the state variable
  const handleAddContainer = (containerType) => {
    setContainers((prevContainers) => [
      ...prevContainers,
      {
        id: prevContainers.length + 1,
        containerKey: null, // New container, no key yet
        containerNum: "",
        weight: isImport ? "" : null,
        containerType: containerType,
        cargoDescription: "", // Add cargo description field
      },
    ])

    // Update container counts in updatedControllerData
    setUpdatedControllerData((prev) => {
      const updated = { ...prev }
      if (containerType === "6m") {
        updated.num_six_meters = (updated.num_six_meters || 0) + 1
      } else if (containerType === "12m") {
        updated.num_twelve_meters = (updated.num_twelve_meters || 0) + 1
      } else if (containerType === "Abnormal") {
        updated.num_abnormal = (updated.num_abnormal || 0) + 1
      }

      // Recalculate total_cost if rateWeight is Container
      if (updated.rateWeight === "Container") {
        const rate = Number.parseFloat(updated.rate)
        if (!isNaN(rate)) {
          const totalContainers = updated.num_six_meters + updated.num_twelve_meters + updated.num_abnormal
          updated.total_cost = rate * totalContainers
        }
      }

      return updated
    })
  }

  // Update the handleDeleteContainer function to use the state variable
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
      setUpdatedControllerData((prev) => {
        const updated = { ...prev }
        if (containerToDelete.containerType === "6m") {
          updated.num_six_meters = Math.max(0, (updated.num_six_meters || 0) - 1)
        } else if (containerToDelete.containerType === "12m") {
          updated.num_twelve_meters = Math.max(0, (updated.num_twelve_meters || 0) - 1)
        } else if (containerToDelete.containerType === "Abnormal") {
          updated.num_abnormal = Math.max(0, (updated.num_abnormal || 0) - 1)
        }

        // Recalculate total_cost if rateWeight is Container
        if (updated.rateWeight === "Container") {
          const rate = Number.parseFloat(updated.rate)
          if (!isNaN(rate)) {
            const totalContainers = updated.num_six_meters + updated.num_twelve_meters + updated.num_abnormal
            updated.total_cost = rate * totalContainers
          }
        }

        return updated
      })
    }

    // Clear any errors for this container
    setFieldErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[`container-${id}`]
      delete newErrors[`weight-${id}`]
      return newErrors
    })
  }

  // Validate containers with updated container number format validation
  const validateContainers = () => {
    // Validate container counts match the specified counts in updatedControllerData
    const counts = countContainersByType()
    const newErrors = {}
    let isValid = true

    if (counts["6m"] !== (updatedControllerData.num_six_meters || 0)) {
      setErrorModal({
        isOpen: true,
        message: `The number of 6m containers (${counts["6m"]}) does not match the specified count (${
          updatedControllerData.num_six_meters || 0
        }).`,
      })
      return false
    }

    if (counts["12m"] !== (updatedControllerData.num_twelve_meters || 0)) {
      setErrorModal({
        isOpen: true,
        message: `The number of 12m containers (${counts["12m"]}) does not match the specified count (${
          updatedControllerData.num_twelve_meters || 0
        }).`,
      })
      return false
    }

    if (counts["Abnormal"] !== (updatedControllerData.num_abnormal || 0)) {
      setErrorModal({
        isOpen: true,
        message: `The number of Abnormal containers (${counts["Abnormal"]}) does not match the specified count (${
          updatedControllerData.num_abnormal || 0
        }).`,
      })
      return false
    }

    // Validate container numbers and weights
    for (const container of containers) {
      if (!container.containerNum) {
        newErrors[`container-${container.id}`] = "Field is required"
        isValid = false
      }
      // Check container number format (11 chars: 4 letters followed by 7 numbers)
      else if (container.containerNum.length !== 11) {
        newErrors[`container-${container.id}`] = "Does not match correct format (ABCD1234567)"
        isValid = false
      } else if (!/^[a-zA-Z]{4}[0-9]{7}$/.test(container.containerNum)) {
        newErrors[`container-${container.id}`] = "Does not match correct format (ABCD1234567)"
        isValid = false
      }

      if (isImport && (container.weight === "" || container.weight === null)) {
        newErrors[`weight-${container.id}`] = "Field is required"
        isValid = false
      } else if (isImport && container.weight && !/^[0-9]*\.?[0-9]*$/.test(container.weight)) {
        newErrors[`weight-${container.id}`] = "Numbers only"
        isValid = false
      }
    }

    setFieldErrors(newErrors)
    return isValid
  }

  // Update the handleBackClick function to use the state variable
  const handleBackClick = () => {
    // Count current containers by type
    const counts = countContainersByType()

    // Update container counts in updatedControllerData
    const finalControllerData = {
      ...updatedControllerData,
      num_six_meters: counts["6m"],
      num_twelve_meters: counts["12m"],
      num_abnormal: counts["Abnormal"],
    }

    // Recalculate total_cost if rateWeight is Container
    if (finalControllerData.rateWeight === "Container") {
      const rate = Number.parseFloat(finalControllerData.rate)
      if (!isNaN(rate)) {
        const totalContainers = counts["6m"] + counts["12m"] + counts["Abnormal"]
        finalControllerData.total_cost = rate * totalContainers
      }
    }

    // Use the updated controller data for navigation
    console.log("Navigating back with updated container counts:", counts)
    console.log("Updated controller data:", finalControllerData)

    // Navigate back to FCcontrollerinstructions with the updated form data and all state parameters
    navigate("/FCcontrollerinstructions", {
      state: {
        preservedFormData: finalControllerData,
        preservedContainers: containers, // Add containers to state
        containerCounts: counts, // Explicitly pass counts
        instructionId: instructionId,
        clientId: clientId,
        clientName: clientName,
        selectedMonth: selectedMonth,
        selectedYear: selectedYear,
        activeFilter: activeFilter,
      },
    })
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

  // Update the handleSubmit function to use existing MVC endpoints
  const handleSubmit = async () => {
    // Validate containers first
    if (!validateContainers()) {
      // Don't show error modal for field validation errors
      // The tooltips will be displayed instead
      return
    }

    try {
      // Create a copy of updatedControllerData for submission
      const submissionData = { ...updatedControllerData }

      // Ensure total_cost and weight are properly set
      if (submissionData.rateWeight === "Container") {
        submissionData.total_cost = calculateTotalCost()
        submissionData.weight = null // Set weight to null for Container rate
      } else {
        // For kg or m³, ensure weight is a valid number
        if (!submissionData.weight || isNaN(Number.parseFloat(submissionData.weight))) {
          setErrorModal({
            isOpen: true,
            message: `Weight must be provided when rate is per ${submissionData.rateWeight}`,
          })
          return
        }
        submissionData.total_cost = calculateTotalCost()
      }

      // Log the values for debugging
      console.log("Before API call - total_cost:", submissionData.total_cost)
      console.log("Before API call - weight:", submissionData.weight)

      // First update the instruction if needed
      if (instructionId) {
        const instructionUpdateData = {
          // Map frontend field names to backend field names
          client: Number.parseInt(submissionData.clientId) || 0,
          task: String(submissionData.task || ""),
          shipment_type: Number.parseInt(submissionData.shipmentTypeId) || 0,
          pickup: String(submissionData.pickup || ""),
          dropoff: String(submissionData.dropoff || ""),
          hazardous: Boolean(submissionData.hazardous),
          surchages: Boolean(submissionData.surchages), // Note: backend uses 'surchages' not 'surcharges'
          pickuptime: submissionData.pickupTime || null,
          pickupdate: submissionData.pickupDate || null,
          stackdate: submissionData.stackDate || null,
          deadline: submissionData.deadline || null,
          fileref: String(submissionData.fileRef || ""),
          rateweight: String(submissionData.rateWeight || ""),
          rate: Number.parseFloat(submissionData.rate) || 0,
          description: String(submissionData.description || ""),
          status: String(submissionData.status || "In Progress"),
          vat: Number.parseInt(submissionData.vat) || 15,
          num_six_meters: Number.parseInt(submissionData.num_six_meters) || 0,
          num_twelve_meters: Number.parseInt(submissionData.num_twelve_meters) || 0,
          num_abnormal: Number.parseInt(submissionData.num_abnormal) || 0,
          weight: submissionData.rateWeight !== "Container" ? Number.parseFloat(submissionData.weight || 0) : null,
          total_cost: Number.parseFloat(submissionData.total_cost || 0),
          // Shipping fields
          booking_ref: String(submissionData.bookingRef || ""),
          vessel_name: String(submissionData.vesselName || ""),
          voyage_num: String(submissionData.voyageNo || ""),
          imo_num: String(submissionData.imoNo || ""),
          flag_reg: String(submissionData.flagReg || ""),
        }

        console.log("Updating instruction with properly mapped data:", instructionUpdateData)

        // Use existing MVC endpoint from instructionRoute.js
        await api.put(`/api/instruction/${instructionId}`, instructionUpdateData)
      }

      // Prepare container data for API with explicit cargo_description
      const containerData = containers.map((container) => ({
        containernum: container.containerNum,
        weight: isImport ? Number.parseFloat(container.weight || 0) : null,
        container_type: container.containerType,
        cargo_description: container.cargoDescription || "", // Add cargo description field
      }))

      console.log("Sending container data to API:", JSON.stringify(containerData, null, 2))

      // Use existing MVC endpoint from instructionRoute.js
      const response = await api.post(`/api/containers/${instructionId}`, containerData)

      console.log("API response:", response.data)

      if (response.data.success) {
        // Show success message if using mock data
        if (response.data.mockData) {
          setErrorModal({
            isOpen: true,
            message: "Success! (Using mock data: " + response.data.message + ")",
            onClose: () => {
              // Navigate to FCcontrollerDashboard immediately after closing the modal
              setErrorModal({ isOpen: false, message: "" })
              navigate("/FDashboard")
            },
          })
        } else {
          // Navigate to FCcontrollerDashboard immediately
          navigate("/FDashboard")
        }
      } else {
        throw new Error("Failed to save instruction: " + (response.data.message || "Unknown error"))
      }
    } catch (error) {
      console.error("Error saving instruction:", error)

      let errorMessage = "Failed to save instruction. Please try again."

      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        const { status, data } = error.response
        errorMessage = data?.message || `HTTP error! Status: ${status}`
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage = "No response received from server. Please check your connection."
      } else {
        // Something happened in setting up the request that triggered an Error
        errorMessage = error.message
      }

      setErrorModal({
        isOpen: true,
        message: errorMessage,
      })
    }
  }

  // Tooltip component for field errors
  const ErrorTooltip = ({ message }) => {
    if (!message) return null

    return (
      <div className="error-tooltip">
        {message}
        <div className="tooltip-arrow"></div>
      </div>
    )
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
                    <th>Cargo Description</th> {/* Add new column header */}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {containers.map((container, index) => (
                    <tr key={container.id} className={index % 2 === 1 ? "even-row" : ""}>
                      <td>{container.id}</td>
                      <td>{container.containerType}</td>
                      <td className="input-cell">
                        <div className="input-wrapper">
                          <input
                            type="text"
                            value={container.containerNum}
                            onChange={(e) => {
                              const value = e.target.value
                              handleContainerChange(container.id, "containerNum", value)
                            }}
                            className={`container-input ${
                              fieldErrors[`container-${container.id}`] ? "error-field" : ""
                            }`}
                            placeholder="ABCD1234567"
                            maxLength={11}
                          />
                          {fieldErrors[`container-${container.id}`] && (
                            <ErrorTooltip message={fieldErrors[`container-${container.id}`]} />
                          )}
                        </div>
                      </td>
                      {isImport && (
                        <td className="input-cell">
                          <div className="input-wrapper">
                            <input
                              type="text"
                              value={container.weight}
                              onChange={(e) => {
                                const value = e.target.value
                                // Only allow numbers and decimal point
                                if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
                                  handleContainerChange(container.id, "weight", value)
                                }
                              }}
                              className={`container-input ${
                                fieldErrors[`weight-${container.id}`] ? "error-field" : ""
                              }`}
                              placeholder="Weight"
                            />
                            {fieldErrors[`weight-${container.id}`] && (
                              <ErrorTooltip message={fieldErrors[`weight-${container.id}`]} />
                            )}
                          </div>
                        </td>
                      )}
                      {/* Add new Cargo Description cell */}
                      <td className="input-cell">
                        <div className="input-wrapper">
                          <input
                            type="text"
                            value={container.cargoDescription}
                            onChange={(e) => {
                              handleContainerChange(container.id, "cargoDescription", e.target.value)
                            }}
                            className="container-input"
                            placeholder="Enter cargo description"
                          />
                        </div>
                      </td>
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
              Save changes 
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default FCcontrollerInstructionDetails
