"use client";
import React, { lazy, Suspense } from "react";
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
import { RequireAuth, RoleGuard } from "./components/ProtectedRoute";

import Login from "./pages/auth/views/Login.jsx";

// Pages are lazy-loaded so each one (and heavy libs it pulls in, e.g. exceljs,
// jspdf, html2pdf, chart libraries) is fetched only when its route is opened,
// instead of every user downloading the whole app up front. The landing and
// login pages stay eager since they're the entry points.

// Route-level dashboards / menus
const ControllerDashboard = lazy(() => import("./pages/user_menus/views/ControllerDashboard.jsx"));
const FDashboard = lazy(() => import("./pages/user_menus/views/FDashboard.jsx"));
const DirectorDashboard = lazy(() => import("./pages/user_menus/views/DirectorDashboard.jsx"));
const Dashboard = lazy(() => import("./pages/user_menus/views/Dashboard.jsx"));
const Debtors = lazy(() => import("./pages/user_menus/views/Debtors.jsx"));
const DirectorDebtors = lazy(() => import("./pages/user_menus/views/DirectorDebtors.jsx"));
const DirectorCreditorsDash = lazy(() => import("./pages/user_menus/views/DirectorCreditorsDash.jsx"));
const DebtorsDashboard = lazy(() => import("./pages/user_menus/views/DebtorsDashboard.jsx"));
const DirectorCreditorsOther = lazy(() => import("./pages/user_menus/views/DirectorCreditorsOther.jsx"));
const CreditorsOther = lazy(() => import("./pages/user_menus/views/CreditorsOther.jsx"));
const CreditorsDashboard = lazy(() => import("./pages/user_menus/views/CreditorsDashboard.jsx"));
const AnalyticsReportsPage = lazy(() => import("./pages/user_menus/views/AnalyticsReportsPage.jsx"));
const ReportsPage = lazy(() => import("./pages/user_menus/views/ReportsPage.jsx"));

// Auth
const Register = lazy(() => import("./pages/auth/views/Register.jsx"));

// Instructions
const ControllerInstructions = lazy(() => import("./pages/instructions/createInstruction/views/ControllerInstructions.jsx"));
const ControllerInstructionDetails = lazy(() => import("./pages/instructions/createInstruction/views/ControllerInstructionDetails.jsx"));
const CompanyInstructionView = lazy(() => import("./pages/instructions/lists/views/CompanyInstructionView.jsx"));
const CompanyInstructions = lazy(() => import("./pages/instructions/lists/views/CompanyInstructions.jsx"));
const ViewClientInstruction = lazy(() => import("./pages/instructions/lists/views/ViewClientInstruction.jsx"));
const InstructionsList = lazy(() => import("./pages/instructions/lists/views/InstructionsList.jsx"));
const Viewcontrollerinstructions = lazy(() => import("./pages/instructions/viewInstruction/views/Viewcontrollerinstructions.jsx"));
const ViewcontrollerInstructionDetails = lazy(() => import("./pages/instructions/viewInstruction/views/ViewcontrollerInstructionDetails.jsx"));
const FCcontrollerinstructions = lazy(() => import("./pages/instructions/updateInstruction/views/FCcontrollerinstructions.jsx"));
const FCcontrollerInstructionDetails = lazy(() => import("./pages/instructions/updateInstruction/views/FCcontrollerInstructionDetails.jsx"));

// Fuel
const ViewExpense = lazy(() => import("./pages/fuel/views/ViewExpense.jsx"));
const ExpenseDetails = lazy(() => import("./pages/fuel/views/ExpenseDetails.jsx"));
const ExpenseSubmission = lazy(() => import("./pages/fuel/views/ExpenseSubmission.jsx"));
const DirectorManagerViewFuelExpense = lazy(() => import("./pages/fuel/views/DirectorManagerViewFuelExpense.jsx"));
const DirectorExpenses = lazy(() => import("./pages/fuel/views/DirectorExpenses.jsx"));

// Analytics / manage
const DirectorAnalytics = lazy(() => import("./pages/analytics/views/DirectorAnalytics.jsx"));
const Manage = lazy(() => import("./pages/manage/views/Manage.jsx"));

// Invoices
const ViewClientInvoice = lazy(() => import("./pages/invoices/views/ViewClientInvoice.jsx"));
const InvoicesList = lazy(() => import("./pages/invoices/views/InvoicesList.jsx"));
const ClientInvoice = lazy(() => import("./pages/invoices/views/ClientInvoice.jsx"));

