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
        <button className="back-button" onClick={() => navigate("/ControllerDashboard")}>
          Back
        </button>
      </div>
      <div className="instruction-container1">
        <div className="content">
          <div className="form-section">
            <div className="form-row1">
              <div className="form-group">
                <label>Client</label>
                <div className="select-wrapper">
                  <select className="dropdown">
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
            <div className="form-row1">
              <div className="form-group">
                <label>Shipment Type</label>
                <div className="select-wrapper">
                  <select className="dropdown">
                    <option>Select Shipment</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Name of Task</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Input Name of Task"
                />
              </div>
            </div>

            <div className="form-row1">
              <div className="form-group">
                <label>Pick-Up Location</label>
                <div className="select-wrapper">
                  <select className="dropdown">
                    <option>Input pick-up</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Drop-off</label>
                <div className="select-wrapper">
                  <select className="dropdown">
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
            <div className="form-row1">
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
            <div className="form-row1">
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
                    <select className="dropdown" style={{ width: "100px" }}>
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

            <div className="form-row1">
          
              <div className="form-group">
  <label style={{marginLeft:"281px"}}>Trailer Size</label>
  <div className="counter-container">
  <label style={{ marginTop: "40px" }}>No. of Containers</label>
    <div className="counter">
      <span>6m</span>
      <input type="number" defaultValue="0" min="0" />
    </div>
    <div className="counter">
      <span>12m</span>
      <input type="number" defaultValue="0" min="0" />
    </div>
    <div className="counter">
      <span>Abnormal</span>
      <input type="number" defaultValue="0" min="0" />
    </div>
  </div>
</div>


              <div className="form-group">
                <label>VAT Rate</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Vat Rate"
                  defaultValue="15%"
                  style={{ width: "20%" }}
                  readOnly
                />
              </div>
            </div>
          </div>
          
         
          <div className="form-section">
            <div className="form-row1">
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
