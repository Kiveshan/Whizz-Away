import React from "react";
import {useNavigate } from "react-router-dom";
import '../finance clerkpages/css/InstructionsList.css';

const Instructions = ({ setCurrentPage }) => {
    const navigate = useNavigate();
  return (
    <div>
      <div className="client-payments-header">
        <button className="back-button" onClick={() => navigate("/")}>
          Back
        </button>
      </div>
      
            <div className="content1">
                <div className="button-group">
                  
                    <div className="filter-buttons">
                        <button className="btn btn-blue">Import</button>
                        <button className="btn btn-blue">Export</button>
                        <button className="btn btn-blue">All</button>
                        <button className="btn btn-blue">In-Progress</button>
                        <button className="btn btn-blue">Complete</button>
                    </div>
                    </div>
                <div className="tables-container">
                    <table className="t2">
                        <thead>
                            <tr>
                                <th>Instruction No</th>
                                <th>Type</th>
                                <th>Status</th>
                                <th>File No</th>
                                <th>Assignment</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                { id: 1, type: "Import", status: "New", fileNo: "77002" },
                                { id: 2, type: "Export", status: "New", fileNo: "10014" },
                                { id: 3, type: "Import", status: "In-Progress", fileNo: "93301" },
                            ].map((item) => (
                                <tr key={item.id}>
                                    <td>Instruction {item.id}</td>
                                    <td>{item.type}</td>
                                    <td>{item.status}</td>
                                    <td>{item.fileNo}</td>
                                    <td>
                                        <button className="view-btn"onClick={() => navigate("/update-instructions")}>View</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
  );
};


export default Instructions;