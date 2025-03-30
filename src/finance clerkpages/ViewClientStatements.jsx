import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../finance clerkpages/css/ViewClientStatements.css";

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

const ViewClientStatement = () => {
  const navigate = useNavigate();

  return (
    <div className="">
      {/* Back Button */}
      <div className="client-payments-header">
        <button className="back-button" onClick={() => navigate("/DebtorsDashboard")}>
          Back
        </button>
      </div>

      {/* Table */}
      <div className="clientstatementtable">
        <table className="t1" style={{width: "70%", marginLeft:"350px"}}>
          <thead className="bg-blue-300">
            <tr>
              <th className="p-3">Company</th>
              <th className="p-3">Representative</th>
              <th className="p-3">Email</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client, index) => (
              <tr key={index} className="border-t">
                <td className="p-3">{client.company}</td>
                <td className="p-3">{client.representative}</td>
                <td className="p-3">{client.email}</td>
                <td className="p-3">
                  <button className="view-butn" onClick={() => navigate("/statements-list")}>
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

export default ViewClientStatement;
