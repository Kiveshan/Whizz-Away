"use client"

import React from "react"
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom"
import Header from "./components/Header"
import Footer from "./components/Footer" // Import the Footer component
import LogoutButton from "./components/LogoutButton"

// Import pages
import MonitorInstructions from "./pages/MonitorInstructions"
import Dashboard from "./pages/Dashboard"
import ManagerCreditorsDash from "./pages/ManagerCreditorsDash"
import ManagerViewFuelExpence from "./pages/ManagerViewFuelExpence"
import DirectorDashboard from "./pages/DirectorDashboard"
import ClientPayments from "./pages/ClientPaymentList"
import UploadProof from "./pages/UploadProof"
import ClientDocuments from "./pages/ClientDocuments"
import DriverWage from "./pages/DriverWage"
import DriverWageList from "./pages/DriverWageList"
import Expenses from "./pages/Expenses"
import Analytics from "./pages/Analytics"
import Debtors from "./pages/Debtors"
import MonitorInstructionView from "./pages/MonitorInstructionView"
import Manage from "./pages/Manage"
import DriverWageSlip from "./pages/DriverWageSlip"
import Landing from "./pages/Landing"
import Login from "./pages/Login"
import Register from "./pages/Register"
import ControllerDashboard from "./pages/ControllerDashboard"
import ControllerInstructions from "./pages/ControllerInstructions"
import ControllerTrackInstruction from "./pages/ControllerTrackInstruction"
import ControllerViewAssignment from "./pages/ControllerViewAssignment"
import ControllerInstructionDetails from "./pages/ControllerInstructionDetails"
import ControllerClientTrackInstruction from "./pages/ControllerClientTrackInstruction"
import ManagerLegDetails from "./pages/ManagerLegDetails"
import ManagerViewAssignment from "./pages/ManagerViewAssignment"
import FinancialDocumentsView from "./pages/FinancialDocumentsView"
import DirectorMonitorInstructionView from "./pages/DirectorMonitorInstructionView"
import DirectorMonitorInstructions from "./pages/DirectorMonitorInstructions"
import DirectorManagerViewAssignment from "./pages/DirectorManagerViewAssignment"
import DirectorAnalytics from "./pages/DirectorAnalytics"
import DirectorDabtors from "./pages/DirectorDabtors"
import DirectorClientPaymentList from "./pages/DirectorClientPaymentList"
import DirectorUploadProof from "./pages/DirectorUploadProof"
import DirectorFinancialDocumentsView from "./pages/DirectorFinancialDocumentsView"
import DirectorClientDocuments from "./pages/DirectorClientDocuments"
import DirectorDriverWageList from "./pages/DirectorDriverWageList"
import DirectorDriverWage from "./pages/DirectorDriverWage"
import DirectorManagerLegDetails from "./pages/DirectorManagerLegDetails"
import DirectorDriverWageSlip from "./pages/DirectorDriverWageSlip"
import DirectorCreditorsDash from "./pages/DirectorCreditorsDash"
import DirectorManagerViewFuelExpence from "./pages/DirectorManagerViewFuelExpence"
import DirectorExpenses from "./pages/DirectorExpenses"
// Add these imports at the appropriate location in the import section, with the other Director pages
import DMcontrollerinstructions from "./pages/DMcontrollerinstructions"
import DMcontrollerInstructionDetails from "./pages/DMcontrollerInstructionDetails"