// Statements
const ViewClientStatement = lazy(() => import("./pages/statements/views/ViewClientStatements.jsx"));
const StatementsList = lazy(() => import("./pages/statements/views/StatementsList.jsx"));
const ClientStatement = lazy(() => import("./pages/statements/views/ClientStatement.jsx"));

// Financial documents
const DirectorFinancialDocumentsView = lazy(() => import("./pages/financial_documents/views/DirectorFinancialDocumentsView.jsx"));
const DirectorClientDocuments = lazy(() => import("./pages/financial_documents/views/DirectorClientDocuments.jsx"));
const ClientDocuments = lazy(() => import("./pages/financial_documents/views/ClientDocuments.jsx"));
const FinancialDocumentsView = lazy(() => import("./pages/financial_documents/views/FinancialDocumentsView.jsx"));

// Wages
const FinanceClerkWage = lazy(() => import("./pages/wages/views/finance-clerk-wage.jsx"));
const FinanceClerkWageDetails = lazy(() => import("./pages/wages/views/finance-clerk-wage-details.jsx"));
const FClerkLegDetails = lazy(() => import("./pages/wages/views/FClerkLegDetails.jsx"));
const FinanceClerkWageSlip = lazy(() => import("./pages/wages/views/finance-clerk-wage-slip.jsx"));

// Payments
const DirectorClientListPay = lazy(() => import("./pages/payments/views/DirectorClientListPay.jsx"));
const DirectorClientPaymentList = lazy(() => import("./pages/payments/views/DirectorClientPaymentList.jsx"));
const ClientPayments = lazy(() => import("./pages/payments/views/ClientPaymentList.jsx"));
const ClientListPay = lazy(() => import("./pages/payments/views/ClientListPay.jsx"));
const UploadProof = lazy(() => import("./pages/payments/views/UploadProof.jsx"));

// Assignments
const UpdateInstruction = lazy(() => import("./pages/assignments/views/UpdateInstuction.jsx"));
const DirectorManagerViewAssignment = lazy(() => import("./pages/assignments/views/DirectorManagerViewAssignment.jsx"));
const UploadInstructionDocuments = lazy(() => import("./pages/assignments/views/UploadInstructionDocuments.jsx"));
const DirectorDocs = lazy(() => import("./pages/assignments/views/DirectorDocs.jsx"));

// Admin
const AdminDashboard = lazy(() => import("./pages/admin/views/AdminDashboard.jsx"));

// Creditors
const CreatePO = lazy(() => import("./pages/Creditors/purchaseOrder/views/CreatePO.jsx"));
const POForm = lazy(() => import("./pages/Creditors/purchaseOrder/views/POForm.jsx"));
const FilterPO = lazy(() => import("./pages/Creditors/purchaseOrder/views/FilterPO.jsx"));
const ViewPOForm = lazy(() => import("./pages/Creditors/purchaseOrder/views/ViewPOForm.jsx"));
const CredStatements = lazy(() => import("./pages/Creditors/Statements/views/CredStatements.jsx"));
const ViewStatement = lazy(() => import("./pages/Creditors/Statements/views/ViewStatement.jsx"));
const SubcontractorList = lazy(() => import("./pages/Creditors/subContractors/views/SubcontractorList.jsx"));
const SubcontractorStatements = lazy(() => import("./pages/Creditors/subContractors/views/SubcontractorStatements.jsx"));
const SubcontractorStatementDetails = lazy(() => import("./pages/Creditors/subContractors/views/SubcontractorStatementDetails.jsx"));
const CredClientList = lazy(() => import("./pages/Creditors/CreditNote/CredClientList.jsx"));
const CreditNoteList = lazy(() => import("./pages/Creditors/CreditNote/CreditNoteList.jsx"));
const CreditNoteForm = lazy(() => import("./pages/Creditors/CreditNote/CreditNoteForm.jsx"));
const CreditNoteView = lazy(() => import("./pages/Creditors/CreditNote/CreditNoteView.jsx"));

// Add-ons / debtors
const ClientList = lazy(() => import("./pages/add-ons/views/ClientList.jsx"));
const AddOnList = lazy(() => import("./pages/add-ons/views/AddOnList.jsx"));
const AddOnForm = lazy(() => import("./pages/add-ons/views/AddOnForm.jsx"));
const DebtorsAgeAnalysis = lazy(() => import("./pages/debtors/views/DebtorsAgeAnalysis.jsx"));

