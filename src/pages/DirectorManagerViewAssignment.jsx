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
    align-items: center;
    padding: 8px 0;
  }
  
  .modal-checkbox {
    width: 18px;
    height: 18px;
    border-radius: 4px;
    border: 2px solid #D1D5DB;
    margin-right: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .modal-checkbox.checked {
    background-color: #4F46E5;
    border-color: #4F46E5;
  }
  
  .modal-checkbox-icon {
    color: white;
    width: 12px;
    height: 12px;
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

function DirectorManagerViewAssignment() {
  const navigate = useNavigate()
  const location = useLocation()
  const clientId = location.state?.clientId
  const instructionId = location.state?.instructionId || null
  const selectedLegIndex = location.state?.selectedLegIndex

  // Add a ref to track if we're coming from the documents page
  const isFromDocumentsPage = useRef(selectedLegIndex !== undefined)

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
  const [existingDrivers, setExistingDrivers] = useState([])
  // Flag to track if initial data has been loaded
  const [initialDataLoaded, setInitialDataLoaded] = useState(false)
  const [shipmentType, setShipmentType] = useState(null)
  const [instructionContainers, setInstructionContainers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Replace the useEffect that fetches legs with this updated version
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
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
        setError("Failed to load data. Please try again.")
        setInitialDataLoaded(true) // Set to true even on error to prevent infinite loading
      } finally {
        setLoading(false)
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
      const response = await fetch("http://localhost:5000/containers/numbers")
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
      const response = await fetch("http://localhost:5000/employees/drivers")
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
      const response = await fetch("http://localhost:5000/trucks/regnums")
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
      const response = await fetch("http://localhost:5000/starting-points")
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
      const response = await fetch("http://localhost:5000/destinations")
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

  // Replace the handleSelectLeg function with this updated version
  const handleSelectLeg = (index) => {
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
  }

  const handleBackClick = () => {
    // Force a clean navigation state
    navigate("/DirectorDashboard", {
      replace: true,
    })
  }

  const handleViewDocuments = () => {
    // Navigate to the director documents view
    navigate("/DirectorDocs", {
      state: {
        clientId,
        instructionId,
        shipmentType: shipmentType,
      },
      replace: true,
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-2">Loading instruction data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white p-4">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
        <button className="back-button" onClick={handleBackClick}>
          Back to Instructions
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white" style={{ paddingBottom: 200 }}>
      <style>{modalAnimation}</style>
      <div className="">
        <button className="back-button" onClick={handleBackClick}>
          Back
        </button>

        {/* <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-4 mt-4" role="alert">
          <p className="font-bold">Director View Mode</p>
          <p>You are viewing this instruction in read-only mode.</p>
        </div> */}
      </div>

      <br />
      {/* Leg Buttons */}
      <div className="flex gap-4 mb-4" style={{ marginLeft: "15px" }}>
        {legs.map((leg, index) => (
          <button
            key={leg.id || index}
            className={`px-4 py-2 rounded-md ${
              currentLagIndex === index ? "bg-green-500 text-white" : "bg-gray-200 text-gray-800"
            }`}
            onClick={() => handleSelectLeg(index)}
          >
            Leg {index + 1}
            {leg.drivers && leg.drivers.length > 0 && (
              <span className="ml-2 text-xs">
                ({leg.drivers.length} driver{leg.drivers.length !== 1 ? "s" : ""})
              </span>
            )}
          </button>
        ))}
      </div>

      {legs.length > 0 && (
        <div className="finalise-btn">
          <button className="finalise-btn2" onClick={handleViewDocuments}>
            Documents
          </button>
        </div>
      )}

      {/* Main Form */}
      <div className="px-4">
        <div className="bg-blue-50 p-6 rounded-md mb-4">
          <div className="flex flex-wrap gap-6 items-center">
            <div className="flex-1 min-w-[100px]">
              <label className="block text-gray-700 mb-2">Starting Point</label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full p-2 border rounded-md bg-gray-100"
                  value={formData.startingPoint}
                  readOnly
                />
              </div>
            </div>

            <div className="w-[100px]">
              <label className="block text-gray-700 mb-2">Driver Rate</label>
              <input
                type="text"
                className="w-full p-2 border rounded-md bg-gray-100"
                value={formData.driverRate}
                readOnly
              />
            </div>

            <div className="flex-1 min-w-[100px]">
              <label className="block text-gray-700 mb-2">Destination</label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full p-2 border rounded-md bg-gray-100"
                  value={formData.destination}
                  readOnly
                />
              </div>
            </div>
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
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <label className="block text-gray-700 mb-1">Driver</label>
                        <input
                          type="text"
                          className="w-full p-2 border rounded-md bg-gray-100"
                          value={entry.full_name || "None"}
                          readOnly
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 mb-1">Truck Reg Number</label>
                        <input
                          type="text"
                          className="w-full p-2 border rounded-md bg-gray-100"
                          value={entry.truckregnumber || "None"}
                          readOnly
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 mb-1">Container Number</label>
                        <input
                          type="text"
                          className="w-full p-2 border rounded-md bg-gray-100"
                          value={entry.containernumber || "None"}
                          readOnly
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 mb-1">Date</label>
                        <input
                          type="text"
                          className="w-full p-2 border rounded-md bg-gray-100"
                          value={
                            entry.date
                              ? typeof entry.date === "string"
                                ? entry.date.split("T")[0]
                                : new Date(entry.date).toISOString().split("T")[0]
                              : "None"
                          }
                          readOnly
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <p className="text-gray-500 text-center py-4">No driver information available for this leg.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
export default DirectorManagerViewAssignment
