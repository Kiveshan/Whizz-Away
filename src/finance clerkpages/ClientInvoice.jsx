"use client"
import { useState, useEffect, useRef } from "react"
import { useNavigate, useParams, useLocation } from "react-router-dom"
import "../finance clerkpages/css/InvoiceTemplate.css"
import html2pdf from "html2pdf.js"

// Utility function for formatting dates
const formatDate = (dateString) => {
  if (!dateString) return ""
  const date = new Date(dateString)
  return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`
}

// Utility function for formatting currency
const formatCurrency = (amount) => {
  if (!amount) return "R 0.00"
  return `R ${Number(amount).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Debug utility
const debug = (message, data) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(message, data)
  }
}

const ClientInvoice = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()

  // Extract ID from URL or location state
  const id = params.id || (location.state && location.state.id)

  // Get client information if available
  const clientInfo = location.state || {}
  const { clientId, clientName, returnToClientView } = clientInfo

  const [invoiceData, setInvoiceData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)

  const invoiceRef = useRef(null)

  useEffect(() => {
    let isMounted = true

    const fetchInvoiceData = async () => {
      try {
        if (!id) {
          if (isMounted) {
            setError("No invoice ID provided")
            setLoading(false)
          }
          return
        }

        const requestUrl = `/api/invoices/${id}`
        debug("Fetching invoice data from:", requestUrl)

        const response = await fetch(requestUrl)
        debug("Response status:", response.status)

        if (!response.ok) {
          let errorMessage = `HTTP error! Status: ${response.status}`

          try {
            const errorText = await response.text()
            debug("Error response text:", errorText)

            if (errorText.trim().startsWith("<!DOCTYPE") || errorText.trim().startsWith("<html")) {
              errorMessage = "Received HTML instead of JSON. This may indicate a proxy configuration issue."
            } else {
              errorMessage += ` Details: ${errorText}`
            }
          } catch (textError) {
            console.error("Error getting response text:", textError)
          }

          throw new Error(errorMessage)
        }

        const result = await response.json()
        debug("Received invoice data:", result)

        // Normalize container data
        if (result.data && result.data.containers) {
          result.data.containers = result.data.containers.map((container) => ({
            container_number: container.container_number || container.containernum || "",
            weight: container.weight || null,
          }))
        }

        if (isMounted) {
          setInvoiceData(result.data)
          setLoading(false)
        }
      } catch (err) {
        console.error("Error fetching invoice data:", err)
        if (isMounted) {
          setError(`Failed to load invoice data: ${err.message}`)
          setLoading(false)
        }
      }
    }

    fetchInvoiceData()

    // Cleanup function
    return () => {
      isMounted = false
    }
  }, [id])

  // Calculate VAT based on percentage from database or use vat_amount if available
  const calculateVAT = (amount) => {
    // If we have a vat_amount from the invoice table, use that
    if (invoiceData?.invoice?.vat_amount !== undefined) {
      return Number(invoiceData.invoice.vat_amount)
    }

    // Otherwise calculate based on percentage
    if (invoiceData?.vat !== undefined && invoiceData?.vat !== null && amount) {
      // Convert percentage to decimal (e.g., 15 becomes 0.15)
      const vatRate = Number(invoiceData.vat) / 100
      return amount * vatRate
    }

    // If no VAT value is provided or amount is 0, return 0 (no VAT)
    return 0
  }

  const generatePDF = () => {
    // Set printing mode before generating
    setIsPrinting(true)
    setPdfLoading(true)

    // Use requestAnimationFrame instead of setTimeout for better browser compatibility
    requestAnimationFrame(() => {
      const element = invoiceRef.current
      const filename = `Invoice-${invoiceData.invoice_num}.pdf`

      const opt = {
        margin: [15, 15, 15, 15], // Slightly increased margins from your current 10
        filename: filename,
        image: { type: "png", quality: 1.0 },
        html2canvas: {
          scale: 2, // Balance between quality and performance
          useCORS: true,
          letterRendering: true,
          allowTaint: true,
          backgroundColor: "#FFFFFF",
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
          compress: false,
          precision: 16,
          putOnlyUsedFonts: true,
        },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] }, // Add this line to improve page breaks
      }

      // Add CSS to handle page breaks properly
      const style = document.createElement("style")
      style.innerHTML = `
        @media print {
          .container-section { page-break-inside: avoid; }
          .banking-details { page-break-inside: avoid; }
          table { page-break-inside: avoid; }
          tr { page-break-inside: avoid; }
          td { page-break-inside: avoid; }
          th { page-break-inside: avoid; }
        }
      `
      document.head.appendChild(style)

      html2pdf()
        .set(opt)
        .from(element)
        .save()
        .then(() => {
          document.head.removeChild(style) // Clean up the added style
          setPdfLoading(false)
          setIsPrinting(false) // Reset printing mode
        })
        .catch((error) => {
          document.head.removeChild(style) // Clean up the added style
          console.error("PDF generation error:", error)
          setPdfLoading(false)
          setIsPrinting(false)
        })
    })
  }

  // Loading, error, and no data states
  if (loading) {
    return (
      <div className="invoice-page">
        <div className="loading-error">Loading invoice data...</div>
        <div className="invoicedownloadbtn1">
          <button className="back-btn" onClick={() => navigate("/invoices")}>
            Back
          </button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="invoice-page">
        <div className="loading-error">{error}</div>
        <div className="invoicedownloadbtn1">
          <button className="back-btn" onClick={() => navigate("/invoices")}>
            Back
          </button>
        </div>
      </div>
    )
  }

  if (!invoiceData) {
    return (
      <div className="invoice-page">
        <div className="loading-error">No invoice data found.</div>
        <div className="invoicedownloadbtn1">
          <button className="back-btn" onClick={() => navigate("/invoices")}>
            Back
          </button>
        </div>
      </div>
    )
  }

  // Calculate invoice values - use values from invoice table if available
  const amount = invoiceData.invoice?.amount || invoiceData.total_cost || 0
  const vat = calculateVAT(amount)
  const total = invoiceData.invoice?.total_amount || amount + vat

  // Ensure containers exist
  const containers = invoiceData.containers || []

  return (
    <div className="invoice-page">
      <div className={`invoice-paper ${isPrinting ? "printing-mode" : ""}`} ref={invoiceRef}>
        {/* Transport and Logistics section */}
        <div className="transport-section">
          <div className="section-title">{invoiceData.companyname}</div>
        </div>

        {/* Middle section with company details */}
        <div className="middle-section">
          <div className="company-info">
            {invoiceData.cluster_box}
            <br />
            {invoiceData.address}
            <br />
            {invoiceData.suburb}
            <br />
            VAT Reg No: {invoiceData.vat_reg_num}
            <br />
            Cellphone: {invoiceData.phonenumber}
          </div>
        </div>

        {/* Invoice Title section */}
        <div className="invoice-title-section">
          <div className="invoice-title">Tax Invoice</div>
          <div className="document-number">Document No: {invoiceData.doc_num}</div>
        </div>

        {/* Sender Details */}
        <div className="sender-details">
          <div>{invoiceData.client_name}</div>
          <div>{invoiceData.client_address}</div>
          <div>{invoiceData.client_suburb}</div>
          <div>Telephone: {invoiceData.client_telephone}</div>
          <div>Date: {formatDate(invoiceData.date)}</div>
          <div>Email: {invoiceData.client_email}</div>
          <div>VAT Reg No: {invoiceData.client_vat}</div>
        </div>

        {/* Vessel/Ref and Destination */}
        <div className="vessel-destination">
          <div className="vessel">Vessel/Ref : {invoiceData.vessel_name}</div>
          <div className="destination">Destination : {invoiceData.dropoff}</div>
        </div>

        {/* Invoice Details */}
        <div className="invoice-details">
          <table className="details-table">
            <tbody>
              <tr>
                <td className="label">Booking Ref</td>
                <td className="value">{invoiceData.booking_ref}</td>
              </tr>
              <tr>
                <td className="label">File Number</td>
                <td className="value">{invoiceData.file_no}</td>
              </tr>
              <tr>
                <td className="label">Description</td>
                <td className="value">{invoiceData.description}</td>
              </tr>
            </tbody>
          </table>

          {/* Container Details */}
{/* Container Details */}
<div className="container-section">
  <table className="container-table5">
    <thead>
      <tr>
        <th className="container-number-header">Container Number</th>
        {/* Only show weight header if at least one container has a non-empty weight */}
        {containers.some(container => container.weight && container.weight !== "N/A") && (
          <th className="weight-header">Weight</th>
        )}
      </tr>
    </thead>
    <tbody>
    {containers.length > 0 ? (
      containers.map((container, index) => {
        return (
          <tr key={index}>
            <td className="container-number">{container.container_number || `Container ${index + 1}`}</td>
            {container.weight && container.weight !== "N/A" && (
              <td className="weight">{container.weight}</td>
            )}
          </tr>
        )
      })
    ) : (
      <tr>
        <td className="container-number">No container information</td>
      </tr>
    )}
    </tbody>
  </table>
            {/* Summary Table */}
            <div className="summary-section">
              <table className="container-table5">
                <thead>
                  <tr>
                    <th className="summary-header" colSpan="2">
                      Invoice Summary
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="summary-label">Amount (excl. VAT)</td>
                    <td className="summary-value">{formatCurrency(amount)}</td>
                  </tr>
                  {/* Only show VAT row if VAT exists */}
                  {vat > 0 && (
                    <tr>
                      <td className="summary-label">VAT ({invoiceData.vat}%)</td>
                      <td className="summary-value">{formatCurrency(vat)}</td>
                    </tr>
                  )}
                  <tr className="summary-total-row">
                    <td className="summary-total-label">Total Amount</td>
                    <td className="summary-total-value">{formatCurrency(total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Banking Details */}
        <div className="banking-details">
          <div>Account Name: {invoiceData.name_of_acc}</div>
          <div>Bank Name: {invoiceData.bank}</div>
          <div>Account Number: {invoiceData.account_num}</div>
          <div>Branch Code: {invoiceData.branch_code}</div>
          <div>SWIFT Code: {invoiceData.swift_code}</div>
          <div>Reference: {invoiceData.invoice_num}</div>
          <div className="payment-note">Please ensure the invoice number is referenced when making payment.</div>
          <div className="thank-you">Thank you for choosing {invoiceData.companyname}.</div>
        </div>
      </div>

      <div className="invoicedownloadbtn1">
        <button
          className="back-btn"
          onClick={() => {
            if (returnToClientView) {
              // If we came from client view, go back to the filtered invoices list
              navigate("/invoices", {
                state: {
                  clientId,
                  clientName,
                },
              })
            } else {
              // Otherwise go to the regular invoices list
              navigate("/invoices")
            }
          }}
        >
          Back
        </button>
        <button className="download-btn" onClick={generatePDF} disabled={pdfLoading}>
          {pdfLoading ? "Generating High-Quality PDF..." : "Download PDF"}
        </button>
      </div>
    </div>
  )
}

export default ClientInvoice

