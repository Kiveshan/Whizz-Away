

// "use client"

// import { useState, useEffect, useRef } from "react"
// import "../../css/controllerinstruction.css"
// import { useNavigate, useLocation } from "react-router-dom"
// import ErrorModal from "../../../../components/ErrorModal"
// import api from "../../../../api"

// // ErrorTooltip component for displaying validation errors
// const ErrorTooltip = ({ message }) => {
//   if (!message) return null

//   return (
//     <div className="error-tooltip">
//       <span className="error-icon">!</span>
//       <div className="error-message">{message}</div>
//     </div>
//   )
// }

// const FCcontrollerinstructions = () => {
//   const navigate = useNavigate()
//   const location = useLocation()

//   const preservedFormData = location.state?.preservedFormData
//   const containerCounts = location.state?.containerCounts
//   const instructionId = location.state?.instructionId

//   console.log("FCcontrollerinstructions received state:", location.state)
//   console.log("FCcontrollerinstructions - preservedFormData:", preservedFormData)
//   console.log("FCcontrollerinstructions - containerCounts:", containerCounts)
//   console.log("FCcontrollerinstructions - instructionId:", instructionId)

//   // Extract all state from location
//   const clientId = location.state?.clientId
//   const clientName = location.state?.clientName
//   const selectedMonth = location.state?.selectedMonth
//   const selectedYear = location.state?.selectedYear
//   const activeFilter = location.state?.activeFilter

//   const pickupDateRef = useRef(null)
//   const etaDateRef = useRef(null)
//   const deadlineDateRef = useRef(null)

//   const fieldRefs = {
//     clientId: useRef(null),
//     shipmentTypeId: useRef(null),
//     task: useRef(null),
//     pickup: useRef(null),
//     dropoff: useRef(null),
//     pickupTime: useRef(null),
//     pickupDate: useRef(null),
//     stackDate: useRef(null),
//     deadline: useRef(null),
//     bookingRef: useRef(null),
//     fileRef: useRef(null),
//     sixMeterRate: useRef(null),
//     twelveMeterRate: useRef(null),
//     abnormalRate: useRef(null),
//     weight: useRef(null),
//     description: useRef(null),
//     vesselName: useRef(null),
//     rateWeight: useRef(null),
//     unitRate: useRef(null),
//   }

//   const [isImport, setIsImport] = useState(location.state?.isImport || false)
//   const today = new Date().toISOString().split("T")[0]
//   const [weight, setWeight] = useState("")
//   const [rateUpdateMessage, setRateUpdateMessage] = useState("")

//   // Log the isImport state for debugging
//   useEffect(() => {
//     console.log("isImport state changed:", isImport)
//   }, [isImport])

//   // NEW: Track previous container counts to detect changes from 0 to >0
//   const [prevContainerCounts, setPrevContainerCounts] = useState({
//     num_six_meters: 0,
//     num_twelve_meters: 0,
//     num_abnormal: 0,
//   })

//   const [formData, setFormData] = useState(() => {
//     // Default empty form data
//     const defaultData = {
//       // Rates
//       rateper_6: preservedFormData?.rateper_6 || 0,
//       rateper_12: preservedFormData?.rateper_12 || 0,
//       rateper_abnormal: preservedFormData?.rateper_abnormal || 0,
//       surcharge: preservedFormData?.surcharge || 0,
//       clientId: "",
//       representative: "",
//       contactDetails: "",
//       email: "",
//       shipmentTypeId: "",
//       shipmentTypeName: "",
//       task: "",
//       pickup: "",
//       dropoff: "",
//       hazardous: false,
//       surchages: false,
//       pickupTime: "",
//       pickupDate: "",
//       stackDate: "",
//       deadline: "",
//       fileRef: "",
//       bookingRef: "",
//       rateWeight: "Container",
//       weight: "",
//       unitRate: "",
//       quantity: "",
//       num_six_meters: 0,
//       num_twelve_meters: 0,
//       num_abnormal: 0,
//       vat: 15,
//       description: "",
//       total_cost: 0,
//       status: "",
//     }

//     if (preservedFormData) {
//       // If we have container counts from navigation, use them
//       if (containerCounts) {
//         console.log("Initializing form data with container counts:", containerCounts)
//         const initialData = {
//           ...defaultData,
//           ...preservedFormData,
//           num_six_meters: containerCounts["6m"] || 0,
//           num_twelve_meters: containerCounts["12m"] || 0,
//           num_abnormal: containerCounts["Abnormal"] || 0,
//           rateWeight: "Container",
//           weight: "",
//         }
//         // Set initial previous counts
//         setPrevContainerCounts({
//           num_six_meters: containerCounts["6m"] || 0,
//           num_twelve_meters: containerCounts["12m"] || 0,
//           num_abnormal: containerCounts["Abnormal"] || 0,
//         })
//         return initialData
//       }
//       // If we just have preserved form data without container counts
//       const initialData = {
//         ...preservedFormData,
//         rateWeight: "Container",
//       }
//       // Set initial previous counts
//       setPrevContainerCounts({
//         num_six_meters: preservedFormData.num_six_meters || 0,
//         num_twelve_meters: preservedFormData.num_twelve_meters || 0,
//         num_abnormal: preservedFormData.num_abnormal || 0,
//       })
//       return initialData
//     }
//     return {
//       clientId: "",
//       representative: "",
//       contactDetails: "",
//       email: "",
//       shipmentTypeId: "",
//       shipmentTypeName: "",
//       task: "",
//       pickup: "",
//       dropoff: "",
//       hazardous: false,
//       surchages: false,
//       pickupTime: "",
//       pickupDate: "",
//       stackDate: "",
//       deadline: "",
//       fileRef: "",
//       bookingRef: "",
//       rateWeight: "Container",
//       weight: "",
//       num_six_meters: 0,
//       num_twelve_meters: 0,
//       num_abnormal: 0,
//       vat: 15,
//       description: "",
//       total_cost: 0,
//       status: "",
//     }
//   })

//   // Check if the instruction should be read-only based on status
//   const isReadOnly = formData.status === "In progress" || formData.status === "Completed"

//   const [startingPoints, setStartingPoints] = useState([])
//   const [destinations, setDestinations] = useState([])
//   const [clients, setClients] = useState([])
//   const [shipmentTypes, setShipmentTypes] = useState([])
//   const [isLoading, setIsLoading] = useState({
//     clients: true,
//     shipmentTypes: true,
//     startingPoints: true,
//     destinations: true,
//     instruction: instructionId ? true : false,
//   })
//   const [errorModal, setErrorModal] = useState({
//     isOpen: false,
//     message: "",
//   })
//   const [fieldErrors, setFieldErrors] = useState({})
//   const [preservedContainers, setPreservedContainers] = useState(location.state?.preservedContainers || [])

//   // Container state
//   const [containers, setContainers] = useState([])
//   const [containerFieldErrors, setContainerFieldErrors] = useState({})
//   const [containerSuccessMessage, setContainerSuccessMessage] = useState("")
//   const [isContainerLoading, setIsContainerLoading] = useState(false)
//   const [isContainerDataModified, setIsContainerDataModified] = useState(false)

//   const [confirmationModal, setConfirmationModal] = useState({
//     isOpen: false,
//     message: "",
//   })

//   // Initialize containers based on container counts
//   const initializeContainers = () => {
//     console.log("Initializing containers with form data:", formData)
//     const counts = {
//       "6m": formData.num_six_meters || 0,
//       "12m": formData.num_twelve_meters || 0,
//       Abnormal: formData.num_abnormal || 0,
//       BreakBulk: formData.num_breakbulk || 0,
//     }

//     // If we already have containers and counts are zero, don't clear them
//     if (
//       containers &&
//       containers.length > 0 &&
//       counts["6m"] === 0 &&
//       counts["12m"] === 0 &&
//       counts["Abnormal"] === 0 &&
//       counts["BreakBulk"] === 0
//     ) {
//       console.log("Keeping existing containers as counts are zero")
//       return
//     }

//     const containersList = []
//     let containerId = 1

//     // Add 6m containers
//     for (let i = 0; i < counts["6m"]; i++) {
//       containersList.push({
//         id: containerId++,
//         containerKey: null,
//         containerNum: "",
//         weight: isImport ? "" : null,
//         containerType: "6m",
//         cargoDescription: "",
//       })
//     }

//     // Add 12m containers
//     for (let i = 0; i < counts["12m"]; i++) {
//       containersList.push({
//         id: containerId++,
//         containerKey: null,
//         containerNum: "",
//         weight: isImport ? "" : null,
//         containerType: "12m",
//         cargoDescription: "",
//       })
//     }

//     // Add abnormal containers
//     for (let i = 0; i < counts["Abnormal"]; i++) {
//       containersList.push({
//         id: containerId++,
//         containerKey: null,
//         containerNum: "",
//         weight: isImport ? "" : null,
//         containerType: "Abnormal",
//         cargoDescription: "",
//       })
//     }

//     // Add break bulk containers
//     for (let i = 0; i < counts["BreakBulk"]; i++) {
//       containersList.push({
//         id: containerId++,
//         containerKey: null,
//         containerNum: "",
//         weight: isImport ? "" : null,
//         containerType: "BreakBulk",
//         cargoDescription: "",
//       })
//     }

//     setContainers(containersList)
//     setIsContainerLoading(false)
//   }

//   // Handle container input change with real-time validation
//   const handleContainerChange = (id, field, value) => {
//     if (field === "containerNum") {
//       // Get the current container
//       const container = containers.find((c) => c.id === id)
//       const currentValue = container ? container.containerNum : ""

//       // For container numbers, enforce the format: 4 letters followed by 7 numbers
//       if (value.length > 11) {
//         // Prevent entering more than 11 characters
//         return
//       }

//       // Create a new value by validating each character
//       let newValue = ""
//       for (let i = 0; i < value.length; i++) {
//         const char = value[i]
//         if (i < 4) {
//           // First 4 positions: only allow letters
//           if (/^[a-zA-Z]$/.test(char)) {
//             newValue += char
//           }
//         } else {
//           // Positions 5-11: only allow numbers
//           if (/^[0-9]$/.test(char)) {
//             newValue += char
//           }
//         }
//       }

//       // Only update if the filtered value is different from the input
//       if (newValue !== value) {
//         return
//       }

//       // Clear error when user starts typing
//       clearContainerFieldError(id, "container")
//     }

//     if (field === "weight") {
//       // Clear error when user starts typing
//       clearContainerFieldError(id, "weight")
//     }

//     // Update the container value
//     setContainers((prevContainers) =>
//       prevContainers.map((container) => (container.id === id ? { ...container, [field]: value } : container)),
//     )
//     setIsContainerDataModified(true)
//   }

//   // Validate containers
//   const validateContainers = () => {
//     const counts = countContainersByType()
//     const newErrors = {}
//     let isValid = true

//     // Validate container numbers and weights
//     for (const container of containers) {
//       if (!container.containerNum) {
//         newErrors[`container-${container.id}`] = "Field is required"
//         isValid = false
//       }
//       // Check container number format (11 chars: 4 letters followed by 7 numbers)
//       else if (container.containerNum.length !== 11) {
//         newErrors[`container-${container.id}`] = "Does not match correct format (ABCD1234567)"
//         isValid = false
//       } else if (!/^[a-zA-Z]{4}[0-9]{7}$/.test(container.containerNum)) {
//         newErrors[`container-${container.id}`] = "Does not match correct format (ABCD1234567)"
//         isValid = false
//       }

//       if (isImport && (container.weight === "" || container.weight === null)) {
//         newErrors[`weight-${container.id}`] = "Field is required"
//         isValid = false
//       } else if (isImport && container.weight && !/^[0-9]*\.?[0-9]*$/.test(container.weight)) {
//         newErrors[`weight-${container.id}`] = "Numbers only"
//         isValid = false
//       }
//     }

//     setContainerFieldErrors(newErrors)
//     return isValid
//   }

//   // Validate required form fields
//   const validateRequiredFields = () => {
//     const newErrors = {}
//     let isValid = true

//     // Required fields for all instruction types
//     const requiredFields = [
//       { name: "clientId", label: "Client" },
//       { name: "shipmentTypeId", label: "Shipment Type" },
//       { name: "pickup", label: "Pickup Location" },
//       { name: "dropoff", label: "Dropoff Location" },
//       { name: "pickupDate", label: "Pickup Date" },
//     ]

//     // Check each required field
//     requiredFields.forEach((field) => {
//       if (!formData[field.name]) {
//         newErrors[field.name] = `${field.label} is required`
//         isValid = false
//       }
//     })

//     // Set the errors
//     setFieldErrors((prev) => ({ ...prev, ...newErrors }))

//     // If there are errors, scroll to the first error field
//     if (!isValid) {
//       const firstErrorField = requiredFields.find((field) => !formData[field.name])
//       if (firstErrorField) {
//         scrollToField(firstErrorField.name)
//       }
//     }

//     return isValid
//   }

//   // Count containers by type
//   const countContainersByType = () => {
//     const counts = {
//       "6m": 0,
//       "12m": 0,
//       Abnormal: 0,
//       BreakBulk: 0,
//     }

//     containers.forEach((container) => {
//       counts[container.containerType]++
//     })

//     return counts
//   }

//   // Fetch original data for comparison
//   const fetchOriginalData = async () => {
//     try {
//       const response = await api.get(`/api/instructions/fc/instruction/${instructionId}`)
//       return response.data
//     } catch (error) {
//       console.error("Error fetching original data:", error)
//       return null
//     }
//   }

//   // Validate container uniqueness
//   const validateContainerUniqueness = () => {
//     const containerNumbers = containers.map((c) => c.containerNum).filter((num) => num.trim() !== "")
//     const uniqueNumbers = new Set(containerNumbers)

//     if (containerNumbers.length !== uniqueNumbers.size) {
//       setErrorModal({
//         isOpen: true,
//         message: "Container numbers must be unique within the same instruction.",
//       })
//       return false
//     }
//     return true
//   }

//   // Enhanced validation with field highlighting
//   const validateAllFields = () => {
//     const newErrors = {}
//     let isValid = true
//     const isCrossHaul = isCrossHaulShipment()

//     // Required fields validation
//     const requiredFields = [
//       { name: "clientId", label: "Client" },
//       { name: "shipmentTypeId", label: "Shipment Type" },
//       { name: "pickup", label: "Pickup Location" },
//       { name: "dropoff", label: "Dropoff Location" },
//       { name: "pickupDate", label: "Pickup Date" },
//       { name: "task", label: "Task" },
//       { name: "fileRef", label: "File Reference" },
//       { name: "bookingRef", label: "Booking Reference" },
//       { name: "description", label: "Description" },
//     ]

//     // Add vessel name only if not cross-haul
//     if (!isCrossHaul) {
//       requiredFields.push({ name: "vesselName", label: "Vessel Name" })
//     }

//     requiredFields.forEach((field) => {
//       if (!formData[field.name]) {
//         newErrors[field.name] = `${field.label} is required`
//         isValid = false
//       }
//     })

//     // Container validation
//     const containerErrors = {}
//     containers.forEach((container) => {
//       if (!container.containerNum) {
//         containerErrors[`container-${container.id}`] = "Container number is required"
//         isValid = false
//       } else if (container.containerNum.length !== 11 || !/^[a-zA-Z]{4}[0-9]{7}$/.test(container.containerNum)) {
//         containerErrors[`container-${container.id}`] = "Does not match correct format (ABCD1234567)"
//         isValid = false
//       }

//       if (isImport && (container.weight === "" || container.weight === null)) {
//         containerErrors[`weight-${container.id}`] = "Weight is required for import shipments"
//         isValid = false
//       } else if (isImport && container.weight && !/^[0-9]*\.?[0-9]*$/.test(container.weight)) {
//         containerErrors[`weight-${container.id}`] = "Weight must be a valid number"
//         isValid = false
//       }
//     })

//     // Check container uniqueness
//     if (!validateContainerUniqueness()) {
//       isValid = false
//     }

//     setFieldErrors(newErrors)
//     setContainerFieldErrors(containerErrors)

//     return isValid
//   }

//   // Clear field errors when user starts typing
//   const clearFieldError = (fieldName) => {
//     setFieldErrors((prev) => ({ ...prev, [fieldName]: "" }))
//   }

//   const clearContainerFieldError = (containerId, fieldType) => {
//     setContainerFieldErrors((prev) => ({ ...prev, [`${fieldType}-${containerId}`]: "" }))
//   }

//   // Check for rate/counter mismatch and show confirmation if needed
//   const checkRateCounterMismatch = () => {
//     const mismatches = []
//     const containerTypesWithCounts = []

//     // Check each container type for rate > 0 but count = 0
//     if ((formData.rateper_6 > 0 || Number(formData.rateper_6) > 0) && formData.num_six_meters === 0) {
//       mismatches.push("6m")
//     }
//     if ((formData.rateper_12 > 0 || Number(formData.rateper_12) > 0) && formData.num_twelve_meters === 0) {
//       mismatches.push("12m")
//     }
//     if ((formData.rateper_abnormal > 0 || Number(formData.rateper_abnormal) > 0) && formData.num_abnormal === 0) {
//       mismatches.push("Abnormal")
//     }
//     if (
//       (formData.rateper_breakbulk > 0 || Number(formData.rateper_breakbulk) > 0) &&
//       (formData.num_breakbulk === 0 || !formData.num_breakbulk)
//     ) {
//       mismatches.push("Break Bulk")
//     }

//     // If there are mismatches, collect container types with counts > 0
//     if (mismatches.length > 0) {
//       if (formData.num_six_meters > 0) {
//         containerTypesWithCounts.push(`6m (${formData.num_six_meters} containers, Rate: R${formData.rateper_6})`)
//       }
//       if (formData.num_twelve_meters > 0) {
//         containerTypesWithCounts.push(`12m (${formData.num_twelve_meters} containers, Rate: R${formData.rateper_12})`)
//       }
//       if (formData.num_abnormal > 0) {
//         containerTypesWithCounts.push(
//           `Abnormal (${formData.num_abnormal} containers, Rate: R${formData.rateper_abnormal})`,
//         )
//       }
//       if (formData.num_breakbulk > 0) {
//         containerTypesWithCounts.push(
//           `Break Bulk (${formData.num_breakbulk} containers, Rate: R${formData.rateper_breakbulk})`,
//         )
//       }

//       // Show confirmation modal
//       const message =
//         containerTypesWithCounts.length > 0
//           ? `You have containers with the following rates: ${containerTypesWithCounts.join(", ")}. Are you sure you want to continue?`
//           : "You have set rates for container types with 0 containers. Are you sure you want to continue?"

//       setConfirmationModal({
//         isOpen: true,
//         message: message,
//       })
//       return false // Don't proceed with save
//     }

//     return true // No mismatches, proceed with save
//   }

//   // Handle save changes with enhanced logic
//   const handleSaveChanges = async () => {
//     console.log("=== SAVE CHANGES INITIATED ===")

//     // Validate all fields first
//     if (!validateAllFields()) {
//       console.log("❌ Validation failed - blocking save operation")
//       setErrorModal({
//         isOpen: true,
//         message: "Please fix all validation errors before saving.",
//       })
//       return
//     }

//     // Check for rate/counter mismatch
//     if (!checkRateCounterMismatch()) {
//       console.log("⚠️ Rate/counter mismatch detected - showing confirmation")
//       return
//     }

//     // Proceed with actual save logic
//     await performSave()
//   }

//   // Extract the actual save logic into a separate function
//   const performSave = async () => {
//     try {
//       setIsContainerLoading(true)
//       setContainerSuccessMessage("")

//       // Fetch original data for comparison
//       console.log("📊 Fetching original data for comparison...")
//       const originalData = await fetchOriginalData()

//       // Recalculate total cost based on current values
//       const numSix = formData.num_six_meters || 0
//       const numTwelve = formData.num_twelve_meters || 0
//       const numAbnormal = formData.num_abnormal || 0
//       const numBreakBulk = formData.num_breakbulk || 0

//       const ratePer6 = numSix > 0 ? Number(formData.rateper_6 || 0) : 0
//       const ratePer12 = numTwelve > 0 ? Number(formData.rateper_12 || 0) : 0
//       const ratePerAbnormal = numAbnormal > 0 ? Number(formData.rateper_abnormal || 0) : 0
//       const ratePerBreakBulk = numBreakBulk > 0 ? Number(formData.rateper_breakbulk || 0) : 0

//       const baseCost =
//         ratePer6 * numSix + ratePer12 * numTwelve + ratePerAbnormal * numAbnormal + ratePerBreakBulk * numBreakBulk
//       const surchargeAmount = formData.surchages ? Number(formData.surcharge || 0) : 0
//       const totalCost = Number((baseCost + surchargeAmount).toFixed(2))

//       // Prepare instruction update data
//       const instructionUpdateData = {
//         ...formData,
//         client: formData.clientId,
//         shipment_type: formData.shipmentTypeId,
//         total_cost: totalCost,
//         status: formData.status, // Preserve existing status, don't default to "In progress"
//         rateweight: formData.rateWeight,
//       }

//       // Prepare container data with containerKey for smart updates
//       const containerData = containers.map((container) => {
//         let weight = null
//         if (container.weight !== undefined && container.weight !== null && container.weight !== "") {
//           const parsedWeight = Number.parseFloat(container.weight)
//           if (!isNaN(parsedWeight)) {
//             weight = parsedWeight
//           }
//         }

//         return {
//           containerKey: container.containerKey, // Important for smart updates
//           containernum: container.containerNum,
//           weight: weight,
//           container_type: container.containerType,
//           cargo_description: container.cargoDescription,
//         }
//       })

//       // Console log comparison between old and new data
//       console.log("📋 DATA COMPARISON:")
//       console.log("===================")

//       if (originalData) {
//         console.log("🔄 INSTRUCTION CHANGES:")
//         console.log("Old total_cost:", originalData.total_cost, "→ New total_cost:", totalCost)
//         console.log("Old num_six_meters:", originalData.num_six_meters, "→ New num_six_meters:", numSix)
//         console.log("Old num_twelve_meters:", originalData.num_twelve_meters, "→ New num_twelve_meters:", numTwelve)
//         console.log("Old num_abnormal:", originalData.num_abnormal, "→ New num_abnormal:", numAbnormal)
//         console.log("Old rateper_6:", originalData.rateper_6, "→ New rateper_6:", ratePer6)
//         console.log("Old rateper_12:", originalData.rateper_12, "→ New rateper_12:", ratePer12)
//         console.log("Old rateper_abnormal:", originalData.rateper_abnormal, "→ New rateper_abnormal:", ratePerAbnormal)
//         console.log("Old task:", originalData.task, "→ New task:", formData.task)
//         console.log("Old description:", originalData.description, "→ New description:", formData.description)

//         console.log("🔄 CONTAINER CHANGES:")
//         const originalContainers = originalData.containers || []
//         console.log(
//           "Original containers count:",
//           originalContainers.length,
//           "→ New containers count:",
//           containers.length,
//         )

