"use client";

import { useState, useEffect, Fragment } from "react";
import styles from "../css/register.module.css";
import { Eye, EyeOff, User, Building2, CreditCard, Star, Check } from "lucide-react";
import { validatePassword, getPasswordStrength } from "../../../utils/passwordValidator.js";

const STEPS = [
  { label: "Personal Info", icon: User },
  { label: "Company Details", icon: Building2 },
  { label: "Banking Details", icon: CreditCard },
  { label: "Choose Plan", icon: Star },
];

const PLAN_OPTIONS = [
  {
    key: "lite",
    label: "Lite",
    price: "R2 000/mo",
    setup: "R2 500 once-off",
    users: "2 users",
    trucks: "5 trucks",
    features: ["Instructions", "Assignment", "Invoice", "Statements", "Manage"],
  },
  {
    key: "professional",
    label: "Professional",
    price: "R4 500/mo",
    setup: "R7 500 once-off",
    users: "5 users",
    trucks: "15 trucks",
    features: ["All Lite features", "Add-ons", "Analytics", "Reports"],
  },
  {
    key: "growth",
    label: "Growth",
    price: "R7 500/mo",
    setup: "R15 000 once-off",
    users: "15 users",
    trucks: "40 trucks",
    features: ["All Professional features", "Payroll", "Biometric Register", "VAT Management"],
  },
  {
    key: "enterprise",
    label: "Enterprise",
    price: "R10 500/mo",
    setup: "R25 000 once-off",
    users: "Unlimited",
    trucks: "Unlimited",
    features: ["All Growth features", "Creditors", "Priority Support"],
  },
];

