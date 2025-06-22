"use client"

import { useState, useEffect, useRef } from "react"
import "../../css/controllerinstruction.css"
import { useNavigate, useLocation } from "react-router-dom"
import ErrorModal from "../../../../components/ErrorModal"
import api from "../../../../api" // Import the axios instance
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
  const preservedContainers = location.state?.preservedContainers

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

  // Get today's date in MM/DD/YYYY format for min date validation
  const today = new Date()
  const todayFormatted = `${String(today.getMonth() + 1).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")}/${today.getFullYear()}`

  // State for form data
  const [formData, setFormData] = useState({
    clientId: clientId || "",
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
    bookingRef: "",
    rateWeight: "kg",
    rate: "",
    weight: "",
    num_six_meters: 0,
    num_twelve_meters: 0,
    num_abnormal: 0,
    vat: 15,
    description: "",
    status: "",
    total_cost: 0,
    vesselName: "",
    voyageNo: "",
    imoNo: "",
    flagReg: "",
  })

  // State for starting points and destinations
  const [startingPoints, setStartingPoints] = useState([])
  const [destinations, setDestinations] = useState([])

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
    startingPoints: true,
    destinations: true,
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
    bookingRef: useRef(null),
    rate: useRef(null),
    weight: useRef(null),
    num_six_meters: useRef(null),
    vat: useRef(null),
    description: useRef(null),
    vesselName: useRef(null),
    voyageNo: useRef(null),
    imoNo: useRef(null),
    flagReg: useRef(null),
  }

  // Updated handleBackClick function - ensure no database changes are made
  const handleBackClick = () => {
    const stateToPass = {
      clientId,
      clientName,
      selectedMonth,
      selectedYear,
      activeFilter,
    }

    console.log("Navigating back to instructions with state:", stateToPass)
    navigate("/instructions", { state: stateToPass })
  }

  // Function to scroll to a field with error
  const scrollToField = (fieldName) => {
    const fieldRef = fieldRefs[fieldName]
    if (fieldRef && fieldRef.current) {
      fieldRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
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

    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const year = date.getFullYear()
    const formattedDate = `${month}/${day}/${year}`

    const syntheticEvent = {
      target: {
        name: fieldName,
        value: formattedDate,
        type: "text",
      },
    }

    handleInputChange(syntheticEvent)
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
      const date = new Date(dateString)

      if (isNaN(date.getTime())) {
        console.error("Invalid date:", dateString)
        return ""
      }

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
      const [month, day, year] = dateString.split("/")
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
    } catch (error) {
      console.error("Error formatting date for API:", error, dateString)
      return dateString
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

  // Fetch starting points from API
  const fetchStartingPoints = async () => {
    setIsLoading((prev) => ({ ...prev, startingPoints: true }))
    try {
      console.log("Fetching starting points...")

      const response = await api.get("/api/starting-points")
      const data = response.data
      console.log("Starting points data received:", data.length, "records")
      setStartingPoints(data)
    } catch (error) {
      console.error("Error fetching starting points:", error)

      let errorMessage = "Failed to fetch starting points. Please try again."
      if (error.response) {
        const { status } = error.response
        errorMessage = `Failed to fetch starting points: ${status} ${error.response.statusText}`
      } else if (error.request) {
        errorMessage = "No response received from server. Please check your connection."
      }

      setErrorModal({
        isOpen: true,
        message: errorMessage,
      })
      setStartingPoints([])
    } finally {
      setIsLoading((prev) => ({ ...prev, startingPoints: false }))
    }
  }

  // Fetch destinations from API
  const fetchDestinations = async () => {
    setIsLoading((prev) => ({ ...prev, destinations: true }))
    try {
      console.log("Fetching destinations...")

      const response = await api.get("/api/destinations")
      const data = response.data
      console.log("Destinations data received:", data.length, "records")
      setDestinations(data)
    } catch (error) {
      console.error("Error fetching destinations:", error)

      let errorMessage = "Failed to fetch destinations. Please try again."
      if (error.response) {
        const { status } = error.response
        errorMessage = `Failed to fetch destinations: ${status} ${error.response.statusText}`
      } else if (error.request) {
        errorMessage = "No response received from server. Please check your connection."
      }

      setErrorModal({
        isOpen: true,
        message: errorMessage,
      })
      setDestinations([])
    } finally {
      setIsLoading((prev) => ({ ...prev, destinations: false }))
    }
  }

  // Fetch clients, shipment types, starting points, destinations, and instruction data on component mount
  useEffect(() => {
    fetchClients()
    fetchShipmentTypes()
    fetchStartingPoints()
    fetchDestinations()

    if (preservedFormData) {
      setFormData({
        ...preservedFormData,
        clientId: clientId || preservedFormData.clientId,
      })
      const shipmentTypeName = preservedFormData.shipmentTypeName || ""
      setIsImport(shipmentTypeName.toLowerCase() === "import")
      setIsLoading((prev) => ({ ...prev, instruction: false }))
    } else if (instructionId) {
      fetchInstructionData(instructionId)
    } else if (clientId) {
      setFormData((prev) => ({
        ...prev,
        clientId: clientId,
      }))
    }

    if (containerCounts) {
      setFormData((prev) => ({
        ...prev,
        num_six_meters: containerCounts.num_six_meters || prev.num_six_meters,
        num_twelve_meters: containerCounts.num_twelve_meters || prev.num_twelve_meters,
        num_abnormal: containerCounts.num_abnormal || prev.num_abnormal,
      }))

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

      const response = await api.get(`/api/instruction/${id}`)
      const data = response.data
      console.log("Instruction data received:", data)

      console.log("Original dates from database:", {
        pickupdate: data.pickupdate,
        stackdate: data.stackdate,
        deadline: data.deadline,
      })

      const formattedPickupDate = formatDateForInput(data.pickupdate)
      const formattedStackDate = formatDateForInput(data.stackdate)
      const formattedDeadlineDate = formatDateForInput(data.deadline)

      const formattedData = {
        clientId: clientId || data.client.toString(),
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
        pickupDate: formattedPickupDate,
        stackDate: formattedStackDate,
        deadline: formattedDeadlineDate,
        fileRef: data.fileref || "",
        bookingRef: data.booking_ref || "",
        rateWeight: data.rateweight || "kg",
        rate: data.rate ? data.rate.toString() : "",
        weight: data.weight ? formatWeightForDisplay(data.weight) : "",
        num_six_meters: data.num_six_meters || 0,
        num_twelve_meters: data.num_twelve_meters || 0,
        num_abnormal: data.num_abnormal || 0,
        vat: data.vat || 15,
        description: data.description || "",
        status: data.status || "",
        total_cost: data.total_cost || 0,
        vesselName: data.vessel_name || "",
        voyageNo: data.voyage_num || "",
        imoNo: data.imo_num || "",
        flagReg: data.flag_reg || "",
      }

      console.log("Formatted data for form:", formattedData)
      setFormData(formattedData)

      const shipmentTypeName = data.shipmenttype || ""
      setIsImport(shipmentTypeName.toLowerCase() === "import")
    } catch (error) {
      console.error("Error fetching instruction data:", error)

      let errorMessage = "Failed to fetch instruction data. Please try again."
      if (error.response) {
        const { status } = error.response
        errorMessage = `Failed to fetch instruction data: ${status} ${error.response.statusText}`
      } else if (error.request) {
        errorMessage = "No response received from server. Please check your connection."
      }

      setErrorModal({
        isOpen: true,
        message: errorMessage,
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

      const response = await api.get("/api/clients")
      const data = response.data
      console.log("Clients data received:", data.length, "records")
      setClients(data)

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

      let errorMessage = "Failed to fetch clients. Please try again."
      if (error.response) {
        const { status } = error.response
        errorMessage = `Failed to fetch clients: ${status} ${error.response.statusText}`
      } else if (error.request) {
        errorMessage = "No response received from server. Please check your connection."
      }

      setErrorModal({
        isOpen: true,
        message: errorMessage,
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

      const response = await api.get("/api/shipment-types")
      const data = response.data
      console.log("Shipment types data received:", data.length, "records")
      setShipmentTypes(data)
    } catch (error) {
      console.error("Error fetching shipment types:", error)

      let errorMessage = "Failed to fetch shipment types. Please try again."
      if (error.response) {
        const { status } = error.response
        errorMessage = `Failed to fetch shipment types: ${status} ${error.response.statusText}`
      } else if (error.request) {
        errorMessage = "No response received from server. Please check your connection."
      }

      setErrorModal({
        isOpen: true,
        message: errorMessage,
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
    setFieldErrors((prev) => ({ ...prev, clientId: "" }))
  }

  // Handle shipment type selection
  const handleShipmentTypeChange = (e) => {
    const shipmentTypeId = e.target.value
    const selectedShipmentType = shipmentTypes.find((type) => type.shipkey.toString() === shipmentTypeId)

    const shipmentTypeName = selectedShipmentType ? selectedShipmentType.shipmenttype : ""
    const isImportType = shipmentTypeName.toLowerCase() === "import"

    setIsImport(isImportType)

    setFormData({
      ...formData,
      shipmentTypeId,
      shipmentTypeName,
    })

    setTimeout(() => {
      updateTotalCost()
    }, 0)

    setIsDataModified(true)
    setFieldErrors((prev) => ({ ...prev, shipmentTypeId: "" }))
  }

  // Add this function to calculate total cost
  const calculateTotalCost = () => {
    const rate = Number.parseFloat(formData.rate)
    if (isNaN(rate)) return 0

    if (formData.rateWeight === "Container") {
      const totalContainers = formData.num_six_meters + formData.num_twelve_meters + formData.num_abnormal
      return rate * totalContainers
    } else {
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
      const numValue = Number.parseInt(value)
      const validValue = isNaN(numValue) || numValue < 0 ? 0 : numValue

      const updatedFormData = {
        ...formData,
        [name]: validValue,
      }

      if (formData.rateWeight === "Container") {
        const rate = Number.parseFloat(formData.rate)
        if (!isNaN(rate)) {
          const totalContainers =
            (name === "num_six_meters" ? validValue : updatedFormData.num_six_meters) +
            (name === "num_twelve_meters" ? validValue : updatedFormData.num_twelve_meters) +
            (name === "num_abnormal" ? validValue : updatedFormData.num_abnormal)
          updatedFormData.total_cost = rate * totalContainers
        }
      }

      setFormData(updatedFormData)
      setIsDataModified(true)
      setFieldErrors((prev) => ({ ...prev, [name]: "" }))
    } else if (name === "vat") {
      const vatValue = value.replace(/[^0-9]/g, "")

      if (vatValue === "" || /^\d+$/.test(vatValue)) {
        setFormData({
          ...formData,
          [name]: vatValue === "" ? "" : Number.parseInt(vatValue, 10),
        })
        setIsDataModified(true)
        setFieldErrors((prev) => ({ ...prev, vat: "" }))
      }
    } else if (name === "rateWeight") {
      const updatedFormData = {
        ...formData,
        [name]: value,
      }

      if (value === "Container") {
        updatedFormData.weight = null

        const rate = Number.parseFloat(formData.rate)
        if (!isNaN(rate)) {
          const totalContainers = formData.num_six_meters + formData.num_twelve_meters + formData.num_abnormal
          updatedFormData.total_cost = rate * totalContainers
        }
      } else {
        updatedFormData.weight = ""
        updatedFormData.total_cost = 0
      }

      setFormData(updatedFormData)
      setIsDataModified(true)
      setFieldErrors((prev) => ({ ...prev, [name]: "" }))
    } else if (name === "voyageNo") {
      if (value.length <= 15) {
        setFormData({
          ...formData,
          [name]: value,
        })
        setIsDataModified(true)
        setFieldErrors((prev) => ({ ...prev, [name]: "" }))
      } else {
        setFieldErrors((prev) => ({
          ...prev,
          [name]: "Voyage No. cannot exceed 15 characters",
        }))
      }
    } else if (name === "imoNo") {
      const numbersOnly = value.replace(/[^0-9]/g, "")

      if (value === numbersOnly && value.length <= 15) {
        setFormData({
          ...formData,
          [name]: value,
        })
        setIsDataModified(true)
        setFieldErrors((prev) => ({ ...prev, [name]: "" }))
      } else if (value !== numbersOnly) {
        setFieldErrors((prev) => ({
          ...prev,
          [name]: "IMO Number must contain only numbers",
        }))
      } else {
        setFieldErrors((prev) => ({
          ...prev,
          [name]: "IMO Number cannot exceed 15 characters",
        }))
      }
    } else if (name === "flagReg") {
      if (!/\d/.test(value)) {
        setFormData({
          ...formData,
          [name]: value,
        })
        setIsDataModified(true)
        setFieldErrors((prev) => ({ ...prev, [name]: "" }))
      } else {
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
      setFieldErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  // Update the handleContainerCountChange function to recalculate total_cost
  const handleContainerCountChange = (type, value) => {
    const numValue = Number.parseInt(value)
    const validValue = isNaN(numValue) || numValue < 0 ? 0 : numValue

    const updatedFormData = {
      ...formData,
      [type]: validValue,
    }

    if (formData.rateWeight === "Container") {
      const rate = Number.parseFloat(formData.rate)
      if (!isNaN(rate)) {
        const totalContainers =
          (type === "num_six_meters" ? validValue : updatedFormData.num_six_meters) +
          (type === "num_twelve_meters" ? validValue : updatedFormData.num_twelve_meters) +
          (type === "num_abnormal" ? validValue : updatedFormData.num_abnormal)
        updatedFormData.total_cost = rate * totalContainers
      }
    }

    setFormData(updatedFormData)
    setIsDataModified(true)
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
      "bookingRef",
      "rate",
      "description",
      "vesselName",
      "voyageNo",
      "imoNo",
      "flagReg",
    ]

    let isValid = true
    const errors = {}

    for (const field of requiredFields) {
      if (!formData[field]) {
        errors[field] = `This field is required`
        isValid = false
      }
    }

    if (formData.rate && isNaN(Number.parseFloat(formData.rate))) {
      errors.rate = "Rate must be a valid number"
      isValid = false
    }

    if ((formData.rateWeight === "kg" || formData.rateWeight === "m³") && !formData.weight) {
      errors.weight = `Please enter the weight in ${formData.rateWeight}`
      isValid = false
    }

    if (
      (formData.rateWeight === "kg" || formData.rateWeight === "m³") &&
      (formData.weight === "" || isNaN(Number.parseFloat(formData.weight)))
    ) {
      errors.weight = `Weight must be a valid number`
      isValid = false
    }

    const totalContainers = formData.num_six_meters + formData.num_twelve_meters + formData.num_abnormal
    if (totalContainers <= 0) {
      errors.num_six_meters = "Please add at least one container"
      isValid = false
    }

    if (formData.vat === "" || isNaN(Number.parseInt(formData.vat))) {
      errors.vat = "VAT must be a valid integer"
      isValid = false
    }

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

    if (formData.imoNo && /[^0-9]/.test(formData.imoNo)) {
      errors.imoNo = "IMO Number must contain only numbers"
      isValid = false
    } else if (formData.imoNo && formData.imoNo.length > 15) {
      errors.imoNo = "IMO Number cannot exceed 15 characters"
      isValid = false
    }

    if (formData.voyageNo && formData.voyageNo.length > 15) {
      errors.voyageNo = "Voyage No. cannot exceed 15 characters"
      isValid = false
    }

    if (formData.flagReg && /\d/.test(formData.flagReg)) {
      errors.flagReg = "Flag Registration must not contain numbers"
      isValid = false
    }

    setFieldErrors(errors)

    if (!isValid) {
      const firstErrorField = Object.keys(errors)[0]
      scrollToField(firstErrorField)

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

    const totalContainers = formData.num_six_meters + formData.num_twelve_meters + formData.num_abnormal
    const totalCost = calculateTotalCost()

    let weightValue = null
    if (formData.rateWeight === "kg" || formData.rateWeight === "m³") {
      weightValue = Number.parseFloat(formData.weight)
    }

    const updatedFormData = {
      ...formData,
      total_cost: totalCost,
      weight: weightValue,
    }

    const stateToPass = {
      controllerData: updatedFormData,
      isImport: isImportShipment(),
      totalContainers: totalContainers,
      instructionId: instructionId,
      clientId: clientId,
      clientName: clientName,
      selectedMonth: selectedMonth,
      selectedYear: selectedYear,
      activeFilter: activeFilter,
      preservedContainers: preservedContainers,
    }

    console.log("Navigating to FCcontrollerInstructionDetails with state:", stateToPass)

    navigate("/FCcontrollerInstructionDetails", { state: stateToPass })
  }

  // Retry fetching data
  const handleRetryFetch = () => {
    if (isLoading.clients || isLoading.shipmentTypes || isLoading.startingPoints || isLoading.destinations) {
      return
    }

    fetchClients()
    fetchShipmentTypes()
    fetchStartingPoints()
    fetchDestinations()
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
    <div className="controller-instruction-page-wrapper">
      {/* Error Modal */}
      {errorModal.isOpen && (
        <ErrorModal
          isOpen={errorModal.isOpen}
          onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
          message={errorModal.message}
        />
      )}

      {/* Back Button */}
      <div className="client-payments-header">
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

      {/* Loading indicator or retry button */}
      {isLoading.clients ||
      isLoading.shipmentTypes ||
      isLoading.instruction ||
      isLoading.startingPoints ||
      isLoading.destinations ? (
        <div style={{ textAlign: "center", padding: "20px" }}>
          <p>Loading data...</p>
        </div>
      ) : clients.length === 0 ||
        shipmentTypes.length === 0 ||
        startingPoints.length === 0 ||
        destinations.length === 0 ? (
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

      {/* Form with light blue background and sections */}
      <div className="form-container">
        {/* Section 1: Client Information */}
        <div className="form-section client-info-section">
          <div className="form-row">
            <div className="form-field">
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
            <div className="form-field">
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
            <div className="form-field">
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
            <div className="form-field">
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

        {/* Section 2: Shipment Information */}
        <div className="form-section">
          <div className="form-row">
            <div className="form-field">
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
            <div className="form-field">
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

          <div className="form-row">
            <div className="form-field">
              <label>Pick-Up Location</label>
              <div className="select-wrapper" ref={fieldRefs.pickup}>
                <select
                  className={`dropdown ${fieldErrors.pickup ? "error-field" : ""}`}
                  name="pickup"
                  value={formData.pickup}
                  onChange={handleInputChange}
                  disabled={isLoading.startingPoints || startingPoints.length === 0}
                >
                  <option value="" disabled>
                    Select Pick-Up Location
                  </option>
                  {startingPoints.map((point, index) => (
                    <option key={index} value={point.startingpoint}>
                      {point.startingpoint}
                    </option>
                  ))}
                </select>
                <ErrorTooltip message={fieldErrors.pickup} />
              </div>
            </div>
            <div className="form-field">
              <label>Drop-off</label>
              <div className="select-wrapper" ref={fieldRefs.dropoff}>
                <select
                  className={`dropdown ${fieldErrors.dropoff ? "error-field" : ""}`}
                  name="dropoff"
                  value={formData.dropoff}
                  onChange={handleInputChange}
                  disabled={isLoading.destinations || destinations.length === 0}
                >
                  <option value="" disabled>
                    Select Drop-off Location
                  </option>
                  {destinations.map((dest, index) => (
                    <option key={index} value={dest.destination}>
                      {dest.destination}
                    </option>
                  ))}
                </select>
                <ErrorTooltip message={fieldErrors.dropoff} />
              </div>
            </div>
            <div className="form-field checkbox-container">
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

          <div className="form-row date-row-with-separator">
            <div className="form-field">
              <label>Pick-up Time</label>
              <div className="date-input-group" ref={fieldRefs.pickupTime}>
                <input
                  type="time"
                  className={`form-input ${fieldErrors.pickupTime ? "error-field" : ""}`}
                  placeholder="Time here"
                  name="pickupTime"
                  value={formData.pickupTime}
                  onChange={handleInputChange}
                />
                <button className="calendar-button"></button>
                <ErrorTooltip message={fieldErrors.pickupTime} />
              </div>
            </div>
            <div className="form-field">
              <label>Pick-up Date</label>
              <div className="date-input-group" ref={fieldRefs.pickupDate}>
                <DatePicker
                  selected={parseDate(formData.pickupDate)}
                  onChange={(date) => handleDateChange(date, "pickupDate")}
                  dateFormat="MM/dd/yyyy"
                  className={`form-input ${fieldErrors.pickupDate ? "error-field" : ""}`}
                  placeholderText="Date here"
                  ref={pickupDateRef}
                  customInput={
                    <input
                      type="text"
                      className={`form-input ${fieldErrors.pickupDate ? "error-field" : ""}`}
                      placeholder="Date here"
                      name="pickupDate"
                      value={formData.pickupDate || ""}
                      onChange={handleInputChange}
                    />
                  }
                />
                <button
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
            <div className="form-field">
              <label>{isImport ? "ETA" : "Stack Date"}</label>
              <div className="date-input-group" ref={fieldRefs.stackDate}>
                <DatePicker
                  selected={parseDate(formData.stackDate)}
                  onChange={(date) => handleDateChange(date, "stackDate")}
                  dateFormat="MM/dd/yyyy"
                  className={`form-input ${fieldErrors.stackDate ? "error-field" : ""}`}
                  placeholderText="Date here"
                  ref={etaDateRef}
                  disabled={!formData.pickupDate}
                  minDate={parseDate(formData.pickupDate)}
                  customInput={
                    <input
                      type="text"
                      className={`form-input ${fieldErrors.stackDate ? "error-field" : ""}`}
                      placeholder="Date here"
                      name="stackDate"
                      value={formData.stackDate || ""}
                      onChange={handleInputChange}
                      disabled={!formData.pickupDate}
                    />
                  }
                />
                <button
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
            <div className="form-field">
              <label>Deadline</label>
              <div className="date-input-group" ref={fieldRefs.deadline}>
                <DatePicker
                  selected={parseDate(formData.deadline)}
                  onChange={(date) => handleDateChange(date, "deadline")}
                  dateFormat="MM/dd/yyyy"
                  className={`form-input ${fieldErrors.deadline ? "error-field" : ""}`}
                  placeholderText="Date here"
                  ref={deadlineDateRef}
                  disabled={!formData.stackDate}
                  minDate={parseDate(formData.stackDate) || parseDate(formData.pickupDate)}
                  customInput={
                    <input
                      type="text"
                      className={`form-input ${fieldErrors.deadline ? "error-field" : ""}`}
                      placeholder="Date here"
                      name="deadline"
                      value={formData.deadline || ""}
                      onChange={handleInputChange}
                      disabled={!formData.stackDate}
                    />
                  }
                />
                <button
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

        {/* Section 3: File Reference and Rates */}
        <div className="form-section">
          <div className="form-row">
            <div className="form-field">
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
            <div className="form-field rates-container">
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
                      const value = e.target.value
                      if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
                        handleInputChange(e)
                      }
                    }}
                  />
                  <ErrorTooltip message={fieldErrors.rate} />
                </div>
              </div>
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

          <div className="form-row trailer-container">
            <div className="trailer-title">
              <h3>Trailer Size</h3>
            </div>
            <div className="container-section">
              <div className="container-label">
                <label>No. of Containers</label>
                {fieldErrors.num_six_meters && (
                  <div className="container-error-message">{fieldErrors.num_six_meters}</div>
                )}
              </div>
              <div className="container-inputs">
                <div className="container-input">
                  <label>6m</label>
                  <input
                    type="number"
                    className={fieldErrors.num_six_meters ? "error-field" : ""}
                    value={formData.num_six_meters}
                    min="0"
                    name="num_six_meters"
                    onChange={(e) => handleContainerCountChange("num_six_meters", e.target.value)}
                  />
                </div>
                <div className="container-input">
                  <label>12m</label>
                  <input
                    type="number"
                    value={formData.num_twelve_meters}
                    min="0"
                    name="num_twelve_meters"
                    onChange={(e) => handleContainerCountChange("num_twelve_meters", e.target.value)}
                  />
                </div>
                <div className="container-input">
                  <label>Abnormal</label>
                  <input
                    type="number"
                    value={formData.num_abnormal}
                    min="0"
                    name="num_abnormal"
                    onChange={(e) => handleContainerCountChange("num_abnormal", e.target.value)}
                  />
                </div>
              </div>
              <div className="vat-container">
                <label>VAT Rate</label>
                <input
                  type="text"
                  className="form-input"
                  value={`${formData.vat}%`}
                  name="vat"
                  onChange={(e) => {
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
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Vessel Information */}
        <div className="form-section vessel-info-section">
          <div className="form-row">
            <div className="form-field">
              <label>Vessel Name</label>
              <div className="input-wrapper" ref={fieldRefs.vesselName}>
                <input
                  type="text"
                  className={`form-input ${fieldErrors.vesselName ? "error-field" : ""}`}
                  placeholder="Enter vessel name"
                  name="vesselName"
                  value={formData.vesselName}
                  onChange={handleInputChange}
                />
                <ErrorTooltip message={fieldErrors.vesselName} />
              </div>
            </div>
            <div className="form-field">
              <label>Voyage No.</label>
              <div className="input-wrapper" ref={fieldRefs.voyageNo}>
                <input
                  type="text"
                  className={`form-input ${fieldErrors.voyageNo ? "error-field" : ""}`}
                  placeholder="Enter voyage number"
                  name="voyageNo"
                  value={formData.voyageNo}
                  onChange={handleInputChange}
                  maxLength={15}
                />
                <ErrorTooltip message={fieldErrors.voyageNo} />
              </div>
            </div>
            <div className="form-field">
              <label>IMO No.</label>
              <div className="input-wrapper" ref={fieldRefs.imoNo}>
                <input
                  type="text"
                  className={`form-input ${fieldErrors.imoNo ? "error-field" : ""}`}
                  placeholder="Enter IMO number (numbers only)"
                  name="imoNo"
                  value={formData.imoNo}
                  onChange={handleInputChange}
                  maxLength={15}
                />
                <ErrorTooltip message={fieldErrors.imoNo} />
              </div>
            </div>
            <div className="form-field">
              <label>Flag Reg</label>
              <div className="input-wrapper" ref={fieldRefs.flagReg}>
                <input
                  type="text"
                  className={`form-input ${fieldErrors.flagReg ? "error-field" : ""}`}
                  placeholder="Enter flag registration (letters only)"
                  name="flagReg"
                  value={formData.flagReg}
                  onChange={handleInputChange}
                />
                <ErrorTooltip message={fieldErrors.flagReg} />
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Booking Reference</label>
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
          </div>
        </div>

        {/* Section 5: Description */}
        <div className="form-section description-section">
          <div className="form-row">
            <div className="form-field full-width">
              <label>Description from Client</label>
              <div className="textarea-wrapper" ref={fieldRefs.description}>
                <textarea
                  className={`form-textarea ${fieldErrors.description ? "error-field" : ""}`}
                  placeholder="Description from Client, like type of goods etc"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                ></textarea>
                <ErrorTooltip message={fieldErrors.description} />
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="button-container">
          <button
            className="add-container-button"
            onClick={handleSubmit}
            disabled={
              isLoading.clients ||
              isLoading.shipmentTypes ||
              isLoading.instruction ||
              isLoading.startingPoints ||
              isLoading.destinations ||
              clients.length === 0 ||
              shipmentTypes.length === 0 ||
              startingPoints.length === 0 ||
              destinations.length === 0
            }
          >
            Add Container Details
          </button>
        </div>
      </div>
    </div>
  )
}

export default FCcontrollerinstructions
