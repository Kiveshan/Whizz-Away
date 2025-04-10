"use client"

import { useState, useEffect, useRef } from "react"
import "../css/controllerinstruction.css"
import { useNavigate, useLocation } from "react-router-dom"
import ErrorModal from "../components/ErrorModal"
import API_CONFIG from "../utils/api-config"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"

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
  const preservedContainers = location.state?.preservedContainers // Add this to receive preserved containers

  // Log the received state for debugging
  console.log("FCcontrollerinstructions received state:", location.state)
  console.log("FCcontrollerinstructions - clientId:", clientId)
  console.log("FCcontrollerinstructions - clientName:", clientName)
  console.log("FCcontrollerinstructions - selectedMonth:", selectedMonth)
  console.log("FCcontrollerinstructions - selectedYear:", selectedYear)
  console.log("FCcontrollerinstructions - activeFilter:", activeFilter)
  console.log("FCcontrollerinstructions - preservedFormData:", preservedFormData)
  console.log("FCcontrollerinstructions - containerCounts:", containerCounts)
  console.log("FCcontrollerinstructions - preservedContainers:", preservedContainers)

  // API base URL from config
  const API_BASE_URL = API_CONFIG.BASE_URL

  // State for calendar modals
  const [calendarModals, setCalendarModals] = useState({
    pickupDate: false,
    stackDate: false,
    deadline: false,
  })

  // Get today's date in MM/DD/YYYY format for min date validation
  const today = new Date()
  const todayFormatted = `${String(today.getMonth() + 1).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")}/${today.getFullYear()}`

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
    bookingRef: "", // Add booking reference field
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
    // Add vessel information fields
    vesselName: "",
    voyageNo: "",
    imoNo: "",
    flagReg: "",
  })

  // State for calendar display
  const [calendarState, setCalendarState] = useState({
    currentMonth: today.getMonth(),
    currentYear: today.getFullYear(),
    selectedDate: null,
    activeCalendar: null,
  })

  // State to track field validation errors
  const [fieldErrors, setFieldErrors] = useState({})

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

  // Refs for DatePicker
  const pickupDateRef = useRef(null)
  const etaDateRef = useRef(null)
  const deadlineDateRef = useRef(null)

  // Refs for form fields to scroll to on error
  const fieldRefs = {
    clientId: useRef(null),
    shipmentTypeId: useRef(null),
    task: useRef(null),
    pickup: useRef(null),
    dropoff: useRef(null),
    pickupTime: useRef(null),
    pickupDate: useRef(null),
    stackDate: useRef(null),
    deadline: useRef(null),
    fileRef: useRef(null),
    bookingRef: useRef(null), // Add ref for bookingRef
    rate: useRef(null),
    weight: useRef(null),
    num_six_meters: useRef(null),
    vat: useRef(null),
    description: useRef(null),
    // Add refs for vessel information fields
    vesselName: useRef(null),
    voyageNo: useRef(null),
    imoNo: useRef(null),
    flagReg: useRef(null),
  }

  // Updated handleBackClick function - ensure no database changes are made
  const handleBackClick = () => {
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
    if (ref && ref.current) {
      // Instead of trying to click the input directly, use the DatePicker's setOpen method
      // or focus the input which will trigger the calendar to open
      try {
        // Try to focus the input element which should open the calendar
        const inputElement = ref.current.input || ref.current
        if (inputElement && typeof inputElement.focus === "function") {
          inputElement.focus()
        }
      } catch (error) {
        console.error("Error opening calendar:", error)
      }
    }
  }

  // Function to scroll to a field with error
  const scrollToField = (fieldName) => {
    const fieldRef = fieldRefs[fieldName]
    if (fieldRef && fieldRef.current) {
      fieldRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
      // Focus the field
      setTimeout(() => {
        if (fieldRef.current.focus) {
          fieldRef.current.focus()
        }
      }, 500)
    }
  }

  // Add this function to parse MM/DD/YYYY string to Date object
  const parseDate = (dateString) => {
    if (!dateString) return null

    try {
      // Parse MM/DD/YYYY format
      const [month, day, year] = dateString.split("/").map(Number)
      return new Date(year, month - 1, day)
    } catch (error) {
      console.error("Error parsing date:", error)
      return null
    }
  }

  // Add this function to handle date selection from the calendar
  const handleDateChange = (date, fieldName) => {
    if (!date) {
      setFormData({
        ...formData,
        [fieldName]: "",
      })
      return
    }

    // Format date to MM/DD/YYYY
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const year = date.getFullYear()
    const formattedDate = `${month}/${day}/${year}`

    // Create a synthetic event to reuse existing handleInputChange logic
    const syntheticEvent = {
      target: {
        name: fieldName,
        value: formattedDate,
        type: "text",
      },
    }

    handleInputChange(syntheticEvent)
  }

  // Function to close calendar modal
  const closeCalendar = () => {
    setCalendarModals({
      pickupDate: false,
      stackDate: false,
      deadline: false,
    })
  }

  // Function to handle date selection in calendar
  const handleDateSelect = (date) => {
    const selectedDate = new Date(calendarState.currentYear, calendarState.currentMonth, date)

    // Format as MM/DD/YYYY
    const formattedDate = `${String(selectedDate.getMonth() + 1).padStart(2, "0")}/${String(selectedDate.getDate()).padStart(2, "0")}/${selectedDate.getFullYear()}`

    // Update the form data with the selected date
    const activeCalendar = calendarState.activeCalendar

    if (activeCalendar === "pickupDate") {
      // For pickup date, update and validate other dates
      const updatedFormData = {
        ...formData,
        pickupDate: formattedDate,
      }

      // Reset stack date and deadline if they're now invalid
      if (formData.stackDate && compareDates(formData.stackDate, formattedDate) < 0) {
        updatedFormData.stackDate = ""
        setFieldErrors((prev) => ({
          ...prev,
          stackDate: `${isImport ? "ETA" : "Stack date"} cannot be before pickup date`,
        }))
      }

      if (formData.deadline && compareDates(formData.deadline, formattedDate) < 0) {
        updatedFormData.deadline = ""
        setFieldErrors((prev) => ({
          ...prev,
          deadline: "Deadline cannot be before pickup date",
        }))
      }

      setFormData(updatedFormData)
    } else if (activeCalendar === "stackDate") {
      // For stack date, ensure it's after pickup date
      if (!formData.pickupDate) {
        setErrorModal({
          isOpen: true,
          message: "Please select a pickup date first",
        })
        closeCalendar()
        return
      }

      if (compareDates(formattedDate, formData.pickupDate) < 0) {
        setErrorModal({
          isOpen: true,
          message: `${isImport ? "ETA" : "Stack date"} cannot be before pickup date`,
        })
        closeCalendar()
        return
      }

      const updatedFormData = {
        ...formData,
        stackDate: formattedDate,
      }

      // Reset deadline if it's now invalid
      if (formData.deadline && compareDates(formData.deadline, formattedDate) < 0) {
        updatedFormData.deadline = ""
        setFieldErrors((prev) => ({
          ...prev,
          deadline: `Deadline cannot be before ${isImport ? "ETA" : "stack date"}`,
        }))
      }

      setFormData(updatedFormData)
    } else if (activeCalendar === "deadline") {
      // For deadline, ensure it's after pickup date and stack date
      if (!formData.pickupDate) {
        setErrorModal({
          isOpen: true,
          message: "Please select a pickup date first",
        })
        closeCalendar()
        return
      }

      if (!formData.stackDate) {
        setErrorModal({
          isOpen: true,
          message: `Please select ${isImport ? "an ETA" : "a stack date"} first`,
        })
        closeCalendar()
        return
      }

      if (compareDates(formattedDate, formData.pickupDate) < 0) {
        setErrorModal({
          isOpen: true,
          message: "Deadline cannot be before pickup date",
        })
        closeCalendar()
        return
      }

      if (compareDates(formattedDate, formData.stackDate) < 0) {
        setErrorModal({
          isOpen: true,
          message: `Deadline cannot be before ${isImport ? "ETA" : "stack date"}`,
        })
        closeCalendar()
        return
      }

      setFormData({
        ...formData,
        deadline: formattedDate,
      })
    }

    // Clear any error for this field
    setFieldErrors((prev) => ({
      ...prev,
      [activeCalendar]: "",
    }))

    setIsDataModified(true)
    closeCalendar()
  }

  // Function to navigate to previous month in calendar
  const prevMonth = () => {
    setCalendarState((prev) => {
      let newMonth = prev.currentMonth - 1
      let newYear = prev.currentYear

      if (newMonth < 0) {
        newMonth = 11
        newYear--
      }

      return {
        ...prev,
        currentMonth: newMonth,
        currentYear: newYear,
      }
    })
  }

  // Function to navigate to next month in calendar
  const nextMonth = () => {
    setCalendarState((prev) => {
      let newMonth = prev.currentMonth + 1
      let newYear = prev.currentYear

      if (newMonth > 11) {
        newMonth = 0
        newYear++
      }

      return {
        ...prev,
        currentMonth: newMonth,
        currentYear: newYear,
      }
    })
  }

  // Function to add one day to a date string in MM/DD/YYYY format
  const addOneDay = (dateString) => {
    if (!dateString) return ""

    try {
      // Parse the MM/DD/YYYY format
      const [month, day, year] = dateString.split("/")

      // Create a new date and add one day
      const date = new Date(Number(year), Number(month) - 1, Number(day))
      date.setDate(date.getDate() + 1)

      // Format back to MM/DD/YYYY
      return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}/${date.getFullYear()}`
    } catch (error) {
      console.error("Error adding one day to date:", error)
      return dateString
    }
  }

  // Format time from HH:MM:SS to HH:MM (24-hour format)
  const formatTimeForDisplay = (time) => {
    if (!time) return ""
    const [hours, minutes] = time.split(":")
    return `${hours}:${minutes}`
  }

  // Format time from HH:MM to HH:MM:SS (24-hour format)
  const formatTimeForSubmission = (displayTime) => {
    if (!displayTime) return null
    const [hours, minutes] = displayTime.split(":")
    return `${hours}:${minutes}:00`
  }

  // Format weight to 2 decimal places
  const formatWeightForDisplay = (weight) => {
    if (weight === null || weight === undefined || weight === "") {
      return "No Weight Amount Provided"
    }
    return Number.parseFloat(weight).toFixed(2)
  }

  // Function to format date from API (YYYY-MM-DD) to input element (MM/DD/YYYY)
  const formatDateForInput = (dateString) => {
    if (!dateString) return ""

    try {
      // Create a date object from the string
      const date = new Date(dateString)

      // Check if it's a valid date
      if (isNaN(date.getTime())) {
        console.error("Invalid date:", dateString)
        return ""
      }

      // Format as MM/DD/YYYY for input display
      const month = String(date.getMonth() + 1).padStart(2, "0")
      const day = String(date.getDate()).padStart(2, "0")
      const year = date.getFullYear()

      const formattedDate = `${month}/${day}/${year}`
      console.log(`Formatted date from ${dateString} to ${formattedDate}`)
      return formattedDate
    } catch (error) {
      console.error("Error formatting date:", error)
      return ""
    }
  }

  // Function to convert MM/DD/YYYY format to API format (YYYY-MM-DD)
  const formatDateForAPI = (dateString) => {
    if (!dateString) return ""

    try {
      // Parse the MM/DD/YYYY format
      const [month, day, year] = dateString.split("/")

      // Return in YYYY-MM-DD format
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
    } catch (error) {
      console.error("Error formatting date for API:", error, dateString)
      return dateString // Return original if parsing fails
    }
  }

  // Helper function to compare dates in MM/DD/YYYY format
  const compareDates = (date1, date2) => {
    if (!date1 || !date2) return 0

    const [month1, day1, year1] = date1.split("/").map(Number)
    const [month2, day2, year2] = date2.split("/").map(Number)

    const d1 = new Date(year1, month1 - 1, day1)
    const d2 = new Date(year2, month2 - 1, day2)

    return d1 - d2
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
      pickupdate: formatDateForAPI(formData.pickupDate),
      stackdate: formatDateForAPI(formData.stackDate),
      deadline: formatDateForAPI(formData.deadline),
      fileref: formData.fileRef,
      bookingRef: formData.bookingRef,
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
      // Add vessel information
      booking_ref: formData.bookingRef,
      vessel_name: formData.vesselName,
      voyage_num: formData.voyageNo,
      imo_num: formData.imoNo,
      flag_reg: formData.flagReg,
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

      // Store original dates for debugging
      console.log("Original dates from database:", {
        pickupdate: data.pickupdate,
        stackdate: data.stackdate,
        deadline: data.deadline,
      })

      // Format dates for display in MM/DD/YYYY format
      const formattedPickupDate = formatDateForInput(data.pickupdate)
      const formattedStackDate = formatDateForInput(data.stackdate)
      const formattedDeadlineDate = formatDateForInput(data.deadline)

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
        // Store dates in MM/DD/YYYY format
        pickupDate: formattedPickupDate,
        stackDate: formattedStackDate,
        deadline: formattedDeadlineDate,
        fileRef: data.fileref || "",
        bookingRef: data.booking_ref || "",
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
        // Include vessel information
        vesselName: data.vessel_name || "",
        voyageNo: data.voyage_num || "",
        imoNo: data.imo_num || "",
        flagReg: data.flag_reg || "",
      }

      console.log("Formatted data for form:", formattedData)
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
    // Clear any error for this field
    setFieldErrors((prev) => ({ ...prev, clientId: "" }))
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
    // Clear any error for this field
    setFieldErrors((prev) => ({ ...prev, shipmentTypeId: "" }))
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
      // Clear any error for this field
      setFieldErrors((prev) => ({ ...prev, [name]: "" }))
    } else if (name === "vat") {
      // Handle VAT input - ensure it's an integer
      const vatValue = value.replace(/[^0-9]/g, "") // Remove non-numeric characters

      if (vatValue === "" || /^\d+$/.test(vatValue)) {
        setFormData({
          ...formData,
          [name]: vatValue === "" ? "" : Number.parseInt(vatValue, 10),
        })
        setIsDataModified(true)
        // Clear any error for this field
        setFieldErrors((prev) => ({ ...prev, vat: "" }))
      }
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
      // Clear any error for this field
      setFieldErrors((prev) => ({ ...prev, [name]: "" }))
    } else if (name === "imoNo") {
      // For IMO Number - allow only numbers
      const numbersOnly = value.replace(/[^0-9]/g, "")

      if (value === numbersOnly) {
        setFormData({
          ...formData,
          [name]: value,
        })
        setIsDataModified(true)
        // Clear any error for this field
        setFieldErrors((prev) => ({ ...prev, [name]: "" }))
      } else {
        // If the input contains non-numeric characters, show error but don't update the field
        setFieldErrors((prev) => ({
          ...prev,
          [name]: "IMO Number must contain only numbers",
        }))
      }
    } else if (name === "flagReg") {
      // For Flag Registration - don't allow numbers
      if (!/\d/.test(value)) {
        setFormData({
          ...formData,
          [name]: value,
        })
        setIsDataModified(true)
        // Clear any error for this field
        setFieldErrors((prev) => ({ ...prev, [name]: "" }))
      } else {
        // If the input contains numbers, show error but don't update the field
        setFieldErrors((prev) => ({
          ...prev,
          [name]: "Flag Registration must not contain numbers",
        }))
      }
    } else {
      setFormData({
        ...formData,
        [name]: value,
      })
      setIsDataModified(true)
      // Clear any error for this field
      setFieldErrors((prev) => ({ ...prev, [name]: "" }))
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
    // Clear any error for this field
    setFieldErrors((prev) => ({ ...prev, [type]: "" }))
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
      "bookingRef", // Add bookingRef as a required field
      "rate",
      "description",
      // Add vessel information fields as required
      "vesselName",
      "voyageNo",
      "imoNo",
      "flagReg",
    ]

    let isValid = true
    const errors = {}

    // Check all required fields
    for (const field of requiredFields) {
      if (!formData[field]) {
        errors[field] = `This field is required`
        isValid = false
      }
    }

    // Validate rate is a number
    if (formData.rate && isNaN(Number.parseFloat(formData.rate))) {
      errors.rate = "Rate must be a valid number"
      isValid = false
    }

    // Validate weight if kg or m³ is selected
    if ((formData.rateWeight === "kg" || formData.rateWeight === "m³") && !formData.weight) {
      errors.weight = `Please enter the weight in ${formData.rateWeight}`
      isValid = false
    }

    // Validate weight is a number
    if (
      (formData.rateWeight === "kg" || formData.rateWeight === "m³") &&
      (formData.weight === "" || isNaN(Number.parseFloat(formData.weight)))
    ) {
      errors.weight = `Weight must be a valid number`
      isValid = false
    }

    // Validate at least one container is added
    const totalContainers = formData.num_six_meters + formData.num_twelve_meters + formData.num_abnormal
    if (totalContainers <= 0) {
      errors.num_six_meters = "Please add at least one container"
      isValid = false
    }

    // Validate VAT is a number
    if (formData.vat === "" || isNaN(Number.parseInt(formData.vat))) {
      errors.vat = "VAT must be a valid integer"
      isValid = false
    }

    // Validate date order
    if (formData.stackDate && formData.pickupDate && compareDates(formData.stackDate, formData.pickupDate) < 0) {
      errors.stackDate = `${isImport ? "ETA" : "Stack date"} cannot be before pickup date`
      isValid = false
    }

    if (formData.deadline && formData.pickupDate && compareDates(formData.deadline, formData.pickupDate) < 0) {
      errors.deadline = "Deadline cannot be before pickup date"
      isValid = false
    }

    if (formData.deadline && formData.stackDate && compareDates(formData.deadline, formData.stackDate) < 0) {
      errors.deadline = `Deadline cannot be before ${isImport ? "ETA" : "stack date"}`
      isValid = false
    }

    // Validate IMO Number contains only numbers
    if (formData.imoNo && /[^0-9]/.test(formData.imoNo)) {
      errors.imoNo = "IMO Number must contain only numbers"
      isValid = false
    }

    // Validate Flag Registration doesn't contain numbers
    if (formData.flagReg && /\d/.test(formData.flagReg)) {
      errors.flagReg = "Flag Registration must not contain numbers"
      isValid = false
    }

    // Set all errors
    setFieldErrors(errors)

    // If not valid, scroll to the first field with an error
    if (!isValid) {
      const firstErrorField = Object.keys(errors)[0]
      scrollToField(firstErrorField)

      // Show error in modal
      setErrorModal({
        isOpen: true,
        message: `Please fill in all required fields before proceeding.`,
      })
    }

    return isValid
  }

  // Check if shipment type is Import
  const isImportShipment = () => {
    const selectedShipmentType = shipmentTypes.find((type) => type.shipkey.toString() === formData.shipmentTypeId)
    return selectedShipmentType && selectedShipmentType.shipmenttype.toLowerCase() === "import"
  }

  // Update the handleSubmit function to NOT save to database and only pass data to FCcontrollerInstructionDetails
  const handleSubmit = async () => {
    if (!validateForm()) {
      return
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
      // Pass the preserved containers if available
      preservedContainers: preservedContainers,
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

  // Generate calendar for current month
  const generateCalendar = () => {
    const year = calendarState.currentYear
    const month = calendarState.currentMonth

    // Get first day of month and number of days in month
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    // Get today's date for highlighting
    const currentDate = new Date()
    const isCurrentMonth = currentDate.getMonth() === month && currentDate.getFullYear() === year
    const today = isCurrentMonth ? currentDate.getDate() : -1

    // Get selected date if in current month/year
    let selectedDay = -1
    if (calendarState.selectedDate) {
      const selectedDate = calendarState.selectedDate
      if (selectedDate.getMonth() === month && selectedDate.getFullYear() === year) {
        selectedDay = selectedDate.getDate()
      }
    }

    // Get minimum date based on active calendar
    let minDate = null
    if (calendarState.activeCalendar === "stackDate" && formData.pickupDate) {
      const [pickupMonth, pickupDay, pickupYear] = formData.pickupDate.split("/").map(Number)
      minDate = new Date(pickupYear, pickupMonth - 1, pickupDay)
    } else if (calendarState.activeCalendar === "deadline") {
      if (formData.stackDate) {
        const [stackMonth, stackDay, stackYear] = formData.stackDate.split("/").map(Number)
        minDate = new Date(stackYear, stackMonth - 1, stackDay)
      } else if (formData.pickupDate) {
        const [pickupMonth, pickupDay, pickupYear] = formData.pickupDate.split("/").map(Number)
        minDate = new Date(pickupYear, pickupMonth - 1, pickupDay)
      }
    }

    // Create calendar rows
    const rows = []
    let cells = []

    // Add empty cells for days before first day of month
    for (let i = 0; i < firstDay; i++) {
      cells.push(<td key={`empty-${i}`} className="empty"></td>)
    }

    // Add cells for days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const isDisabled = minDate && date < minDate

      cells.push(
        <td
          key={day}
          className={`
            ${day === today ? "today" : ""} 
            ${day === selectedDay ? "selected" : ""} 
            ${isDisabled ? "disabled" : ""}
          `}
          onClick={() => !isDisabled && handleDateSelect(day)}
        >
          {day}
        </td>,
      )

      // Start new row after Saturday (6)
      if ((firstDay + day) % 7 === 0) {
        rows.push(<tr key={day}>{cells}</tr>)
        cells = []
      }
    }

    // Add remaining cells to last row
    if (cells.length > 0) {
      rows.push(<tr key="last">{cells}</tr>)
    }

    return rows
  }

  // Style for non-editable fields
  const nonEditableStyle = {
    backgroundColor: "#f0f0f0",
    cursor: "not-allowed",
    opacity: 0.7,
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

  // Calendar modal component
  const CalendarModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ]

    return (
      <div className="calendar-modal-overlay" onClick={onClose}>
        <div className="calendar-modal" onClick={(e) => e.stopPropagation()}>
          <div className="calendar-header">
            <button onClick={prevMonth}>&lt;</button>
            <h3>
              {monthNames[calendarState.currentMonth]} {calendarState.currentYear}
            </h3>
            <button onClick={nextMonth}>&gt;</button>
          </div>
          <table className="calendar">
            <thead>
              <tr>
                <th>Sun</th>
                <th>Mon</th>
                <th>Tue</th>
                <th>Wed</th>
                <th>Thu</th>
                <th>Fri</th>
                <th>Sat</th>
              </tr>
            </thead>
            <tbody>{generateCalendar()}</tbody>
          </table>
          <div className="calendar-footer">
            <button onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    )
  }

  // Declare seDate function
  const seDate = (dateString) => {
    return dateString
  }

  return (
    <div  >
      {/* Error Modal */}
      {errorModal.isOpen && (
        <ErrorModal
          isOpen={errorModal.isOpen}
          onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
          message={errorModal.message}
        />
      )}

      {/* Calendar Modals */}
      <CalendarModal isOpen={calendarModals.pickupDate} onClose={closeCalendar} />
      <CalendarModal isOpen={calendarModals.stackDate} onClose={closeCalendar} />
      <CalendarModal isOpen={calendarModals.deadline} onClose={closeCalendar} />

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
      {/* <div style={{ height: "0px" }}></div> */}

      <div className="instruction-container1" style={{ marginTop: "-20px" }}>
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
                <div className="select-wrapper" ref={fieldRefs.clientId}>
                  <select
                    className={`dropdown ${fieldErrors.clientId ? "error-field" : ""}`}
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
                  <ErrorTooltip message={fieldErrors.clientId} />
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
                <div className="select-wrapper" ref={fieldRefs.shipmentTypeId}>
                  <select
                    className={`dropdown ${fieldErrors.shipmentTypeId ? "error-field" : ""}`}
                    name="shipmentTypeId"
                    value={formData.shipmentTypeId}
                    onChange={handleShipmentTypeChange}
                    disabled={isLoading.shipmentTypes || shipmentTypes.length === 0}
                  >
                    <option value="" disabled>
                      Select Shipment
                    </option>
                    {shipmentTypes.map((type) => (
                      <option key={type.shipkey} value={type.shipkey}>
                        {type.shipmenttype}
                      </option>
                    ))}
                  </select>
                  <ErrorTooltip message={fieldErrors.shipmentTypeId} />
                </div>
              </div>
              <div className="form-group" style={{ flex: "2" }}>
                <label>Name of Task</label>
                <div className="input-wrapper" ref={fieldRefs.task}>
                  <input
                    type="text"
                    className={`form-input ${fieldErrors.task ? "error-field" : ""}`}
                    placeholder="Input Name of Task"
                    name="task"
                    value={formData.task}
                    onChange={handleInputChange}
                  />
                  <ErrorTooltip message={fieldErrors.task} />
                </div>
              </div>
            </div>

            <div className="form-row1">
              <div className="form-group">
                <label>Pick-Up Location</label>
                <div className="input-wrapper" ref={fieldRefs.pickup}>
                  <input
                    type="text"
                    className={`form-input ${fieldErrors.pickup ? "error-field" : ""}`}
                    placeholder="Input pick-up location here"
                    name="pickup"
                    value={formData.pickup}
                    onChange={handleInputChange}
                  />
                  <ErrorTooltip message={fieldErrors.pickup} />
                </div>
              </div>
              <div className="form-group">
                <label>Drop-off</label>
                <div className="input-wrapper" ref={fieldRefs.dropoff}>
                  <input
                    type="text"
                    className={`form-input ${fieldErrors.dropoff ? "error-field" : ""}`}
                    placeholder="Input drop-off location here"
                    name="dropoff"
                    value={formData.dropoff}
                    onChange={handleInputChange}
                  />
                  <ErrorTooltip message={fieldErrors.dropoff} />
                </div>
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
                <div className="time-input-group" ref={fieldRefs.pickupTime}>
                  <input
                    type="time"
                    className={`form-input ${fieldErrors.pickupTime ? "error-field" : ""}`}
                    name="pickupTime"
                    value={formData.pickupTime}
                    onChange={handleInputChange}
                  />
                  <ErrorTooltip message={fieldErrors.pickupTime} />
                </div>
              </div>

              <div className="form-group">
                <label>Pick-up Date</label>
                <div className="date-input-group" ref={fieldRefs.pickupDate}>
                  <DatePicker
                    selected={parseDate(formData.pickupDate)}
                    onChange={(date) => handleDateChange(date, "pickupDate")}
                    dateFormat="MM/dd/yyyy"
                    className={`form-input ${fieldErrors.pickupDate ? "error-field" : ""}`}
                    placeholderText="MM/DD/YYYY"
                    ref={pickupDateRef}
                    onFocus={(e) => e.target.blur()} // Prevent keyboard on mobile
                    customInput={
                      <input
                        type="text"
                        className={`form-input ${fieldErrors.pickupDate ? "error-field" : ""}`}
                        placeholder="MM/DD/YYYY"
                        name="pickupDate"
                        value={formData.pickupDate || ""}
                        onChange={handleInputChange}
                      />
                    }
                  />
                  <button
                    type="button"
                    className="calendar-button"
                    onClick={() => {
                      if (pickupDateRef.current) {
                        const datePickerInput = pickupDateRef.current.input || pickupDateRef.current
                        if (datePickerInput && typeof datePickerInput.focus === "function") {
                          datePickerInput.focus()
                        }
                      }
                    }}
                  ></button>
                  <ErrorTooltip message={fieldErrors.pickupDate} />
                </div>
              </div>

              <div className="form-group">
                <label>{isImport ? "ETA" : "Stack Date"}</label>
                <div className="date-input-group" ref={fieldRefs.stackDate}>
                  <DatePicker
                    selected={parseDate(formData.stackDate)}
                    onChange={(date) => handleDateChange(date, "stackDate")}
                    dateFormat="MM/dd/yyyy"
                    className={`form-input ${fieldErrors.stackDate ? "error-field" : ""}`}
                    placeholderText="MM/DD/YYYY"
                    ref={etaDateRef}
                    disabled={!formData.pickupDate}
                    minDate={parseDate(formData.pickupDate)}
                    onFocus={(e) => e.target.blur()} // Prevent keyboard on mobile
                    customInput={
                      <input
                        type="text"
                        className={`form-input ${fieldErrors.stackDate ? "error-field" : ""}`}
                        placeholder="MM/DD/YYYY"
                        name="stackDate"
                        value={formData.stackDate || ""}
                        onChange={handleInputChange}
                        disabled={!formData.pickupDate}
                      />
                    }
                  />
                  <button
                    type="button"
                    className="calendar-button"
                    onClick={() => {
                      if (!formData.pickupDate) {
                        setErrorModal({
                          isOpen: true,
                          message: "Please select a pickup date first",
                        })
                      } else if (etaDateRef.current) {
                        const datePickerInput = etaDateRef.current.input || etaDateRef.current
                        if (datePickerInput && typeof datePickerInput.focus === "function") {
                          datePickerInput.focus()
                        }
                      }
                    }}
                  ></button>
                  <ErrorTooltip message={fieldErrors.stackDate} />
                </div>
              </div>

              <div className="form-group">
                <label>Deadline</label>
                <div className="date-input-group" ref={fieldRefs.deadline}>
                  <DatePicker
                    selected={parseDate(formData.deadline)}
                    onChange={(date) => handleDateChange(date, "deadline")}
                    dateFormat="MM/dd/yyyy"
                    className={`form-input ${fieldErrors.deadline ? "error-field" : ""}`}
                    placeholderText="MM/DD/YYYY"
                    ref={deadlineDateRef}
                    disabled={!formData.stackDate}
                    minDate={parseDate(formData.stackDate) || seDate(formData.pickupDate)}
                    onFocus={(e) => e.target.blur()} // Prevent keyboard on mobile
                    customInput={
                      <input
                        type="text"
                        className={`form-input ${fieldErrors.deadline ? "error-field" : ""}`}
                        placeholder="MM/DD/YYYY"
                        name="deadline"
                        value={formData.deadline || ""}
                        onChange={handleInputChange}
                        disabled={!formData.stackDate}
                      />
                    }
                  />
                  <button
                    type="button"
                    className="calendar-button"
                    onClick={() => {
                      if (!formData.pickupDate) {
                        setErrorModal({
                          isOpen: true,
                          message: "Please select a pickup date first",
                        })
                      } else if (!formData.stackDate) {
                        setErrorModal({
                          isOpen: true,
                          message: `Please select ${isImport ? "an ETA" : "a stack date"} first`,
                        })
                      } else if (deadlineDateRef.current) {
                        const datePickerInput = deadlineDateRef.current.input || deadlineDateRef.current
                        if (datePickerInput && typeof datePickerInput.focus === "function") {
                          datePickerInput.focus()
                        }
                      }
                    }}
                  ></button>
                  <ErrorTooltip message={fieldErrors.deadline} />
                </div>
              </div>
            </div>
          </div>

          {/* File Ref and Rates Section */}
          <div className="form-section blue-bg">
            <div className="file-rates-row">
              <div className="file-ref-column">
                <label>File Ref</label>
                <div className="input-wrapper" ref={fieldRefs.fileRef}>
                  <input
                    type="text"
                    className={`form-input ${fieldErrors.fileRef ? "error-field" : ""}`}
                    placeholder="Upload file number here"
                    name="fileRef"
                    value={formData.fileRef}
                    onChange={handleInputChange}
                  />
                  <ErrorTooltip message={fieldErrors.fileRef} />
                </div>
              </div>
              <div className="booking-ref-column">
                <label>Booking Ref.</label>
                <div className="input-wrapper" ref={fieldRefs.bookingRef}>
                  <input
                    type="text"
                    className={`form-input ${fieldErrors.bookingRef ? "error-field" : ""}`}
                    placeholder="Enter booking reference"
                    name="bookingRef"
                    value={formData.bookingRef}
                    onChange={handleInputChange}
                  />
                  <ErrorTooltip message={fieldErrors.bookingRef} />
                </div>
              </div>
              <div className="rates-column">
                <label>Rates per</label>
                <div className="rates-input-group">
                  <div className="select-wrapper small">
                    <select
                      className="dropdown"
                      name="rateWeight"
                      value={formData.rateWeight}
                      onChange={handleInputChange}
                    >
                      <option value="kg">kg</option>
                      <option value="m³">m³</option>
                      <option value="Container">Container</option>
                    </select>
                  </div>
                  <div className="input-wrapper" ref={fieldRefs.rate}>
                    <input
                      type="text"
                      className={`form-input ${fieldErrors.rate ? "error-field" : ""}`}
                      placeholder="R 1000000/ton"
                      name="rate"
                      value={formData.rate}
                      onChange={(e) => {
                        // Allow only numbers and decimal point
                        const value = e.target.value
                        if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
                          handleInputChange(e)
                        }
                      }}
                    />
                    <ErrorTooltip message={fieldErrors.rate} />
                  </div>
                </div>
                {/* Add weight field for kg or m³ */}
                {(formData.rateWeight === "kg" || formData.rateWeight === "m³") && (
                  <div className="weight-input-group" ref={fieldRefs.weight}>
                    <label>{formData.rateWeight}</label>
                    <div className="input-wrapper">
                      <input
                        type="text"
                        className={`form-input ${fieldErrors.weight ? "error-field" : ""}`}
                        placeholder={`Enter weight in ${formData.rateWeight}`}
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
                      <ErrorTooltip message={fieldErrors.weight} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="trailer-section">
              <div className="trailer-title">
                <h3>Trailer Size</h3>
              </div>
              <div className="container-row">
                <div className="no-of-containers">
                  <label>No. of Containers</label>
                </div>
                <div className="container-boxes">
                  <div className="container-box">
                    <div className="container-label">6m</div>
                    <input
                      type="number"
                      className={fieldErrors.num_six_meters ? "error-field" : ""}
                      value={formData.num_six_meters}
                      min="0"
                      name="num_six_meters"
                      onChange={(e) => handleContainerCountChange("num_six_meters", e.target.value)}
                      ref={fieldRefs.num_six_meters}
                    />
                    <ErrorTooltip message={fieldErrors.num_six_meters} />
                  </div>
                  <div className="container-box">
                    <div className="container-label">12m</div>
                    <input
                      type="number"
                      value={formData.num_twelve_meters}
                      min="0"
                      name="num_twelve_meters"
                      onChange={(e) => handleContainerCountChange("num_twelve_meters", e.target.value)}
                    />
                  </div>
                  <div className="container-box">
                    <div className="container-label">Abnormal</div>
                    <input
                      type="number"
                      value={formData.num_abnormal}
                      min="0"
                      name="num_abnormal"
                      onChange={(e) => handleContainerCountChange("num_abnormal", e.target.value)}
                    />
                  </div>
                </div>
                <div className="vat-rate">
                  <label>VAT Rate</label>
                  <div className="vat-input-wrapper" ref={fieldRefs.vat}>
                    <input
                      type="text"
                      className={`form-input vat-input ${fieldErrors.vat ? "error-field" : ""}`}
                      value={`${formData.vat}%`}
                      name="vat"
                      onChange={(e) => {
                        // Remove the % sign and handle the input
                        const value = e.target.value.replace(/%/g, "")
                        const syntheticEvent = {
                          target: {
                            name: "vat",
                            value: value,
                            type: "text",
                          },
                        }
                        handleInputChange(syntheticEvent)
                      }}
                    />
                    <ErrorTooltip message={fieldErrors.vat} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Vessel Information Section */}
          <div className="form-section blue-bg">
            <div className="vessel-info-container">
              <div className="vessel-info-row">
                <div className="vessel-info-field">
                  <label>Vessel Name</label>
                  <div className="input-wrapper" ref={fieldRefs.vesselName}>
                    <input
                      type="text"
                      className={`form-input vessel-input ${fieldErrors.vesselName ? "error-field" : ""}`}
                      placeholder="Enter vessel name"
                      name="vesselName"
                      value={formData.vesselName}
                      onChange={handleInputChange}
                    />
                    <ErrorTooltip message={fieldErrors.vesselName} />
                  </div>
                </div>
                <div className="vessel-info-field">
                  <label>Voyage No.</label>
                  <div className="input-wrapper" ref={fieldRefs.voyageNo}>
                    <input
                      type="text"
                      className={`form-input vessel-input ${fieldErrors.voyageNo ? "error-field" : ""}`}
                      placeholder="Enter voyage number"
                      name="voyageNo"
                      value={formData.voyageNo}
                      onChange={handleInputChange}
                    />
                    <ErrorTooltip message={fieldErrors.voyageNo} />
                  </div>
                </div>
              </div>
              <div className="vessel-info-row">
                <div className="vessel-info-field">
                  <label>IMO No.</label>
                  <div className="input-wrapper" ref={fieldRefs.imoNo}>
                    <input
                      type="text"
                      className={`form-input vessel-input ${fieldErrors.imoNo ? "error-field" : ""}`}
                      placeholder="Numbers only"
                      name="imoNo"
                      value={formData.imoNo}
                      onChange={handleInputChange}
                    />
                    <ErrorTooltip message={fieldErrors.imoNo} />
                  </div>
                </div>
                <div className="vessel-info-field">
                  <label>Flag Reg</label>
                  <div className="input-wrapper" ref={fieldRefs.flagReg}>
                    <input
                      type="text"
                      className={`form-input vessel-input ${fieldErrors.flagReg ? "error-field" : ""}`}
                      placeholder="No numbers allowed"
                      name="flagReg"
                      value={formData.flagReg}
                      onChange={handleInputChange}
                    />
                    <ErrorTooltip message={fieldErrors.flagReg} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="form-section blue-bg">
            <div className="description-section">
              <label>Description from client</label>
              <div className="textarea-wrapper" ref={fieldRefs.description}>
                <textarea
                  className={`form-textarea ${fieldErrors.description ? "error-field" : ""}`}
                  placeholder="Description from client, like type of goods etc"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                ></textarea>
                <ErrorTooltip message={fieldErrors.description} />
              </div>
            </div>
          </div>

          <div className="save-note">
            <p>Note: To save changes, please proceed to the next page.</p>
          </div>

          <div className="button-container">
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

      {/* CSS for calendar modal and error tooltips */}
      <style jsx>{`
        .date-display {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #ccc;
          border-radius: 4px;
          background-color: #fff;
          min-height: 38px;
          display: flex;
          align-items: center;
        }

        .calendar-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .calendar-modal {
          background-color: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
          max-width: 400px;
          width: 100%;
        }

        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .calendar-header button {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          padding: 5px 10px;
        }

        .calendar {
          width: 100%;
          border-collapse: collapse;
        }

        .calendar th {
          padding: 8px;
          text-align: center;
          font-weight: bold;
        }

        .calendar td {
          padding: 8px;
          text-align: center;
          cursor: pointer;
          border: 1px solid #eee;
        }

        .calendar td:hover:not(.empty):not(.disabled) {
          background-color: #f0f0f0;
        }

        .calendar td.today {
          background-color: #e6f7ff;
          font-weight: bold;
        }

        .calendar td.selected {
          background-color: #1890ff;
          color: white;
        }

        .calendar td.empty {
          background-color: #f9f9f9;
          cursor: default;
        }

        .calendar td.disabled {
          color: #ccc;
          cursor: not-allowed;
        }

        .calendar-footer {
          display: flex;
          justify-content: flex-end;
          margin-top: 15px;
        }

        .calendar-footer button {
          padding: 8px 16px;
          margin-left: 10px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .calendar-footer button:first-child {
          background-color: #f0f0f0;
        }

        .calendar-footer button:last-child {
          background-color: #1890ff;
          color: white;
        }

        /* Error styling */
        .error-field {
          border: 2px solid #ff4d4f !important;
          background-color: #fff1f0 !important;
        }

        .input-wrapper, .select-wrapper, .date-input-group, .textarea-wrapper, .vat-input-wrapper {
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

        /* Form layout styling */
        .form-section {
          margin-bottom: 20px;
          padding-bottom: 20px;
          border-bottom: 1px solid #0066cc;
        }

        .form-section:last-child {
          border-bottom: none;
          margin-bottom: 30px;
        }

        .blue-bg {
          background-color: #e6f7ff;
          padding: 15px;
          border-radius: 4px;
        }

        .form-row1 {
          display: flex;
          flex-wrap: wrap;
          margin: 0 -10px;
        }

        .form-group {
          flex: 1;
          padding: 0 10px;
          min-width: 200px;
          margin-bottom: 15px;
        }

        .file-rates-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .file-ref-column {
          width: 32%;
        }

        .booking-ref-column {
          width: 32%;
        }

        .rates-column {
          width: 32%;
        }

        .description-section {
          width: 100%;
        }

        .form-textarea {
          width: 100%;
          min-height: 80px;
          padding: 10px;
          border: 1px solid #d9d9d9;
          border-radius: 4px;
          background-color: white;
          resize: vertical;
        }

        .checkboxes {
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding-bottom: 10px;
        }

        .checkbox-group {
          display: flex;
          align-items: center;
          margin-bottom: 5px;
        }

        .checkbox-group input[type="checkbox"] {
          margin-right: 8px;
        }

        /* Input styling */
        .form-input, .dropdown {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #d9d9d9;
          border-radius: 4px;
          background-color: white;
        }

        /* Date input styling */
        .date-input-group {
          position: relative;
          display: flex;
        }

        .calendar-button {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          width: 20px;
          height: 20px;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'%3E%3Crect x='3' y='4' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Cline x1='16' y1='2' x2='16' y2='6'%3E%3C/line%3E%3Cline x1='8' y1='2' x2='8' y2='6'%3E%3C/line%3E%3Cline x1='3' y1='10' x2='21' y2='10'%3E%3C/line%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: center;
        }

        /* Rates styling */
        .rates-input-group {
          display: flex;
          align-items: center;
          gap: 10px; /* Add gap instead of separator */
        }

        .select-wrapper.small {
          width: 100px;
          flex-shrink: 0;
        }

        .weight-input-group {
          display: flex;
          align-items: center;
          margin-top: 10px;
        }

        .weight-input-group label {
          margin-right: 10px;
          width: 30px;
        }

        /* Trailer section styling */
        .trailer-section {
          margin-top: 20px;
        }

        .trailer-title {
          text-align: center;
          margin-bottom: 15px;
        }

        .trailer-title h3 {
          margin: 0;
          font-size: 16px;
          font-weight: bold;
        }

        .container-row {
          display: flex;
          align-items: flex-start;
        }

        .no-of-containers {
          width: 120px;
          padding-top: 10px;
        }

        .container-boxes {
          display: flex;
          flex: 1;
          gap: 10px;
          margin-right: 20px;
        }

        .container-box {
          background-color: white;
          border-radius: 8px;
          padding: 10px;
          text-align: center;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          flex: 1;
        }

        .container-label {
          font-weight: bold;
          margin-bottom: 5px;
        }

        .container-box input {
          width: 100%;
          text-align: center;
          padding: 5px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .vat-rate {
          width: 150px;
        }

        .vat-input {
          text-align: center;
        }

        /* Button styling */
        .button-container {
          text-align: center;
          margin-top: 20px;
        }

        .add-container-button {
          background-color: #7fbfff;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 10px 20px;
          font-size: 16px;
          cursor: pointer;
          transition: background-color 0.3s;
        }

        .add-container-button:hover {
          background-color: #5aa9ff;
        }

        .time-input-group {
          position: relative;
          display: flex;
        }

        .time-input-group input[type="time"] {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #d9d9d9;
          border-radius: 4px;
          background-color: white;
        }

        /* Vessel Information styling */
        .vessel-info-container {
          width: 100%;
        }

        .vessel-info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .vessel-info-row:last-child {
          margin-bottom: 0;
        }

        .vessel-info-field {
          width: 48%;
        }

        .vessel-input {
          width: 100%;
          padding: 10px 15px;
          font-size: 15px;
          border: 1px solid #d9d9d9;
          border-radius: 4px;
          background-color: white;
        }

        /* Save note styling */
        .save-note {
          text-align: center;
          margin: 20px 0;
          padding: 10px;
          background-color: #fffbe6;
          border: 1px solid #ffe58f;
          border-radius: 4px;
        }

        .save-note p {
          margin: 0;
          color: #d48806;
          font-weight: 500;
        }
      `}</style>
    </div>
  )
}

export default FCcontrollerinstructions
