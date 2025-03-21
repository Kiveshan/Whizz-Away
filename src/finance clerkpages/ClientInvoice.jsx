"use client"
import { useNavigate } from "react-router-dom"
import "../finance clerkpages/css/InvoiceTemplate.css"

const ClientInvoice = () => {
  const navigate = useNavigate()

  return (
    <div className="invoice-page">
     

      <div className="invoice-paper">
        {/* Transport and Logistics section */}
        <div className="transport-section">
          <div className="section-title">Transport and Logistics</div>
        </div>

        {/* Middle section with company details */}
        <div className="middle-section">
          <div className="company-info">
            Cluster Box 2020
            <br />
            Magicland
            <br />
            Umhlanga
            <br />
            VAT Reg No: 00000
            <br />
            Cellphone: 021457853
          </div>
        </div>

        {/* Invoice Title section */}
        <div className="invoice-title-section">
          <div className="invoice-title">Tax Invoice</div>
          <div className="document-number">Document No: SIS2288</div>
        </div>

        {/* Sender Details */}
        <div className="sender-details">
          <div>Specialised International Freight</div>
          <div>28 Winbury Lane</div>
          <div>Fairy Land</div>
          <div>Telephone: 031 000 0000</div>
          <div>Date: 16/04/2024</div>
          <div>Email: someone@srfreight.com</div>
          <div>VAT Reg No: 25640</div>
        </div>

        {/* Vessel/Ref and Destination */}
        <div className="vessel-destination">
          <div className="vessel">Vessel/Ref</div>
          <div className="destination">Destination</div>
        </div>

        {/* Invoice Details */}
        <div className="invoice-details">
          <table className="details-table">
            <tbody>
              <tr>
                <td className="label">Booking Ref</td>
                <td className="value">142,000</td>
              </tr>
              <tr>
                <td className="label">File Number</td>
                <td className="value">84884</td>
              </tr>
              <tr>
                <td className="label">Description</td>
                <td className="value">Exclusive</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Container Details */}
        <div className="container-section">
          <table className="container-table">
            <thead>
              <tr>
                <th className="container-number-header">Container Number</th>
                <th className="weight-header">Weight</th>
                <th className="amount-header">Amount</th>
                <th className="vat-header">VAT</th>
                <th className="total-header">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="container-number">88 SHSHSHSHS</td>
                <td className="weight">2500 kg</td>
                <td className="amount">R 145,000</td>
                <td className="vat">R21 750</td>
                <td className="total">R166 750</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Banking Details */}
        <div className="banking-details">
          <div>Account Name: [Your Company Name]</div>
          <div>Bank Name: [Bank Name]</div>
          <div>Account Number: 123456789</div>
          <div>Branch Code: 00234</div>
          <div>SWIFT Code: ABCD0234</div>
          <div>Reference: [Invoice Number or Client Name]</div>
          <div className="payment-note">Please ensure the invoice number is referenced when making payment.</div>
          <div className="thank-you">Thank you for choosing [Your Company Name].</div>
        </div>
      </div>
      <button
                onClick={() => navigate("/")}
                style={{
                  backgroundColor: "#8ee4a6",
                  color: "black",
                  padding: "8px 24px",
                  borderRadius: "4px",
                  fontSize: "14px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Back
              </button>
    </div>
  )
}

export default ClientInvoice

