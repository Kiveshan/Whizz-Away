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
import { ClientInfoSection } from "../../../../components/instructions/ClientInfoSection";
import { ContainerCountsSection } from "../../../../components/instructions/ContainerCountsSection";
import { UnitPerSection } from "../../../../components/instructions/UnitPerSection";
import { BookingDetailsSection } from "../../../../components/instructions/BookingDetailsSection";
import { WeightDetailsTable } from "../../../../components/instructions/WeightDetailsTable";
import { ContainerDetailsTable } from "../../../../components/instructions/ContainerDetailsTable";
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
          <ClientInfoSection
            formData={formData}
            clients={clients}
            fieldErrors={fieldErrors}
            fieldRefs={fieldRefs}
            isReadOnly={isReadOnly}
            clientLocked={true}
            readOnlyStyle={readOnlyStyle}
            nonEditableStyle={nonEditableStyle}
            onClientChange={handleClientChange}
            onChange={handleInputChange}
            showCreationDate={true}
          />
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
                <ContainerCountsSection
                  formData={formData}
                  fieldErrors={fieldErrors}
                  fieldRefs={fieldRefs}
                  isSetRateMode={isSetRateMode}
                  isReadOnly={isReadOnly}
                  readOnlyStyle={readOnlyStyle}
                  onCountChange={handleNumericInputChange}
                  onRateChange={handleRateChange}
                />
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
                  {/* This surcharges section has been moved to be next to the checkbox */}

                  <UnitPerSection
                    formData={formData}
                    fieldErrors={fieldErrors}
                    fieldRefs={fieldRefs}
                    isSetRate={isSetRate}
                    isReadOnly={isReadOnly}
                    isAddOn={isAddOn}
                    historicalSetRate={historicalSetRate}
                    setRateValue={setRateValue}
                    readOnlyStyle={readOnlyStyle}
                    onInputChange={handleInputChange}
                    onSetRateChange={setIsSetRate}
                  />
                </div>
                {/* End of main form section */}

                {/* Hazardous / Surcharge checkboxes moved below Rate Type */}
                <BookingDetailsSection
                  formData={formData}
                  fieldErrors={fieldErrors}
                  fieldRefs={fieldRefs}
                  isReadOnly={isReadOnly}
                  isAddOn={isAddOn}
                  today={today}
                  readOnlyStyle={readOnlyStyle}
                  lastFreeDateRef={lastFreeDateRef}
                  etaDateRef={etaDateRef}
                  onInputChange={handleInputChange}
                  onVatChange={(val) =>
                    setFormData((prev) => ({ ...prev, vat: val }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Weight Details Table for shipment type 4 */}
          {String(formData.shipmentTypeId) === "4" && weightRows.length > 0 && (
            <WeightDetailsTable
              rows={weightRows}
              rateWeight={formData.rateWeight}
              isReadOnly={isReadOnly}
              onUpdateRow={updateWeightRow}
              onDeleteRow={handleRequestDeleteWeightRow}
              onAddRow={addWeightRow}
            />
          )}

          {/* Container Details Table */}
          {/* Only show when shipment type is NOT cross-haul (break bulk) (type 4) */}
          {containers.length > 0 && formData.shipmentTypeId !== "4" && (
            <ContainerDetailsTable
              containers={containers}
              containerFieldErrors={containerFieldErrors}
              shipmentTypeId={formData.shipmentTypeId}
              isImport={isImport}
              isReadOnly={isReadOnly}
              readOnlyStyle={readOnlyStyle}
              isLoading={isContainerLoading}
              successMessage={containerSuccessMessage || rateUpdateMessage}
              sectionStyle={
                String(formData.shipmentTypeId) === "2"
                  ? { marginTop: "-40px", paddingTop: "0" }
                  : undefined
              }
              onContainerChange={handleContainerChange}
              onDeleteContainer={handleRequestDeleteContainer}
            />
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
