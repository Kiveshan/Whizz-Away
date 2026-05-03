"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import "../../css/controllerinstruction.css";
import { useNavigate, useLocation } from "react-router-dom";
import ErrorModal from "../../../../components/ErrorModal";
import { ErrorTooltip } from "../../../../components/instructions/ErrorTooltip";
import { ConfirmationModal } from "../../../../components/instructions/ConfirmationModal";
import { InstructionLoadingGate } from "../../../../components/instructions/InstructionLoadingGate";
import { InstructionBanners } from "../../../../components/instructions/InstructionBanners";
import { ActionButtons } from "../../../../components/instructions/ActionButtons";
import {
  fetchInstruction as fetchInstructionService,
  updateInstruction as updateInstructionService,
  deleteInstruction as deleteInstructionService,
  generateInvoice as generateInvoiceService,
  checkInvoiceStatus as checkInvoiceStatusService,
} from "../../../../services/instructionService";
import { useInstructionData } from "../../../../hooks/useInstructionData";
import { useContainerManagement } from "../../../../hooks/useContainerManagement";
import { useRateManagement } from "../../../../hooks/useRateManagement";
import { useWeightRows } from "../../../../hooks/useWeightRows";
import { formatDateForDB, formatDateForInput as formatDateForInputUtil } from "../../../../utils/instructions/dateFormatting";
import { calculateTotalCostFromRates, calcBreakBulkCost } from "../../../../utils/instructions/costCalculation";
import { validateForm as validateFormUtil } from "../../../../utils/instructions/validation";
import { checkRateCountMismatch as checkRateCountMismatchUtil } from "../../../../utils/instructions/rateCountMismatch";

