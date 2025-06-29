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
  
  // State for client-specific locations 
  const [clientStartingPoints, setClientStartingPoints] = useState([])
  const [clientDestinations, setClientDestinations] = useState([])
  const [isLoadingLocations, setIsLoadingLocations] = useState(false)
  const [locationError, setLocationError] = useState(null)
  const [showNoRatesModal, setShowNoRatesModal] = useState(false)
  const [weight, setWeight] = useState("")

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prevState => ({
      ...prevState,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Initialize form data first
  const [formData, setFormData] = useState(() => {
    if (preservedFormData) {
      if (containerCounts) {
        console.log("Initializing form data with container counts:", containerCounts);
        return {
          ...initialData,
          ...preservedFormData,
          num_six_meters: containerCounts["6m"] || 0,
          num_twelve_meters: containerCounts["12m"] || 0,
          num_abnormal: containerCounts["Abnormal"] || 0,
          rateWeight: "Container",
          weight: "",
          surcharges: false,
          surchargesAmount: "",
        };
      }
      return {
        ...initialData,
        ...preservedFormData,
        rateWeight: "Container",
        num_six_meters: 0,
        num_twelve_meters: 0,
        num_abnormal: 0,
        surcharges: false,
        surchargesAmount: "",
      };
    }
    return { ...initialData };
  });

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
            
            if (rates.surcharges !== undefined) {
              updates.surcharges = rates.surcharges;
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
  const [isLoading, setIsLoading] = useState({
    clients: true,
    shipmentTypes: true,
    startingPoints: true,
    destinations: true,
  })
  // Error modal state removed
  const [fieldErrors, setFieldErrors] = useState({})
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

  useEffect(() => {
    fetchClients()
    fetchShipmentTypes()
    fetchStartingPoints()
    fetchDestinations()
    if (preservedFormData && preservedFormData.shipmentTypeName) {
      setIsImport(preservedFormData.shipmentTypeName.toLowerCase() === "import")
    }
  }, [])

  // Main useEffect for handling preserved data and container counts
  useEffect(() => {
    if (preservedFormData) {
      console.log("Processing preserved form data...")

      let updatedFormData = { ...preservedFormData, rateWeight: "Container" }

      if (containerCounts) {
        console.log("Updating form data with container counts:", containerCounts)
        updatedFormData = {
          ...preservedFormData,
          num_six_meters: containerCounts["6m"],
          num_twelve_meters: containerCounts["12m"],
          num_abnormal: containerCounts["Abnormal"],
          rateWeight: "Container",
          weight: "",
        }
      }

      setFormData(updatedFormData)

      // Update rate fields enabled state
      const newEnabledState = updateRateFieldsEnabled(updatedFormData)

      // Restore preserved rate values if they exist and fields are enabled
      if (preservedFormData.sixMeterRate !== undefined && newEnabledState.sixMeter) {
        console.log("Restoring preserved 6m rate:", preservedFormData.sixMeterRate)
        setFormData(prev => ({ ...prev, sixMeterRate: preservedFormData.sixMeterRate }));
      }
      if (preservedFormData.twelveMeterRate !== undefined && newEnabledState.twelveMeter) {
        console.log("Restoring preserved 12m rate:", preservedFormData.twelveMeterRate)
        setFormData(prev => ({ ...prev, twelveMeterRate: preservedFormData.twelveMeterRate }));
      }
      if (preservedFormData.abnormalRate !== undefined && newEnabledState.abnormal) {
        console.log("Restoring preserved abnormal rate:", preservedFormData.abnormalRate)
        setFormData(prev => ({ ...prev, abnormalRate: preservedFormData.abnormalRate }));
      }

      if (preservedFormData.shipmentTypeName) {
        setIsImport(preservedFormData.shipmentTypeName.toLowerCase() === "import")
      }
    } else {
      // Initial state - all containers are 0, so all rate fields should be disabled
      updateRateFieldsEnabled({ num_six_meters: 0, num_twelve_meters: 0, num_abnormal: 0 })
    }
  }, [preservedFormData, containerCounts])

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
    const clientId = e.target.value
    console.log('Client changed to:', clientId)
    
    // Find the selected client from the clients array
    const selectedClient = clients.find(client => client.m5clientkey.toString() === clientId);
    
    // Clear rates immediately when client changes
    setFormData(prev => ({
      ...prev,
      clientId,
      representative: selectedClient?.representative || '',
      contactDetails: selectedClient?.contactDetails || selectedClient?.cellnum || '',
      email: selectedClient?.email || '',
      pickup: '',
      dropoff: '', // Clear destination
      sixMeterRate: '', // Clear rates
      twelveMeterRate: '',
      abnormalRate: ''
    }));
    
    setClientStartingPoints([]) // Clear client-specific starting points
    setClientDestinations([]) // Clear client-specific destinations list
    setDestinations([]) // Clear global destinations list

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
    setIsLoading(prev => ({ ...prev, clients: true }))
    try {
      console.log("Fetching active clients...")
      const response = await api.get("/api/instructions/active-clients")
      
      if (!response.data) {
        throw new Error("No data received from server")
      }
      
      console.log("Active clients data received:", response.data)
      console.log("Number of clients:", response.data.length)
      
      if (!Array.isArray(response.data)) {
        throw new Error("Expected an array of clients but received:" + JSON.stringify(response.data))
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
      }))
      
      console.log("Processed clients data:", clientsData)
      setClients(clientsData)
      
      // If there's preserved form data, try to select the client
      if (preservedFormData?.clientId) {
        const selectedClient = clientsData.find(c => c.m5clientkey.toString() === preservedFormData.clientId.toString())
        if (selectedClient) {
          console.log("Found preserved client:", selectedClient)
          // Update form data directly to avoid race conditions
          setFormData(prev => ({
            ...prev,
            clientId: selectedClient.m5clientkey,
            representative: selectedClient.representative || '',
            email: selectedClient.email || '',
            contactDetails: selectedClient.contactDetails || selectedClient.cellnum || ''
          }))
          
          // Manually trigger the client change handler
          const event = { target: { value: selectedClient.m5clientkey } }
          await handleClientChange(event)
        }
      }
      
      return clientsData
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
    setIsLoading((prev) => ({ ...prev, startingPoints: true }))
    try {
      console.log("Fetching starting points...")
      const response = await api.get("/api/instructions/starting-points")
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
      setStartingPoints([])
    } finally {
      setIsLoading((prev) => ({ ...prev, startingPoints: false }))
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
      const response = await api.get(
        `/api/instructions/client/${currentClientId}/destinations/${encodeURIComponent(startingPoint)}`
      );
      setDestinations(response.data);
    } catch (error) {
      console.error("Failed to fetch destinations:", error);
      setDestinations([]);
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
          : []
          
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
    
    // Reset rates when dropoff changes
    setFormData(prev => ({
      ...prev,
      dropoff,
      sixMeterRate: "",
      twelveMeterRate: "",
      abnormalRate: "",
      surcharges: false,
      surchargesAmount: ""
    }));
    
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
        
        const updates = {
          ...(sixMeterRate !== undefined && { sixMeterRate: sixMeterRate.toString() }),
          ...(twelveMeterRate !== undefined && { twelveMeterRate: twelveMeterRate.toString() }),
          ...(surcharges !== undefined && { 
            surcharges: !!surcharges,
            ...(surcharges ? { surchargesAmount: surcharges.toString() } : {})
          })
        };
        
        console.log('Updating form data with rates:', updates);
        setFormData(prev => ({
          ...prev,
          ...updates
        }));
        
        // Enable rate fields if we have rates
        setRateFieldsEnabled({
          sixMeter: sixMeterRate !== undefined,
          twelveMeter: twelveMeterRate !== undefined,
          abnormal: false // Always disabled for abnormal as it's not in the rates
        });
        
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
    
    setFormData(prev => ({
      ...prev,
      shipmentTypeId: value,
      shipmentTypeName: shipmentTypeName,
      // Reset dependent fields when shipment type changes
      pickup: '',
      dropoff: ''
    }));
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
        
        // Update rate fields enabled state based on the new counts
        const newCounts = {
          num_six_meters: type === 'num_six_meters' ? numValue : prev.num_six_meters || 0,
          num_twelve_meters: type === 'num_twelve_meters' ? numValue : prev.num_twelve_meters || 0,
          num_abnormal: type === 'num_abnormal' ? numValue : prev.num_abnormal || 0,
        };
        
        const newEnabledState = {
          sixMeter: newCounts.num_six_meters > 0,
          twelveMeter: newCounts.num_twelve_meters > 0,
          abnormal: newCounts.num_abnormal > 0,
        };
        
        console.log('Container counts updated:', newCounts);
        console.log('New rate fields enabled state:', newEnabledState);
        
        // Update the rate fields enabled state
        setRateFieldsEnabled(newEnabledState);
        
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

  // State for form submission
  const [isSubmitting, setIsSubmitting] = useState(false);

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


  
  // Calculate individual rates - no total cost calculation needed on frontend

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting) return;
    
    // Set loading state
    setIsSubmitting(true);
    
    try {
      // Clear previous errors
      setFieldErrors({});
      
      // Validate form data
      const errors = {};
      
      // Required fields validation
      if (!formData.clientId) errors.clientId = 'Please select a client';
      if (!formData.shipmentTypeId) errors.shipmentTypeId = 'Please select a shipment type';
      if (!formData.pickup) errors.pickup = 'Please select a pickup location';
      if (!formData.dropoff) errors.dropoff = 'Please select a destination';
      
      // Container counts validation
      const sixMeterCount = parseInt(formData.num_six_meters, 10) || 0;
      const twelveMeterCount = parseInt(formData.num_twelve_meters, 10) || 0;
      const abnormalCount = parseInt(formData.num_abnormal, 10) || 0;
      const totalContainers = sixMeterCount + twelveMeterCount + abnormalCount;
      
      if (totalContainers === 0) {
        errors.containerCount = 'At least one container must be added';
      } else {
        // Only check rates if at least one container is added
        if (sixMeterCount > 0) {
          if (!sixMeterRate || isNaN(parseFloat(sixMeterRate)) || parseFloat(sixMeterRate) <= 0) {
            errors.sixMeterRate = 'Valid rate is required for 6m containers';
          }
        }
        
        if (twelveMeterCount > 0) {
          if (!twelveMeterRate || isNaN(parseFloat(twelveMeterRate)) || parseFloat(twelveMeterRate) <= 0) {
            errors.twelveMeterRate = 'Valid rate is required for 12m containers';
          }
        }
        
        if (abnormalCount > 0) {
          if (!abnormalRate || isNaN(parseFloat(abnormalRate)) || parseFloat(abnormalRate) <= 0) {
            errors.abnormalRate = 'Valid rate is required for abnormal containers';
          }
        }
      }
      
      // Validate surcharge amount if surcharges are checked
      if (formData.surcharges) {
        if (!formData.surchargesAmount) {
          errors.surchargesAmount = 'Please enter the surcharge amount';
        } else if (isNaN(parseFloat(formData.surchargesAmount))) {
          errors.surchargesAmount = 'Please enter a valid number for surcharge amount';
        } else if (parseFloat(formData.surchargesAmount) <= 0) {
          errors.surchargesAmount = 'Surcharge amount must be greater than zero';
        }
      }
      
      // If there are validation errors, show them and stop submission
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        
        // Find the first error element to scroll to
        let firstErrorElement = null;
        const firstErrorKey = Object.keys(errors)[0];
        
        // Map error keys to their corresponding refs
        const errorRefs = {
          'clientId': 'clientId',
          'shipmentTypeId': 'shipmentTypeId',
          'pickup': 'pickup',
          'dropoff': 'dropoff',
          'containerCount': 'containerCount',
          'sixMeterRate': 'sixMeterRate',
          'twelveMeterRate': 'twelveMeterRate',
          'abnormalRate': 'abnormalRate',
          'surchargesAmount': 'surchargesAmount'
        };
        
        // Try to find the error element in refs first
        if (errorRefs[firstErrorKey] && fieldRefs[errorRefs[firstErrorKey]]?.current) {
          firstErrorElement = fieldRefs[errorRefs[firstErrorKey]].current;
        } 
        // If not found in refs, try to find by name
        else {
          firstErrorElement = document.querySelector(`[name="${firstErrorKey}"]`);
        }
        
        // If we found an element, scroll to it
        if (firstErrorElement) {
          firstErrorElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          
          // Focus the element if it's an input
          if (firstErrorElement.tagName === 'INPUT' || firstErrorElement.tagName === 'SELECT') {
            firstErrorElement.focus();
          }
        }
        
        return;
      }
      
      // Prepare the data for submission
      const submissionData = {
        ...formData,
        // Convert string numbers to actual numbers
        num_six_meters: parseInt(formData.num_six_meters, 10) || 0,
        num_twelve_meters: parseInt(formData.num_twelve_meters, 10) || 0,
        num_abnormal: parseInt(formData.num_abnormal, 10) || 0,
        // Map rate fields to backend expected format
        rateper_6: parseFloat(sixMeterRate) || 0,
        rateper_12: parseFloat(twelveMeterRate) || 0,
        rateper_abnormal: parseFloat(abnormalRate) || 0,
        surchargesAmount: formData.surcharges ? parseFloat(formData.surchargesAmount) || 0 : 0,
        // Format dates if needed
        pickupDate: formData.pickupDate ? new Date(formData.pickupDate).toISOString() : null,
        stackDate: formData.stackDate ? new Date(formData.stackDate).toISOString() : null,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
      };
      
      console.log('Submitting form data:', submissionData);
      
      // Submit the form data to the API
      const response = await api.post('/instructions/save-instruction', submissionData);
      
      // Handle successful submission
      console.log('Form submitted successfully:', response.data);
      
      // Show success message with auto-close and callback
      // Removed error modal state
      resetForm();
      navigate('/instructions');
    } catch (error) {
      // Handle API errors
      let errorMessage = 'An error occurred while submitting the form.';
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response:', error.response.data);
        errorMessage = error.response.data.message || errorMessage;
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error:', error.message);
      }
      
      // Removed error modal
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
      <div className="controller-instructions-form-container" style={{ maxWidth: "1200px" }}>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label className="controller-instructions-checkbox-container" style={{ margin: "5px 0" }}>
                        <input
                          type="checkbox"
                          name="surcharges"
                          checked={formData.surcharges || false}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setFormData(prev => ({
                              ...prev,
                              surcharges: checked,
                              // Reset surchargesAmount when unchecking
                              ...(!checked && { surchargesAmount: '' })
                            }));
                          }}
                        />
                        <span className="controller-instructions-checkmark"></span>
                        Add Surcharges
                      </label>
                      {formData.surcharges && (
                        <div className="controller-instructions-input-wrapper" style={{ width: '100px' }}>
                          <input
                            type="number"
                            className="controller-instructions-form-input"
                            placeholder="Amount"
                            value={formData.surchargesAmount || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              setFormData(prev => ({
                                ...prev,
                                surchargesAmount: value
                              }));
                            }}
                            min="0"
                            step="0.01"
                          />
                        </div>
                      )}
                    </div>
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
                      readOnly
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
        {/* Total Cost Display */}
        <div className="controller-instructions-form-section" style={{ marginTop: '16px', marginBottom: '16px', textAlign: 'right' }}>
          {/* Total cost display removed - calculated on backend */}
        </div>

        <div className="controller-instructions-button-container">
          <button
            className="controller-instructions-add-container-button"
            onClick={(e) => handleSubmit(e)}
            disabled={isSubmitting} // Only disable when form is submitting
          >
            {isSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Submitting...
              </>
            ) : (
              'Add Container Details'
            )}
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

export default ControllerInstructions
