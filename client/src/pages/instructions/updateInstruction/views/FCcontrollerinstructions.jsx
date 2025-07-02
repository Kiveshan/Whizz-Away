
"use client"

import { useState, useEffect, useRef } from "react"
import "../../css/controllerinstruction.css"
import { useNavigate, useLocation } from "react-router-dom"
import ErrorModal from "../../../../components/ErrorModal"
import api from "../../../../api"

// ErrorTooltip component for displaying validation errors
const ErrorTooltip = ({ message }) => {
  if (!message) return null;
  
  return (
    <div className="error-tooltip">
      <span className="error-icon">!</span>
      <div className="error-message">{message}</div>
    </div>
  );
};

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
  }

  const [isImport, setIsImport] = useState(location.state?.isImport || false)
  const today = new Date().toISOString().split("T")[0]
  const [weight, setWeight] = useState("")
  
  // Log the isImport state for debugging
  useEffect(() => {
    console.log("isImport state changed:", isImport);
  }, [isImport]);

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
      surcharges: false,
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
      rateper_6: 0,
      rateper_12: 0,
      rateper_abnormal: 0,
    };

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
      surcharges: false,
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
  
  // Container state
  const [containers, setContainers] = useState([])
  const [containerFieldErrors, setContainerFieldErrors] = useState({})
  const [containerSuccessMessage, setContainerSuccessMessage] = useState("")
  const [isContainerLoading, setIsContainerLoading] = useState(false)
  const [isContainerDataModified, setIsContainerDataModified] = useState(false)

  // Initialize containers based on container counts
  const initializeContainers = () => {
    console.log("Initializing containers with form data:", formData);
    const counts = {
      "6m": formData.num_six_meters || 0,
      "12m": formData.num_twelve_meters || 0,
      "Abnormal": formData.num_abnormal || 0,
    };
    
    // If we already have containers and counts are zero, don't clear them
    if (containers && containers.length > 0 && 
        counts["6m"] === 0 && 
        counts["12m"] === 0 && 
        counts["Abnormal"] === 0) {
      console.log("Keeping existing containers as counts are zero");
      return;
    }

    const containersList = []
    let containerId = 1

    // Add 6m containers
    for (let i = 0; i < counts["6m"]; i++) {
      containersList.push({
        id: containerId++,
        containerKey: null,
        containerNum: "",
        weight: isImport ? "" : null,
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
        weight: isImport ? "" : null,
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
        weight: isImport ? "" : null,
        containerType: "Abnormal",
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

      // Real-time validation
      let error = null
      if (newValue.length > 0 && newValue.length < 11) {
        error = "Does not match correct format (ABCD1234567)"
      } else if (newValue.length === 11 && !/^[a-zA-Z]{4}[0-9]{7}$/.test(newValue)) {
        error = "Does not match correct format (ABCD1234567)"
      }

      // Update field errors
      setContainerFieldErrors((prev) => ({
        ...prev,
        [`container-${id}`]: error,
      }))
    }

    // Update the container value
    setContainers((prevContainers) =>
      prevContainers.map((container) =>
        container.id === id ? { ...container, [field]: value } : container
      )
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

      if (isImport && (container.weight === "" || container.weight === null)) {
        newErrors[`weight-${container.id}`] = "Field is required"
        isValid = false
      } else if (isImport && container.weight && !/^[0-9]*\.?[0-9]*$/.test(container.weight)) {
        newErrors[`weight-${container.id}`] = "Numbers only"
        isValid = false
      }
    }

    setContainerFieldErrors(newErrors)
    return isValid
  }

  // Count containers by type
  const countContainersByType = () => {
    const counts = {
      "6m": 0,
      "12m": 0,
      "Abnormal": 0,
    }

    containers.forEach((container) => {
      counts[container.containerType]++
    })

    return counts
  }

  // Handle save changes
  const handleSaveChanges = async () => {
    if (!validateContainers()) {
      return;
    }

    try {
      setIsContainerLoading(true);
      setContainerSuccessMessage("");

      // Calculate total cost based on container counts and rates
      const numSix = formData.num_six_meters || 0;
      const numTwelve = formData.num_twelve_meters || 0;
      const numAbnormal = formData.num_abnormal || 0;
      
      const ratePer6 = numSix > 0 ? Number(formData.rateper_6 || 0) : 0;
      const ratePer12 = numTwelve > 0 ? Number(formData.rateper_12 || 0) : 0;
      const ratePerAbnormal = numAbnormal > 0 ? Number(formData.rateper_abnormal || 0) : 0;
      
      const baseCost = ratePer6 * numSix + ratePer12 * numTwelve + ratePerAbnormal * numAbnormal;
      const surchargeAmount = formData.surcharges ? Number(formData.surcharge || 0) : 0;
      const totalCost = Number((baseCost + surchargeAmount).toFixed(2));

      // Prepare instruction update data
      const instructionUpdateData = {
        ...formData,
        clientId: formData.clientId,  // Ensure clientId is included
        client: formData.clientId,    // Map to 'client' field for the database
        total_cost: totalCost,
        status: formData.status || "In progress",
      };
      
      console.log('Saving instruction with data:', instructionUpdateData);

      // Prepare container data for API
      const containerData = containers.map((container) => ({
        containerKey: container.containerKey,
        containernum: container.containerNum,
        weight: container.weight ? parseFloat(container.weight) : null,
        container_type: container.containerType,
        cargo_description: container.cargoDescription,
      }));

      // Update instruction
      await api.put(`/api/instructions/fc/instruction/${instructionId}`, instructionUpdateData);
      
      // Update containers
      await api.put(`/api/instructions/fc/containers/${instructionId}`, containerData);
      
      // Show success message and redirect
      setContainerSuccessMessage("Changes saved successfully!");
      
      // Redirect to instruction list after a short delay
      setTimeout(() => {
        navigate('/instructions/list');
      }, 1500);

      setContainerSuccessMessage("Changes saved successfully!")
      setIsContainerDataModified(false)
      setTimeout(() => setContainerSuccessMessage(""), 3000)
    } catch (error) {
      console.error("Error saving container details:", error)
      setErrorModal({
        isOpen: true,
        message: error.response?.data?.message || "Failed to save container details. Please try again.",
      })
    } finally {
      setIsContainerLoading(false)
    }
  }

  // Initialize containers when component mounts or container counts change
  useEffect(() => {
    console.log("Container loading effect triggered");
    console.log("Current instructionId:", instructionId);
    
    const loadContainers = async () => {
      // If we already have containers from the instruction data, don't load them again
      if (containers && containers.length > 0) {
        console.log("Containers already loaded from instruction data");
        return;
      }

      if (!instructionId) {
        console.log("No instructionId, initializing empty containers");
        initializeContainers();
        return;
      }

      // Only fetch containers if we don't have any yet
      console.log("No containers loaded yet, fetching from API for instruction:", instructionId);
      setIsContainerLoading(true);
      
      try {
        const response = await api.get(`/api/instructions/fc/instruction/${instructionId}`);
        console.log("Containers API response:", response.data);
        
        if (response.data && response.data.length > 0) {
          const containersList = response.data.map((container, index) => ({
            id: container.containerkey || index + 1,
            containerKey: container.containerkey,
            containerNum: container.containernum || "",
            weight: container.weight !== null && container.weight !== undefined ? container.weight.toString() : "",
            containerType: container.container_type || "6m",
            cargoDescription: container.cargo_description || "",
          }));
          
          console.log("Setting containers from API:", containersList);
          setContainers(containersList);
          setIsContainerDataModified(false);
        } else if (formData.num_six_meters > 0 || formData.num_twelve_meters > 0 || formData.num_abnormal > 0) {
          console.log("No containers found in API, initializing based on form counts");
          initializeContainers();
        }
      } catch (error) {
        console.error("Error loading containers:", error);
        if (error.response) {
          console.error("Error response data:", error.response.data);
          console.error("Error status:", error.response.status);
        }
        // Even if there's an error, try to initialize containers based on form data
        if (formData.num_six_meters > 0 || formData.num_twelve_meters > 0 || formData.num_abnormal > 0) {
          console.log("Error occurred, initializing containers based on form counts");
          initializeContainers();
        }
      } finally {
        setIsContainerLoading(false);
      }
    };

    loadContainers();
  }, [instructionId, formData.num_six_meters, formData.num_twelve_meters, formData.num_abnormal, containers]);

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
    console.log('Initial data fetch started');
    
    const fetchInitialData = async () => {
      try {
        await Promise.all([
          fetchClients(),
          fetchShipmentTypes()
        ]);
        
        // If we have an instructionId and no preserved data, fetch the instruction
        if (instructionId && !preservedFormData) {
          console.log("Calling fetchInstructionData with ID:", instructionId);
          await fetchInstructionData(instructionId);
        } else if (preservedFormData) {
          // If we have preserved data, update the import state
          if (preservedFormData.shipmentTypeName) {
            setIsImport(preservedFormData.shipmentTypeName.toLowerCase() === "import");
          }
          // Update form data with preserved data
          setFormData(prev => ({ ...prev, ...preservedFormData }));
        }
      } catch (error) {
        console.error("Error in initial data fetch:", error);
        setErrorModal({
          open: true,
          message: "Failed to load initial form data. Please try again."
        });
      } finally {
        setIsLoading(prev => ({ ...prev, instruction: false }));
      }
    };
    
    // Call the fetchInitialData function
    fetchInitialData();
  }, [instructionId, preservedFormData]);

  // Update form data when preserved data changes
  useEffect(() => {
    if (preservedFormData) {
      console.log("Updating form with preserved data:", preservedFormData);

      // Format dates before setting form data
      const formattedData = {
        ...preservedFormData,
        pickupDate: formatDateForInput(preservedFormData.pickupDate),
        stackDate: formatDateForInput(preservedFormData.stackDate),
        deadline: preservedFormData.deadline ? formatDateForInput(preservedFormData.deadline) : ""
      };

      // Update form data
      if (containerCounts) {
        console.log("Updating form data with container counts:", containerCounts);
        const newFormData = {
          ...formattedData,
          num_six_meters: containerCounts["6m"] || 0,
          num_twelve_meters: containerCounts["12m"] || 0,
          num_abnormal: containerCounts["Abnormal"] || 0,
          rateWeight: "Container",
          weight: ""
        };
        setFormData(newFormData);
        // Update previous counts
        setPrevContainerCounts({
          num_six_meters: containerCounts["6m"] || 0,
          num_twelve_meters: containerCounts["12m"] || 0,
          num_abnormal: containerCounts["Abnormal"] || 0,
        });
      }

      // Update shipment type
      if (preservedFormData.shipmentTypeName) {
        setIsImport(preservedFormData.shipmentTypeName.toLowerCase() === "import")
      }

      // Update rate values from preserved data - check multiple possible sources
      if (preservedFormData.sixMeterRate !== undefined) {
        setFormData(prev => ({ ...prev, rateper_6: preservedFormData.sixMeterRate }))
      } else if (preservedFormData.rateper_6 !== undefined) {
        setFormData(prev => ({ ...prev, rateper_6: preservedFormData.rateper_6 }))
      }

      if (preservedFormData.twelveMeterRate !== undefined) {
        setFormData(prev => ({ ...prev, rateper_12: preservedFormData.twelveMeterRate }))
      } else if (preservedFormData.rateper_12 !== undefined) {
        setFormData(prev => ({ ...prev, rateper_12: preservedFormData.rateper_12 }))
      }

      if (preservedFormData.abnormalRate !== undefined) {
        setFormData(prev => ({ ...prev, rateper_abnormal: preservedFormData.abnormalRate }))
      } else if (preservedFormData.rateper_abnormal !== undefined) {
        setFormData(prev => ({ ...prev, rateper_abnormal: preservedFormData.rateper_abnormal }))
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
        setFormData(prev => ({ ...prev, rateper_6: newRate }))
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
        setFormData(prev => ({ ...prev, rateper_12: newRate }))
        console.log(`Auto-populated 12m rate: ${newRate} (count changed from 0 to ${formData.num_twelve_meters})`)
      }
    }

    // Clear rates when count goes to 0
    if (formData.num_six_meters === 0 && prevContainerCounts.num_six_meters > 0) {
      setFormData(prev => ({ ...prev, rateper_6: "" }))
      console.log("Cleared 6m rate (count went to 0)")
    }

    if (formData.num_twelve_meters === 0 && prevContainerCounts.num_twelve_meters > 0) {
      setFormData(prev => ({ ...prev, rateper_12: "" }))
      console.log("Cleared 12m rate (count went to 0)")
    }

    if (formData.num_abnormal === 0 && prevContainerCounts.num_abnormal > 0) {
      setFormData(prev => ({ ...prev, rateper_abnormal: "" }))
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
  ])

  // Fetch instruction data by ID
  const fetchInstructionData = async (id) => {
    if (!id) {
      console.error('No instruction ID provided to fetchInstructionData');
      return;
    }
    
    console.log('fetchInstructionData called with id:', id);
    setIsLoading(prev => ({ ...prev, instruction: true }));
    try {
      console.log(`Fetching instruction data for ID: ${id}`);
      const response = await api.get(`/api/instructions/fc/instruction/${id}`);
      const data = response.data;

      console.log("Instruction data received:", data);
      
      if (!data) {
        throw new Error("No data returned from server");
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
        surcharges: data.surchages || false,
        surcharge: data.surcharge || 0,
        pickupTime: data.pickuptime ? data.pickuptime.substring(0, 5) : "",
        pickupDate: formatDateForInput(data.pickupDate) || "",
        stackDate: formatDateForInput(data.stackDate) || "",
        deadline: data.deadline ? formatDateForInput(new Date(data.deadline).toLocaleDateString()) : "",
        fileRef: data.fileref || "",
        bookingRef: data.booking_ref || "",
        rateWeight: data.rateweight || "Container",
        weight: data.weight || "",
        num_six_meters: data.num_six_meters || 0,
        num_twelve_meters: data.num_twelve_meters || 0,
        num_abnormal: data.num_abnormal || 0,
        vat: data.vat || 15,
        description: data.description || "",
        vesselName: data.vessel_name || "",
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
      setFormData(prev => ({ ...prev, rateper_6: (data.rateper_6 || 0).toString() }))
      setFormData(prev => ({ ...prev, rateper_12: (data.rateper_12 || 0).toString() }))
      setFormData(prev => ({ ...prev, rateper_abnormal: (data.rateper_abnormal || 0).toString() }))
      setWeight("")

      // Process containers if they exist in the response
      if (data.containers && data.containers.length > 0) {
        console.log('Processing containers from instruction data:', data.containers);
        const containersList = data.containers.map((container, index) => ({
          id: container.containerkey || index + 1,
          containerKey: container.containerkey,
          containerNum: container.containernum || "",
          weight: container.weight !== null && container.weight !== undefined ? container.weight.toString() : "",
          containerType: container.container_type || "6m",
          cargoDescription: container.cargo_description || "",
        }));
        
        console.log('Setting containers from instruction data:', containersList);
        setContainers(containersList);
        setIsContainerDataModified(false);
      } else {
        console.log('No containers found in instruction data, initializing based on counts');
        initializeContainers();
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
      console.log('Client ID available, fetching starting points and destinations');
      fetchStartingPoints();
      
      // If we have a pickup value, use it to fetch destinations
      if (formData.pickup) {
        fetchDestinations(formData.pickup);
      }
    }
  }, [formData.clientId, formData.pickup]);

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
      console.log("No client ID available to fetch starting points");
      setStartingPoints([]);
      setIsLoading(prev => ({ ...prev, startingPoints: false }));
      return;
    }
    
    setIsLoading((prev) => ({ ...prev, startingPoints: true }));
    try {
      console.log(`Fetching starting points for client ${formData.clientId}...`);
      const response = await api.get(`/api/instructions/client/${formData.clientId}/starting-points`);
      console.log("Starting points data received:", response.data);
      
      // Ensure we have an array of objects with the correct structure
      const formattedStartingPoints = Array.isArray(response.data) 
        ? response.data.map((point, index) => ({
            id: point.id || `point-${index}`,
            startingpoint: point.starting_point || point.startingpoint || String(point)
          })).filter(point => point.startingpoint) // Filter out any null/undefined values
        : [];
      
      console.log('Formatted starting points:', formattedStartingPoints);
      
      setStartingPoints(formattedStartingPoints);
      
      // If there's only one starting point, select it by default
      if (formattedStartingPoints.length === 1 && !formData.pickup) {
        setFormData(prev => ({
          ...prev,
          pickup: formattedStartingPoints[0].startingpoint
        }));
      }
    } catch (error) {
      console.error("Error fetching starting points:", error);
      let errorMessage = "Failed to fetch starting points. Please try again.";
      if (error.response) {
        const { status } = error.response;
        errorMessage = `Failed to fetch starting points: ${status} ${error.response.statusText}`;
      } else if (error.request) {
        errorMessage = "No response received from server. Please check your connection.";
      }
      setErrorModal({
        isOpen: true,
        message: errorMessage,
      });
      setStartingPoints([]);
    } finally {
      setIsLoading((prev) => ({ ...prev, startingPoints: false }));
    }
  };

  const fetchDestinations = async (startingPoint) => {
    if (!startingPoint) {
      setDestinations([]);
      return;
    }
    if (!formData.clientId || !startingPoint) {
      console.log("No client ID or starting point available to fetch destinations");
      setDestinations([]);
      setIsLoading(prev => ({ ...prev, destinations: false }));
      return;
    }
    
    setIsLoading((prev) => ({ ...prev, destinations: true }));
    try {
      console.log(`Fetching destinations for client ${formData.clientId} and starting point ${startingPoint}...`);
      const response = await api.get(`/api/instructions/client/${formData.clientId}/destinations/${encodeURIComponent(startingPoint)}`);
      console.log("Destinations data received:", response.data);
      
      // Ensure we have an array of objects with the correct structure
      const formattedDestinations = Array.isArray(response.data)
        ? response.data.map(dest => ({
            id: dest.id || dest.destination,
            destination: dest.destination || String(dest)
          }))
        : [];
      
      setDestinations(formattedDestinations);
      
      // If there's only one destination, select it by default
      if (formattedDestinations.length === 1 && !formData.dropoff) {
        setFormData(prev => ({
          ...prev,
          dropoff: formattedDestinations[0].destination
        }));
      }
    } catch (error) {
      console.error("Error fetching destinations:", error);
      let errorMessage = "Failed to fetch destinations. Please try again.";
      if (error.response) {
        const { status } = error.response;
        errorMessage = `Failed to fetch destinations: ${status} ${error.response.statusText}`;
      } else if (error.request) {
        errorMessage = "No response received from server. Please check your connection.";
      }
      setErrorModal({
        isOpen: true,
        message: errorMessage,
      });
      setDestinations([]);
    } finally {
      setIsLoading((prev) => ({ ...prev, destinations: false }));
    }
  };

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

  // Format date from any format to YYYY-MM-DD for input[type="date"]
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    // Handle MM/DD/YYYY format
    if (dateString.includes('/')) {
      const [month, day, year] = dateString.split('/');
      if (year && month && day) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
    
    // Try to parse as Date object if not in expected format
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (e) {
      console.error('Error formatting date:', e);
    }
    
    return dateString; // Return original if can't parse
  };

  // Fetch rates based on pickup location
  const fetchRates = async (pickupLocation) => {
    if (!formData.clientId || !pickupLocation) return;
    
    console.log('Fetching rates for client:', formData.clientId, 'and location:', pickupLocation);
    
    try {
      // First, get the default destination for this client and pickup location
      const destinations = await api.get(`/api/instructions/client/${formData.clientId}/destinations/${encodeURIComponent(pickupLocation)}`);
      const defaultDestination = destinations.data?.[0]?.destination;
      
      if (!defaultDestination) {
        console.log('No default destination found for pickup location:', pickupLocation);
        return;
      }
      
      console.log('Using default destination:', defaultDestination);
      
      // Then fetch rates with both start and destination using FC-specific endpoint
      const response = await api.get(`/api/instructions/fc/client/${formData.clientId}/rates`, {
        params: { 
          start: pickupLocation,
          destination: defaultDestination
        }
      });
      
      console.log('Rates API response:', response.data);
      
      if (response.data) {
        // Handle both array and object responses
        const rateData = Array.isArray(response.data) ? response.data[0] : response.data;
        
        if (rateData) {
          // Try to get rates with different possible property names
          const rate6m = rateData.rateper_6 || rateData['6m_rate'] || rateData.sixMeterRate || 0;
          const rate12m = rateData.rateper_12 || rateData['12m_rate'] || rateData.twelveMeterRate || 0;
          const abnormalRate = rateData.rateper_abnormal || rateData.abnormalRate || 0;
          const surcharge = rateData.surcharge || rateData.surcharges || 0;
          
          console.log('Setting rates:', { rate6m, rate12m, abnormalRate, surcharge });
          
          setFormData(prev => ({
            ...prev,
            rateper_6: rate6m,
            rateper_12: rate12m,
            rateper_abnormal: abnormalRate,
            surcharge: surcharge
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching rates:', error);
      console.error('Error details:', error.response?.data || error.message);
      
      // Only reset rates if they haven't been set yet
      setFormData(prev => ({
        ...prev,
        rateper_6: prev.rateper_6 || 0,
        rateper_12: prev.rateper_12 || 0,
        rateper_abnormal: prev.rateper_abnormal || 0,
        surcharge: prev.surcharge || 0
      }));
    }
  };

  const handlePickupChange = async (e) => {
    const pickupLocation = e.target.value;
    
    // Update the pickup location in form data
    setFormData(prev => ({
      ...prev,
      pickup: pickupLocation,
      dropoff: '' // Clear the dropoff when pickup changes
    }));
    
    // Fetch new rates and destinations for the selected pickup location
    await Promise.all([
      fetchRates(pickupLocation),
      fetchDestinations(pickupLocation)
    ]);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let processedValue = type === 'checkbox' ? checked : value;
    
    // Handle date inputs
    if (type === 'date') {
      processedValue = formatDateForInput(value);
    }
    
    // Handle special field types
    if (name === 'imoNo') {
      processedValue = value.replace(/[^0-9]/g, '').slice(0, 15);
    } else if (name === 'flagReg') {
      processedValue = value.replace(/[^a-zA-Z\s\-']/g, '');
    }
    
    // Update form data
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
    
    // Clear any existing error for this field
    setFieldErrors(prev => ({
      ...prev,
      [name]: ''
    }));
  };

  const handleNumericInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "num_six_meters" || name === "num_twelve_meters" || name === "num_abnormal") {
      const numValue = Number.parseInt(value);
      const validValue = isNaN(numValue) ? 0 : Math.max(0, numValue);
      const prevValue = formData[name];
      const isIncreasing = validValue > prevValue;
      const difference = Math.abs(validValue - prevValue);
      
      // Update the form data
      const updatedFormData = {
        ...formData,
        [name]: validValue,
      };
      setFormData(updatedFormData);

      // Update the preserved containers if needed
      if (preservedContainers) {
        let containerType;
        if (name === "num_six_meters") containerType = "6m";
        else if (name === "num_twelve_meters") containerType = "12m";
        else if (name === "num_abnormal") containerType = "Abnormal";

        if (containerType) {
          updatePreservedContainers(containerType, isIncreasing, difference);
        }
      }

      // Calculate total cost using individual rates
      const sixRate = Number(formData.rateper_6 || 0)
      const twelveRate = Number(formData.rateper_12 || 0)
      const abnormalRateNum = Number(formData.rateper_abnormal || 0)

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

  const handleRateChange = (e) => {
    const { name, value } = e.target;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      // Update the rate in form data
      const updatedFormData = {
        ...formData,
        [name]: value === "" ? "" : Number(value) || 0
      };
      
      // Recalculate total cost
      const sixRate = Number(updatedFormData.rateper_6 || 0);
      const twelveRate = Number(updatedFormData.rateper_12 || 0);
      const abnormalRateNum = Number(updatedFormData.rateper_abnormal || 0);
      
      updatedFormData.total_cost = 
        (updatedFormData.num_six_meters || 0) * sixRate +
        (updatedFormData.num_twelve_meters || 0) * twelveRate +
        (updatedFormData.num_abnormal || 0) * abnormalRateNum;
      
      setFormData(updatedFormData);
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
    const numValue = Number.parseInt(value);
    const validValue = isNaN(numValue) ? 0 : Math.max(0, numValue);
    const prevValue = formData[type];
    const isIncreasing = validValue > prevValue;
    const difference = Math.abs(validValue - prevValue);
    
    // Update the form data
    const updatedFormData = {
      ...formData,
      [type]: validValue,
    };

    // Calculate total cost using individual rates
    const sixRate = Number(formData.rateper_6 || 0)
    const twelveRate = Number(formData.rateper_12 || 0)
    const abnormalRateNum = Number(formData.rateper_abnormal || 0)

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
      if (formData.rateper_abnormal === "" || formData.rateper_abnormal === "0" || Number(formData.rateper_abnormal) === 0) {
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

      const totalCost =
        formData.num_six_meters * sixRate +
        formData.num_twelve_meters * twelveRate +
        formData.num_abnormal * abnormalRateNum

      const totalContainers = formData.num_six_meters + formData.num_twelve_meters + formData.num_abnormal

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
  const isLoadingComplete = !isLoading.clients && 
    !isLoading.shipmentTypes && 
    !isLoading.startingPoints && 
    !isLoading.destinations && 
    !isLoading.instruction &&
    Object.keys(formData).length > 0; // Ensure formData is initialized

  // Debug log for loading states
  console.log('Loading states:', {
    clients: isLoading.clients,
    shipmentTypes: isLoading.shipmentTypes,
    startingPoints: isLoading.startingPoints,
    destinations: isLoading.destinations,
    instruction: isLoading.instruction,
    formDataKeys: Object.keys(formData),
    isLoadingComplete
  });

  // Ensure we have all required data before rendering the form
  if (!isLoadingComplete) {
    return (
      <div style={{ textAlign: "center", padding: "20px" }}>
        <p>Loading data...</p>
      </div>
    );
  }

  // Check if we have all required data
  console.log('Data availability check:', {
    clients: clients.length,
    shipmentTypes: shipmentTypes.length,
    startingPoints: startingPoints.length,
    destinations: destinations.length
  });

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
            marginTop: "10px"
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // Log form data before render
  console.log('Rendering with formData:', formData);
  console.log('Client options:', clients.map(c => ({ id: c.m5clientkey, name: c.companyname })));
  console.log('Current client selection:', formData.clientId);

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
          <div className="controller-instructions-form-section controller-instructions-client-info-section">
          <div className="controller-instructions-form-row">
            <div className="controller-instructions-form-field">
              <label>Client</label>
              <div className="controller-instructions-select-wrapper" ref={fieldRefs.clientId}>
                <select
                  style={nonEditableStyle}
                  className={`dropdown ${fieldErrors.clientId ? "controller-instructions-error-field" : ""}`}
                  name="clientId"
                  value={formData.clientId || ''}
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
                style={nonEditableStyle}
                value={formData.representative || ''}
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
                        ref={fieldRefs.rateper_6}
                      >
                        <input
                          type="text"
                          className={`controller-instructions-form-input ${fieldErrors.rateper_6 ? "controller-instructions-error-field" : ""}`}
                          placeholder="Rate"
                          value={formData.rateper_6 || ""}
                          name="rateper_6"
                          onChange={handleRateChange}
                          disabled={formData.num_six_meters === 0}
                          style={formData.num_six_meters === 0 ? nonEditableStyle : {}}
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
                        onChange={(e) => handleContainerCountChange("num_twelve_meters", e.target.value)}
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
                          disabled={formData.num_twelve_meters === 0}
                          style={formData.num_twelve_meters === 0 ? nonEditableStyle : {}}
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
                        onChange={(e) => handleContainerCountChange("num_abnormal", e.target.value)}
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
                          disabled={formData.num_abnormal === 0}
                          style={formData.num_abnormal === 0 ? nonEditableStyle : {}}
                        />
                        <ErrorTooltip message={fieldErrors.rateper_abnormal} />
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                      {formData.surcharges && (
                        <div className="controller-instructions-input-wrapper" style={{ width: '150px', marginLeft: '10px' }}>
                          <input
                            type="number"
                            className="controller-instructions-form-input"
                            name="surcharge"
                            value={formData.surcharge || ''}
                            onChange={handleInputChange}
                            min="0"
                            step="0.01"
                            placeholder="Amount"
                            style={{ width: '100%', padding: '4px 8px' }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {/* Main form section */}
              <div className="controller-instructions-booking-vertical-group" style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px", maxWidth: "220px" }}>
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
                {/* This surcharges section has been moved to be next to the checkbox */}

                {/* Compact Rates per dropdown inserted below VAT */}
                <div className="controller-instructions-form-field">
                  <label>Rates per</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="controller-instructions-select-wrapper" style={{ minWidth: '80px' }}>
                      <select
                        className="controller-instructions-dropdown"
                        name="rateWeight"
                        value={formData.rateWeight}
                        onChange={handleInputChange}
                        style={{ width: '100%', padding: '4px 8px' }}
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
                        style={{ width: '150px' }}
                        ref={fieldRefs.weight}
                      >
                        <input
                          type="text"
                          className={`controller-instructions-form-input ${fieldErrors.weight ? "controller-instructions-error-field" : ""}`}
                          placeholder={`Enter ${formData.rateWeight}`}
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
              </div>
              {/* End of main form section */}

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
                        value={formData.pickup || ""}
                        onChange={handlePickupChange}
                        disabled={isLoading.startingPoints || startingPoints.length === 0}
                        style={{ width: "100%", maxWidth: "75%" }}
                      >
                        <option value="" disabled>
                          {startingPoints.length === 0 ? "No locations available" : "Select Pick-Up Location"}
                        </option>
                        {Array.isArray(startingPoints) && startingPoints.map((point) => {
                          const pointValue = point.startingpoint;
                          return (
                            <option 
                              key={point.id}
                              value={pointValue}
                            >
                              {pointValue}
                            </option>
                          );
                        })}
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
        {/* Container Details Section */}
        <div className="container-details-section" style={{ marginTop: '30px' }}>
          <h3>Container Details</h3>
          
          {containerSuccessMessage && (
            <div className="success-message" style={{ color: 'green', marginBottom: '15px' }}>
              {containerSuccessMessage}
            </div>
          )}

          {isContainerLoading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <p>Loading container data...</p>
            </div>
          ) : (containers && containers.length > 0) ? (
            <div className="container-table-wrapper">
              <table className="container-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Container Type</th>
                    <th>Container Number</th>
                    {isImport && <th>Weight</th>}
                    <th>Cargo Description</th>
                  </tr>
                </thead>
                <tbody>
                  {containers.map((container) => (
                    <tr key={container.id}>
                      <td>{container.id}</td>
                      <td>{container.containerType}</td>
                      <td className="input-cell">
                        <div className="input-wrapper">
                          <input
                            type="text"
                            value={container.containerNum}
                            onChange={(e) => handleContainerChange(container.id, 'containerNum', e.target.value)}
                            className={`container-input ${
                              containerFieldErrors[`container-${container.id}`] ? 'error-field' : ''
                            }`}
                            placeholder="ABCD1234567"
                            maxLength={11}
                          />
                          {containerFieldErrors[`container-${container.id}`] && (
                            <ErrorTooltip message={containerFieldErrors[`container-${container.id}`]} />
                          )}
                        </div>
                      </td>
                      {isImport && (
                        <td className="input-cell">
                          <div className="input-wrapper">
                            <input
                              type="text"
                              value={container.weight || ''}
                              onChange={(e) => handleContainerChange(container.id, 'weight', e.target.value)}
                              className={`container-input ${
                                containerFieldErrors[`weight-${container.id}`] ? 'error-field' : ''
                              }`}
                              placeholder="Weight"
                            />
                            {containerFieldErrors[`weight-${container.id}`] && (
                              <ErrorTooltip message={containerFieldErrors[`weight-${container.id}`]} />
                            )}
                          </div>
                        </td>
                      )}
                      <td className="input-cell">
                        <div className="input-wrapper">
                          <input
                            type="text"
                            value={container.cargoDescription || ''}
                            onChange={(e) => handleContainerChange(container.id, 'cargoDescription', e.target.value)}
                            className="container-input"
                            placeholder="Cargo description"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <p>No containers to display. {instructionId ? 'No containers found for this instruction.' : 'Please add container counts above.'}</p>
              {instructionId && (
                <button 
                  onClick={initializeContainers}
                  className="btn btn-primary"
                  style={{ marginTop: '10px' }}
                >
                  Add Containers Manually
                </button>
              )}
            </div>
          )}

          <div className="submit-section" style={{ marginTop: '20px', textAlign: 'right' }}>
            <button
              className="save-button"
              onClick={handleSaveChanges}
              disabled={isContainerLoading || !isContainerDataModified}
              style={{
                backgroundColor: isContainerLoading || !isContainerDataModified ? '#cccccc' : '#4CAF50',
                color: 'white',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '4px',
                cursor: isContainerLoading || !isContainerDataModified ? 'not-allowed' : 'pointer',
              }}
            >
              {isContainerLoading ? 'Saving...' : 'Save Changes'}
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
      </div>
    </div>
  )
}

export default FCcontrollerinstructions
