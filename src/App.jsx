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
// import "./css/card.css";
import "./css/components.css";
// import "./css/dashboard.css";
import "./css/layout.css";
import "./css/MonitorInstructions.css"



function DynamicHeader() {
  const location = useLocation();

  const titleMap = {
    "/": "Dashboard",
    "/monitor-instructions": "Instructions",
    "/client-payments": "Client Payments",
    "/client-documents": "Client Documents",
    "/driver-wage": "Wages",
    "/expenses": "Truck Expenses",
    "/analytics":"Analytics",
    "/debtors":"Debtors",
    "/manage":"Manage"
  };

  const getTitle = () => {
    if (location.pathname.startsWith("/upload")) return "Upload Payment Proof";
    return titleMap[location.pathname] || "Unknown Page";
  };
  

   // Fixed the case sensitivity in the path checks
   if (
    location.pathname === "/login" || 
    location.pathname === "/register" || 
    location.pathname === "/landing" || 
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
      <Route path="/" element={<Dashboard />} />
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
        <Route path="/register" element={<Register />} />
        
        <Route path="/landing" element={<Landing />} /> {/* Keep original landing page */}
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
