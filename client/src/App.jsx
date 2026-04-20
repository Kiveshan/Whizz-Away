"use client";
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import TokenExpiryNotification from "./components/TokenExpiryNotification";
import Header from "./components/Header";
import Footer from "./components/Footer"; // Import the Footer component
import LogoutButton from "./components/LogoutButton";
import LandingPage from "./pages/user_menus/views/LandingPage";
import ProtectedRoute from "./components/ProtectedRoute";

// Import pages
import {
  Landing,
  ControllerDashboard,
  FDashboard,
  DirectorDashboard,
  Dashboard,
  Debtors,
  DirectorDebtors,
  DirectorCreditorsDash,
  DebtorsDashboard,
  DirectorCreditorsOther,
  CreditorsOther,
  CreditorsDashboard,
  AnalyticsReportsPage,
  ReportsPage,
} from "./pages/user_menus";
import { Login, Register } from "./pages/auth";
import {
  ControllerInstructions,
  ControllerInstructionDetails,
  FCcontrollerinstructions,
  ViewClientInstruction,
  Viewcontrollerinstructions,
  FCcontrollerInstructionDetails,
  ViewcontrollerInstructionDetails,
  CompanyInstructions,
  CompanyInstructionView,
  InstructionsList,
} from "./pages/instructions";
import {
  ViewExpense,
  ExpenseDetails,
  ExpenseSubmission,
  DirectorManagerViewFuelExpense,
  DirectorExpenses,
} from "./pages/fuel";
import { DirectorAnalytics } from "./pages/analytics";
import Manage from "./pages/manage/views/Manage";
import {
  ViewClientInvoice,
  InvoicesList,
  ClientInvoice,
} from "./pages/invoices";
import {
  ViewClientStatement,
  StatementsList,
  ClientStatement,
} from "./pages/statements";
import {
  DirectorFinancialDocumentsView,
  DirectorClientDocuments,
  ClientDocuments,
  FinancialDocumentsView,
} from "./pages/financial_documents";
import {
  FinanceClerkWage,
  FinanceClerkWageDetails,
  FClerkLegDetails,
  FinanceClerkWageSlip,
} from "./pages/wages";
import {
  DirectorClientListPay,
  DirectorClientPaymentList,
  ClientPayments,
  ClientListPay,
  UploadProof,
} from "./pages/payments";
import {
  UpdateInstruction,
  DirectorManagerViewAssignment,
  UploadInstructionDocuments,
  DirectorDocs,
} from "./pages/assignments";
import { AdminDashboard } from "./pages/admin";

// Finance Clerk Pages
import {
  CreatePO,
  POForm,
  FilterPO,
  ViewPOForm,
  CredStatements,
  ViewStatement,
  SubcontractorList,
  SubcontractorStatements,
  SubcontractorStatementDetails,
  CredClientList,
  CreditNoteList,
  CreditNoteForm,
  CreditNoteView,
} from "./pages/Creditors";

import { ClientList, AddOnList, AddOnForm } from "./pages/add-on's";
import {
  WageReports,
  ProfitLossReportsPage,
  ProfitLossDetailPage,
  ClientSubbieCommissionReport,
} from "./pages/Reports";

// CSS Imports
import "./css/components.css";
import "./css/layout.css";
import "./css/MonitorInstructions.css";

