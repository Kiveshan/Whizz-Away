"use client"
import { useRef } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import html2pdf from "html2pdf.js"
import "../css/PO.css"
import "../css/ViewPOForm-print.css"
import CompanyHeader from "../../../../components/CompanyHeader"

const ViewPOForm = () => {
  const navigate = useNavigate()
  const printRef = useRef()
  const location = useLocation()
  const { poData } = location.state || {}

  if (!poData) {
    return (
      <div className="po-form-container">
        <button className="back-button" onClick={() => navigate("/Creditors/PurchaseOrders")}>
          Back
        </button>
        <div className="error-message">No purchase order data found</div>
      </div>
    )
  }

  const lineItems = poData.line_items || []
  const subtotal = lineItems.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const vat = subtotal * 0.15
  const total = subtotal + vat

  const handleBack = () => {
    navigate("/Creditors/PurchaseOrders")
  }

  const handleDownload = () => {
    const element = printRef.current
    if (!element) {
      alert("Content not ready for PDF generation")
      return
    }

    const opt = {
      margin: 0.3,
      filename: `Purchase_Order_${poData.ponum || "PO"}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
    }

    html2pdf().set(opt).from(element).save()
  }

  return (
    <div className="po-form-wrapper">
      <div className="po-form-container">
        <button className="back-button" onClick={handleBack}>
          Back
        </button>

        <div ref={printRef} className="print-container">
          <CompanyHeader subtitle="Purchase Order" />

          <div className="po-header-section">
            <h2>PURCHASE ORDER NUMBER: {poData.ponum}</h2>
          </div>

          <div className="form-section">
            <div className="form-row">
              <div className="form-group">
                <label>Supplier</label>
                <div className="form-value">{poData.supplier || ""}</div>
              </div>
              <div className="form-group">
                <label>Date</label>
                <div className="form-value">{poData.date ? new Date(poData.date).toLocaleDateString() : ""}</div>
              </div>
              <div className="form-group">
                <label>Att</label>
                <div className="form-value">{poData.attention_to || ""}</div>
              </div>
              <div className="form-group">
                <label>Received by</label>
                <div className="form-value">{poData.received_by || ""}</div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Ref/Reg No</label>
                <div className="form-value">{poData.reg_no || ""}</div>
              </div>
              <div className="form-group">
                <label>Date of Purchase Order</label>
                <div className="form-value">{poData.date ? new Date(poData.date).toLocaleDateString() : ""}</div>
              </div>
              <div className="form-group">
                <label>Subbie</label>
                <div className="form-value">{poData.subbie || ""}</div>
              </div>
              <div className="form-group">
                <label>Expense Type</label>
                <div className="form-value">{poData.expense || ""}</div>
              </div>
            </div>
          </div>

          <div className="line-items">
            <table className="line-items-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.length > 0 ? (
                  lineItems.map((item, index) => (
                    <tr key={index}>
                      <td>{item.description || ""}</td>
                      <td>{item.quantity || 0}</td>
                      <td>R {(item.unit_price || 0).toFixed(2)}</td>
                      <td>R {(item.amount || 0).toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4">No line items found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="totals-section">
            <table className="totals-table">
              <tbody>
                <tr>
                  <td className="label-cell">Sub-Total</td>
                  <td className="amount-cell">R {subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="label-cell">VAT(15%)</td>
                  <td className="amount-cell">R {vat.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="label-cell">Total</td>
                  <td className="amount-cell">R {total.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className="submit-section">
          <button type="button" className="view-btn" onClick={handleDownload}>
            Download
          </button>
        </div>
      </div>
    </div>
  )
}

export default ViewPOForm