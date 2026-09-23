// Every stylesheet in the app, loaded eagerly and in a fixed order.
//
// Pages are lazy-loaded (see App.jsx), but their CSS is not: if each page's CSS
// arrived with its chunk, it would be appended after the global styles and win
// cascade ties it currently loses, subtly changing how screens look. Importing
// it all here keeps main.css identical to the pre-lazy-loading build.
//
// The order matches that build's main.css. When adding a stylesheet to a page,
// also add it here (at the end is fine unless it has to lose to an earlier one).
import "./css/modal.module.css";
import "./pages/auth/css/login.module.css";
import "./pages/auth/css/register.module.css";
import "./pages/user_menus/css/index.css";
import "./pages/user_menus/css/controllerDashboard.css";
import "./pages/user_menus/css/card.css";
import "./pages/user_menus/css/dashboard.css";
import "./pages/user_menus/css/Debtors.css";
import "./pages/instructions/css/controllerinstruction.css";
import "./pages/instructions/css/containerdetails.css";
import "./css/components.css";
import "./css/error-modal.css";
import "./pages/instructions/css/CompanyInstructionView.css";
import "./pages/payments/css/ClientPayments.css";
import "./pages/instructions/css/InstructionsList.css";
import "./pages/instructions/css/ViewClientInstruction.css";
import "./pages/instructions/css/viewcontrollerinstructions.css";
import "./pages/fuel/css/Expenses1.css";
import "./pages/analytics/css/Analytics.css";
import "./pages/manage/css/Manage.css";
import "./pages/manage/css/pagination.css";
import "./pages/manage/css/additional-styles.css";
import "./pages/invoices/css/ViewClientInvoice.css";
import "./pages/invoices/css/InvoicesList.css";
import "./pages/invoices/css/InvoiceTemplate.css";
import "./pages/statements/css/ViewClientStatements.css";
import "./pages/statements/css/StatementList.css";
import "./pages/statements/css/ClientStatement.css";
import "./pages/financial_documents/css/FinancialDocView.css";
import "./pages/financial_documents/css/ClientDocuments.css";
import "./pages/wages/css/finance-clerk-wage.css";
import "./pages/wages/css/finance-clerk-wageslip.css";
import "./pages/payments/css/ClientListPay.css";
import "./pages/assignments/css/UpdateInstruction.css";
import "./pages/invoices/css/InvoicePreviewModal.css";
import "./pages/assignments/css/UploadInstructionDocuments.css";
import "./pages/admin/css/UserDetailView.css";
import "./pages/admin/css/UserApprovalList.css";
import "./pages/admin/css/CompanyManagement.css";
import "./pages/Reports/css/driverRateAudit.css";
import "./pages/Reports/css/auditLogReport.css";
import "./pages/admin/css/AdminDashboard.css";
import "./pages/Creditors/purchaseOrder/css/PO.css";
import "./pages/Creditors/purchaseOrder/css/filterButtonBlue.css";
import "./pages/Creditors/purchaseOrder/css/ViewPOForm-print.css";
import "./pages/Creditors/subContractors/css/SubcontractorList.css";
import "./pages/Creditors/subContractors/css/SubcontractorStatementDetail.css";
import "./pages/Creditors/subContractors/css/SubcontractorStatements.css";
import "./pages/Creditors/CreditNote/css/CreditNoteForm.css";
import "./pages/add-ons/css/ClientList.css";
import "./pages/add-ons/css/AddOnForm.css";
import "./pages/add-ons/css/AddOnList.css";
import "./pages/debtors/views/DebtorsAgeAnalysis.css";
import "./pages/Reports/css/wageReports.css";
import "./pages/Reports/css/ProfitLossEnhanced.css";
import "./pages/Reports/css/clientSubbieReport.css";
import "./css/layout.css";
import "./css/MonitorInstructions.css";
