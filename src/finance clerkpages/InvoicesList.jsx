
import React from "react";
import { useNavigate } from 'react-router-dom';
import '../finance clerkpages/css/InvoicesList.css';

const InvoicesList = () => {
  const navigate = useNavigate();
  return (
    <div className="app">

      {/* Main */}
      <main className="main">
        {/* Back Button */}
        <div className="">
        <button className="back-button" onClick={() => navigate("/FDashboard")}>
          Back
        </button>
      </div>
      <div className="action-bar">
        <div className="filter-section6">
          <div className="dropdown-container">
            <select className="dropdown">
              <option>Year</option>
              <option>2025</option>
              <option>2024</option>
              <option>2023</option>
              <option>2022</option>
            </select>
            <select className="dropdown">
              <option>Month</option>
              <option>January</option>
              <option>February</option>
              <option>March</option>
              <option>April</option>
              <option>May</option>
              <option>June</option>
              <option>July</option>
              <option>August</option>
              <option>September</option>
              <option>October</option>
              <option>November</option>
              <option>December</option>
            </select>
          </div>
        </div>
      </div>
      <div className="filter-section">
        
          <div className="filter-group1">
            <button className="filter-button active">Import</button>
            <button className="filter-button">Export</button>
            <button className="filter-button outline">All</button>
          </div>
          </div>

           

        {/* Table */}
        <div className="table-container22">
          <table>
            <thead>
              <tr>
                <th>Instruction No</th>
                <th>Type</th>
                <th>File No</th>
                <th>Date</th>
          
                <th>Details</th>
                <th>Invoice</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Instruction 1</td>
                <td>Import</td>
                <td>77002</td>
                <td>21/12/2020</td>
               
                <td>
                  <button className="small-btn"onClick={() => navigate("/client-invoice")}>View</button>
                </td>
                <td>
                  <button className="small-btn">Download</button>
                </td>
              </tr>
              <tr>
                <td>Instruction 2</td>
                <td>Export</td>
                <td>10014</td>
                <td>15/10/2023</td>
                
                <td>
                  <button className="small-btn">View</button>
                </td>
                <td>
                  <button className="small-btn">Download</button>
                </td>
              </tr>
              <tr>
                <td>Instruction 3</td>
                <td>Import</td>
                <td>93301</td>
                <td>01/08/2021</td>
              
                <td>
                  <button className="small-btn">View</button>
                </td>
                <td>
                  <button className="small-btn">Download</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default InvoicesList;

