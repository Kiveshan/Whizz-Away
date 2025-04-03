import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const FinanceClerkWage = () => {
  const [drivers, setDrivers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:5000/employees/drivers")
      .then(response => response.json())
      .then(data => {
        setDrivers(data);
        console.log(data); 
      })
      .catch(error => console.error('Error fetching drivers:', error));
  }, []);

  const handleViewClick = (driver) => {
    navigate(`/finance-clerk-wage-details/${driver.userid}`, { state: { name: `${driver.name} ${driver.surname}` } });
  };

  return (
    <div className="wage-container">
      <div className="button-container">
        <button onClick={() => navigate("/FDashboard")} className="back-button">
          Back
        </button>
      </div>
      
      <div className="wage-table-container">
        <table className="wage-table1">
          <thead>
            <tr>
              <th>Driver Name</th>
              <th>Wage</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((driver) => (
              <tr key={driver.userid}>
                <td>{driver.name} {driver.surname}</td>
                <td>
                  <button 
                    onClick={()=>handleViewClick(driver)}
                    className="view-btn">
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FinanceClerkWage;

