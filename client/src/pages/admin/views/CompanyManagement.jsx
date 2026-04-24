"use client";

import { useState, useEffect } from "react";
import api from "../../../api.js"; // Import the Axios instance
import "../css/CompanyManagement.css";

function CompanyManagement() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    fetchCompanies();
    fetchPlans();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/admin/companies");
      setCompanies(response.data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await api.get("/api/admin/plans");
      setPlans(response.data);
    } catch (err) {
      console.error("Failed to fetch plans:", err);
    }
  };

  const handleAssignPlan = async (company_reg_num, planData) => {
    try {
      await api.post(`/api/admin/companies/${encodeURIComponent(company_reg_num)}/assign-plan`, planData);
      fetchCompanies();
      setShowPlanModal(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpgradePlan = async (company_reg_num, planData) => {
    try {
      await api.put(`/api/admin/companies/${encodeURIComponent(company_reg_num)}/upgrade-plan`, planData);
      fetchCompanies();
      setShowPlanModal(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSuspendCompany = async (company_reg_num, reason) => {
    try {
      await api.put(`/api/admin/companies/${encodeURIComponent(company_reg_num)}/suspend`, { reason });
      fetchCompanies();
      setShowSuspendModal(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReactivateCompany = async (company_reg_num) => {
    try {
      await api.put(`/api/admin/companies/${encodeURIComponent(company_reg_num)}/reactivate`);
      fetchCompanies();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStartTrial = async (company_reg_num) => {
    try {
      await api.post(`/api/admin/companies/${encodeURIComponent(company_reg_num)}/trial`);
      fetchCompanies();
    } catch (err) {
      setError(err.message);
    }
  };

  const openPlanModal = (company) => {
    setSelectedCompany(company);
    setShowPlanModal(true);
  };

  const openSuspendModal = (company) => {
    setSelectedCompany(company);
    setShowSuspendModal(true);
  };

  if (loading) return <div className="loading">Loading companies...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="company-management">
      <h2>Company Management</h2>

      {companies.length === 0 ? (
        <div className="no-companies">No companies found</div>
      ) : (
        <table className="companies-table">
          <thead>
            <tr>
              <th>Company Name</th>
              <th>Registration Number</th>
              <th>Plan</th>
              <th>Subscription Status</th>
              <th>Users</th>
              <th>Trucks</th>
              <th>Registration Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => (
              <tr
                key={company.company_reg_num}
                className={company.subscription_status === "suspended" ? "disabled-row" : ""}
              >
                <td>{company.companyname}</td>
                <td>{company.company_reg_num}</td>
                <td>
                  <span className={`plan-badge ${company.subscription_tier || "none"}`}>
                    {company.subscription_tier || "None"}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${company.subscription_status || "inactive"}`}>
                    {company.subscription_status || "Inactive"}
                  </span>
                  {company.subscription_status === "trial" && company.trial_ends_at && (
                    <span className="trial-info">
                      (Ends: {new Date(company.trial_ends_at).toLocaleDateString()})
                    </span>
                  )}
                </td>
                <td>{company.active_user_count || 0}</td>
                <td>{company.active_truck_count || 0}</td>
                <td>{new Date(company.dateofreg).toLocaleDateString()}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="plan-button"
                      onClick={() => openPlanModal(company)}
                      title="Manage Plan"
                    >
                      Plan
                    </button>
                    {company.subscription_status === "suspended" ? (
                      <button
                        className="reactivate-button"
                        onClick={() => handleReactivateCompany(company.company_reg_num)}
                        title="Reactivate"
                      >
                        Reactivate
                      </button>
                    ) : (
                      <button
                        className="suspend-button"
                        onClick={() => openSuspendModal(company)}
                        title="Suspend"
                      >
                        Suspend
                      </button>
                    )}
                    {!company.subscription_tier || company.subscription_tier === "none" ? (
                      <button
                        className="trial-button"
                        onClick={() => handleStartTrial(company.company_reg_num)}
                        title="Start Trial"
                      >
                        Start Trial
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Plan Management Modal */}
      {showPlanModal && selectedCompany && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>
              {selectedCompany.subscription_tier && selectedCompany.subscription_tier !== "none"
                ? "Upgrade/Downgrade Plan"
                : "Assign Plan"
              }
            </h3>
            <p>
              <strong>Company:</strong> {selectedCompany.companyname}
              <br />
              <strong>Current Plan:</strong> {selectedCompany.subscription_tier || "None"}
            </p>
            <div className="form-group">
              <label>Select Plan:</label>
              <select
                id="plan-select"
                defaultValue={selectedCompany.subscription_tier || ""}
              >
                <option value="">-- Select a plan --</option>
                {plans.map((plan) => (
                  <option key={plan.plan_key} value={plan.plan_key}>
                    {plan.display_name} - R{plan.monthly_fee_zar}/month
                  </option>
                ))}
              </select>
            </div>
            {!selectedCompany.subscription_tier || selectedCompany.subscription_tier === "none" ? (
              <>
                <div className="form-group">
                  <label>
                    <input type="checkbox" id="setup-fee-paid" /> Setup Fee Paid
                  </label>
                </div>
                <div className="form-group">
                  <label>Billing Anchor Day (1-28):</label>
                  <input type="number" id="billing-anchor" min="1" max="28" />
                </div>
              </>
            ) : null}
            <div className="form-group">
              <label>Notes:</label>
              <textarea id="plan-notes" rows="3" />
            </div>
            <div className="modal-actions">
              <button
                className="cancel-button"
                onClick={() => setShowPlanModal(false)}
              >
                Cancel
              </button>
              <button
                className="confirm-button"
                onClick={() => {
                  const planSelect = document.getElementById("plan-select");
                  const plan = planSelect.value;
                  if (!plan) return alert("Please select a plan");

                  const planData = {
                    plan,
                    notes: document.getElementById("plan-notes").value,
                  };

                  if (!selectedCompany.subscription_tier || selectedCompany.subscription_tier === "none") {
                    planData.setup_fee_paid = document.getElementById("setup-fee-paid").checked;
                    planData.billing_anchor_day = parseInt(document.getElementById("billing-anchor").value) || null;
                    handleAssignPlan(selectedCompany.company_reg_num, planData);
                  } else {
                    handleUpgradePlan(selectedCompany.company_reg_num, planData);
                  }
                }}
              >
                {selectedCompany.subscription_tier && selectedCompany.subscription_tier !== "none"
                ? "Change Plan"
                : "Assign Plan"
              }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {showSuspendModal && selectedCompany && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Suspend Company</h3>
            <p>
              <strong>Company:</strong> {selectedCompany.companyname}
              <br />
              <strong>Current Status:</strong> {selectedCompany.subscription_status}
            </p>
            <div className="form-group">
              <label>Reason for suspension:</label>
              <textarea id="suspend-reason" rows="3" required />
            </div>
            <div className="modal-actions">
              <button
                className="cancel-button"
                onClick={() => setShowSuspendModal(false)}
              >
                Cancel
              </button>
              <button
                className="confirm-button suspend-confirm"
                onClick={() => {
                  const reason = document.getElementById("suspend-reason").value;
                  if (!reason.trim()) return alert("Please provide a reason");
                  handleSuspendCompany(selectedCompany.company_reg_num, reason);
                }}
              >
                Suspend
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CompanyManagement;
