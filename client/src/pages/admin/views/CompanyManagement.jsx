"use client";

import { useState, useEffect } from "react";
import api from "../../../api.js"; // Import the Axios instance
import "../css/CompanyManagement.css";

const PAGE_SIZE = 10;

function CompanyManagement() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [plans, setPlans] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [modalPlan, setModalPlan] = useState("");
  const [modalSetupFeePaid, setModalSetupFeePaid] = useState(false);
  const [modalNotes, setModalNotes] = useState("");
  const [suspendReason, setSuspendReason] = useState("");

  useEffect(() => {
    fetchCompanies();
    fetchPlans();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

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
    setModalPlan(company.subscription_tier || "");
    setModalSetupFeePaid(false);
    setModalNotes("");
    setShowPlanModal(true);
  };

  const openSuspendModal = (company) => {
    setSelectedCompany(company);
    setSuspendReason("");
    setShowSuspendModal(true);
  };

  if (loading) return <div className="loading">Loading companies...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  const filtered = companies.filter((c) => {
    const matchesSearch =
      c.companyname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.company_reg_num.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (c.subscription_status || "inactive") === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="company-management">
      <div className="cm-header">
        <h2>Company Management</h2>
        <div className="cm-filters">
          <select
            className="cm-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="suspended">Suspended</option>
            <option value="inactive">Inactive</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <input
            className="cm-search"
            type="text"
            placeholder="Search by name or reg number…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {companies.length === 0 ? (
        <div className="no-companies">No companies found</div>
      ) : filtered.length === 0 ? (
        <div className="no-companies">No companies match your search</div>
      ) : (
        <>
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
              {paginated.map((company) => (
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

          <div className="pagination">
            <button
              className="pagination-button"
              onClick={() => setCurrentPage((p) => p - 1)}
              disabled={currentPage === 1}
            >
              &larr; Previous
            </button>
            <span className="pagination-info">
              Page {currentPage} of {totalPages} &nbsp;·&nbsp; {filtered.length} companies
            </span>
            <button
              className="pagination-button"
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={currentPage === totalPages}
            >
              Next &rarr;
            </button>
          </div>
        </>
      )}

      {/* Plan Management Modal */}
      {showPlanModal && selectedCompany && (() => {
        const isNewPlan = !selectedCompany.subscription_tier || selectedCompany.subscription_tier === "none";
        return (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>{isNewPlan ? "Assign Plan" : "Change Plan"}</h3>
              </div>

              <div className="modal-body">
                <div className="modal-company-info">
                  <span className="modal-company-name">{selectedCompany.companyname}</span>
                  {!isNewPlan && (
                    <span className={`plan-badge ${selectedCompany.subscription_tier}`}>
                      {selectedCompany.subscription_tier}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label>Plan</label>
                  <select
                    value={modalPlan}
                    onChange={(e) => setModalPlan(e.target.value)}
                  >
                    <option value="">— Select a plan —</option>
                    {plans.map((plan) => (
                      <option key={plan.plan_key} value={plan.plan_key}>
                        {plan.display_name} · R{plan.monthly_fee_zar}/month
                      </option>
                    ))}
                  </select>
                </div>

                {isNewPlan && (
                  <div className="form-group">
                    <div className="checkbox-row">
                      <input
                        type="checkbox"
                        id="setup-fee-paid"
                        checked={modalSetupFeePaid}
                        onChange={(e) => setModalSetupFeePaid(e.target.checked)}
                      />
                      <label htmlFor="setup-fee-paid">Setup fee paid</label>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    rows="3"
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
                    placeholder="Optional notes…"
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button className="cancel-button" onClick={() => setShowPlanModal(false)}>
                  Cancel
                </button>
                <button
                  className="confirm-button"
                  onClick={() => {
                    if (!modalPlan) return alert("Please select a plan");
                    const planData = { plan: modalPlan, notes: modalNotes };
                    if (isNewPlan) {
                      planData.setup_fee_paid = modalSetupFeePaid;
                      planData.billing_anchor_day = null;
                      handleAssignPlan(selectedCompany.company_reg_num, planData);
                    } else {
                      handleUpgradePlan(selectedCompany.company_reg_num, planData);
                    }
                  }}
                >
                  {isNewPlan ? "Assign Plan" : "Change Plan"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Suspend Modal */}
      {showSuspendModal && selectedCompany && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Suspend Company</h3>
            </div>
            <div className="modal-body">
              <div className="modal-company-info" style={{ borderLeftColor: "#ef4444" }}>
                <span className="modal-company-name">{selectedCompany.companyname}</span>
                <span className={`status-badge ${selectedCompany.subscription_status || "inactive"}`}>
                  {selectedCompany.subscription_status || "inactive"}
                </span>
              </div>
              <div className="form-group">
                <label>Reason for suspension</label>
                <textarea
                  rows="3"
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="Describe why this company is being suspended…"
                />
              </div>
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
                  if (!suspendReason.trim()) return alert("Please provide a reason");
                  handleSuspendCompany(selectedCompany.company_reg_num, suspendReason);
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
