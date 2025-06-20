"use client"

import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import "../css/Manage.css"

// Hooks
import { useManageState } from "../hooks/useManageState"
import { useApi } from "../hooks/useApi"

// Components
import CustomAlert from "../components/common/CustomAlert"

// Employee Components - Updated import paths
import EmployeeTable from "../components/employees/Employeetable" // Note: lowercase 't' to match your file
import EmployeeForm from "../components/employees/EmployeeForm"

// Client Components
import ClientTable from "../components/clients/ClientTable"
import ClientForm from "../components/clients/ClientForm"

// Truck Components
import TruckTable from "../components/trucks/TruckTable.jsx"
import TruckForm from "../components/trucks/TruckForm.jsx"

// Driver Rate Components
import DriverRatesTable from "../components/rates/DriverRatesTable.jsx"
import DriverRateForm from "../components/rates/DriverRateForm.jsx"

// Subcontractor Components
import SubcontractorTable from "../components/subcontractors/SubcontractorTable.jsx"
import SubcontractorForm from "../components/subcontractors/SubcontractorForm.jsx"

const Manage = () => {
  const navigate = useNavigate()
  const { state, actions } = useManageState()
  const api = useApi(state, actions)

  // Fetch data on component mount
  useEffect(() => {
    api.fetchAllData()
  }, [])

  // Auto-hide alerts after 5 seconds
  useEffect(() => {
    if (state.showAlert) {
      const timer = setTimeout(() => {
        actions.hideAlert()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [state.showAlert, actions])

  const handleBack = () => {
    // Hide all forms before navigating back
    actions.hideForm("showEmployeeForm")
    actions.hideForm("showClientForm")
    actions.hideForm("showTruckForm")
    actions.hideForm("showDriverRateForm")
    actions.hideForm("showSubcontractorForm")
    navigate("/Dashboard")
  }

  // Employee handlers
  const handleEmployeeFormChange = (field, value) => {
    actions.updateFormData("Employee", { [field]: value })
  }

  const handleEmployeeEdit = (id) => {
    api.loadItemForEdit("employee", id)
  }

  const handleEmployeeAdd = () => {
    actions.resetFormData("Employee")
    actions.setEditing("Employee", null)
    actions.showForm("showEmployeeForm")
  }

  const handleEmployeeCancel = () => {
    actions.resetFormData("Employee")
    actions.setEditing("Employee", null)
    actions.hideForm("showEmployeeForm")
  }

  // Client handlers
  const handleClientFormChange = (field, value) => {
    actions.updateFormData("Client", { [field]: value })
  }

  const handleClientEdit = (id) => {
    api.loadItemForEdit("client", id)
  }

  const handleClientAdd = () => {
    actions.resetFormData("Client")
    actions.setEditing("Client", null)
    actions.showForm("showClientForm")
  }

  const handleClientCancel = () => {
    actions.resetFormData("Client")
    actions.setEditing("Client", null)
    actions.hideForm("showClientForm")
  }

  // Truck handlers
  const handleTruckFormChange = (field, value) => {
    actions.updateFormData("Truck", { [field]: value })
  }

  const handleTruckEdit = (id) => {
    api.loadItemForEdit("truck", id)
  }

  const handleTruckAdd = () => {
    actions.resetFormData("Truck")
    actions.setEditing("Truck", null)
    actions.showForm("showTruckForm")
  }

  const handleTruckCancel = () => {
    actions.resetFormData("Truck")
    actions.setEditing("Truck", null)
    actions.hideForm("showTruckForm")
  }

  // Driver Rate handlers
  const handleDriverRateFormChange = (field, value) => {
    actions.updateFormData("DriverRate", { [field]: value })
  }

  const handleDriverRateEdit = (id) => {
    api.loadItemForEdit("rate", id)
  }

  const handleDriverRateAdd = () => {
    actions.resetFormData("DriverRate")
    actions.setEditing("Rate", null)
    actions.showForm("showDriverRateForm")
  }

  const handleDriverRateCancel = () => {
    actions.resetFormData("DriverRate")
    actions.setEditing("Rate", null)
    actions.hideForm("showDriverRateForm")
  }

  // Subcontractor handlers
  const handleSubcontractorFormChange = (field, value) => {
    actions.updateFormData("Subcontractor", { [field]: value })
  }

  const handleSubcontractorEdit = (id) => {
    api.loadItemForEdit("subcontractor", id)
  }

  const handleSubcontractorAdd = () => {
    actions.resetFormData("Subcontractor")
    actions.setEditing("Subcontractor", null)
    actions.showForm("showSubcontractorForm")
  }

  const handleSubcontractorCancel = () => {
    actions.resetFormData("Subcontractor")
    actions.setEditing("Subcontractor", null)
    actions.hideForm("showSubcontractorForm")
  }

  return (
    <div className="manage-container">
      {/* Header */}
      <div className="manage-header-actions">
        <button onClick={handleBack} className="back-button">
          Back
        </button>
      </div>

      {/* Alert */}
      {state.showAlert && <CustomAlert message={state.alertMessage} onClose={actions.hideAlert} />}

      {/* Tab Navigation */}
      <div className="manage-button-row">
        <button
          className={`manage-tab-button ${state.activeTab === "employees" ? "active" : ""}`}
          onClick={() => actions.setActiveTab("employees")}
        >
          Employees
        </button>
        <button
          className={`manage-tab-button ${state.activeTab === "clients" ? "active" : ""}`}
          onClick={() => actions.setActiveTab("clients")}
        >
          Clients Information
        </button>
        <button
          className={`manage-tab-button ${state.activeTab === "rates" ? "active" : ""}`}
          onClick={() => actions.setActiveTab("rates")}
        >
          Driver Rates
        </button>
        <button
          className={`manage-tab-button ${state.activeTab === "subcontractors" ? "active" : ""}`}
          onClick={() => actions.setActiveTab("subcontractors")}
        >
          Subcontractors
        </button>
        <button
          className={`manage-tab-button ${state.activeTab === "trucks" ? "active" : ""}`}
          onClick={() => actions.setActiveTab("trucks")}
        >
          Trucks
        </button>
      </div>

      {/* Tab Content */}
      {/* Employees Tab */}
      {state.activeTab === "employees" && (
        <>
          {state.showEmployeeForm ? (
            <EmployeeForm
              employee={state.newEmployee}
              loading={state.loading}
              isEditing={!!state.editingEmployeeId}
              onSave={api.saveEmployee}
              onCancel={handleEmployeeCancel}
              onChange={handleEmployeeFormChange}
              onDeleteDocument={api.deleteDocument}
            />
          ) : (
            <EmployeeTable
              employees={state.employees}
              loading={state.loading}
              error={state.error}
              onEdit={handleEmployeeEdit}
              onToggleStatus={api.toggleEmployeeStatus}
              onAdd={handleEmployeeAdd}
            />
          )}
        </>
      )}

      {/* Clients Tab */}
      {state.activeTab === "clients" && (
        <>
          {state.showClientForm ? (
            <ClientForm
              client={state.newClient}
              loading={state.loading}
              isEditing={state.isEditing}
              onSave={api.saveClient}
              onCancel={handleClientCancel}
              onChange={handleClientFormChange}
            />
          ) : (
            <ClientTable
              clients={state.clients}
              loading={state.loading}
              error={state.error}
              onEdit={handleClientEdit}
              onToggleStatus={api.toggleClientStatus}
              onAdd={handleClientAdd}
            />
          )}
        </>
      )}

      {/* Trucks Tab */}
      {state.activeTab === "trucks" && (
        <>
          {state.showTruckForm ? (
            <TruckForm
              truck={state.newTruck}
              loading={state.loading}
              isEditing={!!state.editTruckId}
              onSave={api.saveTruck}
              onCancel={handleTruckCancel}
              onChange={handleTruckFormChange}
              onDeleteDocument={api.deleteDocument}
            />
          ) : (
            <TruckTable
              trucks={state.trucks}
              loading={state.loading}
              error={state.error}
              onEdit={handleTruckEdit}
              onDelete={(id) => api.deleteItem("truck", id)}
              onAdd={handleTruckAdd}
            />
          )}
        </>
      )}

      {/* Driver Rates Tab */}
      {state.activeTab === "rates" && (
        <>
          {state.showDriverRateForm ? (
            <DriverRateForm
              driverRate={state.newDriverRate}
              loading={state.loading}
              isEditing={state.isEditingRate}
              onSave={api.saveDriverRate}
              onCancel={handleDriverRateCancel}
              onChange={handleDriverRateFormChange}
            />
          ) : (
            <DriverRatesTable
              driverRates={state.driverRates}
              loading={state.loading}
              error={state.error}
              onEdit={handleDriverRateEdit}
              onDelete={(id) => api.deleteItem("rate", id)}
              onAdd={handleDriverRateAdd}
            />
          )}
        </>
      )}

      {/* Subcontractors Tab */}
      {state.activeTab === "subcontractors" && (
        <>
          {state.showSubcontractorForm ? (
            <SubcontractorForm
              subcontractor={state.newSubcontractor}
              loading={state.loading}
              isEditing={state.isEditMode}
              onSave={api.saveSubcontractor}
              onCancel={handleSubcontractorCancel}
              onChange={handleSubcontractorFormChange}
            />
          ) : (
            <SubcontractorTable
              subcontractors={state.subcontractors}
              loading={state.loading}
              error={state.error}
              onEdit={handleSubcontractorEdit}
              onToggleStatus={api.toggleSubcontractorStatus}
              onAdd={handleSubcontractorAdd}
            />
          )}
        </>
      )}
    </div>
  )
}

export default Manage