//         containers.forEach((newContainer, index) => {
//           const originalContainer = originalContainers.find((oc) => oc.containerkey === newContainer.containerKey)
//           if (originalContainer) {
//             console.log(`Container ${index + 1} (UPDATE):`, {
//               containerKey: newContainer.containerKey,
//               oldNum: originalContainer.containernum,
//               newNum: newContainer.containerNum,
//               oldWeight: originalContainer.weight,
//               newWeight: newContainer.weight,
//               oldType: originalContainer.container_type,
//               newType: newContainer.containerType,
//               oldCargo: originalContainer.cargo_description,
//               newCargo: newContainer.cargoDescription,
//             })
//           } else {
//             console.log(`Container ${index + 1} (NEW):`, {
//               containerNum: newContainer.containerNum,
//               weight: newContainer.weight,
//               type: newContainer.containerType,
//               cargo: newContainer.cargoDescription,
//             })
//           }
//         })

//         // Log containers to be deleted
//         originalContainers.forEach((originalContainer) => {
//           const stillExists = containers.find((nc) => nc.containerKey === originalContainer.containerkey)
//           if (!stillExists) {
//             console.log("Container (DELETE):", {
//               containerKey: originalContainer.containerkey,
//               containerNum: originalContainer.containernum,
//             })
//           }
//         })
//       }

//       console.log("💾 Sending update request to server...")
//       console.log("Instruction data:", instructionUpdateData)
//       console.log("Container data:", containerData)

//       // Make the API call
//       const response = await api.put(`/api/instructions/fc/update/${instructionId}`, {
//         instructionData: instructionUpdateData,
//         containers: containerData,
//       })

//       console.log("✅ Server response:", response.data)

//       // Check for successful response (status 200)
//       if (response.status === 200) {
//         console.log("🎉 Save operation completed successfully!")

//         // Show success message
//         setContainerSuccessMessage("Changes saved successfully!")
//         setIsContainerDataModified(false)

//         // Navigate after 2 seconds
//         setTimeout(() => {
//           console.log("🚀 Navigating to instructions list...")
//           navigate("/ViewClientInstruction")
//         }, 2000)
//       } else {
//         console.warn("⚠️ Unexpected server response:", response)
//         setErrorModal({
//           isOpen: true,
//           message: "Save completed but server response was unexpected. Please verify your changes.",
//         })
//       }
//     } catch (error) {
//       console.error("❌ Error saving changes:", error)
//       console.error("Error details:", error.response?.data || error.message)

//       setErrorModal({
//         isOpen: true,
//         message: error.response?.data?.message || "Failed to save changes. Please try again.",
//       })
//     } finally {
//       setIsContainerLoading(false)
//     }
//   }

//   // Handle confirmation modal actions
//   const handleConfirmSave = async () => {
//     setConfirmationModal({ isOpen: false, message: "" })
//     await performSave()
//   }

//   const handleCancelSave = () => {
//     setConfirmationModal({ isOpen: false, message: "" })
//   }

//   // Initialize containers when component mounts or container counts change
//   useEffect(() => {
//     console.log("Container loading effect triggered")
//     console.log("Current instructionId:", instructionId)

//     const loadContainers = async () => {
//       // If we already have containers from the instruction data, don't load them again
//       if (containers && containers.length > 0) {
//         console.log("Containers already loaded from instruction data")
//         return
//       }

//       if (!instructionId) {
//         console.log("No instructionId, initializing empty containers")
//         initializeContainers()
//         return
//       }

//       // Only fetch containers if we don't have any yet
//       console.log("No containers loaded yet, fetching from API for instruction:", instructionId)
//       setIsContainerLoading(true)

//       try {
//         const response = await api.get(`/api/instructions/fc/instruction/${instructionId}`)
//         console.log("Containers API response:", response.data)

//         if (response.data && response.data.length > 0) {
//           const containersList = response.data.map((container, index) => ({
//             id: container.containerkey || index + 1,
//             containerKey: container.containerkey,
//             containerNum: container.containernum || "",
//             weight: container.weight !== null && container.weight !== undefined ? container.weight.toString() : "",
//             containerType: container.container_type || "6m",
//             cargoDescription: container.cargo_description || "",
//           }))

//           console.log("Setting containers from API:", containersList)
//           setContainers(containersList)
//           setIsContainerDataModified(false)
//         } else if (formData.num_six_meters > 0 || formData.num_twelve_meters > 0 || formData.num_abnormal > 0) {
//           console.log("No containers found in API, initializing based on form counts")
//           initializeContainers()
//         }
//       } catch (error) {
//         console.error("Error loading containers:", error)
//         if (error.response) {
//           console.error("Error response data:", error.response.data)
//           console.error("Error status:", error.response.status)
//         }
//         // Even if there's an error, try to initialize containers based on form data
//         if (formData.num_six_meters > 0 || formData.num_twelve_meters > 0 || formData.num_abnormal > 0) {
//           console.log("Error occurred, initializing containers based on form counts")
//           initializeContainers()
//         }
//       } finally {
//         setIsContainerLoading(false)
//       }
//     }

//     loadContainers()
//   }, [instructionId, formData.num_six_meters, formData.num_twelve_meters, formData.num_abnormal, containers])

//   const scrollToField = (fieldName) => {
//     const fieldRef = fieldRefs[fieldName]
//     if (fieldRef && fieldRef.current) {
//       fieldRef.current.scrollIntoView({
//         behavior: "smooth",
//         block: "center",
//       })
//       setTimeout(() => {
//         if (fieldRef.current.focus) {
//           fieldRef.current.focus()
//         }
//       }, 500)
//     }
//   }

//   const openCalendar = (ref) => {
//     ref.current.click()
//   }

//   // First useEffect: Fetch clients and shipment types on initial load
//   useEffect(() => {
//     console.log("Initial data fetch started")

//     const fetchInitialData = async () => {
//       try {
//         await Promise.all([fetchClients(), fetchShipmentTypes()])

//         // If we have an instructionId and no preserved data, fetch the instruction
//         if (instructionId && !preservedFormData) {
//           console.log("Calling fetchInstructionData with ID:", instructionId)
//           await fetchInstructionData(instructionId)
//         } else if (preservedFormData) {
//           // If we have preserved data, update the import state
//           if (preservedFormData.shipmentTypeName) {
//             setIsImport(preservedFormData.shipmentTypeName.toLowerCase() === "import")
//           }
//           // Update form data with preserved data
//           setFormData((prev) => ({ ...prev, ...preservedFormData }))
//         }
//       } catch (error) {
//         console.error("Error in initial data fetch:", error)
//         setErrorModal({
//           open: true,
//           message: "Failed to load initial form data. Please try again.",
//         })
//       } finally {
//         setIsLoading((prev) => ({ ...prev, instruction: false }))
//       }
//     }

//     // Call the fetchInitialData function
//     fetchInitialData()
//   }, [instructionId, preservedFormData])

//   // Update form data when preserved data changes
//   useEffect(() => {
//     if (preservedFormData) {
//       console.log("Updating form with preserved data:", preservedFormData)

//       // Format dates before setting form data
//       const formattedData = {
//         ...preservedFormData,
//         pickupDate: formatDateForInput(preservedFormData.pickupDate),
//         stackDate: formatDateForInput(preservedFormData.stackDate),
//         deadline: preservedFormData.deadline ? formatDateForInput(preservedFormData.deadline) : "",
//       }

//       // Update form data
//       if (containerCounts) {
//         console.log("Updating form data with container counts:", containerCounts)
//         const newFormData = {
//           ...formattedData,
//           num_six_meters: containerCounts["6m"] || 0,
//           num_twelve_meters: containerCounts["12m"] || 0,
//           num_abnormal: containerCounts["Abnormal"] || 0,
//           rateWeight: "Container",
//           weight: "",
//         }
//         setFormData(newFormData)
//         // Update previous counts
//         setPrevContainerCounts({
//           num_six_meters: containerCounts["6m"] || 0,
//           num_twelve_meters: containerCounts["12m"] || 0,
//           num_abnormal: containerCounts["Abnormal"] || 0,
//         })
//       }

//       // Update shipment type
//       if (preservedFormData.shipmentTypeName) {
//         setIsImport(preservedFormData.shipmentTypeName.toLowerCase() === "import")
//       }

//       // Update rate values from preserved data - check multiple possible sources
//       if (preservedFormData.sixMeterRate !== undefined) {
//         setFormData((prev) => ({ ...prev, rateper_6: preservedFormData.sixMeterRate }))
//       } else if (preservedFormData.rateper_6 !== undefined) {
//         setFormData((prev) => ({ ...prev, rateper_6: preservedFormData.rateper_6 }))
//       }

//       if (preservedFormData.twelveMeterRate !== undefined) {
//         setFormData((prev) => ({ ...prev, rateper_12: preservedFormData.twelveMeterRate }))
//       } else if (preservedFormData.rateper_12 !== undefined) {
//         setFormData((prev) => ({ ...prev, rateper_12: preservedFormData.rateper_12 }))
//       }

//       if (preservedFormData.abnormalRate !== undefined) {
//         setFormData((prev) => ({ ...prev, rateper_abnormal: preservedFormData.abnormalRate }))
//       } else if (preservedFormData.rateper_abnormal !== undefined) {
//         setFormData((prev) => ({ ...prev, rateper_abnormal: preservedFormData.rateper_abnormal }))
//       }
//     }
//   }, [preservedFormData, containerCounts])

//   useEffect(() => {
//     if (location.state?.preservedContainers) {
//       setPreservedContainers(location.state.preservedContainers)
//     }
//   }, [location.state?.preservedContainers])

//   // NEW: Effect to handle rate auto-population when count changes from 0 to >0
//   useEffect(() => {
//     // Only run if we have clients data and form data with clientId
//     if (clients.length === 0 || !formData.clientId) {
//       return
//     }

//     const selectedClient = clients.find((client) => client.m5clientkey.toString() === formData.clientId.toString())
//     if (!selectedClient) {
//       return
//     }

//     // Handle 6-meter containers
//     const sixMeterChanged = prevContainerCounts.num_six_meters === 0 && formData.num_six_meters > 0
//     if (sixMeterChanged) {
//       // Only populate if current rate is empty or zero
//       if (
//         (formData.rateper_6 === "" || formData.rateper_6 === "0" || Number(formData.rateper_6) === 0) &&
//         selectedClient.driver_six_meter_rate
//       ) {
//         const newRate = selectedClient.driver_six_meter_rate.toString()
//         setFormData((prev) => ({ ...prev, rateper_6: newRate }))
//         console.log(`Auto-populated 6m rate: ${newRate} (count changed from 0 to ${formData.num_six_meters})`)
//       }
//     }

//     // Handle 12-meter containers
//     const twelveMeterChanged = prevContainerCounts.num_twelve_meters === 0 && formData.num_twelve_meters > 0
//     if (twelveMeterChanged) {
//       // Only populate if current rate is empty or zero
//       if (
//         (formData.rateper_12 === "" || formData.rateper_12 === "0" || Number(formData.rateper_12) === 0) &&
//         selectedClient.driver_twelve_meter_rate
//       ) {
//         const newRate = selectedClient.driver_twelve_meter_rate.toString()
//         setFormData((prev) => ({ ...prev, rateper_12: newRate }))
//         console.log(`Auto-populated 12m rate: ${newRate} (count changed from 0 to ${formData.num_twelve_meters})`)
//       }
//     }

//     // Clear rates when count goes to 0
//     if (formData.num_six_meters === 0 && prevContainerCounts.num_six_meters > 0) {
//       setFormData((prev) => ({ ...prev, rateper_6: "" }))
//       console.log("Cleared 6m rate (count went to 0)")
//     }

//     if (formData.num_twelve_meters === 0 && prevContainerCounts.num_twelve_meters > 0) {
//       setFormData((prev) => ({ ...prev, rateper_12: "" }))
//       console.log("Cleared 12m rate (count went to 0)")
//     }

//     if (formData.num_abnormal === 0 && prevContainerCounts.num_abnormal > 0) {
//       setFormData((prev) => ({ ...prev, rateper_abnormal: "" }))
//       console.log("Cleared abnormal rate (count went to 0)")
//     }

//     // Update previous counts for next comparison
//     setPrevContainerCounts({
//       num_six_meters: formData.num_six_meters,
//       num_twelve_meters: formData.num_twelve_meters,
//       num_abnormal: formData.num_abnormal,
//     })
//   }, [formData.num_six_meters, formData.num_twelve_meters, formData.num_abnormal, clients, formData.clientId])

//   // Fetch instruction data by ID
//   const fetchInstructionData = async (id) => {
//     if (!id) {
//       console.error("No instruction ID provided to fetchInstructionData")
//       return
//     }

//     console.log("fetchInstructionData called with id:", id)
//     setIsLoading((prev) => ({ ...prev, instruction: true }))
//     try {
//       console.log(`Fetching instruction data for ID: ${id}`)
//       const response = await api.get(`/api/instructions/fc/instruction/${id}`)
//       const data = response.data

//       console.log("Instruction data received:", data)

//       if (!data) {
//         throw new Error("No data returned from server")
//       }

//       // Set the main form data
//       const newFormData = {
//         clientId: data.client ? data.client.toString() : "",
//         representative: data.representative || "",
//         contactDetails: data.cellnum || "",
//         email: data.email || "",
//         shipmentTypeId: data.shipment_type ? data.shipment_type.toString() : "",
//         shipmentTypeName: data.shipmenttype || "",
//         task: data.task || "",
//         pickup: data.pickup || "",
//         dropoff: data.dropoff || "",
//         hazardous: data.hazardous || false,
//         surchages: data.surchages || false,
//         surcharge: data.surcharge || 0,
//         pickupTime: data.pickuptime ? data.pickuptime.substring(0, 5) : "",
//         pickupDate: formatDateForInput(data.pickupdate) || "",
//         stackDate: formatDateForInput(data.stackdate) || "",
//         deadline: data.deadline ? formatDateForInput(new Date(data.deadline).toLocaleDateString()) : "",
//         fileRef: data.fileref || "",
//         bookingRef: data.booking_ref || "",
//         rateWeight: data.rateweight || "Container",
//         weight: data.weight || "",
//         num_six_meters: data.num_six_meters || 0,
//         num_twelve_meters: data.num_twelve_meters || 0,
//         num_abnormal: data.num_abnormal || 0,
//         num_breakbulk: data.num_breakbulk || 0,
//         vat: data.vat || 15,
//         description: data.description || "",
//         vesselName: data.vessel_name || "",
//         unitRate: data.unitrate || 0,
//         total_cost: calculateTotalCostFromRates(
//           data.rateper_6 || 0,
//           data.rateper_12 || 0,
//           data.rateper_abnormal || 0,
//           data.num_six_meters || 0,
//           data.num_twelve_meters || 0,
//           data.num_abnormal || 0,
//         ),
//         // Store rate data for preservation
//         rateper_6: data.rateper_6 || 0,
//         rateper_12: data.rateper_12 || 0,
//         rateper_abnormal: data.rateper_abnormal || 0,
//         rateper_breakbulk: data.rateper_breakbulk || 0,
//         status: data.status || "",
//       }

//       setFormData(newFormData)

//       // Set initial previous counts for existing instruction
//       setPrevContainerCounts({
//         num_six_meters: data.num_six_meters || 0,
//         num_twelve_meters: data.num_twelve_meters || 0,
//         num_abnormal: data.num_abnormal || 0,
//       })

//       // Set individual rate state variables from the backend response
//       setFormData((prev) => ({ ...prev, rateper_6: (data.rateper_6 || 0).toString() }))
//       setFormData((prev) => ({ ...prev, rateper_12: (data.rateper_12 || 0).toString() }))
//       setFormData((prev) => ({ ...prev, rateper_abnormal: (data.rateper_abnormal || 0).toString() }))
//       setWeight("")

//       // Process containers if they exist in the response
//       if (data.containers && data.containers.length > 0) {
//         console.log("Processing containers from instruction data:", data.containers)
//         const containersList = data.containers.map((container, index) => ({
//           id: container.containerkey || index + 1,
//           containerKey: container.containerkey,
//           containerNum: container.containernum || "",
//           weight: container.weight !== null && container.weight !== undefined ? container.weight.toString() : "",
//           containerType: container.container_type || "6m",
//           cargoDescription: container.cargo_description || "",
//         }))

//         console.log("Setting containers from instruction data:", containersList)
//         setContainers(containersList)
//         setIsContainerDataModified(false)
//       } else {
//         console.log("No containers found in instruction data, initializing based on counts")
//         initializeContainers()
//       }
//     } catch (error) {
//       console.error("Error fetching instruction data:", error)
//       let errorMessage = "Failed to fetch instruction data. Please try again."

//       if (error.response) {
//         errorMessage = `Server error: ${error.response.status} ${error.response.statusText}`
//       } else if (error.request) {
//         errorMessage = "Network error. Please check your connection."
//       }

//       setErrorModal({
//         isOpen: true,
//         message: errorMessage,
//       })
//     } finally {
//       setIsLoading((prev) => ({ ...prev, instruction: false }))
//     }
//   }

//   // Second useEffect: Fetch starting points and destinations when clientId is available
//   useEffect(() => {
//     if (formData.clientId) {
//       console.log("Client ID available, fetching starting points and destinations")
//       fetchStartingPoints()

//       // If we have a pickup value, use it to fetch destinations
//       if (formData.pickup) {
//         fetchDestinations(formData.pickup)
//       }
//     }
//   }, [formData.clientId, formData.pickup])

//   // Helper function to calculate total cost from individual rates
//   const calculateTotalCostFromRates = (rate6, rate12, rateAbnormal, count6, count12, countAbnormal) => {
//     return rate6 * count6 + rate12 * count12 + rateAbnormal * countAbnormal
//   }

//   const fetchClients = async () => {
//     setIsLoading((prev) => ({ ...prev, clients: true }))
//     try {
//       console.log("Fetching active clients...")
//       const response = await api.get("/api/instructions/active-clients")
//       console.log("Active clients data received:", response.data.length, "records")
//       setClients(response.data)
//     } catch (error) {
//       console.error("Error fetching active clients:", error)
//       let errorMessage = "Failed to fetch active clients. Please try again."
//       if (error.response) {
//         const { status } = error.response
//         errorMessage = `Failed to fetch active clients: ${status} ${error.response.statusText}`
//       } else if (error.request) {
//         errorMessage = "No response received from server. Please check your connection."
//       }
//       setErrorModal({
//         isOpen: true,
//         message: errorMessage,
//       })
//       setClients([])
//     } finally {
//       setIsLoading((prev) => ({ ...prev, clients: false }))
//     }
//   }

//   const fetchShipmentTypes = async () => {
//     setIsLoading((prev) => ({ ...prev, shipmentTypes: true }))
//     try {
//       console.log("Fetching shipment types...")
//       const response = await api.get("/api/instructions/shipment-types")
//       console.log("Shipment types data received:", response.data.length, "records")
//       setShipmentTypes(response.data)
//     } catch (error) {
//       console.error("Error fetching shipment types:", error)
//       let errorMessage = "Failed to fetch shipment types. Please try again."
//       if (error.response) {
//         const { status } = error.response
//         errorMessage = `Failed to fetch shipment types: ${status} ${error.response.statusText}`
//       } else if (error.request) {
//         errorMessage = "No response received from server. Please check your connection."
//       }
//       setErrorModal({
//         isOpen: true,
//         message: errorMessage,
//       })
//       setShipmentTypes([])
//     } finally {
//       setIsLoading((prev) => ({ ...prev, shipmentTypes: false }))
//     }
//   }

//   const fetchStartingPoints = async () => {
//     if (!formData.clientId) {
//       console.log("No client ID available to fetch starting points")
//       setStartingPoints([])
//       setIsLoading((prev) => ({ ...prev, startingPoints: false }))
//       return
//     }

//     setIsLoading((prev) => ({ ...prev, startingPoints: true }))
//     try {
//       console.log(`Fetching starting points for client ${formData.clientId}...`)
//       const response = await api.get(`/api/instructions/client/${formData.clientId}/starting-points`)
//       console.log("Starting points data received:", response.data)

//       // Ensure we have an array of objects with the correct structure
//       const formattedStartingPoints = Array.isArray(response.data)
//         ? response.data
//             .map((point, index) => ({
//               id: point.id || `point-${index}`,
//               startingpoint: point.starting_point || point.startingpoint || String(point),
//             }))
//             .filter((point) => point.startingpoint) // Filter out any null/undefined values
//         : []

//       console.log("Formatted starting points:", formattedStartingPoints)

//       setStartingPoints(formattedStartingPoints)

//       // If there's only one starting point, select it by default
//       if (formattedStartingPoints.length === 1 && !formData.pickup) {
//         setFormData((prev) => ({
//           ...prev,
//           pickup: formattedStartingPoints[0].startingpoint,
//         }))
//       }
//     } catch (error) {
//       console.error("Error fetching starting points:", error)
//       let errorMessage = "Failed to fetch starting points. Please try again."
//       if (error.response) {
//         const { status } = error.response
//         errorMessage = `Failed to fetch starting points: ${status} ${error.response.statusText}`
//       } else if (error.request) {
//         errorMessage = "No response received from server. Please check your connection."
//       }
//       setErrorModal({
//         isOpen: true,
//         message: errorMessage,
//       })
//       setStartingPoints([])
//     } finally {
//       setIsLoading((prev) => ({ ...prev, startingPoints: false }))
//     }
//   }

//   const fetchDestinations = async (startingPoint) => {
//     if (!startingPoint) {
//       setDestinations([])
//       return
//     }
//     if (!formData.clientId || !startingPoint) {
//       console.log("No client ID or starting point available to fetch destinations")
//       setDestinations([])
//       setIsLoading((prev) => ({ ...prev, destinations: false }))
//       return
//     }

//     setIsLoading((prev) => ({ ...prev, destinations: true }))
//     try {
//       console.log(`Fetching destinations for client ${formData.clientId} and starting point ${startingPoint}...`)
//       const response = await api.get(
//         `/api/instructions/client/${formData.clientId}/destinations/${encodeURIComponent(startingPoint)}`,
//       )
//       console.log("Destinations data received:", response.data)

//       // Ensure we have an array of objects with the correct structure
//       const formattedDestinations = Array.isArray(response.data)
//         ? response.data.map((dest) => ({
//             id: dest.id || dest.destination,
//             destination: dest.destination || String(dest),
//           }))
//         : []

//       setDestinations(formattedDestinations)

