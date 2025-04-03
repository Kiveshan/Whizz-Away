"use client"

import { useState, useEffect, useRef } from "react"
import "../css/controllerinstruction.css"
import { useNavigate, useLocation } from "react-router-dom"
import ErrorModal from "../components/ErrorModal"
import API_CONFIG from "../utils/api-config"

const FCcontrollerinstructions = () => {
  const navigate = useNavigate()
  const location = useLocation()

  // Extract all state from location
  const instructionId = location.state?.instructionId
  const preservedFormData = location.state?.preservedFormData
  const containerCounts = location.state?.containerCounts
  const clientId = location.state?.clientId
  const clientName = location.state?.clientName
  const selectedMonth = location.state?.selectedMonth
  const selectedYear = location.state?.selectedYear
  const activeFilter = location.state?.activeFilter

  // Log the received state for debugging
  console.log("FCcontrollerinstructions received state:", location.state)
  console.log("FCcontrollerinstructions - clientId:", clientId)
  console.log("FCcontrollerinstructions - clientName:", clientName)
  console.log("FCcontrollerinstructions - selectedMonth:", selectedMonth)
  console.log("FCcontrollerinstructions - selectedYear:", selectedYear)
  console.log("FCcontrollerinstructions - activeFilter:", activeFilter)
  console.log("FCcontrollerinstructions - preservedFormData:", preservedFormData)
  console.log("FCcontrollerinstructions - containerCounts:", containerCounts)

  // API base URL from config
  const API_BASE_URL = API_CONFIG.BASE_URL

  // Create refs for each date input
  const pickupDateRef = useRef(null)
  const etaDateRef = useRef(null)
  const deadlineDateRef = useRef(null)

  // State for form data
  const [formData, setFormData] = useState({
    clientId: clientId || "", // Initialize with clientId from location state
    representative: "",
    contactDetails: "",
    email: "",
    shipmentTypeId: "",
    shipmentTypeName: "",
    task: "",
    pickup: "",
    dropoff: "",
    hazardous: false,
    surcharges: false,
    pickupTime: "",
    pickupDate: "",
    stackDate: "",
    deadline: "",
    fileRef: "",
    rateWeight: "kg",
    rate: "",
    weight: "", // Added weight field
    num_six_meters: 0,
    num_twelve_meters: 0,
    num_abnormal: 0,
    vat: 15,
    description: "",
    status: "",
    total_cost: 0, // Added total_cost field
  })

  // State to track if data has been modified
  const [isDataModified, setIsDataModified] = useState(false)

  // State to track if shipment type is Import
  const [isImport, setIsImport] = useState(false)

  // State for clients and shipment types
  const [clients, setClients] = useState([])
  const [shipmentTypes, setShipmentTypes] = useState([])
  const [isLoading, setIsLoading] = useState({
    clients: true,
    shipmentTypes: true,
    instruction: instructionId ? true : false,
  })

  // State for error modal
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    message: "",
  })

  // State for success message
  const [successMessage, setSuccessMessage] = useState("")

  // Updated handleBackClick function - ensure all state is passed back
  const handleBackClick = async () => {
    // If data has been modified and we have an instructionId, save changes before navigating back
    if (isDataModified && instructionId) {
      try {
        await saveChangesToDatabase()
        setSuccessMessage("Changes saved successfully!")

        // Short delay to show success message
        await new Promise((resolve) => setTimeout(resolve, 1000))
      } catch (error) {
        console.error("Error saving changes before navigating back:", error)
        setErrorModal({
          isOpen: true,
          message: "Failed to save changes before navigating back. Please try again.",
        })
        return
      }
    }

    // Create state object with all necessary parameters
    const stateToPass = {
      clientId,
      clientName,
      selectedMonth,
      selectedYear,
      activeFilter,
    }

    // Log the state being passed back
    console.log("Navigating back to instructions with state:", stateToPass)

    // Navigate to instructions with state
    navigate("/instructions", { state: stateToPass })
  }

  // Function to open calendar
  const openCalendar = (ref) => {
    ref.current.click()
  }

  // Format date from ISO to MM/DD/YYYY
  const formatDateForDisplay = (isoDate) => {
    if (!isoDate) return ""
    const date = new Date(isoDate)
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    })
  }

  // Format date from MM/DD/YYYY to ISO
  const formatDateForSubmission = (displayDate) => {
    if (!displayDate) return null
    const [month, day, year] = displayDate.split("/")
    return `${year}-${month}-${day}`
  }

  // Format time from HH:MM:SS to hh:mm AM/PM
  const formatTimeForDisplay = (time) => {
    if (!time) return ""
    const [hours, minutes] = time.split(":")
    const hour = Number.parseInt(hours, 10)
    const ampm = hour >= 12 ? "PM" : "AM"
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  // Format time from hh:mm AM/PM to HH:MM:SS
  const formatTimeForSubmission = (displayTime) => {
    if (!displayTime) return null
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

  // Format weight to 2 decimal places
  const formatWeightForDisplay = (weight) => {
    if (weight === null || weight === undefined || weight === "") {
      return "No Weight Amount Provided"
    }
    return Number.parseFloat(weight).toFixed(2)
  }

  // Function to save changes to the database
  const saveChangesToDatabase = async () => {
    if (!instructionId) {
      throw new Error("No instruction ID provided")
    }

    // Calculate total cost
    const totalCost = calculateTotalCost()

    // Prepare weight value based on selection
    let weightValue = null
    if (formData.rateWeight === "kg" || formData.rateWeight === "m³") {
      weightValue = Number.parseFloat(formData.weight)
      if (isNaN(weightValue)) {
        throw new Error(`Please enter a valid weight for ${formData.rateWeight} rate`)
      }
    }

    // Prepare instruction data for API
    const instructionData = {
      client: Number.parseInt(formData.clientId),
      task: formData.task,
      shipment_type: Number.parseInt(formData.shipmentTypeId),
      pickup: formData.pickup,
      dropoff: formData.dropoff,
      hazardous: formData.hazardous,
      surchages: formData.surcharges,
      pickuptime: formatTimeForSubmission(formData.pickupTime),
      pickupdate: formatDateForSubmission(formData.pickupDate),
      stackdate: formatDateForSubmission(formData.stackDate),
      deadline: formatDateForSubmission(formData.deadline),
      fileref: formData.fileRef,
      rateweight: formData.rateWeight,
      rate: Number.parseFloat(formData.rate),
      description: formData.description,
      status: formData.status || "In Progress",
      vat: formData.vat,
      num_six_meters: formData.num_six_meters,
      num_twelve_meters: formData.num_twelve_meters,
      num_abnormal: formData.num_abnormal,
      weight: weightValue,
      total_cost: totalCost,
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
    setIsDataModified(false)

    return instructionResponse.json()
  }

  // Fetch clients, shipment types, and instruction data on component mount
  useEffect(() => {
    fetchClients()
    fetchShipmentTypes()

    if (preservedFormData) {
      // Use preserved form data if available (coming back from container details)
      setFormData({
        ...preservedFormData,
        clientId: clientId || preservedFormData.clientId, // Ensure clientId is set
      })
      // Set isImport based on the preserved shipment type
      const shipmentTypeName = preservedFormData.shipmentTypeName || ""
      setIsImport(shipmentTypeName.toLowerCase() === "import")
      setIsLoading((prev) => ({ ...prev, instruction: false }))
    } else if (instructionId) {
      // Otherwise fetch instruction data if ID is provided
      fetchInstructionData(instructionId)
    } else if (clientId) {
      // If we have a clientId but no instruction, update the form with the clientId
      setFormData((prev) => ({
        ...prev,
        clientId: clientId,
      }))
    }

    // If we have container counts from FCcontrollerInstructionDetails, update the form
    if (containerCounts) {
      setFormData((prev) => ({
        ...prev,
        num_six_meters: containerCounts.num_six_meters || prev.num_six_meters,
        num_twelve_meters: containerCounts.num_twelve_meters || prev.num_twelve_meters,
        num_abnormal: containerCounts.num_abnormal || prev.num_abnormal,
      }))

      // Recalculate total cost after updating container counts
      setTimeout(() => {
        updateTotalCost()
      }, 0)
    }
  }, [instructionId, preservedFormData, clientId, containerCounts])

  // Fetch instruction data by ID
  const fetchInstructionData = async (id) => {
    setIsLoading((prev) => ({ ...prev, instruction: true }))
    try {
      console.log(`Fetching instruction data for ID: ${id}`)
      const response = await fetch(`${API_BASE_URL}/api/instruction/${id}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const text = await response.text()
        console.error("Response not OK:", text)
        throw new Error(`Failed to fetch instruction: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log("Instruction data received:", data)

      // Format dates and times for display
      const formattedData = {
        clientId: clientId || data.client.toString(), // Use passed clientId if available
        representative: data.representative || "",
        contactDetails: data.cellnum || "",
        email: data.email || "",
        shipmentTypeId: data.shipment_type.toString(),
        shipmentTypeName: data.shipmenttype || "",
        task: data.task || "",
        pickup: data.pickup || "",
        dropoff: data.dropoff || "",
        hazardous: data.hazardous || false,
        surcharges: data.surchages || false,
        pickupTime: formatTimeForDisplay(data.pickuptime) || "",
        pickupDate: formatDateForDisplay(data.pickupdate) || "",
        stackDate: formatDateForDisplay(data.stackdate) || "",
        deadline: formatDateForDisplay(data.deadline) || "",
        fileRef: data.fileref || "",
        rateWeight: data.rateweight || "kg",
        rate: data.rate ? data.rate.toString() : "",
        weight: data.weight ? formatWeightForDisplay(data.weight) : "", // Format weight
        num_six_meters: data.num_six_meters || 0,
        num_twelve_meters: data.num_twelve_meters || 0,
        num_abnormal: data.num_abnormal || 0,
        vat: data.vat || 15,
        description: data.description || "",
        status: data.status || "",
        total_cost: data.total_cost || 0, // Include total_cost
      }

      setFormData(formattedData)

      // Set isImport based on the fetched shipment type
      const shipmentTypeName = data.shipmenttype || ""
      setIsImport(shipmentTypeName.toLowerCase() === "import")
    } catch (error) {
      console.error("Error fetching instruction data:", error)
      setErrorModal({
        isOpen: true,
        message: "Failed to fetch instruction data. Please try again.",
      })
    } finally {
      setIsLoading((prev) => ({ ...prev, instruction: false }))
    }
  }

  // Fetch clients from API
  const fetchClients = async () => {
    setIsLoading((prev) => ({ ...prev, clients: true }))
    try {
      console.log("Fetching clients...")
      const response = await fetch(`${API_BASE_URL}/api/clients`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const text = await response.text()
        console.error("Response not OK:", text)
        throw new Error(`Failed to fetch clients: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log("Clients data received:", data.length, "records")
      setClients(data)

      // If we have a clientId, update the form with client details
      if (clientId) {
        const selectedClient = data.find((client) => client.m5clientkey.toString() === clientId.toString())
        if (selectedClient) {
          console.log("Found matching client:", selectedClient)
          setFormData((prev) => ({
            ...prev,
            clientId: clientId,
            representative: selectedClient.representative || "",
            contactDetails: selectedClient.cellnum || "",
            email: selectedClient.email || "",
          }))
        }
      }
    } catch (error) {
      console.error("Error fetching clients:", error)
      setErrorModal({
        isOpen: true,
        message: "Failed to fetch clients. Please try again.",
      })
      setClients([])
    } finally {
      setIsLoading((prev) => ({ ...prev, clients: false }))
    }
  }

  // Fetch shipment types from API
  const fetchShipmentTypes = async () => {
    setIsLoading((prev) => ({ ...prev, shipmentTypes: true }))
    try {
      console.log("Fetching shipment types...")
      const response = await fetch(`${API_BASE_URL}/api/shipment-types`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const text = await response.text()
        console.error("Response not OK:", text)
        throw new Error(`Failed to fetch shipment types: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log("Shipment types data received:", data.length, "records")
      setShipmentTypes(data)
    } catch (error) {
      console.error("Error fetching shipment types:", error)
      setErrorModal({
        isOpen: true,
        message: "Failed to fetch shipment types. Please try again.",
      })
      setShipmentTypes([])
    } finally {
      setIsLoading((prev) => ({ ...prev, shipmentTypes: false }))
    }
  }

  // Handle client selection
  const handleClientChange = (e) => {
    const clientId = e.target.value
    const selectedClient = clients.find((client) => client.m5clientkey.toString() === clientId)

    if (selectedClient) {
      setFormData({
        ...formData,
        clientId,
        representative: selectedClient.representative || "",
        contactDetails: selectedClient.cellnum || "",
        email: selectedClient.email || "",
      })
    } else {
      setFormData({
        ...formData,
        clientId,
        representative: "",
        contactDetails: "",
        email: "",
      })
    }

    setIsDataModified(true)
  }

  // Handle shipment type selection
  const handleShipmentTypeChange = (e) => {
    const shipmentTypeId = e.target.value
    const selectedShipmentType = shipmentTypes.find((type) => type.shipkey.toString() === shipmentTypeId)

    const shipmentTypeName = selectedShipmentType ? selectedShipmentType.shipmenttype : ""
    const isImportType = shipmentTypeName.toLowerCase() === "import"

    // Update isImport state
    setIsImport(isImportType)

    setFormData({
      ...formData,
      shipmentTypeId,
      shipmentTypeName,
    })

    // Recalculate total cost after shipment type change
    setTimeout(() => {
      updateTotalCost()
    }, 0)

    setIsDataModified(true)
  }

  // Add this function to calculate total cost
  const calculateTotalCost = () => {
    const rate = Number.parseFloat(formData.rate)
    if (isNaN(rate)) return 0

    if (formData.rateWeight === "Container") {
      // For Container: rate × total_number_of_containers
      const totalContainers = formData.num_six_meters + formData.num_twelve_meters + formData.num_abnormal
      return rate * totalContainers
    } else {
      // For kg or m³: rate × weight_value
      const weight = Number.parseFloat(formData.weight)
      if (isNaN(weight)) return 0
      return rate * weight
    }
  }

  // Function to update total cost in form data
  const updateTotalCost = () => {
    const totalCost = calculateTotalCost()
    setFormData((prev) => ({
      ...prev,
      total_cost: totalCost,
    }))
  }

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target

    if (type === "checkbox") {
      setFormData({
        ...formData,
        [name]: checked,
      })
      setIsDataModified(true)
    } else if (name === "num_six_meters" || name === "num_twelve_meters" || name === "num_abnormal") {
      // Ensure container counts are at least 0
      const numValue = Number.parseInt(value)
      const validValue = isNaN(numValue) || numValue < 0 ? 0 : numValue

      // Update form data with new container count
      const updatedFormData = {
        ...formData,
        [name]: validValue,
      }

      // If rate weight is "Container", recalculate total_cost
      if (formData.rateWeight === "Container") {
        const rate = Number.parseFloat(formData.rate)
        if (!isNaN(rate)) {
          // Calculate new total containers
          const totalContainers =
            (name === "num_six_meters" ? validValue : updatedFormData.num_six_meters) +
            (name === "num_twelve_meters" ? validValue : updatedFormData.num_twelve_meters) +
            (name === "num_abnormal" ? validValue : updatedFormData.num_abnormal)
          updatedFormData.total_cost = rate * totalContainers
        }
      }

      setFormData(updatedFormData)
      setIsDataModified(true)
    } else if (name === "rateWeight") {
      // Handle rate weight change
      const updatedFormData = {
        ...formData,
        [name]: value,
      }

      // If changing to "Container", set weight to null and recalculate total_cost
      if (value === "Container") {
        updatedFormData.weight = null

        const rate = Number.parseFloat(formData.rate)
        if (!isNaN(rate)) {
          const totalContainers = formData.num_six_meters + formData.num_twelve_meters + formData.num_abnormal
          updatedFormData.total_cost = rate * totalContainers
        }
      }
      // If changing from "Container" to kg or m³, reset total_cost until weight is entered
      else {
        updatedFormData.weight = ""
        updatedFormData.total_cost = 0
      }

      setFormData(updatedFormData)
      setIsDataModified(true)
    } else if (name === "rate" || name === "weight") {
      // Allow only numbers and decimal point
      if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
        const updatedFormData = {
          ...formData,
          [name]: value,
        }

        // Recalculate total_cost if both rate and required values are present
        const rate = name === "rate" ? Number.parseFloat(value) : Number.parseFloat(formData.rate)

        if (!isNaN(rate)) {
          if (formData.rateWeight === "Container") {
            const totalContainers = formData.num_six_meters + formData.num_twelve_meters + formData.num_abnormal
            updatedFormData.total_cost = rate * totalContainers
          } else if (
            (name === "weight" || formData.weight) &&
            (formData.rateWeight === "kg" || formData.rateWeight === "m³")
          ) {
            const weight = name === "weight" ? Number.parseFloat(value) : Number.parseFloat(formData.weight)
            if (!isNaN(weight)) {
              updatedFormData.total_cost = rate * weight
            }
          }
        }

        setFormData(updatedFormData)
        setIsDataModified(true)
      }
    } else {
      setFormData({
        ...formData,
        [name]: value,
      })
      setIsDataModified(true)
    }
  }

  // Update the handleContainerCountChange function to recalculate total_cost
  const handleContainerCountChange = (type, value) => {
    // Ensure value is a number and not negative
    const numValue = Number.parseInt(value)
    const validValue = isNaN(numValue) || numValue < 0 ? 0 : numValue

    // Update form data with new container count
    const updatedFormData = {
      ...formData,
      [type]: validValue,
    }

    // If rate weight is "Container", recalculate total_cost
    if (formData.rateWeight === "Container") {
      const rate = Number.parseFloat(formData.rate)
      if (!isNaN(rate)) {
        // Calculate new total containers
        const totalContainers =
          (type === "num_six_meters" ? validValue : updatedFormData.num_six_meters) +
          (type === "num_twelve_meters" ? validValue : updatedFormData.num_twelve_meters) +
          (type === "num_abnormal" ? validValue : updatedFormData.num_abnormal)
        updatedFormData.total_cost = rate * totalContainers
      }
    }

    setFormData(updatedFormData)
    setIsDataModified(true)
  }

  // Validate form
  const validateForm = () => {
    const requiredFields = [
      "clientId",
      "shipmentTypeId",
      "task",
      "pickup",
      "dropoff",
      "pickupTime",
      "pickupDate",
      "stackDate",
      "deadline",
      "fileRef",
      "rate",
      "description",
    ]

    for (const field of requiredFields) {
      if (!formData[field]) {
        setErrorModal({
          isOpen: true,
          message: `Please fill in all required fields. Missing: ${field.replace(/([A-Z])/g, " $1").toLowerCase()}`,
        })
        return false
      }
    }

    // Validate rate is a number
    if (isNaN(Number.parseFloat(formData.rate))) {
      setErrorModal({
        isOpen: true,
        message: "Rate must be a valid number",
      })
      return false
    }

    // Validate weight if kg or m³ is selected
    if ((formData.rateWeight === "kg" || formData.rateWeight === "m³") && !formData.weight) {
      setErrorModal({
        isOpen: true,
        message: `Please enter the weight in ${formData.rateWeight}`,
      })
      return false
    }

    // Validate weight is a number
    if (
      (formData.rateWeight === "kg" || formData.rateWeight === "m³") &&
      (formData.weight === "" || isNaN(Number.parseFloat(formData.weight)))
    ) {
      setErrorModal({
        isOpen: true,
        message: `Weight must be a valid number`,
      })
      return false
    }

    // Validate at least one container is added
    const totalContainers = formData.num_six_meters + formData.num_twelve_meters + formData.num_abnormal
    if (totalContainers <= 0) {
      setErrorModal({
        isOpen: true,
        message: "Please add at least one container",
      })
      return false
    }

    return true
  }

  // Check if shipment type is Import
  const isImportShipment = () => {
    const selectedShipmentType = shipmentTypes.find((type) => type.shipkey.toString() === formData.shipmentTypeId)
    return selectedShipmentType && selectedShipmentType.shipmenttype.toLowerCase() === "import"
  }

  // Update the handleSubmit function to ensure total_cost is calculated and saved
  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    // If we have an instructionId and data has been modified, save changes first
    if (instructionId && isDataModified) {
      try {
        await saveChangesToDatabase()
      } catch (error) {
        console.error("Error saving changes before navigating to container details:", error)
        setErrorModal({
          isOpen: true,
          message: error.message || "Failed to save changes. Please try again.",
        })
        return
      }
    }

    // Calculate total containers
    const totalContainers = formData.num_six_meters + formData.num_twelve_meters + formData.num_abnormal

    // Calculate total cost
    const totalCost = calculateTotalCost()

    // Prepare weight value based on selection
    let weightValue = null
    if (formData.rateWeight === "kg" || formData.rateWeight === "m³") {
      weightValue = Number.parseFloat(formData.weight)
    }

    // Create updated form data with total_cost and weight
    const updatedFormData = {
      ...formData,
      total_cost: totalCost,
      weight: weightValue,
    }

    // Create state object with all necessary parameters
    const stateToPass = {
      controllerData: updatedFormData,
      isImport: isImportShipment(),
      totalContainers: totalContainers,
      instructionId: instructionId,
      // Pass through the original navigation state for when we return
      clientId: clientId,
      clientName: clientName,
      selectedMonth: selectedMonth,
      selectedYear: selectedYear,
      activeFilter: activeFilter,
    }

    // Log the state being passed to FCcontrollerInstructionDetails
    console.log("Navigating to FCcontrollerInstructionDetails with state:", stateToPass)

    // Navigate to container details page with state
    navigate("/FCcontrollerInstructionDetails", { state: stateToPass })
  }

  // Retry fetching data
  const handleRetryFetch = () => {
    if (isLoading.clients || isLoading.shipmentTypes) {
      return // Don't retry if already loading
    }

    fetchClients()
    fetchShipmentTypes()
    if (instructionId) {
      fetchInstructionData(instructionId)
    }

    setErrorModal({
      isOpen: false,
      message: "",
    })
  }

  // Style for non-editable fields
  const nonEditableStyle = {
    backgroundColor: "#f0f0f0",
    cursor: "not-allowed",
    opacity: 0.7,
  }

  return (
    <div className="min-h-screen bg-white" style={{ paddingBottom: 200 }}>
      {/* Error Modal */}
      {errorModal.isOpen && (
        <ErrorModal
          isOpen={errorModal.isOpen}
          onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
          message={errorModal.message}
        />
      )}

      {/* Back Button - Updated to match the requested structure */}
      <div className="">
        <button className="back-button" onClick={handleBackClick}>
          Back
        </button>
      </div>

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

      {/* Added spacing to bring the form lower on the page */}
      <div style={{ height: "30px" }}></div>

      <div className="instruction-container1" style={{ marginTop: "20px" }}>
        <div className="content">
          {/* Loading indicator or retry button */}
          {isLoading.clients || isLoading.shipmentTypes || isLoading.instruction ? (
            <div style={{ textAlign: "center", padding: "20px" }}>
              <p>Loading data...</p>
            </div>
          ) : clients.length === 0 || shipmentTypes.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px" }}>
              <p>Failed to load data from the database. Please try again.</p>
              <button
                onClick={handleRetryFetch}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#4a90e2",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  marginTop: "10px",
                }}
              >
                Retry
              </button>
            </div>
          ) : null}

          <div className="form-section">
            <div className="form-row1">
              <div className="form-group">
                <label>Client</label>
                <div className="select-wrapper">
                  <select
                    className="dropdown"
                    name="clientId"
                    value={formData.clientId}
                    onChange={handleClientChange}
                    disabled={true}
                    style={nonEditableStyle}
                  >
                    <option value="">Select Client</option>
                    {clients.map((client) => (
                      <option key={client.m5clientkey} value={client.m5clientkey}>
                        {client.companyname}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Representative</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Autoload representative"
                  name="representative"
                  value={formData.representative}
                  readOnly
                  style={nonEditableStyle}
                />
              </div>
              <div className="form-group">
                <label>Contact Details</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Autoload contact details"
                  name="contactDetails"
                  value={formData.contactDetails}
                  readOnly
                  style={nonEditableStyle}
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="Autoload email"
                  name="email"
                  value={formData.email}
                  readOnly
                  style={nonEditableStyle}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-row1">
              <div className="form-group">
                <label>Shipment Type</label>
                <div className="select-wrapper">
                  <select
                    className="dropdown"
                    name="shipmentTypeId"
                    value={formData.shipmentTypeId}
                    onChange={handleShipmentTypeChange}
                    disabled={isLoading.shipmentTypes || shipmentTypes.length === 0}
                  >
                    <option value="">Select Shipment</option>
                    {shipmentTypes.map((type) => (
                      <option key={type.shipkey} value={type.shipkey}>
                        {type.shipmenttype}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Name of Task</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Input Name of Task"
                  name="task"
                  value={formData.task}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-row1">
              <div className="form-group">
                <label>Pick-Up Location</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Input pick-up location here"
                  name="pickup"
                  value={formData.pickup}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Drop-off</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Input drop-off location here"
                  name="dropoff"
                  value={formData.dropoff}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group checkboxes">
                <div className="checkbox-group">
                  <input
                    type="checkbox"
                    id="hazardous"
                    name="hazardous"
                    checked={formData.hazardous}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="hazardous">Hazardous Materials</label>
                </div>
                <div className="checkbox-group">
                  <input
                    type="checkbox"
                    id="surcharges"
                    name="surcharges"
                    checked={formData.surcharges}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="surcharges">Add Surcharges</label>
                </div>
              </div>
            </div>

            {/* Date Inputs with functional calendar buttons */}
            <div className="form-row1">
              <div className="form-group">
                <label>Pick-up Time</label>
                <div className="date-input-group">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="hh:mm AM/PM"
                    name="pickupTime"
                    value={formData.pickupTime}
                    onChange={handleInputChange}
                  />
                  <button className="calendar-button"></button>
                </div>
              </div>

              <div className="form-group">
                <label>Pick-up Date</label>
                <div className="date-input-group">
                  <input
                    type="text"
                    className="form-input"
                    ref={pickupDateRef}
                    placeholder="MM/DD/YYYY"
                    name="pickupDate"
                    value={formData.pickupDate}
                    onChange={handleInputChange}
                  />
                  <button className="calendar-button" onClick={() => openCalendar(pickupDateRef)}></button>
                </div>
              </div>
              <div className="form-group">
                <label>{isImport ? "ETA" : "Stack Date"}</label>
                <div className="date-input-group">
                  <input
                    type="text"
                    className="form-input"
                    ref={etaDateRef}
                    placeholder="MM/DD/YYYY"
                    name="stackDate"
                    value={formData.stackDate}
                    onChange={handleInputChange}
                  />
                  <button className="calendar-button" onClick={() => openCalendar(etaDateRef)}></button>
                </div>
              </div>
              <div className="form-group">
                <label>Deadline</label>
                <div className="date-input-group">
                  <input
                    type="text"
                    className="form-input"
                    ref={deadlineDateRef}
                    placeholder="MM/DD/YYYY"
                    name="deadline"
                    value={formData.deadline}
                    onChange={handleInputChange}
                  />
                  <button className="calendar-button" onClick={() => openCalendar(deadlineDateRef)}></button>
                </div>
              </div>
            </div>
          </div>

          {/* Additional form sections */}
          <div className="form-section">
            <div className="form-row1">
              <div className="form-group">
                <label>File Ref</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Upload file number here"
                  style={{ width: "60%" }}
                  name="fileRef"
                  value={formData.fileRef}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group rates-group">
                <label>Rates per</label>
                <div className="rates-input-group">
                  <div className="select-wrapper small">
                    <select
                      className="dropdown"
                      style={{ width: "100px" }}
                      name="rateWeight"
                      value={formData.rateWeight}
                      onChange={handleInputChange}
                    >
                      <option value="kg">kg</option>
                      <option value="m³">m³</option>
                      <option value="Container">Container</option>
                    </select>
                  </div>
                  <span className="separator">-----</span>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="R 1000000/ton"
                    style={{ width: "60%" }}
                    name="rate"
                    value={formData.rate}
                    onChange={handleInputChange}
                  />
                </div>
                {/* Add weight field for kg or m³ */}
                {(formData.rateWeight === "kg" || formData.rateWeight === "m³") && (
                  <div
                    className="weight-input-group"
                    style={{ marginTop: "10px", display: "flex", alignItems: "center" }}
                  >
                    <label style={{ marginRight: "10px" }}>{formData.rateWeight}</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder={`Enter weight in ${formData.rateWeight}`}
                      style={{ width: "60%" }}
                      name="weight"
                      value={formData.weight}
                      onChange={(e) => {
                        // Allow only numbers and decimal point
                        const value = e.target.value
                        if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
                          handleInputChange(e)
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="form-row1">
              <div className="form-group">
                <label style={{ marginLeft: "281px" }}>Trailer Size</label>
                <div className="counter-container">
                  <label style={{ marginTop: "40px" }}>No. of Containers</label>
                  <div className="counter">
                    <span>6m</span>
                    <input
                      type="number"
                      value={formData.num_six_meters}
                      min="0"
                      name="num_six_meters"
                      onChange={(e) => handleContainerCountChange("num_six_meters", e.target.value)}
                    />
                  </div>
                  <div className="counter">
                    <span>12m</span>
                    <input
                      type="number"
                      value={formData.num_twelve_meters}
                      min="0"
                      name="num_twelve_meters"
                      onChange={(e) => handleContainerCountChange("num_twelve_meters", e.target.value)}
                    />
                  </div>
                  <div className="counter">
                    <span>Abnormal</span>
                    <input
                      type="number"
                      value={formData.num_abnormal}
                      min="0"
                      name="num_abnormal"
                      onChange={(e) => handleContainerCountChange("num_abnormal", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>VAT Rate</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Vat Rate"
                  value={`${formData.vat}%`}
                  name="vat"
                  style={{ width: "20%" }}
                  readOnly
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-row1">
              <div className="form-group full-width">
                <label>Description from client</label>
                <textarea
                  className="form-textarea"
                  placeholder="Description from client, like type of goods etc"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                ></textarea>
              </div>
            </div>
          </div>

          <div className="button-container1">
            <button
              className="add-container-button"
              onClick={handleSubmit}
              disabled={
                isLoading.clients ||
                isLoading.shipmentTypes ||
                isLoading.instruction ||
                clients.length === 0 ||
                shipmentTypes.length === 0
              }
            >
              Add Container Details
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FCcontrollerinstructions

