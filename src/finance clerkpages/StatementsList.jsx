import React from 'react';
import { useNavigate } from "react-router-dom";
import '../finance clerkpages/css/StatementList.css';


const StatementList = () => {
const navigate = useNavigate()
  const instructions = [
    {
      instructionNo: 'Instruction 1',
      type: 'Import',
      date: '30/06/2024',
      fileNo: '77002',
    },
    {
      instructionNo: 'Instruction 2',
      type: 'Export',
      date: '14/07/2023',
      fileNo: '10014',
    },
    {
      instructionNo: 'Instruction 3',
      type: 'Import',
      date: '04/10/2021',
      fileNo: '93301',
    },
  ];

  return (
    <div className="">
       <button onClick={() => navigate("/view-client-statements")} className="back-button">
          Back
        </button>
        <div className="action-bar">
        <div className="filter-section46">
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
   
         <div className="filter-buttons55">
          <button className="view-btn">Import</button>
          <button className="view-btn">Export</button>
          <button className="view-btn">All</button>
        </div>
     

      {/* Table */}
      <table className="instruction-table1">
        <thead>
          <tr>
            <th>Instruction No</th>
            <th>File No</th>
            <th>Type</th>
            <th>Date</th>
            <th>Display</th>
            <th>Statement</th>
          </tr>
        </thead>
        <tbody>
          {instructions.map((item, index) => (
            <tr key={index}>
              <td>{item.instructionNo}</td>
              <td>{item.fileNo}</td>
              <td>{item.type}</td>
              <td>{item.date}</td>
              <td><button className="view-btn"onClick={() => navigate("/client-statement")}>View</button></td>
              <td><button className="download-btn">Download</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StatementList;