const FCcontrollerinstructions = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const preservedFormData = location.state?.preservedFormData;
  const containerCounts = location.state?.containerCounts;
  const instructionId = location.state?.instructionId;

  console.log("FCcontrollerinstructions received state:", location.state);
  console.log(
    "FCcontrollerinstructions - preservedFormData:",
    preservedFormData
  );
  console.log("FCcontrollerinstructions - containerCounts:", containerCounts);
  console.log("FCcontrollerinstructions - instructionId:", instructionId);

  // Extract all state from location
  const clientId = location.state?.clientId;
  const clientName = location.state?.clientName;
  const selectedMonth = location.state?.selectedMonth;
  const selectedYear = location.state?.selectedYear;
  const activeFilter = location.state?.activeFilter;

  // pickupDateRef removed
  const etaDateRef = useRef(null);
  const lastFreeDateRef = useRef(null);

  const fieldRefs = {
    clientId: useRef(null),
    shipmentTypeId: useRef(null),
    ksmFileRef: useRef(null),
    pickup: useRef(null),
    dropoff: useRef(null),
    // pickupTime and pickupDate refs removed
    stackDate: useRef(null),
    lastFreeDate: useRef(null),
    bookingRef: useRef(null),
    clientFileRef: useRef(null),
    sixMeterRate: useRef(null),
    twelveMeterRate: useRef(null),
    abnormalRate: useRef(null),
    weight: useRef(null),
    description: useRef(null),
    vesselName: useRef(null),
    rateWeight: useRef(null),
    unitRate: useRef(null),
    createdAt: useRef(null),
  };

  const [isImport, setIsImport] = useState(location.state?.isImport || false);
  const todayDate = new Date();
  const today = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;  // Fixed timezone handling
  const [weight, setWeight] = useState("");

  const {
    weightRows,
    setWeightRows,
    weightRowsRef,
    weightRowToDelete,
    addWeightRow,
    updateWeightRow,
    handleRequestDeleteWeightRow: hookRequestDeleteWeightRow,
    confirmDeleteWeightRow,
    cancelDeleteWeightRow,
  } = useWeightRows();

  // Log the isImport state for debugging
  useEffect(() => {
    console.log("isImport state changed:", isImport);
  }, [isImport]);

  // Check if instruction is already invoiced when component mounts
  useEffect(() => {
    if (instructionId) {
      checkIfInvoiced();
    }
  }, [instructionId]);

  // NEW: Track previous container counts to detect changes from 0 to >0
  const [prevContainerCounts, setPrevContainerCounts] = useState({
    num_six_meters: 0,
    num_twelve_meters: 0,
    num_abnormal: 0,
  });

  const [formData, setFormData] = useState(() => {
    // Default empty form data
    const defaultData = {
      // Rates
      rateper_6: preservedFormData?.rateper_6 || 0,
      rateper_12: preservedFormData?.rateper_12 || 0,
      rateper_abnormal: preservedFormData?.rateper_abnormal || 0,
      clientId: "",
      representative: "",
      contactDetails: "",
      email: "",
      shipmentTypeId: "",
      shipmentTypeName: "",
      ksmFileRef: "",
      pickup: "",
      dropoff: "",
      pickupTime: "",
      pickupDate: "",
      stackDate: "",
      lastFreeDate: "",
      clientFileRef: "",
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
    };

    if (preservedFormData) {
      // If we have container counts from navigation, use them
      if (containerCounts) {
        console.log(
          "Initializing form data with container counts:",
          containerCounts
        );
        const initialData = {
          ...defaultData,
          ...preservedFormData,
          num_six_meters: containerCounts["6m"] || 0,
          num_twelve_meters: containerCounts["12m"] || 0,
          num_abnormal: containerCounts["Abnormal"] || 0,
          rateWeight: "Container",
          weight: "",
        };
        // Set initial previous counts
        setPrevContainerCounts({
          num_six_meters: containerCounts["6m"] || 0,
          num_twelve_meters: containerCounts["12m"] || 0,
          num_abnormal: containerCounts["Abnormal"] || 0,
        });
        return initialData;
      }
      // If we just have preserved form data without container counts
      const initialData = {
        ...preservedFormData,
        rateWeight: "Container",
      };
      // Set initial previous counts
      setPrevContainerCounts({
        num_six_meters: preservedFormData.num_six_meters || 0,
        num_twelve_meters: preservedFormData.num_twelve_meters || 0,
        num_abnormal: preservedFormData.num_abnormal || 0,
      });
      return initialData;
    }
    return {
      clientId: "",
      representative: "",
      contactDetails: "",
      email: "",
      shipmentTypeId: "",
      shipmentTypeName: "",
      ksmFileRef: "",
      pickup: "",
      dropoff: "",
      pickupTime: "",
      pickupDate: "",
      stackDate: "",
      lastFreeDate: "",
      clientFileRef: "",
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
    };
  });

  // Check if the instruction should be read-only based on status
  // Allow editing while In Progress; only Completed is locked.
  const isReadOnly = formData.status === "Completed";

  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    message: "",
  });

  const {
    clients,
    shipmentTypes,
    startingPoints,
    destinations,
    instructionRecord,
    isLoading,
    isLoadingComplete,
    hasRouteMismatch,
    setHasRouteMismatch,
    routeEditMode,
    setRouteEditMode,
    refetch: refetchBaseData,
  } = useInstructionData({
    fetchExisting: !!instructionId && !preservedFormData,
    instructionId,
    clientId: formData.clientId,
    pickup: formData.pickup,
    dropoff: formData.dropoff,
    onFormUpdate: (partial) => setFormData((prev) => ({ ...prev, ...partial })),
    onError: (msg) => setErrorModal({ isOpen: true, message: msg }),
  });

  // Apply fetched instruction record to form state (update form)
  useEffect(() => {
    if (instructionRecord) {
      applyInstructionData(instructionRecord);
    }
  // applyInstructionData is stable (defined once); instructionRecord changes once on load
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instructionRecord]);

  const isAddOn = (() => {
    const id = (formData.shipmentTypeId || "").toString();
    const name = (formData.shipmentTypeName || "").toLowerCase();
    const selectedType = shipmentTypes.find(
      (type) => (type.shipkey || type.id)?.toString() === id
    );
    const typeName = (selectedType?.shipmenttype || "").toLowerCase();
    return (
      id === "5" ||
      name === "add-on" ||
      name === "add on" ||
      typeName === "add-on" ||
      typeName === "add on"
    );
  })();

  // VGM is only applicable for certain shipment types. For shipment types 4
  // (cross-haul/break bulk) and 5 (add-on), VGM should behave like other
  // non-applicable fields (null/false). This flag is used when building the
  // container payload sent to the backend.
  const allowVgmUI =
    String(formData.shipmentTypeId) !== "4";

  // Ensure add-on shipment type (5) always uses Container as unit per
  useEffect(() => {
    if (String(formData.shipmentTypeId) === "5" && formData.rateWeight !== "Container") {
      setFormData((prev) => ({
        ...prev,
        rateWeight: "Container",
      }));
    }
  }, [formData.shipmentTypeId, formData.rateWeight]);

  // Recalculate total cost when weight rows or unit rate changes for shipment type 4
  useEffect(() => {
    if (String(formData.shipmentTypeId) === "4" && !isAddOn) {
      recalculateTotalCost(formData, containersRef.current, weightRows);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weightRows, formData.unitRate, formData.shipmentTypeId]);

  // State for warning modal
  const [warningModal, setWarningModal] = useState({
    isOpen: false,
    message: "",
    onConfirm: null,
    shipmentTypeId: "",
    shipmentTypeName: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [preservedContainers, setPreservedContainers] = useState(
    location.state?.preservedContainers || []
  );

  const recalculateTotalCostRef = useRef(null);

  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    message: "",
    action: null,
  });

  const {
    containers,
    setContainers,
    containersRef,
    containerFieldErrors,
    setContainerFieldErrors,
    isContainerLoading,
    setIsContainerLoading,
    isContainerDataModified,
    setIsContainerDataModified,
    containerSuccessMessage,
    setContainerSuccessMessage,
    containerToDelete,
    initializeContainers,
    handleContainerChange,
    validateContainerUniqueness,
    handleRequestDeleteContainer,
    confirmDeleteContainer,
    cancelDeleteContainer,
  } = useContainerManagement({
    isImport,
    isExport: String(formData.shipmentTypeId) === "2",
    isCrossHaul:
      String(formData.shipmentTypeId) === "3" ||
      String(formData.shipmentTypeId) === "4",
    isWeightBased: false,
    clientId: formData.clientId,
    pickup: formData.pickup,
    dropoff: formData.dropoff,
    shipmentTypeId: formData.shipmentTypeId,
    isAddOn,
    isReadOnly,
    instructionId,
    onRecalculateTotalCost: () => recalculateTotalCostRef.current?.(),
    onUpdateFormCounts: (counts) => setFormData((prev) => ({ ...prev, ...counts })),
    onRequestConfirmation: (message) =>
      setConfirmationModal({ isOpen: true, message, action: "delete-container" }),
    onError: (msg) => setErrorModal({ isOpen: true, message: msg }),
  });

  const {
    isSetRate,
    setIsSetRate,
    isSetRateMode,
    setRateValue,
    setSetRateValue,
    historicalSetRate,
    setHistoricalSetRate,
    showSetRateWarning,
    rateUpdateMessage,
    fetchRates,
    fetchFreshAmounts,
    recalculateTotalCost,
  } = useRateManagement({
    isAddOn,
    clientId: formData.clientId,
    pickup: formData.pickup,
    dropoff: formData.dropoff,
    status: formData.status,
    onFormUpdate: (partial) => setFormData((prev) => ({ ...prev, ...partial })),
    onError: (msg) => setErrorModal({ isOpen: true, message: msg }),
  });

  const [isInvoiced, setIsInvoiced] = useState(false);



  // Validate container data
  const validateContainers = () => {
    const counts = countContainersByType();
    const newErrors = {};
    let isValid = true;

    containers.forEach((container) => {
      // Only validate container number if not export shipment type
      if (String(formData.shipmentTypeId) !== "2") {
        if (!container.containerNum) {
          newErrors[`container-${container.id}`] = "Container number is required";
          isValid = false;
        }
      }
      // No format validation - allowing any alphanumeric characters up to 20 characters

      // Validate weight for import, export, and cross-haul shipment types
      if (
        isImport ||
        String(formData.shipmentTypeId) === "2" ||
        String(formData.shipmentTypeId) === "3"
      ) {
        // Weight is required and must be a positive number
        if (
          container.weight === null ||
          container.weight === "" ||
          isNaN(Number(container.weight)) ||
          Number(container.weight) <= 0
        ) {
          newErrors[`weight-${container.id}`] = "Valid weight is required";
          isValid = false;
        }
      }
    });

    setContainerFieldErrors(newErrors);
    return isValid;
  };

  // Validate required form fields
  const validateRequiredFields = () => {
    const newErrors = {};
    let isValid = true;

    // Required fields for all instruction types
    const requiredFields = [
      { name: "clientId", label: "Client" },
      { name: "shipmentTypeId", label: "Shipment Type" },
      { name: "pickup", label: "Pickup Location" },
      { name: "dropoff", label: "Dropoff Location" },
      { name: "pickupDate", label: "Pickup Date" },
    ];

    // Check each required field
    requiredFields.forEach((field) => {
      if (!formData[field.name]) {
        newErrors[field.name] = `${field.label} is required`;
        isValid = false;
      }
    });

    // Set the errors
    setFieldErrors((prev) => ({ ...prev, ...newErrors }));

    // If there are errors, scroll to the first error field
    if (!isValid) {
      const firstErrorField = requiredFields.find(
        (field) => !formData[field.name]
      );
      if (firstErrorField) {
        scrollToField(firstErrorField.name);
      }
    }

    return isValid;
  };

  // Count containers by type
  const countContainersByType = () => {
    const counts = {
      "6m": 0,
      "12m": 0,
      Abnormal: 0,
      BreakBulk: 0,
    };

    containers.forEach((container) => {
      counts[container.containerType]++;
    });

    return counts;
  };

  // Fetch original data for comparison
  const fetchOriginalData = async () => {
    try {
      return await fetchInstructionService(instructionId);
    } catch (error) {
      console.error("Error fetching original data:", error);
      return null;
    }
  };

  // Check if instruction is already invoiced
  const checkIfInvoiced = async () => {
    try {
      if (!instructionId) return;

      // Get the instruction data to get the m1key
      const instructionData = await fetchOriginalData();
      if (!instructionData || !instructionData.m1key) {
        console.error("No m1key found for instruction");
        return;
      }

      // Check if m1key exists in invoice table
      const invoiceData = await checkInvoiceStatusService(instructionData.m1key);
      setIsInvoiced(invoiceData.exists);
    } catch (error) {
      console.error("Error checking if instruction is invoiced:", error);
      setIsInvoiced(false);
    }
  };

  // Enhanced validation with field highlighting
  const validateAllFields = () => {
    const { isValid, fieldErrors, containerErrors } = validateFormUtil(
      formData,
      containers,
      { mode: "update", isAddOn, isImport, isSetRate }
    );

    setFieldErrors(fieldErrors);
    setContainerFieldErrors(containerErrors);

    if (fieldErrors.containerUniqueness) {
      setErrorModal({
        isOpen: true,
        message: fieldErrors.containerUniqueness,
      });
    }

    return isValid;
  };

  // Clear field errors when user starts typing
  const clearFieldError = (fieldName) => {
    setFieldErrors((prev) => ({ ...prev, [fieldName]: "" }));
  };

  // Delegates to utility — returns { needsConfirmation, message } (Flag 2 resolution).
  const checkRateCounterMismatch = () =>
    checkRateCountMismatchUtil(formData, { isAddOn });

  // Handle save changes with enhanced logic
  const handleSaveChanges = async () => {
    console.log("=== SAVE CHANGES INITIATED ===");

    // Special validation for vessel name and stack date for import and export shipment types
    if (formData.shipmentTypeId === "1" || formData.shipmentTypeId === "2") {
      const errors = {};
      let hasSpecialValidationErrors = false;

      if (!formData.vesselName || !formData.vesselName.trim()) {
        errors.vesselName = "Vessel name is required";
        hasSpecialValidationErrors = true;
      }

      if (!formData.stackDate || !formData.stackDate.trim()) {
        errors.stackDate = `${
          formData.shipmentTypeId === "1" ? "ETA" : "Stack"
        } date is required`;
        hasSpecialValidationErrors = true;
      }

      if (hasSpecialValidationErrors) {
        setFieldErrors((prev) => ({ ...prev, ...errors }));
        scrollToField(Object.keys(errors)[0]);
        console.log(
          "Special validation failed for vessel name or stack date:",
          errors
        );
        setErrorModal({
          isOpen: true,
          message: `Please provide ${
            Object.keys(errors).includes("vesselName") ? "vessel name" : ""
          } ${
            Object.keys(errors).includes("vesselName") &&
            Object.keys(errors).includes("stackDate")
              ? "and"
              : ""
          } ${
            Object.keys(errors).includes("stackDate")
              ? formData.shipmentTypeId === "1"
                ? "ETA date"
                : "stack date"
              : ""
          }`,
        });
        return;
      }
    }

    // Validate all fields first
    if (!validateAllFields()) {
      console.log("❌ Validation failed - blocking save operation");
      setErrorModal({
        isOpen: true,
        message: "Please fix all validation errors before saving.",
      });
      return;
    }

    // Check for rate/counter mismatch
    const { needsConfirmation, message: mismatchMessage } = checkRateCounterMismatch();
    if (needsConfirmation) {
      console.log("⚠️ Rate/counter mismatch detected - showing confirmation");
      setConfirmationModal({ isOpen: true, message: mismatchMessage, action: "save" });
      return;
    }

    // Proceed with actual save logic
    await performSave();
  };

  // Handle delete instruction
  const handleDeleteInstruction = () => {
    console.log("=== DELETE INSTRUCTION INITIATED ===");

    // Show confirmation modal
    setConfirmationModal({
      isOpen: true,
      message:
        "Are you sure you want to delete this instruction? This action cannot be undone.",
      action: "delete",
    });
  };

  // Handle create invoice
  const handleCreateInvoice = async () => {
    console.log("=== CREATE INVOICE INITIATED ===");

    try {
      // Get the instruction data to get the m1key
      const instructionData = await fetchOriginalData();
      if (!instructionData || !instructionData.m1key) {
        console.error("No m1key found for instruction");
        setErrorModal({
          isOpen: true,
          message: "Could not create invoice: No instruction ID found.",
        });
        return;
      }

      // Show confirmation modal
      setConfirmationModal({
        isOpen: true,
        message:
          "Are you sure you want to create an invoice before dispatching containers?",
        action: "invoice",
      });
    } catch (error) {
      console.error("Error preparing invoice creation:", error);
      setErrorModal({
        isOpen: true,
        message: "Error preparing invoice creation. Please try again.",
      });
    }
  };

  // Perform the actual delete operation
  const performDelete = async () => {
    try {
      console.log(`Deleting instruction with ID: ${instructionId}`);
      setIsContainerLoading(true);

      // Call the API to delete the instruction
      const deleteData = await deleteInstructionService(instructionId);

      console.log("Delete response:", deleteData);

      // Show success message
      setContainerSuccessMessage("Instruction deleted successfully!");

      // Navigate back to the instructions list after a short delay
      setTimeout(() => {
        navigate("/ViewClientInstruction", {
          state: {
            clientId,
            clientName,
            selectedMonth,
            selectedYear,
            activeFilter,
          },
        });
      }, 2000);
    } catch (error) {
      console.error("Error deleting instruction:", error);

      // Show error modal
      setErrorModal({
        isOpen: true,
        message:
          error.response?.data?.message ||
          "Failed to delete instruction. Please try again.",
      });
    } finally {
      setIsContainerLoading(false);
    }
  };

  // Perform the actual invoice creation
  const performInvoiceCreation = async () => {
    try {
      console.log(`Creating invoice for instruction with ID: ${instructionId}`);
      setIsContainerLoading(true);

      // Get the instruction data to get the m1key
      const instructionData = await fetchOriginalData();
      if (!instructionData || !instructionData.m1key) {
        throw new Error("No m1key found for instruction");
      }

      // Call the API to create an invoice for the instruction
      const invoiceResult = await generateInvoiceService(instructionData.m1key);

      console.log("Invoice creation response:", invoiceResult);

      // Show success message
      setContainerSuccessMessage("Invoice created successfully!");

      // Update the isInvoiced state
      setIsInvoiced(true);
    } catch (error) {
      console.error("Error creating invoice:", error);

      // Show error modal
      setErrorModal({
        isOpen: true,
        message:
          error.response?.data?.message ||
          "Failed to create invoice. Please try again.",
      });
    } finally {
      setIsContainerLoading(false);
    }
  };

  // Extract the actual save logic into a separate function
  const performSave = async () => {
    try {
      setIsContainerLoading(true);
      setContainerSuccessMessage("");

      // Fetch original data for comparison
      console.log("📊 Fetching original data for comparison...");
      const originalData = await fetchOriginalData();

      // formatDateForDB imported from dateFormatting utility

      // Helper function to format time for database (HH:MM:SS)
      const formatTimeForDB = (timeString) => {
        if (!timeString) return null;
        try {
          const [hours, minutes] = timeString.split(":");
          return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}:00`;
        } catch (e) {
          console.error("Error formatting time:", e);
          return null;
        }
      };

      // Recalculate total cost based on current values
      const numSix = formData.num_six_meters || 0;
      const numTwelve = formData.num_twelve_meters || 0;
      const numAbnormal = formData.num_abnormal || 0;

      const ratePer6 = numSix > 0 ? Number(formData.rateper_6 || 0) : 0;
      const ratePer12 = numTwelve > 0 ? Number(formData.rateper_12 || 0) : 0;
      const ratePerAbnormal =
        numAbnormal > 0 ? Number(formData.rateper_abnormal || 0) : 0;

      console.log("DEBUG UPDATE isSetRateMode:", isSetRateMode, "formData.rateWeight:", formData.rateWeight, "formData.setRateAmount:", formData.setRateAmount);
      let baseCost = 0;
      if (isSetRateMode && !isAddOn) {
        baseCost = calcBreakBulkCost(weightRows, 0, {
          isSetRateMode: true,
          setRateAmount: formData.setRateAmount || 0,
        });
      } else if (
        (formData.rateWeight === "kg" || formData.rateWeight === "ton") &&
        String(formData.shipmentTypeId) === "4"
      ) {
        baseCost = calcBreakBulkCost(weightRows, formData.unitRate || 0);
      } else {
        // Container-based or simple weight-based using main counts
        baseCost =
          ratePer6 * numSix +
          ratePer12 * numTwelve +
          ratePerAbnormal * numAbnormal;
      }
      // Fetch fresh amounts on-the-fly to prevent race condition
      // If user clicks Save before async fetches complete, we need current values
      const freshContainers = await fetchFreshAmounts(containers, formData);

      // Calculate total surcharge from containers (using fresh amounts)
      const totalSurchargeAmount = freshContainers.reduce((total, container) => {
        if (!container.addSurcharges) return total;
        const resolved = container.is_12m_surcharge
          ? Number(container.surcharge_12m_amount || 0)
          : Number(container.surchargeAmount || 0)
        return total + resolved
      }, 0);
      // Calculate total hazardous amount from containers (using fresh amounts)
      const totalHazardousAmount = freshContainers.reduce((total, container) => {
        if (container.hazardous && container.hazardousAmount) {
          return total + Number(container.hazardousAmount || 0);
        }
        return total;
      }, 0);
      // Calculate total VGM amount from containers (using fresh amounts)
      const totalVgmAmount = freshContainers.reduce((total, container) => {
        if (container.vgm && container.vgmAmount) {
          return total + Number(container.vgmAmount || 0);
        }
        return total;
      }, 0);
      console.log(`💲 Total cost components (fresh) - Base: ${baseCost}, Surcharges: ${totalSurchargeAmount}, Hazardous: ${totalHazardousAmount}, VGM: ${totalVgmAmount}`);
      // In Set Rate mode, total cost is exactly the set rate amount (no surcharges/hazardous/VGM)
      const totalCost = isSetRateMode
        ? baseCost
        : Number((baseCost + totalSurchargeAmount + totalHazardousAmount + totalVgmAmount).toFixed(2));
      console.log("DEBUG FINAL totalCost before payload:", totalCost, "isSetRateMode:", isSetRateMode);

      // Prepare instruction update data with proper field mapping
      const isAddOnType = isAddOn;

      const instructionUpdateData = {
        // Map frontend fields to backend database fields
        client: formData.clientId,
        ksmFileRef: formData.ksmFileRef, // Updated from task to ksmFileRef to match DB schema
        shipment_type: formData.shipmentTypeId,
        pickup: formData.pickup,
        dropoff: formData.dropoff,
        // pickuptime and pickupdate fields removed
        stackdate: formatDateForDB(formData.stackDate),
        lastFreeDate: formatDateForDB(formData.lastFreeDate),
        clientFileRef: formData.clientFileRef,
        rateweight: formData.rateWeight,
        description: formData.description,
        status: formData.status,
        vat: formData.vat === 0 ? 0 : formData.vat || 15,
        num_six_meters:
          formData.rateWeight === "kg" || formData.rateWeight === "ton" || isSetRateMode
            ? 0
            : numSix,
        num_twelve_meters:
          formData.rateWeight === "kg" || formData.rateWeight === "ton" || isSetRateMode
            ? 0
            : numTwelve,
        num_abnormal:
          formData.rateWeight === "kg" || formData.rateWeight === "ton" || isSetRateMode
            ? 0
            : numAbnormal,
        num_breakbulk: 0,
        // For ton or kg, main weight is only used for non-type-4 shipments
        weight:
          formData.rateWeight !== "Container" && String(formData.shipmentTypeId) !== "4"
            ? formData.weight
              ? Number(formData.weight)
              : null
            : null,
        total_cost: isAddOnType ? 0 : totalCost,
        booking_ref: formData.bookingRef,
        vessel_name: formData.vesselName,
        rateper_6:
          isAddOnType
            ? 0
            : formData.rateWeight === "kg" || formData.rateWeight === "ton"
              ? 0
              : ratePer6,
        rateper_12:
          isAddOnType
            ? 0
            : formData.rateWeight === "kg" || formData.rateWeight === "ton"
              ? 0
              : ratePer12,
        rateper_abnormal:
          isAddOnType
            ? 0
            : formData.rateWeight === "kg" || formData.rateWeight === "ton"
              ? 0
              : ratePerAbnormal,
        rateper_breakbulk: isAddOnType ? 0 : 0,
        // For ton or kg, unitRate must be provided and not defaulted to 0
        unitrate:
          isAddOnType
            ? 0
            : formData.rateWeight !== "Container"
              ? formData.unitRate
                ? Number(formData.unitRate)
                : null
              : null,
        is_set_rate: isSetRate, // Set rate flag for database
        // When set rate is checked, overwrite historical_set_rate with current setRateValue
        historical_set_rate: isSetRate ? setRateValue : null,
        created_at: formData.createdAt || null, // Add creation date
      };

      // Prepare container data with containerKey for smart updates
      // When rateWeight is kg or ton, we don't save any container details
      // CRITICAL FIX: Use containersRef.current to capture latest container data
      const currentContainers = containersRef.current || [];
      
      console.log("[UPDATE SAVE DEBUG] Preparing container data:", {
        containersState: containers,
        containersRef: containersRef.current,
        containerCount: currentContainers.length,
        shipmentTypeId: formData.shipmentTypeId,
      });

      const containerData =
        formData.rateWeight === "kg" || formData.rateWeight === "ton"
          ? []
          : currentContainers.map((container) => {
              // Sanitize weight value
              let sanitizedWeight = null;
              if (
                container.weight !== null &&
                container.weight !== undefined &&
                container.weight !== ""
              ) {
                if (typeof container.weight === "string") {
                  const trimmedWeight = container.weight.trim();
                  if (trimmedWeight !== "") {
                    const parsedWeight = Number.parseFloat(trimmedWeight);
                    if (!isNaN(parsedWeight) && parsedWeight >= 0) {
                      sanitizedWeight = parsedWeight;
                    }
                  }
                } else if (
                  typeof container.weight === "number" &&
                  container.weight >= 0
                ) {
                  sanitizedWeight = container.weight;
                }
              }

              return {
                containerKey: container.containerKey,
                containernum: container.containerNum || "",
                file_ref: container.fileRef || "",
                weight: sanitizedWeight,
                container_type: container.containerType || "",
                cargo_description: container.cargoDescription || "",
                "Hazardous": Boolean(container.hazardous),
                "Hazardous Amount": Number(container.hazardousAmount || 0),
                "Add Surcharges": Boolean(container.addSurcharges),
                "Surcharge Amount": Number(container.surchargeAmount || 0),
                is_12m_surcharge: Boolean(container.is_12m_surcharge),
                surcharge_12m_amount: Number(container.surcharge_12m_amount || 0),
                vgm: allowVgmUI ? Boolean(container.vgm) : false,
                "vgm amount": allowVgmUI ? Number(container.vgmAmount || 0) : 0,
              };
            });

      let weightData = [];
      if (String(formData.shipmentTypeId) === "4") {
        // For cross-haul/break bulk on the FC screen, always send every
        // visible row so the backend can persist everything the user sees.
        weightData = weightRows.map((row) => {
          let numericWeight = null;
          if (row.weight !== null && row.weight !== undefined && row.weight !== "") {
            const parsed = Number.parseFloat(row.weight);
            numericWeight = Number.isNaN(parsed) ? null : parsed;
          }

          const ksm = row.ksmDmNo || row.ksm_dm_no || null;
          const ticket = row.ticketNo || row.ticket_no || null;
          const receipt = row.receiptBookNo || row.receipt_book_no || null;

          return {
            ksm_dm_no: ksm,
            ticket_no: ticket,
            receipt_book_no: receipt,
            weight: numericWeight,
          };
        });
      }

      // Debug: Log the container and weight data being sent to server
      console.log("🚀 CONTAINER DATA BEING SENT TO SERVER:");
      console.log("==========================================");
      containerData.forEach((container, index) => {
        console.log(`Container ${index}:`, {
          containerKey: container.containerKey,
          containernum: container.containernum,
          file_ref: container.file_ref,
          "Add Surcharges": container["Add Surcharges"],
          "Surcharge Amount": container["Surcharge Amount"],
          is_12m_surcharge: container.is_12m_surcharge,
          surcharge_12m_amount: container.surcharge_12m_amount,
          "Hazardous": container["Hazardous"],
          "Hazardous Amount": container["Hazardous Amount"],
          addSurchargesType: typeof container["Add Surcharges"],
          surchargeAmountType: typeof container["Surcharge Amount"],
          hazardousType: typeof container["Hazardous"],
          hazardousAmountType: typeof container["Hazardous Amount"],
          fileRefType: typeof container.file_ref
        });
      });

      console.log("Weight rows state (type 4 only):", weightRows);
      console.log("Weight data being sent (type 4 only):", weightData);

      // Console log comparison between old and new data
      console.log("📋 DATA COMPARISON:");
      console.log("===================");

      if (originalData) {
        console.log("🔄 INSTRUCTION CHANGES:");
        console.log(
          "Old total_cost:",
          originalData.total_cost,
          "→ New total_cost:",
          totalCost
        );
        console.log(
          "Old num_six_meters:",
          originalData.num_six_meters,
          "→ New num_six_meters:",
          numSix
        );
        console.log(
          "Old num_twelve_meters:",
          originalData.num_twelve_meters,
          "→ New num_twelve_meters:",
          numTwelve
        );
        console.log(
          "Old num_abnormal:",
          originalData.num_abnormal,
          "→ New num_abnormal:",
          numAbnormal
        );
        console.log(
          "Old rateper_6:",
          originalData.rateper_6,
          "→ New rateper_6:",
          ratePer6
        );
        console.log(
          "Old rateper_12:",
          originalData.rateper_12,
          "→ New rateper_12:",
          ratePer12
        );
        console.log(
          "Old rateper_abnormal:",
          originalData.rateper_abnormal,
          "→ New rateper_abnormal:",
          ratePerAbnormal
        );
        console.log(
          "Old task:",
          originalData.task,
          "→ New task:",
          formData.task
        );
        console.log(
          "Old description:",
          originalData.description,
          "→ New description:",
          formData.description
        );
      }

      console.log("💾 Sending update request to server...");
      console.log("Instruction data:", instructionUpdateData);
      console.log("Container data:", containerData);
      console.log("DEBUG PAYLOAD total_cost:", instructionUpdateData.total_cost, "isSetRateMode:", isSetRateMode);

      // Make the API call
      const saveResult = await updateInstructionService(instructionId, instructionUpdateData, containerData, weightData);

      console.log("✅ Server response:", saveResult);

      console.log("🎉 Save operation completed successfully!");

      // Show success message
      setContainerSuccessMessage("Changes saved successfully!");
      setIsContainerDataModified(false);

      // Recalculate total cost to update UI with saved values
      recalculateTotalCost(formData, containersRef.current, weightRows);

      // Navigate after 2 seconds
      setTimeout(() => {
        console.log("🚀 Navigating to instructions list...");
        navigate("/ViewClientInstruction");
      }, 2000);
    } catch (error) {
      console.error("❌ Error saving changes:", error);
      console.error("Error details:", error.response?.data || error.message);

      setErrorModal({
        isOpen: true,
        message:
          error.response?.data?.message ||
          "Failed to save changes. Please try again.",
      });
    } finally {
      setIsContainerLoading(false);
    }
  };

  // Handle confirmation modal actions
  const handleConfirmAction = () => {
    if (confirmationModal.action === "unlock-route") {
      // User confirmed they want to edit a legacy route: clear both
      // pickup and dropoff so they must choose from the current
      // starting points and destinations lists.
      setRouteEditMode("editable");
      setHasRouteMismatch(false);
      setFormData((prev) => ({
        ...prev,
        pickup: "",
        dropoff: "",
      }));
    } else if (confirmationModal.action === "delete-container") {
      confirmDeleteContainer();
    } else if (confirmationModal.action === "delete-weight") {
      confirmDeleteWeightRow();
    } else if (confirmationModal.action === "save") {
      performSave();
    } else if (confirmationModal.action === "delete") {
      performDelete();
    } else if (confirmationModal.action === "invoice") {
      performInvoiceCreation();
    }
    setConfirmationModal({ isOpen: false, message: "", action: null });
  };

  const handleCancelAction = () => {
    setConfirmationModal({ isOpen: false, message: "", action: null });
    cancelDeleteContainer();
    cancelDeleteWeightRow();
  };

  // Ask for confirmation before deleting a weight row
  const handleRequestDeleteWeightRow = (row) => {
    if (isReadOnly) return;

    hookRequestDeleteWeightRow(row);
    setConfirmationModal({
      isOpen: true,
      message: "Are you sure you want to delete this weight row?",
      action: "delete-weight",
    });
  };

  // Initialize containers when component mounts or container counts change
  useEffect(() => {
    const loadContainers = async () => {
      // If we already have containers from the instruction data, don't load them again
      if (containers && containers.length > 0) {
        return;
      }

      const counts = {
        num_six_meters: formData.num_six_meters || 0,
        num_twelve_meters: formData.num_twelve_meters || 0,
        num_abnormal: formData.num_abnormal || 0,
        num_breakbulk: formData.num_breakbulk || 0,
      };

      if (!instructionId) {
        initializeContainers(containersRef.current, counts);
        return;
      }

      setIsContainerLoading(true);

      try {
        const containerApiData = await fetchInstructionService(instructionId);

        if (containerApiData && containerApiData.length > 0) {
          const containersList = containerApiData.map((container, index) => ({
            id: container.containerkey || index + 1,
            containerKey: container.containerkey,
            containerNum: container.containernum || "",
            fileRef: container.file_ref || "",
            weight:
              container.weight !== null && container.weight !== undefined
                ? container.weight
                : null,
            containerType: container.container_type || "6m",
            cargoDescription: container.cargo_description || "",
            hazardous: container.Hazardous || false,
            addSurcharges: container["Add Surcharges"] || false,
            surchargeAmount: Number(container["Surcharge Amount"] || 0),
            is_12m_surcharge: Boolean(container.is_12m_surcharge),
            surcharge_12m_amount: Number(container.surcharge_12m_amount || 0),
            hazardousAmount: container["Hazardous Amount"] || 0,
            vgm: container.vgm === true || container.vgm === "true",
            vgmAmount: Number(container["vgm amount"] || 0),
          }));

          setContainers(containersList);
          setIsContainerDataModified(false);
        } else if (
          counts.num_six_meters > 0 ||
          counts.num_twelve_meters > 0 ||
          counts.num_abnormal > 0
        ) {
          initializeContainers(containersRef.current, counts);
        }
      } catch (error) {
        console.error("Error loading containers:", error);
        if (
          counts.num_six_meters > 0 ||
          counts.num_twelve_meters > 0 ||
          counts.num_abnormal > 0
        ) {
          initializeContainers(containersRef.current, counts);
        }
      } finally {
        setIsContainerLoading(false);
      }
    };

    loadContainers();
  }, [
    instructionId,
    formData.num_six_meters,
    formData.num_twelve_meters,
    formData.num_abnormal,
  ]);

  const scrollToField = (fieldName) => {
    const fieldRef = fieldRefs[fieldName];
    if (fieldRef && fieldRef.current) {
      fieldRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      setTimeout(() => {
        if (fieldRef.current.focus) {
          fieldRef.current.focus();
        }
      }, 500);
    }
  };

  const openCalendar = (ref) => {
    ref.current.click();
  };

  // Update form data when preserved data changes
  useEffect(() => {
    if (preservedFormData) {
      console.log("Updating form with preserved data:", preservedFormData);

      // Format dates before setting form data
      const formattedData = {
        ...preservedFormData,
        // pickupDate field removed
        stackDate: formatDateForInput(preservedFormData.stackDate),
        lastFreeDate: preservedFormData.deadline
          ? formatDateForInput(preservedFormData.deadline)
          : "",
      };

      // Update form data
      if (containerCounts) {
        console.log(
          "Updating form data with container counts:",
          containerCounts
        );
        const newFormData = {
          ...formattedData,
          num_six_meters: containerCounts["6m"] || 0,
          num_twelve_meters: containerCounts["12m"] || 0,
          num_abnormal: containerCounts["Abnormal"] || 0,
          rateWeight: "Container",
          weight: "",
        };
        setFormData(newFormData);
        // Update previous counts
        setPrevContainerCounts({
          num_six_meters: containerCounts["6m"] || 0,
          num_twelve_meters: containerCounts["12m"] || 0,
          num_abnormal: containerCounts["Abnormal"] || 0,
        });
      }

      // Update shipment type and isImport state
      if (preservedFormData.shipmentTypeName) {
        const isImportType =
          preservedFormData.shipmentTypeName.toLowerCase() === "import";
        setIsImport(isImportType);
      }

      // Update rate values from preserved data - check multiple possible sources
      if (preservedFormData.sixMeterRate !== undefined) {
        setFormData((prev) => ({
          ...prev,
          rateper_6: preservedFormData.sixMeterRate,
        }));
      } else if (preservedFormData.rateper_6 !== undefined) {
        setFormData((prev) => ({
          ...prev,
          rateper_6: preservedFormData.rateper_6,
        }));
      }

      if (preservedFormData.twelveMeterRate !== undefined) {
        setFormData((prev) => ({
          ...prev,
          rateper_12: preservedFormData.twelveMeterRate,
        }));
      } else if (preservedFormData.rateper_12 !== undefined) {
        setFormData((prev) => ({
          ...prev,
          rateper_12: preservedFormData.rateper_12,
        }));
      }

      if (preservedFormData.abnormalRate !== undefined) {
        setFormData((prev) => ({
          ...prev,
          rateper_abnormal: preservedFormData.abnormalRate,
        }));
      } else if (preservedFormData.rateper_abnormal !== undefined) {
        setFormData((prev) => ({
          ...prev,
          rateper_abnormal: preservedFormData.rateper_abnormal,
        }));
      }
    }
  }, [preservedFormData, containerCounts]);

  // Add a separate useEffect to handle isImport state when formData.shipmentTypeName changes
  useEffect(() => {
    if (formData.shipmentTypeName) {
      const isImportType = formData.shipmentTypeName.toLowerCase() === "import";
      setIsImport(isImportType);
    }
  }, [formData.shipmentTypeName]);

  useEffect(() => {
    if (location.state?.preservedContainers) {
      setPreservedContainers(location.state.preservedContainers);
    }
  }, [location.state?.preservedContainers]);

  // NEW: Effect to handle rate auto-population when count changes from 0 to >0
  useEffect(() => {
    // Only run if we have clients data and form data with clientId
    if (clients.length === 0 || !formData.clientId) {
      return;
    }

    const selectedClient = clients.find(
      (client) => client.m5clientkey.toString() === formData.clientId.toString()
    );
    if (!selectedClient) {
      return;
    }

    // Handle 6-meter containers
    const sixMeterChanged =
      prevContainerCounts.num_six_meters === 0 && formData.num_six_meters > 0;
    if (sixMeterChanged) {
      // Only populate if current rate is empty or zero
      if (
        (formData.rateper_6 === "" ||
          formData.rateper_6 === "0" ||
          Number(formData.rateper_6) === 0) &&
        selectedClient.driver_six_meter_rate
      ) {
        const newRate = selectedClient.driver_six_meter_rate.toString();
        setFormData((prev) => ({ ...prev, rateper_6: newRate }));
        console.log(
          `Auto-populated 6m rate: ${newRate} (count changed from 0 to ${formData.num_six_meters})`
        );
      }
    }

    // Handle 12-meter containers
    const twelveMeterChanged =
      prevContainerCounts.num_twelve_meters === 0 &&
      formData.num_twelve_meters > 0;
    if (twelveMeterChanged) {
      // Only populate if current rate is empty or zero
      if (
        (formData.rateper_12 === "" ||
          formData.rateper_12 === "0" ||
          Number(formData.rateper_12) === 0) &&
        selectedClient.driver_twelve_meter_rate
      ) {
        const newRate = selectedClient.driver_twelve_meter_rate.toString();
        setFormData((prev) => ({ ...prev, rateper_12: newRate }));
        console.log(
          `Auto-populated 12m rate: ${newRate} (count changed from 0 to ${formData.num_twelve_meters})`
        );
      }
    }

    // Clear rates when count goes to 0
    if (
      formData.num_six_meters === 0 &&
      prevContainerCounts.num_six_meters > 0
    ) {
      setFormData((prev) => ({ ...prev, rateper_6: "" }));
      console.log("Cleared 6m rate (count went to 0)");
    }

    if (
      formData.num_twelve_meters === 0 &&
      prevContainerCounts.num_twelve_meters > 0
    ) {
      setFormData((prev) => ({ ...prev, rateper_12: "" }));
      console.log("Cleared 12m rate (count went to 0)");
    }

    if (formData.num_abnormal === 0 && prevContainerCounts.num_abnormal > 0) {
      setFormData((prev) => ({ ...prev, rateper_abnormal: "" }));
      console.log("Cleared abnormal rate (count went to 0)");
    }

    // Update previous counts for next comparison
    setPrevContainerCounts({
      num_six_meters: formData.num_six_meters,
      num_twelve_meters: formData.num_twelve_meters,
      num_abnormal: formData.num_abnormal,
    });
  }, [
    formData.num_six_meters,
    formData.num_twelve_meters,
    formData.num_abnormal,
    clients,
    formData.clientId,
  ]);

  // Apply fetched instruction record to form state (data comes from useInstructionData hook)
  const applyInstructionData = (data) => {
    if (!data) return;

    try {
      // Set the main form data
      const newFormData = {
        clientId: data.client ? data.client.toString() : "",
        representative: data.representative || "",
        contactDetails: data.cellnum || "",
        email: data.email || "",
        shipmentTypeId: data.shipment_type ? data.shipment_type.toString() : "",
        shipmentTypeName: data.shipmenttype || "",
        ksmFileRef: data.ksmFileRef || "", // Updated from task to ksmFileRef
        pickup: data.pickup || "",
        dropoff: data.dropoff || "",
        // pickupTime and pickupDate fields removed
        stackDate: formatDateForInput(data.stackdate) || "",
        lastFreeDate: data.lastFreeDate ? formatDateForInput(data.lastFreeDate) : "", // Updated from deadline to lastFreeDate
        clientFileRef: data.clientFileRef || "", // Updated from fileref to clientFileRef
        bookingRef: data.booking_ref || "",
        rateWeight: data.rateweight || "Container",
        weight: data.weight || "",
        setRateAmount: (data.is_set_rate === true || data.is_set_rate === "true" || data.is_set_rate === 1) ? (data.total_cost != null ? data.total_cost.toString() : "") : "",
        num_six_meters: data.num_six_meters || 0,
        num_twelve_meters: data.num_twelve_meters || 0,
        num_abnormal: data.num_abnormal || 0,
        num_breakbulk: data.num_breakbulk || 0,
        vat: data.vat === 0 ? 0 : data.vat || 15,
        description: data.description || "",
        vesselName: data.vessel_name || "",
        unitRate: data.unitrate || 0,
        total_cost: calculateTotalCostFromRates(
          data.rateper_6 || 0,
          data.rateper_12 || 0,
          data.rateper_abnormal || 0,
          data.num_six_meters || 0,
          data.num_twelve_meters || 0,
          data.num_abnormal || 0
        ),
        // Store rate data for preservation
        rateper_6: data.rateper_6 || 0,
        rateper_12: data.rateper_12 || 0,
        rateper_abnormal: data.rateper_abnormal || 0,
        rateper_breakbulk: data.rateper_breakbulk || 0,
        status: data.status || "",
        createdAt: formatDateForInput(data.created_at) || "", // Add creation date
      };

      setFormData(newFormData);

      // Load is_set_rate from database and set checkbox state
      if (data.is_set_rate === true || data.is_set_rate === "true" || data.is_set_rate === 1) {
        setIsSetRate(true);
      } else {
        setIsSetRate(false);
      }

      // Use historical set rate value when status is Completed
      if (data.is_set_rate && data.historical_set_rate) {
        setHistoricalSetRate(Number(data.historical_set_rate));
      } else {
        setHistoricalSetRate(null);
      }

      if (String(data.shipment_type) === "4" && Array.isArray(data.weight_rows)) {
        const mappedRows = data.weight_rows.map((row, index) => ({
          id: row.weight_pk || index + 1,
          ksmDmNo: row.ksm_dm_no || "",
          ticketNo: row.ticket_no || "",
          receiptBookNo: row.receipt_book_no || "",
          weight:
            row.weight === null || row.weight === undefined
              ? ""
              : String(row.weight),
        }));
        setWeightRows(mappedRows.length > 0 ? mappedRows : [
          {
            id: 1,
            ksmDmNo: "",
            ticketNo: "",
            receiptBookNo: "",
            weight: "",
          },
        ]);
      } else {
        setWeightRows([]);
      }

      // Update isImport state based on loaded shipment type
      const isImportType =
        data.shipmenttype && data.shipmenttype.toLowerCase() === "import";
      setIsImport(isImportType);

      // Set initial previous counts for existing instruction
      setPrevContainerCounts({
        num_six_meters: data.num_six_meters || 0,
        num_twelve_meters: data.num_twelve_meters || 0,
        num_abnormal: data.num_abnormal || 0,
      });

      // Set individual rate state variables from the backend response
      setFormData((prev) => ({
        ...prev,
        rateper_6: (data.rateper_6 || 0).toString(),
      }));
      setFormData((prev) => ({
        ...prev,
        rateper_12: (data.rateper_12 || 0).toString(),
      }));
      setFormData((prev) => ({
        ...prev,
        rateper_abnormal: (data.rateper_abnormal || 0).toString(),
      }));
      setWeight("");

      // Process containers if they exist in the response
      if (data.containers && data.containers.length > 0) {
        console.log(
          "Processing containers from instruction data:",
          data.containers
        );

        // Determine if weight should be loaded based on shipment type
        const shouldLoadWeight =
          isImportType ||
          String(data.shipment_type) === "2" ||
          String(data.shipment_type) === "3";

        console.log("Should load weight for containers:", {
          shipmentType: data.shipment_type,
          shipmentTypeString: String(data.shipment_type),
          isImportType,
          shouldLoadWeight,
        });

        // Log raw container data from database with all properties
        console.log(
          "Raw container data from database:",
          data.containers.map((c) => ({
            containerkey: c.containerkey,
            containernum: c.containernum,
            weight: c.weight,
            weight_type: typeof c.weight,
            container_type: c.container_type,
            cargo_description: c.cargo_description,
            // Log file_ref field from container data
            file_ref: c.file_ref,
            file_ref_exists: 'file_ref' in c,
            file_ref_type: typeof c.file_ref,
            // Log the exact property names and values for surcharge flags
            hazardous_flag: c["Hazardous"],
            hazardous_flag_type: typeof c["Hazardous"],
            hazardous_flag_value: String(c["Hazardous"]),
            hazardous_flag_boolean: Boolean(c["Hazardous"]),
            add_surcharges_flag: c["Add Surcharges"],
            add_surcharges_flag_type: typeof c["Add Surcharges"],
            add_surcharges_flag_value: String(c["Add Surcharges"]),
            add_surcharges_flag_boolean: Boolean(c["Add Surcharges"]),
            // Log all available properties on the container
            all_properties: Object.keys(c),
          }))
        );
        
        // Log the raw JSON string to see exact values without any conversion
        if (data.containers.length > 0) {
          console.log("First container raw JSON:", JSON.stringify(data.containers[0]));
        }
        
        // Log the first container object in full JSON format to see exact structure
        if (data.containers.length > 0) {
          console.log("First container full JSON:", JSON.stringify(data.containers[0], null, 2));
        }

        const containersList = data.containers.map((container, index) => {
          // Process each container's weight value
          let weightValue;
          if (shouldLoadWeight) {
            // For export and cross-haul, ensure weight is properly handled
            // Convert any numeric string to number, null/undefined to empty string
            if (container.weight !== null && container.weight !== undefined) {
              // Convert string weights to numbers
              if (
                typeof container.weight === "string" &&
                container.weight.trim() !== ""
              ) {
                weightValue = parseFloat(container.weight);
                if (isNaN(weightValue)) weightValue = "";
              } else {
                weightValue = container.weight;
              }
              console.log(
                `Container ${container.containernum} weight set to:`,
                weightValue,
                `(type: ${typeof weightValue})`
              );
            } else {
              weightValue = ""; // Empty string for editable types
              console.log(
                `Container ${container.containernum} has no weight, initializing as empty string`
              );
            }
          } else {
            weightValue = null; // Null for non-editable types
            console.log(
              `Container ${container.containernum} weight set to null (non-editable)`
            );
          }

          // Log individual container properties before mapping
          console.log(`Processing container ${index}:`, {
            containerkey: container.containerkey,
            containernum: container.containernum,
            hazardous_flag: container["Hazardous"],
            hazardous_flag_exists: "Hazardous" in container,
            add_surcharges_flag: container["Add Surcharges"],
            add_surcharges_flag_exists: "Add Surcharges" in container,
            vgm_flag: container.vgm,
            vgm_flag_exists: "vgm" in container,
          });
          
          // Try alternative property access methods with explicit boolean conversion
          // Add more detailed logging to diagnose the issue
          console.log(`Container ${index} property check:`, {
            hasHazardousProperty: "Hazardous" in container,
            hasAddSurchargesProperty: "Add Surcharges" in container,
            rawHazardousValue: container["Hazardous"],
            rawAddSurchargesValue: container["Add Surcharges"],
          });
          
          // Handle the hazardous flag - using the original column names from the database
          let hazardousValue = false;
          if (container["Hazardous"] !== undefined) {
            hazardousValue = container["Hazardous"] === true || container["Hazardous"] === 'true';
          }
            
          // Handle the add surcharges flag - using the original column names from the database
          let addSurchargesValue = false;
          if (container["Add Surcharges"] !== undefined) {
            addSurchargesValue = container["Add Surcharges"] === true || container["Add Surcharges"] === 'true';
          }

          // Handle the VGM flag - boolean from DB (already lower-case key)
          let vgmValue = false;
          if (container.vgm !== undefined) {
            vgmValue = container.vgm === true || container.vgm === 'true';
          }
          
          console.log(`Container ${index} resolved flags:`, {
            hazardous: hazardousValue,
            addSurcharges: addSurchargesValue
          });
          
          return {
            id: container.containerkey || index + 1,
            containerKey: container.containerkey,
            containerNum: container.containernum || "",
            fileRef: container.file_ref || "", // Add file_ref field from database
            weight: weightValue,
            containerType: container.container_type || "6m",
            cargoDescription: container.cargo_description || "",
            // Map the database column names to component property names with fallbacks
            hazardous: hazardousValue,
            addSurcharges: addSurchargesValue,
            surchargeAmount: Number(container["Surcharge Amount"] || 0),
            is_12m_surcharge: Boolean(container.is_12m_surcharge),
            surcharge_12m_amount: Number(container.surcharge_12m_amount || 0),
            hazardousAmount: Number(container["Hazardous Amount"] || 0),
            vgm: vgmValue,
            vgmAmount: Number(container["vgm amount"] || 0),
          };
        });

        console.log(
          "Setting containers from instruction data:",
          containersList
        );
        
        // Log detailed information about hazardous and surcharge flags in the mapped containers
        console.log("Container hazardous and surcharge flags:", 
          containersList.map(c => ({
            containerNum: c.containerNum,
            hazardous: c.hazardous,
            hazardous_type: typeof c.hazardous,
            addSurcharges: c.addSurcharges,
            addSurcharges_type: typeof c.addSurcharges
          }))
        );
        setContainers(containersList);
        setIsContainerDataModified(false);
      } else {
        console.log(
          "No containers found in instruction data, initializing based on counts"
        );
        initializeContainers(containersRef.current, {
          num_six_meters: data.num_six_meters || 0,
          num_twelve_meters: data.num_twelve_meters || 0,
          num_abnormal: data.num_abnormal || 0,
          num_breakbulk: data.num_breakbulk || 0,
        });
      }
    } catch (error) {
      console.error("Error applying instruction data:", error);
      setErrorModal({
        isOpen: true,
        message: "Failed to apply instruction data. Please try again.",
      });
    }
  };

  // useEffect to recalculate total cost when container surcharges or hazardous flags/amounts change
  useEffect(() => {
    if (containers.length > 0) {
      recalculateTotalCost(formData, containers, weightRows);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    containers.map(c => c.addSurcharges).join(','),
    containers.map(c => c.surchargeAmount).join(','),
    containers.map(c => c.hazardous).join(','),
    containers.map(c => c.hazardousAmount).join(','),
    containers.map(c => c.vgm).join(','),
    containers.map(c => c.vgmAmount).join(',')
  ]);

  // Wire recalculateTotalCost into the ref so the container hook can call it
  // without creating a circular dependency at hook-call time.
  recalculateTotalCostRef.current = () =>
    recalculateTotalCost(formData, containersRef.current, weightRowsRef.current);

  const handleClientChange = (e) => {
    const clientId = e.target.value;
    const selectedClient = clients.find(
      (client) => client.m5clientkey.toString() === clientId
    );
    if (selectedClient) {
      setFormData({
        ...formData,
        clientId,
        representative: selectedClient.representative || "",
        contactDetails: selectedClient.cellnum || "",
        email: selectedClient.email || "",
      });
    } else {
      setFormData({
        ...formData,
        clientId,
        representative: "",
        contactDetails: "",
        email: "",
      });
    }
    setFieldErrors((prev) => ({ ...prev, clientId: "" }));
  };

  const handleShipmentTypeChange = (e) => {
    const shipmentTypeId = e.target.value;
    const selectedShipmentType = shipmentTypes.find(
      (type) => type.shipkey.toString() === shipmentTypeId
    );
    const shipmentTypeName = selectedShipmentType
      ? selectedShipmentType.shipmenttype
      : "";
    const isImportType = shipmentTypeName.toLowerCase() === "import";
    const isCrossHaul =
      shipmentTypeName.toLowerCase() === "cross-haul" || shipmentTypeId === "4";

    // Check if changing to cross-haul (break bulk) (type 4) with non-zero container counts
    if (shipmentTypeId === "4") {
      const totalContainers =
        formData.num_six_meters +
        formData.num_twelve_meters +
        formData.num_abnormal;
      if (totalContainers > 0) {
        // Show warning modal
        setWarningModal({
          isOpen: true,
          message:
            "Before changing to Cross-haul (break bulk), please set all container counts to 0.",
          shipmentTypeId: shipmentTypeId,
          shipmentTypeName: shipmentTypeName,
          onConfirm: () => {
            // Set all container counts to 0 and proceed with shipment type change
            const updatedFormData = {
              ...formData,
              num_six_meters: 0,
              num_twelve_meters: 0,
              num_abnormal: 0,
              shipmentTypeId: String(shipmentTypeId),
              shipmentTypeName,
              vesselName: "",
              stackDate: "",
              rateWeight: "ton",
            };
            setFormData(updatedFormData);
            setIsImport(isImportType);

            // Re-initialize containers with zero counts
            setTimeout(() => {
              initializeContainers([], {});
            }, 0);
          },
        });
        return; // Stop execution here until user responds to warning
      }
    }

    // Determine if the new shipment type should have weight fields
    const shouldHaveWeight =
      isImportType ||
      String(shipmentTypeId) === "2" ||
      String(shipmentTypeId) === "3";

    console.log(
      "BEFORE CHANGE - Current containers:",
      containers.map((c) => ({
        id: c.id,
        type: c.containerType,
        weight: c.weight,
        weightType: typeof c.weight,
      }))
    );
    console.log("BEFORE CHANGE - isImport:", isImport);
    console.log(
      "BEFORE CHANGE - formData.shipmentTypeId:",
      formData.shipmentTypeId,
      "(type: " + typeof formData.shipmentTypeId + ")"
    );
    console.log(
      "BEFORE CHANGE - Weight column should show:",
      isImport ||
        String(formData.shipmentTypeId) === "2" ||
        String(formData.shipmentTypeId) === "3"
    );

    // Update isImport state based on shipment type
    setIsImport(isImportType);

    console.log(
      `Shipment type changed to: ${shipmentTypeId} (${shipmentTypeName}), isImport set to: ${isImportType}`
    );
    console.log(
      `New shipment type should have weight fields: ${shouldHaveWeight}`
    );

    // For cross-haul (break bulk) - type 4, clear vessel name and stack date and set rateWeight to 'ton'
    if (shipmentTypeId === "4") {
      setFormData({
        ...formData,
        shipmentTypeId: String(shipmentTypeId), // Ensure it's stored as string
        shipmentTypeName,
        vesselName: "",
        stackDate: "",
        // Default unit per to 'ton' for shipment type 4 (Cross-haul break bulk)
        rateWeight: "ton",
      });
      
      // Initialize weightRows with a single blank entry for break bulk
      setWeightRows([
        {
          id: 1,
          ksmDmNo: "",
          ticketNo: "",
          receiptBookNo: "",
          weight: "",
        },
      ]);
    }
    // For Import, Export, or Cross-haul (types 1, 2, 3), set rateWeight to 'Container'
    else if (
      shipmentTypeId === "1" ||
      shipmentTypeId === "2" ||
      shipmentTypeId === "3"
    ) {
      // Check if we're switching between container-based shipment types (1, 2, 3)
      const previousShipmentType = formData.shipmentTypeId;
      const isContainerTypeSwitch = ["1", "2", "3"].includes(
        previousShipmentType
      );

      // Preserve container rates and counts when switching between container-based types
      setFormData({
        ...formData,
        shipmentTypeId: String(shipmentTypeId), // Ensure it's stored as string
        shipmentTypeName,
        // Set unit per to 'Container' for shipment types 1, 2, 3
        rateWeight: "Container",
        // Only initialize these to 0 if not already a container type
        num_six_meters: isContainerTypeSwitch ? formData.num_six_meters : 0,
        num_twelve_meters: isContainerTypeSwitch
          ? formData.num_twelve_meters
          : 0,
        num_abnormal: isContainerTypeSwitch ? formData.num_abnormal : 0,
        num_breakbulk: 0, // Always clear break bulk count when switching to container types
        rateper_6: isContainerTypeSwitch ? formData.rateper_6 : 0,
        rateper_12: isContainerTypeSwitch ? formData.rateper_12 : 0,
        rateper_abnormal: isContainerTypeSwitch ? formData.rateper_abnormal : 0,
        rateper_breakbulk: 0, // Always clear break bulk rate when switching to container types
      });

      // Only re-initialize containers if not switching between container types
      if (!isContainerTypeSwitch) {
        setTimeout(() => {
          // Counts were just reset to 0 above; clear containers
          initializeContainers([], {});
        }, 0);
      }
      
      // Reset set rate mode when switching away from break bulk
      setIsSetRate(false);
      
      // Continue processing - don't return early so the state update completes properly
    }
    // For any other shipment type
    else {
      setFormData({
        ...formData,
        shipmentTypeId: String(shipmentTypeId), // Ensure it's stored as string
        shipmentTypeName,
      });
    }

    // Clear any field errors
    setFieldErrors((prev) => ({ ...prev, shipmentTypeId: "" }));

    // Update container weight fields based on new shipment type
    if (containers && containers.length > 0) {
      console.log("Updating container weight fields for new shipment type");

      // Update container weight fields directly without re-initializing
      setContainers((prevContainers) =>
        prevContainers.map((container) => {
          // If the new shipment type should have weight fields
          if (shouldHaveWeight) {
            // If container already has a weight value, keep it
            // Otherwise initialize with empty string
            const weightValue =
              container.weight !== null && container.weight !== undefined
                ? container.weight
                : "";
            console.log(
              `Container ${container.id} weight updated for new shipment type:`,
              weightValue
            );
            return { ...container, weight: weightValue };
          } else {
            // For shipment types that don't need weight, set to null
            console.log(
              `Container ${container.id} weight set to null for new shipment type`
            );
            return { ...container, weight: null };
          }
        })
      );
    }

    // Check if we're switching between import (1), export (2), or cross-haul (3) types
    const isImportExportCrossHaulSwitch =
      // Current shipment type is one of import, export, or cross-haul
      (formData.shipmentTypeId === "1" ||
        formData.shipmentTypeId === "2" ||
        formData.shipmentTypeId === "3") &&
      // New shipment type is also one of import, export, or cross-haul
      (shipmentTypeId === "1" ||
        shipmentTypeId === "2" ||
        shipmentTypeId === "3");

    // Only re-initialize containers if NOT switching between import, export, and cross-haul
    // or if we're switching to/from cross-haul break bulk (type 4)
    if (
      !isImportExportCrossHaulSwitch ||
      shipmentTypeId === "4" ||
      formData.shipmentTypeId === "4"
    ) {
      console.log("Re-initializing containers for new shipment type");
      // Capture counts before setTimeout so the closure sees current formData
      const currentCounts = {
        num_six_meters: formData.num_six_meters || 0,
        num_twelve_meters: formData.num_twelve_meters || 0,
        num_abnormal: formData.num_abnormal || 0,
        num_breakbulk: formData.num_breakbulk || 0,
      };
      setTimeout(() => {
        // Only re-initialize if container counts have changed
        if (
          currentCounts.num_six_meters > 0 ||
          currentCounts.num_twelve_meters > 0 ||
          currentCounts.num_abnormal > 0 ||
          currentCounts.num_breakbulk > 0
        ) {
          initializeContainers(containersRef.current, currentCounts);
        }

        console.log(
          "AFTER CHANGE - Containers updated with shipment type:",
          shipmentTypeId,
          "(type: " + typeof shipmentTypeId + ")"
        );
        console.log(
          "AFTER CHANGE - formData.shipmentTypeId:",
          formData.shipmentTypeId,
          "(type: " + typeof formData.shipmentTypeId + ")"
        );
        console.log(
          "AFTER CHANGE - Weight column should show:",
          isImportType ||
            String(shipmentTypeId) === "2" ||
            String(shipmentTypeId) === "3"
        );
        console.log(
          "AFTER CHANGE - Updated containers:",
          containers.map((c) => ({
            id: c.id,
            type: c.containerType,
            weight: c.weight,
            weightType: typeof c.weight,
          }))
        );
      }, 100);
    } else {
      console.log(
        "Preserving container details when switching between import, export, and cross-haul types"
      );
      console.log(
        "AFTER CHANGE - Containers preserved with shipment type:",
        shipmentTypeId
      );
    }
  };

  // Check if shipment type is Cross-haul
  const isCrossHaulShipment = () => {
    const selectedShipmentType = shipmentTypes.find(
      (type) => type.shipkey.toString() === formData.shipmentTypeId
    );
    return (
      selectedShipmentType &&
      (selectedShipmentType.shipmenttype.toLowerCase() === "cross-haul" ||
        String(formData.shipmentTypeId) === "4")
    );
  };

  // Alias to utility — named locally so JSX references stay unchanged
  const formatDateForInput = formatDateForInputUtil;

  const handleDropoffChange = async (e) => {
    const dropoffLocation = e.target.value;

    // Update the dropoff location in form data
    setFormData((prev) => ({
      ...prev,
      dropoff: dropoffLocation,
    }));

    // Clear field error
    clearFieldError("dropoff");

    // Fetch new rates for the current pickup and new dropoff combination
    if (formData.pickup && dropoffLocation) {
      await fetchRates(formData.clientId, formData.pickup, dropoffLocation);
    }
  };

  const handlePickupChange = async (e) => {
    const pickupLocation = e.target.value;

    // Update the pickup location in form data
    setFormData((prev) => ({
      ...prev,
      pickup: pickupLocation,
      dropoff: "", // Clear the dropoff when pickup changes
    }));

    // Clear field error
    clearFieldError("pickup");

    // Fetch rates for the selected pickup location
    await fetchRates(formData.clientId, pickupLocation);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let processedValue = type === "checkbox" ? checked : value;

    // Handle date inputs
    if (type === "date") {
      processedValue = formatDateForInput(value);
    }

    // Handle special field types
    if (name === "imoNo") {
      processedValue = value.replace(/[^0-9]/g, "").slice(0, 15);
    } else if (name === "flagReg") {
      processedValue = value.replace(/[^a-zA-Z\s\-']/g, "");
    }

    // Update form data
    setFormData((prev) => ({
      ...prev,
      [name]: processedValue,
    }));

    // Clear field error when user starts typing
    clearFieldError(name);
  };

  const handleNumericInputChange = (e) => {
    const { name, value } = e.target;

    if (
      name === "num_six_meters" ||
      name === "num_twelve_meters" ||
      name === "num_abnormal" ||
      name === "num_breakbulk"
    ) {
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

      // Update the containers based on the count change
      let containerType;
      if (name === "num_six_meters") containerType = "6m";
      else if (name === "num_twelve_meters") containerType = "12m";
      else if (name === "num_abnormal") containerType = "Abnormal";
      else if (name === "num_breakbulk") containerType = "BreakBulk";

      if (containerType) {
        // Update containers directly
        if (isIncreasing) {
          // Add new containers
          const newContainers = [];
          const nextId =
            containers.length > 0
              ? Math.max(...containers.map((c) => c.id)) + 1
              : 1;

          for (let i = 0; i < difference; i++) {
            newContainers.push({
              id: nextId + i,
              containerKey: null,
              containerNum: "",
              weight:
                isImport ||
                formData.shipmentTypeId === "2" ||
                formData.shipmentTypeId === "3"
                  ? ""
                  : null,
              containerType: containerType,
              cargoDescription: "",
            });
          }

          setContainers([...containers, ...newContainers]);
          setIsContainerDataModified(true);
        } else {
          // Remove containers of the specified type (most recently added first)
          const containersOfType = containers.filter(
            (c) => c.containerType === containerType
          );
          const containersToRemove = containersOfType.slice(
            containersOfType.length - difference
          );
          const updatedContainers = containers.filter(
            (c) => !containersToRemove.includes(c)
          );

          setContainers(updatedContainers);
          setIsContainerDataModified(true);
        }

        // Also update preserved containers for consistency
        if (preservedContainers) {
          updatePreservedContainers(containerType, isIncreasing, difference);
        }
      }

      // Calculate total cost using individual rates
      const sixRate = Number(formData.rateper_6 || 0);
      const twelveRate = Number(formData.rateper_12 || 0);
      const abnormalRateNum = Number(formData.rateper_abnormal || 0);
      const breakBulkRate = Number(formData.rateper_breakbulk || 0);

      const totalCost =
        (name === "num_six_meters"
          ? validValue
          : updatedFormData.num_six_meters) *
          sixRate +
        (name === "num_twelve_meters"
          ? validValue
          : updatedFormData.num_twelve_meters) *
          twelveRate +
        (name === "num_abnormal" ? validValue : updatedFormData.num_abnormal) *
          abnormalRateNum +
        (name === "num_breakbulk"
          ? validValue
          : updatedFormData.num_breakbulk || 0) *
          breakBulkRate;

      updatedFormData.total_cost = totalCost;

      console.log(`Container count updated - ${name}: ${validValue}`);
      setFormData(updatedFormData);
      updatePreservedContainers(name, isIncreasing, difference);
      setFieldErrors((prev) => ({ ...prev, containers: "" }));
    } else if (name === "rateWeight") {
      const updatedFormData = {
        ...formData,
        [name]: value,
      };
      updatedFormData.total_cost = 0;
      setFormData(updatedFormData);
      setFieldErrors((prev) => ({ ...prev, rateWeight: "", weight: "" }));
    } else if (name === "pickupDate") {
      setFormData({
        ...formData,
        [name]: value,
        stackDate:
          formData.stackDate && new Date(formData.stackDate) <= new Date(value)
            ? ""
            : formData.stackDate,
        lastFreeDate:
          formData.lastFreeDate &&
          new Date(formData.lastFreeDate) <= new Date(value) <= new Date(value)
            ? ""
            : formData.lastFreeDate,
      });
      setFieldErrors((prev) => ({ ...prev, pickupDate: "" }));
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleRateChange = (e) => {
    const { name, value } = e.target;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      // Update the rate in form data (keep as string during editing to allow decimals)
      const updatedFormData = {
        ...formData,
        [name]: value === "" ? "" : value,
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
  };

  const handleWeightChange = (e) => {
    const value = e.target.value;
    if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
      setWeight(value);
      setFieldErrors((prev) => ({ ...prev, weight: "" }));
    }
  };

  const updatePreservedContainers = (
    containerType,
    isIncreasing,
    difference
  ) => {
    const containerTypeMap = {
      num_six_meters: "6m",
      num_twelve_meters: "12m",
      num_abnormal: "Abnormal",
    };
    const type = containerTypeMap[containerType];
    if (!type) return;
    if (isIncreasing) {
      const newContainers = [];
      const nextId =
        preservedContainers.length > 0
          ? Math.max(...preservedContainers.map((c) => c.id)) + 1
          : 1;
      for (let i = 0; i < difference; i++) {
        newContainers.push({
          id: nextId + i,
          containerKey: null,
          containerNum: "",
          weight: isImport ? "" : null,
          containerType: type,
          cargoDescription: "",
        });
      }
      setPreservedContainers([...preservedContainers, ...newContainers]);
    } else {
      const containersOfType = preservedContainers.filter(
        (c) => c.containerType === type
      );
      const containersToRemove = containersOfType.slice(
        containersOfType.length - difference
      );
      const updatedContainers = preservedContainers.filter(
        (c) => !containersToRemove.includes(c)
      );
      setPreservedContainers(updatedContainers);
    }
  };

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
    const sixRate = Number(formData.rateper_6 || 0);
    const twelveRate = Number(formData.rateper_12 || 0);
    const abnormalRateNum = Number(formData.rateper_abnormal || 0);
    const breakBulkRate = Number(formData.rateper_breakbulk || 0);

    const totalCost =
      (type === "num_six_meters"
        ? validValue
        : updatedFormData.num_six_meters) *
        sixRate +
      (type === "num_twelve_meters"
        ? validValue
        : updatedFormData.num_twelve_meters) *
        twelveRate +
      (type === "num_abnormal" ? validValue : updatedFormData.num_abnormal) *
        abnormalRateNum;

    updatedFormData.total_cost = totalCost;

    console.log(`Container count updated - ${type}: ${validValue}`);
    setFormData(updatedFormData);
    updatePreservedContainers(type, isIncreasing, difference);
    setFieldErrors((prev) => ({ ...prev, containers: "" }));
  };

  const validateForm = () => {
    console.log("validateForm called");
    console.log("Current formData:", formData);
    // Check if shipment type is cross-haul or type 4
    const isCrossHaul = isCrossHaulShipment();
    console.log("Is cross-haul shipment:", isCrossHaul);

    const requiredFields = [
      "clientId",
      "shipmentTypeId",
      "task",
      "pickup",
      "dropoff",
      "pickupTime",
      "pickupDate",
      "lastFreeDate",
      "bookingRef",
      "clientFileRef",
      "description",
    ];

    // Add vessel name and stack date as required for import and export shipment types (1 and 2)
    console.log(
      "Checking shipment type for vessel name and stack date requirement:",
      formData.shipmentTypeId
    );
    if (formData.shipmentTypeId === "1" || formData.shipmentTypeId === "2") {
      console.log("Adding vesselName and stackDate as required fields");
      requiredFields.push("vesselName", "stackDate");
    }

    let isValid = true;
    const errors = {};
    console.log("Validating required fields...");
    for (const field of requiredFields) {
      if (!formData[field]) {
        console.log(`Missing required field: ${field}`);
        errors[field] = `This field is required`;
        isValid = false;
      } else {
        console.log(`Field ${field} is valid:`, formData[field]);
      }
    }
    if (formData.shipmentTypeId) {
      const selectedShipmentType = shipmentTypes.find(
        (type) => type.shipkey.toString() === formData.shipmentTypeId
      );
      if (selectedShipmentType) {
        const shipmentTypeName =
          selectedShipmentType.shipmenttype.toLowerCase();
        if (shipmentTypeName !== "import" && shipmentTypeName !== "export") {
          errors.shipmentTypeId = "Please select either Import or Export";
          isValid = false;
        }
      }
    }

    // Rate validation - only require rates when container count > 0
    if (formData.num_six_meters > 0) {
      if (
        formData.rateper_6 === "" ||
        formData.rateper_6 === "0" ||
        Number(formData.rateper_6) === 0
      ) {
        errors.rateper_6 = "Rate is required when containers are present";
        isValid = false;
      } else if (Number(formData.rateper_6) <= 0) {
        errors.rateper_6 = "Rate must be a positive number";
        isValid = false;
      }
    }

    if (formData.num_twelve_meters > 0) {
      if (
        formData.rateper_12 === "" ||
        formData.rateper_12 === "0" ||
        Number(formData.rateper_12) === 0
      ) {
        errors.rateper_12 = "Rate is required when containers are present";
        isValid = false;
      } else if (Number(formData.rateper_12) <= 0) {
        errors.rateper_12 = "Rate must be a positive number";
        isValid = false;
      }
    }

    if (formData.num_abnormal > 0) {
      if (
        formData.rateper_abnormal === "" ||
        formData.rateper_abnormal === "0" ||
        Number(formData.rateper_abnormal) === 0
      ) {
        errors.rateper_abnormal =
          "Rate is required when containers are present";
        isValid = false;
      } else if (Number(formData.rateper_abnormal) <= 0) {
        errors.rateper_abnormal = "Rate must be a positive number";
        isValid = false;
      }
    }

    // For ton or kg, both weight and unitRate are required
    if (
      (formData.rateWeight === "ton" || formData.rateWeight === "kg") &&
      (formData.weight === "" || weight === "")
    ) {
      errors.weight = "Please add weight";
      isValid = false;
    }

    // For Set Rate mode, setRateAmount is required
    if (isSetRateMode && (!formData.setRateAmount || formData.setRateAmount === "")) {
      errors.setRateAmount = "Set rate amount is required when unit type is Set Rate";
      isValid = false;
    }

    // For ton or kg, unitRate is required (unless Set Rate is checked)
    if (
      (formData.rateWeight === "ton" || formData.rateWeight === "kg") &&
      !isSetRate &&
      (!formData.unitRate ||
        formData.unitRate === "" ||
        formData.unitRate === "0")
    ) {
      errors.unitRate = `Rate per ${formData.rateWeight} is required`;
      isValid = false;
    }

    // Validate weight if provided for import, export, or cross-haul shipments
    if (
      (isImport ||
        formData.shipmentTypeId === "2" ||
        formData.shipmentTypeId === "3") &&
      (formData.weight !== "" || weight !== "")
    ) {
      const weightValue = Number.parseFloat(formData.weight || weight);
      if (isNaN(weightValue) || weightValue <= 0) {
        errors.weight = "Weight must be a positive number";
        isValid = false;
      }
    }

    // Validate unitRate format if provided
    if (formData.unitRate && formData.unitRate !== "") {
      const unitRateValue = Number.parseFloat(formData.unitRate);
      if (isNaN(unitRateValue) || unitRateValue <= 0) {
        errors.unitRate = `Rate per ${formData.rateWeight} must be a positive number`;
        isValid = false;
      }
    }
    const totalContainers =
      formData.num_six_meters +
      formData.num_twelve_meters +
      formData.num_abnormal;
    if (totalContainers <= 0) {
      errors.containers = "Please add at least one container";
      isValid = false;
    }
    if (
      formData.stackDate &&
      formData.pickupDate &&
      new Date(formData.stackDate) < new Date(formData.pickupDate)
    ) {
      errors.stackDate = `${
        isImport ? "ETA" : "Stack date"
      } cannot be before pickup date`;
      isValid = false;
    }
    if (
      formData.lastFreeDate &&
      new Date(formData.lastFreeDate) < new Date(today)
    ) {
      errors.lastFreeDate = "Last Free Date cannot be in the past";
      isValid = false;
    }
    if (
      formData.lastFreeDate &&
      formData.stackDate &&
      new Date(formData.lastFreeDate) < new Date(formData.stackDate)
    ) {
      errors.lastFreeDate = `Last Free Date cannot be before ${
        isImport ? "ETA" : "stack date"
      }`;
      isValid = false;
    }
    setFieldErrors(errors);
    if (!isValid) {
      const firstErrorField = Object.keys(errors)[0];
      scrollToField(firstErrorField);
    }
    return isValid;
  };

  // Check if shipment type is Import
  const isImportShipment = () => {
    const selectedShipmentType = shipmentTypes.find(
      (type) => type.shipkey.toString() === formData.shipmentTypeId
    );
    return (
      selectedShipmentType &&
      selectedShipmentType.shipmenttype.toLowerCase() === "import"
    );
  };

  const handleBackClick = () => {
    const stateToPass = {
      clientId,
      clientName,
      selectedMonth,
      selectedYear,
      activeFilter,
    };

    console.log("Navigating back to instructions with state:", stateToPass);
    navigate("/instructions", { state: stateToPass });
  };

  const handleSubmit = async (e) => {
    console.log("handleSubmit called");
    e.preventDefault();

    // Special validation for vessel name and stack date for import and export shipment types
    // Skip vessel name for shipment type 4 (cross-haul break bulk)
    let hasSpecialValidationErrors = false;
    if (formData.shipmentTypeId === "1" || formData.shipmentTypeId === "2") {
      const errors = {};

      if (!formData.vesselName || !formData.vesselName.trim()) {
        errors.vesselName = "Vessel name is required";
        hasSpecialValidationErrors = true;
      }

      if (!formData.stackDate || !formData.stackDate.trim()) {
        errors.stackDate = `${
          formData.shipmentTypeId === "1" ? "ETA" : "Stack"
        } date is required`;
        hasSpecialValidationErrors = true;
      }

      if (hasSpecialValidationErrors) {
        setFieldErrors((prev) => ({ ...prev, ...errors }));
        scrollToField(Object.keys(errors)[0]);
        console.log("Special validation failed:", errors);
        return;
      }
    } else if (formData.shipmentTypeId === "4") {
      // For shipment type 4 (cross-haul break bulk), only validate stack date
      const errors = {};
      if (!formData.stackDate || !formData.stackDate.trim()) {
        errors.stackDate = "Stack date is required";
        hasSpecialValidationErrors = true;
      }
      if (hasSpecialValidationErrors) {
        setFieldErrors((prev) => ({ ...prev, ...errors }));
        scrollToField(Object.keys(errors)[0]);
        console.log("Special validation failed:", errors);
        return;
      }
    }

    // Then validate the rest of the form
    console.log("Validating form...");
    const isValid = validateForm();
    console.log("Form validation result:", isValid);

    if (!isValid) {
      console.log("Form validation failed");
      return;
    }

    try {
      console.log("Form is valid, proceeding with submission...");
      // Calculate total cost using individual rates
      const sixRate = Number(formData.rateper_6 || 0);
      const twelveRate = Number(formData.rateper_12 || 0);
      const abnormalRateNum = Number(formData.rateper_abnormal || 0);

      const totalCost =
        formData.num_six_meters * sixRate +
        formData.num_twelve_meters * twelveRate +
        formData.num_abnormal * abnormalRateNum;

      const totalContainers =
        formData.num_six_meters +
        formData.num_twelve_meters +
        formData.num_abnormal;

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
        weight:
          (isImport ||
            formData.shipmentTypeId === "2" ||
            formData.shipmentTypeId === "3") &&
          formData.rateWeight !== "Container"
            ? formData.weight || weight
            : null,
      };

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
      };

      console.log(
        "Navigating to FCcontrollerInstructionDetails with state:",
        stateToPass
      );

      navigate("/FCcontrollerInstructionDetails", { state: stateToPass });
    } catch (error) {
      console.error("Error processing form:", error);
      setErrorModal({
        isOpen: true,
        message: "Failed to process form. Please try again.",
      });
    }
  };

  const handleRetryFetch = () => {
    if (
      isLoading.clients ||
      isLoading.shipmentTypes ||
      isLoading.startingPoints ||
      isLoading.destinations
    ) {
      return;
    }
    // Delegate base data re-fetch to the hook
    refetchBaseData();
    setErrorModal({
      isOpen: false,
      message: "",
    });
  };

  const nonEditableStyle = {
    backgroundColor: "#f0f0f0",
    cursor: "not-allowed",
  };

  const readOnlyStyle = {
    backgroundColor: "#f8f9fa",
    cursor: "not-allowed",
    color: "#6c757d",
    border: "1px solid #e9ecef",
  };

  // Loading state check: hook covers all fetch flags; also ensure formData is initialized
  const isLoadingCompleteWithData =
    isLoadingComplete && Object.keys(formData).length > 0;

  // Debug log for loading states
  console.log("Loading states:", {
    clients: isLoading.clients,
    shipmentTypes: isLoading.shipmentTypes,
    startingPoints: isLoading.startingPoints,
    destinations: isLoading.destinations,
    instruction: isLoading.instruction,
    formDataKeys: Object.keys(formData),
    isLoadingComplete,
  });

  const hasDataFailure =
    clients.length === 0 ||
    shipmentTypes.length === 0 ||
    startingPoints.length === 0;

  return (
    <InstructionLoadingGate
      isLoadingComplete={isLoadingCompleteWithData}
      hasDataFailure={hasDataFailure}
      onRetry={handleRetryFetch}
    >
    <div className="controller-instructions-root">
      <div className="controller-instructions-unique-wrapper">
        {errorModal.isOpen &&
          errorModal.message.includes("Failed to fetch") && (
            <ErrorModal
              isOpen={errorModal.isOpen}
              message={errorModal.message}
              onClose={() => setErrorModal({ isOpen: false, message: "" })}
              type="error"
            />
          )}
        <div className="controller-instructions-header">
          <button
            className="controller-instructions-back-button"
            onClick={() => handleBackClick()}
          >
            Back
          </button>
        </div>
        <div
          className="controller-instructions-form-container"
          style={{ maxWidth: "1200px" }}
        >
          <InstructionBanners
            isReadOnly={isReadOnly}
            status={formData.status}
            showSetRateWarning={showSetRateWarning}
            historicalSetRate={historicalSetRate}
            setRateValue={setRateValue}
          />
          <div className="controller-instructions-form-section controller-instructions-client-info-section">
            <div className="controller-instructions-form-row">
              <div className="controller-instructions-form-field">
                <label>Client</label>
                <div
                  className="controller-instructions-select-wrapper"
                  ref={fieldRefs.clientId}
                >
                  <select
                    style={isReadOnly ? readOnlyStyle : nonEditableStyle}
                    className={`dropdown ${
                      fieldErrors.clientId
                        ? "controller-instructions-error-field"
                        : ""
                    }`}
                    name="clientId"
                    value={formData.clientId || ""}
                    onChange={handleClientChange}
                    disabled={true}
                  >
                    <option value="" disabled>
                      Select Client
                    </option>
                    {clients.map((client) => (
                      <option
                        key={client.m5clientkey}
                        value={client.m5clientkey}
                      >
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
              <div className="controller-instructions-form-field">
                <label>Creation Date</label>
                <input
                  type="date"
                  className="controller-instructions-form-input"
                  name="createdAt"
                  value={formData.createdAt || ""}
                  onChange={handleInputChange}
                  disabled={isReadOnly}
                  style={isReadOnly ? readOnlyStyle : {}}
                  ref={fieldRefs.createdAt}
                />
              </div>
            </div>
          </div>
          <div className="controller-instructions-form-section">
            {false && (
              <div
                className="controller-instructions-form-row"
                style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}
              >
                <div
                  className="controller-instructions-form-field"
                  style={{ flex: "1 1 180px", maxWidth: "220px" }}
                >
                  <label>Shipment Type</label>
                  <div
                    className="controller-instructions-select-wrapper"
                    ref={fieldRefs.shipmentTypeId}
                  >
                    <select
                      className={`dropdown ${
                        fieldErrors.shipmentTypeId
                          ? "controller-instructions-error-field"
                          : ""
                      }`}
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
                    <ErrorTooltip
                      message={fieldErrors.shipmentTypeId}
                    />
                  </div>
                </div>

                <div
                  className="controller-instructions-form-field"
                  style={{ flex: "1 1 220px", maxWidth: "260px" }}
                >
                  <label>Pickup Location</label>
                  {routeEditMode === "locked" && hasRouteMismatch ? (
                    <input
                      type="text"
                      className="controller-instructions-form-input"
                      ref={fieldRefs.pickup}
                      value={formData.pickup || ""}
                      readOnly
                      style={readOnlyStyle}
                      onClick={() =>
                        setConfirmationModal({
                          isOpen: true,
                          message:
                            "The current route no longer matches any client rates. To edit it, you will need to select a new valid starting point and dropoff from the current lists. Do you want to continue?",
                          action: "unlock-route",
                        })
                      }
                    />
                  ) : (
                    <div
                      className="controller-instructions-select-wrapper"
                      ref={fieldRefs.pickup}
                    >
                      <select
                        className={`controller-instructions-dropdown ${
                          fieldErrors.pickup
                            ? "controller-instructions-error-field"
                            : ""
                        }`}
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
                  )}
                </div>

                <div
                  className="controller-instructions-form-field"
                  style={{ flex: "1 1 220px", maxWidth: "260px" }}
                >
                  <label>Dropoff Location</label>
                  {routeEditMode === "locked" && hasRouteMismatch ? (
                    <input
                      type="text"
                      className="controller-instructions-form-input"
                      ref={fieldRefs.dropoff}
                      value={formData.dropoff || ""}
                      readOnly
                      style={readOnlyStyle}
                      onClick={() =>
                        setConfirmationModal({
                          isOpen: true,
                          message:
                            "The current route no longer matches any client rates. To edit it, you will need to select a new valid starting point and dropoff from the current lists. Do you want to continue?",
                          action: "unlock-route",
                        })
                      }
                    />
                  ) : (
                    <div
                      className="controller-instructions-select-wrapper"
                      ref={fieldRefs.dropoff}
                    >
                      <select
                        className={`controller-instructions-dropdown ${
                          fieldErrors.dropoff
                            ? "controller-instructions-error-field"
                            : ""
                        }`}
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
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="controller-instructions-form-section">
            <div className="controller-instructions-form-row controller-instructions-trailer-container">
              <div
                className="controller-instructions-trailer-title"
                style={{ display: "none" }}
              >
                <h3>Trailer Size</h3>
              </div>
              <hr
                className="controller-instructions-divider"
                style={{ display: "none" }}
              />
              <div
                className="controller-instructions-container-section"
              >
                <div className="controller-instructions-container-group">
                  <div className="controller-instructions-container-label">
                    <span className="controller-instructions-trailer-size-label">
                      Trailer Size
                    </span>
                    <label>No. of Containers</label>
                    {fieldErrors.containers && (
                      <div className="controller-instructions-container-error-message">
                        {fieldErrors.containers}
                      </div>
                    )}
                  </div>
                  <div className="controller-instructions-container-inputs">
                    <div className="controller-instructions-container-input">
                      <label>6m</label>
                      <div className="controller-instructions-container-rate-group">
                        <input
                          type="number"
                          className={
                            fieldErrors.containers
                              ? "controller-instructions-error-field"
                              : ""
                          }
                          value={formData.num_six_meters}
                          min="0"
                          name="num_six_meters"
                          onChange={(e) => handleNumericInputChange(e)}
                          disabled={
                            formData.rateWeight !== "Container" || isReadOnly || isSetRateMode
                          }
                          style={isReadOnly ? readOnlyStyle : {}}
                        />
                        <div
                          className="controller-instructions-input-wrapper controller-instructions-rate-input"
                          ref={fieldRefs.rateper_6}
                        >
                          <input
                            type="text"
                            className={`controller-instructions-form-input ${
                              fieldErrors.rateper_6
                                ? "controller-instructions-error-field"
                                : ""
                            }`}
                            placeholder="Rate"
                            value={formData.rateper_6 || ""}
                            name="rateper_6"
                            onChange={handleRateChange}
                            disabled={
                              formData.rateWeight !== "Container" || isReadOnly
                            }
                            style={isReadOnly ? readOnlyStyle : {}}
                          />
                          <ErrorTooltip
                            message={fieldErrors.rateper_6}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="controller-instructions-container-input">
                      <label>12m</label>
                      <div className="controller-instructions-container-rate-group">
                        <input
                          type="number"
                          className={
                            fieldErrors.containers
                              ? "controller-instructions-error-field"
                              : ""
                          }
                          value={formData.num_twelve_meters}
                          min="0"
                          name="num_twelve_meters"
                          onChange={(e) => handleNumericInputChange(e)}
                          disabled={
                            formData.rateWeight !== "Container" || isReadOnly || isSetRateMode
                          }
                          style={isReadOnly ? readOnlyStyle : {}}
                        />
                        <div
                          className="controller-instructions-input-wrapper controller-instructions-rate-input"
                          ref={fieldRefs.rateper_12}
                        >
                          <input
                            type="text"
                            className={`controller-instructions-form-input ${
                              fieldErrors.rateper_12
                                ? "controller-instructions-error-field"
                                : ""
                            }`}
                            placeholder="Rate"
                            value={formData.rateper_12 || ""}
                            name="rateper_12"
                            onChange={handleRateChange}
                            disabled={
                              formData.rateWeight !== "Container" || isReadOnly
                            }
                            style={isReadOnly ? readOnlyStyle : {}}
                          />
                          <ErrorTooltip
                            message={fieldErrors.rateper_12}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="controller-instructions-container-input">
                      <label>Abnormal</label>
                      <div className="controller-instructions-container-rate-group">
                        <input
                          type="number"
                          className={
                            fieldErrors.containers
                              ? "controller-instructions-error-field"
                              : ""
                          }
                          value={formData.num_abnormal}
                          min="0"
                          name="num_abnormal"
                          onChange={(e) => handleNumericInputChange(e)}
                          disabled={
                            formData.rateWeight !== "Container" || isReadOnly || isSetRateMode
                          }
                          style={isReadOnly ? readOnlyStyle : {}}
                        />
                        <div
                          className="controller-instructions-input-wrapper controller-instructions-rate-input"
                          ref={fieldRefs.rateper_abnormal}
                        >
                          <input
                            type="text"
                            className={`controller-instructions-form-input ${
                              fieldErrors.rateper_abnormal
                                ? "controller-instructions-error-field"
                                : ""
                            }`}
                            placeholder="Rate"
                            value={formData.rateper_abnormal || ""}
                            name="rateper_abnormal"
                            onChange={handleRateChange}
                            disabled={
                              formData.rateWeight !== "Container" || isReadOnly
                            }
                            style={isReadOnly ? readOnlyStyle : {}}
                          />
                          <ErrorTooltip
                            message={fieldErrors.rateper_abnormal}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hazardous and Surcharges checkboxes have been removed from this section */}
                </div>
                {/* Main form section */}
                <div
                  className="controller-instructions-booking-vertical-group"
                  style={{
                    marginTop: "8px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    maxWidth: "220px",
                  }}
                >
                  <div className="controller-instructions-form-field">
                    <label>Shipment Type</label>
                    <div
                      className="controller-instructions-select-wrapper"
                      ref={fieldRefs.shipmentTypeId}
                    >
                      <select
                        className={`controller-instructions-dropdown ${
                          fieldErrors.shipmentTypeId
                            ? "controller-instructions-error-field"
                            : ""
                        }`}
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
                      <ErrorTooltip
                        message={fieldErrors.shipmentTypeId}
                      />
                    </div>
                  </div>
                  {routeEditMode === "locked" && hasRouteMismatch ? (
                    <>
                      <div className="controller-instructions-form-field">
                        <label>Pickup Location</label>
                        <div
                          className="controller-instructions-select-wrapper"
                          ref={fieldRefs.pickup}
                        >
                          <input
                            type="text"
                            className="controller-instructions-dropdown"
                            value={formData.pickup || ""}
                            readOnly
                            style={readOnlyStyle}
                            onClick={() =>
                              setConfirmationModal({
                                isOpen: true,
                                message:
                                  "The current route no longer matches any client rates. To edit it, you will need to select a new valid starting point and dropoff from the current lists. Do you want to continue?",
                                action: "unlock-route",
                              })
                            }
                          />
                          <ErrorTooltip message={fieldErrors.pickup} />
                        </div>
                      </div>
                      <div className="controller-instructions-form-field">
                        <label>Dropoff Location</label>
                        <div
                          className="controller-instructions-select-wrapper"
                          ref={fieldRefs.dropoff}
                        >
                          <input
                            type="text"
                            className="controller-instructions-dropdown"
                            value={formData.dropoff || ""}
                            readOnly
                            style={readOnlyStyle}
                            onClick={() =>
                              setConfirmationModal({
                                isOpen: true,
                                message:
                                  "The current route no longer matches any client rates. To edit it, you will need to select a new valid starting point and dropoff from the current lists. Do you want to continue?",
                                action: "unlock-route",
                              })
                            }
                          />
                          <ErrorTooltip message={fieldErrors.dropoff} />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="controller-instructions-form-field">
                        <label>Pickup Location</label>
                        <div
                          className="controller-instructions-select-wrapper"
                          ref={fieldRefs.pickup}
                        >
                          <select
                            className={`controller-instructions-dropdown ${
                              fieldErrors.pickup
                                ? "controller-instructions-error-field"
                                : ""
                            }`}
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
                        <div
                          className="controller-instructions-select-wrapper"
                          ref={fieldRefs.dropoff}
                        >
                          <select
                            className={`controller-instructions-dropdown ${
                              fieldErrors.dropoff
                                ? "controller-instructions-error-field"
                                : ""
                            }`}
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
                    </>
                  )}
                  {/* This surchages section has been moved to be next to the checkbox */}

                  {/* Compact Rates per dropdown and input fields in one row */}
                  <div
                    className="controller-instructions-form-field"
                  >
                    <label>Unit per</label>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "15px",
                        width: "100%",
                      }}
                    >
                      {/* Unit per dropdown */}
                      <div
                        className="controller-instructions-select-wrapper"
                        style={{ minWidth: "100px", marginTop: 0 }}
                      >
                        <select
                          className="controller-instructions-dropdown"
                          name="rateWeight"
                          value={formData.rateWeight || "Container"}
                          onChange={handleInputChange}
                          style={{
                            width: "100%",
                            padding: "4px 8px",
                            ...(isReadOnly ? readOnlyStyle : {}),
                          }}
                          ref={fieldRefs.rateWeight}
                          disabled={isReadOnly || isAddOn}
                        >
                          {/* Show kg and ton options only for Cross-haul (break bulk) - type 4 */}
                          {formData.shipmentTypeId === "4" && (
                            <>
                              <option value="kg">kg</option>
                              <option value="ton">ton</option>
                            </>
                          )}
                          {/* Show Container option only for Import, Export, and Cross-haul - types 1, 2, 3 */}
                          {(formData.shipmentTypeId === "1" ||
                            formData.shipmentTypeId === "2" ||
                            formData.shipmentTypeId === "3" ||
                            String(formData.shipmentTypeId) === "5") && (
                            <option value="Container">Container</option>
                          )}
                        </select>
                      </div>

                      {/* Rate per unit and weight textboxes */}
                      {(formData.rateWeight === "kg" ||
                        formData.rateWeight === "m³" ||
                        formData.rateWeight === "ton") && (
                        <>
                          <div
                            style={{
                              display: "flex",
                              gap: "15px",
                              width: "100%",
                              alignItems: "center",
                            }}
                          >
                            {/* Unit Rate Field - inline text + input */}
                            <div
                              className="controller-instructions-form-field"
                              style={{
                                flex: 1,
                                minWidth: "150px",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                margin: 0,
                              }}
                            >
                              <span
                                style={{
                                  whiteSpace: "nowrap",
                                  fontSize: "13px",
                                  color: "#333",
                                }}
                              >
                                {`Rate per ${formData.rateWeight}`}
                              </span>
                              <div
                                className="controller-instructions-input-wrapper"
                                ref={fieldRefs.unitRate}
                                style={{ width: "100%" }}
                              >
                                <input
                                  type="text"
                                  className={`controller-instructions-form-input ${
                                    fieldErrors.unitRate
                                      ? "controller-instructions-error-field"
                                      : ""
                                  }`}
                                  name="unitRate"
                                  value={formData.unitRate || ""}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (
                                      value === "" ||
                                      /^[0-9]*\.?[0-9]*$/.test(value)
                                    ) {
                                      handleInputChange(e);
                                    }
                                  }}
                                  disabled={isReadOnly}
                                  style={isReadOnly ? readOnlyStyle : {}}
                                />
                                <ErrorTooltip
                                  message={fieldErrors.unitRate}
                                />
                              </div>
                            </div>

                            {/* Weight Field for non-type-4 weight-based shipments */}
                            {String(formData.shipmentTypeId) !== "4" && (
                              <div
                                className="controller-instructions-form-field"
                                style={{ flex: 1, minWidth: "150px" }}
                              >
                                <label>{`Weight (${formData.rateWeight})`}</label>
                                <div
                                  className="controller-instructions-input-wrapper"
                                  ref={fieldRefs.weight}
                                  style={{ width: "100%" }}
                                >
                                  <input
                                    type="text"
                                    className={`controller-instructions-form-input ${
                                      fieldErrors.weight
                                        ? "controller-instructions-error-field"
                                        : ""
                                    }`}
                                    name="weight"
                                    value={formData.weight || ""}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      if (
                                        value === "" ||
                                        /^[0-9]*\.?[0-9]*$/.test(value)
                                      ) {
                                        handleInputChange(e);
                                      }
                                    }}
                                    disabled={isReadOnly}
                                    style={isReadOnly ? readOnlyStyle : {}}
                                  />
                                  <ErrorTooltip
                                    message={fieldErrors.quantity}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                    {/* Set Rate checkbox and value - positioned below Unit per for shipment type 4 */}
                    {formData.shipmentTypeId === "4" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
                        <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
                          <input
                            type="checkbox"
                            checked={isSetRate}
                            onChange={(e) => {
                              const nextChecked = e.target.checked
                              setIsSetRate(nextChecked)
                            }}
                            disabled={isReadOnly}
                          />
                          Break Bulk Set Rate
                        </label>
                        {isSetRate && (
                          <div className="controller-instructions-input-wrapper" style={{ width: "140px" }}>
                            <input
                              type="text"
                              className="controller-instructions-form-input"
                              value={
                                // Show historical value when status is Completed
                                isReadOnly && historicalSetRate !== null 
                                  ? String(historicalSetRate)
                                  : Number.isFinite(Number(setRateValue)) 
                                    ? String(setRateValue) 
                                    : ""
                              }
                              readOnly
                              disabled
                              style={{
                                ...readOnlyStyle,
                                width: "100%",
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {/* End of main form section */}

                {/* Hazardous / Surcharge checkboxes moved below Rate Type */}
                <div
                  className="controller-instructions-date-time-group"
                >
                  <div
                    className="controller-instructions-shipment-task-row"
                    style={{ order: -1, marginBottom: "8px" }}
                  >
                    <div className="controller-instructions-form-field controller-instructions-small-field">
                      <label>Booking Reference</label>
                      <div
                        className="controller-instructions-input-wrapper"
                        ref={fieldRefs.bookingRef}
                      >
                        <input
                          type="text"
                          className={`controller-instructions-form-input ${
                            fieldErrors.bookingRef
                              ? "controller-instructions-error-field"
                              : ""
                          }`}
                          placeholder="Enter booking ref"
                          name="bookingRef"
                          value={formData.bookingRef}
                          onChange={handleInputChange}
                          disabled={isReadOnly}
                          style={isReadOnly ? readOnlyStyle : {}}
                        />
                        <ErrorTooltip
                          message={fieldErrors.bookingRef}
                        />
                      </div>
                    </div>
                    <div className="controller-instructions-form-field controller-instructions-small-field">
                      <label>Client File Ref</label>
                      <div
                        className="controller-instructions-input-wrapper"
                        ref={fieldRefs.clientFileRef}
                      >
                        <input
                          type="text"
                          className={`controller-instructions-form-input ${
                            fieldErrors.clientFileRef
                              ? "controller-instructions-error-field"
                              : ""
                          }`}
                          placeholder="Enter client file ref"
                          name="clientFileRef"
                          value={formData.clientFileRef}
                          onChange={handleInputChange}
                          disabled={isReadOnly}
                          style={isReadOnly ? readOnlyStyle : {}}
                        />
                        <ErrorTooltip
                          message={fieldErrors.clientFileRef}
                        />
                      </div>
                    </div>
                    {/* Booking / File / VAT inline with task */}
                    <div
                      className="controller-instructions-booking-inline-row"
                      style={{ display: "none" }}
                    >
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
                        <label>Client File Ref</label>
                        <div className="controller-instructions-input-wrapper">
                          <input
                            type="text"
                            className="controller-instructions-form-input"
                            placeholder="Enter client file ref"
                            name="clientFileRef"
                            value={formData.clientFileRef}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* KSM File Reference and Last Free Date row below Booking/Client */}
                  <div
                    className="controller-instructions-shipment-task-row"
                    style={{ marginBottom: "8px" }}
                  >
                    <div className="controller-instructions-form-field controller-instructions-small-field">
                      <label>Ksm File Reference</label>
                      <div
                        className="controller-instructions-input-wrapper"
                        ref={fieldRefs.ksmFileRef}
                      >
                        <input
                          type="text"
                          className={`controller-instructions-form-input ${
                            fieldErrors.ksmFileRef
                              ? "controller-instructions-error-field"
                              : ""
                          }`}
                          placeholder="Input KSM File Reference"
                          name="ksmFileRef"
                          value={formData.ksmFileRef}
                          onChange={handleInputChange}
                          disabled={isReadOnly}
                          style={isReadOnly ? readOnlyStyle : {}}
                        />
                        <ErrorTooltip message={fieldErrors.ksmFileRef} />
                      </div>
                    </div>
                    <div className="controller-instructions-form-field controller-instructions-small-field">
                      <label>Last Free Date</label>
                      <div
                        className="controller-instructions-date-wrapper"
                        ref={fieldRefs.lastFreeDate}
                      >
                        <input
                          type="date"
                          className={`controller-instructions-form-input ${
                            fieldErrors.lastFreeDate
                              ? "controller-instructions-error-field"
                              : ""
                          }`}
                          name="lastFreeDate"
                          value={formData.lastFreeDate}
                          onChange={handleInputChange}
                          min={today}
                          ref={lastFreeDateRef}
                          disabled={isReadOnly}
                          style={isReadOnly ? readOnlyStyle : {}}
                          onKeyDown={(e) => e.preventDefault()} // stops typing
                        />
                        <ErrorTooltip
                          message={fieldErrors.lastFreeDate}
                        />
                      </div>
                    </div>
                  </div>

                  <div
                    className="controller-instructions-shipment-task-row"
                    style={{ marginBottom: "8px" }}
                  >
                    <div
                      className="controller-instructions-form-field controller-instructions-small-field"
                      style={{ maxWidth: "120px" }}
                    >
                      <label>VAT</label>
                      <div className="controller-instructions-input-wrapper">
                        <label
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            cursor: isReadOnly ? "not-allowed" : "pointer",
                          }}
                        >
                          <span style={{ fontSize: "12px" }}>0%</span>
                          <input
                            type="checkbox"
                            disabled={isReadOnly}
                            checked={formData.vat !== 0}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                vat: e.target.checked ? 15 : 0,
                              }))
                            }
                            style={{ display: "none" }}
                          />
                          <span
                            className="vat-toggle-slider"
                            style={{
                              position: "relative",
                              width: "40px",
                              height: "20px",
                              borderRadius: "10px",
                              backgroundColor: formData.vat !== 0 ? "#4a90e2" : "#ccc",
                              transition: "background-color 0.2s ease",
                              display: "inline-block",
                            }}
                          >
                            <span
                              style={{
                                position: "absolute",
                                top: "2px",
                                left: formData.vat !== 0 ? "22px" : "2px",
                                width: "16px",
                                height: "16px",
                                borderRadius: "50%",
                                backgroundColor: "#fff",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                                transition: "left 0.2s ease",
                              }}
                            />
                          </span>
                          <span style={{ fontSize: "12px" }}>15%</span>
                        </label>
                      </div>
                    </div>
                    {(isAddOn ||
                      String(formData.shipmentTypeId) === "1" ||
                      String(formData.shipmentTypeId) === "2") && (
                      <div className="controller-instructions-form-field controller-instructions-small-field">
                        <label>
                          {String(formData.shipmentTypeId) === "1"
                            ? "ETA Date"
                            : "Stack Date"}{" "}
                          {(String(formData.shipmentTypeId) === "1" ||
                            String(formData.shipmentTypeId) === "2") && (
                            <span style={{ color: "red" }}>*</span>
                          )}
                        </label>
                        <div
                          className="controller-instructions-date-wrapper"
                          ref={fieldRefs.stackDate}
                        >
                          <input
                            type="date"
                            className={`controller-instructions-form-input ${
                              fieldErrors.stackDate
                                ? "controller-instructions-error-field"
                                : ""
                            }`}
                            name="stackDate"
                            value={formData.stackDate || ""}
                            onChange={handleInputChange}
                            min={today}
                            ref={etaDateRef}
                            disabled={isReadOnly}
                            style={isReadOnly ? readOnlyStyle : {}}
                            required={
                              String(formData.shipmentTypeId) === "1" ||
                              String(formData.shipmentTypeId) === "2"
                            }
                            onKeyDown={(e) => e.preventDefault()}
                          />
                          <ErrorTooltip
                            message={fieldErrors.stackDate}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  {String(formData.shipmentTypeId) !== "4" && (
                    <div className="controller-instructions-form-field">
                      <label>
                        Vessel Name{" "}
                        {(formData.shipmentTypeId === "1" ||
                          formData.shipmentTypeId === "2") && (
                          <span style={{ color: "red" }}>*</span>
                        )}
                      </label>
                      <div
                        className="controller-instructions-input-wrapper"
                        ref={fieldRefs.vesselName}
                      >
                        <input
                          type="text"
                          className={`controller-instructions-form-input ${
                            fieldErrors.vesselName
                              ? "controller-instructions-error-field"
                              : ""
                          }`}
                          placeholder="Enter vessel name"
                          name="vesselName"
                          value={formData.vesselName || ""}
                          onChange={handleInputChange}
                          disabled={isReadOnly}
                          style={isReadOnly ? readOnlyStyle : {}}
                          required={
                            formData.shipmentTypeId === "1" ||
                            formData.shipmentTypeId === "2"
                          }
                        />
                        <ErrorTooltip
                          message={fieldErrors.vesselName}
                        />
                      </div>
                    </div>
                  )}
                  <div className="controller-instructions-form-field">
                    <label>Description</label>
                    <div
                      className="controller-instructions-input-wrapper"
                      ref={fieldRefs.description}
                    >
                      <input
                        type="text"
                        className={`controller-instructions-form-input ${
                          fieldErrors.description
                            ? "controller-instructions-error-field"
                            : ""
                        }`}
                        placeholder="Enter description"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        disabled={isReadOnly}
                        style={isReadOnly ? readOnlyStyle : {}}
                      />
                      <ErrorTooltip
                        message={fieldErrors.description}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Weight Details Table for shipment type 4 */}
          {String(formData.shipmentTypeId) === "4" && weightRows.length > 0 && (
            <div
              className="controller-instructions-form-section"
              style={{ marginTop: "0", paddingTop: "0" }}
            >
              <div
                className="controller-instructions-form-row"
                style={{ marginTop: "0" }}
              >
                <div
                  className="controller-instructions-form-field"
                  style={{ width: "100%" }}
                >
                  <label>Weight Details</label>
                  <div style={{ width: "100%" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "12px",
                      }}
                    >
                      <thead>
                        <tr>
                          <th style={{ border: "1px solid #dee2e6", padding: "4px" }}>
                            KSM DN Number
                          </th>
                          <th style={{ border: "1px solid #dee2e6", padding: "4px" }}>
                            Ticket Number
                          </th>
                          <th style={{ border: "1px solid #dee2e6", padding: "4px" }}>
                            Receipt Book Number
                          </th>
                          <th style={{ border: "1px solid #dee2e6", padding: "4px" }}>
                            Weight ({formData.rateWeight})
                          </th>
                          <th style={{ border: "1px solid #dee2e6", padding: "4px" }}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {weightRows.map((row) => (
                          <tr key={row.id}>
                            <td style={{ border: "1px solid #dee2e6", padding: "2px 4px" }}>
                              <input
                                type="text"
                                className="controller-instructions-form-input"
                                value={row.ksmDmNo || ""}
                                onChange={(e) =>
                                  updateWeightRow(row.id, "ksmDmNo", e.target.value)
                                }
                                disabled={isReadOnly}
                                style={{ width: "100%", fontSize: "12px", height: "26px" }}
                              />
                            </td>
                            <td style={{ border: "1px solid #dee2e6", padding: "2px 4px" }}>
                              <input
                                type="text"
                                className="controller-instructions-form-input"
                                value={row.ticketNo || ""}
                                onChange={(e) =>
                                  updateWeightRow(row.id, "ticketNo", e.target.value)
                                }
                                disabled={isReadOnly}
                                style={{ width: "100%", fontSize: "12px", height: "26px" }}
                              />
                            </td>
                            <td style={{ border: "1px solid #dee2e6", padding: "2px 4px" }}>
                              <input
                                type="text"
                                className="controller-instructions-form-input"
                                value={row.receiptBookNo || ""}
                                onChange={(e) =>
                                  updateWeightRow(row.id, "receiptBookNo", e.target.value)
                                }
                                disabled={isReadOnly}
                                style={{ width: "100%", fontSize: "12px", height: "26px" }}
                              />
                            </td>
                            <td style={{ border: "1px solid #dee2e6", padding: "2px 4px" }}>
                              <input
                                type="text"
                                className="controller-instructions-form-input"
                                value={row.weight || ""}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (
                                    value === "" ||
                                    /^[0-9]*\.?[0-9]*$/.test(value)
                                  ) {
                                    updateWeightRow(row.id, "weight", value);
                                  }
                                }}
                                disabled={isReadOnly}
                                style={{ width: "100%", fontSize: "12px", height: "26px" }}
                              />
                            </td>
                            <td
                              style={{
                                border: "1px solid #dee2e6",
                                padding: "2px 4px",
                                textAlign: "center",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {!isReadOnly && (
                                <button
                                  type="button"
                                  onClick={() => handleRequestDeleteWeightRow(row)}
                                  style={{
                                    padding: "2px 6px",
                                    fontSize: "11px",
                                    borderRadius: "4px",
                                    border: "1px solid #dc3545",
                                    backgroundColor: "#fff",
                                    color: "#dc3545",
                                    cursor: "pointer",
                                  }}
                                >
                                  Delete
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                        {!isReadOnly && (
                          <tr>
                            <td
                              colSpan={5}
                              style={{ padding: "4px", textAlign: "left" }}
                            >
                              <button
                                type="button"
                                onClick={addWeightRow}
                                style={{
                                  padding: "4px 8px",
                                  fontSize: "12px",
                                  borderRadius: "4px",
                                  border: "1px solid #4a90e2",
                                  backgroundColor: "#4a90e2",
                                  color: "#fff",
                                  cursor: "pointer",
                                }}
                              >
                                Add Row
                              </button>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Container Details Table */}
          {console.log("Debug weight column visibility:", {
            isImport,
            shipmentTypeId: formData.shipmentTypeId,
            shipmentTypeIdType: typeof formData.shipmentTypeId,
            shipmentTypeName: formData.shipmentTypeName,
            stringComparison: {
              isEqual2: String(formData.shipmentTypeId) === "2",
              isEqual3: String(formData.shipmentTypeId) === "3",
              isEqual4: String(formData.shipmentTypeId) === "4",
            },
            shouldShowWeight:
              isImport ||
              String(formData.shipmentTypeId) === "2" ||
              String(formData.shipmentTypeId) === "3",
            weightColumnCondition: Boolean(
              isImport ||
                String(formData.shipmentTypeId) === "2" ||
                String(formData.shipmentTypeId) === "3"
            ),
            containers: containers.map((c) => ({
              id: c.id,
              type: c.containerType,
              weight: c.weight,
            })),
          })}
          {/* Only show container details table when shipment type is NOT cross-haul (break bulk) (type 4) */}
          {containers.length > 0 && formData.shipmentTypeId !== "4" && (
            <div
              className="controller-instructions-form-section"
              style={
                String(formData.shipmentTypeId) === "2"
                  ? { marginTop: "-40px", paddingTop: "0" }
                  : undefined
              }
            >
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
                        <th
                          style={{
                            padding: "12px 8px",
                            textAlign: "left",
                            borderBottom: "2px solid #ddd",
                          }}
                        >
                          Container Type
                        </th>
                        <th
                          style={{
                            padding: "12px 8px",
                            textAlign: "left",
                            borderBottom: "2px solid #ddd",
                          }}
                        >
                          Container Number
                        </th>
                        {/* Add File Reference header for export shipments */}
                        {String(formData.shipmentTypeId) === "2" && (
                          <th
                            style={{
                              padding: "12px 8px",
                              textAlign: "left",
                              borderBottom: "2px solid #ddd",
                            }}
                          >
                            File Reference
                          </th>
                        )}
                        {/* Force string comparison for shipmentTypeId */}
                        {(isImport ||
                          String(formData.shipmentTypeId) === "2" ||
                          String(formData.shipmentTypeId) === "3") && (
                          <th
                            style={{
                              padding: "12px 8px",
                              textAlign: "left",
                              borderBottom: "2px solid #ddd",
                            }}
                          >
                            Weight
                          </th>
                        )}
                        <th
                          style={{
                            padding: "12px 8px",
                            textAlign: "center",
                            borderBottom: "2px solid #ddd",
                          }}
                        >
                          Actions
                        </th>
                        <th
                          style={{
                            padding: "12px 8px",
                            textAlign: "left",
                            borderBottom: "2px solid #ddd",
                          }}
                        >
                          Cargo Description
                        </th>
                        <th
                          style={{
                            padding: "12px 8px",
                            textAlign: "center",
                            borderBottom: "2px solid #ddd",
                          }}
                        >
                          Hazardous
                        </th>
                        <th
                          style={{
                            padding: "12px 8px",
                            textAlign: "center",
                            borderBottom: "2px solid #ddd",
                          }}
                        >
                          Add Surcharges
                        </th>
                        <th
                          style={{
                            padding: "12px 8px",
                            textAlign: "center",
                            borderBottom: "2px solid #ddd",
                          }}
                        >
                          VGM
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
                                  containerFieldErrors[
                                    `container-${container.id}`
                                  ]
                                    ? "controller-instructions-error-field"
                                    : ""
                                }`}
                                value={container.containerNum}
                                onChange={(e) =>
                                  handleContainerChange(
                                    container.id,
                                    "containerNum",
                                    e.target.value
                                  )
                                }
                                placeholder="Up to 20 alphanumeric characters"
                                maxLength={20}
                                disabled={isReadOnly}
                                style={isReadOnly ? readOnlyStyle : {}}
                              />
                              {containerFieldErrors[
                                `container-${container.id}`
                              ] && (
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
                                  {
                                    containerFieldErrors[
                                      `container-${container.id}`
                                    ]
                                  }
                                </div>
                              )}
                            </div>
                          </td>
                          {/* Add File Reference field only for export shipments */}
                          {String(formData.shipmentTypeId) === "2" && (
                            <td>
                              <div className="controller-instructions-input-wrapper">
                                <input
                                  type="text"
                                  className="controller-instructions-form-input"
                                  value={container.fileRef}
                                  onChange={(e) =>
                                    handleContainerChange(
                                      container.id,
                                      "fileRef",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Enter file reference"
                                  maxLength={20}
                                  disabled={isReadOnly}
                                  style={isReadOnly ? readOnlyStyle : {}}
                                />
                              </div>
                            </td>
                          )}
                          {/* Force string comparison for shipmentTypeId */}
                          {(isImport ||
                            String(formData.shipmentTypeId) === "2" ||
                            String(formData.shipmentTypeId) === "3") && (
                            <td>
                              <div className="controller-instructions-input-wrapper">
                                <input
                                  type="text"
                                  className={`controller-instructions-form-input ${
                                    containerFieldErrors[
                                      `weight-${container.id}`
                                    ]
                                      ? "controller-instructions-error-field"
                                      : ""
                                  }`}
                                  value={
                                    container.weight === null ||
                                    container.weight === undefined
                                      ? ""
                                      : typeof container.weight === "number"
                                      ? container.weight.toString()
                                      : container.weight
                                  }
                                  onFocus={() => {
                                    console.log(
                                      `Weight input focus - container ${container.id}:`,
                                      {
                                        weightValue: container.weight,
                                        weightType: typeof container.weight,
                                        displayValue:
                                          container.weight === null
                                            ? ""
                                            : container.weight.toString(),
                                      }
                                    );
                                  }}
                                  onChange={(e) =>
                                    handleContainerChange(
                                      container.id,
                                      "weight",
                                      e.target.value
                                    )
                                  }
                                  placeholder="0.00"
                                  disabled={isReadOnly}
                                  style={isReadOnly ? readOnlyStyle : {}}
                                />
                                {containerFieldErrors[
                                  `weight-${container.id}`
                                ] && (
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
                                    {
                                      containerFieldErrors[
                                        `weight-${container.id}`
                                      ]
                                    }
                                  </div>
                                )}
                              </div>
                            </td>
                          )}
                          <td
                            style={{
                              padding: "8px",
                              borderBottom: "1px solid #eee",
                              textAlign: "center",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {!isReadOnly && (
                              <button
                                type="button"
                                onClick={() => handleRequestDeleteContainer(container)}
                                style={{
                                  padding: "2px 8px",
                                  fontSize: "11px",
                                  borderRadius: "4px",
                                  border: "1px solid #dc3545",
                                  backgroundColor: "#fff",
                                  color: "#dc3545",
                                  cursor: "pointer",
                                }}
                              >
                                Delete
                              </button>
                            )}
                          </td>
                          <td>
                            <div className="controller-instructions-input-wrapper">
                              <input
                                type="text"
                                className="controller-instructions-form-input"
                                value={container.cargoDescription}
                                onChange={(e) =>
                                  handleContainerChange(
                                    container.id,
                                    "cargoDescription",
                                    e.target.value
                                  )
                                }
                                placeholder="Enter cargo description"
                                disabled={isReadOnly}
                                style={isReadOnly ? readOnlyStyle : {}}
                              />
                            </div>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <div className="controller-instructions-checkbox-wrapper">
                              <input
                                type="checkbox"
                                className="controller-instructions-form-checkbox"
                                checked={container.hazardous === true}
                                onChange={(e) =>
                                  handleContainerChange(
                                    container.id,
                                    "hazardous",
                                    e.target.checked
                                  )
                                }
                                disabled={isReadOnly}
                                style={{
                                  transform: "scale(1.2)",
                                  cursor: isReadOnly ? "default" : "pointer"
                                }}
                              />
                            </div>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <div className="controller-instructions-checkbox-wrapper">
                              <input
                                type="checkbox"
                                className="controller-instructions-form-checkbox"
                                checked={container.addSurcharges === true}
                                onChange={(e) =>
                                  handleContainerChange(
                                    container.id,
                                    "addSurcharges",
                                    e.target.checked
                                  )
                                }
                                disabled={isReadOnly}
                                style={{
                                  transform: "scale(1.2)",
                                  cursor: isReadOnly ? "default" : "pointer"
                                }}
                              />
                            </div>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <div className="controller-instructions-checkbox-wrapper">
                              <input
                                type="checkbox"
                                className="controller-instructions-form-checkbox"
                                checked={container.vgm === true}
                                onChange={(e) =>
                                  handleContainerChange(
                                    container.id,
                                    "vgm",
                                    e.target.checked
                                  )
                                }
                                disabled={isReadOnly}
                                style={{
                                  transform: "scale(1.2)",
                                  cursor: isReadOnly ? "default" : "pointer"
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {isContainerLoading && (
                  <div className="controller-instructions-loading-message">
                    Updating containers...
                  </div>
                )}
              </div>
            </div>
          )}
          <ActionButtons
            isReadOnly={isReadOnly}
            status={formData.status}
            isInvoiced={isInvoiced}
            onSave={handleSaveChanges}
            onDelete={handleDeleteInstruction}
            onInvoice={handleCreateInvoice}
          />
        </div>
        {/* Confirmation Modal */}
        <ConfirmationModal
          isOpen={confirmationModal.isOpen}
          title={
            confirmationModal.action === "delete" ? "Delete Instruction" :
            confirmationModal.action === "invoice" ? "Create Invoice" :
            confirmationModal.action === "delete-container" ? "Delete Container" :
            confirmationModal.action === "delete-weight" ? "Delete Weight Row" :
            confirmationModal.action === "unlock-route" ? "Unlock Route" :
            "Confirm"
          }
          message={confirmationModal.message}
          onConfirm={handleConfirmAction}
          onCancel={handleCancelAction}
        />
        {/* Warning Modal (shipment type change) */}
        <ConfirmationModal
          isOpen={warningModal.isOpen}
          title="Warning"
          message={warningModal.message}
          onConfirm={() => {
            warningModal.onConfirm?.();
            setWarningModal((prev) => ({ ...prev, isOpen: false }));
          }}
          onCancel={() => setWarningModal((prev) => ({ ...prev, isOpen: false }))}
          confirmText="Reset Counts & Continue"
          cancelText="Cancel"
          variant="warning"
        />
      </div>
    </div>
    </InstructionLoadingGate>
  );
};

export default FCcontrollerinstructions;
