import "../css/controllerViewAssignement.css";
import React from "react";
import { useNavigate } from "react-router-dom";

const DirectorManagerViewAssignment = () => {
  const navigate = useNavigate();

  return (
    <>
      <button className="back-button" onClick={() => navigate(-1)}> Back</button>
      <div className="view-assignment-wrapper1">
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
                <input type="text" className="form-input"  defaultValue="port 1" readOnly/>
              </div>
              {/* <div className="form-group">
                <label>Driver Rate</label>
                <input type="text" className="form-input" defaultValue="R18" />
              </div> */}
              <div className="form-group">
                <label>Destination</label>
                <input type="text" className="form-input"  defaultValue="port 2" readOnly/>
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
              <input type="text" className="form-input"  defaultValue="Albert" readOnly/>
              </div>
              <div className="details-cell">
              <input type="text" className="form-input"  defaultValue="147" readOnly/>
              </div>
              <div className="details-cell">
                <input type="text" className="form-input" defaultValue="01234567" readOnly/>
              </div>
              <div className="details-cell">
                <input type="text" className="form-input" defaultValue="11/2/2025" readOnly/>
              </div>
              <div className="details-cell">
                <input type="text" className="form-input" defaultValue="150000kg" readOnly/>
              </div>
            </div>

            <div className="details-row">
              <div className="details-cell">
              <input type="text" className="form-input"  defaultValue="Hilbert" readOnly/>
              </div>
              <div className="details-cell">
              <input type="text" className="form-input"  defaultValue="152" readOnly/>
              </div>
              <div className="details-cell">
                <input type="text" className="form-input" defaultValue="15423698" readOnly/>
              </div>
              <div className="details-cell">
                <input type="text" className="form-input" defaultValue="12/2/2025" readOnly/>
              </div>
              <div className="details-cell">
                <input type="text" className="form-input" defaultValue="145000kg" readOnly/>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DirectorManagerViewAssignment;
