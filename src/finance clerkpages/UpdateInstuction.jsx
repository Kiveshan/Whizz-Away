import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../finance clerkpages/css/UpdateInstruction.css";

const Plus = ({ onClick }) => (
    <button
        onClick={onClick}
        className="flex items-center justify-center bg-blue-500 text-white w-10 h-10 rounded-full hover:bg-blue-600 transition-colors"
    >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
            <path d="M12 5v14" />
        </svg>
    </button>
);

function UpdateInstruction() {
    const navigate = useNavigate();
    const [drivers, setDrivers] = useState([]);
    const [legs, setLegs] = useState([]);
    const [currentLagIndex, setCurrentLagIndex] = useState(null);
    const [formData, setFormData] = useState({
        startingPoint: "",
        driverRate: "",
        destination: "",
    });

    const driverOptions = ["John Smith", "Sarah Johnson", "Mike Davis", "Emma Wilson"];
    const truckRegOptions = ["TR-1234", "TR-5678", "TR-9012", "TR-3456"];

    const addDriver = () => {
        const newDriver = {
            id: Date.now(),
            driver: "",
            truckRegNumber: "",
            containerNumber: "",
            date: "",
        };
        setDrivers([...drivers, newDriver]);
    };

    const handleAddLeg = () => {
        const newLeg = {
            startingPoint: "",
            driverRate: "",
            destination: "",
        };
        setLegs([...legs, newLeg]);
        setCurrentLagIndex(legs.length);
        setFormData(newLeg);
    };

    const handleSelectLeg = (index) => {
        if (currentLagIndex !== null) {
            const updatedLags = [...legs];
            updatedLags[currentLagIndex] = formData;
            setLegs(updatedLags);
        }
        setFormData(legs[index]);
        setCurrentLagIndex(index);
    };

    const fetchDriverRate = async (startingPoint, destination) => {
        try {
            const response = await fetch(
                `http://localhost:5000/api/driver-rate`
            );
            if (response.ok) {
                const data = await response.json();
                setFormData({ ...formData, driverRate: data.rate });
            } else {
                setFormData({ ...formData, driverRate: "Rate not found" });
            }
        } catch (error) {
            console.error("Error fetching driver rate:", error);
            setFormData({ ...formData, driverRate: "Error fetching rate" });
        }
    };

    const handleStartingPointChange = (event) => {
        const newStartingPoint = event.target.value;
        setFormData({ ...formData, startingPoint: newStartingPoint });
        if (formData.destination) {
            fetchDriverRate(newStartingPoint, formData.destination);
        }
    };

    const handleDestinationChange = (event) => {
        const newDestination = event.target.value;
        setFormData({ ...formData, destination: newDestination });
        if (formData.startingPoint) {
            fetchDriverRate(formData.startingPoint, newDestination);
        }
    };

    return (
        <div className="min-h-screen bg-white">
            <div className="">
                <button className="back-button" onClick={() => navigate("/instructions")}>
                    Back
                </button>
            </div>
            <br />
            {/* Lag Buttons & Plus */}
            <div className="flex gap-4 mb-4" style={{ marginLeft: '15px' }}>
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
                                    <option value="Durban">Durban</option>
                                    <option value="Cape Town">Cape Town</option>
                                    <option value="Pretoria">Pretoria</option>
                                    <option value="Johannesburg">Johannesburg</option>
                                    <option value="East London">East London</option>
                                    <option value="Polokwane">Polokwane</option>
                                    <option value="George">George</option>
                                </select>
                            </div>
                        </div>

                        <div className="w-[100px]">
                            <label className="block text-gray-700 mb-2">Driver Rate</label>
                            <input
                                type="text"
                                className="w-full p-2 border rounded-md"
                                value={formData.driverRate}
                                readOnly
                            />
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
                                    <option value="Johannesburg">Johannesburg</option>
                                    <option value="Port Elizabeth">Port Elizabeth</option>
                                    <option value="Bloemfontein">Bloemfontein</option>
                                    <option value="Cape Town">Cape Town</option>
                                    <option value="Durban">Durban</option>
                                    <option value="East London">East London</option>
                                    <option value="Kimberly">Kimberly</option>
                                    <option value="Nelspruit">Nelspruit</option>
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
                                        const updatedDrivers = [...drivers];
                                        updatedDrivers[index].driver = e.target.value;
                                        setDrivers(updatedDrivers);
                                    }}
                                >
                                   
                  <option value="">Select driver</option>
                  {driverOptions.map(driver => (
                    <option key={driver} value={driver}>{driver}</option>
                  ))}
                </select>
                
              </div>
              
              <div className="relative">
                <select 
                  className="w-full p-2 border rounded-md appearance-none pr-10"
                  value={entry.truckRegNumber}
                  onChange={(e) => {
                    const updatedDrivers = [...drivers];
                    updatedDrivers[index].truckRegNumber = e.target.value;
                    setDrivers(updatedDrivers);
                  }}
                >
                  <option value="">Select truck</option>
                  {truckRegOptions.map(truck => (
                    <option key={truck} value={truck}>{truck}</option>
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
                    const updatedDrivers = [...drivers];
                    updatedDrivers[index].containerNumber = e.target.value;
                    setDrivers(updatedDrivers);
                  }}
                />
              </div>
              
              <div>
                <input 
                  type="date" 
                  className="w-full p-2 border rounded-md"
                  value={entry.date}
                  onChange={(e) => {
                    const updatedDrivers = [...drivers];
                    updatedDrivers[index].date = e.target.value;
                    setDrivers(updatedDrivers);
                  }}
                />
              </div>
            </div>
          ))}
          
          {drivers.length > 0 && (
            <div className="flex justify-center mt-6">
              <button className="bg-green-300 text-gray-800 px-8 py-2 rounded-md hover:bg-green-400 transition-colors" onClick={() => navigate("/Upload-Instruction-Documents")}>
                Complete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default UpdateInstruction;