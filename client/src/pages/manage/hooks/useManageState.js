"use client"

import { useReducer, useCallback } from "react"

// Initial state
const initialState = {
  // UI State
  activeTab: "employees",
  loading: false,
  error: null,

  // Data
  employees: [],
  clients: [],
  trucks: [],
  driverRates: [],
  subcontractors: [],

  // Form States
  showEmployeeForm: false,
  showClientForm: false,
  showTruckForm: false,
  showDriverRateForm: false,
  showSubcontractorForm: false,

  // Edit States
  editingEmployeeId: null,
  editingClientId: null,
  editTruckId: null,
  editingRateId: null,
  subcontractorId: null,
  isEditing: false,
  isEditingRate: false,
  isEditMode: false,

  // Form Data
  newEmployee: {
    name: "",
    surname: "",
    telephonenum: "",
    cellnum: "",
    employeenum: "",
    roleid: "",
    email: "",
    password: "",
    base_salary: "",
    documents: [],
    existingDocuments: [],
    income_tax_rate: "",
    deduction_other_deductions: "",
    deduction_uif: "",
    deduction_bonus: "",
    deduction_savings: "",
    deduction_loan: "",
    deduction_damage: "",
  },

  newClient: {
    client: "",
    representative: "",
    companyaddress: "",
    suburb: "",
    postalcode: "",
    email: "",
    client_reg_num: "",
    cellnum: "",
    vatregno: "",
    city: "",
    streetaddress: "",
    payment_type: "",
  },

  newTruck: {
    truckregnum: "",
    trailersize: "",
    truckpurchasedate: "",
    year: "",
    model: "",
    purchase_price: "",
    current_evaluation: "",
    vin_num: "",
    is_subcontractor: false,
    documents: [],
    existingDocuments: [],
  },

  newDriverRate: {
    startingpoint: "",
    destination: "",
    driver_six_meter_rate: "",
    driver_twelve_meter_rate: "",
    subie_six_meter_rate: "",
    subie_twelve_meter_rate: "",
  },

  newSubcontractor: {
    companyname: "",
    location: "",
    contact_person: "",
    cellnum: "",
    email: "",
    subei_reg_num: "",
    no_of_trucks: 1,
    trucks: [{ reg: "", driver: "" }],
  },

  // Alert
  showAlert: false,
  alertMessage: "",
}

// Reducer
function manageReducer(state, action) {
  switch (action.type) {
    case "SET_ACTIVE_TAB":
      return { ...state, activeTab: action.payload }

    case "SET_LOADING":
      return { ...state, loading: action.payload }

    case "SET_ERROR":
      return { ...state, error: action.payload }

    case "SET_DATA":
      return { ...state, [action.payload.type]: action.payload.data }

    case "SHOW_FORM":
      return { ...state, [action.payload]: true }

    case "HIDE_FORM":
      return {
        ...state,
        [action.payload]: false,
        // Reset editing states when hiding forms
        ...(action.payload === "showEmployeeForm" && { editingEmployeeId: null }),
        ...(action.payload === "showClientForm" && { editingClientId: null, isEditing: false }),
        ...(action.payload === "showTruckForm" && { editTruckId: null }),
        ...(action.payload === "showDriverRateForm" && { editingRateId: null, isEditingRate: false }),
        ...(action.payload === "showSubcontractorForm" && { subcontractorId: null, isEditMode: false }),
      }

    case "SET_EDITING":
      return {
        ...state,
        [`editing${action.payload.type}Id`]: action.payload.id,
        ...(action.payload.type === "Client" && { isEditing: !!action.payload.id }),
        ...(action.payload.type === "Rate" && { isEditingRate: !!action.payload.id }),
        ...(action.payload.type === "Subcontractor" && { isEditMode: !!action.payload.id }),
        ...(action.payload.type === "Truck" && { editTruckId: action.payload.id }), // Add this line
      }

    case "UPDATE_FORM_DATA":
      return {
        ...state,
        [`new${action.payload.type}`]: {
          ...state[`new${action.payload.type}`],
          ...action.payload.data,
        },
      }

    case "RESET_FORM_DATA":
      return {
        ...state,
        [`new${action.payload}`]: initialState[`new${action.payload}`],
      }

    case "SHOW_ALERT":
      return { ...state, showAlert: true, alertMessage: action.payload }

    case "HIDE_ALERT":
      return { ...state, showAlert: false, alertMessage: "" }

    default:
      return state
  }
}

// Custom hook
export function useManageState() {
  const [state, dispatch] = useReducer(manageReducer, initialState)

  const actions = {
    setActiveTab: useCallback((tab) => {
      dispatch({ type: "SET_ACTIVE_TAB", payload: tab })
    }, []),

    setLoading: useCallback((loading) => {
      dispatch({ type: "SET_LOADING", payload: loading })
    }, []),

    setError: useCallback((error) => {
      dispatch({ type: "SET_ERROR", payload: error })
    }, []),

    setData: useCallback((type, data) => {
      dispatch({ type: "SET_DATA", payload: { type, data } })
    }, []),

    showForm: useCallback((formType) => {
      dispatch({ type: "SHOW_FORM", payload: formType })
    }, []),

    hideForm: useCallback((formType) => {
      dispatch({ type: "HIDE_FORM", payload: formType })
    }, []),

    setEditing: useCallback((type, id) => {
      dispatch({ type: "SET_EDITING", payload: { type, id } })
    }, []),

    updateFormData: useCallback((type, data) => {
      dispatch({ type: "UPDATE_FORM_DATA", payload: { type, data } })
    }, []),

    resetFormData: useCallback((type) => {
      dispatch({ type: "RESET_FORM_DATA", payload: type })
    }, []),

    showAlert: useCallback((message) => {
      dispatch({ type: "SHOW_ALERT", payload: message })
    }, []),

    hideAlert: useCallback(() => {
      dispatch({ type: "HIDE_ALERT" })
    }, []),
  }

  return { state, actions }
}
