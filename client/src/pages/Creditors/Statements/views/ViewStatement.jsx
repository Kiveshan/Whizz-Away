import React, { useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import html2pdf from "html2pdf.js";
import CompanyHeader from "../../../../components/CompanyHeader";
import "../../purchaseOrder/css/PO.css";
import "../../purchaseOrder/css/ViewPOForm-print.css";
import api from "../../../../api.js"; // Updated to use api.js

const ViewStatement = () => {
  const { state } = useLocation();
  const printRef = useRef();
  const navigate = useNavigate();
  const [poData, setPoData] = useState(null);
  const currentDate = new Date();
  const year = state?.selectedYear || currentDate.getFullYear();
  const month =
    state?.selectedMonth ||
    currentDate.toLocaleString("default", { month: "long" });

  useEffect(() => {
    const fetchPOs = async () => {
      try {
        const supplierId = state?.supplierId;
        const monthIndex = [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ].indexOf(month);
        const firstDay = new Date(year, monthIndex, 1);
        const lastDay = new Date(year, monthIndex + 1, 0);
        const fromDate = firstDay.toISOString().split("T")[0];
        const toDate = lastDay.toISOString().split("T")[0];

        const res = await api.get(`/api/statements`, {
          params: { supplierId, fromDate, toDate },
        });

        const purchaseOrders = res.data;
        const supplier_name =
          purchaseOrders.length > 0 ? purchaseOrders[0].supplier : "Unknown";

        setPoData({ purchaseOrders, supplier_name });
      } catch (err) {
        console.error("Failed to fetch purchase orders:", err);
      }
    };

    fetchPOs();
  }, [state?.supplierId, state?.selectedYear, state?.selectedMonth]);

  if (!poData) {
    return <div>No purchase order data available.</div>;
  }

  const purchaseOrders = poData.purchaseOrders || [];
  const supplierName = poData.supplier_name || "Unknown Supplier";
  const totalAmount = purchaseOrders.reduce(
    (sum, po) => sum + (po.total || 0),
    0
  );

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, "0")}/${(
      date.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}/${date.getFullYear()}`;
  };

const formatAmount = (amount) => {
  if (amount === null || amount === undefined || amount === 0) return "N/A";
  return `R${Number.parseFloat(amount).toFixed(2)}`;
};

  const handleDownload = () => {
    const element = printRef.current;
    if (!element) return alert("Nothing to download.");
    const options = {
      margin: 0.5,
      filename: `Statement_${supplierName}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
    };
    html2pdf().set(options).from(element).save();
  };

  const handleBack = () => {
    navigate("/Creditors/CredStatements");
  };

  return (
    <div className="po-form-wrapper">
      <div className="po-form-container">
        <button className="back-button" onClick={handleBack}>
          Back
        </button>
        <div
          ref={printRef}
          className="print-container"
          style={{ width: "600px" }}
        >
          <CompanyHeader subtitle="Creditors Statement" />
          <div className="po-header-section">
            <h2>{supplierName}</h2>
          </div>

          <div className="line-items">
            <table className="line-items-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>PO Number</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan="4">
                      No purchase orders found for this supplier in {month}{" "}
                      {year}.
                    </td>
                  </tr>
                ) : (
                  purchaseOrders.map((po) => (
                    <tr key={po.po_id}>
                      <td>{formatDate(po.date)}</td>
                      <td>{po.expense_type || "N/A"}</td>
                      <td>{po.ponum || "N/A"}</td>
                      <td>{formatAmount(po.total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="totals-section">
            <table className="totals-table">
              <tbody>
                <tr>
                  <td className="label-cell">Total</td>
                  <td className="amount-cell">{formatAmount(totalAmount)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="submit-section">
          <button
            type="button"
            className="view-button"
            onClick={handleDownload}
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewStatement;