//       // If there's only one destination, select it by default
//       if (formattedDestinations.length === 1 && !formData.dropoff) {
//         setFormData((prev) => ({
//           ...prev,
//           dropoff: formattedDestinations[0].destination,
//         }))
//       }
//     } catch (error) {
//       console.error("Error fetching destinations:", error)
//       let errorMessage = "Failed to fetch destinations. Please try again."
//       if (error.response) {
//         const { status } = error.response
//         errorMessage = `Failed to fetch destinations: ${status} ${error.response.statusText}`
//       } else if (error.request) {
//         errorMessage = "No response received from server. Please check your connection."
//       }
//       setErrorModal({
//         isOpen: true,
//         message: errorMessage,
//       })
//       setDestinations([])
//     } finally {
//       setIsLoading((prev) => ({ ...prev, destinations: false }))
//     }
//   }

//   const handleClientChange = (e) => {
//     const clientId = e.target.value
//     const selectedClient = clients.find((client) => client.m5clientkey.toString() === clientId)
//     if (selectedClient) {
//       setFormData({
//         ...formData,
//         clientId,
//         representative: selectedClient.representative || "",
//         contactDetails: selectedClient.cellnum || "",
//         email: selectedClient.email || "",
//       })
//     } else {
//       setFormData({
//         ...formData,
//         clientId,
//         representative: "",
//         contactDetails: "",
//         email: "",
//       })
//     }
//     setFieldErrors((prev) => ({ ...prev, clientId: "" }))
//   }

//   const handleShipmentTypeChange = (e) => {
//     const shipmentTypeId = e.target.value
//     const selectedShipmentType = shipmentTypes.find((type) => type.shipkey.toString() === shipmentTypeId)
//     const shipmentTypeName = selectedShipmentType ? selectedShipmentType.shipmenttype : ""
//     const isImportType = shipmentTypeName.toLowerCase() === "import"
//     const isCrossHaul = shipmentTypeName.toLowerCase() === "cross-haul"

//     setIsImport(isImportType)
//     setFormData({
//       ...formData,
//       shipmentTypeId,
//       shipmentTypeName,
//     })
//     setFieldErrors((prev) => ({ ...prev, shipmentTypeId: "" }))
//   }

//   // Check if shipment type is Cross-haul
//   const isCrossHaulShipment = () => {
//     const selectedShipmentType = shipmentTypes.find((type) => type.shipkey.toString() === formData.shipmentTypeId)
//     return selectedShipmentType && selectedShipmentType.shipmenttype.toLowerCase() === "cross-haul"
//   }

//   // Format date from any format to YYYY-MM-DD for input[type="date"]
//   const formatDateForInput = (dateString) => {
//     if (!dateString) return ""

//     // If already in YYYY-MM-DD format, return as is
//     if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
//       return dateString
//     }

//     // Handle MM/DD/YYYY format
//     if (dateString.includes("/")) {
//       const [month, day, year] = dateString.split("/")
//       if (year && month && day) {
//         return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
//       }
//     }

//     // Try to parse as Date object if not in expected format
//     try {
//       const date = new Date(dateString)
//       if (!isNaN(date.getTime())) {
//         return date.toISOString().split("T")[0]
//       }
//     } catch (e) {
//       console.error("Error formatting date:", e)
//     }

//     return dateString // Return original if can't parse
//   }

//   // Fetch rates based on pickup and dropoff locations - always update rates
//   const fetchRates = async (pickupLocation, dropoffLocation = null) => {
//     if (!formData.clientId || !pickupLocation) return

//     console.log("Fetching rates for client:", formData.clientId, "pickup:", pickupLocation, "dropoff:", dropoffLocation)

//     try {
//       let destinationToUse = dropoffLocation

//       // If no dropoff provided, get the default destination for this client and pickup location
//       if (!destinationToUse) {
//         const destinations = await api.get(
//           `/api/instructions/client/${formData.clientId}/destinations/${encodeURIComponent(pickupLocation)}`,
//         )
//         destinationToUse = destinations.data?.[0]?.destination

//         if (!destinationToUse) {
//           console.log("No destination found for pickup location:", pickupLocation)
//           return
//         }
//       }

//       console.log("Using destination:", destinationToUse)

//       // Fetch rates with both start and destination using the correct endpoint
//       const response = await api.get(`/api/instructions/client/${formData.clientId}/rates`, {
//         params: {
//           start: pickupLocation,
//           destination: destinationToUse,
//         },
//       })

//       console.log("Rates API response:", response.data)

//       if (response.data) {
//         // Handle both array and object responses
//         const rateData = Array.isArray(response.data) ? response.data[0] : response.data

//         if (rateData) {
//           // Try to get rates with different possible property names
//           const rate6m = rateData.rateper_6 || rateData["6m_rate"] || rateData.sixMeterRate || 0
//           const rate12m = rateData.rateper_12 || rateData["12m_rate"] || rateData.twelveMeterRate || 0
//           const abnormalRate = rateData.rateper_abnormal || rateData.abnormalRate || 0
//           const surcharge = rateData.surcharge || rateData.surchages || 0

//           console.log("Updating rates (always override):", { rate6m, rate12m, abnormalRate, surcharge })

//           // Always update rates regardless of current values
//           setFormData((prev) => {
//             const updatedData = {
//               ...prev,
//               rateper_6: rate6m,
//               rateper_12: rate12m,
//               rateper_abnormal: abnormalRate,
//               surcharge: surcharge,
//             }

//             // Recalculate total cost with new rates
//             const totalCost =
//               (updatedData.num_six_meters || 0) * rate6m +
//               (updatedData.num_twelve_meters || 0) * rate12m +
//               (updatedData.num_abnormal || 0) * abnormalRate +
//               (updatedData.num_breakbulk || 0) * (updatedData.rateper_breakbulk || 0)

//             updatedData.total_cost = totalCost

//             return updatedData
//           })

//           // Show user feedback that rates were updated
//           setRateUpdateMessage("Rates updated based on selected route")
//           setTimeout(() => setRateUpdateMessage(""), 3000)
//         }
//       }
//     } catch (error) {
//       console.error("Error fetching rates:", error)
//       console.error("Error details:", error.response?.data || error.message)

//       // Show error message to user
//       setErrorModal({
//         isOpen: true,
//         message: "Failed to fetch rates for selected route. Please check your selection or try again.",
//       })
//     }
//   }

//   const handleDropoffChange = async (e) => {
//     const dropoffLocation = e.target.value

//     // Update the dropoff location in form data
//     setFormData((prev) => ({
//       ...prev,
//       dropoff: dropoffLocation,
//     }))

//     // Clear field error
//     clearFieldError("dropoff")

//     // Fetch new rates for the current pickup and new dropoff combination
//     if (formData.pickup && dropoffLocation) {
//       await fetchRates(formData.pickup, dropoffLocation)
//     }
//   }

//   const handlePickupChange = async (e) => {
//     const pickupLocation = e.target.value

//     // Update the pickup location in form data
//     setFormData((prev) => ({
//       ...prev,
//       pickup: pickupLocation,
//       dropoff: "", // Clear the dropoff when pickup changes
//     }))

//     // Clear field error
//     clearFieldError("pickup")

//     // Fetch new destinations and rates for the selected pickup location
//     await Promise.all([
//       fetchDestinations(pickupLocation),
//       fetchRates(pickupLocation), // This will get default destination
//     ])
//   }

//   const handleInputChange = (e) => {
//     const { name, value, type, checked } = e.target
//     let processedValue = type === "checkbox" ? checked : value

//     // Handle date inputs
//     if (type === "date") {
//       processedValue = formatDateForInput(value)
//     }

//     // Handle special field types
//     if (name === "imoNo") {
//       processedValue = value.replace(/[^0-9]/g, "").slice(0, 15)
//     } else if (name === "flagReg") {
//       processedValue = value.replace(/[^a-zA-Z\s\-']/g, "")
//     }

//     // Update form data
//     setFormData((prev) => ({
//       ...prev,
//       [name]: processedValue,
//     }))

//     // Clear field error when user starts typing
//     clearFieldError(name)
//   }

//   const handleNumericInputChange = (e) => {
//     const { name, value } = e.target

//     if (
//       name === "num_six_meters" ||
//       name === "num_twelve_meters" ||
//       name === "num_abnormal" ||
//       name === "num_breakbulk"
//     ) {
//       const numValue = Number.parseInt(value)
//       const validValue = isNaN(numValue) ? 0 : Math.max(0, numValue)
//       const prevValue = formData[name]
//       const isIncreasing = validValue > prevValue
//       const difference = Math.abs(validValue - prevValue)

//       // Update the form data
//       const updatedFormData = {
//         ...formData,
//         [name]: validValue,
//       }
//       setFormData(updatedFormData)

//       // Update the containers based on the count change
//       let containerType
//       if (name === "num_six_meters") containerType = "6m"
//       else if (name === "num_twelve_meters") containerType = "12m"
//       else if (name === "num_abnormal") containerType = "Abnormal"
//       else if (name === "num_breakbulk") containerType = "BreakBulk"

//       if (containerType) {
//         // Update containers directly
//         if (isIncreasing) {
//           // Add new containers
//           const newContainers = []
//           const nextId = containers.length > 0 ? Math.max(...containers.map((c) => c.id)) + 1 : 1

//           for (let i = 0; i < difference; i++) {
//             newContainers.push({
//               id: nextId + i,
//               containerKey: null,
//               containerNum: "",
//               weight: isImport ? "" : null,
//               containerType: containerType,
//               cargoDescription: "",
//             })
//           }

//           setContainers([...containers, ...newContainers])
//           setIsContainerDataModified(true)
//         } else {
//           // Remove containers of the specified type (most recently added first)
//           const containersOfType = containers.filter((c) => c.containerType === containerType)
//           const containersToRemove = containersOfType.slice(containersOfType.length - difference)
//           const updatedContainers = containers.filter((c) => !containersToRemove.includes(c))

//           setContainers(updatedContainers)
//           setIsContainerDataModified(true)
//         }

//         // Also update preserved containers for consistency
//         if (preservedContainers) {
//           updatePreservedContainers(containerType, isIncreasing, difference)
//         }
//       }

//       // Calculate total cost using individual rates
//       const sixRate = Number(formData.rateper_6 || 0)
//       const twelveRate = Number(formData.rateper_12 || 0)
//       const abnormalRateNum = Number(formData.rateper_abnormal || 0)
//       const breakBulkRate = Number(formData.rateper_breakbulk || 0)

//       const totalCost =
//         (name === "num_six_meters" ? validValue : updatedFormData.num_six_meters) * sixRate +
//         (name === "num_twelve_meters" ? validValue : updatedFormData.num_twelve_meters) * twelveRate +
//         (name === "num_abnormal" ? validValue : updatedFormData.num_abnormal) * abnormalRateNum +
//         (name === "num_breakbulk" ? validValue : updatedFormData.num_breakbulk || 0) * breakBulkRate

//       updatedFormData.total_cost = totalCost

//       console.log(`Container count updated - ${name}: ${validValue}`)
//       setFormData(updatedFormData)
//       updatePreservedContainers(name, isIncreasing, difference)
//       setFieldErrors((prev) => ({ ...prev, containers: "" }))
//     } else if (name === "rateWeight") {
//       const updatedFormData = {
//         ...formData,
//         [name]: value,
//       }
//       updatedFormData.total_cost = 0
//       setFormData(updatedFormData)
//       setFieldErrors((prev) => ({ ...prev, rateWeight: "", weight: "" }))
//     } else if (name === "pickupDate") {
//       setFormData({
//         ...formData,
//         [name]: value,
//         stackDate: formData.stackDate && new Date(formData.stackDate) <= new Date(value) ? "" : formData.stackDate,
//         deadline:
//           formData.deadline && new Date(formData.deadline) <= new Date(value) <= new Date(value)
//             ? ""
//             : formData.deadline,
//       })
//       setFieldErrors((prev) => ({ ...prev, pickupDate: "" }))
//     } else {
//       setFormData({
//         ...formData,
//         [name]: value,
//       })
//       setFieldErrors((prev) => ({ ...prev, [name]: "" }))
//     }
//   }

//   const handleRateChange = (e) => {
//     const { name, value } = e.target
//     if (value === "" || /^\d*\.?\d*$/.test(value)) {
//       // Update the rate in form data
//       const updatedFormData = {
//         ...formData,
//         [name]: value === "" ? "" : Number(value) || 0,
//       }

//       // Recalculate total cost
//       const sixRate = Number(updatedFormData.rateper_6 || 0)
//       const twelveRate = Number(updatedFormData.rateper_12 || 0)
//       const abnormalRateNum = Number(updatedFormData.rateper_abnormal || 0)
//       const breakBulkRate = Number(updatedFormData.rateper_breakbulk || 0)

//       updatedFormData.total_cost =
//         (updatedFormData.num_six_meters || 0) * sixRate +
//         (updatedFormData.num_twelve_meters || 0) * twelveRate +
//         (updatedFormData.num_abnormal || 0) * abnormalRateNum +
//         (updatedFormData.num_breakbulk || 0) * breakBulkRate

//       setFormData(updatedFormData)
//     }
//   }

//   const handleWeightChange = (e) => {
//     const value = e.target.value
//     if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
//       setWeight(value)
//       setFieldErrors((prev) => ({ ...prev, weight: "" }))
//     }
//   }

//   const updatePreservedContainers = (containerType, isIncreasing, difference) => {
//     const containerTypeMap = {
//       num_six_meters: "6m",
//       num_twelve_meters: "12m",
//       num_abnormal: "Abnormal",
//       num_breakbulk: "BreakBulk",
//     }
//     const type = containerTypeMap[containerType]
//     if (!type) return
//     if (isIncreasing) {
//       const newContainers = []
//       const nextId = preservedContainers.length > 0 ? Math.max(...preservedContainers.map((c) => c.id)) + 1 : 1
//       for (let i = 0; i < difference; i++) {
//         newContainers.push({
//           id: nextId + i,
//           containerKey: null,
//           containerNum: "",
//           weight: isImport ? "" : null,
//           containerType: type,
//           cargoDescription: "",
//         })
//       }
//       setPreservedContainers([...preservedContainers, ...newContainers])
//     } else {
//       const containersOfType = preservedContainers.filter((c) => c.containerType === type)
//       const containersToRemove = containersOfType.slice(containersOfType.length - difference)
//       const updatedContainers = preservedContainers.filter((c) => !containersToRemove.includes(c))
//       setPreservedContainers(updatedContainers)
//     }
//   }

//   const handleContainerCountChange = (type, value) => {
//     const numValue = Number.parseInt(value)
//     const validValue = isNaN(numValue) ? 0 : Math.max(0, numValue)
//     const prevValue = formData[type]
//     const isIncreasing = validValue > prevValue
//     const difference = Math.abs(validValue - prevValue)

//     // Update the form data
//     const updatedFormData = {
//       ...formData,
//       [type]: validValue,
//     }

//     // Calculate total cost using individual rates
//     const sixRate = Number(formData.rateper_6 || 0)
//     const twelveRate = Number(formData.rateper_12 || 0)
//     const abnormalRateNum = Number(formData.rateper_abnormal || 0)
//     const breakBulkRate = Number(formData.rateper_breakbulk || 0)

//     const totalCost =
//       (type === "num_six_meters" ? validValue : updatedFormData.num_six_meters) * sixRate +
//       (type === "num_twelve_meters" ? validValue : updatedFormData.num_twelve_meters) * twelveRate +
//       (type === "num_abnormal" ? validValue : updatedFormData.num_abnormal) * abnormalRateNum +
//       (type === "num_breakbulk" ? validValue : updatedFormData.num_breakbulk || 0) * breakBulkRate

//     updatedFormData.total_cost = totalCost

//     console.log(`Container count updated - ${type}: ${validValue}`)
//     setFormData(updatedFormData)
//     updatePreservedContainers(type, isIncreasing, difference)
//     setFieldErrors((prev) => ({ ...prev, containers: "" }))
//   }

//   const validateForm = () => {
//     console.log("validateForm called")
//     const isCrossHaul = isCrossHaulShipment()

//     const requiredFields = [
//       "clientId",
//       "shipmentTypeId",
//       "task",
//       "pickup",
//       "dropoff",
//       "pickupTime",
//       "pickupDate",
//       "deadline",
//       "bookingRef",
//       "fileRef",
//       "description",
//     ]

//     // Add vessel name and stack date as required only if not cross-haul
//     if (!isCrossHaul) {
//       requiredFields.push("vesselName", "stackDate")
//     }

//     let isValid = true
//     const errors = {}
//     console.log("Validating required fields...")
//     for (const field of requiredFields) {
//       if (!formData[field]) {
//         console.log(`Missing required field: ${field}`)
//         errors[field] = `This field is required`
//         isValid = false
//       } else {
//         console.log(`Field ${field} is valid:`, formData[field])
//       }
//     }
//     if (formData.shipmentTypeId) {
//       const selectedShipmentType = shipmentTypes.find((type) => type.shipkey.toString() === formData.shipmentTypeId)
//       if (selectedShipmentType) {
//         const shipmentTypeName = selectedShipmentType.shipmenttype.toLowerCase()
//         if (shipmentTypeName !== "import" && shipmentTypeName !== "export") {
//           errors.shipmentTypeId = "Please select either Import or Export"
//           isValid = false
//         }
//       }
//     }

//     // Rate validation - only require rates when container count > 0
//     if (formData.num_six_meters > 0) {
//       if (formData.rateper_6 === "" || formData.rateper_6 === "0" || Number(formData.rateper_6) === 0) {
//         errors.rateper_6 = "Rate is required when containers are present"
//         isValid = false
//       } else if (Number(formData.rateper_6) <= 0) {
//         errors.rateper_6 = "Rate must be a positive number"
//         isValid = false
//       }
//     }

//     if (formData.num_twelve_meters > 0) {
//       if (formData.rateper_12 === "" || formData.rateper_12 === "0" || Number(formData.rateper_12) === 0) {
//         errors.rateper_12 = "Rate is required when containers are present"
//         isValid = false
//       } else if (Number(formData.rateper_12) <= 0) {
//         errors.rateper_12 = "Rate must be a positive number"
//         isValid = false
//       }
//     }

//     if (formData.num_abnormal > 0) {
//       if (
//         formData.rateper_abnormal === "" ||
//         formData.rateper_abnormal === "0" ||
//         Number(formData.rateper_abnormal) === 0
//       ) {
//         errors.rateper_abnormal = "Rate is required when containers are present"
//         isValid = false
//       } else if (Number(formData.rateper_abnormal) <= 0) {
//         errors.rateper_abnormal = "Rate must be a positive number"
//         isValid = false
//       }
//     }

//     if (formData.rateWeight !== "Container" && (formData.weight === "" || weight === "")) {
//       errors.weight = "Please add weight"
//       isValid = false
//     } else if (formData.weight !== "" || weight !== "") {
//       const weightValue = Number.parseFloat(formData.weight || weight)
//       if (isNaN(weightValue) || weightValue <= 0) {
//         errors.weight = "Weight must be a positive number"
//         isValid = false
//       }
//     }
//     const totalContainers = formData.num_six_meters + formData.num_twelve_meters + formData.num_abnormal
//     if (totalContainers <= 0) {
//       errors.containers = "Please add at least one container"
//       isValid = false
//     }
//     if (formData.stackDate && formData.pickupDate && new Date(formData.stackDate) < new Date(formData.pickupDate)) {
//       errors.stackDate = `${isImport ? "ETA" : "Stack date"} cannot be before pickup date`
//       isValid = false
//     }
//     if (formData.deadline && formData.pickupDate && new Date(formData.deadline) < new Date(formData.pickupDate)) {
//       errors.deadline = "Deadline cannot be before pickup date"
//       isValid = false
//     }
//     if (formData.deadline && formData.stackDate && new Date(formData.deadline) < new Date(formData.stackDate)) {
//       errors.deadline = `Deadline cannot be before ${isImport ? "ETA" : "stack date"}`
//       isValid = false
//     }
//     setFieldErrors(errors)
//     if (!isValid) {
//       const firstErrorField = Object.keys(errors)[0]
//       scrollToField(firstErrorField)
//     }
//     return isValid
//   }

//   // Check if shipment type is Import
//   const isImportShipment = () => {
//     const selectedShipmentType = shipmentTypes.find((type) => type.shipkey.toString() === formData.shipmentTypeId)
//     return selectedShipmentType && selectedShipmentType.shipmenttype.toLowerCase() === "import"
//   }

//   const handleBackClick = () => {
//     const stateToPass = {
//       clientId,
//       clientName,
//       selectedMonth,
//       selectedYear,
//       activeFilter,
//     }

//     console.log("Navigating back to instructions with state:", stateToPass)
//     navigate("/instructions", { state: stateToPass })
//   }

//   const handleSubmit = async (e) => {
//     console.log("handleSubmit called")
//     e.preventDefault()

//     // First validate the form
//     console.log("Validating form...")
//     const isValid = validateForm()
//     console.log("Form validation result:", isValid)

//     if (!isValid) {
//       console.log("Form validation failed")
//       return
//     }

//     try {
//       console.log("Form is valid, proceeding with submission...")
//       // Calculate total cost using individual rates
//       const sixRate = Number(formData.rateper_6 || 0)
//       const twelveRate = Number(formData.rateper_12 || 0)
//       const abnormalRateNum = Number(formData.rateper_abnormal || 0)
//       const breakBulkRate = Number(formData.rateper_breakbulk || 0)

//       const totalCost =
//         formData.num_six_meters * sixRate +
//         formData.num_twelve_meters * twelveRate +
//         formData.num_abnormal * abnormalRateNum +
//         formData.num_breakbulk * breakBulkRate

//       const totalContainers =
//         formData.num_six_meters + formData.num_twelve_meters + formData.num_abnormal + formData.num_breakbulk

//       // IMPROVED: Create comprehensive form data with all current values
//       const updatedFormData = {
//         ...formData,
//         // Rate fields for display
//         rateper_6: sixRate.toString(),
//         rateper_12: twelveRate.toString(),
//         rateper_abnormal: abnormalRateNum.toString(),
//         // Rate fields for database
//         rateper_6: sixRate,
//         rateper_12: twelveRate,
//         rateper_abnormal: abnormalRateNum,
//         total_cost: totalCost,
//         weight: formData.rateWeight !== "Container" ? formData.weight || weight : null,
//       }

//       const stateToPass = {
//         controllerData: updatedFormData,
//         isImport: isImportShipment(),
//         totalContainers: totalContainers,
//         instructionId: instructionId,
//         clientId: clientId,
//         clientName: clientName,
//         selectedMonth: selectedMonth,
//         selectedYear: selectedYear,
//         activeFilter: activeFilter,
//         preservedContainers: preservedContainers,
//       }

//       console.log("Navigating to FCcontrollerInstructionDetails with state:", stateToPass)

//       navigate("/FCcontrollerInstructionDetails", { state: stateToPass })
//     } catch (error) {
//       console.error("Error processing form:", error)
//       setErrorModal({
//         isOpen: true,
//         message: "Failed to process form. Please try again.",
//       })
//     }
//   }