// Finance Clerk Pages
import FDashboard from "./finance clerkpages/FDashboard"
import InstructionsList from "./finance clerkpages/InstructionsList"
import UpdateInstruction from "./finance clerkpages/UpdateInstuction"
import UploadInstructionDocuments from "./finance clerkpages/UploadInstructionDocuments"
import InvoicesList from "./finance clerkpages/InvoicesList"
import ViewClientStatement from "./finance clerkpages/ViewClientStatements"
import StatementsList from "./finance clerkpages/StatementsList"
import Wages from "./finance clerkpages/Wages"
import FExpenses from "./finance clerkpages/FExpenses"
import FinanceClerkWage from "./finance clerkpages/finance-clerk-wage"
import FinanceClerkWageDetails from "./finance clerkpages/finance-clerk-wage-details"
import FinanceClerkWageSlip from "./finance clerkpages/finance-clerk-wage-slip"
import ClientInvoice from "./finance clerkpages/ClientInvoice"
import ClientStatement from "./finance clerkpages/ClientStatement"
import ViewExpense from "./finance clerkpages/ViewExpense"
import ExpenseDetails from "./finance clerkpages/ExpenseDetails"
import ExpenseSubmission from "./finance clerkpages/ExpenseSubmission"
import ViewClientInstruction from "./finance clerkpages/ViewClientInstruction"
import ViewClientInvoice from "./finance clerkpages/ViewClientInvoice"
import DebtorsDashboard from "./finance clerkpages/DebtorsDashboard"
import CreditorsDashboard from "./finance clerkpages/CreditorsDashboard"
import FClerkLegDetails from "./finance clerkpages/FClerkLegDetails"
import FCcontrollerinstructions from "./finance clerkpages/FCcontrollerinstructions"
import FCcontrollerInstructionDetails from "./finance clerkpages/FCcontrollerInstructionDetails"

// Business Manager Pages
import BMcontrollerinstructions from "./pages/BMcontrollerinstructions"
import BMcontrollerInstructionDetails from "./pages/BMcontrollerInstructionDetails"

// CSS Imports
import "./css/card.css"
import "./css/components.css"
import "./css/layout.css"
import "./css/MonitorInstructions.css"

function DynamicHeader() {
  const location = useLocation()
  const titleMap = {
    "/Dashboard": "Business Manager",
    "/monitor-instructions": "Instructions",
    "/MonitorInstructionView": "Instructions",
    "/client-payments": "Client Payments",
    "/client-documents": "Client Documents",
    "/driver-wage": "Wages",
    "/DriverWageSlip": "Wages",
    "/DriverWageList": "Wages",
    "/ControllerInstructions": "Instruction",
    "/ControllerTrackInstruction": "Tracking",
    "/ControllerClientTrackInstruction": "Tracking",
    "/ControllerViewAssignment": "View Assignment",
    "/ControllerInstructionDetails": "Container Details",
    "/FCcontrollerInstructionDetails": "Container Details",
    "/BMcontrollerinstructions": "Instructions",
    "/BMcontrollerInstructionDetails": "Container Details",
    "/expenses": "Truck Expenses",
    "/analytics": "Analytics",
    "/debtors": "Debtors",
    "/FDashboard": "Finance Clerk",
    "/instructions": "Instructions",
    "/update-instructions": "Instructions",
    "/Upload-Instruction-Documents": "Instructions",
    "/invoices": "Invoices",
    "/client-invoice": "Invoices",
    "/view-client-statements": "Statements",
    "/statements-list": "Statements",
    "/client-statement": "Statements",
    "/wages": "Wages",
    "/finance-clerk-wage": "Wages",
    "/finance-clerk-wage-details": "Wages",
    "/finance-clerk-wage-slip": "Wages",
    "/FExpenses": "Expenses",
    "/ViewExpense": "Truck Expenses",
    "/ExpenseDetails": "Truck Expenses",
    "/ExpenseSubmission": "Truck Expenses",
    "/manage": "Manage",
    "/ViewClientInstruction": "Instructions",
    "/ViewClientInvoice": "Invoice",
    "/DebtorsDashboard": "Debtors",
    "/CreditorsDashboard": "Creditors",
    "/DirectorDashboard": "Director",
    "/ManagerCreditorsDash": "Creditors",
    "/ManagerViewFuelExpence": "Truck Expenses",
    "/FClerkLegDetails": "Wages",
    "/ManagerLegDetails": "Wages",
    "/ManagerViewAssignment": "View Assignment",
    "/FinancialDocumentsView": "Client Documents",
    "/DirectorMonitorInstructionView": "Instructions ",
    "/DirectorMonitorInstructions": "Instructions ",
    "/DirectorManagerViewAssignment": "View Assignment",
    "/DirectorAnalytics": "Analytics",
    "/DirectorDabtors": "Debtors",
    "/DirectorClientPaymentList": "Debtors",
    "/DirectorUploadProof": "Proof of Payment",
    "/DirectorFinancialDocumentsView": "Client Documents",
    "/DirectorClientDocuments": "Client Documents",
    "/DirectorDriverWageList": "Wages",
    "/DirectorDriverWage": "Wages",
    "/DirectorManagerLegDetails": "Wages",
    "/DirectorDriverWageSlip": "Wages",
    "/DirectorCreditorsDash": "Creditors",
    "/DirectorManagerViewFuelExpence": "Truck Expenses",
    "/DirectorExpenses": "Truck Expenses",
    "/ControllerDashboard": "Controller",
    "/FCcontrollerinstructions": "Instructions",
    // Add these entries to the titleMap object in the DynamicHeader function
    "/DMcontrollerinstructions": "Instructions",
    "/DMcontrollerInstructionDetails": "Container Details",
  }

  const getTitle = () => {
    if (location.pathname.startsWith("/upload")) return "Proof of Payment"
    return titleMap[location.pathname] || "Unknown Page"
  }

  if (["/login", "/register", "/", "/new-landing"].includes(location.pathname)) {
    return null
  }

  return <Header title={getTitle()} />
}

