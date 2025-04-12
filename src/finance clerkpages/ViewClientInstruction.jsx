import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../finance clerkpages/css/ViewClientInstruction.css";

const ViewClientInstruction=()=>{
  const navigate=useNavigate()
  const [clients,setClients]=useState([]);

    const fetchClientInstructions = async () => {
      try {
        const response = await fetch("http://localhost:5000/client-instructions")
        if (!response.ok) {
          throw new Error("Failed to fetch client instructions")
        }
        const data = await response.json()
        setClients(data)
      } catch (err) {
        console.error("Error fetching client instructions:", err)
      }
    }
  useEffect(()=>{
    fetchClientInstructions()
  }, [])

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchClientInstructions()
    }, 5000) 
    return () => clearInterval(intervalId)
  }, [])
  const handleViewClick=(client)=>{
    navigate("/instructions",{state:{clientId:client.m5clientkey}});
  }

  return (
    <div className="">
      <div className="client-payments-header">
        <button className="back-button" onClick={() => navigate("/FDashboard")}>
          Back
        </button>
      </div>



      {/* Table */}
      <div className="clientinstructiontable">
        <table className="t1">
          <thead className="bg-blue-300">
            <tr>
              <th className="p-3">Company</th>
              <th className="p-3">Representative</th>
              <th className="p-3">Email</th>
              <th className="p-3">New</th>
              <th className="p-3">In progress</th>
              <th className="p-3">Instructions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.m5clientkey} className="border-t">
                <td className="p-3">{client.companyname}</td>
                <td className="p-3">{client.representative}</td>
                <td className="p-3">{client.email}</td>
                <td className="p-3">{client.new_count}</td>
                <td className="p-3">{client.in_progress_count}</td>
                <td className="p-3">
                  <button className="view-butn" onClick={()=>handleViewClick(client)}>
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

export default ViewClientInstruction;
