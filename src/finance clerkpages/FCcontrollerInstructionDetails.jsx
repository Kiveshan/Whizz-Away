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
  const [isSubmitting, setIsSubmitting] = useState(false) // Add state to track submission

  // Remove the debug message state and all references to it
  // const [debugMessage, setDebugMessage] = useState("") // REMOVED

  // State to track if data has been modified
  const [isDataModified, setIsDataModified] = useState(false)

  // State to store the updated controller data
  const [updatedControllerData, setUpdatedControllerData] = useState(controllerData || {})

  // State for error modal
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    message: "",
  })

  // State for field validation errors
  const [fieldErrors, setFieldErrors] = useState({})

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

  // Updated validation function to check container number format
  const validateContainers = () => {
    let isValid = true
    const errors = {}

    containers.forEach((container) => {
      // Check if container number is empty
      if (!container.containerNum) {
        errors[`container-${container.id}`] = "Field is required"
        isValid = false
      }
      // Check container number format (11 chars: 4 letters followed by 7 numbers)
      else if (container.containerNum.length !== 11) {
        errors[`container-${container.id}`] = "Does not match correct format (ABCD1234567)"
        isValid = false
      } else if (!/^[a-zA-Z]{4}[0-9]{7}$/.test(container.containerNum)) {
        errors[`container-${container.id}`] = "Does not match correct format (ABCD1234567)"
        isValid = false
      }

      // Check weight field if this is an import
      if (isImport && (container.weight === "" || container.weight === null)) {
        errors[`weight-${container.id}`] = "Field is required"
        isValid = false
      } else if (isImport && container.weight && !/^[0-9]*\.?[0-9]*$/.test(container.weight)) {
        errors[`weight-${container.id}`] = "Numbers only"
        isValid = false
      }
    })

    setFieldErrors(errors)
    return isValid
  }

  const formatTimeForSubmission = (time) => {
    if (!time) return null
    try {
      // Handle different time formats
      if (time.includes(" ")) {
        // Format with AM/PM
        const [timePart, ampm] = time.split(" ")
        let [hours, minutes] = timePart.split(":")
        hours = Number.parseInt(hours, 10)

        if (ampm === "PM" && hours < 12) {
          hours += 12
        } else if (ampm === "AM" && hours === 12) {
          hours = 0
        }

        return `${hours.toString().padStart(2, "0")}:${minutes}:00`
      } else {
        // 24-hour format
        const [hours, minutes] = time.split(":")
        return `${hours}:${minutes}:00`
      }
    } catch (error) {
      console.error("Error formatting time:", error, time)
      return null
    }
  }

  const formatDateForSubmission = (displayDate) => {
    if (!displayDate) return null
    try {
      const [month, day, year] = displayDate.split("/")
      // Ensure all parts exist and are valid
      if (!month || !day || !year) return null
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
    } catch (error) {
      console.error("Error formatting date:", error, displayDate)
      return null
    }
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

  // Add this function to calculate total cost
  const calculateTotalCost = () => {
    if (!updatedControllerData || !updatedControllerData.rate) return 0

    const rate = Number.parseFloat(updatedControllerData.rate)
    if (isNaN(rate)) return 0

    if (updatedControllerData.rateWeight === "Container") {
      // For Container: rate × total_number_of_containers
      const totalContainers =
        (updatedControllerData.num_six_meters || 0) +
        (updatedControllerData.num_twelve_meters || 0) +
        (updatedControllerData.num_abnormal || 0)
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
          const totalContainers =
            (newData.num_six_meters || 0) + (newData.num_twelve_meters || 0) + (newData.num_abnormal || 0)
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
            const totalContainers =
              (newData.num_six_meters || 0) + (newData.num_twelve_meters || 0) + (newData.num_abnormal || 0)
            newData.total_cost = rate * totalContainers
          }
        }

        return newData
      })
    }

    setIsDataModified(true)

    // Clear any errors for this container
    setFieldErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[`container-${id}`]
      delete newErrors[`weight-${id}`]
      return newErrors
    })
  }

  // Function to save changes to the database
  const saveChangesToDatabase = async () => {
    try {
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

      // First, update the instruction data - with careful type handling
      const instructionData = {
        client: Number.parseInt(finalControllerData.clientId) || 0,
        task: String(finalControllerData.task || ""),
        shipment_type: Number.parseInt(finalControllerData.shipmentTypeId) || 0,
        pickup: String(finalControllerData.pickup || ""),
        dropoff: String(finalControllerData.dropoff || ""),
        hazardous: Boolean(finalControllerData.hazardous),
        surchages: Boolean(finalControllerData.surcharges),
        pickuptime: finalControllerData.pickupTime ? formatTimeForSubmission(finalControllerData.pickupTime) : null,
        pickupdate: finalControllerData.pickupDate ? formatDateForSubmission(finalControllerData.pickupDate) : null,
        stackdate: finalControllerData.stackDate ? formatDateForSubmission(finalControllerData.stackDate) : null,
        deadline: finalControllerData.deadline ? formatDateForSubmission(finalControllerData.deadline) : null,
        fileref: String(finalControllerData.fileRef || ""),
        rateweight: String(finalControllerData.rateWeight || ""),
        rate: Number.parseFloat(finalControllerData.rate) || 0,
        description: String(finalControllerData.description || ""),
        status: String(finalControllerData.status || "In Progress"),
        vat: Number.parseInt(finalControllerData.vat) || 15,
        num_six_meters: Number.parseInt(finalControllerData.num_six_meters) || 0,
        num_twelve_meters: Number.parseInt(finalControllerData.num_twelve_meters) || 0,
        num_abnormal: Number.parseInt(finalControllerData.num_abnormal) || 0,
        weight:
          finalControllerData.rateWeight === "Container" ? null : Number.parseFloat(finalControllerData.weight) || 0,
        total_cost: Number.parseFloat(finalControllerData.total_cost) || 0,
        // Make sure field names match exactly what the server expects
        booking_ref: String(finalControllerData.bookingRef || ""),
        vessel_name: String(finalControllerData.vesselName || ""),
        voyage_num: String(finalControllerData.voyageNo || ""),
        imo_num: String(finalControllerData.imoNo || ""),
        flag_reg: String(finalControllerData.flagReg || ""),
      }

      console.log("Updating instruction data:", instructionData)
      // Remove debug message
      // setDebugMessage("Sending instruction data to API...")

      // Update instruction with better error handling
      try {
        const instructionResponse = await fetch(`${API_BASE_URL}/api/instruction/${instructionId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(instructionData),
        })

        if (!instructionResponse.ok) {
          const errorText = await instructionResponse.text()
          console.error("API error response:", errorText)
          // Remove debug message
          // setDebugMessage(`API error: ${instructionResponse.status} ${instructionResponse.statusText} - ${errorText}`)
          throw new Error(
            `Failed to update instruction: ${instructionResponse.status} ${instructionResponse.statusText}`,
          )
        }

        const instructionResult = await instructionResponse.json()
        console.log("Instruction updated successfully:", instructionResult)
        // Remove debug message
        // setDebugMessage("Instruction updated successfully. Processing containers...")
      } catch (error) {
        console.error("Error updating instruction:", error)
        // Remove debug message
        // setDebugMessage(`Error updating instruction: ${error.message}`)
        throw error
      }

      // Now handle container data
      // Prepare container data for API with careful type handling
      const containerData = containers.map((container) => ({
        containernum: container.containerNum ? container.containerNum.toString() : "",
        weight: isImport ? (container.weight ? Number.parseFloat(container.weight) : null) : null,
        m1key: Number.parseInt(instructionId),
      }))

      console.log("Sending container data to API:", JSON.stringify(containerData, null, 2))
      // Remove debug message
      // setDebugMessage("Sending container data to API...")

      // Send container data to API with better error handling
      try {
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
          // Remove debug message
          // setDebugMessage(
          //   `Container API error: ${containerResponse.status} ${containerResponse.statusText} - ${errorText}`,
          // )
          throw new Error(`Failed to save containers: ${containerResponse.status} ${containerResponse.statusText}`)
        }

        const result = await containerResponse.json()
        console.log("API response:", result)
        // Remove debug message
        // setDebugMessage("Containers saved successfully!")

        // Update the updatedControllerData with the final values
        setUpdatedControllerData(finalControllerData)
        setIsDataModified(false)

        return result
      } catch (error) {
        console.error("Error saving containers:", error)
        // Remove debug message
        // setDebugMessage(`Error saving containers: ${error.message}`)
        throw error
      }
    } catch (error) {
      console.error("Error in saveChangesToDatabase:", error)
      // Remove debug message
      // setDebugMessage(`Error: ${error.message}`)
      throw error
    }
  }

  // Direct click handler for the Save Changes button
  const handleSaveButtonClick = () => {
    console.log("Save button clicked directly")
    // Remove debug message
    // setDebugMessage("Save button clicked")

    // Call the submit handler
    handleSubmit()
  }

  // Update the handleSubmit function to ensure total_cost is calculated
  const handleSubmit = async () => {
    console.log("handleSubmit function called")
    // Remove debug message
    // setDebugMessage("Starting submission process...")

    // Prevent multiple submissions
    if (isSubmitting) {
      console.log("Already submitting, ignoring click")
      // Remove debug message
      // setDebugMessage("Already submitting, please wait...")
      return
    }

    // Set submitting state to true
    setIsSubmitting(true)

    try {
      console.log("Validating containers...")
      // Remove debug message
      // setDebugMessage("Validating containers...")

      // Validate containers
      if (!validateContainers()) {
        console.log("Container validation failed")
        // Remove debug message
        // setDebugMessage("Validation failed. Please check the form for errors.")
        setIsSubmitting(false)
        return
      }

      console.log("Validation passed, saving to database...")
      // Remove debug message
      // setDebugMessage("Validation passed, saving to database...")

      // Save changes to database
      const result = await saveChangesToDatabase()

      console.log("Save successful:", result)
      // Remove debug message
      // setDebugMessage("Save successful!")

      // Show success message
      setSuccessMessage("Changes saved successfully!")

      // Verify the data was saved by fetching it again
      try {
        const verifyResponse = await fetch(`${API_BASE_URL}/api/containers/${instructionId}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        })

        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json()
          console.log("Verification data:", verifyData)
          // Remove debug message
          // setDebugMessage(`Verification successful! Found ${verifyData.length} containers in database.`)
        } else {
          console.log("Verification failed:", verifyResponse.status)
          // Remove debug message
          // setDebugMessage(`Verification failed: ${verifyResponse.status}`)
        }
      } catch (error) {
        console.error("Error verifying data:", error)
        // Remove debug message
        // setDebugMessage(`Error verifying data: ${error.message}`)
      }

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
      // Remove debug message
      // setDebugMessage(`Error saving data: ${error.message}`)

      // Show error modal
      setErrorModal({
        isOpen: true,
        message: error.message || "Failed to save changes. Please try again.",
      })
    } finally {
      // Reset submitting state
      setIsSubmitting(false)
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

      {/* Debug Message - REMOVED */}
      {/* {debugMessage && (
        <div
          className="debug-message"
          style={{
            backgroundColor: "#e2f3fd",
            color: "#0c5460",
            padding: "10px",
            borderRadius: "4px",
            margin: "10px 0",
            textAlign: "center",
          }}
        >
          {debugMessage}
        </div>
      )} */}

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
                          <ErrorTooltip message={fieldErrors[`container-${container.id}`]} />
                        </div>
                      </td>
                      {isImport && (
                        <td>
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
                              placeholder="Numbers only"
                            />
                            <ErrorTooltip message={fieldErrors[`weight-${container.id}`]} />
                          </div>
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

          <div
            className="note-container"
            style={{
              backgroundColor: "#fff3cd",
              border: "1px solid #ffeeba",
              borderRadius: "4px",
              padding: "10px",
              margin: "15px 0",
              textAlign: "center",
            }}
          >
            <p style={{ margin: 0, color: "#856404" }}>Note: Click "Save Changes" to save all your modifications.</p>
          </div>

          <div className="submit-section">
            <button
              className="submit-button"
              onClick={handleSaveButtonClick} // Use the direct click handler
              disabled={isSubmitting}
              style={{
                backgroundColor: "#28a745", // Always green as requested
                color: "white",
                border: "none",
                borderRadius: "4px",
                padding: "10px 20px",
                fontSize: "16px",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                transition: "background-color 0.3s ease",
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
      <style jsx>{`
        /* Error styling */
        .error-field {
          border: 2px solid #ff4d4f !important;
          background-color: #fff1f0 !important;
        }

        .input-wrapper {
          position: relative;
        }

        .error-tooltip {
          position: absolute;
          top: -40px;
          left: 0;
          background-color: #ff4d4f;
          color: white;
          padding: 5px 10px;
          border-radius: 4px;
          font-size: 12px;
          z-index: 100;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .tooltip-arrow {
          position: absolute;
          bottom: -5px;
          left: 10px;
          width: 0;
          height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 5px solid #ff4d4f;
        }
        
        .input-requirements-notice {
          background-color: #e6f7ff;
          border: 1px solid #91d5ff;
          border-radius: 4px;
          padding: 10px;
          margin: 15px 0;
          font-size: 14px;
        }
        
        .input-requirements-notice p {
          margin: 0;
          color: #0050b3;
        }
      `}</style>
    </>
  )
}

export default FCcontrollerInstructionDetails

