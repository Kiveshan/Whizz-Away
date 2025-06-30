// "use client"

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react"
import "../../css/controllerinstruction.css"
import { useNavigate, useLocation } from "react-router-dom"
import ErrorModal from "../../../../components/ErrorModal"
import api from "../../../../api"

const ControllerInstructions = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const isMounted = useRef(true);

  // Memoize initial data to prevent recreation on re-renders
  const initialData = useMemo(() => ({
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
    surchargesAmount: "",
    num_six_meters: 0,
    num_twelve_meters: 0,
    num_abnormal: 0,
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
    vat: 15,
    description: "",
    total_cost: 0,
    sixMeterRate: "",
    twelveMeterRate: "",
    abnormalRate: "",
  }), []);

  const preservedFormData = useMemo(() => location.state?.preservedFormData || null, [location.state]);
  const containerCounts = useMemo(() => location.state?.containerCounts || {
    '6m': 0,
    '12m': 0,
    'Abnormal': 0
  }, [location.state]);

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
  
  // Form validation state
  const [fieldErrors, setFieldErrors] = useState({})
  
  // State for client-specific locations 
  const [clientStartingPoints, setClientStartingPoints] = useState([])
  const [clientDestinations, setClientDestinations] = useState([])
  const [isLoadingLocations, setIsLoadingLocations] = useState(false)
  const [locationError, setLocationError] = useState(null)
  const [showNoRatesModal, setShowNoRatesModal] = useState(false)
  const [weight, setWeight] = useState("")

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Special handling for IMO number (numbers only)
    if (name === 'imoNo' && value !== '' && !/^\d*$/.test(value)) {
      return; // Don't update if not a number
    }
    
    // Special handling for Flag Registration (letters and spaces only)
    if (name === 'flagReg' && value !== '' && !/^[A-Za-z\s]*$/.test(value)) {
      return; // Don't update if contains non-letter characters
    }
    
    // Update form data
    const newValue = type === 'checkbox' ? checked : value;
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
    
    // Clear error when user starts typing and the field is no longer empty/invalid
    if (fieldErrors[name] && isFieldValid(name, newValue)) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Initialize containers based on counts while preserving existing container data
  const initializeContainers = (containerCounts = null) => {
    const counts = containerCounts || {
      num_six_meters: formData.num_six_meters || 0,
      num_twelve_meters: formData.num_twelve_meters || 0,
      num_abnormal: formData.num_abnormal || 0
    };
    
    // Create a map of existing containers by type and index
    const existingContainersByType = {
      '6m': [],
      '12m': [],
      'Abnormal': []
    };
    
    // Group existing containers by type
    containers.forEach(container => {
      if (existingContainersByType[container.containerType]) {
        existingContainersByType[container.containerType].push(container);
      }
    });
    
    const containersList = [];
    let containerId = 1;
    
    // Helper function to get or create container
    const getOrCreateContainer = (type, index) => {
      const existing = existingContainersByType[type];
      if (index < existing.length) {
        // Use existing container if available
        return {
          ...existing[index],
          id: containerId++
        };
      }
      // Create new container if needed
      return {
        id: containerId++,
        containerKey: null,
        containerNum: "",
        weight: isImport ? "" : null,
        containerType: type,
        cargoDescription: ""
      };
    };
    
    // Add 6m containers
    for (let i = 0; i < (counts.num_six_meters || 0); i++) {
      containersList.push(getOrCreateContainer('6m', i));
    }
    
    // Add 12m containers
    for (let i = 0; i < (counts.num_twelve_meters || 0); i++) {
      containersList.push(getOrCreateContainer('12m', i));
    }
    
    // Add abnormal containers
    for (let i = 0; i < (counts.num_abnormal || 0); i++) {
      containersList.push(getOrCreateContainer('Abnormal', i));
    }
    
    setContainers(containersList);
    setShowContainerDetails(containersList.length > 0);
  };

  // Handle container input changes
  const handleContainerChange = (id, field, value) => {
    if (field === "containerNum") {
      // Container number validation
      if (value.length > 11) return;
      
      // First 4 letters, then 7 numbers
      let newValue = "";
      for (let i = 0; i < value.length; i++) {
        const char = value[i];
        if (i < 4) {
          if (/^[a-zA-Z]$/.test(char)) newValue += char;
        } else if (/^[0-9]$/.test(char)) {
          newValue += char;
        }
      }
      
      // Update field errors
      let error = null;
      if (newValue.length > 0 && newValue.length < 11) {
        error = "Does not match correct format (ABCD1234567)";
      } else if (newValue.length === 11 && !/^[a-zA-Z]{4}[0-9]{7}$/.test(newValue)) {
        error = "Does not match correct format (ABCD1234567)";
      }
      
      setContainerFieldErrors(prev => ({
        ...prev,
        [`container-${id}`]: error
      }));
      
      value = newValue;
    } else if (field === "weight" && value !== "") {
      // Only allow numbers and decimal point for weight
      if (!/^\d*\.?\d*$/.test(value)) return;
    }
    
    // Update container
    setContainers(prev => 
      prev.map(container => 
        container.id === id ? { ...container, [field]: value } : container
      )
    );
  };

  // Initialize form data with preserved data if available, or default values
  const [formData, setFormData] = useState(() => {
    console.log('Initializing form data with:', { 
      preservedFormData, 
      containerCounts,
      locationState: location.state 
    });

    // Default form data structure
    const defaultFormData = {
      // Client and basic info
      clientId: '',
      clientName: '',
      representative: '',
      contactDetails: '',
      email: '',
      task: '',
      shipmentTypeId: '',
      shipmentTypeName: '',
      
      // Location data
      startingPoints: [],
      destinations: [],
      selectedStartingPoint: '',
      selectedDestination: '',
      pickup: '',
      dropoff: '',
      
      // Other form fields
      hazardous: false,
      surcharges: false,
      surchargesAmount: '',
      pickupTime: '',
      pickupDate: '',
      stackDate: '',
      deadline: '',
      fileRef: '',
      bookingRef: '',
      vesselName: '',
      voyageNo: '',
      imoNo: '',
      flagReg: '',
      rateWeight: 'Container',
      weight: '',
      vat: 15,
      description: '',
      rateper_6: '',
      rateper_12: '',
      rateper_abnormal: '',
      num_six_meters: 0,
      num_twelve_meters: 0,
      num_abnormal: 0,
      total_cost: 0,
      preserveSurcharges: false
    };

    // If no preserved data, return defaults
    if (!preservedFormData && !location.state) {
      console.log('Using default form data');
      return defaultFormData;
    }

    // Get location data from multiple possible sources with priority to location.state
    const locationData = {
      startingPoints: location.state?.startingPoints || preservedFormData?.startingPoints || [],
      destinations: location.state?.destinations || preservedFormData?.destinations || [],
      selectedStartingPoint: location.state?.selectedStartingPoint || 
                            preservedFormData?.selectedStartingPoint || 
                            preservedFormData?.pickup || 
                            location.state?.pickup ||
                            '',
      selectedDestination: location.state?.selectedDestination || 
                          preservedFormData?.selectedDestination || 
                          preservedFormData?.dropoff || 
                          location.state?.dropoff ||
                          ''
    };
    
    // Get container counts from multiple possible sources
    const containerCountsData = {
      num_six_meters: containerCounts?.['6m'] ?? preservedFormData?.num_six_meters ?? 0,
      num_twelve_meters: containerCounts?.['12m'] ?? preservedFormData?.num_twelve_meters ?? 0,
      num_abnormal: containerCounts?.['Abnormal'] ?? preservedFormData?.num_abnormal ?? 0
    };
    
    console.log('Initializing with location data:', locationData);
    console.log('Initial container counts:', containerCountsData);
    
    // Log all potential data sources for debugging
    console.log('Data sources for form initialization:', {
      defaultFormData: { ...defaultFormData },
      preservedFormData: preservedFormData ? { ...preservedFormData } : null,
      controllerData: location.state?.controllerData ? { ...location.state.controllerData } : null,
      locationState: location.state ? { ...location.state } : null
    });

    // Create form data with preserved values or fall back to defaults
    const formData = {
      // Start with default values
      ...defaultFormData,
      
      // Apply preserved form data (from sessionStorage or previous navigation)
      ...(preservedFormData || {}),
      
      // Then apply any controller data from location state (highest priority)
      ...(location.state?.controllerData || {}),
      
      // Apply location data with proper fallbacks
      startingPoints: Array.isArray(locationData.startingPoints) ? 
                     [...locationData.startingPoints] : 
                     [],
      destinations: Array.isArray(locationData.destinations) ? 
                   [...locationData.destinations] : 
                   [],
      selectedStartingPoint: locationData.selectedStartingPoint || '',
      selectedDestination: locationData.selectedDestination || '',
      
      // Apply container counts
      ...containerCountsData,
      
      // Explicitly set client data from controller data if available
      ...(location.state?.controllerData?.clientId && {
        clientId: location.state.controllerData.clientId,
        clientName: location.state.controllerData.clientName,
        representative: location.state.controllerData.representative,
        contactDetails: location.state.controllerData.contactDetails,
        email: location.state.controllerData.email
      }),
      
      // Handle pickup and dropoff with multiple fallback sources
      pickup: preservedFormData?.pickup || 
             location.state?.pickup || 
             location.state?.controllerData?.pickup || 
             locationData.selectedStartingPoint || 
             locationData.pickup ||
             '',
      dropoff: preservedFormData?.dropoff || 
              location.state?.dropoff || 
              location.state?.controllerData?.dropoff || 
              locationData.selectedDestination || 
              locationData.dropoff ||
              '',
      
      // Other special cases
      hazardous: Boolean(preservedFormData?.hazardous || false),
      surcharges: Boolean(preservedFormData?.surcharges || false),
      vat: Number(preservedFormData?.vat) || 15,
      total_cost: Number(preservedFormData?.total_cost) || 0
    };
    
    console.log('Form data initialized with locations:', {
      pickup: formData.pickup,
      dropoff: formData.dropoff,
      selectedStarting: formData.selectedStartingPoint,
      selectedDest: formData.selectedDestination,
      hasStartingPoints: formData.startingPoints?.length > 0,
      hasDestinations: formData.destinations?.length > 0
    });
    
    console.log('Initialized form data:', formData);
    return formData;
  });

  // Debug effect to log form data changes
  useEffect(() => {
    console.log('Form Data Updated:', {
      // Surcharge related fields
      surcharges: formData.surcharges,
      surchargesAmount: formData.surchargesAmount,
      preserveSurcharges: formData.preserveSurcharges,
      // Rate fields
      sixMeterRate: formData.sixMeterRate,
      twelveMeterRate: formData.twelveMeterRate,
      // Client and location
      clientId: formData.clientId,
      pickup: formData.pickup,
      dropoff: formData.dropoff
    });
  }, [formData]);

  // Get rate values from formData
  const sixMeterRate = formData.sixMeterRate || "";
  const twelveMeterRate = formData.twelveMeterRate || "";
  const abnormalRate = formData.abnormalRate || "";
  
  // Function to fetch rates for the selected client, pickup and dropoff
  const fetchRates = useCallback(async (clientId, start, destination) => {
    if (!clientId || !start || !destination) {
      console.log('[fetchRates] Missing required parameters:', { clientId, start, destination });
      return null;
    }
    
    const url = `/api/instructions/client/${clientId}/rates`;
    const params = { start, destination };
    
    console.log('[fetchRates] Making request to:', url, 'with params:', params);
    
    try {
      const response = await api.get(url, { params });
      
      console.log('[fetchRates] Response received:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        headers: response.headers
      });
      
      return response.data;
    } catch (error) {
      console.error('[fetchRates] Error fetching rates:', {
        message: error.message,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        } : 'No response',
        request: error.request,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          params: error.config?.params,
          headers: error.config?.headers
        },
        stack: error.stack
      });
      return null;
    }
  }, []);

  // Track previous values to prevent unnecessary updates
  const prevValuesRef = useRef({
    pickup: formData.pickup,
    dropoff: formData.dropoff,
    client: formData.client
  });

  // Memoize the fetchRates function to prevent recreation
  const memoizedFetchRates = useCallback(fetchRates, []);

  // Update rates when pickup or dropoff changes
  useEffect(() => {
    console.log('=== RATE FETCHING EFFECT TRIGGERED ===');
    console.log('Current form data:', {
      clientId: formData.clientId,
      pickup: formData.pickup,
      dropoff: formData.dropoff,
      num_six_meters: formData.num_six_meters,
      num_twelve_meters: formData.num_twelve_meters,
      num_abnormal: formData.num_abnormal
    });

    const { pickup, dropoff, clientId } = formData;
    
    // Check if we have all required fields
    if (!clientId || !pickup || !dropoff) {
      console.log('Missing required fields for rate fetching:', { 
        hasClientId: !!clientId,
        hasPickup: !!pickup,
        hasDropoff: !!dropoff 
      });
      return;
    }

    console.log('All required fields present, proceeding to fetch rates...');
    
    const fetchAndUpdateRates = async () => {
      try {
        console.log('Calling memoizedFetchRates with:', { clientId, pickup, dropoff });
        const rates = await memoizedFetchRates(clientId, pickup, dropoff);
        
        console.log('Rates received from API:', rates);
        
        setFormData(prev => {
          const updates = { ...prev };
          
          if (rates) {
            console.log('Updating form data with new rates:', rates);
            
            // Only update rates that are not null or undefined
            if (rates.sixMeterRate != null) {
              console.log('Setting sixMeterRate to:', rates.sixMeterRate);
              updates.sixMeterRate = rates.sixMeterRate;
            } else {
              console.log('sixMeterRate is null/undefined, clearing field');
              updates.sixMeterRate = ''; // Clear if null/undefined
            }
            
            if (rates.twelveMeterRate != null) {
              console.log('Setting twelveMeterRate to:', rates.twelveMeterRate);
              updates.twelveMeterRate = rates.twelveMeterRate;
            } else {
              console.log('twelveMeterRate is null/undefined, clearing field');
              updates.twelveMeterRate = ''; // Clear if null/undefined
            }
            
            if (rates.abnormalRate != null) {
              console.log('Setting abnormalRate to:', rates.abnormalRate);
              updates.abnormalRate = rates.abnormalRate;
            } else {
              console.log('abnormalRate is null/undefined, clearing field');
              updates.abnormalRate = ''; // Clear if null/undefined
            }
            
            // Handle surcharges - only set the amount, don't auto-check the box
            if (rates.surcharges !== undefined) {
              console.log('Processing surcharges:', rates.surcharges);
              const surchargesNum = parseFloat(rates.surcharges);
              const hasSurcharges = !isNaN(surchargesNum) && surchargesNum > 0;
              
              // Only set the amount, don't change the surcharges checkbox state here
              updates.surchargesAmount = hasSurcharges ? surchargesNum.toString() : '';
              updates.preserveSurcharges = hasSurcharges;
              
              console.log('Updated surcharge values (checkbox state unchanged):', {
                surcharges: updates.surcharges,
                surchargesAmount: updates.surchargesAmount,
                preserveSurcharges: updates.preserveSurcharges
              });
            }
          } else {
            console.log('No rates found for client, clearing all rate fields');
            // Clear all rate fields when no rates are found
            updates.sixMeterRate = '';
            updates.twelveMeterRate = '';
            updates.abnormalRate = '';
          }
          
          return updates;
        });
      } catch (error) {
        console.error('Error in fetchAndUpdateRates:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
      }
    };

    fetchAndUpdateRates();
  }, [formData.pickup, formData.dropoff, formData.clientId, memoizedFetchRates]);

  // Track which rate fields should be enabled
  const [rateFieldsEnabled, setRateFieldsEnabled] = useState({
    sixMeter: false,
    twelveMeter: false,
    abnormal: false,
  });

  // Update rate fields enabled state when container counts change
  useEffect(() => {
    const sixMeterEnabled = formData.num_six_meters > 0;
    const twelveMeterEnabled = formData.num_twelve_meters > 0;
    const abnormalEnabled = formData.num_abnormal > 0;

    const newState = {
      sixMeter: sixMeterEnabled,
      twelveMeter: twelveMeterEnabled,
      abnormal: abnormalEnabled,
    };
    
    console.log('Container counts:', {
      sixMeter: formData.num_six_meters,
      twelveMeter: formData.num_twelve_meters,
      abnormal: formData.num_abnormal,
      sixMeterRate: formData.sixMeterRate,
      twelveMeterRate: formData.twelveMeterRate,
      abnormalRate: formData.abnormalRate
    });
    
    // Only update state if it has changed
    if (JSON.stringify(rateFieldsEnabled) !== JSON.stringify(newState)) {
      console.log('Updating rate fields enabled state:', newState);
      setRateFieldsEnabled(newState);
    }
  }, [
    formData.num_six_meters, 
    formData.num_twelve_meters, 
    formData.num_abnormal,
    formData.sixMeterRate,
    formData.twelveMeterRate,
    formData.abnormalRate,
    rateFieldsEnabled
  ]);

  // Store client rates from database
  const [clientRates, setClientRates] = useState({
    sixMeter: null,
    twelveMeter: null,
    abnormal: null,
  })

  const [startingPoints, setStartingPoints] = useState([])
  const [destinations, setDestinations] = useState([])
  const [clients, setClients] = useState([])
  const [shipmentTypes, setShipmentTypes] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [containers, setContainers] = useState([]);
  const [showContainerDetails, setShowContainerDetails] = useState(false);
  const [containerFieldErrors, setContainerFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isLoading, setIsLoading] = useState({
    clients: true,
    shipmentTypes: true,
    startingPoints: true,
    destinations: true,
  });
  const [preservedContainers, setPreservedContainers] = useState(location.state?.preservedContainers || [])

  // Function to update rate field enabled state based on container counts
  const updateRateFieldsEnabled = (containerCounts) => {
    const newEnabledState = {
      sixMeter: containerCounts.num_six_meters > 0,
      twelveMeter: containerCounts.num_twelve_meters > 0,
      abnormal: containerCounts.num_abnormal > 0,
    }

    console.log("Updating rate fields enabled state:", newEnabledState)
    setRateFieldsEnabled(newEnabledState)

    // Clear disabled rate fields
    if (!newEnabledState.sixMeter) {
      setFormData(prev => ({ ...prev, sixMeterRate: "" }));
    }
    if (!newEnabledState.twelveMeter) {
      setFormData(prev => ({ ...prev, twelveMeterRate: "" }));
    }
    if (!newEnabledState.abnormal) {
      setFormData(prev => ({ ...prev, abnormalRate: "" }));
    }

    return newEnabledState
  }

  // Function to populate rates from database for enabled fields
  const populateRatesFromDatabase = (selectedClient, enabledFields) => {
    if (!selectedClient) {
      console.log("No selected client for rate population")
      return
    }

    console.log("Populating rates from database for client:", selectedClient.companyname)
    console.log("Enabled fields:", enabledFields)
    console.log(
      "Client rates - 6m:",
      selectedClient.driver_six_meter_rate,
      "12m:",
      selectedClient.driver_twelve_meter_rate,
    )

    // Only populate rates for enabled fields (container count > 0)
    if (enabledFields.sixMeter) {
      if (selectedClient.driver_six_meter_rate !== null && selectedClient.driver_six_meter_rate !== undefined) {
        console.log("Setting 6m rate from database:", selectedClient.driver_six_meter_rate)
        setFormData(prev => ({ ...prev, sixMeterRate: selectedClient.driver_six_meter_rate.toString() }));
      } else {
        console.log("No 6m rate available in database")
        setFormData(prev => ({ ...prev, sixMeterRate: "" }));
      }
    }

    if (enabledFields.twelveMeter) {
      if (selectedClient.driver_twelve_meter_rate !== null && selectedClient.driver_twelve_meter_rate !== undefined) {
        console.log("Setting 12m rate from database:", selectedClient.driver_twelve_meter_rate)
        setFormData(prev => ({ ...prev, twelveMeterRate: selectedClient.driver_twelve_meter_rate.toString() }));
      } else {
        console.log("No 12m rate available in database")
        setFormData(prev => ({ ...prev, twelveMeterRate: "" }));
      }
    }

    // Store client rates for later use
    setClientRates({
      sixMeter: selectedClient.driver_six_meter_rate,
      twelveMeter: selectedClient.driver_twelve_meter_rate,
      abnormal: null, // No abnormal rate in database yet
    })
  }

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

  // Fetch starting points when client changes or component mounts
  useEffect(() => {
    if (formData.clientId) {
      fetchStartingPoints();
    } else {
      // Clear starting points if no client is selected
      setStartingPoints([]);
    }
  }, [formData.clientId])

  // Handle client data from navigation state
  useEffect(() => {
    console.log('Location state changed:', location.state);
    
    // If we have client data in the location state, update the form
    if (location.state?.controllerData?.clientId) {
      console.log('Found client data in location state:', location.state.controllerData);
      const { clientId, clientName, representative, contactDetails, email } = location.state.controllerData;
      
      setFormData(prev => ({
        ...prev,
        clientId: clientId || '',
        clientName: clientName || '',
        representative: representative || '',
        contactDetails: contactDetails || '',
        email: email || ''
      }));
      
      // Clear the client data from location state to prevent reusing it
      window.history.replaceState({ ...location.state, controllerData: null }, '');
    }
  }, [location.state]);

  // Initial data loading effect
  useEffect(() => {
    fetchClients();
    fetchShipmentTypes();
    fetchDestinations();
    
    if (preservedFormData?.shipmentTypeName) {
      setIsImport(preservedFormData.shipmentTypeName.toLowerCase() === "import");
    }
  }, []);

  // Effect to handle rate population when clients load
  useEffect(() => {
    if (
      preservedFormData &&
      clients.length > 0 &&
      preservedFormData.clientId &&
      !preservedFormData.sixMeterRate && // Only populate if no preserved rates
      !preservedFormData.twelveMeterRate
    ) {
      console.log("Clients loaded - checking if we need to populate rates from database");

      const selectedClient = clients.find(
        (client) => client.m5clientkey.toString() === preservedFormData.clientId.toString(),
      );

      if (selectedClient) {
        console.log("Found selected client for rate population:", selectedClient.companyname);

        // Get current enabled state
        const currentEnabledState = {
          sixMeter: formData.num_six_meters > 0,
          twelveMeter: formData.num_twelve_meters > 0,
          abnormal: formData.num_abnormal > 0
        };

        // Update rate fields enabled state
        const newEnabledState = updateRateFieldsEnabled(formData);

        // Restore preserved rate values if they exist and fields are enabled
        if (preservedFormData.sixMeterRate !== undefined && newEnabledState.sixMeter) {
          console.log("Restoring preserved 6m rate:", preservedFormData.sixMeterRate);
          setFormData(prev => ({ ...prev, sixMeterRate: preservedFormData.sixMeterRate }));
        }
        if (preservedFormData.twelveMeterRate !== undefined && newEnabledState.twelveMeter) {
          console.log("Restoring preserved 12m rate:", preservedFormData.twelveMeterRate);
          setFormData(prev => ({ ...prev, twelveMeterRate: preservedFormData.twelveMeterRate }));
        }
        if (preservedFormData.abnormalRate !== undefined && newEnabledState.abnormal) {
          console.log("Restoring preserved abnormal rate:", preservedFormData.abnormalRate);
          setFormData(prev => ({ ...prev, abnormalRate: preservedFormData.abnormalRate }));
        }
      }
    }
  }, [clients, preservedFormData, formData]);

  // Separate useEffect to handle rate population when clients load
  useEffect(() => {
    if (
      preservedFormData &&
      clients.length > 0 &&
      preservedFormData.clientId &&
      !preservedFormData.sixMeterRate && // Only populate if no preserved rates
      !preservedFormData.twelveMeterRate
    ) {
      console.log("Clients loaded - checking if we need to populate rates from database")

      const selectedClient = clients.find(
        (client) => client.m5clientkey.toString() === preservedFormData.clientId.toString(),
      )

      if (selectedClient) {
        console.log("Found selected client for rate population:", selectedClient.companyname)

        // Get current enabled state
        const currentEnabledState = {
          sixMeter: formData.num_six_meters > 0,
          twelveMeter: formData.num_twelve_meters > 0,
          abnormal: formData.num_abnormal > 0,
        }

        // Only populate if fields are enabled and rates are empty
        if (currentEnabledState.sixMeter && sixMeterRate === "") {
          if (selectedClient.driver_six_meter_rate !== null && selectedClient.driver_six_meter_rate !== undefined) {
            console.log("Auto-populating 6m rate from database:", selectedClient.driver_six_meter_rate)
            setFormData(prev => ({ ...prev, sixMeterRate: selectedClient.driver_six_meter_rate.toString() }));
          }
        }

        if (currentEnabledState.twelveMeter && twelveMeterRate === "") {
          if (
            selectedClient.driver_twelve_meter_rate !== null &&
            selectedClient.driver_twelve_meter_rate !== undefined
          ) {
            console.log("Auto-populating 12m rate from database:", selectedClient.driver_twelve_meter_rate)
            setFormData(prev => ({ ...prev, twelveMeterRate: selectedClient.driver_twelve_meter_rate.toString() }));
          }
        }
      }
    }
  }, [clients, preservedFormData, formData.num_six_meters, formData.num_twelve_meters, sixMeterRate, twelveMeterRate])

  useEffect(() => {
    if (location.state?.preservedContainers) {
      setPreservedContainers(location.state.preservedContainers)
    }
  }, [location.state?.preservedContainers])

  // Handle client selection change
  const handleClientChange = async (e) => {
    // Don't do anything if the client hasn't actually changed
    if (e.target.value === formData.clientId) return;
    const clientId = e.target.value;
    console.log('Client changed to:', clientId);
    
    // Find the selected client from the clients array or from the location state
    let selectedClient = clients.find(client => client.m5clientkey.toString() === clientId);
    
    // If client not found in clients array but we have it in location state
    if (!selectedClient && location.state?.controllerData?.clientId === clientId) {
      console.log('Using client data from location state');
      selectedClient = {
        m5clientkey: clientId,
        client_name: location.state.controllerData.clientName,
        representative: location.state.controllerData.representative,
        cellnum: location.state.controllerData.contactDetails,
        email: location.state.controllerData.email
      };
    }
    
    console.log('Selected client data:', selectedClient);
    
    // Clear rates immediately when client changes but preserve surcharges
    setFormData(prev => {
      const updatedData = {
        ...prev,
        clientId,
        clientName: selectedClient?.client_name || '',
        representative: selectedClient?.representative || '',
        contactDetails: selectedClient?.contactDetails || selectedClient?.cellnum || '',
        email: selectedClient?.email || '',
        pickup: '',
        dropoff: '', // Clear destination
        sixMeterRate: '', // Clear rates
        twelveMeterRate: '',
        abnormalRate: ''
      };
      
      console.log('Updated form data with client:', updatedData);
      
      // Only clear surcharges if we're not preserving them
      if (!prev.preserveSurcharges) {
        updatedData.surcharges = false;
        updatedData.surchargesAmount = '';
      }
      
      return updatedData;
    });
    
    setClientStartingPoints([]); // Clear client-specific starting points
    setClientDestinations([]); // Clear client-specific destinations list
    setDestinations([]); // Clear global destinations list

    if (!clientId) return;
    
    try {
      setIsLoadingLocations(true)
      setLocationError(null)
      
      // Check if client has any rates
      try {
        const response = await api.get(`/api/instructions/client/${clientId}/check-rates`);
        if (!response.data?.hasRates) {
          console.log('Client has no rates, showing notification');
          setShowNoRatesModal(true);
        }
      } catch (error) {
        console.error('Error checking client rates:', error);
        // If we can't check rates, assume client has no rates to be safe
        setShowNoRatesModal(true);
      }
      
      // Fetch starting points for the selected client
      console.log(`Fetching starting points for client ID: ${clientId}`)
      
      // Make the API request
      const response = await api.get(`/api/instructions/client/${clientId}/starting-points`)
        .catch(error => {
          console.error('API Error:', error)
          if (error.response) {
            console.error('Error response:', error.response.status, error.response.data)
            // If 404, show no rates modal
            if (error.response.status === 404) {
              console.log('No rates found for this client')
              setShowNoRatesModal(true)
              return { data: [] }
            }
          }
          throw error
        })
      
      console.log('Starting points response:', response?.data)
      
      // If we got here, we have a successful response
      const responseData = response?.data || []
      
      console.log('[DEBUG] Raw response data:', JSON.stringify(responseData, null, 2))
      
      // Process the response data
      const startingPoints = responseData
        .map((item, index) => {
          try {
            console.log(`[DEBUG] Processing item ${index}:`, typeof item, item)
            
            // Handle different response formats
            if (typeof item === 'string') {
              console.log(`[DEBUG] String item: ${item}`)
              return { value: item, label: item }
            } else if (item && typeof item === 'object') {
              const point = item.starting_point || item.value || item.label || ''
              console.log(`[DEBUG] Object item - point: ${point}`, item)
              return point ? { value: point, label: point } : null
            }
            console.log(`[DEBUG] Unhandled item type:`, typeof item, item)
            return null
          } catch (e) {
            console.error('Error processing starting point:', item, e)
            return null
          }
        })
        .filter(Boolean) // Remove any null entries
      
      console.log('[DEBUG] Processed starting points:', startingPoints)
      
      if (startingPoints.length === 0) {
        console.log('No valid starting points found')
        setShowNoRatesModal(true)
        return
      }
      
      setClientStartingPoints(startingPoints)
      
      // If there's only one starting point, select it automatically
      if (startingPoints.length === 1) {
        console.log('Auto-selecting single starting point:', startingPoints[0].value)
        // Update form data with the selected pickup
        setFormData(prev => ({
          ...prev,
          pickup: startingPoints[0].value
        }))
        
        // Use setTimeout to ensure state updates are processed before fetching destinations
        setTimeout(async () => {
          try {
            // Fetch destinations for the selected pickup
            console.log('Fetching destinations for pickup:', startingPoints[0].value)
            const destResponse = await api.get(
              `/api/instructions/client/${clientId}/destinations/${encodeURIComponent(startingPoints[0].value)}`
            )
            
            // Process destinations
            const destinations = Array.isArray(destResponse.data)
              ? destResponse.data
                  .map(item => ({
                    value: item.destination || item.value || item.label || '',
                    label: item.destination || item.value || item.label || ''
                  }))
                  .filter(item => item.value) // Filter out any empty values
              : [];
            
            console.log('Fetched destinations:', destinations)
            setClientDestinations(destinations)
            
            // If there's exactly one destination, auto-select it
            if (destinations.length === 1) {
              console.log('Auto-selecting single destination:', destinations[0].value)
              setFormData(prev => ({
                ...prev,
                dropoff: destinations[0].value
              }))
              console.log('Auto-selected dropoff:', destinations[0].value)
            }
          } catch (error) {
            console.error('Error fetching destinations:', error)
            setLocationError('Failed to load destinations. Some features may be limited.')
          }
        }, 0)
      }
    } catch (error) {
      console.error('Error in handleClientChange:', error)
      setLocationError('Failed to load client data. Some features may be limited.')
    } finally {
      setIsLoadingLocations(false)
    }
  }

  const fetchClients = async () => {
    setIsLoading(prev => ({ ...prev, clients: true }));
    try {
      console.log("Fetching active clients...");
      const response = await api.get("/api/instructions/active-clients");
      
      if (!response.data) {
        throw new Error("No data received from server");
      }
      
      console.log("Active clients data received:", response.data);
      console.log("Number of clients:", response.data.length);
      
      if (!Array.isArray(response.data)) {
        throw new Error("Expected an array of clients but received:" + JSON.stringify(response.data));
      }
      
      // Transform the data to ensure it has the expected structure
      const clientsData = response.data.map(client => ({
        m5clientkey: client.m5clientkey,
        companyname: client.companyname || client.client || 'Unknown Company',
        representative: client.representative || '',
        email: client.email || '',
        contactDetails: client.cellnum || '',
        driver_six_meter_rate: client.driver_six_meter_rate || null,
        driver_twelve_meter_rate: client.driver_twelve_meter_rate || null
      }));
      
      console.log('Setting clients state with:', clientsData);
      setClients(clientsData);
      return clientsData;
    } catch (error) {
      console.error("Error in fetchClients:", error)
      let errorMessage = "Failed to fetch active clients. Please try again."
      
      if (error.response) {
        // Server responded with a status code outside 2xx
        console.error("Response error:", error.response.status, error.response.data)
        errorMessage = `Server error: ${error.response.status} - ${error.response.statusText}`
        if (error.response.data?.error) {
          errorMessage += ` - ${error.response.data.error}`
        }
      } else if (error.request) {
        // No response received
        console.error("No response received:", error.request)
        errorMessage = "No response received from server. Please check your connection and try again."
      } else {
        // Something happened in setting up the request
        console.error("Request setup error:", error.message)
      }
      
      setClients([])
      throw error // Re-throw to be caught by any calling functions
    } finally {
      setIsLoading(prev => ({ ...prev, clients: false }))
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
      setShipmentTypes([])
    } finally {
      setIsLoading((prev) => ({ ...prev, shipmentTypes: false }))
    }
  }

  const fetchStartingPoints = async () => {
    const currentClientId = formData.clientId;
    if (!currentClientId) {
      console.log('No client selected, skipping starting points fetch');
      setStartingPoints([]);
      return;
    }

    setIsLoading((prev) => ({ ...prev, startingPoints: true }));
    try {
      console.log(`Fetching starting points for client ID: ${currentClientId}`);
      const response = await api.get(`/api/instructions/client/${currentClientId}/starting-points`)
        .catch(error => {
          console.error('API Error:', error);
          if (error.response) {
            console.error('Error response:', error.response.status, error.response.data);
            if (error.response.status === 404) {
              console.log('No starting points found for this client');
              setShowNoRatesModal(true);
              return { data: [] };
            }
          }
          throw error;
        });

      console.log('Starting points response:', response?.data);
      const responseData = response?.data || [];
      
      // Process the response data
      const processedPoints = responseData
        .map((item) => {
          try {
            if (typeof item === 'string') {
              return { value: item, label: item };
            } else if (item && typeof item === 'object') {
              const point = item.starting_point || item.value || item.label || '';
              return point ? { value: point, label: point } : null;
            }
            return null;
          } catch (e) {
            console.error('Error processing starting point:', item, e);
            return null;
          }
        })
        .filter(Boolean); // Remove any null/undefined entries

      console.log(`Processed ${processedPoints.length} starting points`);
      setStartingPoints(processedPoints);
      
      // If we have exactly one starting point, auto-select it
      if (processedPoints.length === 1) {
        const point = processedPoints[0].value;
        console.log('Auto-selecting single starting point:', point);
        handlePickupChange({ target: { value: point } });
      }
      
    } catch (error) {
      console.error("Error fetching starting points:", error);
      setStartingPoints([]);
    } finally {
      setIsLoading((prev) => ({ ...prev, startingPoints: false }));
    }
  }

  const fetchDestinations = async (startingPoint) => {
    const currentClientId = formData.clientId;
    if (!currentClientId || !startingPoint) {
      setDestinations([]);
      return;
    }
    
    setIsLoading(prev => ({ ...prev, destinations: true }));
    
    try {
      console.log(`Fetching destinations for client: ${currentClientId} pickup: ${startingPoint}`);
      const response = await api.get(
        `/api/instructions/client/${currentClientId}/destinations/${encodeURIComponent(startingPoint)}`
      );
      
      console.log('Destinations response:', response?.data);
      
      // Process the response data
      const processedDests = (response?.data || [])
        .map(item => {
          try {
            if (typeof item === 'string') {
              return { value: item, label: item };
            } else if (item && typeof item === 'object') {
              const dest = item.destination || item.value || item.label || '';
              return dest ? { value: dest, label: dest } : null;
            }
            return null;
          } catch (e) {
            console.error('Error processing destination:', item, e);
            return null;
          }
        })
        .filter(Boolean);
        
      console.log(`Processed ${processedDests.length} destinations`);
      setDestinations(processedDests);
      
      // If we have exactly one destination, auto-select it
      if (processedDests.length === 1) {
        const dest = processedDests[0].value;
        console.log('Auto-selecting single destination:', dest);
        handleDropoffChange({ target: { value: dest } });
      }
      
    } catch (error) {
      console.error('Error fetching destinations:', error);
      setDestinations([]);
      
      // Show error to user if needed
      if (error.response) {
        console.error('Error response:', error.response.status, error.response.data);
      }
    } finally {
      setIsLoading(prev => ({ ...prev, destinations: false }));
    }
  };

  // Handle pickup location selection
  const handlePickupChange = async (e) => {
    const pickup = e.target.value
    console.log('Pickup changed to:', pickup)
    
    // Update form data
    setFormData(prev => ({
      ...prev,
      pickup,
      dropoff: '' // Reset dropoff when pickup changes
    }))
    
    // Clear destinations when pickup changes
    setClientDestinations([])
    
    if (!pickup || !formData.clientId) return
    
    try {
      setIsLoadingLocations(true)
      setLocationError(null)
      
      console.log('Fetching destinations for client:', formData.clientId, 'pickup:', pickup)
      
      try {
        // Try to fetch destinations for the selected client and pickup
        const response = await api.get(
          `/api/instructions/client/${formData.clientId}/destinations/${encodeURIComponent(pickup)}`
        )
        
        console.log('Destinations response:', response.data)
        
        // The response should be an array of objects with destination property
        const destinations = Array.isArray(response.data)
          ? response.data
              .map(item => ({
                value: item.destination || item.value || item.label || '',
                label: item.destination || item.value || item.label || ''
              }))
              .filter(item => item.value) // Filter out any empty values
          : [];
        
        console.log('Processed destinations:', destinations)
        setClientDestinations(destinations)
        
        // If there's only one destination, select it automatically
        if (destinations.length === 1) {
          console.log('Auto-selecting single destination:', destinations[0].value)
          setFormData(prev => ({
            ...prev,
            dropoff: destinations[0].value
          }))
          console.log('Auto-selected dropoff:', destinations[0].value)
        }
      } catch (destError) {
        console.warn('Could not fetch destinations, using default options:', destError)
        // Fall back to default destinations if available
        if (destinations && destinations.length > 0) {
          setClientDestinations(destinations)
        } else {
          setLocationError('Could not load destinations. Using default options.')
        }
      }
      
    } catch (error) {
      console.error('Error in handlePickupChange:', error)
      setLocationError('Failed to load destination data. Some features may be limited.')
    } finally {
      setIsLoadingLocations(false)
    }
  }
  
  // Handle dropoff location selection
  const handleDropoffChange = async (e) => {
    const dropoff = e.target.value;
    console.log('Dropoff changed to:', dropoff);
    
    // Reset rates when dropoff changes but preserve surcharges
    setFormData(prev => {
      const updatedData = {
        ...prev,
        dropoff,
        sixMeterRate: "",
        twelveMeterRate: "",
        abnormalRate: ""
      };
      
      // Only clear surcharges if we're not preserving them
      if (!prev.preserveSurcharges) {
        updatedData.surcharges = false;
        updatedData.surchargesAmount = "";
      }
      
      return updatedData;
    });
    
    // Only fetch rates if we have all required fields
    if (formData.clientId && formData.pickup && dropoff) {
      try {
        console.log('Fetching rates for:', {
          clientId: formData.clientId,
          start: formData.pickup,
          destination: dropoff
        });
        
        const response = await api.get(
          `/api/instructions/client/${formData.clientId}/rates`,
          { 
            params: { 
              start: encodeURIComponent(formData.pickup), 
              destination: encodeURIComponent(dropoff) 
            },
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log('Rates API Response:', {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
          headers: response.headers
        });
        
        if (!response.data) {
          console.warn('No data in rates response');
          return;
        }
        
        // Update rates in form data
        const { sixMeterRate, twelveMeterRate, surcharges } = response.data || {};
        
        console.log('Raw rates from API:', { sixMeterRate, twelveMeterRate, surcharges });
        
        // Process rates
        const updates = {};
        
        // Set six meter rate if available
        if (sixMeterRate !== undefined && sixMeterRate !== null) {
          updates.sixMeterRate = sixMeterRate.toString();
        }
        
        // Set twelve meter rate if available
        if (twelveMeterRate !== undefined && twelveMeterRate !== null) {
          updates.twelveMeterRate = twelveMeterRate.toString();
        }
        
        // Process surcharges if available
        console.log('Processing surcharges - raw value:', surcharges);
        if (surcharges !== undefined && surcharges !== null) {
          // Handle both string and number types for surcharges
          const surchargesNum = typeof surcharges === 'string' 
            ? parseFloat(surcharges) 
            : Number(surcharges);
          
          console.log('Processing surcharges details:', {
            rawSurcharges: surcharges,
            type: typeof surcharges,
            surchargesNum,
            isNumber: typeof surcharges === 'number',
            isString: typeof surcharges === 'string'
          });
          
          // Always set the surcharge amount if we have a value, even if it's 0
          if (!isNaN(surchargesNum)) {
            updates.surcharges = true; // Always set to true if we have a surcharge value
            updates.surchargesAmount = surchargesNum.toString();
            updates.preserveSurcharges = true;
            
            console.log('Setting surcharge values:', {
              surcharges: updates.surcharges,
              surchargesAmount: updates.surchargesAmount,
              preserveSurcharges: updates.preserveSurcharges
            });
            
            // Force the surcharge input to be visible by setting the rateFieldsEnabled
            setRateFieldsEnabled(prev => ({
              ...prev,
              surcharges: true
            }));
          } else {
            console.log('Invalid surcharge value, clearing surcharge fields');
            updates.surcharges = false;
            updates.surchargesAmount = '';
            updates.preserveSurcharges = false;
          }
        }
        
        console.log('Updating form data with rates and surcharges:', updates);
        
        setFormData(prev => {
          const newData = {
            ...prev,
            ...updates
          };
          
          // Ensure preserveSurcharges is set if we have a surcharge amount
          if (updates.surchargesAmount !== undefined && updates.surchargesAmount !== '') {
            newData.preserveSurcharges = true;
          }
          
          console.log('Final form data update:', newData);
          return newData;
        });
        
        // Enable rate fields if we have rates
        const hasSurcharges = surcharges !== undefined && surcharges !== null && surcharges !== 0;
        setRateFieldsEnabled({
          sixMeter: sixMeterRate !== undefined,
          twelveMeter: twelveMeterRate !== undefined,
          abnormal: false, // Always disabled for abnormal as it's not in the rates
          surcharges: hasSurcharges
        });
        
        // If we have surcharges, ensure the surcharge checkbox is checked
        if (hasSurcharges) {
          setFormData(prev => ({
            ...prev,
            surcharges: true,
            preserveSurcharges: true
          }));
        }
        
      } catch (error) {
        console.error('Error fetching rates:', {
          message: error.message,
          response: error.response ? {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
            headers: error.response.headers
          } : 'No response',
          request: error.request,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            params: error.config?.params,
            headers: error.config?.headers
          },
          stack: error.stack
        });
        // Don't show error to user, just log it
      }
    }
  };

  // Handle shipment type changes
  const handleShipmentTypeChange = (e) => {
    const { value, options } = e.target;
    const selectedOption = options[options.selectedIndex];
    const shipmentTypeName = selectedOption.text;
    const isImportType = shipmentTypeName.toLowerCase().includes('import');
    
    // Update isImport state based on shipment type
    setIsImport(isImportType);
    
    setFormData(prev => {
      // Reinitialize containers with the new isImport state before updating form data
      const containerCounts = {
        num_six_meters: prev.num_six_meters || 0,
        num_twelve_meters: prev.num_twelve_meters || 0,
        num_abnormal: prev.num_abnormal || 0
      };
      
      // Initialize containers with the current container counts
      initializeContainers(containerCounts);
      
      // Return the updated form data
      return {
        ...prev,
        shipmentTypeId: value,
        shipmentTypeName: shipmentTypeName
        // Don't reset pickup and dropoff to preserve locations
      };
    });
  };

  // Handle rate changes with validation
  const handleRateChange = (value, fieldName) => {
    // Only allow numbers, decimal point, and empty string
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      // Update form data with the new rate
      setFormData(prev => ({
        ...prev,
        [fieldName]: value === '' ? '' : parseFloat(value) || 0
      }));
      
      // Clear any existing error for this field
      if (fieldErrors[fieldName]) {
        const newErrors = { ...fieldErrors };
        delete newErrors[fieldName];
        setFieldErrors(newErrors);
      }
    }
  };

  const handleSixMeterRateChange = (e) => {
    handleRateChange(e.target.value, 'sixMeterRate');
  };

  const handleTwelveMeterRateChange = (e) => {
    handleRateChange(e.target.value, 'twelveMeterRate');
  };

  const handleAbnormalRateChange = (e) => {
    handleRateChange(e.target.value, 'abnormalRate');
  };
  
  // Handle container count changes with validation
  const handleContainerCountChange = (type, value) => {
    // Only allow positive integers or empty string
    if (value === '' || /^\d+$/.test(value)) {
      const numValue = value === '' ? 0 : parseInt(value, 10);
      
      // Update the form data with the new count
      setFormData(prev => {
        const updatedFormData = {
          ...prev,
          [type]: value === '' ? '' : numValue
        };
        
        // Get the current container counts
        const containerCounts = {
          num_six_meters: type === 'num_six_meters' ? numValue : prev.num_six_meters || 0,
          num_twelve_meters: type === 'num_twelve_meters' ? numValue : prev.num_twelve_meters || 0,
          num_abnormal: type === 'num_abnormal' ? numValue : prev.num_abnormal || 0,
        };
        
        // Update rate fields enabled state based on the new counts
        const newEnabledState = {
          sixMeter: containerCounts.num_six_meters > 0,
          twelveMeter: containerCounts.num_twelve_meters > 0,
          abnormal: containerCounts.num_abnormal > 0,
        };
        
        console.log('Container counts updated:', containerCounts);
        console.log('New rate fields enabled state:', newEnabledState);
        
        // Update the rate fields enabled state
        setRateFieldsEnabled(newEnabledState);
        
        // Initialize containers based on counts, preserving existing container data
        initializeContainers(containerCounts);
        
        return updatedFormData;
      });
      
      // Clear any container count error when a container is added
      if (numValue > 0 && fieldErrors.containerCount) {
        const newErrors = { ...fieldErrors };
        delete newErrors.containerCount;
        setFieldErrors(newErrors);
      }
    }
  };

  // Format currency for display
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  // Helper function to validate a field
  const isFieldValid = useCallback((fieldName, value) => {
    switch(fieldName) {
      case 'clientId':
      case 'shipmentTypeId':
      case 'pickup':
      case 'dropoff':
      case 'pickupDate':
      case 'stackDate':
      case 'deadline':
      case 'pickupTime':
        return !!value;
      case 'task':
      case 'bookingRef':
      case 'fileRef':
      case 'vesselName':
      case 'voyageNo':
        return value?.trim() !== '';
      case 'imoNo':
        return /^\d{7}$/.test(value?.trim());
      case 'flagReg':
        return /^[A-Za-z\s]+$/.test(value?.trim());
      case 'description':
        // Description is completely optional with no validation
        return true;
      default:
        return true;
    }
  }, []);

  // Effect to clear errors when fields become valid
  useEffect(() => {
    const newErrors = { ...fieldErrors };
    let hasChanges = false;
    
    // Check each field with an error
    Object.keys(fieldErrors).forEach(fieldName => {
      const value = formData[fieldName];
      
      // Check if field is now valid using the same validation logic as handleInputChange
      if (isFieldValid(fieldName, value)) {
        delete newErrors[fieldName];
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      setFieldErrors(newErrors);
    }
  }, [formData, fieldErrors, isFieldValid]);

  // Reset form to initial state
  const resetForm = () => {
    setFormData(prev => ({
      ...prev,
      clientId: '',
      shipmentTypeId: '',
      pickup: '',
      dropoff: '',
      num_six_meters: 0,
      num_twelve_meters: 0,
      num_abnormal: 0,
      surcharges: false,
      surchargesAmount: '',
      // Reset other form fields as needed
    }));
    // Reset rate fields and their enabled state
    setFormData(prev => ({
      ...prev,
      sixMeterRate: '',
      twelveMeterRate: '',
      abnormalRate: ''
    }));
    setRateFieldsEnabled({
      sixMeter: false,
      twelveMeter: false,
      abnormal: false
    });
    setFieldErrors({});
  };


  
  // Calculate total cost based on container counts, rates, and surcharge
  const calculateTotalCost = useCallback((formData) => {
    // Get container counts, defaulting to 0 if not set
    const sixMeterCount = formData.num_six_meters || 0;
    const twelveMeterCount = formData.num_twelve_meters || 0;
    const abnormalCount = formData.num_abnormal || 0;
    
    // Get rates, defaulting to 0 if not set
    const sixMeterRate = formData.sixMeterRate ? parseFloat(formData.sixMeterRate) : 0;
    const twelveMeterRate = formData.twelveMeterRate ? parseFloat(formData.twelveMeterRate) : 0;
    const abnormalRate = formData.abnormalRate ? parseFloat(formData.abnormalRate) : 0;
    
    // Calculate subtotal
    const subtotal = 
      (sixMeterCount * sixMeterRate) + 
      (twelveMeterCount * twelveMeterRate) + 
      (abnormalCount * abnormalRate);
    
    // Add surcharge if applicable
    const surchargeAmount = (formData.surcharges && formData.surchargesAmount) ? 
      parseFloat(formData.surchargesAmount) || 0 : 0;
    
    const total = subtotal + surchargeAmount;
    
    console.log('Calculating total cost:', {
      sixMeter: { count: sixMeterCount, rate: sixMeterRate, total: sixMeterCount * sixMeterRate },
      twelveMeter: { count: twelveMeterCount, rate: twelveMeterRate, total: twelveMeterCount * twelveMeterRate },
      abnormal: { count: abnormalCount, rate: abnormalRate, total: abnormalCount * abnormalRate },
      subtotal,
      surcharge: surchargeAmount,
      total
    });
    
    return {
      subtotal,
      surcharge: surchargeAmount,
      total
    };
  }, []);
  
  // Update total cost when relevant fields change
  useEffect(() => {
    const { total } = calculateTotalCost(formData);
    setFormData(prev => ({
      ...prev,
      total_cost: total
    }));
  }, [
    formData.num_six_meters,
    formData.num_twelve_meters,
    formData.num_abnormal,
    formData.sixMeterRate,
    formData.twelveMeterRate,
    formData.abnormalRate,
    formData.surcharges,
    formData.surchargesAmount,
    calculateTotalCost
  ]);


  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    
    // Prevent double submission
    if (isSubmitting) {
      console.log('Already submitting, ignoring duplicate submit');
      return;
    }
    
    // Validate form fields
    const newFieldErrors = {};
    const requiredFields = ['clientId', 'shipmentTypeId', 'task', 'pickup', 'dropoff'];
    
    requiredFields.forEach(field => {
      if (!formData[field]) {
        newFieldErrors[field] = 'This field is required';
      }
    });
    
    // Validate container numbers and weights
    const newContainerErrors = {};
    let hasContainerErrors = false;
    
    containers.forEach(container => {
      if (!container.containerNum) {
        newContainerErrors[`container-${container.id}`] = 'Container number is required';
        hasContainerErrors = true;
      } else if (container.containerNum.length !== 11) {
        newContainerErrors[`container-${container.id}`] = 'Container number must be 11 characters';
        hasContainerErrors = true;
      }
      
      if (isImport && container.weight === '') {
        newContainerErrors[`weight-${container.id}`] = 'Weight is required for import shipments';
        hasContainerErrors = true;
      } else if (isImport && isNaN(parseFloat(container.weight))) {
        newContainerErrors[`weight-${container.id}`] = 'Weight must be a number';
        hasContainerErrors = true;
      }
    });
    
    // Update state with any validation errors
    setFieldErrors(newFieldErrors);
    setContainerFieldErrors(newContainerErrors);
    
    // If there are validation errors, don't submit
    if (Object.keys(newFieldErrors).length > 0 || hasContainerErrors) {
      // Scroll to first error
      const firstErrorField = document.querySelector('.is-invalid');
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    // Prevent double submission
    if (isSubmitting) {
      console.log('Already submitting, ignoring duplicate submit');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Prepare the instruction data
      const instructionData = {
        client: formData.clientId,
        shipment_type: formData.shipmentTypeId,
        task: formData.task,
        pickup: formData.pickup,
        dropoff: formData.dropoff,
        hazardous: formData.hazardous || false,
        surcharges: formData.surcharges || false,
        surcharges_amount: formData.surchargesAmount || '',
        pickupdate: formData.pickupDate,
        pickuptime: formData.pickupTime,
        stackdate: formData.stackDate,
        deadline: formData.deadline,
        booking_ref: formData.bookingRef,
        file_ref: formData.fileRef,
        vessel_name: formData.vesselName,
        voyage_num: formData.voyageNo,
        imo_num: formData.imoNo,
        flag_reg: formData.flagReg,
        description: formData.description || '',
        status: 'New',
        vat: formData.vat || 15,
        rateper_6: formData.sixMeterRate || 0,
        rateper_12: formData.twelveMeterRate || 0,
        rateper_abnormal: formData.abnormalRate || 0,
        num_six_meters: formData.num_six_meters || 0,
        num_twelve_meters: formData.num_twelve_meters || 0,
        num_abnormal: formData.num_abnormal || 0,
        rateWeight: formData.rateWeight || 'Container',
        weight: formData.rateWeight !== 'Container' ? parseFloat(formData.weight) : null
      };
      
      // Prepare container data
      const containerData = containers.map(container => ({
        container_type: container.containerType,
        containerNum: container.containerNum,
        weight: isImport ? parseFloat(container.weight || 0) : null,
        cargo_description: container.cargoDescription || ""
      }));
      
      // Calculate final total cost
      const { total, subtotal, surcharge } = calculateTotalCost(formData);
      
      console.log('Submitting instruction data:', instructionData);
      console.log('Submitting container data:', containerData);
      console.log('Total cost calculation:', {
        subtotal,
        surcharge,
        total
      });
      
      // Add total cost and surcharge to instruction data
      instructionData.total_cost = total;
      instructionData.surcharge = surcharge; // Use the already calculated surcharge
      
      // First, save the instruction
      const response = await api.post('/api/instructions/save-instruction', {
        controllerData: instructionData,
        containerData: containerData
      });
      
      if (response.data.success) {
        // Navigate to dashboard on success
        navigate('/ControllerDashboard');
      } else {
        throw new Error(response.data.message || 'Failed to save instruction');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitError(error.response?.data?.message || error.message || 'An error occurred while saving the instruction');
    } finally {
      // Always reset loading state
      setIsSubmitting(false);
    }
  };



  // Error modal functionality removed


  // ErrorTooltip component - Disabled
  const ErrorTooltip = () => null;

  // Style objects
  const nonEditableStyle = {
    backgroundColor: '#f5f5f5',
    cursor: 'not-allowed'
  };

  const disabledRateStyle = {
    backgroundColor: '#f5f5f5',
    color: 'rgba(0, 0, 0, 0.38)',
    cursor: 'not-allowed'
  };

  // Spinner styles
  const spinnerKeyframes = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;

  return (
    <div className="controller-instructions-unique-wrapper">
      <style>{spinnerKeyframes}</style>
      {/* Error modal removed */}
      
      {/* No Rates Modal */}
      {showNoRatesModal && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="modal" style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h3 style={{ marginTop: 0 }}>No Rates Available</h3>
            <p>This client has no rates configured. Please contact the manager to set up rates.</p>
            <button 
              style={{
                padding: '8px 16px',
                backgroundColor: '#4a90e2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginTop: '10px'
              }}
              onClick={() => setShowNoRatesModal(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}
      
      <div className="controller-instructions-header">
        <button className="controller-instructions-back-button" onClick={() => navigate("/ControllerDashboard")}>
          Back
        </button>
      </div>
      
      {/* Loading state removed as per requirements */}
      {isLoadingLocations && <div style={{ height: '20px' }}></div>}
      
      {/* Location error popup removed as per requirements */}
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
            onClick={() => window.location.reload()}
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
      <form onSubmit={handleSubmit} className="controller-instructions-form-container" style={{ maxWidth: "1200px" }}>
        <div className="controller-instructions-form-section controller-instructions-client-info-section">
          <div className="controller-instructions-form-row">
            <div className="controller-instructions-form-field">
              <label>Client</label>
              <div className="controller-instructions-select-wrapper" ref={fieldRefs.clientId}>
                <select
                  className={`dropdown ${fieldErrors.clientId ? "controller-instructions-error-field" : ""}`}
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
            <div className="controller-instructions-form-field">
              <label>Pick-Up Location</label>
              <div className="controller-instructions-select-wrapper" ref={fieldRefs.pickup}>
                <select
                  className={`dropdown ${fieldErrors.pickup ? "controller-instructions-error-field" : ""}`}
                  name="pickup"
                  value={formData.pickup}
                  onChange={handlePickupChange}
                  disabled={!formData.clientId || isLoadingLocations}
                >
                  <option value="" disabled>
                    Select Pick-Up Location
                  </option>
                  {Array.isArray(clientStartingPoints) && clientStartingPoints.map((location, index) => (
                    <option key={index} value={location.value}>
                      {location.label}
                    </option>
                  ))}
                </select>
                <ErrorTooltip message={fieldErrors.pickup} />
              </div>
            </div>
            <div className="controller-instructions-form-field">
              <label>Drop-Off Location</label>
              <div className="controller-instructions-select-wrapper" ref={fieldRefs.dropoff}>
                <select
                  name="dropoff"
                  value={formData.dropoff}
                  onChange={handleDropoffChange}
                  disabled={!formData.clientId || !formData.pickup || isLoading.destinations}
                  className={!formData.clientId || !formData.pickup ? 'controller-instructions-form-input disabled-field' : 'controller-instructions-form-input'}
                >
                  {(!formData.clientId || !formData.pickup) ? (
                    <option value="">Please select client and pickup first</option>
                  ) : (
                    <option value="">Select Destination</option>
                  )}
                  {Array.isArray(clientDestinations) && clientDestinations.map((location, index) => (
                    <option key={index} value={location.value}>
                      {location.label}
                    </option>
                  ))}
                </select>
                <ErrorTooltip message={fieldErrors.dropoff} />
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
                      <div style={{ width: '100%' }}>
                        <input
                          type="text"
                          value={formData.sixMeterRate !== undefined && formData.sixMeterRate !== '' 
                            ? parseFloat(formData.sixMeterRate).toFixed(2)
                            : ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Allow numbers, decimal point, and empty string
                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                              setFormData(prev => ({
                                ...prev,
                                sixMeterRate: value === '' ? '' : parseFloat(value) || 0
                              }));
                            }
                          }}
                          onFocus={(e) => {
                            e.target.select();
                            // Show raw value when focused for editing
                            if (formData.sixMeterRate) {
                              setFormData(prev => ({
                                ...prev,
                                sixMeterRate: parseFloat(prev.sixMeterRate).toString()
                              }));
                            }
                          }}
                          onBlur={() => {
                            // Format to 2 decimal places when focus is lost
                            if (formData.sixMeterRate !== '') {
                              setFormData(prev => ({
                                ...prev,
                                sixMeterRate: parseFloat(prev.sixMeterRate)
                              }));
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            backgroundColor: rateFieldsEnabled.sixMeter ? '#fff' : '#f5f5f5',
                            fontSize: '16px',
                            position: 'relative',
                            zIndex: 1000,
                            cursor: rateFieldsEnabled.sixMeter ? 'text' : 'not-allowed'
                          }}
                          disabled={!rateFieldsEnabled.sixMeter}
                          placeholder={rateFieldsEnabled.sixMeter ? "0.00" : ""}
                        />
                        <p style={{
                          fontSize: '12px',
                          color: '#666',
                          margin: '4px 0 0',
                          minHeight: '16px',
                          visibility: 'hidden' /* Hide the text but keep the space */
                        }}>
                          &nbsp;{/* Non-breaking space to maintain layout */}
                        </p>
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
                      <div style={{ width: '100%' }}>
                        <input
                          type="text"
                          value={formData.twelveMeterRate !== undefined && formData.twelveMeterRate !== '' 
                            ? parseFloat(formData.twelveMeterRate).toFixed(2)
                            : ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                              setFormData(prev => ({
                                ...prev,
                                twelveMeterRate: value === '' ? '' : parseFloat(value) || 0
                              }));
                            }
                          }}
                          onFocus={(e) => {
                            e.target.select();
                            if (formData.twelveMeterRate) {
                              setFormData(prev => ({
                                ...prev,
                                twelveMeterRate: parseFloat(prev.twelveMeterRate).toString()
                              }));
                            }
                          }}
                          onBlur={() => {
                            if (formData.twelveMeterRate !== '') {
                              setFormData(prev => ({
                                ...prev,
                                twelveMeterRate: parseFloat(prev.twelveMeterRate)
                              }));
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #000',
                            borderRadius: '4px',
                            backgroundColor: rateFieldsEnabled.twelveMeter ? '#fff' : '#f5f5f5',
                            cursor: rateFieldsEnabled.twelveMeter ? 'text' : 'not-allowed'
                          }}
                          disabled={!rateFieldsEnabled.twelveMeter}
                          placeholder={rateFieldsEnabled.twelveMeter ? "0.00" : ""}
                        />
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
                      <div style={{ width: '100%' }}>
                        <input
                          type="text"
                          value={formData.abnormalRate !== undefined && formData.abnormalRate !== '' 
                            ? parseFloat(formData.abnormalRate).toFixed(2)
                            : ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                              setFormData(prev => ({
                                ...prev,
                                abnormalRate: value === '' ? '' : parseFloat(value) || 0
                              }));
                            }
                          }}
                          onFocus={(e) => {
                            e.target.select();
                            if (formData.abnormalRate) {
                              setFormData(prev => ({
                                ...prev,
                                abnormalRate: parseFloat(prev.abnormalRate).toString()
                              }));
                            }
                          }}
                          onBlur={() => {
                            if (formData.abnormalRate !== '') {
                              setFormData(prev => ({
                                ...prev,
                                abnormalRate: parseFloat(prev.abnormalRate)
                              }));
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #000',
                            borderRadius: '4px',
                            backgroundColor: rateFieldsEnabled.abnormal ? '#fff' : '#f5f5f5',
                            cursor: rateFieldsEnabled.abnormal ? 'text' : 'not-allowed'
                          }}
                          disabled={!rateFieldsEnabled.abnormal}
                          placeholder={rateFieldsEnabled.abnormal ? "0.00" : ""}
                        />
                      </div>
                    </div>
                  </div>
                  {fieldErrors.containerCount && (
                    <div className="controller-instructions-error-message" style={{ 
                      color: '#d32f2f', 
                      fontSize: '0.75rem', 
                      marginTop: '4px',
                      gridColumn: '1 / -1',
                      textAlign: 'center',
                      padding: '4px 8px',
                      backgroundColor: '#ffebee',
                      borderRadius: '4px'
                    }}>
                      {fieldErrors.containerCount}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
                      <label className="controller-instructions-checkbox-container" style={{ margin: "5px 0" }}>
                        <input
                          type="checkbox"
                          name="hazardous"
                          checked={formData.hazardous || false}
                          onChange={handleInputChange}
                        />
                        <span className="controller-instructions-checkmark"></span>
                        Hazardous
                      </label>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label className="controller-instructions-checkbox-container" style={{ margin: "5px 0" }}>
                          <input
                            type="checkbox"
                            name="surcharges"
                            checked={!!formData.surcharges}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setFormData(prev => ({
                                ...prev,
                                surcharges: checked,
                                // Only clear surchargesAmount when unchecking and there's no surcharge from the API
                                ...(!checked && !prev.sixMeterRate && !prev.twelveMeterRate && { surchargesAmount: '' })
                              }));
                            }}
                          />
                          <span className="controller-instructions-checkmark"></span>
                          Add Surcharges
                        </label>
                        
                        {/* Only show surcharge input if the surcharges checkbox is checked */}
                        {formData.surcharges && (
                          <div className="controller-instructions-input-wrapper" style={{ width: '160px', marginLeft: '8px' }}>
                            <input
                              type="number"
                              className="controller-instructions-form-input"
                              placeholder="Enter surcharge"
                              value={formData.surchargesAmount || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                console.log('Surcharge input changed:', { oldValue: formData.surchargesAmount, newValue: value });
                                setFormData(prev => ({
                                  ...prev,
                                  surchargesAmount: value,
                                  surcharges: value !== '' && value !== '0',
                                  preserveSurcharges: true
                                }));
                              }}
                              onFocus={() => {
                                // Ensure surcharges is true when focusing the input
                                if (!formData.surcharges) {
                                  setFormData(prev => ({
                                    ...prev,
                                    surcharges: true
                                  }));
                                }
                              }}
                              min="0"
                              step="0.01"
                              style={{
                                width: '100%',
                                padding: '8px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                fontSize: '14px',
                                backgroundColor: formData.surcharges ? '#f8f9fa' : '#fff'
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
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
                      readOnly
                    />
                  </div>
                </div>

                {/* Compact Rates per dropdown inserted below VAT */}
                <div className="controller-instructions-form-field" style={{ maxWidth: "250px" }}>
                  <label>Rates per</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <div className="controller-instructions-select-wrapper controller-instructions-small">
                      <select
                        className="controller-instructions-dropdown"
                        name="rateWeight"
                        value={formData.rateWeight}
                        onChange={handleInputChange}
                        style={{ minWidth: '100px' }}
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
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <div className="controller-instructions-input-wrapper" style={{ width: '180px' }}>
                          <input
                            type="text"
                            className={`controller-instructions-form-input ${fieldErrors.weight ? "controller-instructions-error-field" : ""}`}
                            placeholder="Enter weight"
                            name="weight"
                            value={formData.weight}
                            onChange={(e) => {
                              const value = e.target.value
                              if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
                                handleInputChange(e)
                              }
                            }}
                            style={{ 
                              width: '100%',
                              padding: '8px',
                              border: '1px solid #ccc',
                              borderRadius: '4px',
                              fontSize: '14px'
                            }}
                          />
                        </div>
                        <span style={{ whiteSpace: 'nowrap' }}>{formData.rateWeight}</span>
                        <ErrorTooltip message={fieldErrors.weight} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Hidden rates per selection (kept for reference) */}
              <div style={{ display: "none" }}></div>

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
                              : console.log("Please select a pickup date first")
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
                            console.log("Please select a pickup date first");
                          } else if (!formData.stackDate) {
                            console.log(`Please select ${isImport ? "an ETA" : "a stack date"} first`);
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
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className={`controller-instructions-form-input ${fieldErrors.imoNo ? "controller-instructions-error-field" : ""}`}
                  placeholder="Enter IMO number (numbers only)"
                  name="imoNo"
                  value={formData.imoNo}
                  onChange={handleInputChange}
                  onKeyPress={(e) => {
                    if (!/[0-9]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  maxLength={7}
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
                  onKeyPress={(e) => {
                    if (!/[a-zA-Z\s]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
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
        {/* Total Cost Display */}
        <div className="controller-instructions-form-section" style={{ marginTop: '16px', marginBottom: '16px', textAlign: 'right' }}>
          {/* Total cost display removed - calculated on backend */}
        </div>

        {showContainerDetails && (
          <div className="container-details-section" style={{ margin: '20px 0', width: '100%' }}>
            <div className="controller-instructions-form-section" style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '4px' }}>
              <h4 style={{ marginBottom: '15px', color: '#0d6efd' }}>Container Details</h4>
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ marginBottom: '0', backgroundColor: 'white' }}>
                  <thead className="table-primary">
                    <tr>
                      <th style={{ width: '5%' }}>#</th>
                      <th style={{ width: '15%' }}>Container Type</th>
                      <th style={{ width: '20%' }}>Container Number</th>
                      {isImport && <th style={{ width: '15%' }}>Weight (kg)</th>}
                      <th style={{ width: isImport ? '45%' : '60%' }}>Cargo Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {containers.map((container) => (
                      <tr key={container.id}>
                        <td>{container.id}</td>
                        <td>{container.containerType}</td>
                        <td>
                          <input
                            type="text"
                            className={`form-control form-control-sm ${containerFieldErrors[`container-${container.id}`] ? 'is-invalid' : ''}`}
                            value={container.containerNum}
                            onChange={(e) => handleContainerChange(container.id, 'containerNum', e.target.value)}
                            placeholder="ABCD1234567"
                            maxLength={11}
                            style={{ minWidth: '120px' }}
                          />
                          {containerFieldErrors[`container-${container.id}`] && (
                            <div className="invalid-feedback d-block">
                              {containerFieldErrors[`container-${container.id}`]}
                            </div>
                          )}
                        </td>
                        {isImport && (
                          <td>
                            <div className="input-group input-group-sm">
                              <input
                                type="text"
                                className={`form-control form-control-sm ${containerFieldErrors[`weight-${container.id}`] ? 'is-invalid' : ''}`}
                                value={container.weight || ''}
                                onChange={(e) => handleContainerChange(container.id, 'weight', e.target.value)}
                                placeholder="0.00"
                                style={{ textAlign: 'right' }}
                              />
                              <span className="input-group-text">kg</span>
                            </div>
                            {containerFieldErrors[`weight-${container.id}`] && (
                              <div className="invalid-feedback d-block">
                                {containerFieldErrors[`weight-${container.id}`]}
                              </div>
                            )}
                          </td>
                        )}
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={container.cargoDescription}
                            onChange={(e) => handleContainerChange(container.id, 'cargoDescription', e.target.value)}
                            placeholder="Enter cargo description"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <div className="controller-instructions-button-container" style={{ margin: '20px 0' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
            style={{
              padding: '8px 24px',
              fontSize: '16px',
              fontWeight: '500',
              borderRadius: '4px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            {isSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Submitting...
              </>
            ) : (
              'Submit Instruction'
            )}
          </button>
          
          {submitError && (
            <div className="alert alert-danger mt-3" role="alert" style={{ marginTop: '15px' }}>
              {submitError}
            </div>
          )}
        </div>
      </form>
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

export default ControllerInstructions