//   const handleRetryFetch = () => {
//     if (isLoading.clients || isLoading.shipmentTypes || isLoading.startingPoints || isLoading.destinations) {
//       return
//     }
//     fetchClients()
//     fetchShipmentTypes()
//     fetchStartingPoints()
//     fetchDestinations()
//     if (instructionId) {
//       fetchInstructionData(instructionId)
//     }
//     setErrorModal({
//       isOpen: false,
//       message: "",
//     })
//   }

//   const nonEditableStyle = {
//     backgroundColor: "#f0f0f0",
//     cursor: "not-allowed",
//   }

//   const readOnlyStyle = {
//     backgroundColor: "#f8f9fa",
//     cursor: "not-allowed",
//     color: "#6c757d",
//     border: "1px solid #e9ecef",
//   }

//   const ErrorTooltip = ({ message }) => {
//     if (!message) return null
//     return (
//       <div className="controller-instructions-error-tooltip">
//         {message}
//         <div className="controller-instructions-tooltip-arrow"></div>
//       </div>
//     )
//   }

//   // Loading state check that includes all required data
//   const isLoadingComplete =
//     !isLoading.clients &&
//     !isLoading.shipmentTypes &&
//     !isLoading.startingPoints &&
//     !isLoading.destinations &&
//     !isLoading.instruction &&
//     Object.keys(formData).length > 0 // Ensure formData is initialized

//   // Debug log for loading states
//   console.log("Loading states:", {
//     clients: isLoading.clients,
//     shipmentTypes: isLoading.shipmentTypes,
//     startingPoints: isLoading.startingPoints,
//     destinations: isLoading.destinations,
//     instruction: isLoading.instruction,
//     formDataKeys: Object.keys(formData),
//     isLoadingComplete,
//   })

//   // Ensure we have all required data before rendering the form
//   if (!isLoadingComplete) {
//     return (
//       <div style={{ textAlign: "center", padding: "20px" }}>
//         <p>Loading data...</p>
//       </div>
//     )
//   }

//   // Check if we have all required data
//   console.log("Data availability check:", {
//     clients: clients.length,
//     shipmentTypes: shipmentTypes.length,
//     startingPoints: startingPoints.length,
//     destinations: destinations.length,
//   })

//   if (clients.length === 0 || shipmentTypes.length === 0 || startingPoints.length === 0 || destinations.length === 0) {
//     return (
//       <div style={{ textAlign: "center", padding: "20px" }}>
//         <p>Failed to load required data. Please try again.</p>
//         <button
//           onClick={handleRetryFetch}
//           style={{
//             padding: "8px 16px",
//             backgroundColor: "#4a90e2",
//             color: "white",
//             border: "none",
//             borderRadius: "4px",
//             cursor: "pointer",
//             marginTop: "10px",
//           }}
//         >
//           Retry
//         </button>
//       </div>
//     )
//   }

//   // Log form data before render
//   console.log("Rendering with formData:", formData)
//   console.log(
//     "Client options:",
//     clients.map((c) => ({ id: c.m5clientkey, name: c.companyname })),
//   )
//   console.log("Current client selection:", formData.clientId)

//   return (
//     <div className="controller-instructions-root">
//       <div className="controller-instructions-unique-wrapper">
//         {errorModal.isOpen && errorModal.message.includes("Failed to fetch") && (
//           <ErrorModal
//             isOpen={errorModal.isOpen}
//             onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
//             message={errorModal.message}
//           />
//         )}
//         <div className="controller-instructions-header">
//           <button className="controller-instructions-back-button" onClick={() => handleBackClick()}>
//             Back
//           </button>
//         </div>
//         <div className="controller-instructions-form-container" style={{ maxWidth: "1200px" }}>
//           {isReadOnly && (
//             <div
//               style={{
//                 backgroundColor: "#fff3cd",
//                 border: "1px solid #ffeaa7",
//                 borderRadius: "4px",
//                 padding: "12px",
//                 marginBottom: "20px",
//                 textAlign: "center",
//                 color: "#856404",
//                 fontWeight: "bold",
//               }}
//             >
//               ⚠️ This instruction is {formData.status} and is in read-only mode
//             </div>
//           )}
//           <div className="controller-instructions-form-section controller-instructions-client-info-section">
//             <div className="controller-instructions-form-row">
//               <div className="controller-instructions-form-field">
//                 <label>Client</label>
//                 <div className="controller-instructions-select-wrapper" ref={fieldRefs.clientId}>
//                   <select
//                     style={isReadOnly ? readOnlyStyle : nonEditableStyle}
//                     className={`dropdown ${fieldErrors.clientId ? "controller-instructions-error-field" : ""}`}
//                     name="clientId"
//                     value={formData.clientId || ""}
//                     onChange={handleClientChange}
//                     disabled={true}
//                   >
//                     <option value="" disabled>
//                       Select Client
//                     </option>
//                     {clients.map((client) => (
//                       <option key={client.m5clientkey} value={client.m5clientkey}>
//                         {client.companyname}
//                       </option>
//                     ))}
//                   </select>
//                   <ErrorTooltip message={fieldErrors.clientId} />
//                 </div>
//               </div>
//               <div className="controller-instructions-form-field">
//                 <label>Representative</label>
//                 <input
//                   type="text"
//                   className="controller-instructions-form-input"
//                   style={isReadOnly ? readOnlyStyle : nonEditableStyle}
//                   value={formData.representative || ""}
//                   readOnly
//                   placeholder="Autoload representative"
//                   name="representative"
//                   onChange={handleInputChange}
//                   disabled={true}
//                 />
//                 <ErrorTooltip message={fieldErrors.representative} />
//               </div>
//               <div className="controller-instructions-form-field">
//                 <label>Contact Details</label>
//                 <input
//                   type="text"
//                   className="controller-instructions-form-input"
//                   placeholder="Autoload contact details"
//                   name="contactDetails"
//                   value={formData.contactDetails}
//                   readOnly
//                   style={isReadOnly ? readOnlyStyle : nonEditableStyle}
//                   disabled={isReadOnly}
//                 />
//               </div>
//               <div className="controller-instructions-form-field">
//                 <label>Email</label>
//                 <input
//                   type="email"
//                   className="controller-instructions-form-input"
//                   placeholder="Autoload email"
//                   name="email"
//                   value={formData.email}
//                   readOnly
//                   style={isReadOnly ? readOnlyStyle : nonEditableStyle}
//                   disabled={isReadOnly}
//                 />
//               </div>
//             </div>
//           </div>
//           <div className="controller-instructions-form-section">
//             <div className="controller-instructions-form-row" style={{ display: "none" }}>
//               <div className="controller-instructions-form-field">
//                 <label>Shipment Type</label>
//                 <div className="controller-instructions-select-wrapper" ref={fieldRefs.shipmentTypeId}>
//                   <select
//                     className={`dropdown ${fieldErrors.shipmentTypeId ? "controller-instructions-error-field" : ""}`}
//                     name="shipmentTypeId"
//                     value={formData.shipmentTypeId}
//                     onChange={handleShipmentTypeChange}
//                     disabled={isReadOnly}
//                     style={isReadOnly ? readOnlyStyle : {}}
//                   >
//                     <option value="" disabled>
//                       Select Shipment
//                     </option>
//                     {shipmentTypes.map((type) => (
//                       <option key={type.shipkey} value={type.shipkey}>
//                         {type.shipmenttype}
//                       </option>
//                     ))}
//                   </select>
//                   <ErrorTooltip message={fieldErrors.shipmentTypeId} />
//                 </div>
//               </div>
//               <div className="controller-instructions-form-field">
//                 <label>Name of Task</label>
//                 <div className="controller-instructions-input-wrapper" ref={fieldRefs.task}>
//                   <input
//                     type="text"
//                     className={`controller-instructions-form-input ${fieldErrors.task ? "controller-instructions-error-field" : ""}`}
//                     placeholder="Input Name of Task"
//                     name="task"
//                     value={formData.task}
//                     onChange={handleInputChange}
//                     disabled={isReadOnly}
//                     style={isReadOnly ? readOnlyStyle : {}}
//                   />
//                   <ErrorTooltip message={fieldErrors.task} />
//                 </div>
//               </div>
//             </div>
//           </div>
//           <div className="controller-instructions-form-section">
//             <div className="controller-instructions-form-row controller-instructions-trailer-container">
//               <div className="controller-instructions-trailer-title" style={{ display: "none" }}>
//                 <h3>Trailer Size</h3>
//               </div>
//               <hr className="controller-instructions-divider" style={{ display: "none" }} />

//               <div className="controller-instructions-container-section">
//                 <div className="controller-instructions-container-group">
//                   <div className="controller-instructions-container-label">
//                     <span className="controller-instructions-trailer-size-label">Trailer Size</span>
//                     <label>No. of Containers</label>
//                     {fieldErrors.containers && (
//                       <div className="controller-instructions-container-error-message">{fieldErrors.containers}</div>
//                     )}
//                   </div>
//                   <div className="controller-instructions-container-inputs">
//                     <div className="controller-instructions-container-input">
//                       <label>6m</label>
//                       <div className="controller-instructions-container-rate-group">
//                         <input
//                           type="number"
//                           className={fieldErrors.containers ? "controller-instructions-error-field" : ""}
//                           value={formData.num_six_meters}
//                           min="0"
//                           name="num_six_meters"
//                           onChange={(e) => handleNumericInputChange(e)}
//                           disabled={formData.rateWeight !== "Container" || isReadOnly}
//                           style={isReadOnly ? readOnlyStyle : {}}
//                         />
//                         <div
//                           className="controller-instructions-input-wrapper controller-instructions-rate-input"
//                           ref={fieldRefs.rateper_6}
//                         >
//                           <input
//                             type="text"
//                             className={`controller-instructions-form-input ${fieldErrors.rateper_6 ? "controller-instructions-error-field" : ""}`}
//                             placeholder="Rate"
//                             value={formData.rateper_6 || ""}
//                             name="rateper_6"
//                             onChange={handleRateChange}
//                             disabled={formData.rateWeight !== "Container" || isReadOnly}
//                             style={isReadOnly ? readOnlyStyle : {}}
//                           />
//                           <ErrorTooltip message={fieldErrors.rateper_6} />
//                         </div>
//                       </div>
//                     </div>
//                     <div className="controller-instructions-container-input">
//                       <label>12m</label>
//                       <div className="controller-instructions-container-rate-group">
//                         <input
//                           type="number"
//                           className={fieldErrors.containers ? "controller-instructions-error-field" : ""}
//                           value={formData.num_twelve_meters}
//                           min="0"
//                           name="num_twelve_meters"
//                           onChange={(e) => handleNumericInputChange(e)}
//                           disabled={formData.rateWeight !== "Container" || isReadOnly}
//                           style={isReadOnly ? readOnlyStyle : {}}
//                         />
//                         <div
//                           className="controller-instructions-input-wrapper controller-instructions-rate-input"
//                           ref={fieldRefs.rateper_12}
//                         >
//                           <input
//                             type="text"
//                             className={`controller-instructions-form-input ${fieldErrors.rateper_12 ? "controller-instructions-error-field" : ""}`}
//                             placeholder="Rate"
//                             value={formData.rateper_12 || ""}
//                             name="rateper_12"
//                             onChange={handleRateChange}
//                             disabled={formData.rateWeight !== "Container" || isReadOnly}
//                             style={isReadOnly ? readOnlyStyle : {}}
//                           />
//                           <ErrorTooltip message={fieldErrors.rateper_12} />
//                         </div>
//                       </div>
//                     </div>
//                     <div className="controller-instructions-container-input">
//                       <label>Abnormal</label>
//                       <div className="controller-instructions-container-rate-group">
//                         <input
//                           type="number"
//                           className={fieldErrors.containers ? "controller-instructions-error-field" : ""}
//                           value={formData.num_abnormal}
//                           min="0"
//                           name="num_abnormal"
//                           onChange={(e) => handleNumericInputChange(e)}
//                           disabled={formData.rateWeight !== "Container" || isReadOnly}
//                           style={isReadOnly ? readOnlyStyle : {}}
//                         />
//                         <div
//                           className="controller-instructions-input-wrapper controller-instructions-rate-input"
//                           ref={fieldRefs.rateper_abnormal}
//                         >
//                           <input
//                             type="text"
//                             className={`controller-instructions-form-input ${fieldErrors.rateper_abnormal ? "controller-instructions-error-field" : ""}`}
//                             placeholder="Rate"
//                             value={formData.rateper_abnormal || ""}
//                             name="rateper_abnormal"
//                             onChange={handleRateChange}
//                             disabled={formData.rateWeight !== "Container" || isReadOnly}
//                             style={isReadOnly ? readOnlyStyle : {}}
//                           />
//                           <ErrorTooltip message={fieldErrors.rateper_abnormal} />
//                         </div>
//                       </div>
//                     </div>
//                     {(formData.shipmentTypeId === "3" || formData.shipmentTypeName.toLowerCase() === "cross-haul") && (
//                       <div className="controller-instructions-container-input">
//                         <label>Break Bulk</label>
//                         <div className="controller-instructions-container-rate-group">
//                           <input
//                             type="number"
//                             className={fieldErrors.containers ? "controller-instructions-error-field" : ""}
//                             value={formData.num_breakbulk || 0}
//                             min="0"
//                             name="num_breakbulk"
//                             onChange={(e) => handleNumericInputChange(e)}
//                             disabled={formData.rateWeight !== "Container" || isReadOnly}
//                             style={isReadOnly ? readOnlyStyle : {}}
//                           />
//                           <div
//                             className="controller-instructions-input-wrapper controller-instructions-rate-input"
//                             ref={fieldRefs.rateper_breakbulk}
//                           >
//                             <input
//                               type="text"
//                               className={`controller-instructions-form-input ${fieldErrors.rateper_breakbulk ? "controller-instructions-error-field" : ""}`}
//                               placeholder="Rate"
//                               value={formData.rateper_breakbulk || ""}
//                               name="rateper_breakbulk"
//                               onChange={handleRateChange}
//                               disabled={formData.rateWeight !== "Container" || isReadOnly}
//                               style={isReadOnly ? readOnlyStyle : {}}
//                             />
//                             <ErrorTooltip message={fieldErrors.rateper_breakbulk} />
//                           </div>
//                         </div>
//                       </div>
//                     )}
//                   </div>

//                   {/* Hazardous and Surcharges Checkboxes - Horizontally Aligned */}
//                   <div
//                     className="controller-instructions-form-row"
//                     style={{ marginTop: "16px", marginBottom: "16px", marginLeft: "10px" }}
//                   >
//                     <div
//                       className="controller-instructions-form-field"
//                       style={{ display: "flex", flexDirection: "row", gap: "30px", alignItems: "center" }}
//                     >
//                       <label className="controller-instructions-checkbox-container" style={{ margin: "5px 0" }}>
//                         <input
//                           type="checkbox"
//                           name="hazardous"
//                           checked={formData.hazardous || false}
//                           onChange={handleInputChange}
//                           disabled={isReadOnly}
//                         />
//                         <span className="controller-instructions-checkmark"></span>
//                         Hazardous Materials
//                       </label>
//                       <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
//                         <label className="controller-instructions-checkbox-container" style={{ margin: "5px 0" }}>
//                           <input
//                             type="checkbox"
//                             name="surchages"
//                             checked={formData.surchages || false}
//                             onChange={handleInputChange}
//                             disabled={isReadOnly}
//                           />
//                           <span className="controller-instructions-checkmark"></span>
//                           Add Surcharges
//                         </label>
//                         {formData.surchages && (
//                           <div
//                             className="controller-instructions-input-wrapper"
//                             style={{ width: "150px", marginLeft: "10px" }}
//                           >
//                             <input
//                               type="number"
//                               className="controller-instructions-form-input"
//                               name="surcharge"
//                               value={formData.surcharge || ""}
//                               onChange={handleInputChange}
//                               min="0"
//                               step="0.01"
//                               placeholder="Amount"
//                               style={{ width: "100%", padding: "4px 8px", ...(isReadOnly ? readOnlyStyle : {}) }}
//                               disabled={isReadOnly}
//                             />
//                           </div>
//                         )}
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//                 {/* Main form section */}
//                 <div
//                   className="controller-instructions-booking-vertical-group"
//                   style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px", maxWidth: "220px" }}
//                 >
//                   <div className="controller-instructions-form-field">
//                     <label>Shipment Type</label>
//                     <div className="controller-instructions-select-wrapper" ref={fieldRefs.shipmentTypeId}>
//                       <select
//                         className={`controller-instructions-dropdown ${fieldErrors.shipmentTypeId ? "controller-instructions-error-field" : ""}`}
//                         name="shipmentTypeId"
//                         value={formData.shipmentTypeId}
//                         onChange={handleShipmentTypeChange}
//                         disabled={isReadOnly}
//                         style={isReadOnly ? readOnlyStyle : {}}
//                       >
//                         <option value="" disabled>
//                           Select Shipment
//                         </option>
//                         {shipmentTypes.map((type) => (
//                           <option key={type.shipkey} value={type.shipkey}>
//                             {type.shipmenttype}
//                           </option>
//                         ))}
//                       </select>
//                       <ErrorTooltip message={fieldErrors.shipmentTypeId} />
//                     </div>
//                   </div>
//                   <div className="controller-instructions-form-field">
//                     <label>Pickup Location</label>
//                     <div className="controller-instructions-select-wrapper" ref={fieldRefs.pickup}>
//                       <select
//                         className={`controller-instructions-dropdown ${fieldErrors.pickup ? "controller-instructions-error-field" : ""}`}
//                         name="pickup"
//                         value={formData.pickup || ""}
//                         onChange={handlePickupChange}
//                         disabled={isReadOnly}
//                         style={isReadOnly ? readOnlyStyle : {}}
//                       >
//                         <option value="" disabled>
//                           Select Pickup
//                         </option>
//                         {startingPoints.map((point) => (
//                           <option key={point.id} value={point.startingpoint}>
//                             {point.startingpoint}
//                           </option>
//                         ))}
//                       </select>
//                       <ErrorTooltip message={fieldErrors.pickup} />
//                     </div>
//                   </div>
//                   <div className="controller-instructions-form-field">
//                     <label>Dropoff Location</label>
//                     <div className="controller-instructions-select-wrapper" ref={fieldRefs.dropoff}>
//                       <select
//                         className={`controller-instructions-dropdown ${fieldErrors.dropoff ? "controller-instructions-error-field" : ""}`}
//                         name="dropoff"
//                         value={formData.dropoff || ""}
//                         onChange={handleDropoffChange}
//                         disabled={isReadOnly}
//                         style={isReadOnly ? readOnlyStyle : {}}
//                       >
//                         <option value="" disabled>
//                           Select Dropoff
//                         </option>
//                         {destinations.map((dest) => (
//                           <option key={dest.id} value={dest.destination}>
//                             {dest.destination}
//                           </option>
//                         ))}
//                       </select>
//                       <ErrorTooltip message={fieldErrors.dropoff} />
//                     </div>
//                   </div>
//                   {/* This surchages section has been moved to be next to the checkbox */}

//                   {/* Compact Rates per dropdown and input fields in one row */}
//                   <div className="controller-instructions-form-field">
//                     <label>Unit per</label>
//                     <div style={{ display: "flex", alignItems: "flex-start", gap: "15px", width: "100%" }}>
//                       {/* Unit per dropdown */}
//                       <div
//                         className="controller-instructions-select-wrapper"
//                         style={{ minWidth: "100px", marginTop: "5px" }}
//                       >
//                         <select
//                           className="controller-instructions-dropdown"
//                           name="rateWeight"
//                           value={formData.rateWeight || "Container"}
//                           onChange={handleInputChange}
//                           style={{ width: "100%", padding: "4px 8px", ...(isReadOnly ? readOnlyStyle : {}) }}
//                           ref={fieldRefs.rateWeight}
//                           disabled={isReadOnly}
//                         >
//                           <option value="kg">kg</option>
//                           <option value="m³">m³</option>
//                           <option value="ton">ton</option>
//                           <option value="Container">Container</option>
//                         </select>
//                       </div>

//                       {/* Rate per unit and weight textboxes */}
//                       {(formData.rateWeight === "kg" ||
//                         formData.rateWeight === "m³" ||
//                         formData.rateWeight === "ton") && (
//                         <div
//                           style={{
//                             display: "flex",
//                             gap: "15px",
//                             width: "100%",
//                             marginTop: "48px",
//                             marginLeft: "-113px",
//                           }}
//                         >
//                           {/* Unit Rate Field */}
//                           <div className="controller-instructions-form-field" style={{ flex: 1, minWidth: "150px" }}>
//                             <label>{`Rate per ${formData.rateWeight}`}</label>
//                             <div
//                               className="controller-instructions-input-wrapper"
//                               ref={fieldRefs.unitRate}
//                               style={{ width: "100%" }}
//                             >
//                               <input
//                                 type="text"
//                                 className={`controller-instructions-form-input ${fieldErrors.unitRate ? "controller-instructions-error-field" : ""}`}
//                                 name="unitRate"
//                                 value={formData.unitRate || ""}
//                                 onChange={(e) => {
//                                   const value = e.target.value
//                                   if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
//                                     handleInputChange(e)
//                                   }
//                                 }}
//                                 disabled={isReadOnly}
//                                 style={isReadOnly ? readOnlyStyle : {}}
//                               />
//                               <ErrorTooltip message={fieldErrors.unitRate} />
//                             </div>
//                           </div>

//                           {/* Weight Field */}
//                           <div className="controller-instructions-form-field" style={{ flex: 1, minWidth: "150px" }}>
//                             <label>{`Weight (${formData.rateWeight})`}</label>
//                             <div
//                               className="controller-instructions-input-wrapper"
//                               ref={fieldRefs.weight}
//                               style={{ width: "100%" }}
//                             >
//                               <input
//                                 type="text"
//                                 className={`controller-instructions-form-input ${fieldErrors.weight ? "controller-instructions-error-field" : ""}`}
//                                 name="weight"
//                                 value={formData.weight || ""}
//                                 onChange={(e) => {
//                                   const value = e.target.value
//                                   if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
//                                     handleInputChange(e)
//                                   }
//                                 }}
//                                 disabled={isReadOnly}
//                                 style={isReadOnly ? readOnlyStyle : {}}
//                               />
//                               <ErrorTooltip message={fieldErrors.quantity} />
//                             </div>
//                           </div>
//                         </div>
//                       )}
//                     </div>
//                   </div>
//                 </div>
//                 {/* End of main form section */}

