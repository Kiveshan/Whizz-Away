"use client";

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../css/SubcontractorList.css";
import Pagination from "../../../../components/Pagination";

const SubcontractorList = () => {
  const navigate = useNavigate();
  const [subcontractors, setSubcontractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(5);

  // Handle pagination
  const handlePageChange = useCallback((pageNumber) => {
    setCurrentPage(pageNumber);
  }, []);

  useEffect(() => {
    // Simulate API call with dummy data
    const fetchSubcontractors = async () => {
      try {
        // Simulate loading delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Dummy subcontractor data
        const dummySubcontractors = [
          {
            id: "SC001",
            companyName: "Elite Construction Services",
            contactPerson: "John Smith",
            email: "john@eliteconstruction.com",
            phone: "+1 (555) 123-4567",
          },
          {
            id: "SC002",
            companyName: "ProBuild Solutions",
            contactPerson: "Sarah Johnson",
            email: "sarah@probuildsolutions.com",
            phone: "+1 (555) 234-5678",
          },
          {
            id: "SC003",
            companyName: "MasterCraft Contractors",
            contactPerson: "Mike Wilson",
            email: "mike@mastercraftcontractors.com",
            phone: "+1 (555) 345-6789",
          },
          {
            id: "SC004",
            companyName: "Precision Flooring Co.",
            contactPerson: "Lisa Brown",
            email: "lisa@precisionflooring.com",
            phone: "+1 (555) 456-7890",
          },
          {
            id: "SC005",
            companyName: "Urban Landscaping",
            contactPerson: "David Martinez",
            email: "david@urbanlandscaping.com",
            phone: "+1 (555) 567-8901",
          },
          {
            id: "SC006",
            companyName: "Steel Frame Specialists",
            contactPerson: "Robert Taylor",
            email: "robert@steelframe.com",
            phone: "+1 (555) 678-9012",
          },
        ];

        setSubcontractors(dummySubcontractors);
      } catch (err) {
        console.error("Error fetching subcontractors:", err);
        setError("Failed to fetch subcontractors");
      } finally {
        setLoading(false);
      }
    };

    fetchSubcontractors();
  }, []);

  // Calculate pagination data
  const totalRecords = subcontractors.length;
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentSubcontractors = subcontractors.slice(startIndex, endIndex);

  return (
    <div className="subcontractor-list-wrapper">
      {/* Back Button */}
      <div className="subcontractor-header">
        <button className="back-button" onClick={() => navigate("/dashboard")}>
          Back
        </button>
      </div>

      {/* Loading and Error States */}
      {loading && <p>Loading subcontractors...</p>}
      {error && <p className="error-message">Error: {error}</p>}

      {/* Table */}
      {!loading && !error && (
        <div className="subcontractor-table-container">
          <table className="subcontractor-table">
            <thead>
              <tr>
                <th>Company Name</th>
                <th>Contact Person</th>
                <th>Email</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentSubcontractors.map((subcontractor) => (
                <tr key={subcontractor.id}>
                  <td>{subcontractor.companyName}</td>
                  <td>{subcontractor.contactPerson}</td>
                  <td>{subcontractor.email}</td>
                  <td>
                    <button
                      className="view-btn"
                      onClick={() =>
                        navigate("/Creditors/SubcontractorStatements", {
                          state: {
                            subcontractorId: subcontractor.id,
                            subcontractorName: subcontractor.companyName,
                          },
                        })
                      }
                    >
                      View Statements
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Component */}
      {totalRecords > 0 && (
        <Pagination
          totalRecords={totalRecords}
          recordsPerPage={recordsPerPage}
          currentPage={currentPage}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
};

export default SubcontractorList;
