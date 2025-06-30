
"use client"

import { useState, useEffect, useRef } from "react"
import "../../css/controllerinstruction.css"
import { useNavigate, useLocation } from "react-router-dom"
import ErrorModal from "../../../../components/ErrorModal"
import api from "../../../../api"

const FCcontrollerinstructions = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const preservedFormData = location.state?.preservedFormData
  const containerCounts = location.state?.containerCounts
  const instructionId = location.state?.instructionId

  console.log("FCcontrollerinstructions received state:", location.state)
  console.log("FCcontrollerinstructions - preservedFormData:", preservedFormData)
  console.log("FCcontrollerinstructions - containerCounts:", containerCounts)
  console.log("FCcontrollerinstructions - instructionId:", instructionId)

  // Extract all state from location
  const clientId = location.state?.clientId
  const clientName = location.state?.clientName
  const selectedMonth = location.state?.selectedMonth
  const selectedYear = location.state?.selectedYear
  const activeFilter = location.state?.activeFilter

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

  // Initialize rate states with preserved data or empty strings
  const [sixMeterRate, setSixMeterRate] = useState(() => {
    return preservedFormData?.sixMeterRate || preservedFormData?.rateper_6?.toString() || ""
  })
  const [twelveMeterRate, setTwelveMeterRate] = useState(() => {
    return preservedFormData?.twelveMeterRate || preservedFormData?.rateper_12?.toString() || ""
  })
  const [abnormalRate, setAbnormalRate] = useState(() => {
    return preservedFormData?.abnormalRate || preservedFormData?.rateper_abnormal?.toString() || ""
  })
  const [weight, setWeight] = useState("")

  // NEW: Track previous container counts to detect changes from 0 to >0
  const [prevContainerCounts, setPrevContainerCounts] = useState({
    num_six_meters: 0,
    num_twelve_meters: 0,
    num_abnormal: 0,
  })

  const [formData, setFormData] = useState(() => {
    if (preservedFormData) {
      // If we have container counts from navigation, use them
      if (containerCounts) {
        console.log("Initializing form data with container counts:", containerCounts)
        const initialData = {
          ...preservedFormData,
          num_six_meters: containerCounts["6m"],
          num_twelve_meters: containerCounts["12m"],
          num_abnormal: containerCounts["Abnormal"],
          rateWeight: "Container",
          weight: "",
        }
        // Set initial previous counts
        setPrevContainerCounts({
          num_six_meters: containerCounts["6m"],
          num_twelve_meters: containerCounts["12m"],
          num_abnormal: containerCounts["Abnormal"],
        })
        return initialData
      }
      const initialData = {
        ...preservedFormData,
        rateWeight: "Container",
      }
      // Set initial previous counts
      setPrevContainerCounts({
        num_six_meters: preservedFormData.num_six_meters || 0,
        num_twelve_meters: preservedFormData.num_twelve_meters || 0,
        num_abnormal: preservedFormData.num_abnormal || 0,
      })
      return initialData
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
      weight: "",
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
    instruction: instructionId ? true : false,
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

    // Always fetch fresh data when instructionId exists and no preserved data
    if (instructionId && !preservedFormData) {
      console.log("Calling fetchInstructionData with ID:", instructionId)
      fetchInstructionData(instructionId)
    } else if (preservedFormData && preservedFormData.shipmentTypeName) {
      setIsImport(preservedFormData.shipmentTypeName.toLowerCase() === "import")
    }
  }, [instructionId])

  // Update form data when preserved data changes
  useEffect(() => {
    if (preservedFormData) {
      console.log("Updating form with preserved data:", preservedFormData)

      // Update form data
      if (containerCounts) {
        console.log("Updating form data with container counts:", containerCounts)
        const newFormData = {
          ...preservedFormData,
          num_six_meters: containerCounts["6m"],
          num_twelve_meters: containerCounts["12m"],
          num_abnormal: containerCounts["Abnormal"],
          rateWeight: "Container",
          weight: "",
        }
        setFormData(newFormData)
        // Update previous counts
        setPrevContainerCounts({
          num_six_meters: containerCounts["6m"],
          num_twelve_meters: containerCounts["12m"],
          num_abnormal: containerCounts["Abnormal"],
        })
      } else {
        const newFormData = { ...preservedFormData, rateWeight: "Container" }
        setFormData(newFormData)
        // Update previous counts
        setPrevContainerCounts({
          num_six_meters: preservedFormData.num_six_meters || 0,
          num_twelve_meters: preservedFormData.num_twelve_meters || 0,
          num_abnormal: preservedFormData.num_abnormal || 0,
        })
      }

      // Update shipment type
      if (preservedFormData.shipmentTypeName) {
        setIsImport(preservedFormData.shipmentTypeName.toLowerCase() === "import")
      }

      // Update rate values from preserved data - check multiple possible sources
      if (preservedFormData.sixMeterRate !== undefined) {
        setSixMeterRate(preservedFormData.sixMeterRate)
      } else if (preservedFormData.rateper_6 !== undefined) {
        setSixMeterRate(preservedFormData.rateper_6.toString())
      }

      if (preservedFormData.twelveMeterRate !== undefined) {
        setTwelveMeterRate(preservedFormData.twelveMeterRate)
      } else if (preservedFormData.rateper_12 !== undefined) {
        setTwelveMeterRate(preservedFormData.rateper_12.toString())
      }

      if (preservedFormData.abnormalRate !== undefined) {
        setAbnormalRate(preservedFormData.abnormalRate)
      } else if (preservedFormData.rateper_abnormal !== undefined) {
        setAbnormalRate(preservedFormData.rateper_abnormal.toString())
      }
    }
  }, [preservedFormData, containerCounts])

  useEffect(() => {
    if (location.state?.preservedContainers) {
      setPreservedContainers(location.state.preservedContainers)
    }
  }, [location.state?.preservedContainers])

  // NEW: Effect to handle rate auto-population when count changes from 0 to >0
  useEffect(() => {
    // Only run if we have clients data and form data with clientId
    if (clients.length === 0 || !formData.clientId) {
      return
    }

    const selectedClient = clients.find((client) => client.m5clientkey.toString() === formData.clientId.toString())
    if (!selectedClient) {
      return
    }

    // Handle 6-meter containers
    const sixMeterChanged = prevContainerCounts.num_six_meters === 0 && formData.num_six_meters > 0
    if (sixMeterChanged) {
      // Only populate if current rate is empty or zero
      if (
        (sixMeterRate === "" || sixMeterRate === "0" || Number(sixMeterRate) === 0) &&
        selectedClient.driver_six_meter_rate
      ) {
        const newRate = selectedClient.driver_six_meter_rate.toString()
        setSixMeterRate(newRate)
        console.log(`Auto-populated 6m rate: ${newRate} (count changed from 0 to ${formData.num_six_meters})`)
      }
    }

    // Handle 12-meter containers
    const twelveMeterChanged = prevContainerCounts.num_twelve_meters === 0 && formData.num_twelve_meters > 0
    if (twelveMeterChanged) {
      // Only populate if current rate is empty or zero
      if (
        (twelveMeterRate === "" || twelveMeterRate === "0" || Number(twelveMeterRate) === 0) &&
        selectedClient.driver_twelve_meter_rate
      ) {
        const newRate = selectedClient.driver_twelve_meter_rate.toString()
        setTwelveMeterRate(newRate)
        console.log(`Auto-populated 12m rate: ${newRate} (count changed from 0 to ${formData.num_twelve_meters})`)
      }
    }

    // Clear rates when count goes to 0
    if (formData.num_six_meters === 0 && prevContainerCounts.num_six_meters > 0) {
      setSixMeterRate("")
      console.log("Cleared 6m rate (count went to 0)")
    }

    if (formData.num_twelve_meters === 0 && prevContainerCounts.num_twelve_meters > 0) {
      setTwelveMeterRate("")
      console.log("Cleared 12m rate (count went to 0)")
    }

    if (formData.num_abnormal === 0 && prevContainerCounts.num_abnormal > 0) {
      setAbnormalRate("")
      console.log("Cleared abnormal rate (count went to 0)")
    }

    // Update previous counts for next comparison
    setPrevContainerCounts({
      num_six_meters: formData.num_six_meters,
      num_twelve_meters: formData.num_twelve_meters,
      num_abnormal: formData.num_abnormal,
    })
  }, [
    formData.num_six_meters,
    formData.num_twelve_meters,
    formData.num_abnormal,
    clients,
    formData.clientId,
    sixMeterRate,
    twelveMeterRate,
    abnormalRate,
  ])

  // Fetch instruction data by ID
  const fetchInstructionData = async (id) => {
    setIsLoading((prev) => ({ ...prev, instruction: true }))
    try {
      console.log(`Fetching instruction data for ID: ${id}`)
      const response = await api.get(`/api/instruction/${id}`)
      const data = response.data

      console.log("Instruction data received:", data)

      // Set the main form data
      const newFormData = {
        clientId: data.client ? data.client.toString() : "",
        representative: data.representative || "",
        contactDetails: data.cellnum || "",
        email: data.email || "",
        shipmentTypeId: data.shipment_type ? data.shipment_type.toString() : "",
        shipmentTypeName: data.shipmenttype || "",
        task: data.task || "",
        pickup: data.pickup || "",
        dropoff: data.dropoff || "",
        hazardous: data.hazardous || false,
        surcharges: data.surchages || false,
        pickupTime: data.pickuptime ? data.pickuptime.substring(0, 5) : "",
        pickupDate: data.pickupDate || "",
        stackDate: data.stackDate || "",
        deadline: data.deadline ? new Date(data.deadline).toISOString().split("T")[0] : "",
        fileRef: data.fileref || "",
        bookingRef: data.booking_ref || "",
        rateWeight: "Container",
        weight: "",
        num_six_meters: data.num_six_meters || 0,
        num_twelve_meters: data.num_twelve_meters || 0,
        num_abnormal: data.num_abnormal || 0,
        vat: data.vat || 15,
        description: data.description || "",
        vesselName: data.vessel_name || "",
        voyageNo: data.voyage_num || "",
        imoNo: data.imo_num || "",
        flagReg: data.flag_reg || "",
        total_cost: calculateTotalCostFromRates(
          data.rateper_6 || 0,
          data.rateper_12 || 0,
          data.rateper_abnormal || 0,
          data.num_six_meters || 0,
          data.num_twelve_meters || 0,
          data.num_abnormal || 0,
        ),
        // Store rate data for preservation
        rateper_6: data.rateper_6 || 0,
        rateper_12: data.rateper_12 || 0,
        rateper_abnormal: data.rateper_abnormal || 0,
      }

      setFormData(newFormData)

      // Set initial previous counts for existing instruction
      setPrevContainerCounts({
        num_six_meters: data.num_six_meters || 0,
        num_twelve_meters: data.num_twelve_meters || 0,
        num_abnormal: data.num_abnormal || 0,
      })

      // Set individual rate state variables from the backend response
      setSixMeterRate((data.rateper_6 || 0).toString())
      setTwelveMeterRate((data.rateper_12 || 0).toString())
      setAbnormalRate((data.rateper_abnormal || 0).toString())
      setWeight("")

      // Set isImport based on the fetched shipment type
      const shipmentTypeName = data.shipmenttype || ""
      setIsImport(shipmentTypeName.toLowerCase() === "import")
    } catch (error) {
      console.error("Error fetching instruction data:", error)
      let errorMessage = "Failed to fetch instruction data. Please try again."

      if (error.response) {
        errorMessage = `Server error: ${error.response.status} ${error.response.statusText}`
      } else if (error.request) {
        errorMessage = "Network error. Please check your connection."
      }

      setErrorModal({
        isOpen: true,
        message: errorMessage,
      })
    } finally {
      setIsLoading((prev) => ({ ...prev, instruction: false }))
    }
  }

  // Helper function to calculate total cost from individual rates
  const calculateTotalCostFromRates = (rate6, rate12, rateAbnormal, count6, count12, countAbnormal) => {
    return rate6 * count6 + rate12 * count12 + rateAbnormal * countAbnormal
  }

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

      // Calculate total cost using individual rates
      const sixRate = Number(sixMeterRate || 0)
      const twelveRate = Number(twelveMeterRate || 0)
      const abnormalRateNum = Number(abnormalRate || 0)

      const totalCost =
        (name === "num_six_meters" ? validValue : updatedFormData.num_six_meters) * sixRate +
        (name === "num_twelve_meters" ? validValue : updatedFormData.num_twelve_meters) * twelveRate +
        (name === "num_abnormal" ? validValue : updatedFormData.num_abnormal) * abnormalRateNum

      updatedFormData.total_cost = totalCost

      console.log(`Container count updated - ${name}: ${validValue}`)
      setFormData(updatedFormData)
      updatePreservedContainers(name, isIncreasing, difference)
      setFieldErrors((prev) => ({ ...prev, containers: "" }))
    } else if (name === "rateWeight") {
      const updatedFormData = {
        ...formData,
        [name]: value,
      }
      updatedFormData.total_cost = 0
      setFormData(updatedFormData)
      setFieldErrors((prev) => ({ ...prev, rateWeight: "", weight: "" }))
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

      // Recalculate total cost
      const sixRate = Number(value || 0)
      const twelveRate = Number(twelveMeterRate || 0)
      const abnormalRateNum = Number(abnormalRate || 0)

      const totalCost =
        formData.num_six_meters * sixRate +
        formData.num_twelve_meters * twelveRate +
        formData.num_abnormal * abnormalRateNum

      setFormData((prev) => ({
        ...prev,
        total_cost: totalCost,
        rateper_6: sixRate, // Store for preservation
      }))

      setFieldErrors((prev) => ({ ...prev, sixMeterRate: "" }))
    }
  }

  const handleTwelveMeterRateChange = (e) => {
    const value = e.target.value
    if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
      setTwelveMeterRate(value)

      // Recalculate total cost
      const sixRate = Number(sixMeterRate || 0)
      const twelveRate = Number(value || 0)
      const abnormalRateNum = Number(abnormalRate || 0)

      const totalCost =
        formData.num_six_meters * sixRate +
        formData.num_twelve_meters * twelveRate +
        formData.num_abnormal * abnormalRateNum

      setFormData((prev) => ({
        ...prev,
        total_cost: totalCost,
        rateper_12: twelveRate, // Store for preservation
      }))

      setFieldErrors((prev) => ({ ...prev, twelveMeterRate: "" }))
    }
  }

  const handleAbnormalRateChange = (e) => {
    const value = e.target.value
    if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
      setAbnormalRate(value)

      // Recalculate total cost
      const sixRate = Number(sixMeterRate || 0)
      const twelveRate = Number(twelveMeterRate || 0)
      const abnormalRateNum = Number(value || 0)

      const totalCost =
        formData.num_six_meters * sixRate +
        formData.num_twelve_meters * twelveRate +
        formData.num_abnormal * abnormalRateNum

      setFormData((prev) => ({
        ...prev,
        total_cost: totalCost,
        rateper_abnormal: abnormalRateNum, // Store for preservation
      }))

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
          cargoDescription: "",
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

    // Calculate total cost using individual rates
    const sixRate = Number(sixMeterRate || 0)
    const twelveRate = Number(twelveMeterRate || 0)
    const abnormalRateNum = Number(abnormalRate || 0)

    const totalCost =
      (type === "num_six_meters" ? validValue : updatedFormData.num_six_meters) * sixRate +
      (type === "num_twelve_meters" ? validValue : updatedFormData.num_twelve_meters) * twelveRate +
      (type === "num_abnormal" ? validValue : updatedFormData.num_abnormal) * abnormalRateNum

    updatedFormData.total_cost = totalCost

    console.log(`Container count changed - ${type}: ${validValue}`)
    setFormData(updatedFormData)
    updatePreservedContainers(type, isIncreasing, difference)
    setFieldErrors((prev) => ({ ...prev, containers: "" }))
  }

  const validateForm = () => {
    console.log("validateForm called")
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
      "description",
      "vesselName",
      "voyageNo",
      "imoNo",
      "flagReg",
    ]
    let isValid = true
    const errors = {}
    console.log("Validating required fields...")
    for (const field of requiredFields) {
      if (!formData[field]) {
        console.log(`Missing required field: ${field}`)
        errors[field] = `This field is required`
        isValid = false
      } else {
        console.log(`Field ${field} is valid:`, formData[field])
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

    // Rate validation - only require rates when container count > 0
    if (formData.num_six_meters > 0) {
      if (sixMeterRate === "" || sixMeterRate === "0" || Number(sixMeterRate) === 0) {
        errors.sixMeterRate = "Rate is required when containers are present"
        isValid = false
      } else if (Number(sixMeterRate) <= 0) {
        errors.sixMeterRate = "Rate must be a positive number"
        isValid = false
      }
    }

    if (formData.num_twelve_meters > 0) {
      if (twelveMeterRate === "" || twelveMeterRate === "0" || Number(twelveMeterRate) === 0) {
        errors.twelveMeterRate = "Rate is required when containers are present"
        isValid = false
      } else if (Number(twelveMeterRate) <= 0) {
        errors.twelveMeterRate = "Rate must be a positive number"
        isValid = false
      }
    }

    if (formData.num_abnormal > 0) {
      if (abnormalRate === "" || abnormalRate === "0" || Number(abnormalRate) === 0) {
        errors.abnormalRate = "Rate is required when containers are present"
        isValid = false
      } else if (Number(abnormalRate) <= 0) {
        errors.abnormalRate = "Rate must be a positive number"
        isValid = false
      }
    }

    if (formData.rateWeight !== "Container" && (formData.weight === "" || weight === "")) {
      errors.weight = "Please add weight"
      isValid = false
    } else if (formData.weight !== "" || weight !== "") {
      const weightValue = Number.parseFloat(formData.weight || weight)
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

  // Check if shipment type is Import
  const isImportShipment = () => {
    const selectedShipmentType = shipmentTypes.find((type) => type.shipkey.toString() === formData.shipmentTypeId)
    return selectedShipmentType && selectedShipmentType.shipmenttype.toLowerCase() === "import"
  }

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

  const handleSubmit = async (e) => {
    console.log("handleSubmit called")
    e.preventDefault()

    // First validate the form
    console.log("Validating form...")
    const isValid = validateForm()
    console.log("Form validation result:", isValid)

    if (!isValid) {
      console.log("Form validation failed")
      return
    }

    try {
      console.log("Form is valid, proceeding with submission...")
      // Calculate total cost using individual rates
      const sixRate = Number(sixMeterRate || 0)
      const twelveRate = Number(twelveMeterRate || 0)
      const abnormalRateNum = Number(abnormalRate || 0)

      const totalCost =
        formData.num_six_meters * sixRate +
        formData.num_twelve_meters * twelveRate +
        formData.num_abnormal * abnormalRateNum

      const totalContainers = formData.num_six_meters + formData.num_twelve_meters + formData.num_abnormal

      // IMPROVED: Create comprehensive form data with all current values
      const updatedFormData = {
        ...formData,
        // Rate fields for display
        sixMeterRate: sixRate.toString(),
        twelveMeterRate: twelveRate.toString(),
        abnormalRate: abnormalRateNum.toString(),
        // Rate fields for database
        rateper_6: sixRate,
        rateper_12: twelveRate,
        rateper_abnormal: abnormalRateNum,
        total_cost: totalCost,
        weight: formData.rateWeight !== "Container" ? formData.weight || weight : null,
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
    } catch (error) {
      console.error("Error processing form:", error)
      setErrorModal({
        isOpen: true,
        message: "Failed to process form. Please try again.",
      })
    }
  }

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

  const nonEditableStyle = {
    backgroundColor: "#f0f0f0",
    cursor: "not-allowed",
  }

  const ErrorTooltip = ({ message }) => {
    if (!message) return null
    return (
      <div className="controller-instructions-error-tooltip">
        {message}
        <div className="controller-instructions-tooltip-arrow"></div>
      </div>
    )
  }

  return (
    <div className="controller-instructions-unique-wrapper">
      {errorModal.isOpen && errorModal.message.includes("Failed to fetch") && (
        <ErrorModal
          isOpen={errorModal.isOpen}
          onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
          message={errorModal.message}
        />
      )}
      <div className="controller-instructions-header">
        <button className="controller-instructions-back-button" onClick={() => handleBackClick()}>
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
      <div className="controller-instructions-form-container" style={{ maxWidth: "1200px" }}>
        <div className="controller-instructions-form-section controller-instructions-client-info-section">
          <div className="controller-instructions-form-row">
            <div className="controller-instructions-form-field">
              <label>Client</label>
              <div className="controller-instructions-select-wrapper" ref={fieldRefs.clientId}>
                <select
                  style={nonEditableStyle}
                  className={`dropdown ${fieldErrors.clientId ? "controller-instructions-error-field" : ""}`}
                  name="clientId"
                  value={formData.clientId}
                  onChange={handleClientChange}
                  disabled={true}
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
            <div className="controller-instructions-form-field">
              <label>Representative</label>
              <input
                type="text"
                className="controller-instructions-form-input"
                placeholder="Autoload representative"
                name="representative"
                value={formData.representative}
                readOnly
                style={nonEditableStyle}
              />
            </div>
            <div className="controller-instructions-form-field">
              <label>Contact Details</label>
              <input
                type="text"
                className="controller-instructions-form-input"
                placeholder="Autoload contact details"
                name="contactDetails"
                value={formData.contactDetails}
                readOnly
                style={nonEditableStyle}
              />
            </div>
            <div className="controller-instructions-form-field">
              <label>Email</label>
              <input
                type="email"
                className="controller-instructions-form-input"
                placeholder="Autoload email"
                name="email"
                value={formData.email}
                readOnly
                style={nonEditableStyle}
              />
            </div>
          </div>
        </div>
        <div className="controller-instructions-form-section">
          <div className="controller-instructions-form-row" style={{ display: "none" }}>
            <div className="controller-instructions-form-field">
              <label>Shipment Type</label>
              <div className="controller-instructions-select-wrapper" ref={fieldRefs.shipmentTypeId}>
                <select
                  className={`dropdown ${fieldErrors.shipmentTypeId ? "controller-instructions-error-field" : ""}`}
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
            <div className="controller-instructions-form-field">
              <label>Name of Task</label>
              <div className="controller-instructions-input-wrapper" ref={fieldRefs.task}>
                <input
                  type="text"
                  className={`controller-instructions-form-input ${fieldErrors.task ? "controller-instructions-error-field" : ""}`}
                  placeholder="Input Name of Task"
                  name="task"
                  value={formData.task}
                  onChange={handleInputChange}
                />
                <ErrorTooltip message={fieldErrors.task} />
              </div>
            </div>
          </div>
        </div>
        <div className="controller-instructions-form-section">
          <div className="controller-instructions-form-row controller-instructions-trailer-container">
            <div className="controller-instructions-trailer-title" style={{ display: "none" }}>
              <h3>Trailer Size</h3>
            </div>
            <hr className="controller-instructions-divider" style={{ display: "none" }} />

            <div className="controller-instructions-container-section">
              <div className="controller-instructions-container-group">
                <div className="controller-instructions-container-label">
                  <span className="controller-instructions-trailer-size-label">Trailer Size</span>
                  <label>No. of Containers</label>
                  {fieldErrors.containers && (
                    <div className="controller-instructions-container-error-message">{fieldErrors.containers}</div>
                  )}
                </div>
                <div className="controller-instructions-container-inputs">
                  <div className="controller-instructions-container-input">
                    <label>6m</label>
                    <div className="controller-instructions-container-rate-group">
                      <input
                        type="number"
                        className={fieldErrors.containers ? "controller-instructions-error-field" : ""}
                        value={formData.num_six_meters}
                        min="0"
                        name="num_six_meters"
                        onChange={(e) => handleContainerCountChange("num_six_meters", e.target.value)}
                      />
                      <div
                        className="controller-instructions-input-wrapper controller-instructions-rate-input"
                        ref={fieldRefs.sixMeterRate}
                      >
                        <input
                          type="text"
                          className={`controller-instructions-form-input ${fieldErrors.sixMeterRate ? "controller-instructions-error-field" : ""}`}
                          placeholder="Rate"
                          value={sixMeterRate}
                          onChange={handleSixMeterRateChange}
                          disabled={formData.num_six_meters === 0}
                          style={formData.num_six_meters === 0 ? nonEditableStyle : {}}
                        />
                        <ErrorTooltip message={fieldErrors.sixMeterRate} />
                      </div>
                    </div>
                  </div>
                  <div className="controller-instructions-container-input">
                    <label>12m</label>
                    <div className="controller-instructions-container-rate-group">
                      <input
                        type="number"
                        className={fieldErrors.containers ? "controller-instructions-error-field" : ""}
                        value={formData.num_twelve_meters}
                        min="0"
                        name="num_twelve_meters"
                        onChange={(e) => handleContainerCountChange("num_twelve_meters", e.target.value)}
                      />
                      <div
                        className="controller-instructions-input-wrapper controller-instructions-rate-input"
                        ref={fieldRefs.twelveMeterRate}
                      >
                        <input
                          type="text"
                          className={`controller-instructions-form-input ${fieldErrors.twelveMeterRate ? "controller-instructions-error-field" : ""}`}
                          placeholder="Rate"
                          value={twelveMeterRate}
                          onChange={handleTwelveMeterRateChange}
                          disabled={formData.num_twelve_meters === 0}
                          style={formData.num_twelve_meters === 0 ? nonEditableStyle : {}}
                        />
                        <ErrorTooltip message={fieldErrors.twelveMeterRate} />
                      </div>
                    </div>
                  </div>
                  <div className="controller-instructions-container-input">
                    <label>Abnormal</label>
                    <div className="controller-instructions-container-rate-group">
                      <input
                        type="number"
                        className={fieldErrors.containers ? "controller-instructions-error-field" : ""}
                        value={formData.num_abnormal}
                        min="0"
                        name="num_abnormal"
                        onChange={(e) => handleContainerCountChange("num_abnormal", e.target.value)}
                      />
                      <div
                        className="controller-instructions-input-wrapper controller-instructions-rate-input"
                        ref={fieldRefs.abnormalRate}
                      >
                        <input
                          type="text"
                          className={`controller-instructions-form-input ${fieldErrors.abnormalRate ? "controller-instructions-error-field" : ""}`}
                          placeholder="Rate"
                          value={abnormalRate}
                          onChange={handleAbnormalRateChange}
                          disabled={formData.num_abnormal === 0}
                          style={formData.num_abnormal === 0 ? nonEditableStyle : {}}
                        />
                        <ErrorTooltip message={fieldErrors.abnormalRate} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hazardous and Surcharges Checkboxes - Horizontally Aligned */}
                <div
                  className="controller-instructions-form-row"
                  style={{ marginTop: "16px", marginBottom: "16px", marginLeft: "10px" }}
                >
                  <div
                    className="controller-instructions-form-field"
                    style={{ display: "flex", flexDirection: "row", gap: "30px", alignItems: "center" }}
                  >
                    <label className="controller-instructions-checkbox-container" style={{ margin: "5px 0" }}>
                      <input
                        type="checkbox"
                        name="hazardous"
                        checked={formData.hazardous || false}
                        onChange={handleInputChange}
                      />
                      <span className="controller-instructions-checkmark"></span>
                      Hazardous Materials
                    </label>
                    <label className="controller-instructions-checkbox-container" style={{ margin: "5px 0" }}>
                      <input
                        type="checkbox"
                        name="surcharges"
                        checked={formData.surcharges || false}
                        onChange={handleInputChange}
                      />
                      <span className="controller-instructions-checkmark"></span>
                      Add Surcharges
                    </label>
                  </div>
                </div>
              </div>
              {/* Rates per dropdown moved inside container inputs */}
              <div
                className="controller-instructions-container-input controller-instructions-rates-per-row"
                style={{ display: "none" }}
              >
                <label>Rates per</label>
                <div className="controller-instructions-container-rate-group">
                  <div className="controller-instructions-select-wrapper controller-instructions-small">
                    <select
                      className="controller-instructions-dropdown"
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
                    <div
                      className="controller-instructions-weight-input-group"
                      ref={fieldRefs.weight}
                      style={{ marginLeft: "8px" }}
                    >
                      <label>{formData.rateWeight}</label>
                      <div className="controller-instructions-input-wrapper">
                        <input
                          type="text"
                          className={`controller-instructions-form-input ${fieldErrors.weight ? "controller-instructions-error-field" : ""}`}
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

              <div
                className="controller-instructions-booking-vertical-group"
                style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px", maxWidth: "220px" }}
              >
                <div className="controller-instructions-form-field">
                  <label>Booking Reference</label>
                  <div className="controller-instructions-input-wrapper" ref={fieldRefs.bookingRef}>
                    <input
                      type="text"
                      className={`controller-instructions-form-input ${fieldErrors.bookingRef ? "controller-instructions-error-field" : ""}`}
                      placeholder="Enter booking ref"
                      name="bookingRef"
                      value={formData.bookingRef}
                      onChange={handleInputChange}
                    />
                    <ErrorTooltip message={fieldErrors.bookingRef} />
                  </div>
                </div>
                <div className="controller-instructions-form-field">
                  <label>File Ref</label>
                  <div className="controller-instructions-input-wrapper" ref={fieldRefs.fileRef}>
                    <input
                      type="text"
                      className={`controller-instructions-form-input ${fieldErrors.fileRef ? "controller-instructions-error-field" : ""}`}
                      placeholder="Enter file ref"
                      name="fileRef"
                      value={formData.fileRef}
                      onChange={handleInputChange}
                    />
                    <ErrorTooltip message={fieldErrors.fileRef} />
                  </div>
                </div>
                <div className="controller-instructions-form-field" style={{ maxWidth: "120px" }}>
                  <label>VAT Rate</label>
                  <div className="controller-instructions-input-wrapper">
                    <input
                      type="text"
                      className="controller-instructions-form-input"
                      value={`${formData.vat || 15}%`}
                    />
                  </div>
                </div>

                {/* Compact Rates per dropdown inserted below VAT */}
                <div className="controller-instructions-form-field" style={{ maxWidth: "160px" }}>
                  <label>Rates per</label>
                  <div className="controller-instructions-select-wrapper controller-instructions-small">
                    <select
                      className="controller-instructions-dropdown"
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
                    <div
                      className="controller-instructions-input-wrapper"
                      style={{ marginTop: "6px" }}
                      ref={fieldRefs.weight}
                    >
                      <input
                        type="text"
                        className={`controller-instructions-form-input ${fieldErrors.weight ? "controller-instructions-error-field" : ""}`}
                        placeholder={`Enter weight in ${formData.rateWeight}`}
                        name="weight"
                        value={formData.weight || weight}
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
                            setWeight(value)
                            setFormData((prev) => ({ ...prev, weight: value }))
                          }
                        }}
                      />
                      <ErrorTooltip message={fieldErrors.weight} />
                    </div>
                  )}
                </div>
              </div>

              {/* Rates per selection */}
              <div
                className="controller-instructions-form-field controller-instructions-rates-container"
                style={{ display: "none" }}
              >
                <label>Rates per</label>
                <div className="controller-instructions-rates-input-group">
                  <div className="controller-instructions-select-wrapper controller-instructions-small">
                    <select
                      className="controller-instructions-dropdown"
                      name="rateWeight"
                      value={formData.rateWeight}
                      onChange={handleInputChange}
                    >
                      <option value="kg">kg</option>
                      <option value="m³">m³</option>
                      <option value="Container">Container</option>
                    </select>
                  </div>
                </div>
                {(formData.rateWeight === "kg" || formData.rateWeight === "m³") && (
                  <div
                    className="controller-instructions-weight-input-group"
                    ref={fieldRefs.weight}
                    style={{ marginTop: "8px" }}
                  >
                    <label>{formData.rateWeight}</label>
                    <div className="controller-instructions-input-wrapper">
                      <input
                        type="text"
                        className={`controller-instructions-form-input ${fieldErrors.weight ? "controller-instructions-error-field" : ""}`}
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
              <div className="controller-instructions-date-time-group">
                <div className="controller-instructions-shipment-task-row" style={{ order: -1, marginBottom: "8px" }}>
                  <div className="controller-instructions-form-field controller-instructions-small-field">
                    <label>Shipment Type</label>
                    <div className="controller-instructions-select-wrapper" ref={fieldRefs.shipmentTypeId}>
                      <select
                        className={`controller-instructions-dropdown ${fieldErrors.shipmentTypeId ? "controller-instructions-error-field" : ""}`}
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
                  <div className="controller-instructions-form-field controller-instructions-small-field">
                    <label>Name of Task</label>
                    <div className="controller-instructions-input-wrapper" ref={fieldRefs.task}>
                      <input
                        type="text"
                        className={`controller-instructions-form-input ${fieldErrors.task ? "controller-instructions-error-field" : ""}`}
                        placeholder="Input Name of Task"
                        name="task"
                        value={formData.task}
                        onChange={handleInputChange}
                      />
                      <ErrorTooltip message={fieldErrors.task} />
                    </div>
                  </div>
                  {/* Booking / File / VAT inline with task */}
                  <div className="controller-instructions-booking-inline-row" style={{ display: "none" }}>
                    <div
                      className="controller-instructions-form-field controller-instructions-small-field"
                      style={{ flex: "0 1 160px" }}
                    >
                      <label>Booking Reference</label>
                      <div className="controller-instructions-input-wrapper" ref={fieldRefs.bookingRef}>
                        <input
                          type="text"
                          className={`controller-instructions-form-input ${fieldErrors.bookingRef ? "controller-instructions-error-field" : ""}`}
                          placeholder="Enter booking ref"
                          name="bookingRef"
                          value={formData.bookingRef}
                          onChange={handleInputChange}
                        />
                        <ErrorTooltip message={fieldErrors.bookingRef} />
                      </div>
                    </div>
                    <div
                      className="controller-instructions-form-field controller-instructions-small-field"
                      style={{ flex: "0 1 160px" }}
                    >
                      <label>File Ref</label>
                      <div className="controller-instructions-input-wrapper" ref={fieldRefs.fileRef}>
                        <input
                          type="text"
                          className={`controller-instructions-form-input ${fieldErrors.fileRef ? "controller-instructions-error-field" : ""}`}
                          placeholder="Enter file ref"
                          name="fileRef"
                          value={formData.fileRef}
                          onChange={handleInputChange}
                        />
                        <ErrorTooltip message={fieldErrors.fileRef} />
                      </div>
                    </div>
                    <div
                      className="controller-instructions-form-field controller-instructions-small-field"
                      style={{ flex: "0 1 120px" }}
                    >
                      <label>VAT Rate</label>
                      <div className="controller-instructions-input-wrapper">
                        <input
                          type="text"
                          className="controller-instructions-form-input"
                          value={`${formData.vat || 15}%`}
                          readOnly
                        />
                      </div>
                    </div>
                  </div>

                  {/* Vessel Details - will be moved below ETA/Deadline */}
                </div>
                <div className="controller-instructions-shipment-task-row" style={{ display: "none" }}>
                  <div className="controller-instructions-form-field controller-instructions-small-field">
                    <label>Shipment Type</label>
                    <div className="controller-instructions-select-wrapper" ref={fieldRefs.shipmentTypeId}>
                      <select
                        className={`controller-instructions-dropdown ${fieldErrors.shipmentTypeId ? "controller-instructions-error-field" : ""}`}
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
                  <div className="controller-instructions-form-field controller-instructions-small-field">
                    <label>Name of Task</label>
                    <div className="controller-instructions-input-wrapper" ref={fieldRefs.task}>
                      <input
                        type="text"
                        className={`controller-instructions-form-input ${fieldErrors.task ? "controller-instructions-error-field" : ""}`}
                        placeholder="Input Name of Task"
                        name="task"
                        value={formData.task}
                        onChange={handleInputChange}
                      />
                      <ErrorTooltip message={fieldErrors.task} />
                    </div>
                  </div>
                </div>
                <div className="controller-instructions-date-time-row-1" style={{ display: "flex", gap: "15px" }}>
                  <div className="controller-instructions-form-field" style={{ flex: "1", minWidth: "0" }}>
                    <label>Pick-Up Location</label>
                    <div
                      className="controller-instructions-date-input-group"
                      ref={fieldRefs.pickup}
                      style={{ width: "100%" }}
                    >
                      <select
                        className={`controller-instructions-form-input ${fieldErrors.pickup ? "controller-instructions-error-field" : ""}`}
                        name="pickup"
                        value={formData.pickup}
                        onChange={handleInputChange}
                        disabled={isLoading.startingPoints || startingPoints.length === 0}
                        style={{ width: "100%", maxWidth: "75%" }}
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
                  <div className="controller-instructions-form-field" style={{ flex: "1", minWidth: "0" }}>
                    <label>Drop-off Location</label>
                    <div
                      className="controller-instructions-date-input-group"
                      ref={fieldRefs.dropoff}
                      style={{ width: "100%" }}
                    >
                      <select
                        className={`controller-instructions-form-input ${fieldErrors.dropoff ? "controller-instructions-error-field" : ""}`}
                        name="dropoff"
                        value={formData.dropoff}
                        onChange={handleInputChange}
                        disabled={isLoading.destinations || destinations.length === 0}
                        style={{ width: "100%", maxWidth: "75%" }}
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
                </div>
                <div
                  className="controller-instructions-date-time-row-1"
                  style={{ marginTop: "15px", display: "flex", gap: "15px" }}
                >
                  <div className="controller-instructions-form-field" style={{ flex: "1", minWidth: "0" }}>
                    <label>Pick-up Time</label>
                    <div
                      className="controller-instructions-date-input-group"
                      ref={fieldRefs.pickupTime}
                      style={{ width: "100%" }}
                    >
                      <input
                        type="time"
                        className={`controller-instructions-form-input ${fieldErrors.pickupTime ? "controller-instructions-error-field" : ""}`}
                        placeholder="Time here"
                        name="pickupTime"
                        value={formData.pickupTime}
                        onChange={handleInputChange}
                        style={{ width: "75%" }}
                      />
                      <button className="controller-instructions-calendar-button"></button>
                      <ErrorTooltip message={fieldErrors.pickupTime} />
                    </div>
                  </div>
                  <div className="controller-instructions-form-field" style={{ flex: "1", minWidth: "0" }}>
                    <label>Pick-up Date</label>
                    <div
                      className="controller-instructions-date-input-group"
                      ref={fieldRefs.pickupDate}
                      style={{ width: "100%" }}
                    >
                      <input
                        type="date"
                        className={`controller-instructions-form-input ${fieldErrors.pickupDate ? "controller-instructions-error-field" : ""}`}
                        ref={pickupDateRef}
                        placeholder="Date here"
                        name="pickupDate"
                        value={formData.pickupDate}
                        onChange={handleInputChange}
                        style={{ width: "75%" }}
                      />
                      <button
                        className="controller-instructions-calendar-button"
                        onClick={() => openCalendar(pickupDateRef)}
                      ></button>
                      <ErrorTooltip message={fieldErrors.pickupDate} />
                    </div>
                  </div>
                </div>
                <div className="controller-instructions-date-time-row-2" style={{ display: "flex", gap: "15px" }}>
                  <div className="controller-instructions-form-field" style={{ flex: "1", minWidth: "0" }}>
                    <label>{isImport ? "ETA" : "Stack Date"}</label>
                    <div
                      className="controller-instructions-date-input-group"
                      ref={fieldRefs.stackDate}
                      style={{ width: "100%" }}
                    >
                      <input
                        type="date"
                        className={`controller-instructions-form-input ${fieldErrors.stackDate ? "controller-instructions-error-field" : ""}`}
                        ref={etaDateRef}
                        placeholder="Date here"
                        name="stackDate"
                        value={formData.stackDate}
                        onChange={handleInputChange}
                        min={formData.pickupDate || today}
                        disabled={!formData.pickupDate}
                        style={{ width: "75%" }}
                      />
                      <button
                        className="controller-instructions-calendar-button"
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
                  <div className="controller-instructions-form-field" style={{ flex: "1", minWidth: "0" }}>
                    <label>Deadline</label>
                    <div
                      className="controller-instructions-date-input-group"
                      ref={fieldRefs.deadline}
                      style={{ width: "100%" }}
                    >
                      <input
                        type="date"
                        className={`controller-instructions-form-input ${fieldErrors.deadline ? "controller-instructions-error-field" : ""}`}
                        ref={deadlineDateRef}
                        placeholder="Date here"
                        name="deadline"
                        value={formData.deadline}
                        onChange={handleInputChange}
                        min={formData.stackDate || formData.pickupDate || today}
                        disabled={!formData.stackDate}
                        style={{ width: "75%" }}
                      />
                      <button
                        className="controller-instructions-calendar-button"
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
        <div
          className="controller-instructions-form-section controller-instructions-vessel-info-section"
          style={{ marginTop: "16px" }}
        >
          <div
            className="controller-instructions-form-row controller-instructions-vessel-info-row"
            style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "flex-start", width: "100%" }}
          >
            <div className="controller-instructions-form-field">
              <label>Vessel Name</label>
              <div className="controller-instructions-input-wrapper" ref={fieldRefs.vesselName}>
                <input
                  type="text"
                  className={`controller-instructions-form-input ${fieldErrors.vesselName ? "controller-instructions-error-field" : ""}`}
                  placeholder="Enter vessel name"
                  name="vesselName"
                  value={formData.vesselName}
                  onChange={handleInputChange}
                />
                <ErrorTooltip message={fieldErrors.vesselName} />
              </div>
            </div>
            <div className="controller-instructions-form-field">
              <label>Voyage No.</label>
              <div className="controller-instructions-input-wrapper" ref={fieldRefs.voyageNo}>
                <input
                  type="text"
                  className={`controller-instructions-form-input ${fieldErrors.voyageNo ? "controller-instructions-error-field" : ""}`}
                  placeholder="Enter voyage number"
                  name="voyageNo"
                  value={formData.voyageNo}
                  onChange={handleInputChange}
                  maxLength={15}
                />
                <ErrorTooltip message={fieldErrors.voyageNo} />
              </div>
            </div>
            <div className="controller-instructions-form-field">
              <label>IMO No.</label>
              <div className="controller-instructions-input-wrapper" ref={fieldRefs.imoNo}>
                <input
                  type="text"
                  className={`controller-instructions-form-input ${fieldErrors.imoNo ? "controller-instructions-error-field" : ""}`}
                  placeholder="Enter IMO number (numbers only)"
                  name="imoNo"
                  value={formData.imoNo}
                  onChange={handleInputChange}
                  maxLength={15}
                />
                <ErrorTooltip message={fieldErrors.imoNo} />
              </div>
            </div>
            <div className="controller-instructions-form-field">
              <label>Flag Reg</label>
              <div className="controller-instructions-input-wrapper" ref={fieldRefs.flagReg}>
                <input
                  type="text"
                  className={`controller-instructions-form-input ${fieldErrors.flagReg ? "controller-instructions-error-field" : ""}`}
                  placeholder="Enter flag registration (letters only)"
                  name="flagReg"
                  value={formData.flagReg}
                  onChange={handleInputChange}
                />
                <ErrorTooltip message={fieldErrors.flagReg} />
              </div>
            </div>
            {/* Description from Client */}
            <div
              className="controller-instructions-form-field controller-instructions-description-field"
              style={{ flex: "1 1 180px", minWidth: "160px", maxWidth: "180px" }}
            >
              <label>Description from Client</label>
              <div className="controller-instructions-textarea-wrapper" ref={fieldRefs.description}>
                <textarea
                  className={`controller-instructions-form-textarea ${fieldErrors.description ? "controller-instructions-error-field" : ""}`}
                  placeholder="Description from Client"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  style={{ height: "60px", width: "100%", resize: "vertical" }}
                ></textarea>
                <ErrorTooltip message={fieldErrors.description} />
              </div>
            </div>
            <div
              className="controller-instructions-form-field controller-instructions-ref-group"
              style={{ display: "none" }}
            >
              <label>VAT Rate</label>
              <div className="controller-instructions-input-wrapper">
                <input
                  type="text"
                  className="controller-instructions-form-input"
                  value={`${formData.vat || 15}%`}
                  readOnly
                />
              </div>
            </div>
          </div>
        </div>
        <div
          className="controller-instructions-form-section controller-instructions-description-section"
          style={{ display: "none" }}
        >
          <div className="controller-instructions-form-row">
            <div
              className="controller-instructions-form-field controller-instructions-full-width"
              style={{ width: "100%" }}
            >
              <label>Description from Client</label>
              <div className="controller-instructions-textarea-wrapper" ref={fieldRefs.description}>
                <textarea
                  className={`controller-instructions-form-textarea ${fieldErrors.description ? "controller-instructions-error-field" : ""}`}
                  placeholder="Description from Client, like type of goods etc"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  style={{ width: "100%" }}
                ></textarea>
                <ErrorTooltip message={fieldErrors.description} />
              </div>
            </div>
          </div>
        </div>
        <div className="controller-instructions-button-container">
          <button
            className="controller-instructions-add-container-button"
            onClick={(e) => handleSubmit(e)}
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
      <div className="controller-instructions-booking-group" style={{ display: "none" }}>
        <div className="controller-instructions-form-field">
          <label>Booking Reference</label>
          <div className="controller-instructions-input-wrapper" ref={fieldRefs.bookingRef}>
            <input
              type="text"
              className={`controller-instructions-form-input ${fieldErrors.bookingRef ? "controller-instructions-error-field" : ""}`}
              placeholder="Enter booking ref"
              name="bookingRef"
              value={formData.bookingRef}
              onChange={handleInputChange}
            />
            <ErrorTooltip message={fieldErrors.bookingRef} />
          </div>
        </div>
        <div className="controller-instructions-form-field">
          <label>File Ref</label>
          <div className="controller-instructions-input-wrapper" ref={fieldRefs.fileRef}>
            <input
              type="text"
              className={`controller-instructions-form-input ${fieldErrors.fileRef ? "controller-instructions-error-field" : ""}`}
              placeholder="Enter file ref"
              name="fileRef"
              value={formData.fileRef}
              onChange={handleInputChange}
            />
            <ErrorTooltip message={fieldErrors.fileRef} />
          </div>
        </div>
        <div className="controller-instructions-form-field" style={{ maxWidth: "120px" }}>
          <label>VAT Rate</label>
          <div className="controller-instructions-input-wrapper">
            <input
              type="text"
              className="controller-instructions-form-input"
              value={`${formData.vat || 15}%`}
              readOnly
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default FCcontrollerinstructions
