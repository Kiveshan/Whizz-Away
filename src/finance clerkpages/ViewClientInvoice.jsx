import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../finance clerkpages/css/ViewClientInstruction.css";

const clients = [
  {
    company: "Company ABC",
    representative: "Andrew Taylor",
    email: "taylorandrew@yahoo.com",
    balance: "R20 000",
    date: "28/06/2025",
  },
  {
    company: "Little Helpers LTD",
    representative: "Brian Hall",
    email: "brian_hall@yahoo.com",
    balance: "R50 000",
    date: "25/07/2025",
  },
];

const ViewClientInvoice = () => {
  const navigate = useNavigate();

  return (
    <div className="">
      {/* Back Button */}
      <div className="client-payments-header">
        <button className="back-button" onClick={() => navigate("/FDashboard")}>
          Back
        </button>
      </div>



      {/* Table */}
      <div className="clientinstructiontable">
        <table className="t1">
          <thead className="bg-blue-300">
            <tr>
              <th className="p-3">Company</th>
              <th className="p-3">Representative</th>
              <th className="p-3">Email</th>
              <th className="p-3">New</th>
              <th className="p-3">In progress</th>
              <th className="p-3">Instructions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client, index) => (
              <tr key={index} className="border-t">
                <td className="p-3">{client.company}</td>
                <td className="p-3">{client.representative}</td>
                <td className="p-3">{client.email}</td>
                <td className="p-3">10</td>
                <td className="p-3">5</td>
                <td className="p-3">
                  <button className="view-butn" onClick={() => navigate("/invoices")}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ViewClientInvoice;
