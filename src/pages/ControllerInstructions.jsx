import React, { useRef } from "react";
import "../css/controllerinstruction.css";
import { useNavigate } from "react-router-dom"; // Import useNavigate

const ControllerInstructions = ({ setCurrentPage }) => {
  const navigate = useNavigate(); // Initialize navigate function

  // Create refs for each date input
  const pickupDateRef = useRef(null);
  const etaDateRef = useRef(null);
  const deadlineDateRef = useRef(null);

  // Function to open calendar
  const openCalendar = (ref) => {
    ref.current.click();
  };

  return (
    <div>
      {/* Back Button */}
      <div className="client-payments-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          Back
        </button>
      </div>
      <div className="instruction-container1">
        <div className="content">
          <div className="form-section">
            <div className="form-row">
              <div className="form-group">
                <label>Client</label>
                <div className="select-wrapper">
                  <select className="form-select">
                    <option>Select Client</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Representative</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Autoload representative"
                />
              </div>
              <div className="form-group">
                <label>Contact Details</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Autoload contact details"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="Autoload email"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-row">
              <div className="form-group">
                <label>Shipment Type</label>
                <div className="select-wrapper">
                  <select className="form-select">
                    <option>Select Shipment Type</option>
                  </select>
                </div>
              </div>
              <div className="form-group wide">
                <label>Name of Task</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Input Name of Task"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Pick-Up Location</label>
                <div className="select-wrapper">
                  <select className="form-select">
                    <option>Input pick-up location here</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Drop-off</label>
                <div className="select-wrapper">
                  <select className="form-select">
                    <option>Port - Pier 1</option>
                  </select>
                </div>
              </div>
              <div className="form-group checkboxes">
                <div className="checkbox-group">
                  <input type="checkbox" id="hazardous" />
                  <label htmlFor="hazardous">Hazardous Materials</label>
                </div>
                <div className="checkbox-group">
                  <input type="checkbox" id="surcharges" />
                  <label htmlFor="surcharges">Add Surcharges</label>
                </div>
              </div>
            </div>

            {/* Date Inputs with functional calendar buttons */}
            <div className="form-row">
              <div className="form-group">
                <label>Pick-up Time</label>
                <div className="date-input-group">
                  <input type="time" className="form-input" placeholder="Time here" />
                  <button className="calendar-button"></button>
                </div>
              </div>
              

              <div className="form-group">
                <label>Pick-up Date</label>
                <div className="date-input-group">
                  <input
                    type="date"
                    className="form-input"
                    ref={pickupDateRef}
                    placeholder="Date here"
                  />
                  <button
                    className="calendar-button"
                    onClick={() => openCalendar(pickupDateRef)}
                  >
                    
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>ETA/Stack Date</label>
                <div className="date-input-group">
                  <input
                    type="date"
                    className="form-input"
                    ref={etaDateRef}
                    placeholder="Date here"
                  />
                  <button
                    className="calendar-button"
                    onClick={() => openCalendar(etaDateRef)}
                  >
                    
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Deadline</label>
                <div className="date-input-group">
                  <input
                    type="date"
                    className="form-input"
                    ref={deadlineDateRef}
                    placeholder="Date here"
                  />
                  <button
                    className="calendar-button"
                    onClick={() => openCalendar(deadlineDateRef)}
                  >
                    
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Additional form sections */}
          <div className="form-section">
            <div className="form-row">
              <div className="form-group">
                <label>File Ref</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Upload file number here"
                  style={{ width: "60%" }} // Reduced the width
                />
              </div>
              <div className="form-group rates-group">
                <label>Rates per</label>
                <div className="rates-input-group">
                  <div className="select-wrapper small">
                    <select className="form-select" style={{ width: "100px" }}>
                      <option>kg</option>
                      <option>m&sup3;</option>
                      <option>Container</option>
                    </select>
                  </div>
                  <span className="separator">-----</span>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="R 1000000/ton"
                    style={{ width: "60%" }}
                  />
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group" style={{ flex: "0 0 150px" }}>
                <label>No. of Containers</label>
                <div className="number-input-group" style={{ gap: "10px" }}>
                  <input
                    type="number"
                    className="form-input"
                    defaultValue="10"
                    style={{ width: "60%" }} // Adjusted width for the input field
                  />
                  <div
                    className="number-controls"
                    style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
                  >
                    <button className="number-up" style={{ fontSize: "12px", padding: "2px" }}>
                      ▲
                    </button>
                    <button className="number-down" style={{ fontSize: "12px", padding: "2px" }}>
                      ▼
                    </button>
                  </div>
                </div>
              </div>

              <div className="form-group">
                {/* Trailer Size Dropdown */}
                <div className="form-group">
                  <label>Trailer Size</label>
                  <select className="form-select">
                    <option value="6m">6m</option>
                    <option value="12m">12m</option>
                    <option value="abnormal">Abnormal</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-row">
              <div className="form-group full-width">
                <label>Description from client</label>
                <textarea
                  className="form-textarea"
                  placeholder="Description from client, like type of goods etc"
                ></textarea>
              </div>
            </div>
          </div>

          <div className="button-container1">
            <button
              className="add-container-button"
              onClick={() => navigate("/ControllerInstructionDetails")} // Navigate on click
            >
              Add Container Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControllerInstructions;
