"use client"

import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import "../finance clerkpages/css/UpdateInstruction.css"

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

const Plus = ({ onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center justify-center bg-blue-500 text-white w-10 h-10 rounded-full hover:bg-blue-600 transition-colors"
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
    drivers: [],
  })

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

  // Replace the useEffect that fetches legs with this updated version
  useEffect(() => {
    const fetchData = async () => {
      try {
        await fetchStartingPoints()
        await fetchDestinations()
        await fetchDrivers()
        await fetchTruckRegNums()

        // If we have an instructionId, fetch containers for this instruction
        if (instructionId) {
          await fetchContainersForInstruction(instructionId)
          await fetchLegsForInstruction(instructionId)
        } else {
          // Fallback to all containers if no specific instruction
          await fetchAllContainers()
        }
      } catch (error) {
        console.error("Error fetching initial data:", error)
      }
    }

    fetchData()
  }, [instructionId])

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

  // Replace the fetchLegsForInstruction function with this updated version
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
              containernumber: driver.containernumber ? driver.containernumber.toString() : "",
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
        if (fetchedLegs.length > 0 && currentLagIndex === null) {
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
    if (currentLagIndex === null) return

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

    // Show a message to remind user to save
    setSavedMessage("New leg added. Remember to click Save after entering details.")
    setTimeout(() => setSavedMessage(""), 3000)
  }

  // Replace the handleSelectLeg function with this updated version
  const handleSelectLeg = (index) => {
    // Save current leg data before switching
    if (currentLagIndex !== null) {
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
          containernumber: driver.containernumber ? driver.containernumber.toString() : "",
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
      drivers: [],
    })
  }

  // Update the handleStartingPointChange function to track edits
  const handleStartingPointChange = (e) => {
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

  const handleBackClick = () => {
    if (clientId) {
      navigate("/instructions", { state: { clientId } })
    } else {
      navigate("/instructions")
    }
  }

  // Update the handleSave function to clearly indicate when a new leg is being saved
  const handleSave = async () => {
    if (currentLagIndex === null) {
      setSavedMessage("Please select a leg first")
      setTimeout(() => setSavedMessage(""), 3000)
      return
    }

    if (!instructionId) {
      setSavedMessage("Missing instruction ID")
      setTimeout(() => setSavedMessage(""), 3000)
      return
    }

    // Validate required fields
    if (!formData.startingPoint || !formData.destination) {
      setSavedMessage("Starting point and destination are required")
      setTimeout(() => setSavedMessage(""), 3000)
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
      setSavedMessage(isNewLeg ? "New leg saved to database!" : "Leg updated successfully!")

      // Refresh the legs data to get updated information from the database
      await refreshLegData()

      setTimeout(() => setSavedMessage(""), 3000)
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

  return (
    <div className="min-h-screen bg-white" style={{ paddingBottom: 200 }}>
      <div className="">
        <button className="back-button" onClick={handleBackClick}>
          Back
        </button>
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
        <Plus onClick={handleAddLeg} />
      </div>

      {legs.length > 0 && (
        <div className="finalise-btn">
          <button
            className="finalise-btn2"
            onClick={() =>
              navigate("/Upload-Instruction-Documents", {
                state: { clientId, instructionId },
              })
            }
          >
            Finalise
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
              onClick={addDriver}
              className={`px-8 py-2 rounded-md transition-colors ${
                currentLagIndex !== null
                  ? "bg-blue-500 text-white hover:bg-blue-600"
                  : "bg-gray-400 text-gray-200 cursor-not-allowed"
              }`}
              disabled={currentLagIndex === null}
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
                <div className="grid grid-cols-4 gap-4 mb-4 font-medium">
                  <div>Drivers</div>
                  <div>Truck Reg Number</div>
                  <div>Container Number</div>
                  <div>Date</div>
                </div>

                {drivers.map((entry, index) => (
                  <div key={entry.id || index}>
                    <div className="grid grid-cols-4 gap-4 mb-2">
                      <div className="relative">
                        <select
                          className="w-full p-2 border rounded-md appearance-none pr-10"
                          value={entry.driverid || ""}
                          onChange={(e) => {
                            const updatedDrivers = [...drivers]
                            updatedDrivers[index].driverid = e.target.value

                            // Update full_name if a driver is selected
                            if (e.target.value) {
                              const selectedDriver = employeeDrivers.find((d) => d.userid.toString() === e.target.value)
                              if (selectedDriver) {
                                updatedDrivers[index].full_name = `${selectedDriver.name} ${selectedDriver.surname}`
                              }
                            } else {
                              updatedDrivers[index].full_name = ""
                            }

                            setDrivers(updatedDrivers)
                            console.log(`Updated driver at index ${index}:`, updatedDrivers[index])
                          }}
                        >
                          <option value="">Select driver</option>
                          {employeeDrivers.map((driver) => (
                            <option
                              key={driver.userid}
                              value={driver.userid.toString()}
                              selected={entry.driverid === driver.userid.toString()}
                            >
                              {driver.name} {driver.surname}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="relative">
                        <select
                          className="w-full p-2 border rounded-md appearance-none pr-10"
                          value={entry.truckregnumber || ""}
                          onChange={(e) => {
                            const updatedDrivers = [...drivers]
                            updatedDrivers[index].truckregnumber = e.target.value
                            setDrivers(updatedDrivers)
                            console.log(`Updated truck reg for driver at index ${index}:`, e.target.value)
                          }}
                        >
                          <option value="">Select Truck</option>
                          {truckRegOptions.map((truck) => (
                            <option key={truck} value={truck} selected={entry.truckregnumber === truck}>
                              {truck}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="relative">
                        <select
                          className="w-full p-2 border rounded-md appearance-none pr-10"
                          value={entry.containernumber || ""}
                          onChange={(e) => {
                            const updatedDrivers = [...drivers]
                            updatedDrivers[index].containernumber = e.target.value
                            setDrivers(updatedDrivers)
                            console.log(`Updated container for driver at index ${index}:`, e.target.value)
                          }}
                        >
                          <option value="">Select Container</option>
                          {containerOptions.map((container) => (
                            <option key={container} value={container} selected={entry.containernumber === container}>
                              {container}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
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
                            const updatedDrivers = [...drivers]
                            updatedDrivers[index].date = e.target.value
                            setDrivers(updatedDrivers)
                            console.log(`Updated date for driver at index ${index}:`, e.target.value)
                          }}
                        />
                      </div>
                    </div>

                    {/* Display current values from database */}
                    <div className="grid grid-cols-4 gap-4 mb-4 bg-gray-100 p-2 rounded text-sm">
                      <div>
                        <span className="font-semibold">Driver:</span>{" "}
                        {entry.full_name || (entry.driverid ? `ID: ${entry.driverid}` : "None")}
                      </div>
                      <div>
                        <span className="font-semibold">Truck:</span> {entry.truckregnumber || "None"}
                      </div>
                      <div>
                        <span className="font-semibold">Container:</span> {entry.containernumber || "None"}
                      </div>
                      <div>
                        <span className="font-semibold">Date:</span>{" "}
                        {entry.date
                          ? typeof entry.date === "string"
                            ? entry.date.split("T")[0]
                            : new Date(entry.date).toISOString().split("T")[0]
                          : "None"}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <p className="text-gray-500 text-center py-4">
                No driver information available for this leg. Click "Add Driver" to add a driver.
              </p>
            )}

            {drivers.length > 0 && (
              <div className="flex justify-center mt-6">
                <button className="save-btn" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            )}

            {savedMessage && (
              <div className="mt-4 text-center">
                <p className={savedMessage.includes("Error") ? "text-red-500" : "text-green-500"}>{savedMessage}</p>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Debug Panel */}
      <div className="bg-gray-100 p-4 mt-8 rounded-md">
        <h3 className="text-lg font-medium mb-2">Debug Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium">Current Leg Index: {currentLagIndex !== null ? currentLagIndex : "None"}</h4>
            <h4 className="font-medium mt-2">Form Data:</h4>
            <pre className="bg-white p-2 rounded text-xs overflow-auto max-h-40">
              {JSON.stringify(formData, null, 2)}
            </pre>
          </div>
          <div>
            <h4 className="font-medium">Current Drivers:</h4>
            <pre className="bg-white p-2 rounded text-xs overflow-auto max-h-40">
              {JSON.stringify(drivers, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
export default UpdateInstruction

