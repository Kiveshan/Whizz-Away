
"use client"

import { useState, useEffect, useRef } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import "../finance clerkpages/css/UpdateInstruction.css"

// Update the modal animation for a smoother appearance
const modalAnimation = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes scaleIn {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.2s ease-out forwards;
  }
  
  .animate-scaleIn {
    animation: scaleIn 0.3s ease-out forwards;
  }
  
  .modal-wrapper {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
  }
  
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(37, 99, 235, 0.9) 0%, rgba(79, 70, 229, 0.9) 100%);
    z-index: 40;
  }
  
  .modal-container {
    background: white;
    border-radius: 12px;
    width: 400px;
    max-width: 90vw;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    z-index: 50;
    overflow: hidden;
  }
  
  .modal-header {
    padding: 20px 24px 0;
  }
  
  .modal-title {
    font-size: 18px;
    font-weight: 600;
    color: #111827;
    margin-bottom: 8px;
  }
  
  .modal-description {
    font-size: 14px;
    color: #6B7280;
    margin-bottom: 16px;
  }
  
  .modal-body {
    padding: 0 24px 16px;
  }
  
  .modal-item {
    display: flex;
    align-items: flex-start;
    padding: 8px 0;
  }
  
  .modal-bullet {
    min-width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #3b82f6;
    margin-right: 12px;
    margin-top: 6px;
  }
  
  .modal-item-text {
    font-size: 14px;
    color: #374151;
  }
  
  .modal-footer {
    padding: 16px 24px 20px;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }
  
  .modal-btn {
    padding: 8px 16px;
    border-radius: 6px;
    font-weight: 500;
    font-size: 14px;
    transition: all 0.2s;
  }
  
  .modal-btn-secondary {
    background-color: #F3F4F6;
    color: #374151;
  }
  
  .modal-btn-secondary:hover {
    background-color: #E5E7EB;
  }
  
  .modal-btn-primary {
    background-color: #4F46E5;
    color: white;
  }
  
  .modal-btn-primary:hover {
    background-color: #4338CA;
  }

.toast-popup {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #4F46E5;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  animation: toastFadeIn 0.3s ease-out forwards, toastFadeOut 0.3s ease-in forwards 0.7s;
}

@keyframes toastFadeIn {
  from { opacity: 0; transform: translate(-50%, -20px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}

@keyframes toastFadeOut {
  from { opacity: 1; transform: translate(-50%, 0); }
  to { opacity: 0; transform: translate(-50%, -20px); }
}
`

// Add this debug function at the top of the component
const debugDriverData = (drivers) => {
  if (!drivers || drivers.length === 0) {
    console.log("No drivers to debug")
    return
  }

  console.log("Debugging driver data:")
  drivers.forEach((driver, index) => {
    console.log(`Driver ${index}:`)
    console.log(`  ID: ${driver.id} (${typeof driver.id})`)
    console.log(`  Driver ID: ${driver.driverid} (${typeof driver.driverid})`)
    console.log(`  Truck Reg: ${driver.truckregnumber} (${typeof driver.truckregnumber})`)
    console.log(`  Container: ${driver.containernumber} (${typeof driver.containernumber})`)
    console.log(`  Date: ${driver.date} (${typeof driver.date})`)
    console.log(`  Full Name: ${driver.full_name}`)
  })
}

const Plus = ({ onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center justify-center ${
      disabled ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"
    } text-white w-10 h-10 rounded-full transition-colors`}
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  </button>
)

