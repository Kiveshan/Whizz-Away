
"use client";

import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../css/UpdateInstruction.css";
import api from "../../../api";
const normalizeString = (str) => {
  if (!str) return '';
  return str.toLowerCase().replace(/\s+/g, '').trim();
};

  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
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
`;

// Add this debug function at the top of the component
const debugDriverData = (drivers) => {
  if (!drivers || drivers.length === 0) {
    console.log("No drivers to debug");
    return;
  }

  console.log("Debugging driver data:");
  drivers.forEach((driver, index) => {
    console.log(`Driver ${index}:`);
    console.log(`  ID: ${driver.id} (${typeof driver.id})`);
    console.log(`  Driver ID: ${driver.driverid} (${typeof driver.driverid})`);
    console.log(
      `  Truck Reg: ${driver.truckregnumber} (${typeof driver.truckregnumber})`
    );
    console.log(
      `  Container: ${
        driver.containernumber
      } (${typeof driver.containernumber})`
    );
    console.log(`  Container Type: ${driver.container_type}`);
    console.log(`  Date: ${driver.date} (${typeof driver.date})`);
    console.log(`  Full Name: ${driver.full_name}`);
    console.log(`  Driver Rate: ${driver.driverRate}`);
  });
};

const Plus = ({ onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center justify-center ${
      disabled
        ? "bg-gray-400 cursor-not-allowed"
        : "bg-blue-500 hover:bg-blue-600"
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
);

function UpdateInstruction() {
  const navigate = useNavigate();
  const location = useLocation();
  const clientId = location.state?.clientId;
  const instructionId = location.state?.instructionId || null;
  const selectedLegIndex = location.state?.selectedLegIndex;

  // Add a ref to track if we're coming from the documents page
  const isFromDocumentsPage = useRef(selectedLegIndex !== undefined);

  // Add a ref to the Add Driver button for positioning the modal
  const addDriverButtonRef = useRef(null);

  const [drivers, setDrivers] = useState([]);
  const [legs, setLegs] = useState([]);
  const [currentLagIndex, setCurrentLagIndex] = useState(null);
  const [formData, setFormData] = useState({
    startingPoint: "",
    driverRate: "",
    destination: "",
  });
  const [startingPoints, setStartingPoints] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [rateError, setRateError] = useState("");
  const [employeeDrivers, setEmployeeDrivers] = useState([]);
  const [truckRegOptions, setTruckRegOptions] = useState([]);
  const [containerOptions, setContainerOptions] = useState([]);
  const [hasUnsavedNewLeg, setHasUnsavedNewLeg] = useState(false);
  const [containerDetailsMap, setContainerDetailsMap] = useState({}); // Map to store container details by number
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [existingDrivers, setExistingDrivers] = useState([]);
  const [noRatesRoutes, setNoRatesRoutes] = useState(new Set());
  // Add a visual indicator for edited fields
  const [editedFields, setEditedFields] = useState({
    startingPoint: false,
    destination: false,
    driverRate: false,
    drivers: {}, // Change from array to object to track changes by driver ID
  });
  // Flag to track if initial data has been loaded
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [shipmentType, setShipmentType] = useState(null);
  const [showMismatchModal, setShowMismatchModal] = useState(false);
  const [mismatchDetails, setMismatchDetails] = useState({
    lastLegDestination: "",
    dropoff: "",
  });
  // New state for container validation
  const [showContainerModal, setShowContainerModal] = useState(false);
  const [containerValidationDetails, setContainerValidationDetails] = useState({
    missingContainers: [],
    dropoff: "",
  });
  const [instructionContainers, setInstructionContainers] = useState([]);
  // New state for unsaved changes modal
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
  // Add state for missing fields modal
  const [showMissingFieldsModal, setShowMissingFieldsModal] = useState(false);
  const [missingFields, setMissingFields] = useState([]);
  // New state for pickup validation
  const [showPickupMismatchModal, setShowPickupMismatchModal] = useState(false);
  const [pickupMismatchDetails, setPickupMismatchDetails] = useState({
    firstLegStartingPoint: "",
    pickup: "",
  });
  // Add state for no drivers modal
  const [showNoDriversModal, setShowNoDriversModal] = useState(false);
  // Add state for back button confirmation modal
  const [showBackConfirmModal, setShowBackConfirmModal] = useState(false);
  // Add state for driver removal confirmation modal
  const [showRemoveDriverModal, setShowRemoveDriverModal] = useState(false);
  const [driverToRemove, setDriverToRemove] = useState({
    index: null,
    name: "",
  });
  // Add after the driverToRemove state
  const [showRemoveLegModal, setShowRemoveLegModal] = useState(false);
  const [legToRemove, setLegToRemove] = useState({
    index: null,
    number: null,
    id: null,
  });
  const [instructionStatus, setInstructionStatus] = useState("");
  // Add this state variable at the top with other state variables
  const [shouldHideAddLegButton, setShouldHideAddLegButton] = useState(false);
const [hasProcessedSelectedLeg, setHasProcessedSelectedLeg] = useState(false);
  // Add this state variable with the other state variables
  const [showDuplicateDriverModal, setShowDuplicateDriverModal] =
    useState(false);
  const [duplicateDriverInfo, setDuplicateDriverInfo] = useState(null);
  const [rateWeight, setRateWeight] = useState(null);
const [isWeightBased, setIsWeightBased] = useState(false);
const [weightUnit, setWeightUnit] = useState('kg');
  // Add this state for container already reached dropoff modal
  const [showContainerReachedModal, setShowContainerReachedModal] =
    useState(false);
  const [containerReachedDetails, setContainerReachedDetails] = useState({
    containerNumber: "",
  });

  // Add a new state variable to track which legs have been saved
  // Add this after the other state variables (around line 200)
  const [savedLegs, setSavedLegs] = useState(new Set());

  // Add these state variables after the other state declarations
  const [rates, setRates] = useState({
    six_meter: 0,
    twelve_meter: 0,
    subbie_six_meter: 0,
    subbie_twelve_meter: 0,
  });
  const checkIfWeightBased = async () => {
  if (!instructionId) return;
  
  try {
    const response = await api.get(`/instructions/${instructionId}/details`);
    const rateWeightValue = response.data.rateweight;
    
    console.log('Rate weight value:', rateWeightValue);
    setRateWeight(rateWeightValue);
    
    const isWeight = rateWeightValue && rateWeightValue.toLowerCase() !== 'container';
    setIsWeightBased(isWeight);
    
    // Determine weight unit from rateweight value
    if (isWeight) {
      const unit = rateWeightValue.toLowerCase().includes('ton') ? 'ton' : 'kg';
      setWeightUnit(unit);
      console.log(`Weight-based instruction detected. Unit: ${unit}`);
    }
    
  } catch (error) {
    console.error('Error checking rate weight:', error);
  }
};
  // Improve the refreshLegData function to ensure data is properly refreshed
  // Update refreshLegData function to use Axios
  const refreshLegData = async () => {
    if (instructionId) {
      try {
        console.log("Refreshing leg data for instruction:", instructionId);

        const response = await api.get(`/legs/${instructionId}`, {
          params: { t: Date.now() },
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });

        const data = response.data;
        console.log(
          "Refreshed legs data from server:",
          JSON.stringify(data, null, 2)
        );

        if (data.length > 0) {
          const fetchedLegs = data.map((leg) => {
            return {
              id: leg.legkey,
              legnumber: leg.legnumber,
              startingPoint: leg.startingpoint,
              destination: leg.destination,
              driverRate: leg.driverrate ? leg.driverrate.toString() : "",
              drivers: (leg.drivers || []).map((driver) => ({
                ...driver,
                container_type: driver.container_type || "",
                driverRate: driver.driverRate || driver.driverate || "",
                isAbnormal: driver.container_type === "abnormal",
              })),
            };
          });

          console.log(
            "Transformed refreshed legs data:",
            JSON.stringify(fetchedLegs, null, 2)
          );
          setLegs(fetchedLegs);

          const savedLegIndexes = new Set();
          fetchedLegs.forEach((leg, index) => {
            if (
              leg.id &&
              !leg.id.toString().startsWith("temp-") &&
              !leg.isNew
            ) {
              savedLegIndexes.add(index);
            }
          });
          setSavedLegs(savedLegIndexes);
          console.log("Updated savedLegs:", Array.from(savedLegIndexes));

          if (
            currentLagIndex !== null &&
            currentLagIndex < fetchedLegs.length
          ) {
            const currentLeg = fetchedLegs[currentLagIndex];
            setFormData({
              startingPoint: currentLeg.startingPoint || "",
              driverRate: currentLeg.driverRate || "",
              destination: currentLeg.destination || "",
            });

            if (currentLeg.drivers && currentLeg.drivers.length > 0) {
              console.log(
                "Setting drivers for refreshed leg:",
                currentLeg.drivers
              );
              setDrivers(currentLeg.drivers);
              debugDriverData(currentLeg.drivers);
            } else {
              setDrivers([]);
            }
          }

          console.log("Leg data refreshed successfully");
        }
      } catch (error) {
        console.error("Error refreshing leg data:", error);
      }
    }
  };
  // Add this function to handle leg removal
  // Update handleRemoveLeg to use Axios
  const handleRemoveLeg = async (legIndex, legId) => {
    if (legIndex === 0) {
      setSavedMessage("Cannot remove the first leg");
      setTimeout(() => setSavedMessage(""), 3000);
      return;
    }

    setLegToRemove({
      index: legIndex,
      number: legIndex + 1,
      id: legId,
    });
    setShowRemoveLegModal(true);
  };
useEffect(() => {
  const fetchData = async () => {
    try {
      await fetchDrivers();
      await fetchTruckRegNums();
      await fetchShipmentType();
      await checkIfWeightBased();

      if (instructionId) {
        await fetchContainersForInstruction(instructionId);
        await fetchLegsForInstruction(instructionId);
        await fetchStartingPoints();
        await fetchDestinations();
        setInitialDataLoaded(true);
      } else {
        await fetchStartingPoints();
        await fetchDestinations();
        await fetchAllContainers();
        setInitialDataLoaded(true);
      }
    } catch (error) {
      console.error("Error fetching initial data:", error);
      setInitialDataLoaded(true);
    }
  };

  fetchData();

  return () => {
    // Cleanup function
    isFromDocumentsPage.current = false;
    setHasProcessedSelectedLeg(false);
    handleSelectLeg.isProcessing = false; // Reset processing flag
    
    // Clear any pending timeouts or intervals if needed
    if (instructionId) {
      console.log("Cleaning up UpdateInstruction component");
    }
  };
}, [instructionId]);

  // Replace the entire useEffect that handles the selectedLegIndex with this version
useEffect(() => {
  // Only run once when we have a selectedLegIndex from navigation
  if (
    initialDataLoaded &&
    selectedLegIndex !== undefined &&
    legs.length > 0 &&
    !hasProcessedSelectedLeg && // Add this check
    selectedLegIndex < legs.length
  ) {
    console.log(`Processing selectedLegIndex ${selectedLegIndex} - ONE TIME ONLY`);
    
    handleSelectLeg(selectedLegIndex);
    setHasProcessedSelectedLeg(true); // Mark as processed
  }
}, [initialDataLoaded, legs.length, selectedLegIndex, hasProcessedSelectedLeg]);

  // Replace the fetchLegsForInstruction function with this updated version
  // Update fetchInstructionDetails in useEffect
  useEffect(() => {
    const fetchInstructionDetails = async () => {
      if (location.state?.isCompleted !== undefined) {
        setIsCompleted(location.state.isCompleted);
      } else if (instructionId) {
        try {
          const response = await api.get(`/instructions/${instructionId}`);
          const data = response.data;
          setIsCompleted(data.is_completed || data.status === "Completed");
          setInstructionStatus(data.status);
        } catch (error) {
          console.error("Error fetching instruction details:", error);
        }
      }
    };

    fetchInstructionDetails();
  }, [instructionId, location.state]);

  // In the fetchLegsForInstruction function in UpdateInstruction.jsx
  // Update fetchLegsForInstruction to use Axios
  const fetchLegsForInstruction = async (instructionId) => {
    try {
      console.log(`Fetching legs for instruction ID: ${instructionId}`);
      const response = await api.get(`/legs/${instructionId}`);
      const data = response.data;
      console.log("Legs data from server:", JSON.stringify(data, null, 2));

      if (data.length > 0 && data[0].startingpoint && data[0].destination) {
        try {
          console.log(
            "Fetching rates for route:",
            data[0].startingpoint,
            data[0].destination
          );
          const rateResponse = await api.get("/api/driver-rates-with-subbie", {
            params: {
              startingpoint: data[0].startingpoint,
              destination: data[0].destination,
            },
          });

          const rateData = rateResponse.data;
          console.log("Fetched rates:", rateData);

          setRates({
            six_meter: rateData.driver_six_meter_rate || 0,
            twelve_meter: rateData.driver_twelve_meter_rate || 0,
            subbie_six_meter: rateData.subie_six_meter_rate || 0,
            subbie_twelve_meter: rateData.subie_twelve_meter_rate || 0,
          });

          console.log("Updated rates state:", {
            six_meter: rateData.driver_six_meter_rate || 0,
            twelve_meter: rateData.driver_twelve_meter_rate || 0,
            subbie_six_meter: rateData.subie_six_meter_rate || 0,
            subbie_twelve_meter: rateData.subie_twelve_meter_rate || 0,
          });
        } catch (error) {
          console.error("Error fetching rates:", error);
        }
      }

      const containerResponse = await api.get(
        `/containers/instruction/${instructionId}`
      );
      const containerData = containerResponse.data;
      console.log(
        "Container data from server:",
        JSON.stringify(containerData, null, 2)
      );

      const containerTypeMap = {};
      containerData.forEach((container) => {
        if (container.containernum && container.container_type) {
          containerTypeMap[container.containernum] = container.container_type;
        }
      });
      console.log("Container type map:", containerTypeMap);

      if (data.length > 0) {
        const fetchedLegs = data.map((leg) => {
          if (leg.drivers) {
            console.log(
              `Leg ${leg.legkey} has ${leg.drivers.length} drivers:`,
              JSON.stringify(leg.drivers, null, 2)
            );
          } else {
            console.log(`Leg ${leg.legkey} has no drivers`);
          }

          const normalizedDrivers = (leg.drivers || []).map((driver) => {
            let containerType = driver.container_type || "";
            if (
              !containerType &&
              driver.containernumber &&
              containerTypeMap[driver.containernumber]
            ) {
              containerType = containerTypeMap[driver.containernumber];
              console.log(
                `Found container type ${containerType} for container ${driver.containernumber} from map`
              );
            }

            const normalizedDriver = {
              id: driver.id || Date.now() + Math.random(),
              driverid: driver.driverid ? driver.driverid.toString() : "",
              truckregnumber: driver.truckregnumber || "",
              containernumber:
                driver.containernumber !== null
                  ? driver.containernumber.toString()
                  : "",
              container_type: containerType,
              date: driver.date || "",
              driver_name: driver.driver_name || "",
              driver_surname: driver.driver_surname || "",
              driverRate: driver.driverRate || "",
              isAbnormal: containerType === "abnormal",
              full_name:
                driver.full_name ||
                (driver.driver_name && driver.driver_surname
                  ? `${driver.driver_name} ${driver.driver_surname}`
                  : driver.driverid
                  ? `Driver ID: ${driver.driverid}`
                  : "Unknown Driver"),
            };

            console.log(
              `Normalized driver:`,
              JSON.stringify(normalizedDriver, null, 2)
            );
            console.log(
              `Driver ID type: ${typeof normalizedDriver.driverid}, value: ${
                normalizedDriver.driverid
              }`
            );
            console.log(
              `Truck Reg type: ${typeof normalizedDriver.truckregnumber}, value: ${
                normalizedDriver.truckregnumber
              }`
            );
            console.log(
              `Container Number type: ${typeof normalizedDriver.containernumber}, value: ${
                normalizedDriver.containernumber
              }`
            );
            console.log(`Container Type: ${normalizedDriver.container_type}`);
            console.log(`Driver Rate: ${normalizedDriver.driverRate}`);

            return normalizedDriver;
          });

          return {
            id: leg.legkey,
            legnumber: leg.legnumber,
            startingPoint: leg.startingpoint,
            destination: leg.destination,
            driverRate: leg.driverrate ? leg.driverrate.toString() : "",
            drivers: normalizedDrivers,
          };
        });

        console.log(
          "Transformed legs data:",
          JSON.stringify(fetchedLegs, null, 2)
        );
        setLegs(fetchedLegs);

        const savedLegIndexes = new Set();
        fetchedLegs.forEach((leg, index) => {
          if (leg.id && !leg.id.toString().startsWith("temp-") && !leg.isNew) {
            savedLegIndexes.add(index);
          }
        });
        setSavedLegs(savedLegIndexes);
        console.log("Initialized savedLegs:", Array.from(savedLegIndexes));

        const allDrivers = fetchedLegs.flatMap((leg) => leg.drivers || []);
        setExistingDrivers(allDrivers);
        console.log(
          "All existing drivers:",
          JSON.stringify(allDrivers, null, 2)
        );

        if (
          fetchedLegs.length > 0 &&
          currentLagIndex === null &&
          selectedLegIndex === undefined
        ) {
          setCurrentLagIndex(0);
          setFormData({
            startingPoint: fetchedLegs[0].startingPoint || "",
            driverRate: fetchedLegs[0].driverRate || "",
            destination: fetchedLegs[0].destination || "",
          });

          if (fetchedLegs[0].drivers && fetchedLegs[0].drivers.length > 0) {
            console.log(
              "Setting drivers for first leg:",
              JSON.stringify(fetchedLegs[0].drivers, null, 2)
            );
            setDrivers(fetchedLegs[0].drivers);
            debugDriverData(fetchedLegs[0].drivers);
          } else {
            console.log("No drivers for first leg, setting empty array");
            setDrivers([]);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching legs:", error);
    }
  };

const fetchContainersForInstruction = async (instructionId) => {
  try {
    // Only fetch containers if this is NOT a weight-based instruction
    if (!isWeightBased) {
      const response = await api.get(`/containers/instruction/${instructionId}`);
      const data = response.data;
      console.log("Containers for instruction:", data);

      setInstructionContainers(data);

      const containerMap = {};
      data.forEach((container) => {
        containerMap[container.containernum.toString()] = {
          type: container.container_type || "",
          weight: container.weight,
          dropoff: container.dropoff,
        };
      });
      setContainerDetailsMap(containerMap);
      console.log("Container details map:", containerMap);

      setContainerOptions(
        data.map((container) => container.containernum.toString())
      );
    } else {
      // For weight-based instructions, clear container-related state
      setInstructionContainers([]);
      setContainerDetailsMap({});
      setContainerOptions([]);
      console.log("Weight-based instruction - skipping container fetch");
    }
  } catch (error) {
    console.error("Error fetching containers for instruction:", error);
    if (!isWeightBased) {
      fetchAllContainers();
    }
  }
};

  // Update fetchAllContainers to use Axios
  const fetchAllContainers = async () => {
    try {
      const response = await api.get("/containers/numbers");
      const data = response.data;
      console.log("All container numbers:", data);
      setContainerOptions(data);
    } catch (error) {
      console.error("Error fetching container numbers:", error);
    }
  };

  // Update fetchDrivers to use Axios
  const fetchDrivers = async () => {
    try {
      const response = await api.get("/employees/driverssub");
      const data = response.data;
      console.log("Drivers from backend:", data);
      setEmployeeDrivers(data);
    } catch (error) {
      console.error("Error fetching drivers:", error);
    }
  };

  // Update fetchTruckRegNums to use Axios
  const fetchTruckRegNums = async () => {
    try {
      const response = await api.get("/trucks/regnums");
      const data = response.data;
      console.log("Truck registration numbers from backend:", data);
      setTruckRegOptions(data);
    } catch (error) {
      console.error("Error fetching truck registration numbers:", error);
    }
  };

  // Update fetchStartingPoints to use Axios
  const fetchStartingPoints = async () => {
    try {
      const response = await api.get("/starting-points");
      const driverRatePoints = response.data;
      console.log("Starting points from m5_driver_rate:", driverRatePoints);

      let legStartingPoints = [];
      if (instructionId) {
        try {
          const legResponse = await api.get(`/legs/${instructionId}`);
          const legData = legResponse.data;
          legStartingPoints = [
            ...new Set(legData.map((leg) => leg.startingpoint).filter(Boolean)),
          ];
          console.log("Starting points from saved legs:", legStartingPoints);
        } catch (error) {
          console.error("Error fetching starting points from legs:", error);
        }
      }

      const allStartingPoints = [
        ...new Set([...driverRatePoints, ...legStartingPoints]),
      ];
      console.log("Combined starting points:", allStartingPoints);

      setStartingPoints(allStartingPoints);
    } catch (error) {
      console.error("Error fetching starting points:", error);
    }
  };

  // Replace the existing fetchDestinations function with this updated version
  // Update fetchDestinations to use Axios
  const fetchDestinations = async () => {
    try {
      const response = await api.get("/destinations");
      const driverRateDestinations = response.data;
      console.log("Destinations from m5_driver_rate:", driverRateDestinations);

      let legDestinations = [];
      if (instructionId) {
        try {
          const legResponse = await api.get(`/legs/${instructionId}`);
          const legData = legResponse.data;
          legDestinations = [
            ...new Set(legData.map((leg) => leg.destination).filter(Boolean)),
          ];
          console.log("Destinations from saved legs:", legDestinations);
        } catch (error) {
          console.error("Error fetching destinations from legs:", error);
        }
      }

      const allDestinations = [
        ...new Set([...driverRateDestinations, ...legDestinations]),
      ];
      console.log("Combined destinations:", allDestinations);

      setDestinations(allDestinations);
    } catch (error) {
      console.error("Error fetching destinations:", error);
    }
  };

  // Update the fetchRate function to return a Promise so we can chain .then() calls
  // Update fetchRate to use Axios
  const fetchRate = async (startingPoint, destination) => {
    console.log(
      `fetchRate called with: startingPoint=${startingPoint}, destination=${destination}`
    );
    if (!startingPoint || !destination) return Promise.resolve();

    const routeKey = `${startingPoint}-${destination}`;

    try {
      setRateError("");

      setRates({
        six_meter: 0,
        twelve_meter: 0,
        subbie_six_meter: 0,
        subbie_twelve_meter: 0,
      });

      if (noRatesRoutes.has(routeKey)) {
        console.log(
          `Route ${routeKey} is known to have no rates, skipping fetch`
        );
        setFormData((prev) => ({
          ...prev,
          driverRate: "0",
        }));
        if (drivers.length > 0) {
          const updatedDrivers = drivers.map((driver) => ({
            ...driver,
            driverRate: "0",
            isAbnormal:
              driver.container_type === "abnormal" ? true : driver.isAbnormal,
          }));
          setDrivers(updatedDrivers);
        }
        if (currentLagIndex !== null) {
          const updatedLegs = [...legs];
          updatedLegs[currentLagIndex] = {
            ...updatedLegs[currentLagIndex],
            driverRate: "0",
          };
          setLegs(updatedLegs);
        }
        return Promise.resolve(); // Resolve successfully when no rates are found
      }

      console.log(
        `Sending request to /api/driver-rates-with-subbie with params:`,
        {
          startingpoint: startingPoint,
          destination: destination,
        }
      );
      const response = await api.get("/api/driver-rates-with-subbie", {
        params: {
          startingpoint: startingPoint,
          destination: destination,
        },
      });

      // Handle 404 as a successful case since no rates are a valid scenario
      if (response.status === 404) {
        setRateError("Driver rate not available for this route");
        setNoRatesRoutes((prev) => {
          const newSet = new Set(prev);
          newSet.add(routeKey);
          return newSet;
        });
        console.log(`Added route ${routeKey} to noRatesRoutes set`);
        setFormData((prev) => ({
          ...prev,
          driverRate: "0",
        }));
        if (drivers.length > 0) {
          const updatedDrivers = drivers.map((driver) => ({
            ...driver,
            driverRate: "0",
            isAbnormal:
              driver.container_type === "abnormal" ? true : driver.isAbnormal,
          }));
          setDrivers(updatedDrivers);
        }
        if (currentLagIndex !== null) {
          const updatedLegs = [...legs];
          updatedLegs[currentLagIndex] = {
            ...updatedLegs[currentLagIndex],
            driverRate: "0",
          };
          setLegs(updatedLegs);
        }
        return Promise.resolve(); // Resolve successfully instead of letting it fall into catch
      }

      const data = response.data;
      console.log("Rates from backend:", data);

      setNoRatesRoutes((prev) => {
        const newSet = new Set(prev);
        newSet.delete(routeKey);
        return newSet;
      });

      const newRates = {
        six_meter: data.driver_six_meter_rate || 0,
        twelve_meter: data.driver_twelve_meter_rate || 0,
        subbie_six_meter: data.subie_six_meter_rate || 0,
        subbie_twelve_meter: data.subie_twelve_meter_rate || 0,
      };

      console.log("Setting new rates:", newRates);
      setRates(newRates);

      setFormData((prev) => ({
        ...prev,
        driverRate:
          data.driver_rate !== null && data.driver_rate !== undefined
            ? data.driver_rate.toString()
            : "0",
      }));

      if (currentLagIndex !== null) {
        const updatedLegs = [...legs];
        updatedLegs[currentLagIndex] = {
          ...updatedLegs[currentLagIndex],
          driverRate: data.driver_rate ? data.driver_rate.toString() : "0",
        };
        setLegs(updatedLegs);
      }

      if (drivers.length > 0) {
        const updatedDrivers = drivers.map((driver) => {
          const isSubcontractor =
            employeeDrivers.find((d) => d.userid.toString() === driver.driverid)
              ?.roleid === 6;
          if (driver.container_type === "12m") {
            return {
              ...driver,
              driverRate: isSubcontractor
                ? data.subie_twelve_meter_rate
                  ? data.subie_twelve_meter_rate.toString()
                  : "0"
                : data.driver_twelve_meter_rate
                ? data.driver_twelve_meter_rate.toString()
                : "0",
            };
          } else if (driver.container_type === "abnormal") {
            return {
              ...driver,
              driverRate: driver.driverRate || "0",
              isAbnormal: true,
            };
          } else {
            return {
              ...driver,
              driverRate: isSubcontractor
                ? data.subie_six_meter_rate
                  ? data.subie_six_meter_rate.toString()
                  : "0"
                : data.driver_six_meter_rate
                ? data.driver_six_meter_rate.toString()
                : "0",
            };
          }
        });
        setDrivers(updatedDrivers);
      }

      return Promise.resolve();
    } catch (error) {
      console.error(
        "Unexpected error fetching rate:",
        error.response ? error.response.data : error.message
      );
      setRateError("Unexpected error fetching driver rate");

      setRates({
        six_meter: 0,
        twelve_meter: 0,
        subbie_six_meter: 0,
        subbie_twelve_meter: 0,
      });

      setFormData((prev) => ({
        ...prev,
        driverRate: "0",
      }));

      if (drivers.length > 0) {
        const updatedDrivers = drivers.map((driver) => ({
          ...driver,
          driverRate: "0",
          isAbnormal:
            driver.container_type === "abnormal" ? true : driver.isAbnormal,
        }));
        setDrivers(updatedDrivers);
      }

      if (currentLagIndex !== null) {
        const updatedLegs = [...legs];
        updatedLegs[currentLagIndex] = {
          ...updatedLegs[currentLagIndex],
          driverRate: "0",
        };
        setLegs(updatedLegs);
      }

      return Promise.resolve(); // Resolve even on unexpected errors to prevent uncaught rejection
    }
  };

  const addDriver = () => {
    if (currentLagIndex === null || isCompleted) return;

const newDriver = {
  id: Date.now(),
  driverid: "",
  truckregnumber: "",
  containernumber: "",
  container_type: "",
  date: "",
  driverRate: isWeightBased ? "0" : "",
  isAbnormal: false,
};

    // Add the new driver
    setDrivers((prevDrivers) => [...prevDrivers, newDriver]);
  };

const handleAddLeg = () => {
  if (isCompleted) return;
  
  // Prevent adding another leg if there's already an unsaved new leg
  if (hasUnsavedNewLeg) {
    setSavedMessage("Please save the current new leg before adding another.");
    setTimeout(() => setSavedMessage(""), 6000);
    return;
  }
  
  // Check if there are unsaved changes in the current leg (if any)
  if (currentLagIndex !== null && hasUnsavedChanges()) {
    setShowUnsavedChangesModal(true);
    return;
  }
  
  // Save current leg data to local state if any
  if (currentLagIndex !== null && currentLagIndex < legs.length) {
    console.log("Saving current leg data before adding new leg");
    const updatedLegs = [...legs];
    updatedLegs[currentLagIndex] = {
      ...updatedLegs[currentLagIndex],
      startingPoint: formData.startingPoint,
      destination: formData.destination,
      driverRate: formData.driverRate,
      drivers: JSON.parse(JSON.stringify(drivers)),
    };
    setLegs(updatedLegs);
  }
  
  // Clear localStorage before creating a new leg
  if (instructionId) {
    console.log(`Clearing localStorage for instruction_${instructionId}_state`);
    localStorage.removeItem(`instruction_${instructionId}_state`);
  }
  
  const newLeg = {
    id: `temp-${Date.now()}`,
    legnumber: legs.length + 1,
    startingPoint: "",
    driverRate: "",
    destination: "",
    drivers: [],
    isNew: true,
  };
  
  // IMMEDIATELY clear drivers state
  console.log("Immediately clearing drivers for new leg");
  setDrivers([]);
  
  // Update legs state
  setLegs(prevLegs => [...prevLegs, newLeg]);
  
  // Clear form state
  setFormData({
    startingPoint: "",
    driverRate: "",
    destination: "",
  });
  
  // Reset edited fields
  setEditedFields({
    startingPoint: false,
    destination: false,
    driverRate: false,
    drivers: {},
  });
  
  // Set the current leg index to the new leg
  const newLegIndex = legs.length;
  setCurrentLagIndex(newLegIndex);
  console.log(`Navigating to new leg at index: ${newLegIndex}`);
  
  // Update saved legs
  setSavedLegs(prevSavedLegs => {
    const newSavedLegs = new Set(prevSavedLegs);
    newSavedLegs.delete(newLegIndex);
    return newSavedLegs;
  });
  
  setHasUnsavedNewLeg(true);
  setSavedMessage("New leg added. Remember to click Save after entering details.");
  setTimeout(() => setSavedMessage(""), 6000);
};
const handleSelectLeg = (index) => {
  console.log(`Selecting leg at index ${index}`);
  
  // Prevent selecting the same leg that's already selected
  if (currentLagIndex === index) {
    console.log("Same leg already selected, skipping");
    return;
  }
  
  // Validate index
  if (index < 0 || index >= legs.length) {
    console.error(`Invalid leg index: ${index}`);
    return;
  }
  
  // Save current leg's data if we're on a valid leg and it's not completed
  if (currentLagIndex !== null && !isCompleted && currentLagIndex < legs.length && currentLagIndex !== index) {
    console.log(`Saving current leg ${currentLagIndex} data before switching`);
    const updatedLegs = [...legs];
    updatedLegs[currentLagIndex] = {
      ...updatedLegs[currentLagIndex],
      startingPoint: formData.startingPoint,
      destination: formData.destination,
      driverRate: formData.driverRate,
      drivers: JSON.parse(JSON.stringify(drivers)),
    };
    setLegs(updatedLegs);
  }
  
  // FORCE CLEAR drivers state immediately
  console.log("Force clearing drivers before leg switch");
  setDrivers([]);
  
  // Get the selected leg data
  const selectedLeg = legs[index];
  
  if (!selectedLeg) {
    console.error(`No leg found at index ${index}`);
    return;
  }
  
  console.log(`Loading leg data:`, selectedLeg);
  
  // Set the current leg index
  setCurrentLagIndex(index);
  
  // Update form data based on the selected leg
  setFormData({
    startingPoint: selectedLeg.startingPoint || "",
    driverRate: selectedLeg.driverRate || "",
    destination: selectedLeg.destination || "",
  });
  
  // Reset edited fields tracking
  setEditedFields({
    startingPoint: false,
    destination: false,
    driverRate: false,
    drivers: {},
  });
  
  // Use setTimeout to ensure state is cleared before setting new drivers
  setTimeout(() => {
    if (selectedLeg.drivers && selectedLeg.drivers.length > 0) {
      console.log(`Setting ${selectedLeg.drivers.length} drivers for leg ${index}`);
      const cleanDrivers = selectedLeg.drivers.map(driver => ({
        ...driver,
        id: driver.id || Date.now() + Math.random(),
        driverid: driver.driverid || "",
        truckregnumber: driver.truckregnumber || "",
        containernumber: driver.containernumber || "",
        container_type: driver.container_type || "",
        date: driver.date || "",
        driverRate: driver.driverRate || "",
        isAbnormal: driver.container_type === "abnormal"
      }));
      setDrivers(cleanDrivers);
      debugDriverData(cleanDrivers);
    } else {
      console.log(`No drivers for leg ${index}, keeping empty array`);
      setDrivers([]);
      debugDriverData([]);
    }
  }, 50); // Small delay to ensure state clearing
  
  // Fetch rates if both starting point and destination exist
  if (selectedLeg.startingPoint && selectedLeg.destination) {
    console.log(`Fetching rates for ${selectedLeg.startingPoint} -> ${selectedLeg.destination}`);
    fetchRate(selectedLeg.startingPoint, selectedLeg.destination);
  }
};
  // Replace the handleStartingPointChange function with this updated version
  // Replace the handleStartingPointChange function with this updated version
  const handleStartingPointChange = (e) => {
    if (isCompleted) return;

    const startingPoint = e.target.value;
    // Clear any previous error message when making a new selection
    setRateError("");

    const updatedFormData = {
      ...formData,
      startingPoint,
    };
    setFormData(updatedFormData);

    // Mark this field as edited
    setEditedFields((prev) => ({
      ...prev,
      startingPoint: true,
    }));

    // If both starting point and destination are selected, fetch the rate
    if (startingPoint && formData.destination) {
      // Force a fresh rate fetch when route changes
      console.log("Route changed, fetching new rates...");

      // Reset rates to 0 immediately when changing route
      setRates({
        six_meter: 0,
        twelve_meter: 0,
        subbie_six_meter: 0,
        subbie_twelve_meter: 0,
      });

      if (drivers.length > 0) {
        const updatedDrivers = drivers.map((driver) => {
          const newDriver = { ...driver };

          const isSubcontractor =
            employeeDrivers.find((d) => d.userid.toString() === driver.driverid)
              ?.roleid === 6;

          // Check if this route has no rates
          const routeKey = `${startingPoint}-${formData.destination}`;
          if (noRatesRoutes.has(routeKey)) {
            newDriver.driverRate = "0";
            console.log(
              `Using 0 rate for driver ${driver.driverid} because route ${routeKey} has no rates`
            );
            return newDriver;
          }

          if (newDriver.container_type === "12m") {
            newDriver.driverRate = isSubcontractor
              ? rates.subbie_twelve_meter
                ? rates.subbie_twelve_meter.toString()
                : "0"
              : rates.twelve_meter
              ? rates.twelve_meter.toString()
              : "0";
          } else if (newDriver.container_type === "abnormal") {
            // For abnormal container types, keep existing rate or set to 0
            if (!newDriver.driverRate) {
              newDriver.driverRate = "0";
            }
            newDriver.isAbnormal = true; // Mark as abnormal to allow editing
          } else {
            newDriver.driverRate = isSubcontractor
              ? rates.subbie_six_meter
                ? rates.subbie_six_meter.toString()
                : "0"
              : rates.six_meter
              ? rates.six_meter.toString()
              : "0";
          }

          return newDriver;
        });

        setDrivers(updatedDrivers);
      }

      // Then fetch new rates
      fetchRate(startingPoint, formData.destination).then(() => {
        console.log("Rates updated after starting point change");

        // Force update driver rates based on the new rates
        if (drivers.length > 0) {
          const updatedDrivers = drivers.map((driver) => {
            const newDriver = { ...driver };

            // Check if driver is a subcontractor (roleid = 6)
            const isSubcontractor =
              employeeDrivers.find(
                (d) => d.userid.toString() === driver.driverid
              )?.roleid === 6;

            if (newDriver.container_type === "12m") {
              newDriver.driverRate = isSubcontractor
                ? rates.subbie_twelve_meter
                  ? rates.subbie_twelve_meter.toString()
                  : "0"
                : rates.twelve_meter
                ? rates.twelve_meter.toString()
                : "0";
            } else if (newDriver.container_type === "abnormal") {
              // For abnormal container types, keep existing rate or set to 0
              if (!newDriver.driverRate) {
                newDriver.driverRate = "0";
              }
              newDriver.isAbnormal = true; // Mark as abnormal to allow editing
            } else {
              newDriver.driverRate = isSubcontractor
                ? rates.subbie_six_meter
                  ? rates.subbie_six_meter.toString()
                  : "0"
                : rates.six_meter
                ? rates.six_meter.toString()
                : "0";
            }

            return newDriver;
          });

          setDrivers(updatedDrivers);
        }
      });
    }

    // Update the current leg if one is selected
    if (currentLagIndex !== null) {
      const updatedLegs = [...legs];
      updatedLegs[currentLagIndex] = {
        ...updatedLegs[currentLagIndex],
        startingPoint,
      };
      setLegs(updatedLegs);
    }
  };

  // Replace the handleDestinationChange function with this updated version
  // Replace the handleDestinationChange function with this updated version
  const handleDestinationChange = (e) => {
    if (isCompleted) return;

    const destination = e.target.value;
    setRateError("");

    const updatedFormData = {
      ...formData,
      destination,
    };
    setFormData(updatedFormData);

    // Mark this field as edited
    setEditedFields((prev) => ({
      ...prev,
      destination: true,
    }));

    // If both starting point and destination are selected, fetch the rate
    if (formData.startingPoint && destination) {
      // Force a fresh rate fetch when route changes
      console.log("Route changed, fetching new rates...");

      // Reset rates to 0 immediately when changing route
      setRates({
        six_meter: 0,
        twelve_meter: 0,
        subbie_six_meter: 0,
        subbie_twelve_meter: 0,
      });

      // Update driver rates to 0 immediately
      // Force update driver rates based on the new rates
      if (drivers.length > 0) {
        const updatedDrivers = drivers.map((driver) => {
          const newDriver = { ...driver };

          // Check if driver is a subcontractor (roleid = 6)
          const isSubcontractor =
            employeeDrivers.find((d) => d.userid.toString() === driver.driverid)
              ?.roleid === 6;

          // Check if this route has no rates
          const routeKey = `${formData.startingPoint}-${destination}`;
          if (noRatesRoutes.has(routeKey)) {
            newDriver.driverRate = "0";
            console.log(
              `Using 0 rate for driver ${driver.driverid} because route ${routeKey} has no rates`
            );
            return newDriver;
          }

          if (newDriver.container_type === "12m") {
            newDriver.driverRate = isSubcontractor
              ? rates.subbie_twelve_meter
                ? rates.subbie_twelve_meter.toString()
                : "0"
              : rates.twelve_meter
              ? rates.twelve_meter.toString()
              : "0";
          } else if (newDriver.container_type === "abnormal") {
            // For abnormal container types, keep existing rate or set to 0
            if (!newDriver.driverRate) {
              newDriver.driverRate = "0";
            }
            newDriver.isAbnormal = true; // Mark as abnormal to allow editing
          } else {
            newDriver.driverRate = isSubcontractor
              ? rates.subbie_six_meter
                ? rates.subbie_six_meter.toString()
                : "0"
              : rates.six_meter
              ? rates.six_meter.toString()
              : "0";
          }

          return newDriver;
        });

        setDrivers(updatedDrivers);
      }

      fetchRate(formData.startingPoint, destination).then(() => {
        console.log("Rates updated after destination change");

        // Force update driver rates based on the new rates
        if (drivers.length > 0) {
          const updatedDrivers = drivers.map((driver) => {
            const newDriver = { ...driver };

            // Check if driver is a subcontractor (roleid = 6)
            const isSubcontractor =
              employeeDrivers.find(
                (d) => d.userid.toString() === driver.driverid
              )?.roleid === 6;

            if (newDriver.container_type === "12m") {
              newDriver.driverRate = isSubcontractor
                ? rates.subbie_twelve_meter
                  ? rates.subbie_twelve_meter.toString()
                  : "0"
                : rates.twelve_meter
                ? rates.twelve_meter.toString()
                : "0";
            } else if (newDriver.container_type === "abnormal") {
              // For abnormal container types, keep existing rate or set to 0
              if (!newDriver.driverRate) {
                newDriver.driverRate = "0";
              }
              newDriver.isAbnormal = true; // Mark as abnormal to allow editing
            } else {
              newDriver.driverRate = isSubcontractor
                ? rates.subbie_six_meter
                  ? rates.subbie_six_meter.toString()
                  : "0"
                : rates.six_meter
                ? rates.six_meter.toString()
                : "0";
            }

            return newDriver;
          });

          setDrivers(updatedDrivers);
        }
      });
    }

    // Update the current leg if one is selected
    if (currentLagIndex !== null) {
      const updatedLegs = [...legs];
      updatedLegs[currentLagIndex] = {
        ...updatedLegs[currentLagIndex],
        destination,
      };
      setLegs(updatedLegs);
    }
  };

  // Replace the handleBackClick function with this version
const handleBackClick = () => {
  // Clear any localStorage state that might interfere
  if (instructionId) {
    localStorage.removeItem(`instruction_${instructionId}_state`);
  }
  
  // Reset navigation flag
  isFromDocumentsPage.current = false;
  
  // Save current leg data before checking for unsaved changes
  if (currentLagIndex !== null && !isCompleted) {
    const updatedLegs = [...legs];
    updatedLegs[currentLagIndex] = {
      ...updatedLegs[currentLagIndex],
      ...formData,
      drivers: [...drivers],
    };
    setLegs(updatedLegs);
  }

  // Check if there are unsaved changes
  if (hasUnsavedChanges()) {
    // Show confirmation modal
    setShowBackConfirmModal(true);
  } else {
    // No unsaved changes, navigate directly
    navigateBack();
  }
};
  // Helper function to navigate back
const navigateBack = () => {
  // Clear all state before navigation
  setCurrentLagIndex(null);
  setDrivers([]);
  setFormData({
    startingPoint: "",
    driverRate: "",
    destination: "",
  });
  
  // Clear localStorage
  if (instructionId) {
    localStorage.removeItem(`instruction_${instructionId}_state`);
  }
  
  // Force a clean navigation state
  navigate("/instructions", {
    state: { 
      clientId,
      timestamp: Date.now() // Force new state
    },
    replace: true,
  });
};

  // Function to check if all containers reach the dropoff destination
const checkContainersReachDropoff = async (dropoff) => {
  // Get all containers/weights assigned to legs
  const assignedItems = new Set();
  const itemsReachingDropoff = new Set();
  let totalWeightAssigned = 0;
  let totalWeightReachingDropoff = 0;

  // Normalize the dropoff destination for comparison
  const normalizedDropoff = normalizeString(dropoff);

  // Collect all containers/weights from all legs
  legs.forEach((leg) => {
    // Normalize leg destination for comparison
    const normalizedLegDestination = normalizeString(leg.destination);
    
    if (leg.drivers && leg.drivers.length > 0) {
      leg.drivers.forEach((driver) => {
        if (driver.containernumber) {
          if (isWeightBased) {
            // For weight-based instructions
            const weight = parseFloat(driver.containernumber) || 0;
            totalWeightAssigned += weight;
            
            // If this leg's destination matches the dropoff, add weight to reaching total
            if (normalizedLegDestination === normalizedDropoff) {
              totalWeightReachingDropoff += weight;
            }
          } else {
            // For container-based instructions (existing logic)
            assignedItems.add(driver.containernumber);
            
            // If this leg's destination matches the dropoff, mark container as reaching dropoff
            if (normalizedLegDestination === normalizedDropoff) {
              itemsReachingDropoff.add(driver.containernumber);
            }
          }
        }
      });
    }
  });

  if (isWeightBased) {
    // For weight-based instructions, get total weight from instruction
    try {
      const response = await api.get(`/instructions/${instructionId}/details`);
      const totalInstructionWeight = parseFloat(response.data.weight) || 0;
      
      console.log("Weight check:", {
        totalInstructionWeight,
        totalWeightAssigned,
        totalWeightReachingDropoff,
        weightUnit,
      });

      // Return missing weight (weight that doesn't reach dropoff)
      const missingWeight = totalInstructionWeight - totalWeightReachingDropoff;
      return missingWeight > 0 ? [missingWeight] : [];
    } catch (error) {
      console.error("Error checking weight:", error);
      return [];
    }
  } else {
    // Existing container logic (unchanged)
    const allInstructionContainers = instructionContainers.map((c) =>
      c.containernum.toString()
    );

    const assignedButNotReaching = Array.from(assignedItems).filter(
      (container) => !itemsReachingDropoff.has(container)
    );

    const notAssigned = allInstructionContainers.filter(
      (container) => !assignedItems.has(container)
    );

    const missingContainers = [...assignedButNotReaching, ...notAssigned];

    console.log("Containers check:", {
      allContainers: allInstructionContainers,
      assignedContainers: Array.from(assignedItems),
      containersReachingDropoff: Array.from(itemsReachingDropoff),
      assignedButNotReaching,
      notAssigned,
      missingContainers,
    });

    return missingContainers;
  }
};
  // Function to check if a container has reached the dropoff destination
const hasContainerReachedDropoff = (containerNumber) => {
  if (!containerNumber) return false;

  try {
    // Get the dropoff destination from the instruction
    const dropoff = legs.find((leg) => {
      return (
        leg.drivers &&
        leg.drivers.some(
          (driver) =>
            driver.containernumber === containerNumber &&
            normalizeString(leg.destination) === 
            normalizeString(instructionContainers.find(
              (c) => c.containernum.toString() === containerNumber
            )?.dropoff)
        )
      );
    });

    return !!dropoff;
  } catch (error) {
    console.error("Error checking if container reached dropoff:", error);
    return false;
  }
};

  // Function to check if there are unsaved changes
  const hasUnsavedChanges = () => {
    if (currentLagIndex === null) return false;

    const currentLeg = legs[currentLagIndex];

    // If the leg is marked as saved and has no temporary ID, check for edited fields
    if (
      savedLegs.has(currentLagIndex) &&
      !currentLeg.id?.toString().startsWith("temp-") &&
      !currentLeg.isNew
    ) {
      // Check if any leg fields have been edited
      if (
        editedFields.startingPoint ||
        editedFields.destination ||
        editedFields.driverRate
      ) {
        return true;
      }

      // Check if any driver fields have been edited
      if (Object.keys(editedFields.drivers).length > 0) {
        return true;
      }

      return false;
    }

    // If the leg is new or has a temporary ID, it has unsaved changes
    if (currentLeg.isNew || currentLeg.id?.toString().startsWith("temp-")) {
      return true;
    }

    // If any drivers have temporary IDs or are new, there are unsaved changes
    if (
      drivers.some(
        (driver) => !driver.id || driver.id.toString().startsWith("temp-")
      )
    ) {
      return true;
    }

    return true; // Default to true if not explicitly saved
  };

  // Replace the handleFinalizeClick function with this updated version
  const handleFinaliseClick = async () => {
    if (legs.length === 0) {
      // No legs, just proceed
      navigateToDocuments();
      return;
    }

    // Check if there are any drivers added to any legs - do this check FIRST
    const hasDrivers = legs.some(
      (leg) => leg.drivers && leg.drivers.length > 0
    );
    if (!hasDrivers) {
      // No drivers added, show the no drivers modal
      setShowNoDriversModal(true);
      return;
    }

    // Check if there are unsaved changes - do this check SECOND
    if (hasUnsavedChanges()) {
      // Show the unsaved changes modal
      setShowUnsavedChangesModal(true);
      return;
    }

    try {
      // Fetch the instruction details to get the pickup and dropoff locations
      const response = await fetch(
        `${API_BASE_URL}/instructions/${instructionId}/details`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch instruction details");
      }

      const instructionDetails = await response.json();
      const pickup = instructionDetails.pickup;
      const dropoff = instructionDetails.dropoff;

      // First check if all containers reach the dropoff destination
const missingItems = await checkContainersReachDropoff(dropoff);

    if (missingItems.length > 0) {
      if (isWeightBased) {
        // For weight-based instructions
        setContainerValidationDetails({
          missingWeight: missingItems[0],
          totalWeight: parseFloat(instructionDetails.weight) || 0,
          weightUnit,
          dropoff,
          isWeightBased: true,
        });
      } else {
        // For container-based instructions
        setContainerValidationDetails({
          missingContainers: missingItems,
          dropoff,
          isWeightBased: false,
        });
      }
      setShowContainerModal(true);
      return;
    }

    // Check if the last leg destination matches the dropoff (case-insensitive)
    const lastLeg = legs[legs.length - 1];
    const lastLegDestination = lastLeg.destination;

    // Use normalized comparison for destination matching
    if (normalizeString(lastLegDestination) !== normalizeString(dropoff)) {
      setMismatchDetails({
        lastLegDestination,
        dropoff,
      });
      setShowMismatchModal(true);
      return;
    }

    // If all checks pass, proceed to documents
    navigateToDocuments();
  } catch (error) {
    console.error("Error checking destinations:", error);
    navigateToDocuments();
  }
};

  // Helper function to navigate to documents page
const navigateToDocuments = () => {
  // Clear any localStorage state before navigating
  if (instructionId) {
    localStorage.removeItem(`instruction_${instructionId}_state`);
  }

  // Reset component state
  setHasProcessedSelectedLeg(false);
  isFromDocumentsPage.current = false;

  // Navigate back to documents with clean state
  navigate("/Upload-Instruction-Documents", {
    state: {
      clientId,
      instructionId,
      isCompleted: isCompleted,
      shipmentType: shipmentType,
      timestamp: Date.now(), // Force new state
    },
    replace: true,
  });
};
// Add this useEffect after your other useEffects
// Add this useEffect after your existing useEffects
useEffect(() => {
  // Force re-render of leg buttons when currentLagIndex changes
  if (currentLagIndex !== null && legs.length > 0) {
    console.log(`Current leg index is now: ${currentLagIndex}`);
    
    // Ensure only the current leg is highlighted
    const currentLeg = legs[currentLagIndex];
    if (currentLeg && (currentLeg.isNew || currentLeg.id?.toString().startsWith("temp-"))) {
      console.log("New leg is now selected and should be highlighted");
    }
  }
}, [currentLagIndex, legs.length]);

useEffect(() => {
  if (instructionId && legs.length > 0 && currentLagIndex !== null) {
    const savedState = localStorage.getItem(`instruction_${instructionId}_state`);
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        const legIndex = legs.findIndex((leg) => leg.id === parsedState.legId);
        
        // Only restore state if the leg exists, is not new, and matches the current leg index
        if (
          legIndex >= 0 &&
          !legs[legIndex].isNew &&
          !legs[legIndex].id?.toString().startsWith("temp-") &&
          legIndex === currentLagIndex
        ) {
          console.log(`Restoring state for leg ${legIndex} with ID ${parsedState.legId}`);
          
          // CLEAR drivers first, then set restored drivers
          setDrivers([]);
          
          setTimeout(() => {
            const updatedDrivers = parsedState.drivers.map((driver) => ({
              ...driver,
              container_type: driver.container_type || "",
              driverRate: driver.driverRate || "",
              isAbnormal: driver.container_type === "abnormal",
            }));
            setDrivers(updatedDrivers);
            debugDriverData(updatedDrivers);
            
            // Update the legs array with the restored drivers
            const updatedLegs = [...legs];
            updatedLegs[legIndex].drivers = updatedDrivers;
            setLegs(updatedLegs);
          }, 50);
        } else {
          console.log("Not restoring state - ensuring clean driver state");
          // Ensure drivers are cleared for new legs or mismatched states
          setDrivers([]);
          debugDriverData([]);
        }
      } catch (error) {
        console.error("Error restoring state from localStorage:", error);
        // Clear drivers on error
        setDrivers([]);
        debugDriverData([]);
      }
    } else {
      console.log("No saved state found - ensuring clean driver state");
      // If no saved state and current leg is new, ensure drivers are empty
      if (legs[currentLagIndex]?.isNew) {
        setDrivers([]);
        debugDriverData([]);
      }
    }
  }
}, [instructionId, legs.length, currentLagIndex]); // Removed legs from dependencies to prevent loops

  const fetchShipmentType = async () => {
    if (instructionId) {
      try {
        const response = await fetch(
          `${API_BASE_URL}/instructions/${instructionId}/shipment-type`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch shipment type");
        }
        const data = await response.json();
        setShipmentType(data.shipment_type);
        console.log("Shipment type:", data.shipment_type);
      } catch (error) {
        console.error("Error fetching shipment type:", error);
      }
    }
  };

  // Function to validate driver fields
  const validateDriverFields = () => {
    if (!drivers || drivers.length === 0) return true;

    const missing = [];

    for (let i = 0; i < drivers.length; i++) {
      const driver = drivers[i];
      const driverNum = i + 1;

      if (!driver.driverid) {
        missing.push(`Driver ${driverNum}: Driver selection is required`);
      }

      if (!driver.truckregnumber) {
        missing.push(
          `Driver ${driverNum}: Truck registration number is required`
        );
      }

      if (!driver.containernumber) {
        missing.push(`Driver ${driverNum}: Container number is required`);
      }

      if (!driver.date) {
        missing.push(`Driver ${driverNum}: Date is required`);
      }
    }

    if (missing.length > 0) {
      setMissingFields(missing);
      setShowMissingFieldsModal(true);
      return false;
    }

    return true;
  };
  const calculateLegDriverRate = (drivers, rates) => {
    if (!drivers || drivers.length === 0) {
      return 0;
    }

    let sixMeterCount = 0;
    let twelveMeterCount = 0;
    let abnormalCount = 0;

    drivers.forEach((driver) => {
      if (driver.container_type === "12m") {
        twelveMeterCount++;
      } else if (driver.container_type === "abnormal") {
        abnormalCount++;
      } else {
        sixMeterCount++;
      }
    });

    // Use the rate of the most common container type
    if (
      twelveMeterCount >= sixMeterCount &&
      twelveMeterCount >= abnormalCount
    ) {
      return Number.parseFloat(rates.twelve_meter) || 0;
    } else if (
      sixMeterCount >= twelveMeterCount &&
      sixMeterCount >= abnormalCount
    ) {
      return Number.parseFloat(rates.six_meter) || 0;
    } else {
      // For abnormal, use the first abnormal driver's rate as the leg rate
      const abnormalDriver = drivers.find(
        (d) => d.container_type === "abnormal"
      );
      return abnormalDriver
        ? Number.parseFloat(abnormalDriver.driverRate) || 0
        : 0;
    }
  };

  const handleSave = async () => {
    if (isCompleted) return;

    if (currentLagIndex === null) {
      setSavedMessage("Please select a leg first");
      setTimeout(() => setSavedMessage(""), 3000);
      return;
    }

    if (!instructionId) {
      setSavedMessage("Missing instruction ID");
      setTimeout(() => setSavedMessage(""), 5000);
      return;
    }
    if (instructionId) {
      try {
        const instructionResponse = await fetch(
          `${API_BASE_URL}/instructions/${instructionId}`
        );
        if (instructionResponse.ok) {
          const instructionData = await instructionResponse.json();

          if (instructionData.status === "New") {
            // Update the status to "In Progress"
            const updateStatusResponse = await fetch(
              `${API_BASE_URL}/instructions/${instructionId}/status`,
              {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ status: "In Progress" }),
              }
            );

            if (updateStatusResponse.ok) {
              console.log(
                `Updated instruction ${instructionId} status from New to In Progress`
              );
              setInstructionStatus("In Progress");
            }
          }
        }
      } catch (statusError) {
        console.error("Error updating instruction status:", statusError);
        // Don't throw the error, just log it to avoid interrupting the main flow
      }
    }
    // Validate required fields
    if (!formData.startingPoint || !formData.destination) {
      setSavedMessage("Starting point and destination are required");
      setTimeout(() => setSavedMessage(""), 3000);
      return;
    }

    // Validate driver fields
    if (!validateDriverFields()) {
      return;
    }

    try {
      setSaving(true);
      const updatedLegs = [...legs];
      updatedLegs[currentLagIndex] = {
        ...updatedLegs[currentLagIndex],
        ...formData,
        drivers: [...drivers],
      };
      setLegs(updatedLegs);

      const currentLeg = updatedLegs[currentLagIndex];
      const isNewLeg =
        currentLeg.isNew || currentLeg.id?.toString().startsWith("temp-");

      // Prepare the leg data for saving
      const legData = {
        legkey:
          !isNewLeg && currentLeg.id && !isNaN(Number.parseInt(currentLeg.id))
            ? currentLeg.id
            : null,
        legnumber: currentLeg.legnumber || currentLagIndex + 1,
        startingpoint: currentLeg.startingPoint || formData.startingPoint,
        destination: currentLeg.destination || formData.destination,
        driverrate: calculateLegDriverRate(drivers, rates),
        m1key: instructionId,
drivers: drivers.map((driver) => {
  let driverRateToSave = driver.driverRate || "0";
  if (!driver.driverRate || driver.driverRate === "") {
    const isSubcontractor =
      employeeDrivers.find((d) => d.userid.toString() === driver.driverid)
        ?.roleid === 6;

    if (driver.container_type === "12m") {
      driverRateToSave = isSubcontractor
        ? rates.subbie_twelve_meter.toString()
        : rates.twelve_meter.toString();
    } else if (driver.container_type === "abnormal") {
      driverRateToSave = driver.driverRate || "0";
    } else {
      driverRateToSave = isSubcontractor
        ? rates.subbie_six_meter.toString()
        : rates.six_meter.toString();
    }
  }

  console.log(
    `Driver ${driver.driverid} with container type ${driver.container_type} has rate: ${driverRateToSave}`
  );

  return {
    id: driver.id,
    driverid: driver.driverid || null,
    truckregnumber: driver.truckregnumber || null,
    // UPDATED: Store weight in vgm column for weight-based, container number for container-based
    containernumber: isWeightBased ? null : (driver.containernumber || null),
    vgm: isWeightBased ? (parseFloat(driver.containernumber) || null) : null,
    container_type: driver.container_type || null,
    driverRate: driverRateToSave,
    date: driver.date || null,
  };
}),
      };

      console.log(
        `${isNewLeg ? "Saving new" : "Updating"} leg data:`,
        JSON.stringify(legData, null, 2)
      );

      // Send the data to the server
      const response = await fetch(`${API_BASE_URL}/legs/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(legData),
      });

      const responseText = await response.text();
      console.log("Server response:", responseText);

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Invalid JSON response: ${responseText}`);
      }

      if (!response.ok) {
        throw new Error(result.message || "Failed to save leg data");
      }

      console.log("Leg saved successfully:", result);

      // Update the leg ID with the one from the database if this was a new leg
if (result.legId && isNewLeg) {
  updatedLegs[currentLagIndex] = {
    ...updatedLegs[currentLagIndex],
    id: result.legId,
    isNew: false, // Clear the isNew flag
  };
  setLegs(updatedLegs);
  console.log(`New leg saved to database with ID: ${result.legId}`);
  setHasUnsavedNewLeg(false); // NEW: Mark that the new leg is now saved
}

      // Ensure the current leg is marked as saved
      setSavedLegs((prev) => {
        const newSet = new Set(prev);
        newSet.add(currentLagIndex);
        return newSet;
      });

      // Reset edited fields to ensure hasUnsavedChanges returns false
      setEditedFields({
        startingPoint: false,
        destination: false,
        driverRate: false,
        drivers: {},
      });

      // Update drivers to ensure they have no temporary IDs
      const updatedDrivers = drivers.map((driver) => ({
        ...driver,
        id: driver.id.toString().startsWith("temp-")
          ? result.driverIds?.[driver.id] || driver.id
          : driver.id,
      }));
      setDrivers(updatedDrivers);

      // Refresh leg data from the server to ensure frontend state matches backend
      await refreshLegData();

      // Show success message
      const successMessage = isNewLeg
        ? "New leg saved to database!"
        : "Leg updated successfully!";
      setSavedMessage(successMessage);
      setTimeout(() => setSavedMessage(""), 5000);
    } catch (error) {
      console.error("Error saving leg:", error);
      setSavedMessage("Error saving leg: " + error.message);
      setTimeout(() => setSavedMessage(""), 5000);
    } finally {
      setSaving(false);
    }
  };

  // Helper function to get driver name from ID
  const getDriverName = (driverId) => {
    const driver = employeeDrivers.find(
      (d) => d.userid.toString() === driverId
    );
    return driver ? `${driver.name} ${driver.surname}` : "Unknown Driver";
  };

  // Replace the shouldDisableAddLeg function with this improved version
const shouldDisableAddLeg = async () => {
  if (isCompleted) return true;
  if (legs.length === 0) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/instructions/${instructionId}/details`);
    if (!response.ok) return false;

    const instructionDetails = await response.json();
    const dropoff = instructionDetails.dropoff;

    if (!dropoff) return false;

    const normalizedDropoff = normalizeString(dropoff);

    // Check if the last leg's destination matches the dropoff
    const lastLeg = legs[legs.length - 1];
    if (normalizeString(lastLeg.destination) !== normalizedDropoff) return false;

    // Use the unified checkContainersReachDropoff function
    const missingItems = await checkContainersReachDropoff(dropoff);

    // Only disable the + button if all items (containers or weight) reach the dropoff
    return missingItems.length === 0;
  } catch (error) {
    console.error("Error in shouldDisableAddLeg:", error);
    return false;
  }
};

  // Add this useEffect to check if we should hide the + button whenever legs or containers change
  useEffect(() => {
const checkContainersDestination = async () => {
  if (
    !instructionId ||
    legs.length === 0 ||
    instructionContainers.length === 0 && !isWeightBased
  ) {
    setShouldHideAddLegButton(false);
    return;
  }

  try {
    // Fetch the instruction details to get the dropoff location
    const response = await fetch(
      `${API_BASE_URL}/instructions/${instructionId}/details`
    );
    if (!response.ok) {
      setShouldHideAddLegButton(false);
      return;
    }

    const instructionDetails = await response.json();
    const dropoff = instructionDetails.dropoff;
    const normalizedDropoff = normalizeString(dropoff); // ← Move this AFTER dropoff is defined

        // If we don't have a dropoff location, don't hide
        if (!dropoff) {
          setShouldHideAddLegButton(false);
          return;
        }

        // Check if the last leg's destination matches the dropoff
        const lastLeg = legs[legs.length - 1];
        if (normalizeString(lastLeg.destination) !== normalizeString(dropoff)) {
          setShouldHideAddLegButton(false);
          return;
        }

const missingItems = await checkContainersReachDropoff(dropoff);

      console.log("Destination check result (missing items):", missingItems);

      // Set the state based on whether all items reach the dropoff
      setShouldHideAddLegButton(missingItems.length === 0);
    } catch (error) {
      console.error("Error checking container/weight destinations:", error);
      setShouldHideAddLegButton(false);
    }
  };

  checkContainersDestination();
}, [instructionId, legs, instructionContainers, isWeightBased]);

  useEffect(() => {
    // Only update if we have drivers and rates
    if (
      drivers.length > 0 &&
      (rates.six_meter !== undefined || rates.twelve_meter !== undefined)
    ) {
      console.log("Rates changed, updating driver rates:", rates);

      const updatedDrivers = [...drivers];
      let ratesUpdated = false;

      updatedDrivers.forEach((driver) => {
        if (driver.container_type === "12m") {
          const newRate = rates.twelve_meter
            ? rates.twelve_meter.toString()
            : "0";
          if (driver.driverRate !== newRate) {
            driver.driverRate = newRate;
            ratesUpdated = true;
          }
        } else if (driver.container_type === "abnormal") {
          // For abnormal container types, keep existing rate or set to 0
          if (!driver.driverRate) {
            driver.driverRate = "0";
            ratesUpdated = true;
          }
          driver.isAbnormal = true; // Mark as abnormal to allow editing
        } else {
          const newRate = rates.six_meter ? rates.six_meter.toString() : "0";
          if (driver.driverRate !== newRate) {
            driver.driverRate = newRate;
            ratesUpdated = true;
          }
        }
      });

      if (ratesUpdated) {
        console.log("Updated driver rates based on new rates:", updatedDrivers);
        setDrivers(updatedDrivers);
      }
    }
  }, [rates]);

  // Add this useEffect to ensure driver rates are properly updated when rates change
  // Replace the existing useEffect for rates with this one
  useEffect(() => {
    // Only update if we have drivers and rates
    if (drivers.length > 0) {
      console.log("Rates changed, updating driver rates:", rates);

      // Create a new array instead of modifying the existing one
      const updatedDrivers = drivers.map((driver) => {
        const newDriver = { ...driver };

        // Check if driver is a subcontractor (roleid = 6)
        const isSubcontractor =
          employeeDrivers.find((d) => d.userid.toString() === driver.driverid)
            ?.roleid === 6;
        console.log(
          `Driver ${driver.driverid} is subcontractor: ${isSubcontractor}`
        );

        // Check if current route has no rates
        if (formData.startingPoint && formData.destination) {
          const routeKey = `${formData.startingPoint}-${formData.destination}`;
          if (noRatesRoutes.has(routeKey)) {
            newDriver.driverRate = "0";
            console.log(
              `Using 0 rate for driver ${driver.driverid} because route ${routeKey} has no rates`
            );
            return newDriver;
          }
        }

        if (newDriver.container_type === "12m") {
          newDriver.driverRate = isSubcontractor
            ? rates.subbie_twelve_meter
              ? rates.subbie_twelve_meter.toString()
              : "0"
            : rates.twelve_meter
            ? rates.twelve_meter.toString()
            : "0";
        } else if (newDriver.container_type === "abnormal") {
          // For abnormal container types, keep existing rate or set to 0
          if (!newDriver.driverRate) {
            newDriver.driverRate = "0";
          }
          newDriver.isAbnormal = true; // Mark as abnormal to allow editing
        } else {
          newDriver.driverRate = isSubcontractor
            ? rates.subbie_six_meter
              ? rates.subbie_six_meter.toString()
              : "0"
            : rates.six_meter
            ? rates.six_meter.toString()
            : "0";
        }

        console.log(
          `Updated driver ${driver.driverid} rate to ${newDriver.driverRate}`
        );
        return newDriver;
      });

      // Only update state if there are actual changes
      if (JSON.stringify(updatedDrivers) !== JSON.stringify(drivers)) {
        console.log("Updated driver rates based on new rates:", updatedDrivers);
        setDrivers(updatedDrivers);
      }
    }
  }, [
    rates,
    employeeDrivers,
    formData.startingPoint,
    formData.destination,
    noRatesRoutes,
  ]);
  useEffect(() => {
  // Cleanup function to prevent state leakage between legs
  return () => {
    console.log("Cleaning up driver state");
    setDrivers([]);
  };
}, [currentLagIndex]);

  return (
    <div className="min-h-screen bg-white" style={{ paddingBottom: 200 }}>
      <style>{modalAnimation}</style>
      <div className="">
        <button className="back-button" onClick={handleBackClick}>
          Back
        </button>
      </div>

      <br />
      {/* Lag Buttons & Plus */}

<div className="flex gap-4 mb-4" style={{ marginLeft: "15px" }}>
  {legs.map((leg, index) => {
    // Explicitly determine the button style
    let buttonClass = "px-4 py-2 rounded-md ";
    
    if (currentLagIndex === index) {
      // Currently selected leg - always green
      buttonClass += "bg-green-500 text-white";
    } else if (leg.isNew || leg.id?.toString().startsWith("temp-")) {
      // Unsaved leg but not selected - yellow
      buttonClass += "bg-yellow-200 text-gray-800";
    } else {
      // Regular saved leg - gray
      buttonClass += "bg-gray-200 text-gray-800";
    }
    
    return (
      <button
        key={leg.id || index}
        className={buttonClass}
        onClick={() => handleSelectLeg(index)}
      >
        Leg {index + 1}
        {leg.isNew || leg.id?.toString().startsWith("temp-") ? " *" : ""}
        {leg.drivers && leg.drivers.length > 0 && (
          <span className="ml-2 text-xs">
            ({leg.drivers.length} driver
            {leg.drivers.length !== 1 ? "s" : ""})
          </span>
        )}
      </button>
    );
  })}
  {!shouldHideAddLegButton && (
    <Plus onClick={handleAddLeg} disabled={isCompleted || hasUnsavedNewLeg} />
  )}
</div>

      {legs.length > 0 && (
        <div className="finalise-btn">
          <button className="finalise-btn2" onClick={handleFinaliseClick}>
            {isCompleted ? "Documents" : "Finalise"}
          </button>
        </div>
      )}

      <div className="px-4">
        {/* Update the UI to show when fields have been edited */}
        <div className="bg-blue-50 p-6 rounded-md mb-4">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                width: "100%",
                maxWidth: "1000px",
                gap: "20px",
                justifyContent: "center",
                paddingLeft:
                  "100px" /* Added padding to move fields to the right */,
              }}
            >
              <div style={{ flex: 1, minWidth: "650px" }}>
                <label className="block text-gray-700 mb-2">
                  Starting Point
                  {editedFields.startingPoint && (
                    <span className="ml-2 text-blue-500 text-xs">(edited)</span>
                  )}
                </label>
                <div className="relative">
                  <select
                    className={`w-full p-2 border rounded-md appearance-none pr-10 ${
                      editedFields.startingPoint ? "border-blue-500" : ""
                    }`}
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

              <div style={{ flex: 1, minWidth: "650px" }}>
                <label className="block text-gray-700 mb-2">
                  Destination
                  {editedFields.destination && (
                    <span className="ml-2 text-blue-500 text-xs">(edited)</span>
                  )}
                </label>
                <div className="relative">
                  <select
                    className={`w-full p-2 border rounded-md appearance-none pr-10 ${
                      editedFields.destination ? "border-blue-500" : ""
                    }`}
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

            <div style={{ marginTop: "10px" }}>
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
        </div>

        {/* Driver Entries - Always show this section if we're on a leg */}
        {currentLagIndex !== null && (
          <div className="bg-blue-50 p-6 rounded-md mb-4">
            <h3 className="text-lg font-medium mb-4">Driver Information</h3>

            {drivers && drivers.length > 0 ? (
              <>
                {drivers.map((entry, index) => (
                  <div
                    key={entry.id || index}
                    style={{
                      marginBottom: "1rem",
                      padding: "1rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "0.5rem",
                      backgroundColor: "white",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        margin: "0 -0.5rem",
                      }}
                    >
                      <div
                        style={{
                          width: "16.666%",
                          padding: "0 0.5rem",
                          marginBottom: "0.75rem",
                        }}
                      >
                        <label
                          style={{
                            display: "block",
                            color: "#374151",
                            fontWeight: "500",
                            marginBottom: "0.25rem",
                          }}
                        >
                          {employeeDrivers.find(
                            (d) => d.userid.toString() === entry.driverid
                          )?.roleid === 6
                            ? "Driver (subbie)"
                            : "Driver"}
                        </label>
                        <select
                          style={{
                            width: "100%",
                            padding: "0.5rem",
                            border: "1px solid #d1d5db",
                            borderRadius: "0.375rem",
                            backgroundColor: isCompleted ? "#f3f4f6" : "white",
                          }}
                          className="dropdown"
                          value={entry.driverid || ""}
                          onChange={(e) => {
                            if (isCompleted) return;
                            const driverId = e.target.value;
                            const updatedDrivers = [...drivers];
                            updatedDrivers[index].driverid = e.target.value;

                            if (e.target.value) {
                              const selectedDriver = employeeDrivers.find(
                                (d) => d.userid.toString() === e.target.value
                              );
                              if (selectedDriver) {
                                updatedDrivers[
                                  index
                                ].full_name = `${selectedDriver.name} ${selectedDriver.surname}`;

                                // Check if this is a subcontractor (roleid 6)
                                const isSubcontractor =
                                  selectedDriver.roleid === 6;
                                console.log(
                                  `Selected driver ${driverId} is subcontractor: ${isSubcontractor}`
                                );

                                // If we already have a container type, update the rate based on the new driver type
                                if (updatedDrivers[index].container_type) {
                                  if (
                                    updatedDrivers[index].container_type ===
                                    "12m"
                                  ) {
                                    updatedDrivers[index].driverRate =
                                      isSubcontractor
                                        ? rates.subbie_twelve_meter
                                          ? rates.subbie_twelve_meter.toString()
                                          : "0"
                                        : rates.twelve_meter
                                        ? rates.twelve_meter.toString()
                                        : "0";
                                  } else if (
                                    updatedDrivers[index].container_type ===
                                    "abnormal"
                                  ) {
                                    // For abnormal container types, keep existing rate or set to 0
                                    if (!updatedDrivers[index].driverRate) {
                                      updatedDrivers[index].driverRate = "0";
                                    }
                                    updatedDrivers[index].isAbnormal = true; // Mark as abnormal to allow editing
                                  } else {
                                    updatedDrivers[index].driverRate =
                                      isSubcontractor
                                        ? rates.subbie_six_meter
                                          ? rates.subbie_six_meter.toString()
                                          : "0"
                                        : rates.six_meter
                                        ? rates.six_meter.toString()
                                        : "0";
                                  }
                                  console.log(
                                    `Updated rate for driver ${driverId} to ${updatedDrivers[index].driverRate}`
                                  );
                                }
                              } else {
                                updatedDrivers[index].full_name = "";
                              }

                              // Mark this driver field as edited
                              setEditedFields((prev) => ({
                                ...prev,
                                drivers: {
                                  ...prev.drivers,
                                  [updatedDrivers[index].id]: true,
                                },
                              }));

                              setDrivers(updatedDrivers);
                              console.log(
                                `Updated driver at index ${index}:`,
                                updatedDrivers[index]
                              );
                            }
                          }}
                          disabled={isCompleted}
                        >
                          <option value="">Select driver</option>
                          {employeeDrivers.map((driver) => (
                            <option
                              key={driver.userid}
                              value={driver.userid.toString()}
                            >
                              {driver.name} {driver.surname}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div
                        style={{
                          width: "16.666%",
                          padding: "0 0.5rem",
                          marginBottom: "0.75rem",
                        }}
                      >
                        <label
                          style={{
                            display: "block",
                            color: "#374151",
                            fontWeight: "500",
                            marginBottom: "0.25rem",
                          }}
                        >
                          Truck Reg Number
                        </label>
                        <select
                          style={{
                            width: "100%",
                            padding: "0.5rem",
                            border: "1px solid #d1d5db",
                            borderRadius: "0.375rem",
                            backgroundColor: isCompleted ? "#f3f4f6" : "white",
                          }}
                          className="dropdown"
                          value={entry.truckregnumber || ""}
                          onChange={(e) => {
                            if (isCompleted) return;
                            const updatedDrivers = [...drivers];
                            updatedDrivers[index].truckregnumber =
                              e.target.value;

                            // Mark this driver field as edited
                            setEditedFields((prev) => ({
                              ...prev,
                              drivers: {
                                ...prev.drivers,
                                [updatedDrivers[index].id]: true,
                              },
                            }));

                            setDrivers(updatedDrivers);
                            console.log(
                              `Updated truck reg for driver at index ${index}:`,
                              e.target.value
                            );
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

<div
  style={{
    width: "16.666%",
    padding: "0 0.5rem",
    marginBottom: "0.75rem",
  }}
>
  <label
    style={{
      display: "block",
      color: "#374151",
      fontWeight: "500",
      marginBottom: "0.25rem",
    }}
  >
    {isWeightBased ? `Weight (${weightUnit})` : "Container Number"}
  </label>
  {isWeightBased ? (
    <input
      type="number"
      step="0.01"
      min="0"
      style={{
        width: "100%",
        padding: "0.5rem",
        border: "1px solid #d1d5db",
        borderRadius: "0.375rem",
        backgroundColor: isCompleted ? "#f3f4f6" : "white",
      }}
      value={entry.containernumber || ""}
      onChange={(e) => {
        if (isCompleted) return;
        const weightValue = e.target.value;

        const updatedDrivers = [...drivers];
        updatedDrivers[index].containernumber = weightValue;

        // For weight-based, we don't auto-fill container type
        updatedDrivers[index].container_type = "";
        updatedDrivers[index].driverRate = formData.driverRate || "0";

        // Mark this driver field as edited
        setEditedFields((prev) => ({
          ...prev,
          drivers: {
            ...prev.drivers,
            [updatedDrivers[index].id]: true,
          },
        }));

        setDrivers(updatedDrivers);
        console.log(`Updated weight for driver at index ${index}:`, weightValue);
      }}
      disabled={isCompleted}
      placeholder={`Enter weight in ${weightUnit}`}
    />
  ) : (
    <select
      style={{
        width: "100%",
        padding: "0.5rem",
        border: "1px solid #d1d5db",
        borderRadius: "0.375rem",
        backgroundColor: isCompleted ? "#f3f4f6" : "white",
      }}
      className="dropdown"
      value={entry.containernumber || ""}
      onChange={(e) => {
        if (isCompleted) return;
        const containerValue = e.target.value;

                            // Store current rates for debugging
                            console.log("Current rates:", rates);
                            console.log(
                              "Current driver data before update:",
                              drivers[index]
                            );

                            // Check if this container has already reached its dropoff in a previous leg
                            if (containerValue) {
                              const containerDropoff =
                                instructionContainers.find(
                                  (c) => c.containernum === containerValue
                                )?.dropoff;

                              // If we have a dropoff for this container, check if it already reached it
                              if (containerDropoff) {
                                const containerReachedDropoff = legs.some(
                                  (leg, legIndex) => {
                                    if (legIndex >= currentLagIndex)
                                      return false;
                                    if (leg.destination === containerDropoff) {
                                      return (
                                        leg.drivers &&
                                        leg.drivers.some(
                                          (driver) =>
                                            driver.containernumber ===
                                            containerValue
                                        )
                                      );
                                    }
                                    return false;
                                  }
                                );

                                if (containerReachedDropoff) {
                                  // Show the modal
                                  setContainerReachedDetails({
                                    containerNumber: containerValue,
                                  });
                                  setShowContainerReachedModal(true);
                                  return; // Don't update the state
                                }
                              }
                            }

                            const updatedDrivers = [...drivers];
                            updatedDrivers[index].containernumber =
                              containerValue;

                            // Auto-fill container type from the container details map
                            if (
                              containerValue &&
                              containerDetailsMap[containerValue]
                            ) {
                              // Normalize container type by trimming spaces and converting to lowercase for comparison
                              const containerType = (
                                containerDetailsMap[containerValue].type || ""
                              ).trim();
                              updatedDrivers[index].container_type =
                                containerType;

                              // Check if driver is a subcontractor (roleid = 6)
                              const isSubcontractor =
                                employeeDrivers.find(
                                  (d) =>
                                    d.userid.toString() ===
                                    updatedDrivers[index].driverid
                                )?.roleid === 6;
                              console.log(
                                `Driver ${updatedDrivers[index].driverid} is subcontractor: ${isSubcontractor}`
                              );

                              // Make sure rates are valid before using them
                              const sixMeterRate = isSubcontractor
                                ? rates && rates.subbie_six_meter
                                  ? rates.subbie_six_meter.toString()
                                  : "0"
                                : rates && rates.six_meter
                                ? rates.six_meter.toString()
                                : "0";

                              const twelveMeterRate = isSubcontractor
                                ? rates && rates.subbie_twelve_meter
                                  ? rates.subbie_twelve_meter.toString()
                                  : "0"
                                : rates && rates.twelve_meter
                                ? rates.twelve_meter.toString()
                                : "0";

                              console.log(
                                "Using rates - 6m:",
                                sixMeterRate,
                                "12m:",
                                twelveMeterRate
                              );
                              if (containerType.toLowerCase() === "abnormal") {
                                // For abnormal container types, keep existing rate if available
                                updatedDrivers[index].driverRate =
                                  updatedDrivers[index].driverRate ||
                                  twelveMeterRate;
                                updatedDrivers[index].isAbnormal = true;
                                console.log(
                                  "Setting abnormal rate (editable):",
                                  updatedDrivers[index].driverRate
                                );
                              } else if (containerType === "12m") {
                                updatedDrivers[index].driverRate =
                                  twelveMeterRate;
                                updatedDrivers[index].isAbnormal = false;
                                console.log(
                                  "Setting 12m rate:",
                                  twelveMeterRate
                                );
                              } else {
                                // Default to 6m rate
                                updatedDrivers[index].driverRate = sixMeterRate;
                                updatedDrivers[index].isAbnormal = false;
                                console.log("Setting 6m rate:", sixMeterRate);
                              }
                            } else {
                              updatedDrivers[index].container_type = "";
                              updatedDrivers[index].driverRate = "";
                              updatedDrivers[index].isAbnormal = false;
                            }

                            // Mark this driver field as edited
                            setEditedFields((prev) => ({
                              ...prev,
                              drivers: {
                                ...prev.drivers,
                                [updatedDrivers[index].id]: true,
                              },
                            }));

                            setDrivers(updatedDrivers);
                            console.log(
                              `Updated container for driver at index ${index}:`,
                              containerValue
                            );
                            console.log(
                              "Updated driver data:",
                              updatedDrivers[index]
                            );
                          }}
disabled={isCompleted}
    >
      <option value="">Select Container</option>
      {containerOptions
        .filter((container) => {
          if (currentLagIndex === 0) return true;
          return !hasContainerReachedDropoff(container);
        })
        .map((container) => (
          <option key={container} value={container}>
            {container}
          </option>
        ))}
    </select>
  )}
</div>

                      <div
                        style={{
                          width: "16.666%",
                          padding: "0 0.5rem",
                          marginBottom: "0.75rem",
                        }}
                      >
                        <label
                          style={{
                            display: "block",
                            color: "#374151",
                            fontWeight: "500",
                            marginBottom: "0.25rem",
                          }}
                        >
                          Type
                        </label>
                        <input
                          type="text"
                          style={{
                            width: "100%",
                            padding: "0.5rem",
                            border: "1px solid #d1d5db",
                            borderRadius: "0.375rem",
                            backgroundColor: "#f3f4f6",
                          }}
                          value={isWeightBased ? weightUnit : (entry.container_type || "")}
                          readOnly
                        />
                      </div>

                      <div
                        style={{
                          width: "16.666%",
                          padding: "0 0.5rem",
                          marginBottom: "0.75rem",
                        }}
                      >
                        <label
                          style={{
                            display: "block",
                            color: "#374151",
                            fontWeight: "500",
                            marginBottom: "0.25rem",
                          }}
                        >
                          {employeeDrivers.find(
                            (d) => d.userid.toString() === entry.driverid
                          )?.roleid === 6
                            ? "Subbie Rate"
                            : "Driver Rate"}
                        </label>
                        <input
                          type="text"
                          style={{
                            width: "100%",
                            padding: "0.5rem",
                            border: "1px solid #d1d5db",
                            borderRadius: "0.375rem",
                            backgroundColor: (entry.isAbnormal || isWeightBased)
                              ? "white"
                              : "#f3f4f6",
                          }}
                          value={entry.driverRate || ""}
                          onChange={(e) => {
                            if (isCompleted || (!entry.isAbnormal && !isWeightBased)) return;

                            // Only allow numbers and decimal points
                            const value = e.target.value;
                            if (
                              value === "" ||
                              /^[0-9]*\.?[0-9]*$/.test(value)
                            ) {
                              const updatedDrivers = [...drivers];
                              updatedDrivers[index].driverRate = value;

                              // Mark this driver field as edited
                              setEditedFields((prev) => ({
                                ...prev,
                                drivers: {
                                  ...prev.drivers,
                                  [updatedDrivers[index].id]: true,
                                },
                              }));

                              setDrivers(updatedDrivers);
                            }
                          }}
                          readOnly={!entry.isAbnormal && !isWeightBased}
                        />
                      </div>

                      <div
                        style={{
                          width: "16.666%",
                          padding: "0 0.5rem",
                          marginBottom: "0.75rem",
                        }}
                      >
                        <label
                          style={{
                            display: "block",
                            color: "#374151",
                            fontWeight: "500",
                            marginBottom: "0.25rem",
                          }}
                        >
                          Date
                        </label>
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <input
                            type="date"
                            style={{
                              width: "100%",
                              padding: "0.5rem",
                              border: "1px solid #d1d5db",
                              borderRadius: "0.375rem",
                              backgroundColor: isCompleted
                                ? "#f3f4f6"
                                : "white",
                            }}
                            value={
                              entry.date
                                ? (() => {
                                    // Create a date object from the entry date
                                    const date = new Date(entry.date);
                                    // Get year, month, and day components
                                    const year = date.getFullYear();
                                    const month = String(
                                      date.getMonth() + 1
                                    ).padStart(2, "0"); // Months are 0-indexed
                                    const day = String(date.getDate()).padStart(
                                      2,
                                      "0"
                                    );
                                    // Format as YYYY-MM-DD for the date input
                                    return `${year}-${month}-${day}`;
                                  })()
                                : ""
                            }
                            onChange={(e) => {
                              if (isCompleted) return;
                              const updatedDrivers = [...drivers];
                              updatedDrivers[index].date = e.target.value;

                              // Mark this driver field as edited
                              setEditedFields((prev) => ({
                                ...prev,
                                drivers: {
                                  ...prev.drivers,
                                  [updatedDrivers[index].id]: true,
                                },
                              }));

                              setDrivers(updatedDrivers);
                              console.log(
                                `Updated date for driver at index ${index}:`,
                                e.target.value
                              );
                            }}
                            disabled={isCompleted}
                          />
                          <button
                            style={{
                              backgroundColor: "#dc2626",
                              color: "white",
                              padding: "0.5rem",
                              borderRadius: "0.375rem",
                              marginLeft: "0.5rem",
                              border: "none",
                              cursor: isCompleted ? "not-allowed" : "pointer",
                            }}
                            onClick={() => {
                              // Get driver name or ID for the confirmation message
                              const driverName =
                                entry.full_name ||
                                (entry.driverid
                                  ? `Driver ID: ${entry.driverid}`
                                  : `Driver #${index + 1}`);

                              // Set the driver to remove and show the confirmation modal
                              setDriverToRemove({ index, name: driverName });
                              setShowRemoveDriverModal(true);
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
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <p className="text-gray-500 text-center py-4">
                No driver information available for this leg. Click "Add Driver"
                to add a driver.
              </p>
            )}

            {drivers.length > 0 && !isCompleted && (
              <div className="flex justify-center mt-6 gap-4">
                <button
                  className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-2 rounded-md transition-colors"
                  onClick={handleSave}
                  disabled={saving || isCompleted}
                >
                  {saving ? "Saving..." : "Save"}
                </button>

                {/* Only show remove leg button for the last leg AND only if it has been saved */}
                {currentLagIndex === legs.length - 1 &&
                  savedLegs.has(currentLagIndex) && (
                    <button
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition-colors"
                      onClick={() => {
                        const legId = legs[currentLagIndex]?.id;
                        const isTemp = legId?.toString().startsWith("temp-");
                        handleRemoveLeg(currentLagIndex, isTemp ? null : legId);
                      }}
                      disabled={saving || isCompleted}
                    >
                      Remove Leg
                    </button>
                  )}
              </div>
            )}

            {/* Toast popup for success messages */}
            {savedMessage && !savedMessage.includes("Error") && (
              <div className="toast-popup">{savedMessage}</div>
            )}

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
                The final leg destination doesn't match the instruction dropoff
                location.
              </p>
            </div>
            <div className="modal-body">
              <div className="modal-item">
                <div className="modal-bullet"></div>
                <span className="modal-item-text">
                  Last Leg Destination:{" "}
                  <strong>{mismatchDetails.lastLegDestination}</strong>
                </span>
              </div>
              <div className="modal-item">
                {/* Add the "checked" class to the dropoff destination to indicate it's the correct one */}
                <div className="modal-bullet"></div>
                <span className="modal-item-text">
                  Instruction Dropoff:{" "}
                  <strong>{mismatchDetails.dropoff}</strong>
                </span>
              </div>
              <div className="modal-item">
                <div className="modal-bullet"></div>
                <span className="modal-item-text">
                  Please update the final leg destination or edit the
                  instruction.
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="modal-btn modal-btn-primary"
                onClick={() => setShowMismatchModal(false)}
              >
                Okay
              </button>
            </div>
          </div>
        </div>
      )}

{showContainerModal && (
  <div className="modal-wrapper">
    <div className="modal-backdrop animate-fadeIn"></div>
    <div className="modal-container animate-scaleIn">
      <div className="modal-header">
        <div className="flex items-center gap-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="50"
            height="50"
            viewBox="0 0 24 24"
            fill="#FEE2E2"
            stroke="#DC2626"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-red-600 drop-shadow-sm"
          >
            <path d="M12 2L2 19h20L12 2z" />
            <path d="M12 8v4" />
            <circle cx="12" cy="16" r="1" />
          </svg>
<h3 className="modal-title">
  {containerValidationDetails.isWeightBased 
    ? (containerValidationDetails.missingWeight > 0 ? "Weight Destination Warning" : "Excess Weight Warning")
    : "Container Destination Warning"}
</h3>
        </div>
<p className="modal-description">
  {containerValidationDetails.isWeightBased
    ? (containerValidationDetails.missingWeight > 0 
        ? "Not all weight reaches the final destination."
        : "More weight is assigned than the instruction total.")
    : "All containers must reach the final destination."}
</p>
      </div>
      <div className="modal-body">
        <div className="modal-item">
          <div className="modal-bullet"></div>
          <span className="modal-item-text">
            Final Destination: <strong>{containerValidationDetails.dropoff}</strong>
          </span>
        </div>
        {containerValidationDetails.isWeightBased ? (
          <div className="modal-item">
            <div className="modal-bullet"></div>
<span className="modal-item-text">
  Weight reaching destination: <strong>
    {(containerValidationDetails.totalWeight - Math.abs(containerValidationDetails.missingWeight)).toFixed(2)}/
    {containerValidationDetails.totalWeight.toFixed(2)} {containerValidationDetails.weightUnit}
  </strong>
</span>
          </div>
        ) : (
          containerValidationDetails.missingContainers?.map((container, index) => (
            <div key={index} className="modal-item">
              <div className="modal-bullet"></div>
              <span className="modal-item-text">
                Container <strong>{container}</strong> does not reach final destination
              </span>
            </div>
          ))
        )}
      </div>
      <div className="modal-footer">
        <button
          className="modal-btn modal-btn-secondary"
          onClick={() => setShowContainerModal(false)}
        >
          Cancel
        </button>
        <button
          className="modal-btn modal-btn-primary"
          onClick={() => {
            setShowContainerModal(false);
            navigateToDocuments();
          }}
        >
          Proceed Anyway
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
              <p className="modal-description">
                Please save your changes in the current leg before adding a new
                leg.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="modal-btn modal-btn-primary"
                onClick={() => setShowUnsavedChangesModal(false)}
              >
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
              <p className="modal-description">
                Please fill in all required fields before saving.
              </p>
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
              <button
                className="modal-btn modal-btn-primary"
                onClick={() => setShowMissingFieldsModal(false)}
              >
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
              <p className="modal-description">
                Please make sure to add a driver before finalisation.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="modal-btn modal-btn-primary"
                onClick={() => setShowNoDriversModal(false)}
              >
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
              <p className="modal-description" style={{ fontSize: "20px" }}>
                Are you sure you wish to proceed? Unsaved changes will be lost.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="modal-btn modal-btn-secondary"
                onClick={() => setShowBackConfirmModal(false)}
              >
                No
              </button>
              <button
                className="modal-btn modal-btn-primary"
                onClick={() => {
                  setShowBackConfirmModal(false);
                  navigateBack();
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
              <button
                className="modal-btn modal-btn-secondary"
                onClick={() => setShowRemoveDriverModal(false)}
              >
                No
              </button>
              <button
                className="modal-btn modal-btn-primary"
                onClick={async () => {
                  // Remove the driver from local state
                  if (driverToRemove.index !== null) {
                    const updatedDrivers = [...drivers];
                    updatedDrivers.splice(driverToRemove.index, 1);
                    setDrivers(updatedDrivers);

                    // Update the legs state immediately to reflect the driver removal in the UI
                    const updatedLegs = [...legs];
                    updatedLegs[currentLagIndex] = {
                      ...updatedLegs[currentLagIndex],
                      drivers: updatedDrivers,
                    };
                    setLegs(updatedLegs);

                    // Save to database immediately
                    try {
                      setSaving(true);

                      // Get the current leg
                      const currentLeg = legs[currentLagIndex];
                      const isNewLeg =
                        currentLeg.isNew ||
                        currentLeg.id?.toString().startsWith("temp-");

                      // Prepare the leg data with the updated drivers array
                      const legData = {
                        legkey:
                          !isNewLeg &&
                          currentLeg.id &&
                          !isNaN(Number.parseInt(currentLeg.id))
                            ? currentLeg.id
                            : null,
                        legnumber: currentLeg.legnumber || currentLagIndex + 1,
                        startingpoint: formData.startingPoint,
                        destination: formData.destination,
                        // Calculate the leg's driver rate based on container types
                        driverrate: calculateLegDriverRate(
                          updatedDrivers,
                          rates
                        ),
                        m1key: instructionId,
                        drivers: updatedDrivers.map((driver) => {
                          let driverRateToSave = "0";

                          if (driver.container_type === "12m") {
                            driverRateToSave = rates.twelve_meter.toString();
                          } else if (driver.container_type === "abnormal") {
                            driverRateToSave = driver.driverRate || "0";
                          } else {
                            // Default to 6m rate
                            driverRateToSave = rates.six_meter.toString();
                          }
                          console.log(
                            `Driver ${driver.driverid} with container type ${driver.container_type} has rate: ${driverRateToSave}`
                          );

                          return {
                            id: driver.id, // Include the driver ID if it exists
                            driverid: driver.driverid || null,
                            truckregnumber: driver.truckregnumber || null,
                            containernumber: driver.containernumber || null,
                            container_type: driver.container_type || null,
                            driverRate: driverRateToSave,
                            date: driver.date || null,
                          };
                        }),
                      };

                      // Send the data to the server
                      const response = await fetch(
                        `${API_BASE_URL}/legs/save`,
                        {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify(legData),
                        }
                      );

                      const responseText = await response.text();
                      let result;
                      try {
                        result = JSON.parse(responseText);
                      } catch (e) {
                        throw new Error(
                          `Invalid JSON response: ${responseText}`
                        );
                      }

                      if (!response.ok) {
                        throw new Error(
                          result.message || "Failed to save leg data"
                        );
                      }

                      // Show success message
                      setSavedMessage("Driver removed successfully!");
                      setTimeout(() => setSavedMessage(""), 5000);

                      // Refresh the legs data
                      await refreshLegData();
                    } catch (error) {
                      console.error("Error removing driver:", error);
                      setSavedMessage(
                        "Error removing driver: " + error.message
                      );
                      setTimeout(() => setSavedMessage(""), 5000);
                    } finally {
                      setSaving(false);
                    }
                  }

                  // Close the modal
                  setShowRemoveDriverModal(false);
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
              <button
                className="modal-btn modal-btn-secondary"
                onClick={() => setShowRemoveLegModal(false)}
              >
                No
              </button>
              <button
                className="modal-btn modal-btn-primary"
                onClick={async () => {
                  if (legToRemove.index !== null) {
                    try {
                      setSaving(true);

                      const isTemporaryLeg =
                        !legToRemove.id ||
                        legToRemove.id.toString().startsWith("temp-");

                      if (!isTemporaryLeg) {
                        await api.delete(`/legs/${legToRemove.id}`);

                        for (
                          let i = legToRemove.index + 1;
                          i < legs.length;
                          i++
                        ) {
                          const legToUpdate = legs[i];
                          if (
                            legToUpdate.id &&
                            !legToUpdate.id.toString().startsWith("temp-")
                          ) {
                            await api.put(
                              `/legs/${legToUpdate.id}/update-number`,
                              {
                                legnumber: i,
                              }
                            );
                          }
                        }
                      }

                      const updatedLegs = [...legs];
                      updatedLegs.splice(legToRemove.index, 1);

                      for (
                        let i = legToRemove.index;
                        i < updatedLegs.length;
                        i++
                      ) {
                        updatedLegs[i].legnumber = i + 1;
                      }

                      setLegs(updatedLegs);

                      setSavedLegs((prevSavedLegs) => {
                        const newSavedLegs = new Set();
                        prevSavedLegs.forEach((index) => {
                          if (index < legToRemove.index) {
                            newSavedLegs.add(index);
                          } else if (index > legToRemove.index) {
                            newSavedLegs.add(index - 1);
                          }
                        });
                        return newSavedLegs;
                      });

                      if (currentLagIndex === legToRemove.index) {
                        const newIndex = Math.max(0, legToRemove.index - 1);
                        setCurrentLagIndex(newIndex);
                        const selectedLeg = updatedLegs[newIndex];
                        setFormData({
                          startingPoint: selectedLeg.startingPoint || "",
                          driverRate: selectedLeg.driverRate || "",
                          destination: selectedLeg.destination || "",
                        });
                        if (
                          selectedLeg.drivers &&
                          selectedLeg.drivers.length > 0
                        ) {
                          setDrivers(selectedLeg.drivers);
                        } else {
                          setDrivers([]);
                        }
                      } else if (currentLagIndex > legToRemove.index) {
                        setCurrentLagIndex(currentLagIndex - 1);
                      }

                      setSavedMessage("Leg removed successfully!");
                      setTimeout(() => setSavedMessage(""), 5000);

                      if (!isTemporaryLeg) {
                        await refreshLegData();
                      }
                    } catch (error) {
                      console.error("Error removing leg:", error);
                      setSavedMessage("Error removing leg: " + error.message);
                      setTimeout(() => setSavedMessage(""), 5000);
                    } finally {
                      setSaving(false);
                    }
                  }
                  setShowRemoveLegModal(false);
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
              <p className="modal-description">
                A driver with identical information already exists.
              </p>
            </div>
            <div className="modal-body">
              <div className="modal-item">
                <div className="modal-bullet"></div>
                <span className="modal-item-text">
                  Driver:{" "}
                  <strong>
                    {duplicateDriverInfo &&
                      getDriverName(duplicateDriverInfo.driverid)}
                  </strong>
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
                  Container:{" "}
                  <strong>{duplicateDriverInfo?.containernumber}</strong>
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
              <button
                className="modal-btn modal-btn-primary"
                onClick={() => setShowDuplicateDriverModal(false)}
              >
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
                The specified container has already reached its dropoff in a
                previous leg.
              </p>
            </div>
            <div className="modal-body">
              <div className="modal-item">
                <div className="modal-bullet"></div>
                <span className="modal-item-text">
                  Container{" "}
                  <strong>{containerReachedDetails.containerNumber}</strong> has
                  already reached its final destination.
                </span>
              </div>
              <div className="modal-item">
                <div className="modal-bullet"></div>
                <span className="modal-item-text">
                  Please select a different container or update the previous
                  legs.
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="modal-btn modal-btn-primary"
                onClick={() => setShowContainerReachedModal(false)}
              >
                Okay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UpdateInstruction;