//                 {/* Hazardous / Surcharge checkboxes moved below Rate Type */}
//                 <div className="controller-instructions-date-time-group">
//                   <div className="controller-instructions-shipment-task-row" style={{ order: -1, marginBottom: "8px" }}>
//                     <div className="controller-instructions-form-field controller-instructions-small-field">
//                       <label>Booking Reference</label>
//                       <div className="controller-instructions-input-wrapper" ref={fieldRefs.bookingRef}>
//                         <input
//                           type="text"
//                           className={`controller-instructions-form-input ${fieldErrors.bookingRef ? "controller-instructions-error-field" : ""}`}
//                           placeholder="Enter booking ref"
//                           name="bookingRef"
//                           value={formData.bookingRef}
//                           onChange={handleInputChange}
//                           disabled={isReadOnly}
//                           style={isReadOnly ? readOnlyStyle : {}}
//                         />
//                         <ErrorTooltip message={fieldErrors.bookingRef} />
//                       </div>
//                     </div>
//                     <div className="controller-instructions-form-field controller-instructions-small-field">
//                       <label>File Ref</label>
//                       <div className="controller-instructions-input-wrapper" ref={fieldRefs.fileRef}>
//                         <input
//                           type="text"
//                           className={`controller-instructions-form-input ${fieldErrors.fileRef ? "controller-instructions-error-field" : ""}`}
//                           placeholder="Enter file ref"
//                           name="fileRef"
//                           value={formData.fileRef}
//                           onChange={handleInputChange}
//                           disabled={isReadOnly}
//                           style={isReadOnly ? readOnlyStyle : {}}
//                         />
//                         <ErrorTooltip message={fieldErrors.fileRef} />
//                       </div>
//                     </div>
//                     {/* Booking / File / VAT inline with task */}
//                     <div className="controller-instructions-booking-inline-row" style={{ display: "none" }}>
//                       <div
//                         className="controller-instructions-form-field controller-instructions-small-field"
//                         style={{ flex: "0 1 160px" }}
//                       >
//                         <label>Booking Reference</label>
//                         <div className="controller-instructions-input-wrapper">
//                           <input
//                             type="text"
//                             className="controller-instructions-form-input"
//                             placeholder="Enter booking ref"
//                             name="bookingRef"
//                             value={formData.bookingRef}
//                             onChange={handleInputChange}
//                           />
//                         </div>
//                       </div>
//                       <div
//                         className="controller-instructions-form-field controller-instructions-small-field"
//                         style={{ flex: "0 1 160px" }}
//                       >
//                         <label>File Ref</label>
//                         <div className="controller-instructions-input-wrapper">
//                           <input
//                             type="text"
//                             className="controller-instructions-form-input"
//                             placeholder="Enter file ref"
//                             name="fileRef"
//                             value={formData.fileRef}
//                             onChange={handleInputChange}
//                           />
//                         </div>
//                       </div>
//                       <div
//                         className="controller-instructions-form-field controller-instructions-small-field"
//                         style={{ flex: "0 1 80px" }}
//                       >
//                         <label>VAT Rate %</label>
//                         <div className="controller-instructions-input-wrapper">
//                           <input
//                             type="number"
//                             className="controller-instructions-form-input"
//                             name="vat"
//                             value={formData.vat || 15}
//                             onChange={handleInputChange}
//                             required
//                           />
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                   <div className="controller-instructions-form-field">
//                     <label>Name of Task</label>
//                     <div className="controller-instructions-input-wrapper" ref={fieldRefs.task}>
//                       <input
//                         type="text"
//                         className={`controller-instructions-form-input ${fieldErrors.task ? "controller-instructions-error-field" : ""}`}
//                         placeholder="Input Name of Task"
//                         name="task"
//                         value={formData.task}
//                         onChange={handleInputChange}
//                         disabled={isReadOnly}
//                         style={isReadOnly ? readOnlyStyle : {}}
//                       />
//                       <ErrorTooltip message={fieldErrors.task} />
//                     </div>
//                   </div>
//                   <div className="controller-instructions-form-field" style={{ maxWidth: "120px" }}>
//                     <label>VAT Rate %</label>
//                     <div className="controller-instructions-input-wrapper">
//                       <input
//                         type="number"
//                         className="controller-instructions-form-input"
//                         name="vat"
//                         value={formData.vat || 15}
//                         onChange={handleInputChange}
//                         required
//                         disabled={isReadOnly}
//                         style={isReadOnly ? readOnlyStyle : {}}
//                       />
//                     </div>
//                   </div>
//                   {!isCrossHaulShipment() && (
//                     <div className="controller-instructions-form-field">
//                       <label>Vessel Name</label>
//                       <div className="controller-instructions-input-wrapper" ref={fieldRefs.vesselName}>
//                         <input
//                           type="text"
//                           className={`controller-instructions-form-input ${fieldErrors.vesselName ? "controller-instructions-error-field" : ""}`}
//                           placeholder="Enter vessel name"
//                           name="vesselName"
//                           value={formData.vesselName}
//                           onChange={handleInputChange}
//                           disabled={isReadOnly}
//                           style={isReadOnly ? readOnlyStyle : {}}
//                         />
//                         <ErrorTooltip message={fieldErrors.vesselName} />
//                       </div>
//                     </div>
//                   )}
//                   <div className="controller-instructions-form-field">
//                     <label>Description</label>
//                     <div className="controller-instructions-input-wrapper" ref={fieldRefs.description}>
//                       <input
//                         type="text"
//                         className={`controller-instructions-form-input ${fieldErrors.description ? "controller-instructions-error-field" : ""}`}
//                         placeholder="Enter description"
//                         name="description"
//                         value={formData.description}
//                         onChange={handleInputChange}
//                         disabled={isReadOnly}
//                         style={isReadOnly ? readOnlyStyle : {}}
//                       />
//                       <ErrorTooltip message={fieldErrors.description} />
//                     </div>
//                   </div>
//                 </div>
//                 <div className="controller-instructions-date-time-group">
//                   <div className="controller-instructions-form-field">
//                     <label>Pickup Time</label>
//                     <input
//                       type="time"
//                       className={`controller-instructions-form-input ${fieldErrors.pickupTime ? "controller-instructions-error-field" : ""}`}
//                       name="pickupTime"
//                       value={formData.pickupTime}
//                       onChange={handleInputChange}
//                       ref={fieldRefs.pickupTime}
//                       disabled={isReadOnly}
//                       style={isReadOnly ? readOnlyStyle : {}}
//                     />
//                     <ErrorTooltip message={fieldErrors.pickupTime} />
//                   </div>
//                   <div className="controller-instructions-form-field">
//                     <label>Pickup Date</label>
//                     <div className="controller-instructions-date-wrapper" ref={fieldRefs.pickupDate}>
//                       <input
//                         type="date"
//                         className={`controller-instructions-form-input ${fieldErrors.pickupDate ? "controller-instructions-error-field" : ""}`}
//                         name="pickupDate"
//                         value={formData.pickupDate}
//                         onChange={handleInputChange}
//                         min={today}
//                         ref={pickupDateRef}
//                         disabled={isReadOnly}
//                         style={isReadOnly ? readOnlyStyle : {}}
//                       />
//                       <ErrorTooltip message={fieldErrors.pickupDate} />
//                     </div>
//                   </div>
//                   {!isCrossHaulShipment() && (
//                     <div className="controller-instructions-form-field">
//                       <label>{isImport ? "ETA Date" : "Stack Date"}</label>
//                       <div className="controller-instructions-date-wrapper" ref={fieldRefs.stackDate}>
//                         <input
//                           type="date"
//                           className={`controller-instructions-form-input ${fieldErrors.stackDate ? "controller-instructions-error-field" : ""}`}
//                           name="stackDate"
//                           value={formData.stackDate}
//                           onChange={handleInputChange}
//                           min={formData.pickupDate || today}
//                           ref={etaDateRef}
//                           disabled={isReadOnly}
//                           style={isReadOnly ? readOnlyStyle : {}}
//                         />
//                         <ErrorTooltip message={fieldErrors.stackDate} />
//                       </div>
//                     </div>
//                   )}
//                   <div className="controller-instructions-form-field">
//                     <label>Deadline</label>
//                     <div className="controller-instructions-date-wrapper" ref={fieldRefs.deadline}>
//                       <input
//                         type="date"
//                         className={`controller-instructions-form-input ${fieldErrors.deadline ? "controller-instructions-error-field" : ""}`}
//                         name="deadline"
//                         value={formData.deadline}
//                         onChange={handleInputChange}
//                         min={formData.pickupDate || today}
//                         ref={deadlineDateRef}
//                         disabled={isReadOnly}
//                         style={isReadOnly ? readOnlyStyle : {}}
//                       />
//                       <ErrorTooltip message={fieldErrors.deadline} />
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//           {/* Container Details Table */}
//           {containers.length > 0 && (
//             <div className="controller-instructions-form-section">
//               <div className="controller-instructions-container-details-section">
//                 <h3>Container Details</h3>
//                 {(containerSuccessMessage || rateUpdateMessage) && (
//                   <div className="controller-instructions-success-message">
//                     {containerSuccessMessage || rateUpdateMessage}
//                   </div>
//                 )}
//                 <div
//                   className="controller-instructions-container-table-wrapper"
//                   style={{
//                     overflowX: "auto",
//                     marginBottom: "20px",
//                   }}
//                 >
//                   <table
//                     className="controller-instructions-container-table"
//                     style={{
//                       width: "100%",
//                       borderCollapse: "collapse",
//                       marginBottom: "10px",
//                     }}
//                   >
//                     <thead>
//                       <tr>
//                         <th style={{ padding: "12px 8px", textAlign: "left", borderBottom: "2px solid #ddd" }}>
//                           Container Type
//                         </th>
//                         <th style={{ padding: "12px 8px", textAlign: "left", borderBottom: "2px solid #ddd" }}>
//                           Container Number
//                         </th>
//                         {isImport && (
//                           <th style={{ padding: "12px 8px", textAlign: "left", borderBottom: "2px solid #ddd" }}>
//                             Weight (kg)
//                           </th>
//                         )}
//                         <th style={{ padding: "12px 8px", textAlign: "left", borderBottom: "2px solid #ddd" }}>
//                           Cargo Description
//                         </th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {containers.map((container) => (
//                         <tr key={container.id}>
//                           <td>{container.containerType}</td>
//                           <td>
//                             <div className="controller-instructions-input-wrapper">
//                               <input
//                                 type="text"
//                                 className={`controller-instructions-form-input ${
//                                   containerFieldErrors[`container-${container.id}`]
//                                     ? "controller-instructions-error-field"
//                                     : ""
//                                 }`}
//                                 value={container.containerNum}
//                                 onChange={(e) => handleContainerChange(container.id, "containerNum", e.target.value)}
//                                 placeholder="ABCD1234567"
//                                 maxLength={11}
//                                 disabled={isReadOnly}
//                                 style={isReadOnly ? readOnlyStyle : {}}
//                               />
//                               {containerFieldErrors[`container-${container.id}`] && (
//                                 <div
//                                   className="controller-instructions-container-error-text"
//                                   style={{
//                                     color: "#e74c3c",
//                                     fontSize: "12px",
//                                     marginTop: "4px",
//                                     fontWeight: "500",
//                                     display: "block",
//                                   }}
//                                 >
//                                   {containerFieldErrors[`container-${container.id}`]}
//                                 </div>
//                               )}
//                             </div>
//                           </td>
//                           {isImport && (
//                             <td>
//                               <div className="controller-instructions-input-wrapper">
//                                 <input
//                                   type="text"
//                                   className={`controller-instructions-form-input ${
//                                     containerFieldErrors[`weight-${container.id}`]
//                                       ? "controller-instructions-error-field"
//                                       : ""
//                                   }`}
//                                   value={container.weight || ""}
//                                   onChange={(e) => handleContainerChange(container.id, "weight", e.target.value)}
//                                   placeholder="0.00"
//                                   disabled={isReadOnly}
//                                   style={isReadOnly ? readOnlyStyle : {}}
//                                 />
//                                 {containerFieldErrors[`weight-${container.id}`] && (
//                                   <div
//                                     className="controller-instructions-container-error-text"
//                                     style={{
//                                       color: "#e74c3c",
//                                       fontSize: "12px",
//                                       marginTop: "4px",
//                                       fontWeight: "500",
//                                       display: "block",
//                                     }}
//                                   >
//                                     {containerFieldErrors[`weight-${container.id}`]}
//                                   </div>
//                                 )}
//                               </div>
//                             </td>
//                           )}
//                           <td>
//                             <div className="controller-instructions-input-wrapper">
//                               <input
//                                 type="text"
//                                 className="controller-instructions-form-input"
//                                 value={container.cargoDescription}
//                                 onChange={(e) =>
//                                   handleContainerChange(container.id, "cargoDescription", e.target.value)
//                                 }
//                                 placeholder="Enter cargo description"
//                                 disabled={isReadOnly}
//                                 style={isReadOnly ? readOnlyStyle : {}}
//                               />
//                             </div>
//                           </td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>
//                 {isContainerLoading && (
//                   <div className="controller-instructions-loading-message">Updating containers...</div>
//                 )}
//               </div>
//             </div>
//           )}
//           {!isReadOnly && (
//             <div className="controller-instructions-form-actions" style={{ display: "flex", justifyContent: "center" }}>
//               <button
//                 className="controller-instructions-save-button"
//                 onClick={handleSaveChanges}
//                 style={{
//                   backgroundColor: "#4a90e2",
//                   color: "white",
//                   padding: "12px 24px",
//                   border: "none",
//                   borderRadius: "4px",
//                   cursor: "pointer",
//                   fontSize: "16px",
//                   fontWeight: "bold",
//                 }}
//               >
//                 Save Changes
//               </button>
//             </div>
//           )}

//           {isReadOnly && (
//             <div className="controller-instructions-form-actions" style={{ display: "flex", justifyContent: "center" }}>
//               <div
//                 style={{
//                   backgroundColor: "#6c757d",
//                   color: "white",
//                   padding: "12px 24px",
//                   borderRadius: "4px",
//                   fontSize: "16px",
//                   fontWeight: "bold",
//                   textAlign: "center",
//                 }}
//               >
//                 This instruction is {formData.status} and cannot be edited
//               </div>
//             </div>
//           )}
//         </div>
//         {/* Confirmation Modal */}
//         {confirmationModal.isOpen && (
//           <div
//             className="controller-instructions-modal-overlay"
//             style={{
//               position: "fixed",
//               top: 0,
//               left: 0,
//               right: 0,
//               bottom: 0,
//               backgroundColor: "rgba(0, 0, 0, 0.5)",
//               display: "flex",
//               justifyContent: "center",
//               alignItems: "center",
//               zIndex: 1000,
//             }}
//           >
//             <div
//               className="controller-instructions-modal-content"
//               style={{
//                 backgroundColor: "white",
//                 padding: "24px",
//                 borderRadius: "8px",
//                 maxWidth: "500px",
//                 width: "90%",
//                 boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
//               }}
//             >
//               <h3 style={{ marginBottom: "16px", color: "#333" }}>Confirm Save</h3>
//               <p style={{ marginBottom: "24px", lineHeight: "1.5", color: "#666" }}>{confirmationModal.message}</p>
//               <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
//                 <button
//                   onClick={handleCancelSave}
//                   style={{
//                     padding: "8px 16px",
//                     border: "1px solid #ddd",
//                     borderRadius: "4px",
//                     backgroundColor: "white",
//                     color: "#666",
//                     cursor: "pointer",
//                   }}
//                 >
//                   No, Let Me Edit
//                 </button>
//                 <button
//                   onClick={handleConfirmSave}
//                   style={{
//                     padding: "8px 16px",
//                     border: "none",
//                     borderRadius: "4px",
//                     backgroundColor: "#4a90e2",
//                     color: "white",
//                     cursor: "pointer",
//                   }}
//                 >
//                   Yes, Continue
//                 </button>
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }

// export default FCcontrollerinstructions

"use client"

import { useState, useEffect, useRef } from "react"
import "../../css/controllerinstruction.css"
import { useNavigate, useLocation } from "react-router-dom"
import ErrorModal from "../../../../components/ErrorModal"
import api from "../../../../api"

