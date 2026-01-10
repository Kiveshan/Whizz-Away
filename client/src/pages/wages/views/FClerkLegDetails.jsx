// export default FClerkLegDetails
"use client";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../../api";
import "../css/finance-clerk-wage.css";

const FClerkLegDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Get data from location state
  const { driverId, driverName, selectedMonth, selectedYear } =
    location.state || {};

  const [legs, setLegs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLegDetails = async () => {
    if (!driverId) {
      setError("Missing driver ID");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get selectedMonth and selectedYear from location state
      const month = location.state?.selectedMonth;
      const year = location.state?.selectedYear;

      console.log(
        `Fetching all leg details for driver ID: ${driverId}, month: ${month}, year: ${year}`
      );

      if (!month || !year) {
        setError("Missing month or year from previous screen");
        setLoading(false);
        return;
      }

      // Use the new endpoint that filters by month and year but includes ALL instructions
      const url = `/api/all-driver-legs/${driverId}/by-month?month=${encodeURIComponent(
        month
      )}&year=${encodeURIComponent(year)}`;
      console.log("Attempting to fetch from URL:", url);

      const response = await api.get(url);

      if (!response.data) {
        throw new Error("No data received from server");
      }

      console.log(
        `Successfully fetched ${response.data.length} legs for ${month} ${year}`
      );

      // Process the legs data
      const processedLegs = Array.isArray(response.data)
        ? response.data.map((leg) => ({
            ...leg,
            displayInstructionId: leg.m1key || "N/A",
          }))
        : [];

      setLegs(processedLegs);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching leg details:", error);
      setError(`Failed to load leg details: ${error.message}`);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLegDetails();
  }, [driverId, location.state?.selectedMonth, location.state?.selectedYear]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "5px",
          marginBottom: "15px",
        }}
      >
        <button
          onClick={() =>
            navigate(`/finance-clerk-wage-details/${driverId}`, {
              state: { name: driverName },
            })
          }
          className="back-button"
        >
          Back
        </button>
      </div>

      <h2
        style={{
          textAlign: "center",
          margin: "0 0 15px 0",
          fontWeight: "normal",
          fontSize: "24px",
          marginTop: "-35px",
        }}
      >
        {driverName || `Driver ${driverId}`} - {selectedMonth} {selectedYear}
      </h2>

      {loading ? (
        <div style={{ textAlign: "center", padding: "20px" }}>
          Loading leg details...
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "20px", color: "red" }}>
          {error}
        </div>
      ) : (
        <table
          style={{
            width: "1000px",
            margin: "0 auto",
            borderCollapse: "collapse",
            fontSize: "16px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            borderRadius: "5px",
            overflow: "hidden",
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: "#87CEEB",
                padding: "12px 10px",
                textAlign: "left",
              }}
            >
              <th>Instruction ID</th>
              <th>Leg Number</th>
              <th>Truck Reg</th>
              <th>Container Number</th>
              <th>Starting Point</th>
              <th>Ending Point</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {legs.length === 0 ? (
              <tr>
                <td
                  colSpan="8"
                  style={{ textAlign: "center", padding: "15px" }}
                >
                  No leg details found for {selectedMonth} {selectedYear}
                </td>
              </tr>
            ) : (
              legs.map((leg) => (
                <tr
                  key={leg.legkey}
                  style={{
                    backgroundColor: "white",
                    padding: "12px 10px",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  <td>{leg.displayInstructionId}</td>
                  <td>{leg.legnumber || "N/A"}</td>
                  <td>{leg.truckregnumber || "N/A"}</td>
                  <td>{leg.containernumber || "N/A"}</td>
                  <td>{leg.startingpoint || "N/A"}</td>
                  <td>{leg.destination || "N/A"}</td>
                  <td>{formatDate(leg.date)}</td>
                  <td>
                    R{leg.driverrate ? leg.driverrate.toFixed(2) : "0.00"}
                  </td>
                  <td>{leg.instruction_status || "N/A"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </>
  );
};

export default FClerkLegDetails;
