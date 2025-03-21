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
   
         <div className="filter-buttons">
          <button className="view-btn">Import</button>
          <button className="view-btn">Export</button>
          <button className="view-btn">All</button>
        </div>
     

      {/* Table */}
      <table className="instruction-table1">
        <thead>
          <tr>
            <th>Instruction No</th>
            <th>Type</th>
            <th>Date</th>
            <th>File No</th>
            <th>Display</th>
            <th>Statement</th>
          </tr>
        </thead>
        <tbody>
          {instructions.map((item, index) => (
            <tr key={index}>
              <td>{item.instructionNo}</td>
              <td>{item.type}</td>
              <td>{item.date}</td>
              <td>{item.fileNo}</td>
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