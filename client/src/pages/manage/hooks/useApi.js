"use client"
import { useCallback } from "react"
import api from "../../../api.js"

export function useApi(state, actions) {
  const fetchPaginatedData = useCallback(
    async (type, page = 1, itemsPerPage = 10, filters = {}) => {
      actions.setLoading(true)
      actions.setError(null)
      try {
        const endpoints = {
          employees: "/api/employees",
          clients: "/api/m5Clients",
          trucks: "/api/trucks",
          trailers: "/api/trailers",
          driverRates: "/api/driver-rates",
          subcontractors: "/api/subcontractors",
          clientRates: "/api/client-rates",
          suppliers: "/api/suppliers",
          expenseTypes: "/api/expense-types",
        }

        const endpoint = endpoints[type]
        if (!endpoint) {
          throw new Error(`Invalid data type: ${type}`)
        }

        // Build query parameters
        const params = new URLSearchParams({
          page: page.toString(),
          limit: itemsPerPage.toString(),
          ...filters,
        })

        // For suppliers, don't add status filter to get ALL suppliers
        if (type === "suppliers") {
          params.delete("status")
        }

        const response = await api.get(`${endpoint}?${params}`)

        // Handle different response structures
        let responseData = response.data
        if (type === "suppliers") {
          if (responseData.suppliers) {
            responseData.items = Array.isArray(responseData.suppliers) ? responseData.suppliers : []
          } else if (Array.isArray(responseData)) {
            responseData = { items: responseData, totalItems: responseData.length }
          } else if (!responseData.items) {
            responseData.items = []
          }
        } else if (type === "expenseTypes") {
          if (responseData.expenseTypes) {
            responseData.items = Array.isArray(responseData.expenseTypes) ? responseData.expenseTypes : []
          } else if (Array.isArray(responseData)) {
            responseData = { items: responseData, totalItems: responseData.length }
          } else if (!responseData.items) {
            responseData.items = []
          }
        }

        // Update data and pagination
        actions.setData(type, responseData.items || responseData || [])
        actions.setPagination(type, {
          currentPage: responseData.currentPage || page,
          totalPages: responseData.totalPages || 1,
          totalItems: responseData.totalItems || responseData.items?.length || responseData.length || 0,
          itemsPerPage: responseData.itemsPerPage || itemsPerPage,
        })
      } catch (err) {
        console.error(`Error fetching ${type}:`, err)
        let errorMessage = `Failed to load ${type}. Please try again.`
        if (err.response) {
          const { status } = err.response
          if (status === 401 || status === 403) {
            return
          }
          errorMessage = err.response.data?.error || errorMessage
        }
        actions.setError(errorMessage)
        actions.setData(type, [])
      } finally {
        actions.setLoading(false)
      }
    },
    [actions],
  )

  // Add a separate function to fetch ALL expense types for dropdowns
  const fetchAllExpenseTypes = useCallback(async () => {
    try {
      console.log("Fetching ALL expense types for dropdown...")
      const response = await api.get("/api/expense-types/simple")
      console.log("Fetched all expense types:", response.data)
      // Update the expense types in state - use allExpenseTypes key
      actions.setData("allExpenseTypes", response.data || [])
      return response.data || []
    } catch (error) {
      console.error("Error fetching all expense types:", error)
      // Try fallback to regular endpoint
      try {
        console.log("Trying fallback endpoint...")
        const fallbackResponse = await api.get("/api/expense-types?limit=1000")
        const fallbackData = fallbackResponse.data.expenseTypes || fallbackResponse.data || []
        console.log("Fallback expense types:", fallbackData)
        actions.setData("allExpenseTypes", fallbackData)
        return fallbackData
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError)
        actions.setData("allExpenseTypes", [])
        return []
      }
    }
  }, [actions])

  const fetchAllData = useCallback(async () => {
    const { pagination, filters } = state
    await Promise.all([
      fetchPaginatedData(
        "employees",
        pagination.employees.currentPage,
        pagination.employees.itemsPerPage,
        filters.employees,
      ),
      fetchPaginatedData("clients", pagination.clients.currentPage, pagination.clients.itemsPerPage, filters.clients),
      fetchPaginatedData("trucks", pagination.trucks.currentPage, pagination.trucks.itemsPerPage, filters.trucks),
      fetchPaginatedData(
        "trailers",
        pagination.trailers.currentPage,
        pagination.trailers.itemsPerPage,
        filters.trailers,
      ),
      fetchPaginatedData(
        "driverRates",
        pagination.driverRates.currentPage,
        pagination.driverRates.itemsPerPage,
        filters.driverRates,
      ),
      fetchPaginatedData(
        "subcontractors",
        pagination.subcontractors.currentPage,
        pagination.subcontractors.itemsPerPage,
        filters.subcontractors,
      ),
      fetchPaginatedData(
        "clientRates",
        pagination.clientRates.currentPage,
        pagination.clientRates.itemsPerPage,
        filters.clientRates,
      ),
      fetchPaginatedData(
        "suppliers",
        pagination.suppliers.currentPage,
        pagination.suppliers.itemsPerPage,
        filters.suppliers,
      ),
      fetchPaginatedData(
        "expenseTypes",
        pagination.expenseTypes.currentPage,
        pagination.expenseTypes.itemsPerPage,
        filters.expenseTypes,
      ),
      // Also fetch all expense types for dropdowns
      fetchAllExpenseTypes(),
    ])
  }, [state, fetchPaginatedData, fetchAllExpenseTypes])

  const changePage = useCallback(
    async (type, page) => {
      const { pagination, filters } = state
      const currentPagination = pagination[type]
      if (page >= 1 && page <= currentPagination.totalPages) {
        await fetchPaginatedData(type, page, currentPagination.itemsPerPage, filters[type])
      }
    },
    [state, fetchPaginatedData],
  )

  const changeItemsPerPage = useCallback(
    async (type, itemsPerPage) => {
      const { filters } = state
      actions.resetPagination(type)
      await fetchPaginatedData(type, 1, itemsPerPage, filters[type])
    },
    [state, actions, fetchPaginatedData],
  )

  const applyFilters = useCallback(
    async (type) => {
      const { filters } = state
      actions.resetPagination(type)
      await fetchPaginatedData(type, 1, state.pagination[type].itemsPerPage, filters[type])
    },
    [state, actions, fetchPaginatedData],
  )

  const saveEmployee = useCallback(
    async (employeeData, emailRef) => {
      actions.setLoading(true)
      emailRef.current?.setCustomValidity("")
      try {
        // Check duplicate email (only on create, not edit)
        if (!state.editingEmployeeId) {
          const { data } = await api.get(
            `/api/employees/check-email-existence?email=${encodeURIComponent(employeeData.email)}`,
          )
          if (data.exists) {
            emailRef.current?.setCustomValidity("Email already exists. Please use a different one.")
            emailRef.current?.reportValidity()
            actions.setLoading(false)
            return false
          }
        }

        // Build FormData
        const formData = new FormData()
        // Append all scalar fields
        Object.keys(employeeData).forEach((field) => {
          if (field === "password" && state.editingEmployeeId && !employeeData.password) return
          if (field !== "documents" && employeeData[field] !== undefined) {
            formData.append(field, employeeData[field] ?? "")
          }
        })

        // Append documents
        if (employeeData.documents) {
          employeeData.documents.forEach((file) => {
            formData.append("documents", file)
          })
        }

        const url = state.editingEmployeeId ? `/api/employees/${state.editingEmployeeId}` : "/api/employees"
        const method = state.editingEmployeeId ? "put" : "post"
        console.log(`Making ${method.toUpperCase()} request to: ${url}`)

        const response = await api[method](url, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        console.log("API response:", response.data)

        // Refresh current page
        await fetchPaginatedData(
          "employees",
          state.pagination.employees.currentPage,
          state.pagination.employees.itemsPerPage,
          state.filters.employees,
        )

        // Reset form
        actions.resetFormData("Employee")
        actions.setEditing("Employee", null)
        actions.hideForm("showEmployeeForm")
        actions.showAlert(state.editingEmployeeId ? "Employee updated!" : "Employee added!")
        return true
      } catch (err) {
        console.error("Error saving employee:", err)
        actions.showAlert(`Error: ${err.response?.data?.error || err.message}`)
        return false
      } finally {
        actions.setLoading(false)
      }
    },
    [state, actions, fetchPaginatedData],
  )

  const saveClient = useCallback(
    async (clientData, emailRef) => {
      actions.setLoading(true)
      try {
        if (!state.isEditing) {
          const { data } = await api.get(
            `/api/m5Clients/check-email-existence?email=${encodeURIComponent(clientData.email)}`,
          )
          if (data.exists) {
            emailRef.current?.setCustomValidity("Email already exists. Please use a different one.")
            emailRef.current?.reportValidity()
            actions.setLoading(false)
            return false
          }
        }

        // Prepare client data with proper field mapping and type conversion
        const preparedClientData = {
          client: clientData.client || "",
          representative: clientData.representative || "",
          companyaddress: clientData.companyaddress || "",
          suburb: clientData.suburb || "",
          postalcode: clientData.postalcode || "",
          email: clientData.email || "",
          client_reg_num: clientData.client_reg_num || "",
          cellnum: clientData.cellnum || "",
          vatregno: clientData.vatregno || "",
          city: clientData.city || "",
          streetaddress: clientData.streetaddress || "",
          payment_type: clientData.payment_type || "",
          starting_point: clientData.starting_point || null,
          destination: clientData.destination || null,
          driver_six_meter_rate:
            clientData.driver_six_meter_rate === "" || clientData.driver_six_meter_rate === undefined
              ? null
              : Number.parseFloat(clientData.driver_six_meter_rate),
          driver_twelve_meter_rate:
            clientData.driver_twelve_meter_rate === "" || clientData.driver_twelve_meter_rate === undefined
              ? null
              : Number.parseFloat(clientData.driver_twelve_meter_rate),
        }

        if (state.isEditing) {
          await api.put(`/api/m5Clients/${state.editingClientId}`, preparedClientData)
        } else {
          await api.post("/api/m5Clients", preparedClientData)
        }

        // Refresh current page
        await fetchPaginatedData(
          "clients",
          state.pagination.clients.currentPage,
          state.pagination.clients.itemsPerPage,
          state.filters.clients,
        )

        actions.resetFormData("Client")
        actions.setEditing("Client", null)
        actions.hideForm("showClientForm")
        actions.showAlert(state.isEditing ? "Client updated!" : "Client added!")
        return true
      } catch (err) {
        console.error("Error saving client:", err)
        actions.showAlert(`Error saving client: ${err.response?.data?.error || err.message}`)
        return false
      } finally {
        actions.setLoading(false)
      }
    },
    [state, actions, fetchPaginatedData],
  )

  const saveTruck = useCallback(
    async (truckData) => {
      actions.setLoading(true)
      try {
        const formData = new FormData()
        // Append all scalar fields including git
        Object.keys(truckData).forEach((key) => {
          if (key !== "documents" && truckData[key] !== undefined) {
            formData.append(key, truckData[key])
          }
        })

        // Append documents
        if (truckData.documents && truckData.documents.length) {
          truckData.documents.forEach((file) => {
            formData.append("documents", file)
          })
        }

        const url = state.editTruckId ? `/api/trucks/${state.editTruckId}` : "/api/trucks"
        const method = state.editTruckId ? "put" : "post"
        console.log(`Making ${method.toUpperCase()} request to: ${url}`)

        const response = await api[method](url, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        console.log("API response:", response.data)

        // Refresh current page
        await fetchPaginatedData(
          "trucks",
          state.pagination.trucks.currentPage,
          state.pagination.trucks.itemsPerPage,
          state.filters.trucks,
        )

        actions.resetFormData("Truck")
        actions.setEditing("Truck", null)
        actions.hideForm("showTruckForm")
        actions.showAlert(state.editTruckId ? "Truck updated!" : "Truck added!")
        return true
      } catch (err) {
        console.error("Error saving truck:", err)
        actions.showAlert(`Error: ${err.response?.data?.error || err.message}`)
        return false
      } finally {
        actions.setLoading(false)
      }
    },
    [state, actions, fetchPaginatedData],
  )

  const saveTrailer = useCallback(
    async (trailerData) => {
      actions.setLoading(true)
      try {
        const formData = new FormData()
        // Append all scalar fields
        Object.keys(trailerData).forEach((key) => {
          if (key !== "documents" && trailerData[key] !== undefined) {
            formData.append(key, trailerData[key])
          }
        })

        // Append documents
        if (trailerData.documents && trailerData.documents.length) {
          trailerData.documents.forEach((file) => {
            formData.append("documents", file)
          })
        }

        const url = state.editTrailerId ? `/api/trailers/${state.editTrailerId}` : "/api/trailers"
        const method = state.editTrailerId ? "put" : "post"
        console.log(`Making ${method.toUpperCase()} request to: ${url}`)

        const response = await api[method](url, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        console.log("API response:", response.data)

        // Refresh current page
        await fetchPaginatedData(
          "trailers",
          state.pagination.trailers.currentPage,
          state.pagination.trailers.itemsPerPage,
          state.filters.trailers,
        )

        actions.resetFormData("Trailer")
        actions.setEditing("Trailer", null)
        actions.hideForm("showTrailerForm")
        actions.showAlert(state.editTrailerId ? "Trailer updated!" : "Trailer added!")
        return true
      } catch (err) {
        console.error("Error saving trailer:", err)
        actions.showAlert(`Error: ${err.response?.data?.error || err.message}`)
        return false
      } finally {
        actions.setLoading(false)
      }
    },
    [state, actions, fetchPaginatedData],
  )

  const saveDriverRate = useCallback(
    async (rateData) => {
      actions.setLoading(true)
      try {
        const cleanedDriverRate = {
          startingpoint: rateData.startingpoint,
          destination: rateData.destination,
          driver_six_meter_rate: rateData.driver_six_meter_rate === "" ? null : Number(rateData.driver_six_meter_rate),
          driver_twelve_meter_rate:
            rateData.driver_twelve_meter_rate === "" ? null : Number(rateData.driver_twelve_meter_rate),
          subie_six_meter_rate: rateData.subie_six_meter_rate === "" ? null : Number(rateData.subie_six_meter_rate),
          subie_twelve_meter_rate:
            rateData.subie_twelve_meter_rate === "" ? null : Number(rateData.subie_twelve_meter_rate),
        }

        const url = state.editingRateId ? `/api/driver-rates/${state.editingRateId}` : "/api/driver-rates"
        const method = state.editingRateId ? "put" : "post"
        console.log(`Making ${method.toUpperCase()} request to: ${url}`)

        const response = await api[method](url, cleanedDriverRate)
        console.log("API response:", response.data)

        // Refresh current page
        await fetchPaginatedData(
          "driverRates",
          state.pagination.driverRates.currentPage,
          state.pagination.driverRates.itemsPerPage,
          state.filters.driverRates,
        )

        actions.resetFormData("DriverRate")
        actions.setEditing("Rate", null)
        actions.hideForm("showDriverRateForm")
        actions.showAlert("Driver rate saved!")
        return true
      } catch (err) {
        console.error("Error saving driver rate:", err)
        actions.showAlert(`Error saving driver rate: ${err.response?.data?.error || err.message}`)
        return false
      } finally {
        actions.setLoading(false)
      }
    },
    [state, actions, fetchPaginatedData],
  )

  const saveSubcontractor = useCallback(
    async (subcontractorData) => {
      actions.setLoading(true)
      try {
        console.log("Raw subcontractor data:", subcontractorData)
        console.log("Current editing state:", {
          isEditMode: state.isEditMode,
          subcontractorId: state.subcontractorId,
        })

        // Validate required fields
        if (
          !subcontractorData.companyname ||
          !subcontractorData.location ||
          !subcontractorData.contact_person ||
          !subcontractorData.cellnum ||
          !subcontractorData.email ||
          !subcontractorData.subei_reg_num
        ) {
          actions.showAlert("Please fill in all required company information fields.")
          return false
        }

        // Validate drivers array - at least one driver is required
        const validDrivers = (subcontractorData.drivers || []).filter((driver) => driver.name && driver.name.trim())
        if (validDrivers.length === 0) {
          actions.showAlert("Please provide at least one driver name.")
          return false
        }

        // Trucks are optional, but if provided, validate them
        const validTrucks = (subcontractorData.trucks || []).filter(
          (truck) => truck.truckregnum && truck.truckregnum.trim(),
        )

        const payload = {
          companyname: subcontractorData.companyname,
          location: subcontractorData.location,
          contact_person: subcontractorData.contact_person,
          cellnum: subcontractorData.cellnum,
          email: subcontractorData.email,
          subei_reg_num: subcontractorData.subei_reg_num,
          drivers: validDrivers,
          trucks: validTrucks,
        }

        console.log("Sending subcontractor payload:", payload)

        const url = state.subcontractorId ? `/api/subcontractors/${state.subcontractorId}` : "/api/subcontractors"
        const method = state.subcontractorId ? "put" : "post"
        console.log(`Making ${method.toUpperCase()} request to: ${url}`)

        const response = await api[method](url, payload)
        console.log("API response:", response.data)

        // Refresh current page
        await fetchPaginatedData(
          "subcontractors",
          state.pagination.subcontractors.currentPage,
          state.pagination.subcontractors.itemsPerPage,
          state.filters.subcontractors,
        )

        actions.resetFormData("Subcontractor")
        actions.setEditing("Subcontractor", null)
        actions.hideForm("showSubcontractorForm")
        actions.showAlert(state.subcontractorId ? "Subcontractor updated!" : "Subcontractor added!")
        return true
      } catch (err) {
        console.error("Error saving subcontractor:", err)
        console.error("Error response:", err.response?.data)
        actions.showAlert(`Error: ${err.response?.data?.error || err.message}`)
        return false
      } finally {
        actions.setLoading(false)
      }
    },
    [state, actions, fetchPaginatedData],
  )

  const saveClientRates = useCallback(
    async (ratesData) => {
      actions.setLoading(true)
      try {
        const clientId = state.newClientRate.clientId
        console.log("Saving client rates:", { clientId, ratesData })

        // Validate that we have a client ID
        if (!clientId) {
          actions.showAlert("Client ID is missing.")
          return false
        }

        // Validate that we have at least one rate
        if (!ratesData || ratesData.length === 0) {
          actions.showAlert("Please add at least one rate.")
          return false
        }

        // Validate each rate
        const validRates = ratesData.filter((rate) => {
          return rate.starting_point && rate.destination && (rate["6m_rate"] || rate["12m_rate"])
        })

        if (validRates.length === 0) {
          actions.showAlert(
            "Please provide valid starting point, destination, and at least one rate (6m or 12m) for each entry.",
          )
          return false
        }

        const payload = {
          rates: validRates,
        }

        const url = `/api/client-rates/${clientId}`
        const method = "post"
        console.log(`Making ${method.toUpperCase()} request to: ${url}`)

        const response = await api[method](url, payload)
        console.log("API response:", response.data)

        // Refresh current page
        await fetchPaginatedData(
          "clientRates",
          state.pagination.clientRates.currentPage,
          state.pagination.clientRates.itemsPerPage,
          state.filters.clientRates,
        )

        actions.resetFormData("ClientRate")
        actions.setEditing("ClientRate", null)
        actions.hideForm("showClientRateForm")
        actions.showAlert("Client rates saved successfully!")
        return true
      } catch (err) {
        console.error("Error saving client rates:", err)
        actions.showAlert(`Error saving client rates: ${err.response?.data?.error || err.message}`)
        return false
      } finally {
        actions.setLoading(false)
      }
    },
    [state, actions, fetchPaginatedData],
  )

  const saveSupplier = useCallback(
    async (supplierData) => {
      actions.setLoading(true)
      console.log("saveSupplier called with data:", supplierData)
      console.log("Is editing:", !!state.editingSupplierId)
      try {
        // Prepare supplier data with proper field mapping
        const preparedSupplierData = {
          supplier: supplierData.supplier || "",
          representative: supplierData.representative || "",
          address: supplierData.address || "",
          suburb: supplierData.suburb || "",
          postalcode: supplierData.postalcode || "",
          email: supplierData.email || "",
          cellnum: supplierData.cellnum || "",
          vatregno: supplierData.vatregno || "",
          city: supplierData.city || "",
          streetaddress: supplierData.streetaddress || "",
          payment_type: supplierData.payment_type || "",
          expenseTypes: supplierData.expenseTypes || [],
        }

        console.log("Prepared supplier data:", preparedSupplierData)

        const url = state.editingSupplierId ? `/api/suppliers/${state.editingSupplierId}` : "/api/suppliers"
        const method = state.editingSupplierId ? "put" : "post"
        console.log(`Making ${method.toUpperCase()} request to: ${url}`)

        const response = await api[method](url, preparedSupplierData)
        console.log("API response:", response.data)

        // Refresh current page
        await fetchPaginatedData(
          "suppliers",
          state.pagination.suppliers.currentPage,
          state.pagination.suppliers.itemsPerPage,
          state.filters.suppliers,
        )

        actions.resetFormData("Supplier")
        actions.setEditing("Supplier", null)
        actions.hideForm("showSupplierForm")
        actions.showAlert(state.editingSupplierId ? "Supplier updated!" : "Supplier added!")
        return true
      } catch (err) {
        console.error("Error saving supplier:", err)
        console.error("Error response:", err.response?.data)
        actions.showAlert(`Error saving supplier: ${err.response?.data?.error || err.message}`)
        return false
      } finally {
        actions.setLoading(false)
      }
    },
    [state, actions, fetchPaginatedData],
  )

  const saveExpenseType = useCallback(
    async (expenseTypeData) => {
      actions.setLoading(true)
      console.log("saveExpenseType called with data:", expenseTypeData)
      console.log("Is editing:", !!state.editingExpenseTypeId)
      try {
        const preparedExpenseTypeData = {
          expense: expenseTypeData.expense || "",
        }

        console.log("Prepared expense type data:", preparedExpenseTypeData)

        const url = state.editingExpenseTypeId
          ? `/api/expense-types/${state.editingExpenseTypeId}`
          : "/api/expense-types"
        const method = state.editingExpenseTypeId ? "put" : "post"
        console.log(`Making ${method.toUpperCase()} request to: ${url}`)

        const response = await api[method](url, preparedExpenseTypeData)
        console.log("API response:", response.data)

        // Refresh current page
        await fetchPaginatedData(
          "expenseTypes",
          state.pagination.expenseTypes.currentPage,
          state.pagination.expenseTypes.itemsPerPage,
          state.filters.expenseTypes,
        )

        // Also refresh all expense types for dropdowns
        await fetchAllExpenseTypes()

        actions.resetFormData("ExpenseType")
        actions.setEditing("ExpenseType", null)
        actions.hideForm("showExpenseTypeForm")
        actions.showAlert(state.editingExpenseTypeId ? "Expense type updated!" : "Expense type added!")
        return true
      } catch (err) {
        console.error("Error saving expense type:", err)
        console.error("Error response:", err.response?.data)
        actions.showAlert(`Error saving expense type: ${err.response?.data?.error || err.message}`)
        return false
      } finally {
        actions.setLoading(false)
      }
    },
    [state, actions, fetchPaginatedData, fetchAllExpenseTypes],
  )

  const toggleEmployeeStatus = useCallback(
    async (id, currentStatus) => {
      actions.setLoading(true)
      try {
        const newStatus = !currentStatus
        await api.put(`/api/employees/${id}/toggle-status`, { status: newStatus })

        // Refresh current page
        await fetchPaginatedData(
          "employees",
          state.pagination.employees.currentPage,
          state.pagination.employees.itemsPerPage,
          state.filters.employees,
        )

        actions.showAlert(`Employee ${newStatus ? "enabled" : "disabled"}!`)
      } catch (err) {
        console.error(`Error toggling employee ${id}:`, err)
        actions.showAlert(
          `Error ${currentStatus ? "disabling" : "enabling"} employee: ${err.response?.data?.error || err.message}`,
        )
      } finally {
        actions.setLoading(false)
      }
    },
    [state, actions, fetchPaginatedData],
  )

  const toggleClientStatus = useCallback(
    async (id, currentStatus) => {
      actions.setLoading(true)
      try {
        const newStatus = !currentStatus
        await api.put(`/api/clients/${id}/toggle-status`, { status: newStatus })

        // Refresh current page
        await fetchPaginatedData(
          "clients",
          state.pagination.clients.currentPage,
          state.pagination.clients.itemsPerPage,
          state.filters.clients,
        )

        actions.showAlert(`Client ${newStatus ? "enabled" : "disabled"}!`)
      } catch (err) {
        console.error(`Error toggling client ${id}:`, err)
        actions.showAlert(
          `Error ${currentStatus ? "disabling" : "enabling"} client: ${err.response?.data?.error || err.message}`,
        )
      } finally {
        actions.setLoading(false)
      }
    },
    [state, actions, fetchPaginatedData],
  )

  const toggleSubcontractorStatus = useCallback(
    async (id, currentStatus) => {
      actions.setLoading(true)
      try {
        const newStatus = !currentStatus
        await api.put(`/api/subcontractors/${id}/toggle-status`, { status: newStatus })

        // Refresh current page
        await fetchPaginatedData(
          "subcontractors",
          state.pagination.subcontractors.currentPage,
          state.pagination.subcontractors.itemsPerPage,
          state.filters.subcontractors,
        )

        actions.showAlert(`Subcontractor ${newStatus ? "enabled" : "disabled"}!`)
      } catch (err) {
        console.error(`Error toggling subcontractor ${id}:`, err)
        actions.showAlert(
          `Error ${currentStatus ? "disabling" : "enabling"} subcontractor: ${err.response?.data?.error || err.message}`,
        )
      } finally {
        actions.setLoading(false)
      }
    },
    [state, actions, fetchPaginatedData],
  )

  const toggleSupplierStatus = useCallback(
    async (id) => {
      actions.setLoading(true)
      try {
        // Validate ID
        const supplierId = Number.parseInt(id)
        if (isNaN(supplierId) || supplierId <= 0) {
          throw new Error("Invalid supplier ID")
        }

        console.log(`Sending PUT request to toggle supplier ${supplierId}`)
        await api.put(`/api/suppliers/${supplierId}/toggle-status`)

        // Refresh current page
        await fetchPaginatedData(
          "suppliers",
          state.pagination.suppliers.currentPage,
          state.pagination.suppliers.itemsPerPage,
          state.filters.suppliers,
        )

        actions.showAlert(`Supplier status toggled successfully!`)
      } catch (err) {
        console.error(`Error toggling supplier ${id}:`, {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
          code: err.code,
        })
        actions.showAlert(`Error toggling supplier status: ${err.response?.data?.error || err.message}`)
      } finally {
        actions.setLoading(false)
      }
    },
    [state, actions, fetchPaginatedData],
  )

const toggleTruckStatus = useCallback(
  async (id, currentStatus) => {
    actions.setLoading(true)
    try {
      const newStatus = !currentStatus
      console.log(`Toggling truck ${id} status from ${currentStatus} to ${newStatus}`)

      // Use the correct endpoint: /api/trucks/:id/status
      await api.put(`/api/trucks/${id}/status`, { status: newStatus })

      // Refresh current page
      await fetchPaginatedData(
        "trucks",
        state.pagination.trucks.currentPage,
        state.pagination.trucks.itemsPerPage,
        state.filters.trucks,
      )

      actions.showAlert(`Truck ${newStatus ? "enabled" : "disabled"}!`)
    } catch (err) {
      console.error(`Error toggling truck ${id}:`, err)
      actions.showAlert(
        `Error ${currentStatus ? "disabling" : "enabling"} truck: ${err.response?.data?.error || err.message}`,
      )
    } finally {
      actions.setLoading(false)
    }
  },
  [state, actions, fetchPaginatedData],
)

const toggleTrailerStatus = useCallback(
  async (id, currentStatus) => {
    actions.setLoading(true)
    try {
      const newStatus = !currentStatus
      await api.put(`/api/trailers/${id}/toggle-status`, { status: newStatus })

      // Refresh current page
      await fetchPaginatedData(
        "trailers",
        state.pagination.trailers.currentPage,
        state.pagination.trailers.itemsPerPage,
        state.filters.trailers,
      )

      actions.showAlert(`Trailer ${newStatus ? "enabled" : "disabled"}!`)
    } catch (err) {
      console.error(`Error toggling trailer ${id}:`, err)
      actions.showAlert(
        `Error ${currentStatus ? "disabling" : "enabling"} trailer: ${err.response?.data?.error || err.message}`,
      )
    } finally {
      actions.setLoading(false)
    }
  },
  [state, actions, fetchPaginatedData],
)
  

  const deleteItem = useCallback(
    async (type, id) => {
      actions.setLoading(true)
      try {
        let endpoint
        switch (type) {
          case "client":
            endpoint = `/api/m5Clients/${id}`
            break
          case "truck":
            endpoint = `/api/trucks/${id}`
            break
          case "trailer":
            endpoint = `/api/trailers/${id}`
            break
          case "rate":
            endpoint = `/api/driver-rates/${id}`
            break
          case "supplier":
            endpoint = `/api/suppliers/${id}`
            break
          case "expenseType":
            endpoint = `/api/expense-types/${id}`
            break
          default:
            throw new Error("Invalid type")
        }

        await api.delete(endpoint)

        // Refresh current page
        const dataType = type === "rate" ? "driverRates" : type === "expenseType" ? "expenseTypes" : `${type}s`
        await fetchPaginatedData(
          dataType,
          state.pagination[dataType].currentPage,
          state.pagination[dataType].itemsPerPage,
          state.filters[dataType],
        )

        // If deleting expense type, also refresh all expense types for dropdowns
        if (type === "expenseType") {
          await fetchAllExpenseTypes()
        }

        actions.showAlert(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted!`)
      } catch (err) {
        console.error(`Error deleting ${type} ${id}:`, err)
        actions.showAlert(`Error deleting ${type}: ${err.response?.data?.error || err.message}`)
      } finally {
        actions.setLoading(false)
      }
    },
    [state, actions, fetchPaginatedData, fetchAllExpenseTypes],
  )

  // NEW: Delete individual subcontractor driver
  const deleteSubcontractorDriver = useCallback(
    async (driverId) => {
      if (!window.confirm("Are you sure you want to delete this driver?")) {
        return false
      }

      actions.setLoading(true)
      try {
        await api.delete(`/api/subcontractors/drivers/${driverId}`)

        // Refresh current page
        await fetchPaginatedData(
          "subcontractors",
          state.pagination.subcontractors.currentPage,
          state.pagination.subcontractors.itemsPerPage,
          state.filters.subcontractors,
        )

        actions.showAlert("Driver deleted successfully!")
        return true
      } catch (err) {
        console.error("Error deleting driver:", err)
        actions.showAlert(`Error deleting driver: ${err.response?.data?.error || err.message}`)
        return false
      } finally {
        actions.setLoading(false)
      }
    },
    [state, actions, fetchPaginatedData],
  )

  // NEW: Delete individual subcontractor truck
  const deleteSubcontractorTruck = useCallback(
    async (truckId) => {
      if (!window.confirm("Are you sure you want to delete this truck?")) {
        return false
      }

      actions.setLoading(true)
      try {
        await api.delete(`/api/subcontractors/trucks/${truckId}`)

        // Refresh current page
        await fetchPaginatedData(
          "subcontractors",
          state.pagination.subcontractors.currentPage,
          state.pagination.subcontractors.itemsPerPage,
          state.filters.subcontractors,
        )

        actions.showAlert("Truck deleted successfully!")
        return true
      } catch (err) {
        console.error("Error deleting truck:", err)
        actions.showAlert(`Error deleting truck: ${err.response?.data?.error || err.message}`)
        return false
      } finally {
        actions.setLoading(false)
      }
    },
    [state, actions, fetchPaginatedData],
  )

  const deleteClientRate = useCallback(
    async (rateId) => {
      if (!window.confirm("Are you sure you want to delete this rate?")) {
        return false
      }

      actions.setLoading(true)
      try {
        await api.delete(`/api/client-rates/${rateId}`)

        // Refresh current page
        await fetchPaginatedData(
          "clientRates",
          state.pagination.clientRates.currentPage,
          state.pagination.clientRates.itemsPerPage,
          state.filters.clientRates,
        )

        actions.showAlert("Client rate deleted successfully!")
        return true
      } catch (err) {
        console.error("Error deleting client rate:", err)
        actions.showAlert(`Error deleting client rate: ${err.response?.data?.error || err.message}`)
        return false
      } finally {
        actions.setLoading(false)
      }
    },
    [state, actions, fetchPaginatedData],
  )

  const loadItemForEdit = useCallback(
    async (type, id) => {
      try {
        let endpoint
        let formType

        // Validate ID before making the request
        const numericId = Number.parseInt(id)
        if (isNaN(numericId) || numericId <= 0) {
          console.error(`Invalid ID for ${type}:`, id)
          actions.showAlert(`Invalid ${type} ID provided.`)
          return
        }

        switch (type) {
          case "employee":
            endpoint = `/api/employees/${numericId}/details`
            formType = "Employee"
            break
          case "client":
            endpoint = `/api/m5Clients/${numericId}`
            formType = "Client"
            break
          case "truck":
            endpoint = `/api/trucks/${numericId}`
            formType = "Truck"
            break
          case "trailer":
            endpoint = `/api/trailers/${numericId}`
            formType = "Trailer"
            break
          case "rate":
            endpoint = `/api/driver-rates/${numericId}`
            formType = "DriverRate"
            break
          case "subcontractor":
            endpoint = `/api/subcontractors/${numericId}`
            formType = "Subcontractor"
            break
          case "clientRate":
            endpoint = `/api/client-rates/client/${numericId}`
            formType = "ClientRate"
            break
          case "supplier":
            endpoint = `/api/suppliers/${numericId}`
            formType = "Supplier"
            break
          case "expenseType":
            endpoint = `/api/expense-types/${numericId}`
            formType = "ExpenseType"
            break
          default:
            throw new Error("Invalid type")
        }

        console.log(`Loading ${type} for edit with ID:`, numericId, "Endpoint:", endpoint)
        const response = await api.get(endpoint)
        const data = response.data

        // Handle special cases for different types
        if (type === "employee") {
          const existingDocuments = []
          // Check for document URLs and add them to existingDocuments array
          if (data.document_url1) existingDocuments.push(data.document_url1)
          if (data.document_url2) existingDocuments.push(data.document_url2)
          if (data.document_url3) existingDocuments.push(data.document_url3)

          // Get the latest deduction data
          const latestDeduction =
            data.deductionHistory && data.deductionHistory.length > 0 ? data.deductionHistory[0] : {}

          actions.updateFormData(formType, {
            ...data,
            documents: [], // Reset new documents
            existingDocuments, // Set existing documents for display
            income_tax_rate: latestDeduction.income_tax_rate || "",
            deduction_other_deductions: latestDeduction.deduction_other_deductions || "",
            deduction_uif: latestDeduction.deduction_uif || "",
            deduction_bonus: latestDeduction.deduction_bonus || "",
            deduction_savings: latestDeduction.deduction_savings || "",
            deduction_loan: latestDeduction.deduction_loan || "",
            deduction_damage: latestDeduction.deduction_damage || "",
          })
        } else if (type === "client") {
          actions.updateFormData(formType, {
            ...data,
            driver_six_meter_rate: data.driver_six_meter_rate || "",
            driver_twelve_meter_rate: data.driver_twelve_meter_rate || "",
          })
        } else if (type === "truck" || type === "trailer") {
          const existingDocuments = []
          if (data.document_url1) existingDocuments.push(data.document_url1)
          if (data.document_url2) existingDocuments.push(data.document_url2)
          if (data.document_url3) existingDocuments.push(data.document_url3)

          // Format dates for HTML date inputs
          const formattedData = { ...data }
          if (type === "truck" && data.truckpurchasedate) {
            formattedData.truckpurchasedate = new Date(data.truckpurchasedate).toISOString().split("T")[0]
          }
          if (type === "truck" && data.truck_license_expiry) {
            formattedData.truck_license_expiry = new Date(data.truck_license_expiry).toISOString().split("T")[0]
          }
          if (type === "trailer" && data.trailerpurchasedate) {
            formattedData.trailerpurchasedate = new Date(data.trailerpurchasedate).toISOString().split("T")[0]
          }
          if (type === "trailer" && data.trailer_license_expiry) {
            formattedData.trailer_license_expiry = new Date(data.trailer_license_expiry).toISOString().split("T")[0]
          }

          actions.updateFormData(formType, {
            ...formattedData,
            documents: [],
            existingDocuments,
          })
        } else if (type === "subcontractor") {
          // Handle the new structure with separate drivers and trucks arrays
          actions.updateFormData(formType, {
            ...data,
            drivers: data.drivers || [{ name: "" }],
            trucks: data.trucks || [],
          })
        } else if (type === "clientRate") {
          // Handle client rates - data should include client info and rates
          actions.updateFormData(formType, {
            ...data,
            clientId: numericId,
            rates: data.rates || [
              {
                starting_point: "",
                destination: "",
                "6m_rate": "",
                "12m_rate": "",
                surcharges: "",
              },
            ],
          })
        } else if (type === "supplier") {
          // Handle supplier data - ensure we have the supplier data
          const supplierData = data.supplier || data
          console.log("Supplier data for edit:", supplierData)
          actions.updateFormData(formType, {
            ...supplierData,
            expenseTypes: supplierData.expenseTypes || [],
          })
        } else {
          actions.updateFormData(formType, data)
        }

        actions.setEditing(type.charAt(0).toUpperCase() + type.slice(1), numericId)
        actions.showForm(`show${formType}Form`)
      } catch (error) {
        console.error(`Error loading ${type} for edit:`, error)
        actions.showAlert(`Could not load ${type} details: ${error.response?.data?.error || error.message}`)
      }
    },
    [actions],
  )

  const deleteDocument = useCallback(
    async (type, itemId, url) => {
      if (window.confirm("Are you sure you want to delete this document?")) {
        try {
          let endpoint
          let idField
          if (type === "employee") {
            endpoint = "/api/employees/delete-doc"
            idField = "employeeId"
          } else if (type === "truck") {
            endpoint = "/api/trucks/delete-doc"
            idField = "truckId"
          } else if (type === "trailer") {
            endpoint = "/api/trailers/delete-doc"
            idField = "trailerId"
          } else {
            throw new Error("Invalid document type")
          }

          const response = await api.post(endpoint, {
            [idField]: itemId,
            url,
          })

          if (response.data.message === "Document deleted successfully") {
            const formType = type.charAt(0).toUpperCase() + type.slice(1)
            const currentData = state[`new${formType}`]
            actions.updateFormData(formType, {
              existingDocuments: currentData.existingDocuments.filter((doc) => doc !== url),
            })
            actions.showAlert("Document deleted successfully.")
          }
        } catch (error) {
          console.error(`Failed to delete ${type} document:`, error)
          actions.showAlert("Error occurred while deleting document.")
        }
      }
    },
    [state, actions],
  )

  return {
    fetchAllData,
    fetchPaginatedData,
    fetchAllExpenseTypes,
    changePage,
    changeItemsPerPage,
    applyFilters,
    saveEmployee,
    saveClient,
    saveTruck,
    saveTrailer,
    saveDriverRate,
    saveSubcontractor,
    saveClientRates,
    saveSupplier,
    saveExpenseType,
    toggleEmployeeStatus,
    toggleClientStatus,
    toggleSubcontractorStatus,
    toggleSupplierStatus,
    toggleTruckStatus,
    toggleTrailerStatus,
    deleteItem,
    deleteSubcontractorDriver,
    deleteSubcontractorTruck,
    deleteClientRate,
    loadItemForEdit,
    deleteDocument,
  }
}
