"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import "../finance clerkpages/css/UpdateInstruction.css"

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
  

  // const driverOptions = ["John Smith", "Sarah Johnson", "Mike Davis", "Emma Wilson"]
  // const truckRegOptions = ["TR-1234", "TR-5678", "TR-9012", "TR-3456"]
  const [truckRegOptions, setTruckRegOptions] = useState([]);

  useEffect(() => {
    // Fetch starting points and destinations when the component mounts
    fetchStartingPoints()
    fetchDestinations()
    fetchDrivers() // Fetch employees with role=5
    fetchTruckRegNums();
  }, [])

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
      const response = await fetch("http://localhost:5000/trucks/regnums");
      if (!response.ok) {
        throw new Error("Failed to fetch truck registration numbers");
      }
      const data = await response.json();
      console.log("Truck registration numbers from backend:", data);
      setTruckRegOptions(data);
    } catch (error) {
      console.error("Error fetching truck registration numbers:", error);
    }
  };

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

        // Clear the driver rate field
        setFormData((prev) => ({
          ...prev,
          driverRate: "",
        }))

        // If we're editing a leg, update it with empty rate
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
    const newDriver = {
      id: Date.now(),
      driver: "",
      truckRegNumber: "",
      containerNumber: "",
      date: "",
    }
    setDrivers([...drivers, newDriver])
  }

  const handleAddLeg = () => {
    const newLeg = {
      startingPoint: "",
      driverRate: "",
      destination: "",
    }
    setLegs([...legs, newLeg])
    setCurrentLagIndex(legs.length)
    setFormData(newLeg)
  }

  const handleSelectLeg = (index) => {
    if (currentLagIndex !== null) {
      const updatedLegs = [...legs]
      updatedLegs[currentLagIndex] = formData
      setLegs(updatedLegs)
    }
    setFormData(legs[index])
    setCurrentLagIndex(index)
  }

  const handleStartingPointChange = (e) => {
    const startingPoint = e.target.value
    // Clear any previous error message when making a new selection
    setRateError("")

    const updatedFormData = {
      ...formData,
      startingPoint,
    }
    setFormData(updatedFormData)

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

  const handleDestinationChange = (e) => {
    const destination = e.target.value
    // Clear any previous error message when making a new selection
    setRateError("")

    const updatedFormData = {
      ...formData,
      destination,
    }
    setFormData(updatedFormData)

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

  return (
    <div className="min-h-screen bg-white" style={{paddingBottom:200}}>
      <div className="">
        <button className="back-button" onClick={() => navigate("/instructions")}>
          Back
        </button>
      </div>

      <br />
      {/* Lag Buttons & Plus */}
      <div className="flex gap-4 mb-4" style={{ marginLeft: "15px" }}>
        {legs.map((_, index) => (
          <button
            key={index}
            className={`px-4 py-2 rounded-md ${currentLagIndex === index ? "bg-green-500 text-white" : "bg-gray-200 text-gray-800"}`}
            onClick={() => handleSelectLeg(index)}
          >
            Leg {index + 1}
          </button>
        ))}
        <Plus onClick={handleAddLeg} />
      </div>

      {/* Main Form */}
      <div className="px-4">
        <div className="bg-blue-50 p-6 rounded-md mb-4">
          <div className="flex flex-wrap gap-6 items-center">
            <div className="flex-1 min-w-[100px]">
              <label className="block text-gray-700 mb-2">Starting Point</label>
              <div className="relative">
                <select
                  className="w-full p-2 border rounded-md appearance-none pr-10"
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
              <label className="block text-gray-700 mb-2">Driver Rate</label>
              <input type="text" className="w-full p-2 border rounded-md" value={formData.driverRate} readOnly />
              {rateError && <p className="text-red-500 text-sm mt-1">{rateError}</p>}
            </div>

            <div className="flex-1 min-w-[100px]">
              <label className="block text-gray-700 mb-2">Destination</label>
              <div className="relative">
                <select
                  className="w-full p-2 border rounded-md appearance-none pr-10"
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
              className="bg-blue-500 text-white px-8 py-2 rounded-md hover:bg-blue-600 transition-colors"
            >
              Add Driver
            </button>
          </div>
        </div>

        {/* Driver Entries */}
        <div className="bg-blue-50 p-6 rounded-md mb-4">
          {drivers.length > 0 && (
            <div className="grid grid-cols-4 gap-4 mb-4 font-medium">
              <div>Drivers</div>
              <div>Truck Reg Number</div>
              <div>Container Number</div>
              <div>Date</div>
            </div>
          )}

          {drivers.map((entry, index) => (
            <div key={entry.id} className="grid grid-cols-4 gap-4 mb-4">
              <div className="relative">
                <select
                  className="w-full p-2 border rounded-md appearance-none pr-10"
                  value={entry.driver}
                  onChange={(e) => {
                    const updatedDrivers = [...drivers]
                    updatedDrivers[index].driver = e.target.value
                    setDrivers(updatedDrivers)
                  }}
                >
                  <option value="">Select driver</option>
                  {employeeDrivers.map((driver) => (
                    <option key={driver.m5employeekey} value={driver.m5employeekey}>
                      {driver.name} {driver.surname}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <select
                  className="w-full p-2 border rounded-md appearance-none pr-10"
                  value={entry.truckRegNumber}
                  onChange={(e) => {
                    const updatedDrivers = [...drivers]
                    updatedDrivers[index].truckRegNumber = e.target.value
                    setDrivers(updatedDrivers)
                  }}
                >
                  <option value="">Select truck</option>
                  {truckRegOptions.map((truck) => (
                    <option key={truck} value={truck}>
                      {truck}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <input
                  type="text"
                  className="w-full p-2 border rounded-md"
                  placeholder="Container Number"
                  value={entry.containerNumber}
                  onChange={(e) => {
                    const updatedDrivers = [...drivers]
                    updatedDrivers[index].containerNumber = e.target.value
                    setDrivers(updatedDrivers)
                  }}
                />
              </div>

              <div>
                <input
                  type="date"
                  className="w-full p-2 border rounded-md"
                  value={entry.date}
                  onChange={(e) => {
                    const updatedDrivers = [...drivers]
                    updatedDrivers[index].date = e.target.value
                    setDrivers(updatedDrivers)
                  }}
                />
              </div>
            </div>
          ))}

          {drivers.length > 0 && (
            <div className="flex justify-center mt-6">
              <button
                className="bg-green-300 text-gray-800 px-8 py-2 rounded-md hover:bg-green-400 transition-colors"
                onClick={() => navigate("/Upload-Instruction-Documents")}
              >
                Complete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
export default UpdateInstruction

