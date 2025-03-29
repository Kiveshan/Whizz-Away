"use client";
import { useState } from "react";
import Select from "react-select";
import "../finance clerkpages/css/Expenses1.css";
import { useNavigate } from "react-router-dom";

const driverOptions = [
  { value: "John Doe", label: "John Doe" },
  { value: "Jane Smith", label: "Jane Smith" },
  { value: "Michael Johnson", label: "Michael Johnson" },
  { value: "Emily Davis", label: "Emily Davis" }
];

const ExpenseSubmission = ({ onBack }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    type: "Diesel",
    documentFrom: "Controller",
    expenseCost: "R500",
    description: "Low Tank",
    driverName: "" // Added field for driver name
  });

  const [file, setFile] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleDriverChange = (selectedOption) => {
    setFormData({ ...formData, driverName: selectedOption ? selectedOption.value : "" });
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    console.log("File:", file);
    onBack();
  };

  const handleCancel = () => {
    setFile(null);
  };

  return (
    <div className="expenses-container">
      <div className="client-payments-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          Back
        </button>
      </div>

      <form onSubmit={handleSubmit} className="submission-form">
        <div className="form-row">
          <div className="form-group">
            <label>Select Type</label>
            <select name="type" value={formData.type} onChange={handleInputChange} className="dropdown">
              <option value="Diesel">Diesel</option>
              <option value="Petrol">Petrol</option>
              {/* <option value="Maintenance">Maintenance</option>
              <option value="Toll">Toll</option> */}
            </select>
          </div>

          <div className="form-group">
            <label>Document From</label>
            <select
              name="documentFrom"
              value={formData.documentFrom}
              onChange={handleInputChange}
              className="dropdown"
            >
              <option value="Controller">Controller</option>
              <option value="Driver">Driver</option>
              <option value="Manager">Manager</option>
            </select>
          </div>

          <div className="form-group">
            <label>Expense Cost</label>
            <input
              type="text"
              name="expenseCost"
              value={formData.expenseCost}
              onChange={handleInputChange}
              className="form-input"
            />
          </div>
        </div>
        <div className="form-row">
         <div className="form-group">
          <label>Expense Cost</label>
          <input
            type="text"
            name="expenseCost"
            value={formData.expenseCost}
            onChange={handleInputChange}
            className="form-input"
            style={{width: "100%"}}
          />
        </div>
       
          <div className="form-group">
            <label>Driver Name</label>
            <Select
              options={driverOptions}
              onChange={handleDriverChange}
              isSearchable
              className="form-input"
              styles={{ width: "100%" }}
              placeholder="Select a driver"
            />
          </div>
        </div>
        
        
        <div className="file-upload-container">
          <div className="file-upload-header">
            <h3>Petrol Slip Submission</h3>
            <button type="button" className="close-button" onClick={handleCancel}>
              ×
            </button>
          </div>

          <div className="file-upload-area">
            <div className="drop-zone">
              <div className="upload-icon">📁</div>
              <p>Drop files here</p>
              <p className="file-format">Supported format: PNG, JPG</p>

              <div className="or-divider">OR</div>

              <div className="browse-files">
                <label htmlFor="file-upload" className="browse-button">
                  Browse files
                </label>
                <input
                  id="file-upload"
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
              </div>
            </div>
          </div>

          <div className="file-upload-actions">
            <button type="button" className="cancel-button" onClick={handleCancel}>
              Cancel
            </button>
            <button type="button" className="upload-button">
              Upload
            </button>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="submit-button">
            Submit
          </button>
        </div>
      </form>
    </div>
  );
};

export default ExpenseSubmission;