// ErrorTooltip component for displaying validation errors
const ErrorTooltip = ({ message }) => {
  if (!message) return null

  return (
    <div className="error-tooltip">
      <span className="error-icon">!</span>
      <div className="error-message">{message}</div>
    </div>
  )
}

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
    rateWeight: useRef(null),
    unitRate: useRef(null),
  }

  const [isImport, setIsImport] = useState(location.state?.isImport || false)
  const today = new Date().toISOString().split("T")[0]
  const [weight, setWeight] = useState("")
  const [rateUpdateMessage, setRateUpdateMessage] = useState("")

  // Log the isImport state for debugging
  useEffect(() => {
    console.log("isImport state changed:", isImport)
  }, [isImport])

  // NEW: Track previous container counts to detect changes from 0 to >0
  const [prevContainerCounts, setPrevContainerCounts] = useState({
    num_six_meters: 0,
    num_twelve_meters: 0,
    num_abnormal: 0,
  })

  const [formData, setFormData] = useState(() => {
    // Default empty form data
    const defaultData = {
      // Rates
      rateper_6: preservedFormData?.rateper_6 || 0,
      rateper_12: preservedFormData?.rateper_12 || 0,
      rateper_abnormal: preservedFormData?.rateper_abnormal || 0,
      surcharge: preservedFormData?.surcharge || 0,
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
      surchages: false,
      pickupTime: "",
      pickupDate: "",
      stackDate: "",
      deadline: "",
      fileRef: "",
      bookingRef: "",
      rateWeight: "Container",
      weight: "",
      unitRate: "",
      quantity: "",
      num_six_meters: 0,
      num_twelve_meters: 0,
      num_abnormal: 0,
      vat: 15,
      description: "",
      total_cost: 0,
      status: "",
    }

    if (preservedFormData) {
      // If we have container counts from navigation, use them
      if (containerCounts) {
        console.log("Initializing form data with container counts:", containerCounts)
        const initialData = {
          ...defaultData,
          ...preservedFormData,
          num_six_meters: containerCounts["6m"] || 0,
          num_twelve_meters: containerCounts["12m"] || 0,
          num_abnormal: containerCounts["Abnormal"] || 0,
          rateWeight: "Container",
          weight: "",
        }
        // Set initial previous counts
        setPrevContainerCounts({
          num_six_meters: containerCounts["6m"] || 0,
          num_twelve_meters: containerCounts["12m"] || 0,
          num_abnormal: containerCounts["Abnormal"] || 0,
        })
        return initialData
      }
      // If we just have preserved form data without container counts
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
      surchages: false,
      pickupTime: "",
      pickupDate: "",
      stackDate: "",
      deadline: "",
      fileRef: "",
      bookingRef: "",
      rateWeight: "Container",
      weight: "",
      num_six_meters: 0,
      num_twelve_meters: 0,
      num_abnormal: 0,
      vat: 15,
      description: "",
      total_cost: 0,
      status: "",
    }
  })

  // Check if the instruction should be read-only based on status
  const isReadOnly = formData.status === "In progress" || formData.status === "Completed"

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

  // Container state
  const [containers, setContainers] = useState([])
  const [containerFieldErrors, setContainerFieldErrors] = useState({})
  const [containerSuccessMessage, setContainerSuccessMessage] = useState("")
  const [isContainerLoading, setIsContainerLoading] = useState(false)
  const [isContainerDataModified, setIsContainerDataModified] = useState(false)

  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    message: "",
  })

  // Initialize containers based on container counts
  const initializeContainers = () => {
    console.log("Initializing containers with form data:", formData)
    const counts = {
      "6m": formData.num_six_meters || 0,
      "12m": formData.num_twelve_meters || 0,
      Abnormal: formData.num_abnormal || 0,
      BreakBulk: formData.num_breakbulk || 0,
    }

    // If we already have containers and counts are zero, don't clear them
    if (
      containers &&
      containers.length > 0 &&
      counts["6m"] === 0 &&
      counts["12m"] === 0 &&
      counts["Abnormal"] === 0 &&
      counts["BreakBulk"] === 0
    ) {
      console.log("Keeping existing containers as counts are zero")
      return
    }

    const containersList = []
    let containerId = 1

    // Add 6m containers
    for (let i = 0; i < counts["6m"]; i++) {
      containersList.push({
        id: containerId++,
        containerKey: null,
        containerNum: "",
        weight: isImport ? null : null, // Always start with null
        containerType: "6m",
        cargoDescription: "",
      })
    }

    // Add 12m containers
    for (let i = 0; i < counts["12m"]; i++) {
      containersList.push({
        id: containerId++,
        containerKey: null,
        containerNum: "",
        weight: isImport ? null : null, // Always start with null
        containerType: "12m",
        cargoDescription: "",
      })
    }

    // Add abnormal containers
    for (let i = 0; i < counts["Abnormal"]; i++) {
      containersList.push({
        id: containerId++,
        containerKey: null,
        containerNum: "",
        weight: isImport ? null : null, // Always start with null
        containerType: "Abnormal",
        cargoDescription: "",
      })
    }

    // Add break bulk containers
    for (let i = 0; i < counts["BreakBulk"]; i++) {
      containersList.push({
        id: containerId++,
        containerKey: null,
        containerNum: "",
        weight: isImport ? null : null, // Always start with null
        containerType: "BreakBulk",
        cargoDescription: "",
      })
    }

    setContainers(containersList)
    setIsContainerLoading(false)
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

      // Clear error when user starts typing
      clearContainerFieldError(id, "container")
    }

    if (field === "weight") {
      // Clear error when user starts typing
      clearContainerFieldError(id, "weight")

      // Sanitize weight value - convert empty string to null, validate numeric input
      let sanitizedValue = null
      if (value && value.trim() !== "") {
        // Only allow valid numeric input (including decimals)
        if (/^[0-9]*\.?[0-9]*$/.test(value.trim())) {
          const numValue = Number.parseFloat(value.trim())
          if (!isNaN(numValue) && numValue >= 0) {
            sanitizedValue = numValue
          } else {
            // Invalid number, keep as string for user feedback but will be sanitized on save
            sanitizedValue = value
          }
        } else {
          // Invalid format, don't update
          return
        }
      }

      // Update with sanitized value (null for empty, number for valid input)
      setContainers((prevContainers) =>
        prevContainers.map((container) =>
          container.id === id ? { ...container, [field]: sanitizedValue } : container,
        ),
      )
      setIsContainerDataModified(true)
      return
    }

    // Update the container value
    setContainers((prevContainers) =>
      prevContainers.map((container) => (container.id === id ? { ...container, [field]: value } : container)),
    )
    setIsContainerDataModified(true)
  }

  // Validate containers
  const validateContainers = () => {
    const counts = countContainersByType()
    const newErrors = {}
    let isValid = true

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

      // Weight validation for import shipments
      if (isImport) {
        if (container.weight === null || container.weight === undefined || container.weight === "") {
          newErrors[`weight-${container.id}`] = "Field is required"
          isValid = false
        } else if (typeof container.weight === "string" && container.weight.trim() === "") {
          newErrors[`weight-${container.id}`] = "Field is required"
          isValid = false
        } else if (container.weight !== null) {
          const weightValue =
            typeof container.weight === "number" ? container.weight : Number.parseFloat(container.weight)
          if (isNaN(weightValue) || weightValue < 0) {
            newErrors[`weight-${container.id}`] = "Must be a valid positive number"
            isValid = false
          }
        }
      }
    }

    setContainerFieldErrors(newErrors)
    return isValid
  }

  // Validate required form fields
  const validateRequiredFields = () => {
    const newErrors = {}
    let isValid = true

    // Required fields for all instruction types
    const requiredFields = [
      { name: "clientId", label: "Client" },
      { name: "shipmentTypeId", label: "Shipment Type" },
      { name: "pickup", label: "Pickup Location" },
      { name: "dropoff", label: "Dropoff Location" },
      { name: "pickupDate", label: "Pickup Date" },
    ]

    // Check each required field
    requiredFields.forEach((field) => {
      if (!formData[field.name]) {
        newErrors[field.name] = `${field.label} is required`
        isValid = false
      }
    })

    // Set the errors
    setFieldErrors((prev) => ({ ...prev, ...newErrors }))

    // If there are errors, scroll to the first error field
    if (!isValid) {
      const firstErrorField = requiredFields.find((field) => !formData[field.name])
      if (firstErrorField) {
        scrollToField(firstErrorField.name)
      }
    }

    return isValid
  }

  // Count containers by type
  const countContainersByType = () => {
    const counts = {
      "6m": 0,
      "12m": 0,
      Abnormal: 0,
      BreakBulk: 0,
    }

    containers.forEach((container) => {
      counts[container.containerType]++
    })

    return counts
  }

  // Fetch original data for comparison
  const fetchOriginalData = async () => {
    try {
      const response = await api.get(`/api/instructions/fc/instruction/${instructionId}`)
      return response.data
    } catch (error) {
      console.error("Error fetching original data:", error)
      return null
    }
  }

  // Validate container uniqueness
  const validateContainerUniqueness = () => {
    const containerNumbers = containers.map((c) => c.containerNum).filter((num) => num.trim() !== "")
    const uniqueNumbers = new Set(containerNumbers)

    if (containerNumbers.length !== uniqueNumbers.size) {
      setErrorModal({
        isOpen: true,
        message: "Container numbers must be unique within the same instruction.",
      })
      return false
    }
    return true
  }

  // Enhanced validation with field highlighting
  const validateAllFields = () => {
    const newErrors = {}
    let isValid = true
    const isCrossHaul = isCrossHaulShipment()

    // Required fields validation
    const requiredFields = [
      { name: "clientId", label: "Client" },
      { name: "shipmentTypeId", label: "Shipment Type" },
      { name: "pickup", label: "Pickup Location" },
      { name: "dropoff", label: "Dropoff Location" },
      { name: "pickupDate", label: "Pickup Date" },
      { name: "task", label: "Task" },
      { name: "fileRef", label: "File Reference" },
      { name: "bookingRef", label: "Booking Reference" },
      { name: "description", label: "Description" },
    ]

    // Add vessel name only if not cross-haul
    if (!isCrossHaul) {
      requiredFields.push({ name: "vesselName", label: "Vessel Name" })
    }

    requiredFields.forEach((field) => {
      if (!formData[field.name]) {
        newErrors[field.name] = `${field.label} is required`
        isValid = false
      }
    })

    // Container validation
    const containerErrors = {}
    containers.forEach((container) => {
      if (!container.containerNum) {
        containerErrors[`container-${container.id}`] = "Container number is required"
        isValid = false
      } else if (container.containerNum.length !== 11 || !/^[a-zA-Z]{4}[0-9]{7}$/.test(container.containerNum)) {
        containerErrors[`container-${container.id}`] = "Does not match correct format (ABCD1234567)"
        isValid = false
      }

      if (isImport && (container.weight === "" || container.weight === null)) {
        containerErrors[`weight-${container.id}`] = "Weight is required for import shipments"
        isValid = false
      } else if (isImport && container.weight && !/^[0-9]*\.?[0-9]*$/.test(container.weight)) {
        containerErrors[`weight-${container.id}`] = "Weight must be a valid number"
        isValid = false
      }
    })

    // Check container uniqueness
    if (!validateContainerUniqueness()) {
      isValid = false
    }

    setFieldErrors(newErrors)
    setContainerFieldErrors(containerErrors)

    return isValid
  }

  // Clear field errors when user starts typing
  const clearFieldError = (fieldName) => {
    setFieldErrors((prev) => ({ ...prev, [fieldName]: "" }))
  }

  const clearContainerFieldError = (containerId, fieldType) => {
    setContainerFieldErrors((prev) => ({ ...prev, [`${fieldType}-${containerId}`]: "" }))
  }

  // Check for rate/counter mismatch and show confirmation if needed
  const checkRateCounterMismatch = () => {
    const mismatches = []
    const containerTypesWithCounts = []

    // Check each container type for rate > 0 but count = 0
    if ((formData.rateper_6 > 0 || Number(formData.rateper_6) > 0) && formData.num_six_meters === 0) {
      mismatches.push("6m")
    }
    if ((formData.rateper_12 > 0 || Number(formData.rateper_12) > 0) && formData.num_twelve_meters === 0) {
      mismatches.push("12m")
    }
    if ((formData.rateper_abnormal > 0 || Number(formData.rateper_abnormal) > 0) && formData.num_abnormal === 0) {
      mismatches.push("Abnormal")
    }
    if (
      (formData.rateper_breakbulk > 0 || Number(formData.rateper_breakbulk) > 0) &&
      (formData.num_breakbulk === 0 || !formData.num_breakbulk)
    ) {
      mismatches.push("Break Bulk")
    }

    // If there are mismatches, collect container types with counts > 0
    if (mismatches.length > 0) {
      if (formData.num_six_meters > 0) {
        containerTypesWithCounts.push(`6m (${formData.num_six_meters} containers, Rate: R${formData.rateper_6})`)
      }
      if (formData.num_twelve_meters > 0) {
        containerTypesWithCounts.push(`12m (${formData.num_twelve_meters} containers, Rate: R${formData.rateper_12})`)
      }
      if (formData.num_abnormal > 0) {
        containerTypesWithCounts.push(
          `Abnormal (${formData.num_abnormal} containers, Rate: R${formData.rateper_abnormal})`,
        )
      }
      if (formData.num_breakbulk > 0) {
        containerTypesWithCounts.push(
          `Break Bulk (${formData.num_breakbulk} containers, Rate: R${formData.rateper_breakbulk})`,
        )
      }

      // Show confirmation modal
      const message =
        containerTypesWithCounts.length > 0
          ? `You have containers with the following rates: ${containerTypesWithCounts.join(", ")}. Are you sure you want to continue?`
          : "You have set rates for container types with 0 containers. Are you sure you want to continue?"

      setConfirmationModal({
        isOpen: true,
        message: message,
      })
      return false // Don't proceed with save
    }

    return true // No mismatches, proceed with save
  }

  // Handle save changes with enhanced logic
  const handleSaveChanges = async () => {
    console.log("=== SAVE CHANGES INITIATED ===")

    // Validate all fields first
    if (!validateAllFields()) {
      console.log("❌ Validation failed - blocking save operation")
      setErrorModal({
        isOpen: true,
        message: "Please fix all validation errors before saving.",
      })
      return
    }

    // Check for rate/counter mismatch
    if (!checkRateCounterMismatch()) {
      console.log("⚠️ Rate/counter mismatch detected - showing confirmation")
      return
    }

    // Proceed with actual save logic
    await performSave()
  }

  // Extract the actual save logic into a separate function
  const performSave = async () => {
    try {
      setIsContainerLoading(true)
      setContainerSuccessMessage("")

      // Fetch original data for comparison
      console.log("📊 Fetching original data for comparison...")
      const originalData = await fetchOriginalData()

      // Helper function to format dates for database (YYYY-MM-DD)
      const formatDateForDB = (dateString) => {
        if (!dateString) return null
        try {
          // If already in YYYY-MM-DD format, return as is
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return dateString
          }
          // Handle MM/DD/YYYY format
          if (dateString.includes("/")) {
            const [month, day, year] = dateString.split("/")
            if (year && month && day) {
              return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
            }
          }
          // Try to parse as Date object
          const date = new Date(dateString)
          if (!isNaN(date.getTime())) {
            return date.toISOString().split("T")[0]
          }
          return null
        } catch (e) {
          console.error("Error formatting date:", e)
          return null
        }
      }

      // Helper function to format time for database (HH:MM:SS)
      const formatTimeForDB = (timeString) => {
        if (!timeString) return null
        try {
          const [hours, minutes] = timeString.split(":")
          return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}:00`
        } catch (e) {
          console.error("Error formatting time:", e)
          return null
        }
      }

      // Recalculate total cost based on current values
      const numSix = formData.num_six_meters || 0
      const numTwelve = formData.num_twelve_meters || 0
      const numAbnormal = formData.num_abnormal || 0
      const numBreakBulk = formData.num_breakbulk || 0

      const ratePer6 = numSix > 0 ? Number(formData.rateper_6 || 0) : 0
      const ratePer12 = numTwelve > 0 ? Number(formData.rateper_12 || 0) : 0
      const ratePerAbnormal = numAbnormal > 0 ? Number(formData.rateper_abnormal || 0) : 0
      const ratePerBreakBulk = numBreakBulk > 0 ? Number(formData.rateper_breakbulk || 0) : 0

      const baseCost =
        ratePer6 * numSix + ratePer12 * numTwelve + ratePerAbnormal * numAbnormal + ratePerBreakBulk * numBreakBulk
      const surchargeAmount = formData.surchages ? Number(formData.surcharge || 0) : 0
      const totalCost = Number((baseCost + surchargeAmount).toFixed(2))

      // Prepare instruction update data with proper field mapping
      const instructionUpdateData = {
        // Map frontend fields to backend database fields
        client: formData.clientId,
        task: formData.task,
        shipment_type: formData.shipmentTypeId,
        pickup: formData.pickup,
        dropoff: formData.dropoff,
        hazardous: Boolean(formData.hazardous),
        surchages: Boolean(formData.surchages),
        surcharge: surchargeAmount,
        pickuptime: formatTimeForDB(formData.pickupTime),
        pickupdate: formatDateForDB(formData.pickupDate),
        stackdate: formatDateForDB(formData.stackDate),
        deadline: formatDateForDB(formData.deadline),
        fileref: formData.fileRef,
        rateweight: formData.rateWeight,
        description: formData.description,
        status: formData.status,
        vat: Number(formData.vat || 15),
        num_six_meters: numSix,
        num_twelve_meters: numTwelve,
        num_abnormal: numAbnormal,
        num_breakbulk: numBreakBulk,
        weight: formData.rateWeight !== "Container" ? Number(formData.weight || 0) : null,
        total_cost: totalCost,
        booking_ref: formData.bookingRef,
        vessel_name: formData.vesselName,
        rateper_6: ratePer6,
        rateper_12: ratePer12,
        rateper_abnormal: ratePerAbnormal,
        rateper_breakbulk: ratePerBreakBulk,
        unitrate: formData.rateWeight !== "Container" ? Number(formData.unitRate || 0) : null,
      }

      // Prepare container data with containerKey for smart updates
      const containerData = containers.map((container) => {
        // Sanitize weight value
        let sanitizedWeight = null
        if (container.weight !== null && container.weight !== undefined && container.weight !== "") {
          if (typeof container.weight === "string") {
            const trimmedWeight = container.weight.trim()
            if (trimmedWeight !== "") {
              const parsedWeight = Number.parseFloat(trimmedWeight)
              if (!isNaN(parsedWeight) && parsedWeight >= 0) {
                sanitizedWeight = parsedWeight
              }
            }
          } else if (typeof container.weight === "number" && container.weight >= 0) {
            sanitizedWeight = container.weight
          }
        }

        return {
          containerKey: container.containerKey, // Important for smart updates
          containernum: container.containerNum || "",
          weight: sanitizedWeight, // Will be null for empty/invalid values
          container_type: container.containerType || "",
          cargo_description: container.cargoDescription || "",
        }
      })

      // Console log comparison between old and new data
      console.log("📋 DATA COMPARISON:")
      console.log("===================")

      if (originalData) {
        console.log("🔄 INSTRUCTION CHANGES:")
        console.log("Old total_cost:", originalData.total_cost, "→ New total_cost:", totalCost)
        console.log("Old num_six_meters:", originalData.num_six_meters, "→ New num_six_meters:", numSix)
        console.log("Old num_twelve_meters:", originalData.num_twelve_meters, "→ New num_twelve_meters:", numTwelve)
        console.log("Old num_abnormal:", originalData.num_abnormal, "→ New num_abnormal:", numAbnormal)
        console.log("Old rateper_6:", originalData.rateper_6, "→ New rateper_6:", ratePer6)
        console.log("Old rateper_12:", originalData.rateper_12, "→ New rateper_12:", ratePer12)
        console.log("Old rateper_abnormal:", originalData.rateper_abnormal, "→ New rateper_abnormal:", ratePerAbnormal)
        console.log("Old task:", originalData.task, "→ New task:", formData.task)
        console.log("Old description:", originalData.description, "→ New description:", formData.description)
      }

      console.log("💾 Sending update request to server...")
      console.log("Instruction data:", instructionUpdateData)
      console.log("Container data:", containerData)

      // Make the API call
      const response = await api.put(`/api/instructions/fc/update/${instructionId}`, {
        instructionData: instructionUpdateData,
        containers: containerData,
      })

      console.log("✅ Server response:", response.data)

      // Check for successful response (status 200)
      if (response.status === 200) {
        console.log("🎉 Save operation completed successfully!")

        // Show success message
        setContainerSuccessMessage("Changes saved successfully!")
        setIsContainerDataModified(false)

        // Navigate after 2 seconds
        setTimeout(() => {
          console.log("🚀 Navigating to instructions list...")
          navigate("/ViewClientInstruction")
        }, 2000)
      } else {
        console.warn("⚠️ Unexpected server response:", response)
        setErrorModal({
          isOpen: true,
          message: "Save completed but server response was unexpected. Please verify your changes.",
        })
      }
    } catch (error) {
      console.error("❌ Error saving changes:", error)
      console.error("Error details:", error.response?.data || error.message)

      setErrorModal({
        isOpen: true,
        message: error.response?.data?.message || "Failed to save changes. Please try again.",
      })
    } finally {
      setIsContainerLoading(false)
    }
  }

  // Handle confirmation modal actions
  const handleConfirmSave = async () => {
    setConfirmationModal({ isOpen: false, message: "" })
    await performSave()
  }

  const handleCancelSave = () => {
    setConfirmationModal({ isOpen: false, message: "" })
  }

  // Initialize containers when component mounts or container counts change
  useEffect(() => {
    console.log("Container loading effect triggered")
    console.log("Current instructionId:", instructionId)

    const loadContainers = async () => {
      // If we already have containers from the instruction data, don't load them again
      if (containers && containers.length > 0) {
        console.log("Containers already loaded from instruction data")
        return
      }

      if (!instructionId) {
        console.log("No instructionId, initializing empty containers")
        initializeContainers()
        return
      }

      // Only fetch containers if we don't have any yet
      console.log("No containers loaded yet, fetching from API for instruction:", instructionId)
      setIsContainerLoading(true)

      try {
        const response = await api.get(`/api/instructions/fc/instruction/${instructionId}`)
        console.log("Containers API response:", response.data)

        if (response.data && response.data.length > 0) {
          const containersList = response.data.map((container, index) => ({
            id: container.containerkey || index + 1,
            containerKey: container.containerkey,
            containerNum: container.containernum || "",
            weight: container.weight !== null && container.weight !== undefined ? container.weight : null,
            containerType: container.container_type || "6m",
            cargoDescription: container.cargo_description || "",
          }))

          console.log("Setting containers from API:", containersList)
          setContainers(containersList)
          setIsContainerDataModified(false)
        } else if (formData.num_six_meters > 0 || formData.num_twelve_meters > 0 || formData.num_abnormal > 0) {
          console.log("No containers found in API, initializing based on form counts")
          initializeContainers()
        }
      } catch (error) {
        console.error("Error loading containers:", error)
        if (error.response) {
          console.error("Error response data:", error.response.data)
          console.error("Error status:", error.response.status)
        }
        // Even if there's an error, try to initialize containers based on form data
        if (formData.num_six_meters > 0 || formData.num_twelve_meters > 0 || formData.num_abnormal > 0) {
          console.log("Error occurred, initializing containers based on form counts")
          initializeContainers()
        }
      } finally {
        setIsContainerLoading(false)
      }
    }

    loadContainers()
  }, [instructionId, formData.num_six_meters, formData.num_twelve_meters, formData.num_abnormal, containers])

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

  // First useEffect: Fetch clients and shipment types on initial load
  useEffect(() => {
    console.log("Initial data fetch started")

    const fetchInitialData = async () => {
      try {
        await Promise.all([fetchClients(), fetchShipmentTypes()])

        // If we have an instructionId and no preserved data, fetch the instruction
        if (instructionId && !preservedFormData) {
          console.log("Calling fetchInstructionData with ID:", instructionId)
          await fetchInstructionData(instructionId)
        } else if (preservedFormData) {
          // If we have preserved data, update the import state
          if (preservedFormData.shipmentTypeName) {
            setIsImport(preservedFormData.shipmentTypeName.toLowerCase() === "import")
          }
          // Update form data with preserved data
          setFormData((prev) => ({ ...prev, ...preservedFormData }))
        }
      } catch (error) {
        console.error("Error in initial data fetch:", error)
        setErrorModal({
          open: true,
          message: "Failed to load initial form data. Please try again.",
        })
      } finally {
        setIsLoading((prev) => ({ ...prev, instruction: false }))
      }
    }

    // Call the fetchInitialData function
    fetchInitialData()
  }, [instructionId, preservedFormData])

  // Update form data when preserved data changes
  useEffect(() => {
    if (preservedFormData) {
      console.log("Updating form with preserved data:", preservedFormData)

      // Format dates before setting form data
      const formattedData = {
        ...preservedFormData,
        pickupDate: formatDateForInput(preservedFormData.pickupDate),
        stackDate: formatDateForInput(preservedFormData.stackDate),
        deadline: preservedFormData.deadline ? formatDateForInput(preservedFormData.deadline) : "",
      }

      // Update form data
      if (containerCounts) {
        console.log("Updating form data with container counts:", containerCounts)
        const newFormData = {
          ...formattedData,
          num_six_meters: containerCounts["6m"] || 0,
          num_twelve_meters: containerCounts["12m"] || 0,
          num_abnormal: containerCounts["Abnormal"] || 0,
          rateWeight: "Container",
          weight: "",
        }
        setFormData(newFormData)
        // Update previous counts
        setPrevContainerCounts({
          num_six_meters: containerCounts["6m"] || 0,
          num_twelve_meters: containerCounts["12m"] || 0,
          num_abnormal: containerCounts["Abnormal"] || 0,
        })
      }

      // Update shipment type
      if (preservedFormData.shipmentTypeName) {
        setIsImport(preservedFormData.shipmentTypeName.toLowerCase() === "import")
      }

      // Update rate values from preserved data - check multiple possible sources
      if (preservedFormData.sixMeterRate !== undefined) {
        setFormData((prev) => ({ ...prev, rateper_6: preservedFormData.sixMeterRate }))
      } else if (preservedFormData.rateper_6 !== undefined) {
        setFormData((prev) => ({ ...prev, rateper_6: preservedFormData.rateper_6 }))
      }

      if (preservedFormData.twelveMeterRate !== undefined) {
        setFormData((prev) => ({ ...prev, rateper_12: preservedFormData.twelveMeterRate }))
      } else if (preservedFormData.rateper_12 !== undefined) {
        setFormData((prev) => ({ ...prev, rateper_12: preservedFormData.rateper_12 }))
      }

      if (preservedFormData.abnormalRate !== undefined) {
        setFormData((prev) => ({ ...prev, rateper_abnormal: preservedFormData.abnormalRate }))
      } else if (preservedFormData.rateper_abnormal !== undefined) {
        setFormData((prev) => ({ ...prev, rateper_abnormal: preservedFormData.rateper_abnormal }))
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
        (formData.rateper_6 === "" || formData.rateper_6 === "0" || Number(formData.rateper_6) === 0) &&
        selectedClient.driver_six_meter_rate
      ) {
        const newRate = selectedClient.driver_six_meter_rate.toString()
        setFormData((prev) => ({ ...prev, rateper_6: newRate }))
        console.log(`Auto-populated 6m rate: ${newRate} (count changed from 0 to ${formData.num_six_meters})`)
      }
    }

    // Handle 12-meter containers
    const twelveMeterChanged = prevContainerCounts.num_twelve_meters === 0 && formData.num_twelve_meters > 0
    if (twelveMeterChanged) {
      // Only populate if current rate is empty or zero
      if (
        (formData.rateper_12 === "" || formData.rateper_12 === "0" || Number(formData.rateper_12) === 0) &&
        selectedClient.driver_twelve_meter_rate
      ) {
        const newRate = selectedClient.driver_twelve_meter_rate.toString()
        setFormData((prev) => ({ ...prev, rateper_12: newRate }))
        console.log(`Auto-populated 12m rate: ${newRate} (count changed from 0 to ${formData.num_twelve_meters})`)
      }
    }

    // Clear rates when count goes to 0
    if (formData.num_six_meters === 0 && prevContainerCounts.num_six_meters > 0) {
      setFormData((prev) => ({ ...prev, rateper_6: "" }))
      console.log("Cleared 6m rate (count went to 0)")
    }

    if (formData.num_twelve_meters === 0 && prevContainerCounts.num_twelve_meters > 0) {
      setFormData((prev) => ({ ...prev, rateper_12: "" }))
      console.log("Cleared 12m rate (count went to 0)")
    }

    if (formData.num_abnormal === 0 && prevContainerCounts.num_abnormal > 0) {
      setFormData((prev) => ({ ...prev, rateper_abnormal: "" }))
      console.log("Cleared abnormal rate (count went to 0)")
    }

    // Update previous counts for next comparison
    setPrevContainerCounts({
      num_six_meters: formData.num_six_meters,
      num_twelve_meters: formData.num_twelve_meters,
      num_abnormal: formData.num_abnormal,
    })
  }, [formData.num_six_meters, formData.num_twelve_meters, formData.num_abnormal, clients, formData.clientId])

  // Fetch instruction data by ID
  const fetchInstructionData = async (id) => {
    if (!id) {
      console.error("No instruction ID provided to fetchInstructionData")
      return
    }

    console.log("fetchInstructionData called with id:", id)
    setIsLoading((prev) => ({ ...prev, instruction: true }))
    try {
      console.log(`Fetching instruction data for ID: ${id}`)
      const response = await api.get(`/api/instructions/fc/instruction/${id}`)
      const data = response.data

      console.log("Instruction data received:", data)

      if (!data) {
        throw new Error("No data returned from server")
      }

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
        surchages: data.surchages || false,
        surcharge: data.surcharge || 0,
        pickupTime: data.pickuptime ? data.pickuptime.substring(0, 5) : "",
        pickupDate: formatDateForInput(data.pickupdate) || "",
        stackDate: formatDateForInput(data.stackdate) || "",
        deadline: data.deadline ? formatDateForInput(new Date(data.deadline).toLocaleDateString()) : "",
        fileRef: data.fileref || "",
        bookingRef: data.booking_ref || "",
        rateWeight: data.rateweight || "Container",
        weight: data.weight || "",
        num_six_meters: data.num_six_meters || 0,
        num_twelve_meters: data.num_twelve_meters || 0,
        num_abnormal: data.num_abnormal || 0,
        num_breakbulk: data.num_breakbulk || 0,
        vat: data.vat || 15,
        description: data.description || "",
        vesselName: data.vessel_name || "",
        unitRate: data.unitrate || 0,
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
        rateper_breakbulk: data.rateper_breakbulk || 0,
        status: data.status || "",
      }

      setFormData(newFormData)

      // Set initial previous counts for existing instruction
      setPrevContainerCounts({
        num_six_meters: data.num_six_meters || 0,
        num_twelve_meters: data.num_twelve_meters || 0,
        num_abnormal: data.num_abnormal || 0,
      })

      // Set individual rate state variables from the backend response
      setFormData((prev) => ({ ...prev, rateper_6: (data.rateper_6 || 0).toString() }))
      setFormData((prev) => ({ ...prev, rateper_12: (data.rateper_12 || 0).toString() }))
      setFormData((prev) => ({ ...prev, rateper_abnormal: (data.rateper_abnormal || 0).toString() }))
      setWeight("")

      // Process containers if they exist in the response
      if (data.containers && data.containers.length > 0) {
        console.log("Processing containers from instruction data:", data.containers)
        const containersList = data.containers.map((container, index) => ({
          id: container.containerkey || index + 1,
          containerKey: container.containerkey,
          containerNum: container.containernum || "",
          weight: container.weight !== null && container.weight !== undefined ? container.weight : null,
          containerType: container.container_type || "6m",
          cargoDescription: container.cargo_description || "",
        }))

        console.log("Setting containers from instruction data:", containersList)
        setContainers(containersList)
        setIsContainerDataModified(false)
      } else {
        console.log("No containers found in instruction data, initializing based on counts")
        initializeContainers()
      }
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

  // Second useEffect: Fetch starting points and destinations when clientId is available
  useEffect(() => {
    if (formData.clientId) {
      console.log("Client ID available, fetching starting points and destinations")
      fetchStartingPoints()

      // If we have a pickup value, use it to fetch destinations
      if (formData.pickup) {
        fetchDestinations(formData.pickup)
      }
    }
  }, [formData.clientId, formData.pickup])

  // Helper function to calculate total cost from individual rates
  const calculateTotalCostFromRates = (rate6, rate12, rateAbnormal, count6, count12, countAbnormal) => {
    return rate6 * count6 + rate12 * count12 + rateAbnormal * countAbnormal
  }

  const fetchClients = async () => {
    setIsLoading((prev) => ({ ...prev, clients: true }))
    try {
      console.log("Fetching active clients...")
      const response = await api.get("/api/instructions/active-clients")
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
      const response = await api.get("/api/instructions/shipment-types")
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
    if (!formData.clientId) {
      console.log("No client ID available to fetch starting points")
      setStartingPoints([])
      setIsLoading((prev) => ({ ...prev, startingPoints: false }))
      return
    }

    setIsLoading((prev) => ({ ...prev, startingPoints: true }))
    try {
      console.log(`Fetching starting points for client ${formData.clientId}...`)
      const response = await api.get(`/api/instructions/client/${formData.clientId}/starting-points`)
      console.log("Starting points data received:", response.data)

      // Ensure we have an array of objects with the correct structure
      const formattedStartingPoints = Array.isArray(response.data)
        ? response.data
            .map((point, index) => ({
              id: point.id || `point-${index}`,
              startingpoint: point.starting_point || point.startingpoint || String(point),
            }))
            .filter((point) => point.startingpoint) // Filter out any null/undefined values
        : []

      console.log("Formatted starting points:", formattedStartingPoints)

      setStartingPoints(formattedStartingPoints)

      // If there's only one starting point, select it by default
      if (formattedStartingPoints.length === 1 && !formData.pickup) {
        setFormData((prev) => ({
          ...prev,
          pickup: formattedStartingPoints[0].startingpoint,
        }))
      }
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

  const fetchDestinations = async (startingPoint) => {
    if (!startingPoint) {
      setDestinations([])
      return
    }
    if (!formData.clientId || !startingPoint) {
      console.log("No client ID or starting point available to fetch destinations")
      setDestinations([])
      setIsLoading((prev) => ({ ...prev, destinations: false }))
      return
    }

    setIsLoading((prev) => ({ ...prev, destinations: true }))
    try {
      console.log(`Fetching destinations for client ${formData.clientId} and starting point ${startingPoint}...`)
      const response = await api.get(
        `/api/instructions/client/${formData.clientId}/destinations/${encodeURIComponent(startingPoint)}`,
      )
      console.log("Destinations data received:", response.data)

      // Ensure we have an array of objects with the correct structure
      const formattedDestinations = Array.isArray(response.data)
        ? response.data.map((dest) => ({
            id: dest.id || dest.destination,
            destination: dest.destination || String(dest),
          }))
        : []

      setDestinations(formattedDestinations)

      // If there's only one destination, select it by default
      if (formattedDestinations.length === 1 && !formData.dropoff) {
        setFormData((prev) => ({
          ...prev,
          dropoff: formattedDestinations[0].destination,
        }))
      }
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
    const isCrossHaul = shipmentTypeName.toLowerCase() === "cross-haul"

    setIsImport(isImportType)
    setFormData({
      ...formData,
      shipmentTypeId,
      shipmentTypeName,
    })
    setFieldErrors((prev) => ({ ...prev, shipmentTypeId: "" }))
  }

  // Check if shipment type is Cross-haul
  const isCrossHaulShipment = () => {
    const selectedShipmentType = shipmentTypes.find((type) => type.shipkey.toString() === formData.shipmentTypeId)
    return selectedShipmentType && selectedShipmentType.shipmenttype.toLowerCase() === "cross-haul"
  }

  // Format date from any format to YYYY-MM-DD for input[type="date"]
  const formatDateForInput = (dateString) => {
    if (!dateString) return ""

    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString
    }

    // Handle MM/DD/YYYY format
    if (dateString.includes("/")) {
      const [month, day, year] = dateString.split("/")
      if (year && month && day) {
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
      }
    }

    // Try to parse as Date object if not in expected format
    try {
      const date = new Date(dateString)
      if (!isNaN(date.getTime())) {
        return date.toISOString().split("T")[0]
      }
    } catch (e) {
      console.error("Error formatting date:", e)
    }

    return dateString // Return original if can't parse
  }

  // Fetch rates based on pickup and dropoff locations - always update rates
  const fetchRates = async (pickupLocation, dropoffLocation = null) => {
    if (!formData.clientId || !pickupLocation) return

    console.log("Fetching rates for client:", formData.clientId, "pickup:", pickupLocation, "dropoff:", dropoffLocation)

    try {
      let destinationToUse = dropoffLocation

      // If no dropoff provided, get the default destination for this client and pickup location
      if (!destinationToUse) {
        const destinations = await api.get(
          `/api/instructions/client/${formData.clientId}/destinations/${encodeURIComponent(pickupLocation)}`,
        )
        destinationToUse = destinations.data?.[0]?.destination

        if (!destinationToUse) {
          console.log("No destination found for pickup location:", pickupLocation)
          return
        }
      }

      console.log("Using destination:", destinationToUse)

      // Fetch rates with both start and destination using the correct endpoint
      const response = await api.get(`/api/instructions/client/${formData.clientId}/rates`, {
        params: {
          start: pickupLocation,
          destination: destinationToUse,
        },
      })

      console.log("Rates API response:", response.data)

      if (response.data) {
        // Handle both array and object responses
        const rateData = Array.isArray(response.data) ? response.data[0] : response.data

        if (rateData) {
          // Try to get rates with different possible property names
          const rate6m = rateData.rateper_6 || rateData["6m_rate"] || rateData.sixMeterRate || 0
          const rate12m = rateData.rateper_12 || rateData["12m_rate"] || rateData.twelveMeterRate || 0
          const abnormalRate = rateData.rateper_abnormal || rateData.abnormalRate || 0
          const surcharge = rateData.surcharge || rateData.surchages || 0

          console.log("Updating rates (always override):", { rate6m, rate12m, abnormalRate, surcharge })

          // Always update rates regardless of current values
          setFormData((prev) => {
            const updatedData = {
              ...prev,
              rateper_6: rate6m,
              rateper_12: rate12m,
              rateper_abnormal: abnormalRate,
              surcharge: surcharge,
            }

            // Recalculate total cost with new rates
            const totalCost =
              (updatedData.num_six_meters || 0) * rate6m +
              (updatedData.num_twelve_meters || 0) * rate12m +
              (updatedData.num_abnormal || 0) * abnormalRate +
              (updatedData.num_breakbulk || 0) * (updatedData.rateper_breakbulk || 0)

            updatedData.total_cost = totalCost

            return updatedData
          })

          // Show user feedback that rates were updated
          setRateUpdateMessage("Rates updated based on selected route")
          setTimeout(() => setRateUpdateMessage(""), 3000)
        }
      }
    } catch (error) {
      console.error("Error fetching rates:", error)
      console.error("Error details:", error.response?.data || error.message)

      // Show error message to user
      setErrorModal({
        isOpen: true,
        message: "Failed to fetch rates for selected route. Please check your selection or try again.",
      })
    }
  }

  const handleDropoffChange = async (e) => {
    const dropoffLocation = e.target.value

    // Update the dropoff location in form data
    setFormData((prev) => ({
      ...prev,
      dropoff: dropoffLocation,
    }))

    // Clear field error
    clearFieldError("dropoff")

    // Fetch new rates for the current pickup and new dropoff combination
    if (formData.pickup && dropoffLocation) {
      await fetchRates(formData.pickup, dropoffLocation)
    }
  }

  const handlePickupChange = async (e) => {
    const pickupLocation = e.target.value

    // Update the pickup location in form data
    setFormData((prev) => ({
      ...prev,
      pickup: pickupLocation,
      dropoff: "", // Clear the dropoff when pickup changes
    }))

    // Clear field error
    clearFieldError("pickup")

    // Fetch new destinations and rates for the selected pickup location
    await Promise.all([
      fetchDestinations(pickupLocation),
      fetchRates(pickupLocation), // This will get default destination
    ])
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    let processedValue = type === "checkbox" ? checked : value

    // Handle date inputs
    if (type === "date") {
      processedValue = formatDateForInput(value)
    }

    // Handle special field types
    if (name === "imoNo") {
      processedValue = value.replace(/[^0-9]/g, "").slice(0, 15)
    } else if (name === "flagReg") {
      processedValue = value.replace(/[^a-zA-Z\s\-']/g, "")
    }

    // Update form data
    setFormData((prev) => ({
      ...prev,
      [name]: processedValue,
    }))

    // Clear field error when user starts typing
    clearFieldError(name)
  }

  const handleNumericInputChange = (e) => {
    const { name, value } = e.target

    if (
      name === "num_six_meters" ||
      name === "num_twelve_meters" ||
      name === "num_abnormal" ||
      name === "num_breakbulk"
    ) {
      const numValue = Number.parseInt(value)
      const validValue = isNaN(numValue) ? 0 : Math.max(0, numValue)
      const prevValue = formData[name]
      const isIncreasing = validValue > prevValue
      const difference = Math.abs(validValue - prevValue)

      // Update the form data
      const updatedFormData = {
        ...formData,
        [name]: validValue,
      }
      setFormData(updatedFormData)

      // Update the containers based on the count change
      let containerType
      if (name === "num_six_meters") containerType = "6m"
      else if (name === "num_twelve_meters") containerType = "12m"
      else if (name === "num_abnormal") containerType = "Abnormal"
      else if (name === "num_breakbulk") containerType = "BreakBulk"

      if (containerType) {
        // Update containers directly
        if (isIncreasing) {
          // Add new containers
          const newContainers = []
          const nextId = containers.length > 0 ? Math.max(...containers.map((c) => c.id)) + 1 : 1

          for (let i = 0; i < difference; i++) {
            newContainers.push({
              id: nextId + i,
              containerKey: null,
              containerNum: "",
              weight: isImport ? "" : null,
              containerType: containerType,
              cargoDescription: "",
            })
          }

          setContainers([...containers, ...newContainers])
          setIsContainerDataModified(true)
        } else {
          // Remove containers of the specified type (most recently added first)
          const containersOfType = containers.filter((c) => c.containerType === containerType)
          const containersToRemove = containersOfType.slice(containersOfType.length - difference)
          const updatedContainers = containers.filter((c) => !containersToRemove.includes(c))

          setContainers(updatedContainers)
          setIsContainerDataModified(true)
        }

        // Also update preserved containers for consistency
        if (preservedContainers) {
          updatePreservedContainers(containerType, isIncreasing, difference)
        }
      }

      // Calculate total cost using individual rates
      const sixRate = Number(formData.rateper_6 || 0)
      const twelveRate = Number(formData.rateper_12 || 0)
      const abnormalRateNum = Number(formData.rateper_abnormal || 0)
      const breakBulkRate = Number(formData.rateper_breakbulk || 0)

      const totalCost =
        (name === "num_six_meters" ? validValue : updatedFormData.num_six_meters) * sixRate +
        (name === "num_twelve_meters" ? validValue : updatedFormData.num_twelve_meters) * twelveRate +
        (name === "num_abnormal" ? validValue : updatedFormData.num_abnormal) * abnormalRateNum +
        (name === "num_breakbulk" ? validValue : updatedFormData.num_breakbulk || 0) * breakBulkRate

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
        deadline:
          formData.deadline && new Date(formData.deadline) <= new Date(value) <= new Date(value)
            ? ""
            : formData.deadline,
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

  const handleRateChange = (e) => {
    const { name, value } = e.target
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      // Update the rate in form data
      const updatedFormData = {
        ...formData,
        [name]: value === "" ? "" : Number(value) || 0,
      }

      // Recalculate total cost
      const sixRate = Number(updatedFormData.rateper_6 || 0)
      const twelveRate = Number(updatedFormData.rateper_12 || 0)
      const abnormalRateNum = Number(updatedFormData.rateper_abnormal || 0)
      const breakBulkRate = Number(updatedFormData.rateper_breakbulk || 0)

      updatedFormData.total_cost =
        (updatedFormData.num_six_meters || 0) * sixRate +
        (updatedFormData.num_twelve_meters || 0) * twelveRate +
        (updatedFormData.num_abnormal || 0) * abnormalRateNum +
        (updatedFormData.num_breakbulk || 0) * breakBulkRate

      setFormData(updatedFormData)
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
      num_breakbulk: "BreakBulk",
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
      const containersToRemove = containersOfType.slice(containersOfType.length - difference)
      const updatedContainers = preservedContainers.filter((c) => !containersToRemove.includes(c))
      setPreservedContainers(updatedContainers)
    }
  }

  const handleContainerCountChange = (type, value) => {
    const numValue = Number.parseInt(value)
    const validValue = isNaN(numValue) ? 0 : Math.max(0, numValue)
    const prevValue = formData[type]
    const isIncreasing = validValue > prevValue
    const difference = Math.abs(validValue - prevValue)

    // Update the form data
    const updatedFormData = {
      ...formData,
      [type]: validValue,
    }

    // Calculate total cost using individual rates
    const sixRate = Number(formData.rateper_6 || 0)
    const twelveRate = Number(formData.rateper_12 || 0)
    const abnormalRateNum = Number(formData.rateper_abnormal || 0)
    const breakBulkRate = Number(formData.rateper_breakbulk || 0)

    const totalCost =
      (type === "num_six_meters" ? validValue : updatedFormData.num_six_meters) * sixRate +
      (type === "num_twelve_meters" ? validValue : updatedFormData.num_twelve_meters) * twelveRate +
      (type === "num_abnormal" ? validValue : updatedFormData.num_abnormal) * abnormalRateNum +
      (type === "num_breakbulk" ? validValue : updatedFormData.num_breakbulk || 0) * breakBulkRate

    updatedFormData.total_cost = totalCost

    console.log(`Container count updated - ${type}: ${validValue}`)
    setFormData(updatedFormData)
    updatePreservedContainers(type, isIncreasing, difference)
    setFieldErrors((prev) => ({ ...prev, containers: "" }))
  }

  const validateForm = () => {
    console.log("validateForm called")
    const isCrossHaul = isCrossHaulShipment()

    const requiredFields = [
      "clientId",
      "shipmentTypeId",
      "task",
      "pickup",
      "dropoff",
      "pickupTime",
      "pickupDate",
      "deadline",
      "bookingRef",
      "fileRef",
      "description",
    ]

    // Add vessel name and stack date as required only if not cross-haul
    if (!isCrossHaul) {
      requiredFields.push("vesselName", "stackDate")
    }

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
      if (formData.rateper_6 === "" || formData.rateper_6 === "0" || Number(formData.rateper_6) === 0) {
        errors.rateper_6 = "Rate is required when containers are present"
        isValid = false
      } else if (Number(formData.rateper_6) <= 0) {
        errors.rateper_6 = "Rate must be a positive number"
        isValid = false
      }
    }

    if (formData.num_twelve_meters > 0) {
      if (formData.rateper_12 === "" || formData.rateper_12 === "0" || Number(formData.rateper_12) === 0) {
        errors.rateper_12 = "Rate is required when containers are present"
        isValid = false
      } else if (Number(formData.rateper_12) <= 0) {
        errors.rateper_12 = "Rate must be a positive number"
        isValid = false
      }
    }

    if (formData.num_abnormal > 0) {
      if (
        formData.rateper_abnormal === "" ||
        formData.rateper_abnormal === "0" ||
        Number(formData.rateper_abnormal) === 0
      ) {
        errors.rateper_abnormal = "Rate is required when containers are present"
        isValid = false
      } else if (Number(formData.rateper_abnormal) <= 0) {
        errors.rateper_abnormal = "Rate must be a positive number"
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
      const sixRate = Number(formData.rateper_6 || 0)
      const twelveRate = Number(formData.rateper_12 || 0)
      const abnormalRateNum = Number(formData.rateper_abnormal || 0)
      const breakBulkRate = Number(formData.rateper_breakbulk || 0)

      const totalCost =
        formData.num_six_meters * sixRate +
        formData.num_twelve_meters * twelveRate +
        formData.num_abnormal * abnormalRateNum +
        formData.num_breakbulk * breakBulkRate

      const totalContainers =
        formData.num_six_meters + formData.num_twelve_meters + formData.num_abnormal + formData.num_breakbulk

      // IMPROVED: Create comprehensive form data with all current values
      const updatedFormData = {
        ...formData,
        // Rate fields for display
        rateper_6: sixRate.toString(),
        rateper_12: twelveRate.toString(),
        rateper_abnormal: abnormalRateNum.toString(),
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

  const readOnlyStyle = {
    backgroundColor: "#f8f9fa",
    cursor: "not-allowed",
    color: "#6c757d",
    border: "1px solid #e9ecef",
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

  // Loading state check that includes all required data
  const isLoadingComplete =
    !isLoading.clients &&
    !isLoading.shipmentTypes &&
    !isLoading.startingPoints &&
    !isLoading.destinations &&
    !isLoading.instruction &&
    Object.keys(formData).length > 0 // Ensure formData is initialized

  // Debug log for loading states
  console.log("Loading states:", {
    clients: isLoading.clients,
    shipmentTypes: isLoading.shipmentTypes,
    startingPoints: isLoading.startingPoints,
    destinations: isLoading.destinations,
    instruction: isLoading.instruction,
    formDataKeys: Object.keys(formData),
    isLoadingComplete,
  })

  // Ensure we have all required data before rendering the form
  if (!isLoadingComplete) {
    return (
      <div style={{ textAlign: "center", padding: "20px" }}>
        <p>Loading data...</p>
      </div>
    )
  }

  // Check if we have all required data
  console.log("Data availability check:", {
    clients: clients.length,
    shipmentTypes: shipmentTypes.length,
    startingPoints: startingPoints.length,
    destinations: destinations.length,
  })

  if (clients.length === 0 || shipmentTypes.length === 0 || startingPoints.length === 0 || destinations.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "20px" }}>
        <p>Failed to load required data. Please try again.</p>
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
    )
  }

  // Log form data before render
  console.log("Rendering with formData:", formData)
  console.log(
    "Client options:",
    clients.map((c) => ({ id: c.m5clientkey, name: c.companyname })),
  )
  console.log("Current client selection:", formData.clientId)

  return (
    <div className="controller-instructions-root">
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
        <div className="controller-instructions-form-container" style={{ maxWidth: "1200px" }}>
          {isReadOnly && (
            <div
              style={{
                backgroundColor: "#fff3cd",
                border: "1px solid #ffeaa7",
                borderRadius: "4px",
                padding: "12px",
                marginBottom: "20px",
                textAlign: "center",
                color: "#856404",
                fontWeight: "bold",
              }}
            >
              ⚠️ This instruction is {formData.status} and is in read-only mode
            </div>
          )}
          <div className="controller-instructions-form-section controller-instructions-client-info-section">
            <div className="controller-instructions-form-row">
              <div className="controller-instructions-form-field">
                <label>Client</label>
                <div className="controller-instructions-select-wrapper" ref={fieldRefs.clientId}>
                  <select
                    style={isReadOnly ? readOnlyStyle : nonEditableStyle}
                    className={`dropdown ${fieldErrors.clientId ? "controller-instructions-error-field" : ""}`}
                    name="clientId"
                    value={formData.clientId || ""}
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
                  style={isReadOnly ? readOnlyStyle : nonEditableStyle}
                  value={formData.representative || ""}
                  readOnly
                  placeholder="Autoload representative"
                  name="representative"
                  onChange={handleInputChange}
                  disabled={true}
                />
                <ErrorTooltip message={fieldErrors.representative} />
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
                  style={isReadOnly ? readOnlyStyle : nonEditableStyle}
                  disabled={isReadOnly}
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
                  style={isReadOnly ? readOnlyStyle : nonEditableStyle}
                  disabled={isReadOnly}
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
                    disabled={isReadOnly}
                    style={isReadOnly ? readOnlyStyle : {}}
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
                    disabled={isReadOnly}
                    style={isReadOnly ? readOnlyStyle : {}}
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
                          onChange={(e) => handleNumericInputChange(e)}
                          disabled={formData.rateWeight !== "Container" || isReadOnly}
                          style={isReadOnly ? readOnlyStyle : {}}
                        />
                        <div
                          className="controller-instructions-input-wrapper controller-instructions-rate-input"
                          ref={fieldRefs.rateper_6}
                        >
                          <input
                            type="text"
                            className={`controller-instructions-form-input ${fieldErrors.rateper_6 ? "controller-instructions-error-field" : ""}`}
                            placeholder="Rate"
                            value={formData.rateper_6 || ""}
                            name="rateper_6"
                            onChange={handleRateChange}
                            disabled={formData.rateWeight !== "Container" || isReadOnly}
                            style={isReadOnly ? readOnlyStyle : {}}
                          />
                          <ErrorTooltip message={fieldErrors.rateper_6} />
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
                          onChange={(e) => handleNumericInputChange(e)}
                          disabled={formData.rateWeight !== "Container" || isReadOnly}
                          style={isReadOnly ? readOnlyStyle : {}}
                        />
                        <div
                          className="controller-instructions-input-wrapper controller-instructions-rate-input"
                          ref={fieldRefs.rateper_12}
                        >
                          <input
                            type="text"
                            className={`controller-instructions-form-input ${fieldErrors.rateper_12 ? "controller-instructions-error-field" : ""}`}
                            placeholder="Rate"
                            value={formData.rateper_12 || ""}
                            name="rateper_12"
                            onChange={handleRateChange}
                            disabled={formData.rateWeight !== "Container" || isReadOnly}
                            style={isReadOnly ? readOnlyStyle : {}}
                          />
                          <ErrorTooltip message={fieldErrors.rateper_12} />
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
                          onChange={(e) => handleNumericInputChange(e)}
                          disabled={formData.rateWeight !== "Container" || isReadOnly}
                          style={isReadOnly ? readOnlyStyle : {}}
                        />
                        <div
                          className="controller-instructions-input-wrapper controller-instructions-rate-input"
                          ref={fieldRefs.rateper_abnormal}
                        >
                          <input
                            type="text"
                            className={`controller-instructions-form-input ${fieldErrors.rateper_abnormal ? "controller-instructions-error-field" : ""}`}
                            placeholder="Rate"
                            value={formData.rateper_abnormal || ""}
                            name="rateper_abnormal"
                            onChange={handleRateChange}
                            disabled={formData.rateWeight !== "Container" || isReadOnly}
                            style={isReadOnly ? readOnlyStyle : {}}
                          />
                          <ErrorTooltip message={fieldErrors.rateper_abnormal} />
                        </div>
                      </div>
                    </div>
                    {(formData.shipmentTypeId === "3" || formData.shipmentTypeName.toLowerCase() === "cross-haul") && (
                      <div className="controller-instructions-container-input">
                        <label>Break Bulk</label>
                        <div className="controller-instructions-container-rate-group">
                          <input
                            type="number"
                            className={fieldErrors.containers ? "controller-instructions-error-field" : ""}
                            value={formData.num_breakbulk || 0}
                            min="0"
                            name="num_breakbulk"
                            onChange={(e) => handleNumericInputChange(e)}
                            disabled={formData.rateWeight !== "Container" || isReadOnly}
                            style={isReadOnly ? readOnlyStyle : {}}
                          />
                          <div
                            className="controller-instructions-input-wrapper controller-instructions-rate-input"
                            ref={fieldRefs.rateper_breakbulk}
                          >
                            <input
                              type="text"
                              className={`controller-instructions-form-input ${fieldErrors.rateper_breakbulk ? "controller-instructions-error-field" : ""}`}
                              placeholder="Rate"
                              value={formData.rateper_breakbulk || ""}
                              name="rateper_breakbulk"
                              onChange={handleRateChange}
                              disabled={formData.rateWeight !== "Container" || isReadOnly}
                              style={isReadOnly ? readOnlyStyle : {}}
                            />
                            <ErrorTooltip message={fieldErrors.rateper_breakbulk} />
                          </div>
                        </div>
                      </div>
                    )}
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
                          disabled={isReadOnly}
                        />
                        <span className="controller-instructions-checkmark"></span>
                        Hazardous Materials
                      </label>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <label className="controller-instructions-checkbox-container" style={{ margin: "5px 0" }}>
                          <input
                            type="checkbox"
                            name="surchages"
                            checked={formData.surchages || false}
                            onChange={handleInputChange}
                            disabled={isReadOnly}
                          />
                          <span className="controller-instructions-checkmark"></span>
                          Add Surcharges
                        </label>
                        {formData.surchages && (
                          <div
                            className="controller-instructions-input-wrapper"
                            style={{ width: "150px", marginLeft: "10px" }}
                          >
                            <input
                              type="number"
                              className="controller-instructions-form-input"
                              name="surcharge"
                              value={formData.surcharge || ""}
                              onChange={handleInputChange}
                              min="0"
                              step="0.01"
                              placeholder="Amount"
                              style={{ width: "100%", padding: "4px 8px", ...(isReadOnly ? readOnlyStyle : {}) }}
                              disabled={isReadOnly}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Main form section */}
                <div
                  className="controller-instructions-booking-vertical-group"
                  style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px", maxWidth: "220px" }}
                >
                  <div className="controller-instructions-form-field">
                    <label>Shipment Type</label>
                    <div className="controller-instructions-select-wrapper" ref={fieldRefs.shipmentTypeId}>
                      <select
                        className={`controller-instructions-dropdown ${fieldErrors.shipmentTypeId ? "controller-instructions-error-field" : ""}`}
                        name="shipmentTypeId"
                        value={formData.shipmentTypeId}
                        onChange={handleShipmentTypeChange}
                        disabled={isReadOnly}
                        style={isReadOnly ? readOnlyStyle : {}}
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
                    <label>Pickup Location</label>
                    <div className="controller-instructions-select-wrapper" ref={fieldRefs.pickup}>
                      <select
                        className={`controller-instructions-dropdown ${fieldErrors.pickup ? "controller-instructions-error-field" : ""}`}
                        name="pickup"
                        value={formData.pickup || ""}
                        onChange={handlePickupChange}
                        disabled={isReadOnly}
                        style={isReadOnly ? readOnlyStyle : {}}
                      >
                        <option value="" disabled>
                          Select Pickup
                        </option>
                        {startingPoints.map((point) => (
                          <option key={point.id} value={point.startingpoint}>
                            {point.startingpoint}
                          </option>
                        ))}
                      </select>
                      <ErrorTooltip message={fieldErrors.pickup} />
                    </div>
                  </div>
                  <div className="controller-instructions-form-field">
                    <label>Dropoff Location</label>
                    <div className="controller-instructions-select-wrapper" ref={fieldRefs.dropoff}>
                      <select
                        className={`controller-instructions-dropdown ${fieldErrors.dropoff ? "controller-instructions-error-field" : ""}`}
                        name="dropoff"
                        value={formData.dropoff || ""}
                        onChange={handleDropoffChange}
                        disabled={isReadOnly}
                        style={isReadOnly ? readOnlyStyle : {}}
                      >
                        <option value="" disabled>
                          Select Dropoff
                        </option>
                        {destinations.map((dest) => (
                          <option key={dest.id} value={dest.destination}>
                            {dest.destination}
                          </option>
                        ))}
                      </select>
                      <ErrorTooltip message={fieldErrors.dropoff} />
                    </div>
                  </div>
                  {/* This surchages section has been moved to be next to the checkbox */}

                  {/* Compact Rates per dropdown and input fields in one row */}
                  <div className="controller-instructions-form-field">
                    <label>Unit per</label>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "15px", width: "100%" }}>
                      {/* Unit per dropdown */}
                      <div
                        className="controller-instructions-select-wrapper"
                        style={{ minWidth: "100px", marginTop: "5px" }}
                      >
                        <select
                          className="controller-instructions-dropdown"
                          name="rateWeight"
                          value={formData.rateWeight || "Container"}
                          onChange={handleInputChange}
                          style={{ width: "100%", padding: "4px 8px", ...(isReadOnly ? readOnlyStyle : {}) }}
                          ref={fieldRefs.rateWeight}
                          disabled={isReadOnly}
                        >
                          <option value="kg">kg</option>
                          <option value="m³">m³</option>
                          <option value="ton">ton</option>
                          <option value="Container">Container</option>
                        </select>
                      </div>

                      {/* Rate per unit and weight textboxes */}
                      {(formData.rateWeight === "kg" ||
                        formData.rateWeight === "m³" ||
                        formData.rateWeight === "ton") && (
                        <div
                          style={{
                            display: "flex",
                            gap: "15px",
                            width: "100%",
                            marginTop: "48px",
                            marginLeft: "-113px",
                          }}
                        >
                          {/* Unit Rate Field */}
                          <div className="controller-instructions-form-field" style={{ flex: 1, minWidth: "150px" }}>
                            <label>{`Rate per ${formData.rateWeight}`}</label>
                            <div
                              className="controller-instructions-input-wrapper"
                              ref={fieldRefs.unitRate}
                              style={{ width: "100%" }}
                            >
                              <input
                                type="text"
                                className={`controller-instructions-form-input ${fieldErrors.unitRate ? "controller-instructions-error-field" : ""}`}
                                name="unitRate"
                                value={formData.unitRate || ""}
                                onChange={(e) => {
                                  const value = e.target.value
                                  if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
                                    handleInputChange(e)
                                  }
                                }}
                                disabled={isReadOnly}
                                style={isReadOnly ? readOnlyStyle : {}}
                              />
                              <ErrorTooltip message={fieldErrors.unitRate} />
                            </div>
                          </div>

                          {/* Weight Field */}
                          <div className="controller-instructions-form-field" style={{ flex: 1, minWidth: "150px" }}>
                            <label>{`Weight (${formData.rateWeight})`}</label>
                            <div
                              className="controller-instructions-input-wrapper"
                              ref={fieldRefs.weight}
                              style={{ width: "100%" }}
                            >
                              <input
                                type="text"
                                className={`controller-instructions-form-input ${fieldErrors.weight ? "controller-instructions-error-field" : ""}`}
                                name="weight"
                                value={formData.weight || ""}
                                onChange={(e) => {
                                  const value = e.target.value
                                  if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
                                    handleInputChange(e)
                                  }
                                }}
                                disabled={isReadOnly}
                                style={isReadOnly ? readOnlyStyle : {}}
                              />
                              <ErrorTooltip message={fieldErrors.quantity} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {/* End of main form section */}

                {/* Hazardous / Surcharge checkboxes moved below Rate Type */}
                <div className="controller-instructions-date-time-group">
                  <div className="controller-instructions-shipment-task-row" style={{ order: -1, marginBottom: "8px" }}>
                    <div className="controller-instructions-form-field controller-instructions-small-field">
                      <label>Booking Reference</label>
                      <div className="controller-instructions-input-wrapper" ref={fieldRefs.bookingRef}>
                        <input
                          type="text"
                          className={`controller-instructions-form-input ${fieldErrors.bookingRef ? "controller-instructions-error-field" : ""}`}
                          placeholder="Enter booking ref"
                          name="bookingRef"
                          value={formData.bookingRef}
                          onChange={handleInputChange}
                          disabled={isReadOnly}
                          style={isReadOnly ? readOnlyStyle : {}}
                        />
                        <ErrorTooltip message={fieldErrors.bookingRef} />
                      </div>
                    </div>
                    <div className="controller-instructions-form-field controller-instructions-small-field">
                      <label>File Ref</label>
                      <div className="controller-instructions-input-wrapper" ref={fieldRefs.fileRef}>
                        <input
                          type="text"
                          className={`controller-instructions-form-input ${fieldErrors.fileRef ? "controller-instructions-error-field" : ""}`}
                          placeholder="Enter file ref"
                          name="fileRef"
                          value={formData.fileRef}
                          onChange={handleInputChange}
                          disabled={isReadOnly}
                          style={isReadOnly ? readOnlyStyle : {}}
                        />
                        <ErrorTooltip message={fieldErrors.fileRef} />
                      </div>
                    </div>
                    {/* Booking / File / VAT inline with task */}
                    <div className="controller-instructions-booking-inline-row" style={{ display: "none" }}>
                      <div
                        className="controller-instructions-form-field controller-instructions-small-field"
                        style={{ flex: "0 1 160px" }}
                      >
                        <label>Booking Reference</label>
                        <div className="controller-instructions-input-wrapper">
                          <input
                            type="text"
                            className="controller-instructions-form-input"
                            placeholder="Enter booking ref"
                            name="bookingRef"
                            value={formData.bookingRef}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>
                      <div
                        className="controller-instructions-form-field controller-instructions-small-field"
                        style={{ flex: "0 1 160px" }}
                      >
                        <label>File Ref</label>
                        <div className="controller-instructions-input-wrapper">
                          <input
                            type="text"
                            className="controller-instructions-form-input"
                            placeholder="Enter file ref"
                            name="fileRef"
                            value={formData.fileRef}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>
                      <div
                        className="controller-instructions-form-field controller-instructions-small-field"
                        style={{ flex: "0 1 80px" }}
                      >
                        <label>VAT Rate %</label>
                        <div className="controller-instructions-input-wrapper">
                          <input
                            type="number"
                            className="controller-instructions-form-input"
                            name="vat"
                            value={formData.vat || 15}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                      </div>
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
                        disabled={isReadOnly}
                        style={isReadOnly ? readOnlyStyle : {}}
                      />
                      <ErrorTooltip message={fieldErrors.task} />
                    </div>
                  </div>
                  <div className="controller-instructions-form-field" style={{ maxWidth: "120px" }}>
                    <label>VAT Rate %</label>
                    <div className="controller-instructions-input-wrapper">
                      <input
                        type="number"
                        className="controller-instructions-form-input"
                        name="vat"
                        value={formData.vat || 15}
                        onChange={handleInputChange}
                        required
                        disabled={isReadOnly}
                        style={isReadOnly ? readOnlyStyle : {}}
                      />
                    </div>
                  </div>
                  {!isCrossHaulShipment() && (
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
                          disabled={isReadOnly}
                          style={isReadOnly ? readOnlyStyle : {}}
                        />
                        <ErrorTooltip message={fieldErrors.vesselName} />
                      </div>
                    </div>
                  )}
                  <div className="controller-instructions-form-field">
                    <label>Description</label>
                    <div className="controller-instructions-input-wrapper" ref={fieldRefs.description}>
                      <input
                        type="text"
                        className={`controller-instructions-form-input ${fieldErrors.description ? "controller-instructions-error-field" : ""}`}
                        placeholder="Enter description"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        disabled={isReadOnly}
                        style={isReadOnly ? readOnlyStyle : {}}
                      />
                      <ErrorTooltip message={fieldErrors.description} />
                    </div>
                  </div>
                </div>
                <div className="controller-instructions-date-time-group">
                  <div className="controller-instructions-form-field">
                    <label>Pickup Time</label>
                    <input
                      type="time"
                      className={`controller-instructions-form-input ${fieldErrors.pickupTime ? "controller-instructions-error-field" : ""}`}
                      name="pickupTime"
                      value={formData.pickupTime}
                      onChange={handleInputChange}
                      ref={fieldRefs.pickupTime}
                      disabled={isReadOnly}
                      style={isReadOnly ? readOnlyStyle : {}}
                    />
                    <ErrorTooltip message={fieldErrors.pickupTime} />
                  </div>
                  <div className="controller-instructions-form-field">
                    <label>Pickup Date</label>
                    <div className="controller-instructions-date-wrapper" ref={fieldRefs.pickupDate}>
                      <input
                        type="date"
                        className={`controller-instructions-form-input ${fieldErrors.pickupDate ? "controller-instructions-error-field" : ""}`}
                        name="pickupDate"
                        value={formData.pickupDate}
                        onChange={handleInputChange}
                        min={today}
                        ref={pickupDateRef}
                        disabled={isReadOnly}
                        style={isReadOnly ? readOnlyStyle : {}}
                      />
                      <ErrorTooltip message={fieldErrors.pickupDate} />
                    </div>
                  </div>
                  {!isCrossHaulShipment() && (
                    <div className="controller-instructions-form-field">
                      <label>{isImport ? "ETA Date" : "Stack Date"}</label>
                      <div className="controller-instructions-date-wrapper" ref={fieldRefs.stackDate}>
                        <input
                          type="date"
                          className={`controller-instructions-form-input ${fieldErrors.stackDate ? "controller-instructions-error-field" : ""}`}
                          name="stackDate"
                          value={formData.stackDate}
                          onChange={handleInputChange}
                          min={formData.pickupDate || today}
                          ref={etaDateRef}
                          disabled={isReadOnly}
                          style={isReadOnly ? readOnlyStyle : {}}
                        />
                        <ErrorTooltip message={fieldErrors.stackDate} />
                      </div>
                    </div>
                  )}
                  <div className="controller-instructions-form-field">
                    <label>Deadline</label>
                    <div className="controller-instructions-date-wrapper" ref={fieldRefs.deadline}>
                      <input
                        type="date"
                        className={`controller-instructions-form-input ${fieldErrors.deadline ? "controller-instructions-error-field" : ""}`}
                        name="deadline"
                        value={formData.deadline}
                        onChange={handleInputChange}
                        min={formData.pickupDate || today}
                        ref={deadlineDateRef}
                        disabled={isReadOnly}
                        style={isReadOnly ? readOnlyStyle : {}}
                      />
                      <ErrorTooltip message={fieldErrors.deadline} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Container Details Table */}
          {containers.length > 0 && (
            <div className="controller-instructions-form-section">
              <div className="controller-instructions-container-details-section">
                <h3>Container Details</h3>
                {(containerSuccessMessage || rateUpdateMessage) && (
                  <div className="controller-instructions-success-message">
                    {containerSuccessMessage || rateUpdateMessage}
                  </div>
                )}
                <div
                  className="controller-instructions-container-table-wrapper"
                  style={{
                    overflowX: "auto",
                    marginBottom: "20px",
                  }}
                >
                  <table
                    className="controller-instructions-container-table"
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      marginBottom: "10px",
                    }}
                  >
                    <thead>
                      <tr>
                        <th style={{ padding: "12px 8px", textAlign: "left", borderBottom: "2px solid #ddd" }}>
                          Container Type
                        </th>
                        <th style={{ padding: "12px 8px", textAlign: "left", borderBottom: "2px solid #ddd" }}>
                          Container Number
                        </th>
                        {isImport && (
                          <th style={{ padding: "12px 8px", textAlign: "left", borderBottom: "2px solid #ddd" }}>
                            Weight (kg)
                          </th>
                        )}
                        <th style={{ padding: "12px 8px", textAlign: "left", borderBottom: "2px solid #ddd" }}>
                          Cargo Description
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {containers.map((container) => (
                        <tr key={container.id}>
                          <td>{container.containerType}</td>
                          <td>
                            <div className="controller-instructions-input-wrapper">
                              <input
                                type="text"
                                className={`controller-instructions-form-input ${
                                  containerFieldErrors[`container-${container.id}`]
                                    ? "controller-instructions-error-field"
                                    : ""
                                }`}
                                value={container.containerNum}
                                onChange={(e) => handleContainerChange(container.id, "containerNum", e.target.value)}
                                placeholder="ABCD1234567"
                                maxLength={11}
                                disabled={isReadOnly}
                                style={isReadOnly ? readOnlyStyle : {}}
                              />
                              {containerFieldErrors[`container-${container.id}`] && (
                                <div
                                  className="controller-instructions-container-error-text"
                                  style={{
                                    color: "#e74c3c",
                                    fontSize: "12px",
                                    marginTop: "4px",
                                    fontWeight: "500",
                                    display: "block",
                                  }}
                                >
                                  {containerFieldErrors[`container-${container.id}`]}
                                </div>
                              )}
                            </div>
                          </td>
                          {isImport && (
                            <td>
                              <div className="controller-instructions-input-wrapper">
                                <input
                                  type="text"
                                  className={`controller-instructions-form-input ${
                                    containerFieldErrors[`weight-${container.id}`]
                                      ? "controller-instructions-error-field"
                                      : ""
                                  }`}
                                  value={container.weight === null ? "" : container.weight.toString()}
                                  onChange={(e) => handleContainerChange(container.id, "weight", e.target.value)}
                                  placeholder="0.00"
                                  disabled={isReadOnly}
                                  style={isReadOnly ? readOnlyStyle : {}}
                                />
                                {containerFieldErrors[`weight-${container.id}`] && (
                                  <div
                                    className="controller-instructions-container-error-text"
                                    style={{
                                      color: "#e74c3c",
                                      fontSize: "12px",
                                      marginTop: "4px",
                                      fontWeight: "500",
                                      display: "block",
                                    }}
                                  >
                                    {containerFieldErrors[`weight-${container.id}`]}
                                  </div>
                                )}
                              </div>
                            </td>
                          )}
                          <td>
                            <div className="controller-instructions-input-wrapper">
                              <input
                                type="text"
                                className="controller-instructions-form-input"
                                value={container.cargoDescription}
                                onChange={(e) =>
                                  handleContainerChange(container.id, "cargoDescription", e.target.value)
                                }
                                placeholder="Enter cargo description"
                                disabled={isReadOnly}
                                style={isReadOnly ? readOnlyStyle : {}}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {isContainerLoading && (
                  <div className="controller-instructions-loading-message">Updating containers...</div>
                )}
              </div>
            </div>
          )}
          {!isReadOnly && (
            <div className="controller-instructions-form-actions" style={{ display: "flex", justifyContent: "center" }}>
              <button
                className="controller-instructions-save-button"
                onClick={handleSaveChanges}
                style={{
                  backgroundColor: "#4a90e2",
                  color: "white",
                  padding: "12px 24px",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: "bold",
                }}
              >
                Save Changes
              </button>
            </div>
          )}

          {isReadOnly && (
            <div className="controller-instructions-form-actions" style={{ display: "flex", justifyContent: "center" }}>
              <div
                style={{
                  backgroundColor: "#6c757d",
                  color: "white",
                  padding: "12px 24px",
                  borderRadius: "4px",
                  fontSize: "16px",
                  fontWeight: "bold",
                  textAlign: "center",
                }}
              >
                This instruction is {formData.status} and cannot be edited
              </div>
            </div>
          )}
        </div>
        {/* Confirmation Modal */}
        {confirmationModal.isOpen && (
          <div
            className="controller-instructions-modal-overlay"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000,
            }}
          >
            <div
              className="controller-instructions-modal-content"
              style={{
                backgroundColor: "white",
                padding: "24px",
                borderRadius: "8px",
                maxWidth: "500px",
                width: "90%",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              }}
            >
              <h3 style={{ marginBottom: "16px", color: "#333" }}>Confirm Save</h3>
              <p style={{ marginBottom: "24px", lineHeight: "1.5", color: "#666" }}>{confirmationModal.message}</p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button
                  onClick={handleCancelSave}
                  style={{
                    padding: "8px 16px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    backgroundColor: "white",
                    color: "#666",
                    cursor: "pointer",
                  }}
                >
                  No, Let Me Edit
                </button>
                <button
                  onClick={handleConfirmSave}
                  style={{
                    padding: "8px 16px",
                    border: "none",
                    borderRadius: "4px",
                    backgroundColor: "#4a90e2",
                    color: "white",
                    cursor: "pointer",
                  }}
                >
                  Yes, Continue
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default FCcontrollerinstructions