// Reports
const WageReports = lazy(() => import("./pages/Reports/views/WageReportsPage.jsx"));
const DriverRateAuditReport = lazy(() => import("./pages/Reports/views/DriverRateAuditReport.jsx"));
const AuditLogReport = lazy(() => import("./pages/Reports/views/AuditLogReport.jsx"));
const IncompleteInstructionsReport = lazy(() => import("./pages/Reports/views/IncompleteInstructionsReport.jsx"));
const ProfitLossReportsPage = lazy(() => import("./pages/Reports/views/ProfitLossReportsPage.jsx"));
const ProfitLossDetailPage = lazy(() => import("./pages/Reports/views/ProfitLossDetailPage.jsx"));
const ClientSubbieCommissionReport = lazy(() => import("./pages/Reports/views/ClientSubbieCommissionReport.jsx"));
const VatReconReportPage = lazy(() => import("./pages/Reports/views/VatReconReportPage.jsx"));

function DynamicHeader() {
  const location = useLocation();
  const titleMap = {
    "/Dashboard": "Business Manager",
    "/client-payments": "Client Payments",
    "/client-list-payments": "Client Payments",
    "/director-client-list-payments": "Client Payments",
    "/client-documents": "Client Documents",
    "/driver-wage": "Payroll",
    "/ControllerInstructions": "Instruction",
    "/ControllerInstructionDetails": "Container Details",
    "/FCcontrollerInstructionDetails": "Container Details",
    "/expenses": "Truck Expenses",
    "/debtors": "Debtors",
    "/debtors-age-analysis": "Age Analysis",
    "/FDashboard": "Debtors Clerk",
    "/instructions": "Instruction",
    "/update-instructions": "Assignment",
    "/Upload-Instruction-Documents": "Instruction Documents",
    "/invoices": "Invoices",
    "/client-invoice": "Invoices",
    "/view-client-statements": "Statements",
    "/statements-list": "Statements",
    "/client-statement": "Statements",
    "/wages": "Payroll",
    "/finance-clerk-wage": "Payroll",
    "/finance-clerk-wage-details": "Payroll",
    "/finance-clerk-wage-slip": "Payroll",
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
    "/FClerkLegDetails": "Payroll",
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
    "/reports/business": "Business Reports",
    "/reports/maintenance": "Maintenance & Audits",
    "/wage-reports": "Wage Reports",
    "/driver-rate-audit": "Driver Rate Audit",
    "/audit-log": "Audit Log",
    "/incomplete-instructions": "Incomplete Instructions",
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
    "/vat-recon-reports": "VAT Reconciliation Report",
  };

  const getTitle = () => {
    if (location.pathname.startsWith("/upload"))
      return "Upload Proof of Payment";
    if (location.pathname.startsWith("/invoice/")) return "Tax Invoice";
    if (location.pathname.startsWith("/ExpenseDetails/"))
      return "Fuel Expenses";
    if (location.pathname.startsWith("/finance-clerk-wage-details/"))
      return "Payroll";
    if (location.pathname.startsWith("/DirectorExpenses/"))
      return "Fuel Expenses";
    if (location.pathname.startsWith("/finance-clerk-wage-slip/"))
      return "Payroll";
    if (location.pathname.startsWith("/view-credit-note/"))
      return "Credit Note";
    if (location.pathname.startsWith("/income-expenditure-reports/"))
      return "Income & Expenditure Report";
    if (location.pathname === "/vat-recon-reports")
      return "VAT Reconciliation Report";
    return titleMap[location.pathname] || "Unknown Page";
  };

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
  const isSubbieStatements =
    location.pathname === "/Creditors/SubcontractorStatements";
  const isSubbieStatementDetail =
    location.pathname === "/Creditors/SubcontractorStatementDetails";

  const showBackInTopBar =
    isInvoiceDetail ||
    isStatementDetail ||
    isClientSubbieReport ||
    isSubbieStatements ||
    isSubbieStatementDetail;

  const getBackTarget = () => {
    if (isInvoiceDetail) return "/invoices";
    if (isStatementDetail) return "/statements-list";
    if (isClientSubbieReport) return "/reports/business";
    if (isSubbieStatements) return "/Creditors/SubcontractorList";
    if (isSubbieStatementDetail) return "/Creditors/SubcontractorStatements";
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
      <Suspense fallback={<div className="loading">Loading...</div>}>
      <Routes>
        {/* ---------- Public (pre-auth) routes ---------- */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* ---------- Authenticated routes (require a valid session) ---------- */}
        {/* RequireAuth = logged in; RoleGuard = enforces the ROUTE_ROLES matrix. */}
        <Route element={<RequireAuth />}>
        <Route element={<RoleGuard />}>
        <Route
          path="/view-credit-note/:clientName/:creditNoteId"
          element={<CreditNoteView />}
        />
        <Route path="/credit-note-form" element={<CreditNoteForm />} />
        <Route path="/credit-note-list" element={<CreditNoteList />} />
        <Route path="/CredClientList" element={<CredClientList />} />
        <Route path="/client-payments" element={<ClientPayments />} />
        <Route path="/client-list-payments" element={<ClientListPay />} />
        <Route
          path="/director-client-list-payments"
          element={<DirectorClientListPay />}
        />
        <Route path="/client-documents" element={<ClientDocuments />} />
        <Route path="/upload/:clientName" element={<UploadProof />} />
        <Route
          path="/upload-proof/:clientName/:paymentId?"
          element={<UploadProof />}
        />
        <Route path="/debtors" element={<Debtors />} />
        <Route path="/debtors-age-analysis" element={<DebtorsAgeAnalysis />} />
        <Route path="/manage" element={<Manage />} />
        <Route path="/Dashboard" element={<Dashboard />} />
        <Route path="/ControllerDashboard" element={<ControllerDashboard />} />
        <Route path="/DirectorDashboard" element={<DirectorDashboard />} />
        <Route
          path="/ControllerInstructions"
          element={<ControllerInstructions />}
        />
        <Route
          path="/ControllerInstructionDetails"
          element={<ControllerInstructionDetails />}
        />
        <Route
          path="/FinancialDocumentsView"
          element={<FinancialDocumentsView />}
        />
        <Route
          path="/CompanyInstructionView"
          element={<CompanyInstructionView />}
        />
        <Route
          path="/DirectorCreditorsOther"
          element={<DirectorCreditorsOther />}
        />
        <Route path="/CompanyInstructions" element={<CompanyInstructions />} />
        <Route
          path="/DirectorManagerViewAssignment"
          element={<DirectorManagerViewAssignment />}
        />
        <Route path="/DirectorDocs" element={<DirectorDocs />} />
        <Route path="/DirectorAnalytics" element={<DirectorAnalytics />} />
        <Route path="/DirectorDebtors" element={<DirectorDebtors />} />
        <Route
          path="/DirectorClientPaymentList"
          element={<DirectorClientPaymentList />}
        />
        <Route
          path="/DirectorFinancialDocumentsView"
          element={<DirectorFinancialDocumentsView />}
        />
        <Route
          path="/DirectorClientDocuments"
          element={<DirectorClientDocuments />}
        />
        <Route
          path="/DirectorCreditorsDash"
          element={<DirectorCreditorsDash />}
        />
        <Route
          path="/DirectorManagerViewFuelExpense"
          element={<DirectorManagerViewFuelExpense />}
        />
        <Route
          path="/DirectorExpenses/:truckId"
          element={<DirectorExpenses />}
        />
        <Route
          path="/Viewcontrollerinstructions"
          element={<Viewcontrollerinstructions />}
        />
        <Route
          path="/ViewcontrollerInstructionDetails"
          element={<ViewcontrollerInstructionDetails />}
        />
        {/* Admin-only (gated by ROUTE_ROLES via RoleGuard) */}
        <Route path="/AdminDashboard" element={<AdminDashboard />} />
        {/* Finance Clerk Routes */}
        <Route path="/instructions" element={<InstructionsList />} />
        <Route path="/update-instructions" element={<UpdateInstruction />} />
        <Route
          path="/Upload-Instruction-Documents"
          element={<UploadInstructionDocuments />}
        />
        <Route path="/invoices" element={<InvoicesList />} />
        <Route
          path="/view-client-statements"
          element={<ViewClientStatement />}
        />
        <Route path="/statements-list" element={<StatementsList />} />
        <Route path="/client-invoice" element={<ClientInvoice />} />
        <Route path="/FDashboard" element={<FDashboard />} />
        <Route path="/finance-clerk-wage" element={<FinanceClerkWage />} />
        <Route
          path="/finance-clerk-wage-details/:userid"
          element={<FinanceClerkWageDetails />}
        />
        <Route
          path="/finance-clerk-wage-slip/:id"
          element={<FinanceClerkWageSlip />}
        />
        <Route path="/client-statement" element={<ClientStatement />} />
        <Route path="/ViewExpense" element={<ViewExpense />} />
        <Route path="/ExpenseDetails/:truckId" element={<ExpenseDetails />} />
        <Route path="/ExpenseSubmission" element={<ExpenseSubmission />} />
        <Route
          path="/ViewClientInstruction"
          element={<ViewClientInstruction />}
        />
        <Route path="/ViewClientInvoice" element={<ViewClientInvoice />} />
        <Route path="/Creditors/CreditorsOther" element={<CreditorsOther />} />
        <Route path="/Creditors/CreatePO" element={<CreatePO />} />
        <Route path="/Creditors/POForm" element={<POForm />} />
        <Route path="/Creditors/PurchaseOrders" element={<FilterPO />} />
        <Route path="/Creditors/CredStatements" element={<CredStatements />} />
        <Route path="/Creditors/PurchaseOrder/View" element={<ViewPOForm />} />
        <Route path="/Creditors/ViewStatement" element={<ViewStatement />} />
        <Route
          path="/Creditors/SubcontractorList"
          element={<SubcontractorList />}
        />
        <Route
          path="/Creditors/SubcontractorStatementDetails"
          element={<SubcontractorStatementDetails />}
        />
        <Route
          path="/Creditors/SubcontractorStatements"
          element={<SubcontractorStatements />}
        />
        {/* Add the routes for invoice viewing and downloading */}
        <Route path="/invoice" element={<Navigate to="/invoices" replace />} />
        <Route path="/invoice/:id" element={<ClientInvoice />} />
        <Route path="/invoice/:id/download" element={<ClientInvoice />} />
        <Route path="/DebtorsDashboard" element={<DebtorsDashboard />} />
        <Route path="/CreditorsDashboard" element={<CreditorsDashboard />} />
        <Route path="/FuelPage" element={<ViewExpense />} />
        <Route path="/FClerkLegDetails" element={<FClerkLegDetails />} />
        <Route
          path="/FCcontrollerinstructions"
          element={<FCcontrollerinstructions />}
        />
        <Route
          path="/FCcontrollerInstructionDetails"
          element={<FCcontrollerInstructionDetails />}
        />
        <Route path="/analytics-reports" element={<AnalyticsReportsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route
          path="/reports/business"
          element={<ReportsPage category="business" />}
        />
        <Route
          path="/reports/maintenance"
          element={<ReportsPage category="maintenance" />}
        />
        <Route path="/wage-reports" element={<WageReports />} />
        <Route path="/driver-rate-audit" element={<DriverRateAuditReport />} />
        <Route path="/audit-log" element={<AuditLogReport />} />
        <Route
          path="/incomplete-instructions"
          element={<IncompleteInstructionsReport />}
        />
        <Route
          path="/client-subbie-commission"
          element={<ClientSubbieCommissionReport />}
        />
        <Route path="/view-client-list" element={<ClientList />} />
        <Route path="/view-add-on-list" element={<AddOnList />} />
        <Route path="/add-on-form" element={<AddOnForm />} />
        <Route
          path="/profit-loss-reports"
          element={<ProfitLossReportsPage />}
        />
        <Route
          path="/income-expenditure-reports/:month/:year"
          element={<ProfitLossDetailPage />}
        />
        <Route
          path="/vat-recon-reports"
          element={<VatReconReportPage />}
        />
        </Route>
        </Route>
      </Routes>
      </Suspense>
      {shouldShowFooter && <Footer />} {/* Conditionally render footer */}
    </div>
  );
}

function App() {
  // Map of route paths to page titles
  const pageTitles = {
    "/": "Controller Dashboard",
    "/ControllerInstructions": "Controller Instructions",
    "/ControllerInstructionDetails": "Container Details",
    "/FDashboard": "Finance Clerk Dashboard",
    "/ViewClientInstruction": "View Client Instructions",
    "/FCcontrollerinstructions": "Finance Clerk Instructions",
    "/FCcontrollerInstructionDetails": "Finance Clerk Container Details",
    "/InstructionsList": "Instructions List",
    "/Viewcontrollerinstructions": "Viewcontrollerinstructions",
    "/ViewcontrollerInstructionDetails": "ViewcontrollerInstructionDetails",
    "/reports": "Reports",
    "/reports/business": "Business Reports",
    "/reports/maintenance": "Maintenance & Audits",
    "/wage-reports": "Wage Reports",
    "/driver-rate-audit": "Driver Rate Audit",
    "/audit-log": "Audit Log",
    "/profit-loss-reports": "Income & Expenditure Reports",
    "/income-expenditure-reports/:month/:year": "Income & Expenditure Report",
    "/vat-recon-reports": "VAT Reconciliation Report",
  };

  // Set page title based on current route
  React.useEffect(() => {
    const path = window.location.pathname;
    document.title = pageTitles[path] || "Logistics App";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