const Register = ({ switchToLogin, closePopup }) => {
  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    email: "",
    password: "",
    companyname: "",
    company_reg_num: "",
    cluster_box: "",
    address: "",
    suburb: "",
    cellnum: "",
    cellnum2: "",
    vat_reg_num: "",
    account_num: "",
    name_of_acc: "",
    bank: "",
    branch: "",
    branch_code: "",
    swift_code: "",
    requested_plan: "",
    trial_requested: false,
  });

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isCheckingReg, setIsCheckingReg]     = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    lowercase: false,
    uppercase: false,
    number: false,
    special: false,
    valid: false,
  });

  useEffect(() => {
    let timer;
    if (showErrorPopup) {
      timer = setTimeout(() => setShowErrorPopup(false), 5000);
    }
    return () => clearTimeout(timer);
  }, [showErrorPopup]);

  useEffect(() => {
    let timer;
    if (showSuccessPopup) {
      timer = setTimeout(() => {
        setShowSuccessPopup(false);
        closePopup();
        switchToLogin();
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [showSuccessPopup, closePopup, switchToLogin]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // company_reg_num allows digits AND forward-slash (e.g. 2023/123456/07)
    const numericFields = ["cellnum", "cellnum2", "vat_reg_num", "account_num", "branch_code"];

    if (numericFields.includes(name) && value !== "" && !/^\d+$/.test(value)) return;

    if (name === "swift_code" && value !== "") {
      setFormData((prev) => ({ ...prev, [name]: value.toUpperCase() }));
      return;
    }

    if (name === "password") setPasswordStrength(getPasswordStrength(value));

    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errorMessage) {
      setErrorMessage("");
      setShowErrorPopup(false);
    }
  };

  const showError = (msg) => {
    setErrorMessage(msg);
    setShowErrorPopup(true);
  };

  const checkEmailExists = async (email) => {
    try {
      setIsCheckingEmail(true);
      const response = await fetch(`${API_BASE_URL}/check-email?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      if (data.exists) {
        showError("This email is already registered. Please use a different email or login.");
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const checkCompanyRegExists = async (company_reg_num) => {
    if (!company_reg_num) return false;
    try {
      setIsCheckingReg(true);
      const response = await fetch(
        `${API_BASE_URL}/check-company-reg?company_reg_num=${encodeURIComponent(company_reg_num)}`
      );
      const data = await response.json();
      if (data.exists) {
        showError("This company registration number is already registered. Please login or contact support.");
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      setIsCheckingReg(false);
    }
  };

  const validateSwiftCode = (code) => {
    if (!code) return true;
    if (code.length !== 8 && code.length !== 11) return "SWIFT code must be either 8 or 11 characters long";
    if (!/^[A-Z]{4}/.test(code)) return "First 4 characters of SWIFT code must be letters";
    if (!/^[A-Z]{4}[A-Z]{2}/.test(code)) return "Characters 5-6 of SWIFT code must be letters (country code)";
    if (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}/.test(code)) return "Characters 7-8 of SWIFT code must be letters or numbers";
    if (code.length === 11 && !/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}[A-Z0-9]{3}$/.test(code))
      return "Last 3 characters of SWIFT code must be letters or numbers";
    return true;
  };

  const validateStep = async (step) => {
    if (step === 1) {
      if (!formData.name || !formData.surname || !formData.email || !formData.password) {
        showError("Please fill in all required fields.");
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        showError("Please enter a valid email address.");
        return false;
      }
      const pwResult = validatePassword(formData.password);
      if (pwResult !== true) {
        showError(pwResult);
        return false;
      }
      const emailExists = await checkEmailExists(formData.email);
      if (emailExists) return false;
      return true;
    }

    if (step === 2) {
      if (!formData.companyname || !formData.company_reg_num || !formData.cellnum || !formData.address || !formData.suburb) {
        showError("Please fill in all required fields.");
        return false;
      }
      if (!/^[\d/]+$/.test(formData.company_reg_num)) {
        showError("Company Registration Number may only contain numbers and forward slashes (e.g. 2023/123456/07).");
        return false;
      }
      if (!/^\d{10}$/.test(formData.cellnum)) {
        showError("Cell Number must be exactly 10 digits.");
        return false;
      }
      if (formData.cellnum2 && !/^\d{10}$/.test(formData.cellnum2)) {
        showError("Alternate Cell Number must be exactly 10 digits.");
        return false;
      }
      if (formData.vat_reg_num && !/^\d+$/.test(formData.vat_reg_num)) {
        showError("VAT Registration Number must contain only numbers.");
        return false;
      }
      const regExists = await checkCompanyRegExists(formData.company_reg_num);
      if (regExists) return false;
      return true;
    }

    if (step === 3) {
      if (!formData.account_num || !formData.name_of_acc || !formData.bank || !formData.branch || !formData.branch_code) {
        showError("Please fill in all required fields.");
        return false;
      }
      if (!/^\d+$/.test(formData.account_num)) {
        showError("Account Number must contain only numbers.");
        return false;
      }
      if (!/^\d+$/.test(formData.branch_code)) {
        showError("Branch Code must contain only numbers.");
        return false;
      }
      const swiftResult = validateSwiftCode(formData.swift_code);
      if (swiftResult !== true) {
        showError(swiftResult);
        return false;
      }
      return true;
    }

    if (step === 4) {
      if (!formData.requested_plan) {
        showError("Please select a plan to continue.");
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNext = async () => {
    const valid = await validateStep(currentStep);
    if (valid) setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => setCurrentStep((prev) => prev - 1);

  const handleRegister = async (e) => {
    e.preventDefault();
    const valid = await validateStep(4);
    if (!valid) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (response.ok) {
        setSuccessMessage("Registration successful! Your account is pending approval.");
        setShowSuccessPopup(true);
      } else {
        if (data.message === "Email already registered") {
          showError("This email is already registered. Please use a different email or login.");
        } else if (data.message === "Company registration number already exists") {
          showError("This company registration number is already registered.");
        } else {
          showError(data.message || "Registration failed");
        }
      }
    } catch {
      showError("An error occurred. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Stepper ──────────────────────────────────────────────
  const Stepper = () => (
    <div className={styles.stepper}>
      {STEPS.map((step, index) => {
        const stepNum = index + 1;
        const isCompleted = currentStep > stepNum;
        const isActive = currentStep === stepNum;
        return (
          <Fragment key={stepNum}>
            <div className={styles.stepItem}>
              <div
                className={`${styles.stepCircle} ${
                  isCompleted ? styles.stepCompleted : isActive ? styles.stepActive : styles.stepInactive
                }`}
              >
                {isCompleted ? <Check size={14} /> : stepNum}
              </div>
              <span className={`${styles.stepLabel} ${isActive ? styles.stepLabelActive : ""}`}>
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div className={`${styles.stepLine} ${isCompleted ? styles.stepLineCompleted : ""}`} />
            )}
          </Fragment>
        );
      })}
    </div>
  );

  // ── Step content ─────────────────────────────────────────
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>First Name <span className={styles.required}>*</span></label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="First Name"
                  className={styles.formInput}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Last Name <span className={styles.required}>*</span></label>
                <input
                  type="text"
                  name="surname"
                  value={formData.surname}
                  onChange={handleChange}
                  placeholder="Last Name"
                  className={styles.formInput}
                />
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Email <span className={styles.required}>*</span></label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={(e) => e.target.value && checkEmailExists(e.target.value)}
                  placeholder="Email Address"
                  className={styles.formInput}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Password <span className={styles.required}>*</span></label>
                <div className={styles.passwordInputContainer}>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Password"
                    className={`${styles.formInput} ${
                      formData.password
                        ? passwordStrength.valid
                          ? styles.validPassword
                          : styles.invalidPassword
                        : ""
                    }`}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggleBtn}
                    onClick={() => setShowPassword((p) => !p)}
                    tabIndex="-1"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className={styles.passwordEyeIcon} size={18} />
                    ) : (
                      <Eye className={styles.passwordEyeIcon} size={18} />
                    )}
                  </button>
                  {formData.password && (
                    <span
                      className={`${styles.passwordIndicator} ${
                        passwordStrength.valid ? styles.valid : styles.invalid
                      }`}
                    >
                      {passwordStrength.valid ? "✓" : "✕"}
                    </span>
                  )}
                </div>
                <small className={styles.formHint}>
                  8+ chars with lowercase, uppercase, number &amp; special char
                </small>
              </div>
            </div>
          </>
        );

      case 2:
        return (
          <>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Company Name <span className={styles.required}>*</span></label>
                <input
                  type="text"
                  name="companyname"
                  value={formData.companyname}
                  onChange={handleChange}
                  placeholder="Company Name"
                  className={styles.formInput}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Company Reg. No. <span className={styles.required}>*</span></label>
                <input
                  type="text"
                  name="company_reg_num"
                  value={formData.company_reg_num}
                  onChange={handleChange}
                  onBlur={(e) => e.target.value && checkCompanyRegExists(e.target.value)}
                  placeholder="e.g. 2023/123456/07"
                  className={styles.formInput}
                />
                <small className={styles.formHint}>Digits and / only (e.g. 2023/123456/07)</small>
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>VAT Reg. No.</label>
                <input
                  type="text"
                  name="vat_reg_num"
                  value={formData.vat_reg_num}
                  onChange={handleChange}
                  placeholder="VAT Number"
                  className={styles.formInput}
                  maxLength={20}
                />
                <small className={styles.formHint}>Numbers only (optional)</small>
              </div>
              <div className={styles.formGroup}>
                <label>Cell Number <span className={styles.required}>*</span></label>
                <input
                  type="text"
                  name="cellnum"
                  value={formData.cellnum}
                  onChange={handleChange}
                  placeholder="Cell Number"
                  className={styles.formInput}
                  maxLength={10}
                />
                <small className={styles.formHint}>10 digits, numbers only</small>
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Alternate Cell</label>
                <input
                  type="text"
                  name="cellnum2"
                  value={formData.cellnum2}
                  onChange={handleChange}
                  placeholder="Alternate Cell"
                  className={styles.formInput}
                  maxLength={10}
                />
                <small className={styles.formHint}>10 digits, numbers only (optional)</small>
              </div>
              <div className={styles.formGroup}>
                <label>Address <span className={styles.required}>*</span></label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Street Address"
                  className={styles.formInput}
                />
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Suburb <span className={styles.required}>*</span></label>
                <input
                  type="text"
                  name="suburb"
                  value={formData.suburb}
                  onChange={handleChange}
                  placeholder="Suburb"
                  className={styles.formInput}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Cluster Box</label>
                <input
                  type="text"
                  name="cluster_box"
                  value={formData.cluster_box}
                  onChange={handleChange}
                  placeholder="Cluster Box"
                  className={styles.formInput}
                />
              </div>
            </div>
          </>
        );

      case 3:
        return (
          <>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Account Number <span className={styles.required}>*</span></label>
                <input
                  type="text"
                  name="account_num"
                  value={formData.account_num}
                  onChange={handleChange}
                  placeholder="Account Number"
                  className={styles.formInput}
                />
                <small className={styles.formHint}>Numbers only</small>
              </div>
              <div className={styles.formGroup}>
                <label>Account Name <span className={styles.required}>*</span></label>
                <input
                  type="text"
                  name="name_of_acc"
                  value={formData.name_of_acc}
                  onChange={handleChange}
                  placeholder="Name of Account"
                  className={styles.formInput}
                />
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Bank <span className={styles.required}>*</span></label>
                <input
                  type="text"
                  name="bank"
                  value={formData.bank}
                  onChange={handleChange}
                  placeholder="Bank"
                  className={styles.formInput}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Branch <span className={styles.required}>*</span></label>
                <input
                  type="text"
                  name="branch"
                  value={formData.branch}
                  onChange={handleChange}
                  placeholder="Branch"
                  className={styles.formInput}
                />
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Branch Code <span className={styles.required}>*</span></label>
                <input
                  type="text"
                  name="branch_code"
                  value={formData.branch_code}
                  onChange={handleChange}
                  placeholder="Branch Code"
                  className={styles.formInput}
                />
                <small className={styles.formHint}>Numbers only</small>
              </div>
              <div className={styles.formGroup}>
                <label>SWIFT Code</label>
                <input
                  type="text"
                  name="swift_code"
                  value={formData.swift_code}
                  onChange={handleChange}
                  placeholder="SWIFT Code (8 or 11 chars)"
                  className={styles.formInput}
                  maxLength={11}
                />
                <small className={styles.formHint}>Format: BANK+COUNTRY+LOCATION+[BRANCH] (optional)</small>
              </div>
            </div>
          </>
        );

      case 4:
        return (
          <>
            <p className={styles.planIntro}>
              A Whizz-Away team member will confirm your plan and billing during onboarding.
            </p>

            {/* Trial toggle */}
            <label className={styles.trialToggleRow}>
              <input
                type="checkbox"
                checked={formData.trial_requested}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, trial_requested: e.target.checked }))
                }
                className={styles.trialCheckbox}
              />
              <span className={styles.trialToggleLabel}>
                Start with a <strong>14-day free trial</strong> of my chosen plan
                <span className={styles.trialToggleHint}> — no payment required during the trial</span>
              </span>
            </label>

            <div className={styles.planGrid}>
              {PLAN_OPTIONS.map((plan) => {
                const isSelected = formData.requested_plan === plan.key;
                return (
                  <button
                    key={plan.key}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, requested_plan: plan.key }))}
                    className={`${styles.planCard} ${isSelected ? styles.planCardSelected : ""}`}
                  >
                    {isSelected && (
                      <span className={styles.planCheckmark}>
                        <Check size={12} />
                      </span>
                    )}
                    <div className={styles.planName}>{plan.label}</div>
                    <div className={styles.planPrice}>
                      {plan.price} &bull; {plan.setup}
                    </div>
                    <div className={styles.planMeta}>
                      {plan.users} &bull; {plan.trucks}
                    </div>
                    <ul className={styles.planFeatures}>
                      {plan.features.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
          </>
        );

      default:
        return null;
    }
  };

  const StepIcon = STEPS[currentStep - 1].icon;
  const isLastStep = currentStep === STEPS.length;
  const isFirstStep = currentStep === 1;

  return (
    <div className={styles.registerContainer}>
      {showErrorPopup && errorMessage && (
        <div className={styles.errorPopup}>
          <div className={styles.errorPopupContent}>
            <span className={styles.closePopup} onClick={() => setShowErrorPopup(false)}>×</span>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      {showSuccessPopup && successMessage && (
        <div className={styles.successPopup}>
          <div className={styles.successPopupContent}>
            <span className={styles.closePopup} onClick={() => setShowSuccessPopup(false)}>×</span>
            <p>{successMessage}</p>
          </div>
        </div>
      )}

      <div className={styles.registerForm}>
        <h1 className={styles.registerTitle}>Register</h1>

        <Stepper />

        <form onSubmit={handleRegister}>
          <div className={styles.stepCard}>
            <div className={styles.stepHeader}>
              <StepIcon className={styles.stepHeaderIcon} size={22} />
              <h2 className={styles.stepHeaderTitle}>{STEPS[currentStep - 1].label}</h2>
            </div>

            {renderStepContent()}

            <div className={styles.stepNav}>
              {!isFirstStep && (
                <button type="button" className={styles.backBtn} onClick={handleBack}>
                  Back
                </button>
              )}
              {isLastStep ? (
                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={isLoading || isCheckingEmail}
                >
                  {isLoading ? "Submitting..." : "Submit Application"}
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.nextBtn}
                  onClick={handleNext}
                  disabled={isCheckingEmail || isCheckingReg}
                >
                  {isCheckingEmail || isCheckingReg ? "Checking..." : "Next"}
                </button>
              )}
            </div>
          </div>
        </form>

        <div className={styles.loginLink}>
          <button onClick={switchToLogin} className={styles.linkButton}>
            Already have a profile? Login here
          </button>
        </div>
      </div>
    </div>
  );
};

export default Register;