function ContentWrapper() {
  const location = useLocation()
  const hideFooterOn = ["/login", "/register"]
  const hideLogoutOn = ["/login", "/register", "/landing", "/new-landing"]

  const shouldShowFooter = !hideFooterOn.includes(location.pathname)
  const shouldShowLogout = !hideLogoutOn.includes(location.pathname)

  return (
    <div className="content-area">
      {shouldShowLogout && (
        <div className="logout-container">
          <LogoutButton />
        </div>
      )}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/monitor-instructions" element={<MonitorInstructions />} />
        <Route path="/MonitorInstructionView" element={<MonitorInstructionView />} />
        <Route path="/client-payments" element={<ClientPayments />} />
        <Route path="/driver-wage" element={<DriverWage />} />
        <Route path="/DriverWageSlip" element={<DriverWageSlip />} />
        <Route path="/DriverWageList" element={<DriverWageList />} />
        <Route path="/client-documents" element={<ClientDocuments />} />
        <Route path="/ManagerViewFuelExpence" element={<ManagerViewFuelExpence />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/upload/:companyName/:balance" element={<UploadProof />} />
        <Route path="/debtors" element={<Debtors />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/manage" element={<Manage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/Dashboard" element={<Dashboard />} />
        <Route path="/register" element={<Register />} />
        <Route path="/ControllerDashboard" element={<ControllerDashboard />} />
        <Route path="/DirectorDashboard" element={<DirectorDashboard />} />
        <Route path="/ManagerCreditorsDash" element={<ManagerCreditorsDash />} />
        <Route path="/ControllerInstructions" element={<ControllerInstructions />} />
        <Route path="/ControllerTrackInstruction" element={<ControllerTrackInstruction />} />
        <Route path="/ControllerViewAssignment" element={<ControllerViewAssignment />} />
        <Route path="/ControllerInstructionDetails" element={<ControllerInstructionDetails />} />
        <Route path="/ControllerClientTrackInstruction" element={<ControllerClientTrackInstruction />} />
        <Route path="/ManagerLegDetails" element={<ManagerLegDetails />} />
        <Route path="/ManagerViewAssignment" element={<ManagerViewAssignment />} />
        <Route path="/FinancialDocumentsView" element={<FinancialDocumentsView />} />
        <Route path="/DirectorMonitorInstructionView" element={<DirectorMonitorInstructionView />} />
        <Route path="/DirectorMonitorInstructions" element={<DirectorMonitorInstructions />} />
        <Route path="/DirectorManagerViewAssignment" element={<DirectorManagerViewAssignment />} />
        <Route path="/DirectorAnalytics" element={<DirectorAnalytics />} />
        <Route path="/DirectorDabtors" element={<DirectorDabtors />} />
        <Route path="/DirectorClientPaymentList" element={<DirectorClientPaymentList />} />
        <Route path="/DirectorUploadProof" element={<DirectorUploadProof />} />
        <Route path="/DirectorUploadProof" element={<DirectorUploadProof />} />
        <Route path="/DirectorFinancialDocumentsView" element={<DirectorFinancialDocumentsView />} />
        <Route path="/DirectorClientDocuments" element={<DirectorClientDocuments />} />
        <Route path="/DirectorDriverWageList" element={<DirectorDriverWageList />} />
        <Route path="/DirectorDriverWage" element={<DirectorDriverWage />} />
        <Route path="/DirectorManagerLegDetails" element={<DirectorManagerLegDetails />} />
        <Route path="/DirectorDriverWageSlip" element={<DirectorDriverWageSlip />} />
        <Route path="/DirectorCreditorsDash" element={<DirectorCreditorsDash />} />
        <Route path="/DirectorManagerViewFuelExpence" element={<DirectorManagerViewFuelExpence />} />
        <Route path="/DirectorExpenses" element={<DirectorExpenses />} />
        // Add these routes in the ContentWrapper function, with the other Director routes
        <Route path="/DMcontrollerinstructions" element={<DMcontrollerinstructions />} />
        <Route path="/DMcontrollerInstructionDetails" element={<DMcontrollerInstructionDetails />} />
        {/* Finance Clerk Routes */}
        <Route path="/instructions" element={<InstructionsList />} />
        <Route path="/update-instructions" element={<UpdateInstruction />} />
        <Route path="/Upload-Instruction-Documents" element={<UploadInstructionDocuments />} />
        <Route path="/invoices" element={<InvoicesList />} />
        <Route path="/view-client-statements" element={<ViewClientStatement />} />
        <Route path="/statements-list" element={<StatementsList />} />
        <Route path="/wages" element={<Wages />} />
        <Route path="/expenses" element={<FExpenses />} />
        <Route path="/client-invoice" element={<ClientInvoice />} />
        <Route path="/FDashboard" element={<FDashboard />} />
        <Route path="/finance-clerk-wage" element={<FinanceClerkWage />} />
        <Route path="/finance-clerk-wage-details" element={<FinanceClerkWageDetails />} />
        <Route path="/finance-clerk-wage-slip" element={<FinanceClerkWageSlip />} />
        <Route path="/client-statement" element={<ClientStatement />} />
        <Route path="/ViewExpense" element={<ViewExpense />} />
        <Route path="/ExpenseDetails" element={<ExpenseDetails />} />
        <Route path="/ExpenseSubmission" element={<ExpenseSubmission />} />
        <Route path="/ViewClientInstruction" element={<ViewClientInstruction />} />
        <Route path="/ViewClientInvoice" element={<ViewClientInvoice />} />
        <Route path="/DebtorsDashboard" element={<DebtorsDashboard />} />
        <Route path="/CreditorsDashboard" element={<CreditorsDashboard />} />
        <Route path="/FClerkLegDetails" element={<FClerkLegDetails />} />
        <Route path="/FCcontrollerinstructions" element={<FCcontrollerinstructions />} />
        <Route path="/FCcontrollerInstructionDetails" element={<FCcontrollerInstructionDetails />} />
        {/* Business Manager Routes */}
        <Route path="/BMcontrollerinstructions" element={<BMcontrollerinstructions />} />
        <Route path="/BMcontrollerInstructionDetails" element={<BMcontrollerInstructionDetails />} />
      </Routes>
      {shouldShowFooter && <Footer />} {/* Conditionally render footer */}
    </div>
  )
}

function App() {
  // Map of route paths to page titles
  const pageTitles = {
    "/": "Controller Dashboard",
    "/ControllerInstructions": "Controller Instructions",
    "/ControllerInstructionDetails": "Container Details",
    "/ControllerTrackInstruction": "Track Instructions",
    "/ControllerViewAssignment": "View Assignment",
    "/FDashboard": "Finance Clerk Dashboard",
    "/ViewClientInstruction": "View Client Instructions",
    "/FCcontrollerinstructions": "Finance Clerk Instructions",
    "/FCcontrollerInstructionDetails": "Finance Clerk Container Details",
    "/BMcontrollerinstructions": "Business Manager Instructions",
    "/BMcontrollerInstructionDetails": "Business Manager Container Details",
    "/InstructionsList": "Instructions List",
    // Add these entries to the pageTitles object in the App function
    "/DMcontrollerinstructions": "DMcontrollerinstructions",
    "/DMcontrollerInstructionDetails": "DMcontrollerInstructionDetails",
  }

  // Set page title based on current route
  React.useEffect(() => {
    const path = window.location.pathname
    document.title = pageTitles[path] || "Logistics App"
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Router>
      <div className="container">
        <DynamicHeader />
        <ContentWrapper />
      </div>
    </Router>
  )
}

export default App

