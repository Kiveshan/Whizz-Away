import "../css/controllerViewAssignement.css";
import React from "react";
import { useNavigate } from "react-router-dom";

const ViewAssignmentPage = () => {
  const navigate = useNavigate();

  return (
    <>
      <button className="back-button" onClick={() => navigate(-1)}> Back</button>
      <div className="view-assignment-wrapper">
        <div className="content">
          <div className="progress-tracker">
            <div className="leg-button">Leg 1</div>
            <div className="leg-button">Leg 2</div>
            <div className="leg-button">Leg 3</div>
            <div className="leg-button">Leg 4</div>
            <div className="leg-button">Leg 5</div>
            <div className="leg-button">Leg 6</div>
          </div>

          <div className="form-section">
            <div className="form-row">
              <div className="form-group">
                <label>Starting Point</label>
                <div className="select-wrapper">
                  <select className="form-select">
                    <option>Yard</option>
                  </select>
                </div>
              </div>
              {/* <div className="form-group">
                <label>Driver Rate</label>
                <input type="text" className="form-input" defaultValue="R18" />
              </div> */}
              <div className="form-group">
                <label>Destination</label>
                <div className="select-wrapper">
                  <select className="form-select">
                    <option>Port- Pier 1</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="assignment-details">
            <div className="details-row header-row">
              <div className="details-cell">Drivers</div>
              <div className="details-cell">Truck Number</div>
              <div className="details-cell">Container Number</div>
              <div className="details-cell">Date</div>
              <div className="details-cell">VGM</div>
            </div>

            <div className="details-row">
              <div className="details-cell">
                <div className="select-wrapper">
                  <select className="form-select">
                    <option>Albert</option>
                  </select>
                </div>
              </div>
              <div className="details-cell">
                <div className="select-wrapper">
                  <select className="form-select">
                    <option>147</option>
                  </select>
                </div>
              </div>
              <div className="details-cell">
                <input type="text" className="form-input" defaultValue="01234567" />
              </div>
              <div className="details-cell">
                <input type="text" className="form-input" defaultValue="11/2/2025" />
              </div>
              <div className="details-cell">
                <input type="text" className="form-input" defaultValue="150000kg" />
              </div>
            </div>

            <div className="details-row">
              <div className="details-cell">
                <div className="select-wrapper">
                  <select className="form-select">
                    <option>Hilbert</option>
                  </select>
                </div>
              </div>
              <div className="details-cell">
                <div className="select-wrapper">
                  <select className="form-select">
                    <option>152</option>
                  </select>
                </div>
              </div>
              <div className="details-cell">
                <input type="text" className="form-input" defaultValue="15423698" />
              </div>
              <div className="details-cell">
                <input type="text" className="form-input" defaultValue="12/2/2025" />
              </div>
              <div className="details-cell">
                <input type="text" className="form-input" defaultValue="145000kg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ViewAssignmentPage;
