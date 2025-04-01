"use client"
import { useState, useEffect, useRef } from "react"
import { useNavigate, useParams, useLocation } from "react-router-dom"
import "../finance clerkpages/css/InvoiceTemplate.css"
import html2pdf from "html2pdf.js"

const ClientInvoice = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()

  // Extract ID from URL or location state
  const id = params.id || (location.state && location.state.id)

  const [invoiceData, setInvoiceData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)

  const invoiceRef = useRef(null)

  useEffect(() => {
    const fetchInvoiceData = async () => {
      try {
        setLoading(true)

        if (!id) {
          setError("No invoice ID provided")
          setLoading(false)
          return
        }

        const requestUrl = `/api/invoices/${id}`
        console.log("Fetching invoice data from:", requestUrl)

        const response = await fetch(requestUrl)
        console.log("Response status:", response.status)

        if (!response.ok) {
          const text = await response.text()
          console.error("Error response text:", text)
          throw new Error(`HTTP error! Status: ${response.status}`)
        }

        const result = await response.json()
        console.log("Received invoice data:", result)

        // Map container fields to match the expected format
        if (result.data && result.data.containers) {
          result.data.containers = result.data.containers.map((container) => ({
            container_number: container.containernum || container.container_number,
            weight: container.weight,
          }))
        }

        setInvoiceData(result.data)
      } catch (err) {
        console.error("Error fetching invoice data:", err)
        setError(`Failed to load invoice data: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }

    fetchInvoiceData()
  }, [id])

  // Helper functions
  const formatDate = (dateString) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`
  }

  const calculateVAT = (amount) => {
    if (!amount) return 0
    return amount * 0.15
  }

  const formatCurrency = (amount) => {
    if (!amount) return "R 0.00"
    return `R ${Number(amount).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const generatePDF = () => {
    // Set printing mode before generating
    setIsPrinting(true)
    setPdfLoading(true)

    // Short delay to ensure CSS changes are applied
    setTimeout(() => {
      const element = invoiceRef.current
      const filename = `Invoice-${invoiceNumber}.pdf`

      const opt = {
        margin: [10, 10, 10, 10],
        filename: filename,
        image: { type: "png", quality: 1.0 }, // PNG for better quality
        html2canvas: {
          scale: 3, // Balance between quality and performance
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
      }

      html2pdf()
        .set(opt)
        .from(element)
        .save()
        .then(() => {
          setPdfLoading(false)
          setIsPrinting(false) // Reset printing mode
        })
        .catch((error) => {
          console.error("PDF generation error:", error)
          setPdfLoading(false)
          setIsPrinting(false)
        })
    }, 100)
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

  // Calculate invoice values
  const invoiceNumber = `INV-${invoiceData.m1key}-${new Date().getFullYear()}`
  const amount = invoiceData.rate || 0
  const vat = calculateVAT(amount)
  const total = amount + vat

  // Ensure containers exist
  const containers = invoiceData.containers || []

  return (
    <div className="invoice-page">
      <div className={`invoice-paper ${isPrinting ? "printing-mode" : ""}`} ref={invoiceRef}>
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
          <div className="document-number">Document No: {invoiceNumber}</div>
        </div>

        {/* Sender Details */}
        <div className="sender-details">
          <div>{invoiceData.client_name || "Specialised International Freight"}</div>
          <div>{invoiceData.client_address || "28 Winbury Lane"}</div>
          <div>Fairy Land</div>
          <div>Telephone: {invoiceData.client_telephone || "031 000 0000"}</div>
          <div>Date: {formatDate(new Date())}</div>
          <div>Email: {invoiceData.client_email || "someone@srfreight.com"}</div>
          <div>VAT Reg No: {invoiceData.client_vat || "25640"}</div>
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
                <td className="value">{invoiceData.instruction_no || "N/A"}</td>
              </tr>
              <tr>
                <td className="label">File Number</td>
                <td className="value">{invoiceData.file_no || "N/A"}</td>
              </tr>
              <tr>
                <td className="label">Description</td>
                <td className="value">{invoiceData.description || "Exclusive"}</td>
              </tr>
            </tbody>
          </table>

          {/* Container Details */}
          <div className="container-section">
            <table className="container-table5">
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
                {containers.length > 0 ? (
                  containers.map((container, index) => {
                    const containerAmount = amount / (containers.length || 1)
                    const containerVAT = calculateVAT(containerAmount)
                    const containerTotal = containerAmount + containerVAT

                    return (
                      <tr key={index}>
                        <td className="container-number">{container.container_number || `Container ${index + 1}`}</td>
                        <td className="weight">{container.weight || "N/A"}</td>
                        <td className="amount">{formatCurrency(containerAmount)}</td>
                        <td className="vat">{formatCurrency(containerVAT)}</td>
                        <td className="total">{formatCurrency(containerTotal)}</td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td className="container-number">No container information</td>
                    <td className="weight">N/A</td>
                    <td className="amount">{formatCurrency(amount)}</td>
                    <td className="vat">{formatCurrency(vat)}</td>
                    <td className="total">{formatCurrency(total)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Banking Details */}
        <div className="banking-details">
          <div>Account Name: Transport and Logistics</div>
          <div>Bank Name: First National Bank</div>
          <div>Account Number: 123456789</div>
          <div>Branch Code: 00234</div>
          <div>SWIFT Code: ABCD0234</div>
          <div>Reference: {invoiceNumber}</div>
          <div className="payment-note">Please ensure the invoice number is referenced when making payment.</div>
          <div className="thank-you">Thank you for choosing Transport and Logistics.</div>
        </div>
      </div>

      <div className="invoicedownloadbtn1">
        <button className="back-btn" onClick={() => navigate("/invoices")}>
          Back
        </button>
        <button className="download-btn" onClick={generatePDF} disabled={pdfLoading}>
          {pdfLoading ? "Generating PDF..." : "Download PDF"}
        </button>
      </div>
    </div>
  )
}

export default ClientInvoice

