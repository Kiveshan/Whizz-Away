import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Header from "./components/Header";
import MonitorInstructions from "./pages/MonitorInstructions";
import Dashboard from "./pages/Dashboard";
import ClientPayments from "./pages/ClientPaymentList";
import UploadProof from "./pages/UploadProof";
import LogoutButton from "./components/LogoutButton";
import ClientDocuments from "./pages/ClientDocuments";
import DriverWage from "./pages/DriverWage";
import Expenses from "./pages/Expenses";
import Analytics from "./pages/Analytics";
import Debtors from "./pages/Debtors"; 
import Manage from "./pages/Manage";
import Landing from "./pages/Landing"; // Keep this import for backward compatibility
import Login from "./pages/Login";
import Register from "./pages/Register";
import Controller_Dashboard from "./pages/Controller_Dashboard";
import ControllerInstructions from "./pages/ControllerInstructions";
import ControllerTrackInstruction from "./pages/ControllerTrackInstruction";
import ControllerViewAssignment from "./pages/ControllerViewAssignment";
import ControllerInstructionDetails from "./pages/ControllerInstructionDetails";

import FDashboard from "./finance clerkpages/FDashboard";
import InstructionsList from "./finance clerkpages/InstructionsList";
import UpdateInstruction from "./finance clerkpages/UpdateInstuction";
import UploadInstructionDocuments from "./finance clerkpages/UploadInstructionDocuments";
import InvoicesList from "./finance clerkpages/InvoicesList";
import ViewClientStatement from "./finance clerkpages/ViewClientStatements";
import StatementsList from "./finance clerkpages/StatementsList";
import Wages from "./finance clerkpages/Wages";
import FExpenses from "./finance clerkpages/FExpenses";
import FinanceClerkWage from "./finance clerkpages/finance-clerk-wage"
import FinanceClerkWageDetails from "./finance clerkpages/finance-clerk-wage-details"
import FinanceClerkWageSlip from "./finance clerkpages/finance-clerk-wage-slip"
import ClientInvoice from "./finance clerkpages/ClientInvoice"
import ClientStatement from "./finance clerkpages/ClientStatement"
import "./css/card.css";
import "./css/components.css";
// import "./css/dashboard.css";
import "./css/layout.css";
import "./css/MonitorInstructions.css"



function DynamicHeader() {
  const location = useLocation();

  const titleMap = {
    "/Dashboard": "Dashboard",
    "/monitor-instructions": "Instructions",
    "/client-payments": "Client Payments",
    "/client-documents": "Client Documents",
    "/driver-wage": "Wages",
    "/ControllerInstructions": "Instruction",
    "/ControllerTrackInstruction": "Tracking",
    "/ControllerViewAssignment": "View Assignment",
    "/ControllerInstructionDetails": "Container Details",
    "/controllerDashboard": "Controller",
    "/expenses": "Truck Expenses",
    "/analytics":"Analytics",
    "/Controller_Dashboard":"Controller",
    "/debtors":"Debtors",
    // finacance clerk
    "/FDashboard": "Finance Clerk",
    "/instructions": "Instructions",
    "/update-instructions": "Instructions",
    "/Upload-Instruction-Documents": "Instructions",

    "/invoices": "Invoices",
    "/client-invoice": "Invoices",

    "/view-client-statements": "Statements",
    "/statements-list": "Statements",
    "/client-statement":"Statements",

    "/wages": "Wages",
    "/finance-clerk-wage" : "Wages",
    "/finance-clerk-wage-details/:id": "Wages",
    "/finance-clerk-wage-slip/:id" :"Wages",
                
    "/Fexpenses": "Expenses",
    // finacance clerk
    "/manage":"Manage"
  };

  const getTitle = () => {
    if (location.pathname.startsWith("/upload")) return "Upload Proof of Payment";
    return titleMap[location.pathname] || "Unknown Page";
  };
  

   // Fixed the case sensitivity in the path checks
   if (
    location.pathname === "/login" || 
    location.pathname === "/register" || 
    location.pathname === "/" || 
    location.pathname === "/new-landing"
  ) {
    return null; // Don't render header on login, register, or landing pages
  }

  return <Header title={getTitle()} />;
}

// Wrapper component to conditionally show logout button
function ContentWrapper() {
  const location = useLocation();
  const hideLogoutOn = ["/login", "/register", "/landing", "/new-landing"];
  
  const shouldShowLogout = !hideLogoutOn.includes(location.pathname);
  
  return (
    <div className="content-area">
      {shouldShowLogout && (
        <div className="logout-container">
          <LogoutButton />
        </div>
      )}
      <Routes>
      <Route path="/" element={<Landing />} /> {/* Keep original landing page */}
            <Route path="/monitor-instructions" element={<MonitorInstructions />} /> 
            <Route path="/client-payments" element={<ClientPayments />} />
            <Route path="/driver-wage" element={<DriverWage />} />
            <Route path="/client-documents" element={<ClientDocuments />} /> 
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/upload/:companyName/:balance" element={<UploadProof />} />
            <Route path="/debtors" element={<Debtors />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/manage" element={<Manage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/Dashboard" element={<Dashboard />} />
        <Route path="/register" element={<Register />} />
        
       
        <Route path="/Controller_Dashboard" element={<Controller_Dashboard />} />
        <Route path="/ControllerInstructions" element={<ControllerInstructions />} />
        <Route path="/ControllerTrackInstruction" element={<ControllerTrackInstruction />} />
        <Route path="/ControllerViewAssignment" element={<ControllerViewAssignment />} />
        <Route path="/ControllerInstructionDetails" element={<ControllerInstructionDetails />} />

          {/* //Finance Clerk Routes */}
        <Route path="/instructions" element={<InstructionsList />} />
            <Route path="/update-instructions" element={<UpdateInstruction />} />
            <Route path="/Upload-Instruction-Documents" element={<UploadInstructionDocuments />} />
            <Route path="/invoices" element={<InvoicesList />} />
            <Route path="/view-client-statements" element={<ViewClientStatement />}/>
            <Route path="/statements-list" element={<StatementsList />} /> 
            <Route path="/wages" element={<Wages />} />
            <Route path="/expenses" element={<FExpenses />} />
            <Route path="/client-invoice" element={<ClientInvoice />} />
            <Route path="/FDashboard" element={<FDashboard />} />
            <Route path="/finance-clerk-wage" element={<FinanceClerkWage />} />
            <Route path="/finance-clerk-wage-details/:id" element={<FinanceClerkWageDetails />} />
            <Route path="/finance-clerk-wage-slip/:id" element={<FinanceClerkWageSlip />} />
            <Route path="/client-statement" element={<ClientStatement />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="container">
        <DynamicHeader />
        <ContentWrapper />
      </div>
    </Router>
  );
}



export default App;
