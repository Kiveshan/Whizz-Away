import React from "react";
import { useNavigate } from "react-router-dom";
import "../css/trackinginstruction.css";

const ControllerTrackInstruction = ({ setCurrentPage }) => {
  const navigate = useNavigate();

  return (
    <div className="tracking-wrapper">
      <div className="content">
        {/* Back Button */}
        <button className="back-button" onClick={() => navigate(-1)}>
         Back
        </button>

        <div className="filter-section">
          <div className="filter-group">
            <button className="filter-button active">Import</button>
            <button className="filter-button">Export</button>
            <button className="filter-button outline">All</button>
          </div>
          <div className="filter-group">
            <button className="filter-button outline">All</button>
            <button className="filter-button active">In-Progress</button>
            <button className="filter-button">Complete</button>
          </div>
        </div>

        {/* <div className="pagination">
          <button className="pagination-arrow">←</button>
          <span className="pagination-text">1 of 10</span>
          <button className="pagination-arrow">→</button>
        </div> */}

        <div className="tracking-table-wrapper">
          <table className="tracking-table">
            <thead>
              <tr>
                <th>Instruction No</th>
                <th>Type</th>
                <th>Status</th>
                <th>File No</th>
                <th>Instruction</th>
                <th>Assignment</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Instruction 1</td>
                <td>Import</td>
                <td>In-Progress</td>
                <td>77002</td>
                <td>
                <button 
                    className="view-buttons" 
                    onClick={() => navigate("")}
                  >
                    View
                  </button>
                  </td>
                <td>
                  <button 
                    className="view-buttons" 
                    onClick={() => navigate("/ControllerViewAssignment")}
                  >
                    View
                  </button>
                </td>
              </tr>
              <tr className="even-row">
                <td>Instruction 2</td>
                <td>Export</td>
                <td>In-Progress</td>
                <td>10014</td>
                <td>
                <button 
                    className="view-buttons" 
                    onClick={() => navigate("")}
                  >
                    View
                  </button>
                  </td>
                <td>
                  <button 
                    className="view-buttons" 
                    onClick={() => navigate("/ControllerViewAssignment")}
                  >
                    View
                  </button>
                </td>
              </tr>
              <tr>
                <td>Instruction 3</td>
                <td>Import</td>
                <td>Complete</td>
                <td>93301</td>
                <td>
                <button 
                    className="view-buttons" 
                    onClick={() => navigate("")}
                  >
                    View
                  </button>
                  </td>
                <td>
                  <button 
                    className="view-buttons" 
                    onClick={() => navigate("/ControllerViewAssignment")}
                  >
                    View
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ControllerTrackInstruction;