function DynamicHeader() {
  const location = useLocation();
  const titleMap = {
    "/Dashboard": "Business Manager",
    "/client-payments": "Client Payments",
    "/client-list-payments": "Client Payments",
    "/director-client-list-payments": "Client Payments",
    "/client-documents": "Client Documents",
    "/driver-wage": "Wages",
    "/ControllerInstructions": "Instruction",
    "/ControllerInstructionDetails": "Container Details",
    "/FCcontrollerInstructionDetails": "Container Details",
    "/expenses": "Truck Expenses",
    "/debtors": "Debtors",
    "/FDashboard": "Debtors Clerk",
    "/instructions": "Instruction",
    "/update-instructions": "Assignment",
    "/Upload-Instruction-Documents": "Instruction Documents",
    "/invoices": "Invoices",
    "/client-invoice": "Invoices",
    "/view-client-statements": "Statements",
    "/statements-list": "Statements",
    "/client-statement": "Statements",
    "/wages": "Wages",
    "/finance-clerk-wage": "Wages",
    "/finance-clerk-wage-details": "Wages",
    "/finance-clerk-wage-slip": "Wages",
    "/ViewExpense": "Fuel Expenses",
    "/ExpenseDetails": "Fuel Expenses",
    "/ExpenseSubmission": "Expense",
    "/manage":                            "Manage",
    "/ViewClientInstruction": "Clients",
    "/ViewClientInvoice": "Invoice",
    "/DebtorsDashboard": "Debtors",
    "/CreditorsDashboard": "Creditors",
    "/FuelPage": "Fuel",
    "/DirectorDashboard": "Director",
    "/FClerkLegDetails": "Wages",
    "/ManagerViewAssignment": "View Assignment",
    "/FinancialDocumentsView": "Client Documents",
    "/Creditors/PurchaseOrders": "Purchase Orders",
    "/CompanyInstructionView": "Instruction ",
    "/CompanyInstructions": "Instruction ",
    "/Creditors/CreditorsOther": "Creditors",
    "/DirectorManagerViewAssignment": "View Assignment",
    "/DirectorDocs": "Documents",
    "/DirectorAnalytics": "Analytics",
    "/DirectorDebtors": "Debtors",
    "/DirectorClientPaymentList": "Debtors",
    "/DirectorFinancialDocumentsView": "Client Documents",
    "/DirectorClientDocuments": "Client Documents",
    "/DirectorCreditorsDash": "Creditors",
    "/DirectorManagerViewFuelExpense": "Truck Expenses",
    "/DirectorCreditorsOther": "Expenses",
    "/DirectorExpenses": "Truck Expenses",
    "/ControllerDashboard": "Controller",
    "/FCcontrollerinstructions": "Instruction",
    "/Viewcontrollerinstructions": "Instruction",
    "/ViewcontrollerInstructionDetails": "Container Details",
    "/AdminDashboard": "Admin",
    "/Creditors/CreatePO": "Expenses",
    "/Creditors/POForm": "Purchase Order",
    "/Creditors/PurchaseOrder/View": "Purchase Order",
    "/Creditors/CredStatements": "Purchase Orders",
    "/Creditors/ViewStatement": "Statement of Expenses",
    "/Creditors/SubcontractorList": "Subcontractors",
    "/Creditors/SubcontractorStatements": "Subcontractors",
    "/Creditors/SubcontractorStatementDetails": "Subcontractor Statement",
    "/analytics-reports": "Insights",
    "/reports": "Reports",
    "/wage-reports": "Wage Reports",
    "/view-client-list": "Add On's",
    "/view-add-on-list": "Add On's",
    "/add-on-form": "Add On's",
    "/CredClientList": "Clients",
    "/credit-note-list": "Credit Notes",
    "/credit-note-form": "Credit Note Form",
    "/view-credit-note/:clientName/:creditNoteId": "Credit Note",
    "/profit-loss-reports": "Income & Expenditure Reports",
    "/income-expenditure-reports/:month/:year": "Income & Expenditure Report",
    "/client-subbie-commission": "Client Subbie Commission Report",
  };

  const getTitle = () => {
    if (location.pathname.startsWith("/upload"))
      return "Upload Proof of Payment";
    if (location.pathname.startsWith("/invoice/")) return "Tax Invoice";
    if (location.pathname.startsWith("/ExpenseDetails/"))
      return "Fuel Expenses";
    if (location.pathname.startsWith("/finance-clerk-wage-details/"))
      return "Wages";
    if (location.pathname.startsWith("/DirectorExpenses/"))
      return "Fuel Expenses";
    if (location.pathname.startsWith("/finance-clerk-wage-slip/"))
      return "Wages";
    if (location.pathname.startsWith("/view-credit-note/"))
      return "Credit Note";
    if (location.pathname.startsWith("/income-expenditure-reports/"))
      return "Income & Expenditure Report";
    return titleMap[location.pathname] || "Unknown Page";
  };

  // Update page title on every navigation
  React.useEffect(() => {
    document.title = getTitle() !== "Unknown Page" ? getTitle() : "Logistics App";
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  if (
    ["/login", "/register", "/", "/new-landing"].includes(location.pathname)
  ) {
    return null;
  }

  return <Header title={getTitle()} />;
}

function ContentWrapper() {
  const location = useLocation();
  const hideFooterOn = ["/login", "/register", "/"]; // hide global footer on landing
  const hideLogoutOn = ["/login", "/register", "/landing", "/new-landing", "/"]; // hide logout on landing
  const shouldShowFooter = !hideFooterOn.includes(location.pathname);
  const shouldShowLogout = !hideLogoutOn.includes(location.pathname);

  // Only show inline Back button for specific detail routes
  const isInvoiceDetail =
    location.pathname.startsWith("/invoice/") ||
    location.pathname === "/client-invoice";
  const isStatementDetail = location.pathname === "/client-statement";
  const isClientSubbieReport = location.pathname === "/client-subbie-commission";

  const showBackInTopBar =
    isInvoiceDetail || isStatementDetail || isClientSubbieReport;

  const getBackTarget = () => {
    if (isInvoiceDetail) return "/invoices";
    if (isStatementDetail) return "/statements-list";
    if (isClientSubbieReport) return "/reports";
    return null;
  };

  const backTarget = getBackTarget();

  return (
    <div className="content-area">
      {shouldShowLogout && (
        showBackInTopBar ? (
          <div className="top-actions-bar">
            {backTarget && (
              <button
                className="back-button-inline"
                onClick={() => {
                  if (window.history.length > 1) {
                    window.history.back();
                  } else if (backTarget) {
                    window.location.href = backTarget;
                  }
                }}
              >
                Back
              </button>
            )}
            <div className="logout-container">
              <LogoutButton />
            </div>
          </div>
        ) : (
          <div className="logout-container">
            <LogoutButton />
          </div>
        )
      )}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Business Manager (roleid 1) */}
        <Route path="/Dashboard" element={<ProtectedRoute allowedRoles={[1]}><Dashboard /></ProtectedRoute>} />
        <Route path="/debtors" element={<ProtectedRoute allowedRoles={[1]}><Debtors /></ProtectedRoute>} />
        <Route path="/manage" element={<ProtectedRoute allowedRoles={[1]}><Manage /></ProtectedRoute>} />

        {/* Controller (roleid 2) */}
        <Route path="/ControllerDashboard" element={<ProtectedRoute allowedRoles={[2]}><ControllerDashboard /></ProtectedRoute>} />
        <Route path="/ControllerInstructions" element={<ProtectedRoute allowedRoles={[2]}><ControllerInstructions /></ProtectedRoute>} />
        <Route path="/ControllerInstructionDetails" element={<ProtectedRoute allowedRoles={[2]}><ControllerInstructionDetails /></ProtectedRoute>} />

        {/* Finance Clerk (roleid 3) */}
        <Route path="/FDashboard" element={<ProtectedRoute allowedRoles={[3]}><FDashboard /></ProtectedRoute>} />
        <Route path="/instructions" element={<ProtectedRoute allowedRoles={[3]}><InstructionsList /></ProtectedRoute>} />
        <Route path="/FCcontrollerinstructions" element={<ProtectedRoute allowedRoles={[3]}><FCcontrollerinstructions /></ProtectedRoute>} />
        <Route path="/FCcontrollerInstructionDetails" element={<ProtectedRoute allowedRoles={[3]}><FCcontrollerInstructionDetails /></ProtectedRoute>} />
        <Route path="/invoices" element={<ProtectedRoute allowedRoles={[3]}><InvoicesList /></ProtectedRoute>} />
        <Route path="/view-client-statements" element={<ProtectedRoute allowedRoles={[3]}><ViewClientStatement /></ProtectedRoute>} />
        <Route path="/statements-list" element={<ProtectedRoute allowedRoles={[3]}><StatementsList /></ProtectedRoute>} />
        <Route path="/client-invoice" element={<ProtectedRoute allowedRoles={[3]}><ClientInvoice /></ProtectedRoute>} />
        <Route path="/invoice/:id" element={<ProtectedRoute allowedRoles={[3]}><ClientInvoice /></ProtectedRoute>} />
        <Route path="/invoice/:id/download" element={<ProtectedRoute allowedRoles={[3]}><ClientInvoice /></ProtectedRoute>} />
        <Route path="/client-statement" element={<ProtectedRoute allowedRoles={[3]}><ClientStatement /></ProtectedRoute>} />
        <Route path="/finance-clerk-wage" element={<ProtectedRoute allowedRoles={[3]}><FinanceClerkWage /></ProtectedRoute>} />
        <Route path="/finance-clerk-wage-details/:userid" element={<ProtectedRoute allowedRoles={[3]}><FinanceClerkWageDetails /></ProtectedRoute>} />
        <Route path="/finance-clerk-wage-slip/:id" element={<ProtectedRoute allowedRoles={[3]}><FinanceClerkWageSlip /></ProtectedRoute>} />
        <Route path="/FClerkLegDetails" element={<ProtectedRoute allowedRoles={[3]}><FClerkLegDetails /></ProtectedRoute>} />
        <Route path="/update-instructions" element={<ProtectedRoute allowedRoles={[3]}><UpdateInstruction /></ProtectedRoute>} />
        <Route path="/Upload-Instruction-Documents" element={<ProtectedRoute allowedRoles={[3]}><UploadInstructionDocuments /></ProtectedRoute>} />
        <Route path="/ViewClientInstruction" element={<ProtectedRoute allowedRoles={[3]}><ViewClientInstruction /></ProtectedRoute>} />
        <Route path="/ViewClientInvoice" element={<ProtectedRoute allowedRoles={[3]}><ViewClientInvoice /></ProtectedRoute>} />
        <Route path="/client-payments" element={<ProtectedRoute allowedRoles={[3]}><ClientPayments /></ProtectedRoute>} />
        <Route path="/client-list-payments" element={<ProtectedRoute allowedRoles={[3]}><ClientListPay /></ProtectedRoute>} />
        <Route path="/FinancialDocumentsView" element={<ProtectedRoute allowedRoles={[3]}><FinancialDocumentsView /></ProtectedRoute>} />
        <Route path="/client-documents" element={<ProtectedRoute allowedRoles={[3]}><ClientDocuments /></ProtectedRoute>} />
        <Route path="/ViewExpense" element={<ProtectedRoute allowedRoles={[3]}><ViewExpense /></ProtectedRoute>} />
        <Route path="/ExpenseDetails/:truckId" element={<ProtectedRoute allowedRoles={[3]}><ExpenseDetails /></ProtectedRoute>} />
        <Route path="/ExpenseSubmission" element={<ProtectedRoute allowedRoles={[3]}><ExpenseSubmission /></ProtectedRoute>} />
        <Route path="/FuelPage" element={<ProtectedRoute allowedRoles={[3]}><ViewExpense /></ProtectedRoute>} />
        <Route path="/Creditors/CreditorsOther" element={<ProtectedRoute allowedRoles={[3]}><CreditorsOther /></ProtectedRoute>} />
        <Route path="/Creditors/CreatePO" element={<ProtectedRoute allowedRoles={[3, 8]}><CreatePO /></ProtectedRoute>} />
        <Route path="/Creditors/POForm" element={<ProtectedRoute allowedRoles={[3, 8]}><POForm /></ProtectedRoute>} />
        <Route path="/Creditors/PurchaseOrders" element={<ProtectedRoute allowedRoles={[3, 8]}><FilterPO /></ProtectedRoute>} />
        <Route path="/Creditors/CredStatements" element={<ProtectedRoute allowedRoles={[3, 8]}><CredStatements /></ProtectedRoute>} />
        <Route path="/Creditors/PurchaseOrder/View" element={<ProtectedRoute allowedRoles={[3, 8]}><ViewPOForm /></ProtectedRoute>} />
        <Route path="/Creditors/ViewStatement" element={<ProtectedRoute allowedRoles={[3, 8]}><ViewStatement /></ProtectedRoute>} />
        <Route path="/Creditors/SubcontractorList" element={<ProtectedRoute allowedRoles={[3, 8]}><SubcontractorList /></ProtectedRoute>} />
        <Route path="/Creditors/SubcontractorStatements" element={<ProtectedRoute allowedRoles={[3, 8]}><SubcontractorStatements /></ProtectedRoute>} />
        <Route path="/Creditors/SubcontractorStatementDetails" element={<ProtectedRoute allowedRoles={[3, 8]}><SubcontractorStatementDetails /></ProtectedRoute>} />
        <Route path="/CreditorsDashboard" element={<ProtectedRoute allowedRoles={[3, 8]}><CreditorsDashboard /></ProtectedRoute>} />
        <Route path="/CredClientList" element={<ProtectedRoute allowedRoles={[3, 8]}><CredClientList /></ProtectedRoute>} />
        <Route path="/credit-note-list" element={<ProtectedRoute allowedRoles={[3, 8]}><CreditNoteList /></ProtectedRoute>} />
        <Route path="/credit-note-form" element={<ProtectedRoute allowedRoles={[3, 8]}><CreditNoteForm /></ProtectedRoute>} />
        <Route path="/view-credit-note/:clientName/:creditNoteId" element={<ProtectedRoute allowedRoles={[3, 8]}><CreditNoteView /></ProtectedRoute>} />

        {/* Director (roleid 4) */}
        <Route path="/DirectorDashboard" element={<ProtectedRoute allowedRoles={[4]}><DirectorDashboard /></ProtectedRoute>} />
        <Route path="/DirectorDebtors" element={<ProtectedRoute allowedRoles={[4]}><DirectorDebtors /></ProtectedRoute>} />
        <Route path="/DirectorClientPaymentList" element={<ProtectedRoute allowedRoles={[4]}><DirectorClientPaymentList /></ProtectedRoute>} />
        <Route path="/director-client-list-payments" element={<ProtectedRoute allowedRoles={[4]}><DirectorClientListPay /></ProtectedRoute>} />
        <Route path="/DirectorFinancialDocumentsView" element={<ProtectedRoute allowedRoles={[4]}><DirectorFinancialDocumentsView /></ProtectedRoute>} />
        <Route path="/DirectorClientDocuments" element={<ProtectedRoute allowedRoles={[4]}><DirectorClientDocuments /></ProtectedRoute>} />
        <Route path="/DirectorCreditorsDash" element={<ProtectedRoute allowedRoles={[4]}><DirectorCreditorsDash /></ProtectedRoute>} />
        <Route path="/DirectorCreditorsOther" element={<ProtectedRoute allowedRoles={[4]}><DirectorCreditorsOther /></ProtectedRoute>} />
        <Route path="/DirectorManagerViewAssignment" element={<ProtectedRoute allowedRoles={[4]}><DirectorManagerViewAssignment /></ProtectedRoute>} />
        <Route path="/DirectorDocs" element={<ProtectedRoute allowedRoles={[4]}><DirectorDocs /></ProtectedRoute>} />
        <Route path="/DirectorAnalytics" element={<ProtectedRoute allowedRoles={[4]}><DirectorAnalytics /></ProtectedRoute>} />
        <Route path="/DirectorManagerViewFuelExpense" element={<ProtectedRoute allowedRoles={[4]}><DirectorManagerViewFuelExpense /></ProtectedRoute>} />
        <Route path="/DirectorExpenses/:truckId" element={<ProtectedRoute allowedRoles={[4]}><DirectorExpenses /></ProtectedRoute>} />
        <Route path="/analytics-reports" element={<ProtectedRoute allowedRoles={[4]}><AnalyticsReportsPage /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute allowedRoles={[4]}><ReportsPage /></ProtectedRoute>} />
        <Route path="/wage-reports" element={<ProtectedRoute allowedRoles={[4]}><WageReports /></ProtectedRoute>} />
        <Route path="/profit-loss-reports" element={<ProtectedRoute allowedRoles={[4]}><ProfitLossReportsPage /></ProtectedRoute>} />
        <Route path="/income-expenditure-reports/:month/:year" element={<ProtectedRoute allowedRoles={[4]}><ProfitLossDetailPage /></ProtectedRoute>} />
        <Route path="/client-subbie-commission" element={<ProtectedRoute allowedRoles={[4]}><ClientSubbieCommissionReport /></ProtectedRoute>} />
        <Route path="/DebtorsDashboard" element={<ProtectedRoute allowedRoles={[4]}><DebtorsDashboard /></ProtectedRoute>} />

        {/* Admin (roleid 7) */}
        <Route path="/AdminDashboard" element={<ProtectedRoute allowedRoles={[7]}><AdminDashboard /></ProtectedRoute>} />

        {/* Creditors Clerk (roleid 8) */}

        {/* Shared / multi-role */}
        <Route path="/Viewcontrollerinstructions" element={<ProtectedRoute allowedRoles={[2, 3, 4]}><Viewcontrollerinstructions /></ProtectedRoute>} />
        <Route path="/ViewcontrollerInstructionDetails" element={<ProtectedRoute allowedRoles={[2, 3, 4]}><ViewcontrollerInstructionDetails /></ProtectedRoute>} />
        <Route path="/CompanyInstructionView" element={<ProtectedRoute allowedRoles={[1, 4]}><CompanyInstructionView /></ProtectedRoute>} />
        <Route path="/CompanyInstructions" element={<ProtectedRoute allowedRoles={[1, 4]}><CompanyInstructions /></ProtectedRoute>} />
        <Route path="/ManagerViewAssignment" element={<ProtectedRoute allowedRoles={[1, 4]}><DirectorManagerViewAssignment /></ProtectedRoute>} />
        <Route path="/upload/:clientName" element={<ProtectedRoute><UploadProof /></ProtectedRoute>} />
        <Route path="/upload-proof/:clientName/:paymentId?" element={<ProtectedRoute><UploadProof /></ProtectedRoute>} />
        <Route path="/view-client-list" element={<ProtectedRoute allowedRoles={[1, 3, 4]}><ClientList /></ProtectedRoute>} />
        <Route path="/view-add-on-list" element={<ProtectedRoute allowedRoles={[1, 3, 4]}><AddOnList /></ProtectedRoute>} />
        <Route path="/add-on-form" element={<ProtectedRoute allowedRoles={[1, 3, 4]}><AddOnForm /></ProtectedRoute>} />

        {/* Invoice redirect */}
        <Route path="/invoice" element={<Navigate to="/invoices" replace />} />
      </Routes>
      {shouldShowFooter && <Footer />} {/* Conditionally render footer */}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="container">
          <TokenExpiryNotification />
          <DynamicHeader />
          <ContentWrapper />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