function UpdateInstruction() {
  const navigate = useNavigate()
  const location = useLocation()
  const clientId = location.state?.clientId
  const instructionId = location.state?.instructionId || null
  const selectedLegIndex = location.state?.selectedLegIndex

  // Add a ref to track if we're coming from the documents page
  const isFromDocumentsPage = useRef(selectedLegIndex !== undefined)

  // Add a ref to the Add Driver button for positioning the modal
  const addDriverButtonRef = useRef(null)

  const [drivers, setDrivers] = useState([])
  const [legs, setLegs] = useState([])
  const [currentLagIndex, setCurrentLagIndex] = useState(null)
  const [formData, setFormData] = useState({
    startingPoint: "",
    driverRate: "",
    destination: "",
  })
  const [startingPoints, setStartingPoints] = useState([])
  const [destinations, setDestinations] = useState([])
  const [rateError, setRateError] = useState("")
  const [employeeDrivers, setEmployeeDrivers] = useState([])
  const [truckRegOptions, setTruckRegOptions] = useState([])
  const [containerOptions, setContainerOptions] = useState([])
  const [saving, setSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState("")
  const [existingDrivers, setExistingDrivers] = useState([])
  // Add a visual indicator for edited fields
  const [editedFields, setEditedFields] = useState({
    startingPoint: false,
    destination: false,
    driverRate: false,
    drivers: {}, // Change from array to object to track changes by driver ID
  })
  // Flag to track if initial data has been loaded
  const [initialDataLoaded, setInitialDataLoaded] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [shipmentType, setShipmentType] = useState(null)
  const [showMismatchModal, setShowMismatchModal] = useState(false)
  const [mismatchDetails, setMismatchDetails] = useState({ lastLegDestination: "", dropoff: "" })
  // New state for container validation
  const [showContainerModal, setShowContainerModal] = useState(false)
  const [containerValidationDetails, setContainerValidationDetails] = useState({
    missingContainers: [],
    dropoff: "",
  })
  const [instructionContainers, setInstructionContainers] = useState([])
  // New state for unsaved changes modal
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false)
  // Add state for missing fields modal
  const [showMissingFieldsModal, setShowMissingFieldsModal] = useState(false)
  const [missingFields, setMissingFields] = useState([])
  // New state for pickup validation
  const [showPickupMismatchModal, setShowPickupMismatchModal] = useState(false)
  const [pickupMismatchDetails, setPickupMismatchDetails] = useState({
    firstLegStartingPoint: "",
    pickup: "",
  })
  // Add state for no drivers modal
  const [showNoDriversModal, setShowNoDriversModal] = useState(false)
  // Add state for back button confirmation modal
  const [showBackConfirmModal, setShowBackConfirmModal] = useState(false)
  // Add state for driver removal confirmation modal
  const [showRemoveDriverModal, setShowRemoveDriverModal] = useState(false)
  const [driverToRemove, setDriverToRemove] = useState({ index: null, name: "" })
  // Add after the driverToRemove state
  const [showRemoveLegModal, setShowRemoveLegModal] = useState(false)
  const [legToRemove, setLegToRemove] = useState({ index: null, number: null, id: null })
  const [instructionStatus, setInstructionStatus] = useState("")
  // Add this state variable at the top with other state variables
  const [shouldHideAddLegButton, setShouldHideAddLegButton] = useState(false)

  // Add this state variable with the other state variables
  const [showDuplicateDriverModal, setShowDuplicateDriverModal] = useState(false)
  const [duplicateDriverInfo, setDuplicateDriverInfo] = useState(null)

  // Add this state for container already reached dropoff modal
  const [showContainerReachedModal, setShowContainerReachedModal] = useState(false)
  const [containerReachedDetails, setContainerReachedDetails] = useState({ containerNumber: "" })

  // Add a new state variable to track which legs have been saved
  // Add this after the other state variables (around line 200)
  const [savedLegs, setSavedLegs] = useState(new Set())

  // Improve the refreshLegData function to ensure data is properly refreshed
  const refreshLegData = async () => {
    if (instructionId) {
      try {
        console.log("Refreshing leg data for instruction:", instructionId)

        // Clear any cached data
        const response = await fetch(`http://localhost:5000/legs/${instructionId}?t=${Date.now()}`, {
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch legs: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        console.log("Refreshed legs data from server:", JSON.stringify(data, null, 2))

        if (data.length > 0) {
          // Transform the data to match our state structure
          const fetchedLegs = data.map((leg) => {
            return {
              id: leg.legkey,
              legnumber: leg.legnumber,
              startingPoint: leg.startingpoint,
              destination: leg.destination,
              driverRate: leg.driverrate ? leg.driverrate.toString() : "",
              drivers: leg.drivers || [],
            }
          })

          console.log("Transformed refreshed legs data:", JSON.stringify(fetchedLegs, null, 2))
          setLegs(fetchedLegs)

          // Update savedLegs with all legs that have valid IDs (not temporary IDs)
          const savedLegIndexes = new Set()
          fetchedLegs.forEach((leg, index) => {
            if (leg.id && !leg.id.toString().startsWith("temp-") && !leg.isNew) {
              savedLegIndexes.add(index)
            }
          })
          setSavedLegs(savedLegIndexes)
          console.log("Updated savedLegs:", Array.from(savedLegIndexes))

          // If we have a current leg selected, make sure its form data is updated
          if (currentLagIndex !== null && currentLagIndex < fetchedLegs.length) {
            const currentLeg = fetchedLegs[currentLagIndex]
            setFormData({
              startingPoint: currentLeg.startingPoint || "",
              driverRate: currentLeg.driverRate || "",
              destination: currentLeg.destination || "",
            })

            // If this leg has drivers, set them
            if (currentLeg.drivers && currentLeg.drivers.length > 0) {
              console.log("Setting drivers for refreshed leg:", currentLeg.drivers)
              setDrivers(currentLeg.drivers)
              debugDriverData(currentLeg.drivers)
            } else {
              setDrivers([])
            }
          }

          console.log("Leg data refreshed successfully")
        }
      } catch (error) {
        console.error("Error refreshing leg data:", error)
      }
    }
  }

  // Add this function to handle leg removal
  const handleRemoveLeg = async (legIndex, legId) => {
    // Only allow removing legs 2 and above
    if (legIndex === 0) {
      setSavedMessage("Cannot remove the first leg")
      setTimeout(() => setSavedMessage(""), 3000)
      return
    }

    // Set the leg to remove and show confirmation modal
    setLegToRemove({
      index: legIndex,
      number: legIndex + 1,
      id: legId,
    })
    setShowRemoveLegModal(true)
  }

  // Replace the useEffect that fetches legs with this updated version
  useEffect(() => {
    const fetchData = async () => {
      try {
        await fetchStartingPoints()
        await fetchDestinations()
        await fetchDrivers()
        await fetchTruckRegNums()
        await fetchShipmentType()

        // If we have an instructionId, fetch containers for this instruction
        if (instructionId) {
          await fetchContainersForInstruction(instructionId)
          await fetchLegsForInstruction(instructionId)
          setInitialDataLoaded(true)
        } else {
          // Fallback to all containers if no specific instruction
          await fetchAllContainers()
          setInitialDataLoaded(true)
        }
      } catch (error) {
        console.error("Error fetching initial data:", error)
        setInitialDataLoaded(true) // Set to true even on error to prevent infinite loading
      }
    }

    fetchData()

    // Reset the navigation state when component mounts
    return () => {
      isFromDocumentsPage.current = false
    }
  }, [instructionId]) // Only depend on instructionId

  // Add a useEffect to log driver data whenever it changes
  useEffect(() => {
    if (drivers && drivers.length > 0) {
      console.log("Current drivers state:", JSON.stringify(drivers, null, 2))

      // Check if all fields are properly populated in the form
      drivers.forEach((driver, index) => {
        console.log(`Driver ${index} form field values:`)
        console.log(`  Driver ID: ${driver.driverid || "empty"}`)
        console.log(`  Truck Reg: ${driver.truckregnumber || "empty"}`)
        console.log(`  Container: ${driver.containernumber || "empty"}`)
        console.log(`  Date: ${driver.date || "empty"}`)
      })
    }
  }, [drivers])

  // Replace the entire useEffect that handles the selectedLegIndex with this version
  useEffect(() => {
    // Only run this effect once when the component mounts with a selectedLegIndex
    if (initialDataLoaded && selectedLegIndex !== undefined && legs.length > 0) {
      console.log(`Selecting leg at index ${selectedLegIndex} after navigation`)

      // Make sure the selectedLegIndex is valid
      if (selectedLegIndex < legs.length) {
        // Force a clean state before selecting the leg
        setCurrentLagIndex(null)
        setDrivers([])

        // Use setTimeout to ensure this happens after the current render cycle
        setTimeout(() => {
          handleSelectLeg(selectedLegIndex)
        }, 0)
      } else {
        console.error(`Selected leg index ${selectedLegIndex} is out of bounds (max: ${legs.length - 1})`)
      }
    }
  }, [initialDataLoaded, legs.length, selectedLegIndex])

  // Replace the fetchLegsForInstruction function with this updated version
  useEffect(() => {
    const fetchInstructionDetails = async () => {
      // First check if isCompleted was passed in the location state
      if (location.state?.isCompleted !== undefined) {
        setIsCompleted(location.state.isCompleted)
      }
      // If not, fetch it from the API
      else if (instructionId) {
        try {
          const response = await fetch(`http://localhost:5000/instructions/${instructionId}`)
          if (!response.ok) {
            throw new Error("Failed to fetch instruction details")
          }
          const data = await response.json()
          setIsCompleted(data.is_completed || data.status === "Completed")
          setInstructionStatus(data.status)
        } catch (error) {
          console.error("Error fetching instruction details:", error)
        }
      }
    }

    fetchInstructionDetails()
  }, [instructionId, location.state])

  const fetchLegsForInstruction = async (instructionId) => {
    try {
      console.log(`Fetching legs for instruction ID: ${instructionId}`)
      const response = await fetch(`http://localhost:5000/legs/${instructionId}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch legs: ${response.status} ${response.statusText}`)
      }
      const data = await response.json()
      console.log("Legs data from server:", JSON.stringify(data, null, 2))

      if (data.length > 0) {
        // Transform the data to match our state structure
        const fetchedLegs = data.map((leg) => {
          // Check if leg has drivers and log them
          if (leg.drivers) {
            console.log(`Leg ${leg.legkey} has ${leg.drivers.length} drivers:`, JSON.stringify(leg.drivers, null, 2))
          } else {
            console.log(`Leg ${leg.legkey} has no drivers`)
          }

          // Ensure drivers array has all fields properly formatted as strings
          const normalizedDrivers = (leg.drivers || []).map((driver) => {
            // Create a properly formatted driver object with all fields as strings
            const normalizedDriver = {
              id: driver.id || Date.now() + Math.random(),
              driverid: driver.driverid ? driver.driverid.toString() : "",
              truckregnumber: driver.truckregnumber || "",
              containernumber: driver.containernumber !== null ? driver.containernumber.toString() : "",
              date: driver.date || "",
              driver_name: driver.driver_name || "",
              driver_surname: driver.driver_surname || "",
              full_name:
                driver.full_name ||
                (driver.driver_name && driver.driver_surname
                  ? `${driver.driver_name} ${driver.driver_surname}`
                  : driver.driverid
                    ? `Driver ID: ${driver.driverid}`
                    : "Unknown Driver"),
            }

            // Log the normalized driver data for debugging
            console.log(`Normalized driver:`, JSON.stringify(normalizedDriver, null, 2))
            console.log(`Driver ID type: ${typeof normalizedDriver.driverid}, value: ${normalizedDriver.driverid}`)
            console.log(
              `Truck Reg type: ${typeof normalizedDriver.truckregnumber}, value: ${normalizedDriver.truckregnumber}`,
            )
            console.log(
              `Container Number type: ${typeof normalizedDriver.containernumber}, value: ${normalizedDriver.containernumber}`,
            )

            return normalizedDriver
          })

          return {
            id: leg.legkey,
            legnumber: leg.legnumber,
            startingPoint: leg.startingpoint,
            destination: leg.destination,
            driverRate: leg.driverrate ? leg.driverrate.toString() : "",
            drivers: normalizedDrivers,
          }
        })

        console.log("Transformed legs data:", JSON.stringify(fetchedLegs, null, 2))
        setLegs(fetchedLegs)

        // Initialize savedLegs with all legs that have valid IDs (not temporary IDs)
        const savedLegIndexes = new Set()
        fetchedLegs.forEach((leg, index) => {
          if (leg.id && !leg.id.toString().startsWith("temp-") && !leg.isNew) {
            savedLegIndexes.add(index)
          }
        })
        setSavedLegs(savedLegIndexes)
        console.log("Initialized savedLegs:", Array.from(savedLegIndexes))

        // Store existing drivers for display
        const allDrivers = fetchedLegs.flatMap((leg) => leg.drivers || [])
        setExistingDrivers(allDrivers)
        console.log("All existing drivers:", JSON.stringify(allDrivers, null, 2))

        // If we have legs but no current leg selected, select the first one
        // Only do this if we don't have a selectedLegIndex from navigation
        if (fetchedLegs.length > 0 && currentLagIndex === null && selectedLegIndex === undefined) {
          setCurrentLagIndex(0)
          setFormData({
            startingPoint: fetchedLegs[0].startingPoint || "",
            driverRate: fetchedLegs[0].driverRate || "",
            destination: fetchedLegs[0].destination || "",
          })

          // If this leg has drivers, set them
          if (fetchedLegs[0].drivers && fetchedLegs[0].drivers.length > 0) {
            console.log("Setting drivers for first leg:", JSON.stringify(fetchedLegs[0].drivers, null, 2))
            setDrivers(fetchedLegs[0].drivers)
            debugDriverData(fetchedLegs[0].drivers)
          } else {
            console.log("No drivers for first leg, setting empty array")
            setDrivers([])
          }
        }
      }
    } catch (error) {
      console.error("Error fetching legs:", error)
    }
  }

  const fetchContainersForInstruction = async (instructionId) => {
    try {
      const response = await fetch(`http://localhost:5000/containers/instruction/${instructionId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch containers for instruction")
      }
      const data = await response.json()
      console.log("Containers for instruction:", data)

      // Store the full container data
      setInstructionContainers(data)

      // Extract just the container numbers for the dropdown
      setContainerOptions(data.map((container) => container.containernum.toString()))
    } catch (error) {
      console.error("Error fetching containers for instruction:", error)
      // Fallback to all containers
      fetchAllContainers()
    }
  }

  const fetchAllContainers = async () => {
    try {
      const response = await fetch(`http://localhost:5000/containers/numbers`)
      if (!response.ok) {
        throw new Error("Failed to fetch container numbers")
      }
      const data = await response.json()
      console.log("All container numbers:", data)
      setContainerOptions(data)
    } catch (error) {
      console.error("Error fetching container numbers:", error)
    }
  }

  const fetchDrivers = async () => {
    try {
      const response = await fetch(`http://localhost:5000/employees/drivers`)
      if (!response.ok) {
        throw new Error("Failed to fetch drivers")
      }
      const data = await response.json()
      console.log("Drivers from backend:", data)
      setEmployeeDrivers(data)
    } catch (error) {
      console.error("Error fetching drivers:", error)
    }
  }

  const fetchTruckRegNums = async () => {
    try {
      const response = await fetch(`http://localhost:5000/trucks/regnums`)
      if (!response.ok) {
        throw new Error("Failed to fetch truck registration numbers")
      }
      const data = await response.json()
      console.log("Truck registration numbers from backend:", data)
      setTruckRegOptions(data)
    } catch (error) {
      console.error("Error fetching truck registration numbers:", error)
    }
  }

  const fetchStartingPoints = async () => {
    try {
      const response = await fetch(`http://localhost:5000/starting-points`)
      if (!response.ok) {
        throw new Error("Failed to fetch starting points")
      }
      const data = await response.json()
      console.log("Starting points from backend:", data)
      setStartingPoints(data)
    } catch (error) {
      console.error("Error fetching starting points:", error)
    }
  }

  const fetchDestinations = async () => {
    try {
      const response = await fetch(`http://localhost:5000/destinations`)
      if (!response.ok) {
        throw new Error("Failed to fetch destinations")
      }
      const data = await response.json()
      console.log("Destinations from backend:", data)
      setDestinations(data)
    } catch (error) {
      console.error("Error fetching destinations:", error)
    }
  }

  const fetchRate = async (startingPoint, destination) => {
    if (!startingPoint || !destination) return

    try {
      setRateError("")

      const response = await fetch(
        `http://localhost:5000/rate?startingPoint=${encodeURIComponent(startingPoint)}&destination=${encodeURIComponent(destination)}`,
      )

      if (response.status === 404) {
        // No rate found for this combination
        setRateError("Driver rate not available for this route")

        setFormData((prev) => ({
          ...prev,
          driverRate: "",
        }))

        if (currentLagIndex !== null) {
          const updatedLegs = [...legs]
          updatedLegs[currentLagIndex] = {
            ...updatedLegs[currentLagIndex],
            driverRate: "",
          }
          setLegs(updatedLegs)
        }
        return
      }

      if (!response.ok) {
        throw new Error("Failed to fetch rate")
      }

      const data = await response.json()
      console.log("Rate from backend:", data)

      // Update the form data with the fetched rate
      setFormData((prev) => ({
        ...prev,
        driverRate: data.rate.toString(),
      }))

      // If we're editing a leg, update it with the new rate
      if (currentLagIndex !== null) {
        const updatedLegs = [...legs]
        updatedLegs[currentLagIndex] = {
          ...updatedLegs[currentLagIndex],
          driverRate: data.rate.toString(),
        }
        setLegs(updatedLegs)
      }
    } catch (error) {
      console.error("Error fetching rate:", error)
      setRateError("Error fetching driver rate")
    }
  }

  const addDriver = () => {
    if (currentLagIndex === null || isCompleted) return

    const newDriver = {
      id: Date.now(),
      driverid: "",
      truckregnumber: "",
      containernumber: "",
      date: "",
    }
    setDrivers((prevDrivers) => [...prevDrivers, newDriver])
  }

  // Update the handleAddLeg function to only modify local state, not save to database
  const handleAddLeg = () => {
    if (isCompleted) return

    // Check if there are unsaved changes in the current leg
    if (hasUnsavedChanges()) {
      // Show the unsaved changes modal
      setShowUnsavedChangesModal(true)
      return
    }

    // Save current leg data to local state if any
    if (currentLagIndex !== null) {
      const updatedLegs = [...legs]
      updatedLegs[currentLagIndex] = {
        ...updatedLegs[currentLagIndex],
        ...formData,
        drivers: [...drivers],
      }
      setLegs(updatedLegs)
    }

    // Create a new leg in local state only (not in database yet)
    const newLeg = {
      id: `temp-${Date.now()}`, // Temporary ID to indicate this is not saved to DB yet
      legnumber: legs.length + 1,
      startingPoint: "",
      driverRate: "",
      destination: "",
      drivers: [],
      isNew: true, // Flag to indicate this is a new leg not yet saved to database
    }

    setLegs([...legs, newLeg])
    setCurrentLagIndex(legs.length)
    setFormData({
      startingPoint: "",
      driverRate: "",
      destination: "",
    })
    setDrivers([])

    // Make sure the new leg is NOT in the savedLegs set
    setSavedLegs((prevSavedLegs) => {
      const newSavedLegs = new Set(prevSavedLegs)
      // Ensure the new leg index is not in the saved legs
      newSavedLegs.delete(legs.length)
      return newSavedLegs
    })

    // Show a message to remind user to save
    setSavedMessage("New leg added. Remember to click Save after entering details.")
    setTimeout(() => setSavedMessage(""), 6000)
  }

  // Replace the handleSelectLeg function with this updated version
  const handleSelectLeg = (index) => {
    // Save current leg data before switching (only if not completed)
    if (currentLagIndex !== null && !isCompleted) {
      const updatedLegs = [...legs]
      updatedLegs[currentLagIndex] = {
        ...updatedLegs[currentLagIndex],
        ...formData,
        drivers: [...drivers],
      }
      setLegs(updatedLegs)
    }

    // Load the selected leg data
    const selectedLeg = legs[index]
    setFormData({
      startingPoint: selectedLeg.startingPoint || "",
      driverRate: selectedLeg.driverRate || "",
      destination: selectedLeg.destination || "",
    })

    // Load drivers for this leg if any
    console.log("Selected leg:", JSON.stringify(selectedLeg, null, 2))
    console.log("Selected leg drivers:", JSON.stringify(selectedLeg.drivers, null, 2))

    // Ensure we're setting the drivers state correctly
    if (selectedLeg.drivers && selectedLeg.drivers.length > 0) {
      console.log("Setting drivers for selected leg:", JSON.stringify(selectedLeg.drivers, null, 2))

      // Make sure all driver entries have string values for their properties
      const normalizedDrivers = selectedLeg.drivers.map((driver) => {
        // Ensure all fields are properly formatted
        return {
          id: driver.id || Date.now() + Math.random(),
          driverid: driver.driverid ? driver.driverid.toString() : "",
          truckregnumber: driver.truckregnumber || "",
          containernumber: driver.containernumber !== null ? driver.containernumber.toString() : "",
          date: driver.date || "",
          driver_name: driver.driver_name || "",
          driver_surname: driver.driver_surname || "",
          full_name:
            driver.full_name ||
            (driver.driver_name && driver.driver_surname
              ? `${driver.driver_name} ${driver.driver_surname}`
              : driver.driverid
                ? `Driver ID: ${driver.driverid}`
                : "Unknown Driver"),
        }
      })

      console.log("Normalized drivers:", JSON.stringify(normalizedDrivers, null, 2))
      setDrivers(normalizedDrivers)
      debugDriverData(normalizedDrivers)
    } else {
      console.log("No drivers for selected leg, setting empty array")
      setDrivers([])
    }

    setCurrentLagIndex(index)

    // Reset edited fields tracking
    setEditedFields({
      startingPoint: false,
      destination: false,
      driverRate: false,
      drivers: {}, // Reset the drivers object
    })
  }

  // Update the handleStartingPointChange function to track edits
  const handleStartingPointChange = (e) => {
    if (isCompleted) return

    const startingPoint = e.target.value
    // Clear any previous error message when making a new selection
    setRateError("")

    const updatedFormData = {
      ...formData,
      startingPoint,
    }
    setFormData(updatedFormData)

    // Mark this field as edited
    setEditedFields((prev) => ({
      ...prev,
      startingPoint: true,
    }))

    // If both starting point and destination are selected, fetch the rate
    if (startingPoint && formData.destination) {
      fetchRate(startingPoint, formData.destination)
    }

    // Update the current leg if one is selected
    if (currentLagIndex !== null) {
      const updatedLegs = [...legs]
      updatedLegs[currentLagIndex] = {
        ...updatedLegs[currentLagIndex],
        startingPoint,
      }
      setLegs(updatedLegs)
    }
  }

  // Update the handleDestinationChange function to track edits
  const handleDestinationChange = (e) => {
    if (isCompleted) return

    const destination = e.target.value
    setRateError("")

    const updatedFormData = {
      ...formData,
      destination,
    }
    setFormData(updatedFormData)

    // Mark this field as edited
    setEditedFields((prev) => ({
      ...prev,
      destination: true,
    }))

    // If both starting point and destination are selected, fetch the rate
    if (formData.startingPoint && destination) {
      fetchRate(formData.startingPoint, destination)
    }

    // Update the current leg if one is selected
    if (currentLagIndex !== null) {
      const updatedLegs = [...legs]
      updatedLegs[currentLagIndex] = {
        ...updatedLegs[currentLagIndex],
        destination,
      }
      setLegs(updatedLegs)
    }
  }

  // Replace the handleBackClick function with this version
  const handleBackClick = () => {
    // Check if there are unsaved changes
    if (hasUnsavedChanges()) {
      // Show confirmation modal
      setShowBackConfirmModal(true)
    } else {
      // No unsaved changes, navigate directly
      navigateBack()
    }
  }

  // Helper function to navigate back
  const navigateBack = () => {
    // Force a clean navigation state
    navigate("/instructions", {
      state: { clientId },
      replace: true,
    })
  }

  // Function to check if all containers reach the dropoff destination
  const checkContainersReachDropoff = async (dropoff) => {
    // Get all containers assigned to legs
    const assignedContainers = new Set()
    const containersReachingDropoff = new Set()

    // Collect all containers from all legs
    legs.forEach((leg) => {
      if (leg.drivers && leg.drivers.length > 0) {
        leg.drivers.forEach((driver) => {
          if (driver.containernumber) {
            assignedContainers.add(driver.containernumber)

            // If this leg's destination is the dropoff, mark this container as reaching dropoff
            if (leg.destination === dropoff) {
              containersReachingDropoff.add(driver.containernumber)
            }
          }
        })
      }
    })

    // Get all containers from the instruction
    const allInstructionContainers = instructionContainers.map((c) => c.containernum.toString())

    // Find containers that don't reach the dropoff
    // First, check containers that are assigned but don't reach dropoff
    const assignedButNotReaching = Array.from(assignedContainers).filter(
      (container) => !containersReachingDropoff.has(container),
    )

    // Then, check if there are any containers in the instruction that aren't assigned to any leg
    const notAssigned = allInstructionContainers.filter((container) => !assignedContainers.has(container))

    // Combine both lists for the final missing containers list
    const missingContainers = [...assignedButNotReaching, ...notAssigned]

    console.log("Containers check:", {
      allContainers: allInstructionContainers,
      assignedContainers: Array.from(assignedContainers),
      containersReachingDropoff: Array.from(containersReachingDropoff),
      assignedButNotReaching,
      notAssigned,
      missingContainers,
    })

    return missingContainers
  }

  // Function to check if a container has reached the dropoff destination
  const hasContainerReachedDropoff = (containerNumber) => {
    if (!containerNumber) return false

    try {
      // Get the dropoff destination from the instruction
      const dropoff = legs.find((leg) => {
        return (
          leg.drivers &&
          leg.drivers.some(
            (driver) =>
              driver.containernumber === containerNumber &&
              leg.destination ===
                instructionContainers.find((c) => c.containernum.toString() === containerNumber)?.dropoff,
          )
        )
      })

      return !!dropoff
    } catch (error) {
      console.error("Error checking if container reached dropoff:", error)
      return false
    }
  }

  // Function to check if there are unsaved changes
  const hasUnsavedChanges = () => {
    // Check if any fields have been edited
    if (editedFields.startingPoint || editedFields.destination || editedFields.driverRate) {
      return true
    }

    // Check if any driver fields have been edited
    if (Object.keys(editedFields.drivers).length > 0) {
      return true
    }

    // Check if there are any new drivers that haven't been saved
    if (drivers.some((driver) => !driver.id || driver.id.toString().startsWith("temp-"))) {
      return true
    }

    // Check if there are any legs that haven't been saved
    if (legs.some((leg) => leg.isNew || leg.id?.toString().startsWith("temp-"))) {
      return true
    }

    return false
  }

  // Replace the handleFinalizeClick function with this updated version
  const handleFinalizeClick = async () => {
    if (legs.length === 0) {
      // No legs, just proceed
      navigateToDocuments()
      return
    }

    // Check if there are any drivers added to any legs - do this check FIRST
    const hasDrivers = legs.some((leg) => leg.drivers && leg.drivers.length > 0)
    if (!hasDrivers) {
      // No drivers added, show the no drivers modal
      setShowNoDriversModal(true)
      return
    }

    // Check if there are unsaved changes - do this check SECOND
    if (hasUnsavedChanges()) {
      // Show the unsaved changes modal
      setShowUnsavedChangesModal(true)
      return
    }

    try {
      // Fetch the instruction details to get the pickup and dropoff locations
      const response = await fetch(`http://localhost:5000/instructions/${instructionId}/details`)
      if (!response.ok) {
        throw new Error("Failed to fetch instruction details")
      }

      const instructionDetails = await response.json()
      const pickup = instructionDetails.pickup
      const dropoff = instructionDetails.dropoff

      // Check if the first leg's starting point matches the pickup location
      // const firstLeg = legs[0]
      // const firstLegStartingPoint = firstLeg.startingPoint

      // if (firstLegStartingPoint !== pickup) {
      //   // If the starting point doesn't match the pickup, show the pickup mismatch modal
      //   setPickupMismatchDetails({
      //     firstLegStartingPoint,
      //     pickup,
      //   })
      //   setShowPickupMismatchModal(true)
      //   return // Stop execution here until user responds to modal
      // }

      // First check if all containers reach the dropoff destination
      const missingContainers = await checkContainersReachDropoff(dropoff)

      if (missingContainers.length > 0) {
        // Some containers don't reach the dropoff, show warning modal
        setContainerValidationDetails({
          missingContainers,
          dropoff,
        })
        setShowContainerModal(true)
        return // Stop execution here until user responds to modal
      }

      // If all containers reach dropoff, check if the last leg destination matches the dropoff
      const lastLeg = legs[legs.length - 1]
      const lastLegDestination = lastLeg.destination

      // If the destinations don't match, show the destination mismatch modal
      if (lastLegDestination !== dropoff) {
        setMismatchDetails({
          lastLegDestination,
          dropoff,
        })
        setShowMismatchModal(true)
        return // Stop execution here until user responds to modal
      }

      // If all checks pass, proceed to documents
      navigateToDocuments()
    } catch (error) {
      console.error("Error checking destinations:", error)
      // If there's an error, proceed anyway to avoid blocking the user
      navigateToDocuments()
    }
  }

  // Helper function to navigate to documents page
  const navigateToDocuments = () => {
    // Force a clean navigation state
    navigate("/Upload-Instruction-Documents", {
      state: {
        clientId,
        instructionId,
        isCompleted: isCompleted,
        shipmentType: shipmentType,
        // Don't pass the selectedLegIndex to avoid getting stuck
      },
      replace: true,
    })
  }

  const fetchShipmentType = async () => {
    if (instructionId) {
      try {
        const response = await fetch(`http://localhost:5000/instructions/${instructionId}/shipment-type`)
        if (!response.ok) {
          throw new Error("Failed to fetch shipment type")
        }
        const data = await response.json()
        setShipmentType(data.shipment_type)
        console.log("Shipment type:", data.shipment_type)
      } catch (error) {
        console.error("Error fetching shipment type:", error)
      }
    }
  }

  // Function to validate driver fields
  const validateDriverFields = () => {
    if (!drivers || drivers.length === 0) return true

    const missing = []

    for (let i = 0; i < drivers.length; i++) {
      const driver = drivers[i]
      const driverNum = i + 1

      if (!driver.driverid) {
        missing.push(`Driver ${driverNum}: Driver selection is required`)
      }

      if (!driver.truckregnumber) {
        missing.push(`Driver ${driverNum}: Truck registration number is required`)
      }

      if (!driver.containernumber) {
        missing.push(`Driver ${driverNum}: Container number is required`)
      }

      if (!driver.date) {
        missing.push(`Driver ${driverNum}: Date is required`)
      }
    }

    if (missing.length > 0) {
      setMissingFields(missing)
      setShowMissingFieldsModal(true)
      return false
    }

    return true
  }

  // Function to check for duplicate driver information
  const checkForDuplicateDriver = (driverToCheck) => {
    // Check current drivers in this leg
    const currentLegDrivers = drivers.filter((d, idx) => {
      // Skip the driver we're currently checking
      if (d.id === driverToCheck.id) return false

      return (
        d.driverid === driverToCheck.driverid &&
        d.truckregnumber === driverToCheck.truckregnumber &&
        d.containernumber === driverToCheck.containernumber &&
        d.date === driverToCheck.date
      )
    })

    if (currentLegDrivers.length > 0) return true

    // Check drivers in other legs
    for (let i = 0; i < legs.length; i++) {
      if (i === currentLagIndex) continue // Skip current leg

      const legDrivers = legs[i].drivers || []
      const duplicateFound = legDrivers.some(
        (d) =>
          d.driverid === driverToCheck.driverid &&
          d.truckregnumber === driverToCheck.truckregnumber &&
          d.containernumber === driverToCheck.containernumber &&
          d.date === driverToCheck.date,
      )

      if (duplicateFound) return true
    }

    return false
  }

  // Update the handleSave function to clearly indicate when a new leg is being saved
  const handleSave = async () => {
    if (isCompleted) return

    if (currentLagIndex === null) {
      setSavedMessage("Please select a leg first")
      setTimeout(() => setSavedMessage(""), 3000)
      return
    }

    if (!instructionId) {
      setSavedMessage("Missing instruction ID")
      setTimeout(() => setSavedMessage(""), 5000)
      return
    }

    // Validate required fields
    if (!formData.startingPoint || !formData.destination) {
      setSavedMessage("Starting point and destination are required")
      setTimeout(() => setSavedMessage(""), 3000)
      return
    }

    // Validate driver fields
    if (!validateDriverFields()) {
      return
    }

    // Check for duplicate driver information
    let hasDuplicate = false
    let duplicateDriver = null

    for (const driver of drivers) {
      if (checkForDuplicateDriver(driver)) {
        hasDuplicate = true
        duplicateDriver = driver
        break
      }
    }

    if (hasDuplicate) {
      setDuplicateDriverInfo(duplicateDriver)
      setShowDuplicateDriverModal(true)
      return
    }

    // Update the current leg with the latest form data
    const updatedLegs = [...legs]
    updatedLegs[currentLagIndex] = {
      ...updatedLegs[currentLagIndex],
      ...formData,
      drivers: [...drivers],
    }
    setLegs(updatedLegs)

    const currentLeg = updatedLegs[currentLagIndex]
    const isNewLeg = currentLeg.isNew || currentLeg.id?.toString().startsWith("temp-")

    try {
      setSaving(true)

      // Prepare the leg data for saving
      const legData = {
        legkey: !isNewLeg && currentLeg.id && !isNaN(Number.parseInt(currentLeg.id)) ? currentLeg.id : null,
        legnumber: currentLeg.legnumber || currentLagIndex + 1,
        startingpoint: currentLeg.startingPoint || formData.startingPoint,
        destination: currentLeg.destination || formData.destination,
        driverrate: Number.parseFloat(currentLeg.driverRate || formData.driverRate) || 0,
        m1key: instructionId,
        drivers: drivers.map((driver) => ({
          driverid: driver.driverid || null,
          truckregnumber: driver.truckregnumber || null,
          containernumber: driver.containernumber || null,
          date: driver.date || null,
        })),
      }

      console.log(`${isNewLeg ? "Saving new" : "Updating"} leg data:`, JSON.stringify(legData, null, 2))

      // Send the data to the server
      const response = await fetch(`http://localhost:5000/legs/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(legData),
      })

      const responseText = await response.text()
      console.log("Server response:", responseText)

      let result
      try {
        result = JSON.parse(responseText)
      } catch (e) {
        throw new Error(`Invalid JSON response: ${responseText}`)
      }

      if (!response.ok) {
        throw new Error(result.message || "Failed to save leg data")
      }

      console.log("Leg saved successfully:", result)

      // Update the leg ID with the one from the database if this was a new leg
      if (result.legId && isNewLeg) {
        const updatedLegsWithId = [...legs]
        updatedLegsWithId[currentLagIndex] = {
          ...updatedLegsWithId[currentLagIndex],
          id: result.legId,
          isNew: false, // No longer a new leg
        }
        setLegs(updatedLegsWithId)
        console.log(`New leg saved to database with ID: ${result.legId}`)
      }

      // Show success message
      const successMessage = isNewLeg ? "New leg saved to database!" : "Leg updated successfully!"
      setSavedMessage(successMessage)

      // Reset edited fields tracking since we've saved the changes
      setEditedFields({
        startingPoint: false,
        destination: false,
        driverRate: false,
        drivers: {}, // Reset the drivers object
      })

      // Refresh the legs data to get updated information from the database
      await refreshLegData()

      // Update instruction status from "New" to "In Progress" if this is the first saved leg
      try {
        // First check the current status
        const statusResponse = await fetch(`http://localhost:5000/instructions/${instructionId}`)
        const statusData = await statusResponse.json()

        // If status is "New", update it to "In Progress"
        if (statusData.status === "New") {
          console.log("Updating instruction status from New to In Progress")
          const updateResponse = await fetch(`http://localhost:5000/instructions/${instructionId}/status`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ status: "In Progress" }),
          })

          if (updateResponse.ok) {
            console.log("Instruction status updated to In Progress")
          } else {
            console.error("Failed to update instruction status")
          }
        }
      } catch (error) {
        console.error("Error updating instruction status:", error)
      }

      // Add the current leg to the savedLegs set
      setSavedLegs((prev) => {
        const newSet = new Set(prev)
        newSet.add(currentLagIndex)
        return newSet
      })

      // Clear the message after a longer time (5 seconds)
      setTimeout(() => setSavedMessage(""), 5000)
    } catch (error) {
      console.error("Error saving leg:", error)
      setSavedMessage("Error saving leg: " + error.message)
      setTimeout(() => setSavedMessage(""), 5000)
    } finally {
      setSaving(false)
    }
  }

  // Helper function to get driver name from ID
  const getDriverName = (driverId) => {
    const driver = employeeDrivers.find((d) => d.userid.toString() === driverId)
    return driver ? `${driver.name} ${driver.surname}` : "Unknown Driver"
  }

  // Replace the shouldDisableAddLeg function with this improved version
  const shouldDisableAddLeg = async () => {
    if (isCompleted) return true // Always disable if completed
    if (legs.length === 0) return false // Allow adding the first leg

    try {
      // First, fetch the instruction details to get the dropoff location
      const response = await fetch(`http://localhost:5000/instructions/${instructionId}/details`)
      if (!response.ok) return false

      const instructionDetails = await response.json()
      const dropoff = instructionDetails.dropoff

      // If we don't have a dropoff location, don't disable
      if (!dropoff) return false

      // Check if the last leg's destination matches the dropoff
      const lastLeg = legs[legs.length - 1]
      if (lastLeg.destination !== dropoff) return false

      // Get all containers assigned to legs
      const assignedContainers = new Set()
      const containersReachingDropoff = new Set()

      // Collect all containers from all legs
      legs.forEach((leg) => {
        if (leg.drivers && leg.drivers.length > 0) {
          leg.drivers.forEach((driver) => {
            if (driver.containernumber) {
              assignedContainers.add(driver.containernumber)

              // If this leg's destination is the dropoff, mark this container as reaching dropoff
              if (leg.destination === dropoff) {
                containersReachingDropoff.add(driver.containernumber)
              }
            }
          })
        }
      })

      // If no containers are assigned, don't disable
      if (assignedContainers.size === 0) return false

      // Get all containers from the instruction
      const allInstructionContainers = instructionContainers.map((c) => c.containernum)

      // If there are no instruction containers, don't disable
      if (allInstructionContainers.length === 0) return false

      // Check if all instruction containers are assigned and reach dropoff
      const allContainersReachDropoff = allInstructionContainers.every((container) =>
        containersReachingDropoff.has(container),
      )

      // Only disable the + button if all containers reach the dropoff
      return allContainersReachDropoff
    } catch (error) {
      console.error("Error in shouldDisableAddLeg:", error)
      return false // On error, don't disable
    }
  }

  // Add this useEffect to check if we should hide the + button whenever legs or containers change
  useEffect(() => {
    const checkContainersDestination = async () => {
      if (!instructionId || legs.length === 0 || instructionContainers.length === 0) {
        setShouldHideAddLegButton(false)
        return
      }

      try {
        // Fetch the instruction details to get the dropoff location
        const response = await fetch(`http://localhost:5000/instructions/${instructionId}/details`)
        if (!response.ok) {
          setShouldHideAddLegButton(false)
          return
        }

        const instructionDetails = await response.json()
        const dropoff = instructionDetails.dropoff

        // If we don't have a dropoff location, don't hide
        if (!dropoff) {
          setShouldHideAddLegButton(false)
          return
        }

        // Check if the last leg's destination matches the dropoff
        const lastLeg = legs[legs.length - 1]
        if (lastLeg.destination !== dropoff) {
          setShouldHideAddLegButton(false)
          return
        }

        // Get all containers assigned to legs
        const assignedContainers = new Set()
        const containersReachingDropoff = new Set()

        // Collect all containers from all legs
        legs.forEach((leg) => {
          if (leg.drivers && leg.drivers.length > 0) {
            leg.drivers.forEach((driver) => {
              if (driver.containernumber) {
                assignedContainers.add(driver.containernumber)

                // If this leg's destination is the dropoff, mark this container as reaching dropoff
                if (leg.destination === dropoff) {
                  containersReachingDropoff.add(driver.containernumber)
                }
              }
            })
          }
        })

        // Get all containers from the instruction
        const allInstructionContainers = instructionContainers.map((c) => c.containernum)

        // Check if all instruction containers reach dropoff
        const allContainersReachDropoff = allInstructionContainers.every((container) =>
          containersReachingDropoff.has(container),
        )

        console.log("Container destination check:", {
          dropoff,
          lastLegDestination: lastLeg.destination,
          allInstructionContainers,
          assignedContainers: Array.from(assignedContainers),
          containersReachingDropoff: Array.from(containersReachingDropoff),
          allContainersReachDropoff,
        })

        // Set the state based on whether all containers reach the dropoff
        setShouldHideAddLegButton(allContainersReachDropoff)
      } catch (error) {
        console.error("Error checking container destinations:", error)
        setShouldHideAddLegButton(false)
      }
    }

    checkContainersDestination()
  }, [legs, instructionContainers, instructionId])

  return (
    <div className="min-h-screen bg-white" style={{ paddingBottom: 200 }}>
      <style>{modalAnimation}</style>
      <div className="">
        <button className="back-button" onClick={handleBackClick}>
          Back
        </button>

        {/* {isCompleted && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4 mt-4" role="alert">
            <p className="font-bold">View Only Mode</p>
            <p>This instruction has been completed and cannot be edited.</p>
          </div>
        )} */}
      </div>

      <br />
      {/* Lag Buttons & Plus */}

      <div className="flex gap-4 mb-4" style={{ marginLeft: "15px" }}>
        {legs.map((leg, index) => (
          <button
            key={leg.id || index}
            className={`px-4 py-2 rounded-md ${
              currentLagIndex === index
                ? "bg-green-500 text-white"
                : leg.isNew || leg.id?.toString().startsWith("temp-")
                  ? "bg-yellow-200 text-gray-800" // Yellow background for unsaved legs
                  : "bg-gray-200 text-gray-800"
            }`}
            onClick={() => handleSelectLeg(index)}
          >
            Leg {index + 1}
            {leg.isNew || leg.id?.toString().startsWith("temp-") ? " *" : ""}
            {leg.drivers && leg.drivers.length > 0 && (
              <span className="ml-2 text-xs">
                ({leg.drivers.length} driver{leg.drivers.length !== 1 ? "s" : ""})
              </span>
            )}
          </button>
        ))}
        {!shouldHideAddLegButton && <Plus onClick={handleAddLeg} disabled={isCompleted} />}
      </div>

      {legs.length > 0 && (
        <div className="finalise-btn">
          <button className="finalise-btn2" onClick={handleFinalizeClick}>
            {isCompleted ? "Documents" : "Finalise"}
          </button>
        </div>
      )}

      {/* Main Form */}
      <div className="px-4">
        {/* Update the UI to show when fields have been edited */}
        <div className="bg-blue-50 p-6 rounded-md mb-4">
          <div className="flex flex-wrap gap-6 items-center">
            <div className="flex-1 min-w-[100px]">
              <label className="block text-gray-700 mb-2">
                Starting Point
                {editedFields.startingPoint && <span className="ml-2 text-blue-500 text-xs">(edited)</span>}
              </label>
              <div className="relative">
                <select
                  className={`w-full p-2 border rounded-md appearance-none pr-10 ${editedFields.startingPoint ? "border-blue-500" : ""}`}
                  value={formData.startingPoint}
                  onChange={handleStartingPointChange}
                  disabled={isCompleted || legs.length === 0}
                >
                  <option value="">Select starting point</option>
                  {startingPoints.map((point) => (
                    <option key={point} value={point}>
                      {point}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="w-[100px]">
              <label className="block text-gray-700 mb-2">
                Driver Rate
                {editedFields.driverRate && <span className="ml-2 text-blue-500 text-xs">(edited)</span>}
              </label>
              <input
                type="text"
                className={`w-full p-2 border rounded-md ${editedFields.driverRate ? "border-blue-500" : ""}`}
                value={formData.driverRate}
                readOnly
                disabled={isCompleted || legs.length === 0}
              />
              {rateError && <p className="text-red-500 text-sm mt-1">{rateError}</p>}
            </div>

            <div className="flex-1 min-w-[100px]">
              <label className="block text-gray-700 mb-2">
                Destination
                {editedFields.destination && <span className="ml-2 text-blue-500 text-xs">(edited)</span>}
              </label>
              <div className="relative">
                <select
                  className={`w-full p-2 border rounded-md appearance-none pr-10 ${editedFields.destination ? "border-blue-500" : ""}`}
                  value={formData.destination}
                  onChange={handleDestinationChange}
                  disabled={isCompleted || legs.length === 0}
                >
                  <option value="">Select destination</option>
                  {destinations.map((destination) => (
                    <option key={destination} value={destination}>
                      {destination}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-center mt-6">
            <button
              ref={addDriverButtonRef}
              onClick={addDriver}
              className={`px-8 py-2 rounded-md transition-colors ${
                currentLagIndex !== null && !isCompleted
                  ? "bg-blue-500 text-white hover:bg-blue-600"
                  : "bg-gray-400 text-gray-200 cursor-not-allowed"
              }`}
              disabled={currentLagIndex === null || isCompleted}
            >
              Add Driver
            </button>
          </div>
        </div>

        {/* Driver Entries - Always show this section if we're on a leg */}
        {currentLagIndex !== null && (
          <div className="bg-blue-50 p-6 rounded-md mb-4">
            <h3 className="text-lg font-medium mb-4">Driver Information</h3>

            {drivers && drivers.length > 0 ? (
              <>
                {drivers.map((entry, index) => (
                  <div key={entry.id || index} className="mb-6 p-4 border rounded-lg bg-white shadow-sm">
                    {/* <h4 className="font-medium text-lg mb-3 border-b pb-2">
                      Driver: {entry.full_name || (entry.driverid ? `ID: ${entry.driverid}` : "None")}
                    </h4> */}

                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <label className="block text-gray-700 mb-1">Driver</label>
                        <select
                          className="w-full p-2 border rounded-md appearance-none"
                          value={entry.driverid || ""}
                          onChange={(e) => {
                            if (isCompleted) return
                            const updatedDrivers = [...drivers]
                            updatedDrivers[index].driverid = e.target.value

                            if (e.target.value) {
                              const selectedDriver = employeeDrivers.find((d) => d.userid.toString() === e.target.value)
                              if (selectedDriver) {
                                updatedDrivers[index].full_name = `${selectedDriver.name} ${selectedDriver.surname}`
                              }
                            } else {
                              updatedDrivers[index].full_name = ""
                            }

                            // Mark this driver field as edited
                            setEditedFields((prev) => ({
                              ...prev,
                              drivers: {
                                ...prev.drivers,
                                [updatedDrivers[index].id]: true,
                              },
                            }))

                            setDrivers(updatedDrivers)
                            console.log(`Updated driver at index ${index}:`, updatedDrivers[index])
                          }}
                          disabled={isCompleted}
                        >
                          <option value="">Select driver</option>
                          {employeeDrivers.map((driver) => (
                            <option key={driver.userid} value={driver.userid.toString()}>
                              {driver.name} {driver.surname}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-gray-700 mb-1">Truck Reg Number</label>
                        <select
                          className="w-full p-2 border rounded-md appearance-none"
                          value={entry.truckregnumber || ""}
                          onChange={(e) => {
                            if (isCompleted) return
                            const updatedDrivers = [...drivers]
                            updatedDrivers[index].truckregnumber = e.target.value

                            // Mark this driver field as edited
                            setEditedFields((prev) => ({
                              ...prev,
                              drivers: {
                                ...prev.drivers,
                                [updatedDrivers[index].id]: true,
                              },
                            }))

                            setDrivers(updatedDrivers)
                            console.log(`Updated truck reg for driver at index ${index}:`, e.target.value)
                          }}
                          disabled={isCompleted}
                        >
                          <option value="">Select Truck</option>
                          {truckRegOptions.map((truck) => (
                            <option key={truck} value={truck}>
                              {truck}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-gray-700 mb-1">Container Number</label>
                        <select
                          className="w-full p-2 border rounded-md appearance-none"
                          value={entry.containernumber || ""}
                          onChange={(e) => {
                            if (isCompleted) return
                            const containerValue = e.target.value

                            // Check if this container has already reached its dropoff in a previous leg
                            if (containerValue) {
                              const containerDropoff = instructionContainers.find(
                                (c) => c.containernum === containerValue,
                              )?.dropoff

                              // If we have a dropoff for this container, check if it already reached it
                              if (containerDropoff) {
                                // Check previous legs to see if this container already reached its dropoff
                                const containerReachedDropoff = legs.some((leg, legIndex) => {
                                  // Only check legs before the current one
                                  if (legIndex >= currentLagIndex) return false

                                  // Check if this leg's destination matches the container's dropoff
                                  if (leg.destination === containerDropoff) {
                                    // Check if this container was used in this leg
                                    return (
                                      leg.drivers &&
                                      leg.drivers.some((driver) => driver.containernumber === containerValue)
                                    )
                                  }
                                  return false
                                })

                                if (containerReachedDropoff) {
                                  // Show the modal
                                  setContainerReachedDetails({ containerNumber: containerValue })
                                  setShowContainerReachedModal(true)
                                  return // Don't update the state
                                }
                              }
                            }

                            const updatedDrivers = [...drivers]
                            updatedDrivers[index].containernumber = containerValue

                            // Mark this driver field as edited
                            setEditedFields((prev) => ({
                              ...prev,
                              drivers: {
                                ...prev.drivers,
                                [updatedDrivers[index].id]: true,
                              },
                            }))

                            setDrivers(updatedDrivers)
                            console.log(`Updated container for driver at index ${index}:`, containerValue)
                          }}
                          disabled={isCompleted}
                        >
                          <option value="">Select Container</option>
                          {containerOptions
                            .filter((container) => {
                              console.log(container)
                              // For the first leg, show all containers
                              if (currentLagIndex === 0) return true

                              // For subsequent legs, hide containers that have reached dropoff
                              return !hasContainerReachedDropoff(container)
                            })
                            .map((container) => (
                              <option key={container} value={container}>
                                {container}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-gray-700 mb-1">Date</label>
                        <input
                          type="date"
                          className="w-full p-2 border rounded-md"
                          value={
                            entry.date
                              ? typeof entry.date === "string"
                                ? entry.date.split("T")[0]
                                : new Date(entry.date).toISOString().split("T")[0]
                              : ""
                          }
                          onChange={(e) => {
                            if (isCompleted) return
                            const updatedDrivers = [...drivers]
                            updatedDrivers[index].date = e.target.value

                            // Mark this driver field as edited
                            setEditedFields((prev) => ({
                              ...prev,
                              drivers: {
                                ...prev.drivers,
                                [updatedDrivers[index].id]: true,
                              },
                            }))

                            setDrivers(updatedDrivers)
                            console.log(`Updated date for driver at index ${index}:`, e.target.value)
                          }}
                          disabled={isCompleted}
                        />
                      </div>
                    </div>

                    <div className="mt-3 text-right">
                      <button
                        className="remove-driver-btn"
                        onClick={() => {
                          // Get driver name or ID for the confirmation message
                          const driverName =
                            entry.full_name ||
                            (entry.driverid ? `Driver ID: ${entry.driverid}` : `Driver #${index + 1}`)

                          // Set the driver to remove and show the confirmation modal
                          setDriverToRemove({ index, name: driverName })
                          setShowRemoveDriverModal(true)
                        }}
                        disabled={isCompleted}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 6h18"></path>
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <p className="text-gray-500 text-center py-4">
                No driver information available for this leg. Click "Add Driver" to add a driver.
              </p>
            )}

            {/* Find the section where the Save and Remove Leg buttons are rendered (around line 1200-1220)
            Replace the buttons section with this code: */}
            {drivers.length > 0 && !isCompleted && (
              <div className="flex justify-center mt-6 gap-4">
                <button className="save-btn" onClick={handleSave} disabled={saving || isCompleted}>
                  {saving ? "Saving..." : "Save"}
                </button>

                {/* Only show remove leg button for the last leg AND only if it has been saved */}
                {currentLagIndex === legs.length - 1 && savedLegs.has(currentLagIndex) && (
                  <button
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition-colors"
                    onClick={() => {
                      const legId = legs[currentLagIndex]?.id
                      const isTemp = legId?.toString().startsWith("temp-")
                      handleRemoveLeg(currentLagIndex, isTemp ? null : legId)
                    }}
                    disabled={saving || isCompleted}
                  >
                    Remove Leg
                  </button>
                )}
              </div>
            )}
            {/* End of replaced section */}

            {/* Toast popup for success messages */}
            {savedMessage && !savedMessage.includes("Error") && <div className="toast-popup">{savedMessage}</div>}

            {/* Keep error messages in place */}
            {savedMessage && savedMessage.includes("Error") && (
              <div className="mt-4 text-center">
                <p className="text-red-500">{savedMessage}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Destination Mismatch Modal */}
      {showMismatchModal && (
        <div className="modal-wrapper">
          <div className="modal-backdrop animate-fadeIn"></div>
          <div className="modal-container animate-scaleIn">
            <div className="modal-header">
              <h3 className="modal-title">Destination Mismatch</h3>
              <p className="modal-description">
                The final leg destination doesn't match the instruction dropoff location.
              </p>
            </div>
            <div className="modal-body">
              <div className="modal-item">
                {/* Remove the "checked" class since the destinations don't match */}
                <div className="modal-bullet"></div>
                <span className="modal-item-text">
                  Last Leg Destination: <strong>{mismatchDetails.lastLegDestination}</strong>
                </span>
              </div>
              <div className="modal-item">
                {/* Add the "checked" class to the dropoff destination to indicate it's the correct one */}
                <div className="modal-bullet"></div>
                <span className="modal-item-text">
                  Instruction Dropoff: <strong>{mismatchDetails.dropoff}</strong>
                </span>
              </div>
              <div className="modal-item">
                <div className="modal-bullet"></div>
                <span className="modal-item-text">
                  Please update the final leg destination or edit the instruction.
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-btn modal-btn-primary" onClick={() => setShowMismatchModal(false)}>
                Okay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Container Validation Modal */}
      {showContainerModal && (
        <div className="modal-wrapper">
          <div className="modal-backdrop animate-fadeIn"></div>
          <div className="modal-container animate-scaleIn">
            <div className="modal-header">
              <h3 className="modal-title">Container Destination Warning</h3>
              <p className="modal-description">All containers must reach the final destination.</p>
            </div>
            <div className="modal-body">
              <div className="modal-item">
                <div className="modal-bullet"></div>
                <span className="modal-item-text">
                  Final Destination: <strong>{containerValidationDetails.dropoff}</strong>
                </span>
              </div>
              {containerValidationDetails.missingContainers.map((container, index) => (
                <div key={index} className="modal-item">
                  <div className="modal-bullet"></div>
                  <span className="modal-item-text">
                    Container <strong>{container}</strong> does not reach final destination
                  </span>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="modal-btn modal-btn-primary" onClick={() => setShowContainerModal(false)}>
                Okay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Modal */}
      {showUnsavedChangesModal && (
        <div className="modal-wrapper">
          <div className="modal-backdrop animate-fadeIn"></div>
          <div className="modal-container animate-scaleIn">
            <div className="modal-header">
              <h3 className="modal-title">Unsaved Changes</h3>
              <p className="modal-description">Please save your changes in the current leg before adding a new leg.</p>
            </div>
            <div className="modal-footer">
              <button className="modal-btn modal-btn-primary" onClick={() => setShowUnsavedChangesModal(false)}>
                Okay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Missing Fields Modal */}
      {showMissingFieldsModal && (
        <div className="modal-wrapper">
          <div className="modal-backdrop animate-fadeIn"></div>
          <div className="modal-container animate-scaleIn">
            <div className="modal-header">
              <h3 className="modal-title">Missing Required Fields</h3>
              <p className="modal-description">Please fill in all required fields before saving.</p>
            </div>
            <div className="modal-body">
              {missingFields.map((field, index) => (
                <div key={index} className="modal-item">
                  <div className="modal-bullet"></div>
                  <span className="modal-item-text">{field}</span>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="modal-btn modal-btn-primary" onClick={() => setShowMissingFieldsModal(false)}>
                Okay
              </button>
            </div>
          </div>
        </div>
      )}
      {/* No Drivers Modal */}
      {showNoDriversModal && (
        <div className="modal-wrapper">
          <div className="modal-backdrop animate-fadeIn"></div>
          <div className="modal-container animate-scaleIn">
            <div className="modal-header">
              <h3 className="modal-title">Driver Required</h3>
              <p className="modal-description">Please make sure to add a driver before finalisation.</p>
            </div>
            <div className="modal-footer">
              <button className="modal-btn modal-btn-primary" onClick={() => setShowNoDriversModal(false)}>
                Okay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back Button Confirmation Modal */}
      {showBackConfirmModal && (
        <div className="modal-wrapper">
          <div className="modal-backdrop animate-fadeIn"></div>
          <div className="modal-container animate-scaleIn">
            <div className="modal-header">
              {/* <h3 className="modal-title">Confirm Navigation</h3> */}
              <p className="modal-description">Are you sure you wish to proceed? Unsaved changes will be lost.</p>
            </div>
            <div className="modal-footer">
              <button className="modal-btn modal-btn-secondary" onClick={() => setShowBackConfirmModal(false)}>
                No
              </button>
              <button
                className="modal-btn modal-btn-primary"
                onClick={() => {
                  setShowBackConfirmModal(false)
                  navigateBack()
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Driver Removal Confirmation Modal */}
      {showRemoveDriverModal && (
        <div className="modal-wrapper">
          <div className="modal-backdrop animate-fadeIn"></div>
          <div className="modal-container animate-scaleIn">
            <div className="modal-header">
              {/* <h3 className="modal-title">Remove Driver</h3> */}
              <p className="modal-description" style={{ fontSize: "20px" }}>
                Are you sure you want to remove this driver?
              </p>
            </div>
            <div className="modal-body">
              <div className="p-2 text-center">
                <span className="text-gray-700">
                  Removing: <strong>{driverToRemove.name}</strong>
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-btn modal-btn-secondary" onClick={() => setShowRemoveDriverModal(false)}>
                No
              </button>
              <button
                className="modal-btn modal-btn-primary"
                onClick={async () => {
                  // Remove the driver from local state
                  if (driverToRemove.index !== null) {
                    const updatedDrivers = [...drivers]
                    updatedDrivers.splice(driverToRemove.index, 1)
                    setDrivers(updatedDrivers)

                    // Update the legs state immediately to reflect the driver removal in the UI
                    const updatedLegs = [...legs]
                    updatedLegs[currentLagIndex] = {
                      ...updatedLegs[currentLagIndex],
                      drivers: updatedDrivers,
                    }
                    setLegs(updatedLegs)

                    // Save to database immediately
                    try {
                      setSaving(true)

                      // Get the current leg
                      const currentLeg = legs[currentLagIndex]
                      const isNewLeg = currentLeg.isNew || currentLeg.id?.toString().startsWith("temp-")

                      // Prepare the leg data with the updated drivers array
                      const legData = {
                        legkey:
                          !isNewLeg && currentLeg.id && !isNaN(Number.parseInt(currentLeg.id)) ? currentLeg.id : null,
                        legnumber: currentLeg.legnumber || currentLagIndex + 1,
                        startingpoint: formData.startingPoint,
                        destination: formData.destination,
                        driverrate: Number.parseFloat(formData.driverRate) || 0,
                        m1key: instructionId,
                        drivers: updatedDrivers.map((driver) => ({
                          driverid: driver.driverid || null,
                          truckregnumber: driver.truckregnumber || null,
                          containernumber: driver.containernumber || null,
                          date: driver.date || null,
                        })),
                      }

                      // Send the data to the server
                      const response = await fetch(`http://localhost:5000/legs/save`, {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify(legData),
                      })

                      const responseText = await response.text()
                      let result
                      try {
                        result = JSON.parse(responseText)
                      } catch (e) {
                        throw new Error(`Invalid JSON response: ${responseText}`)
                      }

                      if (!response.ok) {
                        throw new Error(result.message || "Failed to save leg data")
                      }

                      // Show success message
                      setSavedMessage("Driver removed successfully!")
                      setTimeout(() => setSavedMessage(""), 5000)

                      // Refresh the legs data
                      await refreshLegData()
                    } catch (error) {
                      console.error("Error removing driver:", error)
                      setSavedMessage("Error removing driver: " + error.message)
                      setTimeout(() => setSavedMessage(""), 5000)
                    } finally {
                      setSaving(false)
                    }
                  }

                  // Close the modal
                  setShowRemoveDriverModal(false)
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leg Removal Confirmation Modal */}
      {showRemoveLegModal && (
        <div className="modal-wrapper">
          <div className="modal-backdrop animate-fadeIn"></div>
          <div className="modal-container animate-scaleIn">
            <div className="modal-header">
              <p className="modal-description" style={{ fontSize: "20px" }}>
                Are you sure you want to remove this leg?
              </p>
            </div>
            <div className="modal-body">
              <div className="p-2 text-center">
                <span className="text-gray-700">
                  Removing: <strong>Leg {legToRemove.number}</strong>
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-btn modal-btn-secondary" onClick={() => setShowRemoveLegModal(false)}>
                No
              </button>
              <button
                className="modal-btn modal-btn-primary"
                onClick={async () => {
                  if (legToRemove.index !== null) {
                    try {
                      setSaving(true)

                      // Check if this is a temporary leg (not yet saved to database)
                      const isTemporaryLeg = !legToRemove.id || legToRemove.id.toString().startsWith("temp-")

                      // Only send delete request to server if this is NOT a temporary leg
                      if (!isTemporaryLeg) {
                        const response = await fetch(`http://localhost:5000/legs/${legToRemove.id}`, {
                          method: "DELETE",
                          headers: {
                            "Content-Type": "application/json",
                          },
                        })

                        if (!response.ok) {
                          const errorText = await response.text()
                          throw new Error(`Failed to delete leg: ${errorText}`)
                        }

                        // After successful deletion, update the leg numbers in the database
                        // For all legs after the deleted one
                        for (let i = legToRemove.index + 1; i < legs.length; i++) {
                          const legToUpdate = legs[i]
                          if (legToUpdate.id && !legToUpdate.id.toString().startsWith("temp-")) {
                            await fetch(`http://localhost:5000/legs/${legToUpdate.id}/update-number`, {
                              method: "PUT",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({ legnumber: i }),
                            })
                          }
                        }
                      }

                      // Remove the leg from local state
                      const updatedLegs = [...legs]
                      updatedLegs.splice(legToRemove.index, 1)

                      // Update leg numbers for all legs after the removed one
                      for (let i = legToRemove.index; i < updatedLegs.length; i++) {
                        updatedLegs[i].legnumber = i + 1
                      }

                      setLegs(updatedLegs)

                      // Update savedLegs to reflect the new indices after removal
                      setSavedLegs((prevSavedLegs) => {
                        const newSavedLegs = new Set()

                        // For each previously saved leg, adjust its index if needed
                        prevSavedLegs.forEach((index) => {
                          if (index < legToRemove.index) {
                            // Legs before the removed one keep their index
                            newSavedLegs.add(index)
                          } else if (index > legToRemove.index) {
                            // Legs after the removed one have their index decreased by 1
                            newSavedLegs.add(index - 1)
                          }
                          // The removed leg's index is not added to the new set
                        })

                        return newSavedLegs
                      })

                      // If we were viewing the removed leg, select the previous leg
                      if (currentLagIndex === legToRemove.index) {
                        const newIndex = Math.max(0, legToRemove.index - 1)
                        setCurrentLagIndex(newIndex)

                        // Load the selected leg data
                        const selectedLeg = updatedLegs[newIndex]
                        setFormData({
                          startingPoint: selectedLeg.startingPoint || "",
                          driverRate: selectedLeg.driverRate || "",
                          destination: selectedLeg.destination || "",
                        })

                        // Load drivers for this leg
                        if (selectedLeg.drivers && selectedLeg.drivers.length > 0) {
                          setDrivers(selectedLeg.drivers)
                        } else {
                          setDrivers([])
                        }
                      }
                      // If we were viewing a leg after the removed one, adjust the index
                      else if (currentLagIndex > legToRemove.index) {
                        setCurrentLagIndex(currentLagIndex - 1)
                      }

                      setSavedMessage("Leg removed successfully!")
                      setTimeout(() => setSavedMessage(""), 5000)

                      // Only refresh legs data if we deleted a permanent leg
                      if (!isTemporaryLeg) {
                        await refreshLegData()
                      }
                    } catch (error) {
                      console.error("Error removing leg:", error)
                      setSavedMessage("Error removing leg: " + error.message)
                      setTimeout(() => setSavedMessage(""), 5000)
                    } finally {
                      setSaving(false)
                    }
                  }

                  // Close the modal
                  setShowRemoveLegModal(false)
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Driver Modal */}
      {showDuplicateDriverModal && (
        <div className="modal-wrapper">
          <div className="modal-backdrop animate-fadeIn"></div>
          <div className="modal-container animate-scaleIn">
            <div className="modal-header">
              <h3 className="modal-title">Identical Driver Information</h3>
              <p className="modal-description">A driver with identical information already exists.</p>
            </div>
            <div className="modal-body">
              <div className="modal-item">
                <div className="modal-bullet"></div>
                <span className="modal-item-text">
                  Driver: <strong>{duplicateDriverInfo && getDriverName(duplicateDriverInfo.driverid)}</strong>
                </span>
              </div>
              <div className="modal-item">
                <div className="modal-bullet"></div>
                <span className="modal-item-text">
                  Truck: <strong>{duplicateDriverInfo?.truckregnumber}</strong>
                </span>
              </div>
              <div className="modal-item">
                <div className="modal-bullet"></div>
                <span className="modal-item-text">
                  Container: <strong>{duplicateDriverInfo?.containernumber}</strong>
                </span>
              </div>
              <div className="modal-item">
                <div className="modal-bullet"></div>
                <span className="modal-item-text">
                  Date: <strong>{duplicateDriverInfo?.date}</strong>
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-btn modal-btn-primary" onClick={() => setShowDuplicateDriverModal(false)}>
                Okay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Container Already Reached Dropoff Modal */}
      {showContainerReachedModal && (
        <div className="modal-wrapper">
          <div className="modal-backdrop animate-fadeIn"></div>
          <div className="modal-container animate-scaleIn">
            <div className="modal-header">
              <h3 className="modal-title">Container Already Reached Dropoff</h3>
              <p className="modal-description">
                The specified container has already reached its dropoff in a previous leg.
              </p>
            </div>
            <div className="modal-body">
              <div className="modal-item">
                <div className="modal-bullet"></div>
                <span className="modal-item-text">
                  Container <strong>{containerReachedDetails.containerNumber}</strong> has already reached its final
                  destination.
                </span>
              </div>
              <div className="modal-item">
                <div className="modal-bullet"></div>
                <span className="modal-item-text">
                  Please select a different container or update the previous legs.
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-btn modal-btn-primary" onClick={() => setShowContainerReachedModal(false)}>
                Okay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default UpdateInstruction






