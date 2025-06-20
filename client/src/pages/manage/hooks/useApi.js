"use client"

import { useCallback } from "react"
import api from "../../../api.js" // Updated to match your API file location

export function useApi(state, actions) {
  const fetchAllData = useCallback(async () => {
    actions.setLoading(true)
    actions.setError(null)

    try {
      const [employeesRes, clientsRes, trucksRes, ratesRes, subcontractorsRes] = await Promise.all([
        api.get("/api/employees"),
        api.get("/api/m5Clients"),
        api.get("/api/trucks"),
        api.get("/api/driver-rates"),
        api.get("/api/subcontractors"),
      ])

      actions.setData("employees", employeesRes.data)
      actions.setData("clients", clientsRes.data)
      actions.setData("trucks", trucksRes.data)
      actions.setData("driverRates", ratesRes.data)
      actions.setData("subcontractors", subcontractorsRes.data)
    } catch (err) {
      console.error("Error fetching data:", err)
      let errorMessage = "Failed to load data. Please try again."

      if (err.response) {
        const { status } = err.response
        if (status === 401 || status === 403) {
          // Handle unauthorized access
          return
        }
        errorMessage = err.response.data?.error || errorMessage
      }

      actions.setError(errorMessage)
    } finally {
      actions.setLoading(false)
    }
  }, [actions])

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

        await api[method](url, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })

        // Refresh employees list
        const { data } = await api.get("/api/employees")
        actions.setData("employees", data)

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
    [state.editingEmployeeId, actions],
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

        if (state.isEditing) {
          await api.put(`/api/m5Clients/${state.editingClientId}`, clientData)
        } else {
          await api.post("/api/m5Clients", clientData)
        }

        const clientsResponse = await api.get("/api/m5Clients")
        actions.setData("clients", clientsResponse.data)

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
    [state.isEditing, state.editingClientId, actions],
  )

  const saveTruck = useCallback(
    async (truckData) => {
      actions.setLoading(true)

      try {
        const formData = new FormData()

        // Append all scalar fields
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

        let response
        if (state.editTruckId) {
          // Update existing truck
          response = await api.put(`/api/trucks/${state.editTruckId}`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          })
        } else {
          // Create new truck
          response = await api.post("/api/trucks", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          })
        }

        // Refresh trucks list
        const trucksResponse = await api.get("/api/trucks")
        actions.setData("trucks", trucksResponse.data)

        // Reset form and close
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
    [state.editTruckId, actions],
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

        if (state.isEditingRate) {
          await api.put(`/api/driver-rates/${state.editingRateId}`, cleanedDriverRate)
        } else {
          await api.post("/api/driver-rates", cleanedDriverRate)
        }

        const ratesResponse = await api.get("/api/driver-rates")
        actions.setData("driverRates", ratesResponse.data)

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
    [state.isEditingRate, state.editingRateId, actions],
  )

  const saveSubcontractor = useCallback(
    async (subcontractorData) => {
      actions.setLoading(true)

      try {
        const truckRegNums = subcontractorData.trucks
          .map((truck) => truck.reg.trim())
          .filter(Boolean)
          .join(",")

        const subDriverNames = subcontractorData.trucks
          .map((truck) => truck.driver.trim())
          .filter(Boolean)
          .join(",")

        const payload = {
          companyname: subcontractorData.companyname,
          location: subcontractorData.location,
          contact_person: subcontractorData.contact_person,
          cellnum: subcontractorData.cellnum,
          email: subcontractorData.email,
          subei_reg_num: subcontractorData.subei_reg_num,
          no_of_trucks: subcontractorData.no_of_trucks,
          truckregnum: truckRegNums,
          subdrivername: subDriverNames,
        }

        const url = state.isEditMode ? `/api/subcontractors/${state.subcontractorId}` : "/api/subcontractors"
        const method = state.isEditMode ? "put" : "post"

        await api[method](url, payload)

        const subcontractorsResponse = await api.get("/api/subcontractors")
        actions.setData("subcontractors", subcontractorsResponse.data)

        actions.resetFormData("Subcontractor")
        actions.setEditing("Subcontractor", null)
        actions.hideForm("showSubcontractorForm")
        actions.showAlert(state.isEditMode ? "Subcontractor updated!" : "Subcontractor added!")
        return true
      } catch (err) {
        console.error("Error saving subcontractor:", err)
        actions.showAlert(`Error: ${err.response?.data?.error || err.message}`)
        return false
      } finally {
        actions.setLoading(false)
      }
    },
    [state.isEditMode, state.subcontractorId, actions],
  )

  const toggleEmployeeStatus = useCallback(
    async (id, currentStatus) => {
      actions.setLoading(true)
      try {
        const newStatus = !currentStatus
        await api.put(`/api/employees/${id}/toggle-status`, { status: newStatus })

        const { data } = await api.get("/api/employees")
        actions.setData("employees", data)
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
    [actions],
  )

  const toggleClientStatus = useCallback(
    async (id, currentStatus) => {
      actions.setLoading(true)
      try {
        const newStatus = !currentStatus
        const { data: updatedClient } = await api.put(`/api/clients/${id}/toggle-status`, { status: newStatus })

        const updatedClients = state.clients.map((c) =>
          c.m5clientkey === id ? { ...c, status: updatedClient.status } : c,
        )
        actions.setData("clients", updatedClients)
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
    [state.clients, actions],
  )

  const toggleSubcontractorStatus = useCallback(
    async (id, currentStatus) => {
      actions.setLoading(true)
      try {
        const newStatus = !currentStatus
        await api.put(`/api/subcontractors/${id}/toggle-status`, { status: newStatus })

        const response = await api.get("/api/subcontractors")
        actions.setData("subcontractors", response.data)
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
    [actions],
  )

  const deleteItem = useCallback(
    async (type, id) => {
      actions.setLoading(true)
      try {
        let endpoint
        let dataType

        switch (type) {
          case "client":
            endpoint = `/api/m5Clients/${id}`
            dataType = "clients"
            break
          case "truck":
            endpoint = `/api/trucks/${id}`
            dataType = "trucks"
            break
          case "rate":
            endpoint = `/api/driver-rates/${id}`
            dataType = "driverRates"
            break
          default:
            throw new Error("Invalid type")
        }

        await api.delete(endpoint)

        const response = await api.get(endpoint.split("/").slice(0, -1).join("/"))
        actions.setData(dataType, response.data)
        actions.showAlert(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted!`)
      } catch (err) {
        console.error(`Error deleting ${type} ${id}:`, err)
        actions.showAlert(`Error deleting ${type}: ${err.response?.data?.error || err.message}`)
      } finally {
        actions.setLoading(false)
      }
    },
    [actions],
  )

  const loadItemForEdit = useCallback(
    async (type, id) => {
      try {
        let endpoint
        let formType

        switch (type) {
          case "employee":
            endpoint = `/api/employees/${id}/details`
            formType = "Employee"
            break
          case "client":
            endpoint = `/api/m5Clients/${id}`
            formType = "Client"
            break
          case "truck":
            endpoint = `/api/trucks/${id}`
            formType = "Truck"
            break
          case "rate":
            endpoint = `/api/driver-rates/${id}`
            formType = "DriverRate"
            break
          case "subcontractor":
            endpoint = `/api/subcontractors/${id}`
            formType = "Subcontractor"
            break
          default:
            throw new Error("Invalid type")
        }

        const response = await api.get(endpoint)
        const data = response.data

        // Handle special cases for different types
        if (type === "employee") {
          const existingDocuments = []
          if (data.document_url1) existingDocuments.push(data.document_url1)
          if (data.document_url2) existingDocuments.push(data.document_url2)
          if (data.document_url3) existingDocuments.push(data.document_url3)

          const latestDeduction =
            data.deductionHistory && data.deductionHistory.length > 0 ? data.deductionHistory[0] : {}

          actions.updateFormData(formType, {
            ...data,
            documents: [],
            existingDocuments,
            income_tax_rate: latestDeduction.income_tax_rate || "",
            deduction_other_deductions: latestDeduction.deduction_other_deductions || "",
            deduction_uif: latestDeduction.deduction_uif || "",
            deduction_bonus: latestDeduction.deduction_bonus || "",
            deduction_savings: latestDeduction.deduction_savings || "",
            deduction_loan: latestDeduction.deduction_loan || "",
            deduction_damage: latestDeduction.deduction_damage || "",
          })
        } else if (type === "truck") {
          const existingDocuments = []
          if (data.document_url1) existingDocuments.push(data.document_url1)
          if (data.document_url2) existingDocuments.push(data.document_url2)
          if (data.document_url3) existingDocuments.push(data.document_url3)

          actions.updateFormData(formType, {
            ...data,
            documents: [],
            existingDocuments,
          })
        } else if (type === "subcontractor") {
          let truckRegs = []
          let driverNames = []

          if (data.truckregnum) {
            truckRegs =
              typeof data.truckregnum === "string"
                ? data.truckregnum.split(",").map((reg) => reg.trim())
                : Array.isArray(data.truckregnum)
                  ? data.truckregnum
                  : [String(data.truckregnum)]
          }

          if (data.subdrivername) {
            driverNames =
              typeof data.subdrivername === "string"
                ? data.subdrivername.split(",").map((name) => name.trim())
                : Array.isArray(data.subdrivername)
                  ? data.subdrivername
                  : [String(data.subdrivername)]
          }

          const trucks = []
          const maxLength = Math.max(truckRegs.length, driverNames.length)

          for (let i = 0; i < maxLength; i++) {
            trucks.push({
              reg: truckRegs[i] || "",
              driver: driverNames[i] || "",
            })
          }

          if (trucks.length === 0) {
            trucks.push({ reg: "", driver: "" })
          }

          actions.updateFormData(formType, {
            ...data,
            trucks,
          })
        } else {
          actions.updateFormData(formType, data)
        }

        actions.setEditing(type.charAt(0).toUpperCase() + type.slice(1), id)
        actions.showForm(`show${formType}Form`)
      } catch (error) {
        console.error(`Error loading ${type} for edit:`, error)
        actions.showAlert(`Could not load ${type} details.`)
      }
    },
    [actions],
  )

  const deleteDocument = useCallback(
    async (type, itemId, url) => {
      if (window.confirm("Are you sure you want to delete this document?")) {
        try {
          const endpoint = type === "employee" ? "/api/employees/delete-doc" : "/api/trucks/delete-doc"
          const idField = type === "employee" ? "employeeId" : "truckId"

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
    saveEmployee,
    saveClient,
    saveTruck,
    saveDriverRate,
    saveSubcontractor,
    toggleEmployeeStatus,
    toggleClientStatus,
    toggleSubcontractorStatus,
    deleteItem,
    loadItemForEdit,
    deleteDocument,
  }
}
