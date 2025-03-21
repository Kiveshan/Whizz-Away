"use client"
import { useNavigate } from "react-router-dom"

const TaxInvoiceTemplate = () => {
  const navigate = useNavigate()

  const styles = {
    container: {
      padding: "20px",
      fontFamily: "Arial, sans-serif",
      color: "#000",
    },
    backButton: {
      backgroundColor: "#28a745",
      color: "white",
      border: "none",
      padding: "8px 20px",
      borderRadius: "5px",
      fontSize: "16px",
      cursor: "pointer",
      marginBottom: "20px",
    },
    invoiceDocument: {
      maxWidth: "800px",
      margin: "0 auto",
      backgroundColor: "white",
    },
    headerSection: {
      position: "relative",
      borderTop: "1px solid #000",
      borderBottom: "1px solid #000",
      padding: "10px 0",
      marginBottom: "0",
    },
    titleLine: {
      textAlign: "center",
      fontSize: "16px",
      fontWeight: "bold",
    },
    companyDetails: {
      position: "absolute",
      top: "10px",
      right: "0",
      textAlign: "right",
      fontSize: "14px",
      lineHeight: "1.4",
    },
    companyDetailLine: {
      margin: "0",
    },
    invoiceTitleSection: {
      position: "relative",
      borderBottom: "1px solid #000",
      padding: "10px 0",
      marginBottom: "0",
    },
    invoiceTitle: {
      textAlign: "center",
      fontSize: "16px",
      fontWeight: "bold",
    },
    documentNumber: {
      position: "absolute",
      top: "50%",
      right: "0",
      transform: "translateY(-50%)",
      fontSize: "14px",
    },
    senderDetails: {
      padding: "10px 0",
      fontSize: "14px",
      lineHeight: "1.4",
    },
    senderDetailLine: {
      margin: "0",
    },
    vesselDestinationHeader: {
      display: "flex",
      borderTop: "1px solid #000",
      borderBottom: "1px solid #000",
      marginTop: "10px",
    },
    vesselHeader: {
      flex: "1",
      padding: "10px",
      textAlign: "center",
      fontSize: "16px",
      fontWeight: "bold",
      borderRight: "1px solid #000",
    },
    destinationHeader: {
      flex: "1",
      padding: "10px",
      textAlign: "center",
      fontSize: "16px",
      fontWeight: "bold",
    },
    invoiceDetails: {
      borderLeft: "1px solid #000",
      borderRight: "1px solid #000",
      borderBottom: "1px solid #000",
    },
    detailRow: {
      display: "flex",
      borderBottom: "1px solid #000",
    },
    detailRowLast: {
      display: "flex",
    },
    detailLabel: {
      flex: "1",
      padding: "8px 10px",
      fontSize: "14px",
      borderRight: "1px solid #000",
    },
    detailValue: {
      flex: "1",
      padding: "8px 10px",
      fontSize: "14px",
    },
    containerDetails: {
      margin: "20px 0",
    },
    containerHeader: {
      display: "flex",
      backgroundColor: "#b8cce4",
      fontWeight: "bold",
      fontSize: "14px",
    },
    containerNumberHeader: {
      flex: "2",
      padding: "8px 10px",
      border: "1px solid #000",
      textAlign: "center",
    },
    columnHeader: {
      flex: "1",
      padding: "8px 10px",
      border: "1px solid #000",
      textAlign: "center",
    },
    containerRow: {
      display: "flex",
      fontSize: "14px",
    },
    containerNumber: {
      flex: "2",
      padding: "8px 10px",
      border: "1px solid #000",
      borderTop: "none",
    },
    columnValue: {
      flex: "1",
      padding: "8px 10px",
      border: "1px solid #000",
      borderTop: "none",
      textAlign: "center",
    },
    bankingDetails: {
      fontSize: "14px",
      lineHeight: "1.4",
    },
    bankingDetailLine: {
      margin: "0",
    },
    paymentNote: {
      marginTop: "10px",
    },
    thankYou: {
      color: "#ff0000",
      textAlign: "center",
      marginTop: "15px",
      fontStyle: "italic",
    },
  }

  return (
    <div style={styles.container}>
      <button style={styles.backButton} onClick={() => navigate("/")}>
        Back
      </button>

      <div style={styles.invoiceDocument}>
        {/* Header section */}
        <div style={styles.headerSection}>
          <div style={styles.titleLine}>Transport and Logistics</div>
          <div style={styles.companyDetails}>
            <div style={styles.companyDetailLine}>Cluster Box 2020</div>
            <div style={styles.companyDetailLine}>Magicland</div>
            <div style={styles.companyDetailLine}>Umhlanga</div>
            <div style={styles.companyDetailLine}>VAT Reg No: 00000</div>
            <div style={styles.companyDetailLine}>Cellphone: 021457853</div>
          </div>
        </div>

        {/* Invoice title section */}
        <div style={styles.invoiceTitleSection}>
          <div style={styles.invoiceTitle}>Tax Invoice</div>
          <div style={styles.documentNumber}>Document No: SIS2288</div>
        </div>

        {/* Sender details */}
        <div style={styles.senderDetails}>
          <div style={styles.senderDetailLine}>Specialised International Freight</div>
          <div style={styles.senderDetailLine}>28 Winbury Lane</div>
          <div style={styles.senderDetailLine}>Fairy Land</div>
          <div style={styles.senderDetailLine}>Telephone: 031 000 0000</div>
          <div style={styles.senderDetailLine}>Date: 16/04/2024</div>
          <div style={styles.senderDetailLine}>Email: someone@srfreight.com</div>
          <div style={styles.senderDetailLine}>VAT Reg No: 25640</div>
        </div>

        {/* Vessel/Destination Headers */}
        <div style={styles.vesselDestinationHeader}>
          <div style={styles.vesselHeader}>Vessel/Ref</div>
          <div style={styles.destinationHeader}>Destination</div>
        </div>

        {/* Invoice Details */}
        <div style={styles.invoiceDetails}>
          <div style={styles.detailRow}>
            <div style={styles.detailLabel}>Booking Ref</div>
            <div style={styles.detailValue}>142,000</div>
          </div>
          <div style={styles.detailRow}>
            <div style={styles.detailLabel}>File Number</div>
            <div style={styles.detailValue}>84884</div>
          </div>
          <div style={styles.detailRowLast}>
            <div style={styles.detailLabel}>Description</div>
            <div style={styles.detailValue}>Exclusive</div>
          </div>
        </div>

        {/* Container Details Table */}
        <div style={styles.containerDetails}>
          <div style={styles.containerHeader}>
            <div style={styles.containerNumberHeader}>Container Number</div>
            <div style={styles.columnHeader}>Weight</div>
            <div style={styles.columnHeader}>Amount</div>
            <div style={styles.columnHeader}>VAT</div>
            <div style={styles.columnHeader}>Total</div>
          </div>
          <div style={styles.containerRow}>
            <div style={styles.containerNumber}>88 SHSHSHSHS</div>
            <div style={styles.columnValue}>2500 kg</div>
            <div style={styles.columnValue}>R 145,000</div>
            <div style={styles.columnValue}>R21 750</div>
            <div style={styles.columnValue}>R166 750</div>
          </div>
        </div>

        {/* Banking Details */}
        <div style={styles.bankingDetails}>
          <div style={styles.bankingDetailLine}>Account Name: [Your Company Name]</div>
          <div style={styles.bankingDetailLine}>Bank Name: [Bank Name]</div>
          <div style={styles.bankingDetailLine}>Account Number: 123456789</div>
          <div style={styles.bankingDetailLine}>Branch Code: 00234</div>
          <div style={styles.bankingDetailLine}>SWIFT Code: ABCD0234</div>
          <div style={styles.bankingDetailLine}>Reference: [Invoice Number or Client Name]</div>
          <div style={styles.paymentNote}>Please ensure the invoice number is referenced when making payment.</div>
          <div style={styles.thankYou}>Thank you for choosing [Your Company Name].</div>
        </div>
      </div>
    </div>
  )
}

export default TaxInvoiceTemplate

