
"use client"

import { useState, useEffect, useRef } from "react"
import "../../css/controllerinstruction.css"
import { useNavigate, useLocation } from "react-router-dom"
import ErrorModal from "../../../../components/ErrorModal"
import api from "../../../../api"

const ControllerInstructions = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const preservedFormData = location.state?.preservedFormData
  const containerCounts = location.state?.containerCounts

  console.log("ControllerInstructions received state:", location.state)
  console.log("ControllerInstructions - preservedFormData:", preservedFormData)
  console.log("ControllerInstructions - containerCounts:", containerCounts)

  const pickupDateRef = useRef(null)
  const etaDateRef = useRef(null)
  const deadlineDateRef = useRef(null)

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
    bookingRef: useRef(null),
    fileRef: useRef(null),
    rate: useRef(null),
    sixMeterRate: useRef(null),
    twelveMeterRate: useRef(null),
    abnormalRate: useRef(null),
    weight: useRef(null),
    description: useRef(null),
    vesselName: useRef(null),
    voyageNo: useRef(null),
    imoNo: useRef(null),
    flagReg: useRef(null),
  }

  const [isImport, setIsImport] = useState(false)
  const today = new Date().toISOString().split("T")[0]
  const [sixMeterRate, setSixMeterRate] = useState("")
  const [twelveMeterRate, setTwelveMeterRate] = useState("")
  const [abnormalRate, setAbnormalRate] = useState("")
  const [weight, setWeight] = useState("")
  const [formData, setFormData] = useState(() => {
    if (preservedFormData) {
      if (containerCounts) {
        console.log("Initializing form data with container counts:", containerCounts)
        return {
          ...preservedFormData,
          num_six_meters: containerCounts["6m"],
          num_twelve_meters: containerCounts["12m"],
          num_abnormal: containerCounts["Abnormal"],
          rateWeight: "Container",
        }
      }
      return {
        ...preservedFormData,
        rateWeight: "Container",
      }
    }
    return {
      clientId: "",
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
      vesselName: "",
      voyageNo: "",
      imoNo: "",
      flagReg: "",
      rateWeight: "Container",
      rate: "",
      num_six_meters: 0,
      num_twelve_meters: 0,
      num_abnormal: 0,
      vat: 15,
      description: "",
      total_cost: 0,
    }
  })

  const [startingPoints, setStartingPoints] = useState([])
  const [destinations, setDestinations] = useState([])
  const [clients, setClients] = useState([])
  const [shipmentTypes, setShipmentTypes] = useState([])
  const [isLoading, setIsLoading] = useState({
    clients: true,
    shipmentTypes: true,
    startingPoints: true,
    destinations: true,
  })
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    message: "",
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [preservedContainers, setPreservedContainers] = useState(location.state?.preservedContainers || [])

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

  const openCalendar = (ref) => {
    ref.current.click()
  }

  useEffect(() => {
    fetchClients()
    fetchShipmentTypes()
    fetchStartingPoints()
    fetchDestinations()
    if (preservedFormData && preservedFormData.shipmentTypeName) {
      setIsImport(preservedFormData.shipmentTypeName.toLowerCase() === "import")
    }
  }, [])

  useEffect(() => {
    if (preservedFormData) {
      if (containerCounts) {
        console.log("Updating form data with container counts:", containerCounts)
        setFormData((prev) => ({
          ...preservedFormData,
          num_six_meters: containerCounts["6m"],
          num_twelve_meters: containerCounts["12m"],
          num_abnormal: containerCounts["Abnormal"],
          rateWeight: "Container",
        }))
      } else {
        setFormData({ ...preservedFormData, rateWeight: "Container" })
      }
      if (preservedFormData.shipmentTypeName) {
        setIsImport(preservedFormData.shipmentTypeName.toLowerCase() === "import")
      }
    }
  }, [preservedFormData, containerCounts])

  useEffect(() => {
    if (location.state?.preservedContainers) {
      setPreservedContainers(location.state.preservedContainers)
    }
  }, [location.state?.preservedContainers])

  const fetchClients = async () => {
    setIsLoading((prev) => ({ ...prev, clients: true }))
    try {
      console.log("Fetching active clients...")
      const response = await api.get("/api/active-clients")
      console.log("Active clients data received:", response.data.length, "records")
      setClients(response.data)
    } catch (error) {
      console.error("Error fetching active clients:", error)
      let errorMessage = "Failed to fetch active clients. Please try again."
      if (error.response) {
        const { status } = error.response
        errorMessage = `Failed to fetch active clients: ${status} ${error.response.statusText}`
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

  const fetchShipmentTypes = async () => {
    setIsLoading((prev) => ({ ...prev, shipmentTypes: true }))
    try {
      console.log("Fetching shipment types...")
      const response = await api.get("/api/shipment-types")
      console.log("Shipment types data received:", response.data.length, "records")
      setShipmentTypes(response.data)
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

  const fetchStartingPoints = async () => {
    setIsLoading((prev) => ({ ...prev, startingPoints: true }))
    try {
      console.log("Fetching starting points...")
      const response = await api.get("/api/starting-points")
      console.log("Starting points data received:", response.data.length, "records")
      setStartingPoints(response.data)
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

  const fetchDestinations = async () => {
    setIsLoading((prev) => ({ ...prev, destinations: true }))
    try {
      console.log("Fetching destinations...")
      const response = await api.get("/api/destinations")
      console.log("Destinations data received:", response.data.length, "records")
      setDestinations(response.data)
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
    setFieldErrors((prev) => ({ ...prev, clientId: "" }))
  }

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
    setFieldErrors((prev) => ({ ...prev, shipmentTypeId: "" }))
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    if (type === "checkbox") {
      setFormData({
        ...formData,
        [name]: checked,
      })
    } else if (name === "imoNo") {
      const numbersOnly = value.replace(/[^0-9]/g, "").slice(0, 15)
      setFormData({
        ...formData,
        [name]: numbersOnly,
      })
      setFieldErrors((prev) => ({ ...prev, [name]: "" }))
    } else if (name === "flagReg") {
      const lettersAndSpecialChars = value.replace(/[^a-zA-Z\s\-']/g, "")
      setFormData({
        ...formData,
        [name]: lettersAndSpecialChars,
      })
      setFieldErrors((prev) => ({ ...prev, [name]: "" }))
    } else if (name === "num_six_meters" || name === "num_twelve_meters" || name === "num_abnormal") {
      const numValue = Number.parseInt(value)
      const validValue = isNaN(numValue) ? 0 : Math.max(0, numValue)
      const prevValue = formData[name]
      const isIncreasing = validValue > prevValue
      const difference = Math.abs(validValue - prevValue)
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
      console.log(`Container count updated - ${name}: ${validValue}`)
      setFormData(updatedFormData)
      updatePreservedContainers(name, isIncreasing, difference)
      setFieldErrors((prev) => ({ ...prev, containers: "" }))
    } else if (name === "rateWeight") {
      const updatedFormData = {
        ...formData,
        [name]: value,
      }
      if (value === "Container") {
        const rate = Number.parseFloat(formData.rate)
        if (!isNaN(rate)) {
          const totalContainers = formData.num_six_meters + formData.num_twelve_meters + formData.num_abnormal
          updatedFormData.total_cost = rate * totalContainers
        }
      } else {
        updatedFormData.total_cost = 0
      }
      setFormData(updatedFormData)
      setFieldErrors((prev) => ({ ...prev, rateWeight: "", weight: "" }))
    } else if (name === "rate") {
      if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
        const updatedFormData = {
          ...formData,
          [name]: value,
        }
        const rate = Number.parseFloat(value)
        if (!isNaN(rate) && rate > 0) {
          if (formData.rateWeight === "Container") {
            const totalContainers = formData.num_six_meters + formData.num_twelve_meters + formData.num_abnormal
            updatedFormData.total_cost = rate * totalContainers
          }
        }
        setFormData(updatedFormData)
        setFieldErrors((prev) => ({ ...prev, [name]: "" }))
      }
    } else if (name === "pickupDate") {
      setFormData({
        ...formData,
        [name]: value,
        stackDate: formData.stackDate && new Date(formData.stackDate) <= new Date(value) ? "" : formData.stackDate,
        deadline: formData.deadline && new Date(formData.deadline) <= new Date(value) ? "" : formData.deadline,
      })
      setFieldErrors((prev) => ({ ...prev, pickupDate: "" }))
    } else {
      setFormData({
        ...formData,
        [name]: value,
      })
      setFieldErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const handleSixMeterRateChange = (e) => {
    const value = e.target.value
    if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
      setSixMeterRate(value)
      setFieldErrors((prev) => ({ ...prev, sixMeterRate: "" }))
    }
  }

  const handleTwelveMeterRateChange = (e) => {
    const value = e.target.value
    if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
      setTwelveMeterRate(value)
      setFieldErrors((prev) => ({ ...prev, twelveMeterRate: "" }))
    }
  }

  const handleAbnormalRateChange = (e) => {
    const value = e.target.value
    if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
      setAbnormalRate(value)
      setFieldErrors((prev) => ({ ...prev, abnormalRate: "" }))
    }
  }

  const handleWeightChange = (e) => {
    const value = e.target.value
    if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
      setWeight(value)
      setFieldErrors((prev) => ({ ...prev, weight: "" }))
    }
  }

  const updatePreservedContainers = (containerType, isIncreasing, difference) => {
    const containerTypeMap = {
      num_six_meters: "6m",
      num_twelve_meters: "12m",
      num_abnormal: "Abnormal",
    }
    const type = containerTypeMap[containerType]
    if (!type) return
    if (isIncreasing) {
      const newContainers = []
      const nextId = preservedContainers.length > 0 ? Math.max(...preservedContainers.map((c) => c.id)) + 1 : 1
      for (let i = 0; i < difference; i++) {
        newContainers.push({
          id: nextId + i,
          containerKey: null,
          containerNum: "",
          weight: isImport ? "" : null,
          containerType: type,
        })
      }
      setPreservedContainers([...preservedContainers, ...newContainers])
    } else {
      const containersOfType = preservedContainers.filter((c) => c.containerType === type)
      const containersToKeep = containersOfType.slice(0, containersOfType.length - difference)
      const otherContainers = preservedContainers.filter((c) => c.containerType !== type)
      const updatedContainers = [...otherContainers, ...containersToKeep].sort((a, b) => a.id - b.id)
      const reindexedContainers = updatedContainers.map((container, index) => ({
        ...container,
        id: index + 1,
      }))
      setPreservedContainers(reindexedContainers)
    }
  }

  const handleContainerCountChange = (type, value) => {
    const numValue = Number.parseInt(value)
    const validValue = isNaN(numValue) ? 0 : Math.max(0, numValue)
    const prevValue = formData[type]
    const isIncreasing = validValue > prevValue
    const difference = Math.abs(validValue - prevValue)
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
    console.log(`Container count changed - ${type}: ${validValue}`)
    setFormData(updatedFormData)
    updatePreservedContainers(type, isIncreasing, difference)
    setFieldErrors((prev) => ({ ...prev, containers: "" }))
  }

  const calculateTotalCost = () => {
    const rate = Number.parseFloat(formData.rate)
    if (isNaN(rate)) return 0
    if (formData.rateWeight === "Container") {
      const totalContainers = formData.num_six_meters + formData.num_twelve_meters + formData.num_abnormal
      return rate * totalContainers
    }
    return 0
  }

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
      "bookingRef",
      "fileRef",
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
    if (formData.shipmentTypeId) {
      const selectedShipmentType = shipmentTypes.find((type) => type.shipkey.toString() === formData.shipmentTypeId)
      if (selectedShipmentType) {
        const shipmentTypeName = selectedShipmentType.shipmenttype.toLowerCase()
        if (shipmentTypeName !== "import" && shipmentTypeName !== "export") {
          errors.shipmentTypeId = "Please select either Import or Export"
          isValid = false
        }
      }
    }
    if (formData.rate) {
      const rateValue = Number.parseFloat(formData.rate)
      if (isNaN(rateValue) || rateValue <= 0) {
        errors.rate = "Rate must be a positive number"
        isValid = false
      }
    }
    if (formData.num_six_meters > 0 && sixMeterRate === "") {
      errors.sixMeterRate = "Please add rate"
      isValid = false
    } else if (sixMeterRate !== "") {
      const sixMeterRateValue = Number.parseFloat(sixMeterRate)
      if (isNaN(sixMeterRateValue) || sixMeterRateValue <= 0) {
        errors.sixMeterRate = "Rate must be a positive number"
        isValid = false
      }
    }
    if (formData.num_twelve_meters > 0 && twelveMeterRate === "") {
      errors.twelveMeterRate = "Please add rate"
      isValid = false
    } else if (twelveMeterRate !== "") {
      const twelveMeterRateValue = Number.parseFloat(twelveMeterRate)
      if (isNaN(twelveMeterRateValue) || twelveMeterRateValue <= 0) {
        errors.twelveMeterRate = "Rate must be a positive number"
        isValid = false
      }
    }
    if (formData.num_abnormal > 0 && abnormalRate === "") {
      errors.abnormalRate = "Please add rate"
      isValid = false
    } else if (abnormalRate !== "") {
      const abnormalRateValue = Number.parseFloat(abnormalRate)
      if (isNaN(abnormalRateValue) || abnormalRateValue <= 0) {
        errors.abnormalRate = "Rate must be a positive number"
        isValid = false
      }
    }
    if (formData.rateWeight !== "Container" && weight === "") {
      errors.weight = "Please add weight"
      isValid = false
    } else if (weight !== "") {
      const weightValue = Number.parseFloat(weight)
      if (isNaN(weightValue) || weightValue <= 0) {
        errors.weight = "Weight must be a positive number"
        isValid = false
      }
    }
    if (formData.imoNo && !/^\d+$/.test(formData.imoNo)) {
      errors.imoNo = "IMO Number must contain only numbers"
      isValid = false
    }
    if (formData.flagReg && !/^[a-zA-Z\s\-']+$/.test(formData.flagReg)) {
      errors.flagReg = "Flag Registration must contain only letters, spaces, hyphens, and apostrophes"
      isValid = false
    }
    const totalContainers = formData.num_six_meters + formData.num_twelve_meters + formData.num_abnormal
    if (totalContainers <= 0) {
      errors.containers = "Please add at least one container"
      isValid = false
    }
    if (formData.stackDate && formData.pickupDate && new Date(formData.stackDate) < new Date(formData.pickupDate)) {
      errors.stackDate = `${isImport ? "ETA" : "Stack date"} cannot be before pickup date`
      isValid = false
    }
    if (formData.deadline && formData.pickupDate && new Date(formData.deadline) < new Date(formData.pickupDate)) {
      errors.deadline = "Deadline cannot be before pickup date"
      isValid = false
    }
    if (formData.deadline && formData.stackDate && new Date(formData.deadline) < new Date(formData.stackDate)) {
      errors.deadline = `Deadline cannot be before ${isImport ? "ETA" : "stack date"}`
      isValid = false
    }
    setFieldErrors(errors)
    if (!isValid) {
      const firstErrorField = Object.keys(errors)[0]
      scrollToField(firstErrorField)
    }
    return isValid
  }

  const handleSubmit = () => {
    if (!validateForm()) {
      return
    }
    const totalContainers = formData.num_six_meters + formData.num_twelve_meters + formData.num_abnormal
    const totalCost = calculateTotalCost()
    const updatedFormData = {
      ...formData,
      total_cost: totalCost,
    }
    const containerCounts = {
      "6m": formData.num_six_meters,
      "12m": formData.num_twelve_meters,
      Abnormal: formData.num_abnormal,
    }
    console.log("Navigating to ControllerInstructionDetails with container counts:", containerCounts)
    console.log("Preserved containers:", preservedContainers)
    navigate("/ControllerInstructionDetails", {
      state: {
        controllerData: {
          ...updatedFormData,
          num_six_meters: formData.num_six_meters,
          num_twelve_meters: formData.num_twelve_meters,
          num_abnormal: formData.num_abnormal,
          booking_ref: formData.bookingRef,
          file_ref: formData.fileRef,
          vessel_name: formData.vesselName,
          voyage_num: formData.voyageNo,
          imo_num: formData.imoNo,
          flag_reg: formData.flagReg,
        },
        isImport: formData.shipmentTypeName.toLowerCase() === "import",
        totalContainers: totalContainers,
        preservedContainers: preservedContainers,
        instructionId: location.state?.instructionId,
        clientId: location.state?.clientId,
        clientName: location.state?.clientName,
        selectedMonth: location.state?.selectedMonth,
        selectedYear: location.state?.selectedYear,
        activeFilter: location.state?.activeFilter,
        containerCounts: containerCounts,
      },
    })
  }

  const handleRetryFetch = () => {
    if (isLoading.clients || isLoading.shipmentTypes || isLoading.startingPoints || isLoading.destinations) {
      return
    }
    fetchClients()
    fetchShipmentTypes()
    fetchStartingPoints()
    fetchDestinations()
    setErrorModal({
      isOpen: false,
      message: "",
    })
  }

  const nonEditableStyle = {
    backgroundColor: "#f0f0f0",
    cursor: "not-allowed",
  }

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
      {errorModal.isOpen && errorModal.message.includes("Failed to fetch") && (
        <ErrorModal
          isOpen={errorModal.isOpen}
          onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
          message={errorModal.message}
        />
      )}
      <div className="client-payments-header">
        <button className="back-button" onClick={() => navigate("/ControllerDashboard")}>
          Back
        </button>
      </div>
      {isLoading.clients || isLoading.shipmentTypes || isLoading.startingPoints || isLoading.destinations ? (
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
      <div className="form-container" style={{ maxWidth: '1200px' }}>
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
                  disabled={isLoading.clients || clients.length === 0}
                >
                  <option value="" disabled>
                    Select Client
                  </option>
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
        <div className="form-section">
          <div className="form-row" style={{ display: 'none' }}>
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
            <div className="form-field checkbox-container" style={{ display: 'none' }}>
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
        </div>
        <div className="form-section">
          <div className="form-row trailer-container">
            <div className="trailer-title" style={{ display: 'none' }}>
              <h3>Trailer Size</h3>
            </div>
            <hr className="divider" style={{ display: 'none' }} />

            <div className="container-section">
              <div className="container-group">
                <div className="container-label">
                  <span className="trailer-size-label">Trailer Size</span>
                  <label>No. of Containers</label>
                  {fieldErrors.containers && <div className="container-error-message">{fieldErrors.containers}</div>}
                </div>
                <div className="container-inputs">
                  <div className="container-input">
                    <label>6m</label>
                    <div className="container-rate-group">
                      <input
                        type="number"
                        className={fieldErrors.containers ? "error-field" : ""}
                        value={formData.num_six_meters}
                        min="0"
                        name="num_six_meters"
                        onChange={(e) => handleContainerCountChange("num_six_meters", e.target.value)}
                      />
                      <div className="input-wrapper rate-input" ref={fieldRefs.sixMeterRate}>
                        <input
                          type="text"
                          className={`form-input ${fieldErrors.sixMeterRate ? "error-field" : ""}`}
                          placeholder="Rate"
                          value={sixMeterRate}
                          onChange={handleSixMeterRateChange}
                        />
                        <ErrorTooltip message={fieldErrors.sixMeterRate} />
                      </div>
                    </div>
                  </div>
                  <div className="container-input">
                    <label>12m</label>
                    <div className="container-rate-group">
                      <input
                        type="number"
                        className={fieldErrors.containers ? "error-field" : ""}
                        value={formData.num_twelve_meters}
                        min="0"
                        name="num_twelve_meters"
                        onChange={(e) => handleContainerCountChange("num_twelve_meters", e.target.value)}
                      />
                      <div className="input-wrapper rate-input" ref={fieldRefs.twelveMeterRate}>
                        <input
                          type="text"
                          className={`form-input ${fieldErrors.twelveMeterRate ? "error-field" : ""}`}
                          placeholder="Rate"
                          value={twelveMeterRate}
                          onChange={handleTwelveMeterRateChange}
                        />
                        <ErrorTooltip message={fieldErrors.twelveMeterRate} />
                      </div>
                    </div>
                  </div>
                  <div className="container-input">
                    <label>Abnormal</label>
                    <div className="container-rate-group">
                      <input
                        type="number"
                        className={fieldErrors.containers ? "error-field" : ""}
                        value={formData.num_abnormal}
                        min="0"
                        name="num_abnormal"
                        onChange={(e) => handleContainerCountChange("num_abnormal", e.target.value)}
                      />
                      <div className="input-wrapper rate-input" ref={fieldRefs.abnormalRate}>
                        <input
                          type="text"
                          className={`form-input ${fieldErrors.abnormalRate ? "error-field" : ""}`}
                          placeholder="Rate"
                          value={abnormalRate}
                          onChange={handleAbnormalRateChange}
                        />
                        <ErrorTooltip message={fieldErrors.abnormalRate} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Rates per dropdown moved inside container inputs */}
                <div className="container-input rates-per-row" style={{ display: 'none' }}>
                  <label>Rates per</label>
                  <div className="container-rate-group">
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
                    {(formData.rateWeight === "kg" || formData.rateWeight === "m³") && (
                      <div className="weight-input-group" ref={fieldRefs.weight} style={{ marginLeft: '8px' }}>
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

              <div className="booking-vertical-group" style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '220px' }}>
                  <div className="form-field">
                    <label>Booking Reference</label>
                    <div className="input-wrapper" ref={fieldRefs.bookingRef}>
                      <input
                        type="text"
                        className={`form-input ${fieldErrors.bookingRef ? "error-field" : ""}`}
                        placeholder="Enter booking ref"
                        name="bookingRef"
                        value={formData.bookingRef}
                        onChange={handleInputChange}
                      />
                      <ErrorTooltip message={fieldErrors.bookingRef} />
                    </div>
                  </div>
                  <div className="form-field">
                    <label>File Ref</label>
                    <div className="input-wrapper" ref={fieldRefs.fileRef}>
                      <input
                        type="text"
                        className={`form-input ${fieldErrors.fileRef ? "error-field" : ""}`}
                        placeholder="Enter file ref"
                        name="fileRef"
                        value={formData.fileRef}
                        onChange={handleInputChange}
                      />
                      <ErrorTooltip message={fieldErrors.fileRef} />
                    </div>
                  </div>
                  <div className="form-field" style={{ maxWidth: '120px' }}>
                    <label>VAT Rate</label>
                    <div className="input-wrapper">
                      <input type="text" className="form-input" value={`${formData.vat || 15}%`} readOnly />
                    </div>
                  </div>

                  {/* Compact Rates per dropdown inserted below VAT */}
                  <div className="form-field" style={{ maxWidth: '160px' }}>
                    <label>Rates per</label>
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
                    {/* conditional weight textbox */}
                    {(formData.rateWeight === "kg" || formData.rateWeight === "m³") && (
                      <div className="input-wrapper" style={{ marginTop: '6px' }} ref={fieldRefs.weight}>
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
                    )}
                  </div>
                </div>

                {/* Rates per selection */}
              <div className="form-field rates-container" style={{ display: 'none' }}>
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
                  <div className="input-wrapper" ref={fieldRefs.rate} style={{ display: 'none' }}>
                    <input
                      type="text"
                      className={`form-input ${fieldErrors.rate ? "error-field" : ""}`}
                      placeholder="Rate"
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
                  <div className="weight-input-group" ref={fieldRefs.weight} style={{ marginTop: '8px' }}>
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

              {/* Rate Type and VAT Rate moved to bottom of form */}

              {/* Hazardous / Surcharge checkboxes moved below Rate Type */}
              <div className="date-time-group">
                <div className="shipment-task-row" style={{ order: -1, marginBottom: '8px' }}>
                  <div className="form-field small-field">
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
                  <div className="form-field small-field">
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
                  {/* Booking / File / VAT inline with task */}
                  <div className="booking-inline-row" style={{ display: 'none' }}>
                    <div className="form-field small-field" style={{ flex: '0 1 160px' }}>
                      <label>Booking Reference</label>
                      <div className="input-wrapper" ref={fieldRefs.bookingRef}>
                        <input
                          type="text"
                          className={`form-input ${fieldErrors.bookingRef ? "error-field" : ""}`}
                          placeholder="Enter booking ref"
                          name="bookingRef"
                          value={formData.bookingRef}
                          onChange={handleInputChange}
                        />
                        <ErrorTooltip message={fieldErrors.bookingRef} />
                      </div>
                    </div>
                    <div className="form-field small-field" style={{ flex: '0 1 160px' }}>
                      <label>File Ref</label>
                      <div className="input-wrapper" ref={fieldRefs.fileRef}>
                        <input
                          type="text"
                          className={`form-input ${fieldErrors.fileRef ? "error-field" : ""}`}
                          placeholder="Enter file ref"
                          name="fileRef"
                          value={formData.fileRef}
                          onChange={handleInputChange}
                        />
                        <ErrorTooltip message={fieldErrors.fileRef} />
                      </div>
                    </div>
                    <div className="form-field small-field" style={{ flex: '0 1 120px' }}>
                      <label>VAT Rate</label>
                      <div className="input-wrapper">
                        <input type="text" className="form-input" value={`${formData.vat || 15}%`} readOnly />
                      </div>
                    </div>
                  </div>

                  {/* Vessel Details - inline with task/pickup fields */}
                  <div className="vessel-info-inline" style={{ display: 'none' }}>
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
                </div>
                <div className="shipment-task-row" style={{ display: 'none' }}>
                  <div className="form-field small-field">
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
                  <div className="form-field small-field">
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
                <div className="date-time-row-1" style={{ display: 'flex', gap: '15px' }}>
                  <div className="form-field" style={{ flex: '1', minWidth: '0' }}>
                    <label>Pick-Up Location</label>
                    <div className="date-input-group" ref={fieldRefs.pickup} style={{ width: '100%' }}>
                      <select
                        className={`form-input ${fieldErrors.pickup ? "error-field" : ""}`}
                        name="pickup"
                        value={formData.pickup}
                        onChange={handleInputChange}
                        disabled={isLoading.startingPoints || startingPoints.length === 0}
                        style={{ width: '100%', maxWidth: '75%' }}
                      >
                        <option value="" disabled>Select Pick-Up Location</option>
                        {startingPoints.map((point, index) => (
                          <option key={index} value={point.startingpoint}>
                            {point.startingpoint}
                          </option>
                        ))}
                      </select>
                      <ErrorTooltip message={fieldErrors.pickup} />
                    </div>
                  </div>
                  <div className="form-field" style={{ flex: '1', minWidth: '0' }}>
                    <label>Drop-off Location</label>
                    <div className="date-input-group" ref={fieldRefs.dropoff} style={{ width: '100%' }}>
                      <select
                        className={`form-input ${fieldErrors.dropoff ? "error-field" : ""}`}
                        name="dropoff"
                        value={formData.dropoff}
                        onChange={handleInputChange}
                        disabled={isLoading.destinations || destinations.length === 0}
                        style={{ width: '100%', maxWidth: '75%' }}
                      >
                        <option value="" disabled>Select Drop-off Location</option>
                        {destinations.map((dest, index) => (
                          <option key={index} value={dest.destination}>
                            {dest.destination}
                          </option>
                        ))}
                      </select>
                      <ErrorTooltip message={fieldErrors.dropoff} />
                    </div>
                  </div>
                </div>
                <div className="date-time-row-1" style={{ marginTop: '15px', display: 'flex', gap: '15px' }}>
                  <div className="form-field" style={{ flex: '1', minWidth: '0' }}>
                    <label>Pick-up Time</label>
                    <div className="date-input-group" ref={fieldRefs.pickupTime} style={{ width: '100%' }}>
                      <input
                        type="time"
                        className={`form-input ${fieldErrors.pickupTime ? "error-field" : ""}`}
                        placeholder="Time here"
                        name="pickupTime"
                        value={formData.pickupTime}
                        onChange={handleInputChange}
                        style={{ width: '75%' }}
                      />
                      <button className="calendar-button"></button>
                      <ErrorTooltip message={fieldErrors.pickupTime} />
                    </div>
                  </div>
                  <div className="form-field" style={{ flex: '1', minWidth: '0' }}>
                    <label>Pick-up Date</label>
                    <div className="date-input-group" ref={fieldRefs.pickupDate} style={{ width: '100%' }}>
                      <input
                        type="date"
                        className={`form-input ${fieldErrors.pickupDate ? "error-field" : ""}`}
                        ref={pickupDateRef}
                        placeholder="Date here"
                        name="pickupDate"
                        value={formData.pickupDate}
                        onChange={handleInputChange}
                        style={{ width: '75%' }}
                      />
                      <button className="calendar-button" onClick={() => openCalendar(pickupDateRef)}></button>
                      <ErrorTooltip message={fieldErrors.pickupDate} />
                    </div>
                  </div>
                </div>
                <div className="date-time-row-2" style={{ display: 'flex', gap: '15px' }}>
                  <div className="form-field" style={{ flex: '1', minWidth: '0' }}>
                    <label>{isImport ? "ETA" : "Stack Date"}</label>
                    <div className="date-input-group" ref={fieldRefs.stackDate} style={{ width: '100%' }}>
                      <input
                        type="date"
                        className={`form-input ${fieldErrors.stackDate ? "error-field" : ""}`}
                        ref={etaDateRef}
                        placeholder="Date here"
                        name="stackDate"
                        value={formData.stackDate}
                        onChange={handleInputChange}
                        min={formData.pickupDate || today}
                        disabled={!formData.pickupDate}
                        style={{ width: '75%' }}
                      />
                      <button
                        className="calendar-button"
                        onClick={() =>
                          formData.pickupDate
                            ? openCalendar(etaDateRef)
                            : setErrorModal({
                                isOpen: true,
                                message: "Please select a pickup date first",
                              })
                        }
                      ></button>
                      <ErrorTooltip message={fieldErrors.stackDate} />
                    </div>
                  </div>
                  <div className="form-field" style={{ flex: '1', minWidth: '0' }}>
                    <label>Deadline</label>
                    <div className="date-input-group" ref={fieldRefs.deadline} style={{ width: '100%' }}>
                      <input
                        type="date"
                        className={`form-input ${fieldErrors.deadline ? "error-field" : ""}`}
                        ref={deadlineDateRef}
                        placeholder="Date here"
                        name="deadline"
                        value={formData.deadline}
                        onChange={handleInputChange}
                        min={formData.stackDate || formData.pickupDate || today}
                        disabled={!formData.stackDate}
                        style={{ width: '75%' }}
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
                          } else {
                            openCalendar(deadlineDateRef)
                          }
                        }}
                      ></button>
                      <ErrorTooltip message={fieldErrors.deadline} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="form-section vessel-info-section" style={{ marginTop: '16px' }}>
          <div className="form-row vessel-info-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-start', width: '100%' }}>
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
            {/* Description from Client */}
            <div className="form-field description-field" style={{ flex: '1 1 180px', minWidth: '160px', maxWidth: '180px' }}>
              <label>Description from Client</label>
              <div className="textarea-wrapper" ref={fieldRefs.description}>
                <textarea
                  className={`form-textarea ${fieldErrors.description ? "error-field" : ""}`}
                  placeholder="Description from Client"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  style={{ height: '60px', width: '100%', resize: 'vertical' }}
                ></textarea>
                <ErrorTooltip message={fieldErrors.description} />
              </div>
            </div>
            <div className="form-field ref-group" style={{ display: 'none' }}>
              <label>VAT Rate</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  className="form-input"
                  value={`${formData.vat || 15}%`}
                  readOnly
                />
              </div>
            </div>
          </div>
        </div>
        <div className="form-section description-section" style={{ display: 'none' }}>
          <div className="form-row">
            <div className="form-field full-width" style={{ width: '100%' }}>
              <label>Description from Client</label>
              <div className="textarea-wrapper" ref={fieldRefs.description}>
                <textarea
                  className={`form-textarea ${fieldErrors.description ? "error-field" : ""}`}
                  placeholder="Description from Client, like type of goods etc"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  style={{ width: '100%' }}
                ></textarea>
                <ErrorTooltip message={fieldErrors.description} />
              </div>
            </div>
          </div>
        </div>
        <div className="button-container">
          <button
            className="add-container-button"
            onClick={handleSubmit}
            disabled={
              isLoading.clients ||
              isLoading.shipmentTypes ||
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
      {/* Booking fields below Abnormal */}
      <div className="booking-group" style={{ display: 'none' }}>
        <div className="form-field">
          <label>Booking Reference</label>
          <div className="input-wrapper" ref={fieldRefs.bookingRef}>
            <input type="text" className={`form-input ${fieldErrors.bookingRef ? 'error-field' : ''}`} placeholder="Enter booking ref" name="bookingRef" value={formData.bookingRef} onChange={handleInputChange} />
            <ErrorTooltip message={fieldErrors.bookingRef} />
          </div>
        </div>
        <div className="form-field">
          <label>File Ref</label>
          <div className="input-wrapper" ref={fieldRefs.fileRef}>
            <input type="text" className={`form-input ${fieldErrors.fileRef ? 'error-field' : ''}`} placeholder="Enter file ref" name="fileRef" value={formData.fileRef} onChange={handleInputChange} />
            <ErrorTooltip message={fieldErrors.fileRef} />
          </div>
        </div>
        <div className="form-field" style={{ maxWidth: '120px' }}>
          <label>VAT Rate</label>
          <div className="input-wrapper">
            <input type="text" className="form-input" value={`${formData.vat || 15}%`} readOnly />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ControllerInstructions
