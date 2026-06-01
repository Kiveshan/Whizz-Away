import {
  findUserByEmail,
  comparePassword,
  checkEmailExists,
  checkCompanyRegNumExists,
  registerUser,
  checkCompanyStatus,
} from "../../models/auth/authModel.js";
import passport from "passport";
import jwt from "jsonwebtoken";
import { secretKey } from "../../config/secrets.js";
import { PLAN_RANK, ROLE_PLAN_MAP, ROLEID_NAME_MAP } from "../../middleware/planAuthorization.js";

const login = async (req, res, next) => {
  passport.authenticate("local", async (err, user, info) => {
    if (err) {
      console.error("Authentication error:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
    if (!user) {
      return res
        .status(401)
        .json({ message: info?.message || "Invalid email or password" });
    }

    if (user.status === "rejected") {
      console.log(`User ${user.email} was rejected (status: ${user.status})`);
      return res.status(403).json({
        message: "Your account was rejected. Please contact our admin",
      });
    }

    if (user.status === "pending") {
      console.log(
        `User ${user.email} is pending approval (status: ${user.status})`
      );
      return res
        .status(403)
        .json({ message: "Your account is pending approval." });
    }

    if (!user.roleid) {
      return res
        .status(403)
        .json({ message: "Access denied. Please contact an administrator." });
    }

    if (user.roleid !== 7) {
      if (user.table === "usertable" && user.status !== "active") {
        console.log(
          `User ${user.email} is not active (status: ${user.status})`
        );
        return res.status(403).json({
          message:
            "Your account is not active. Please contact an administrator.",
        });
      } else if (user.table === "m5_employee" && user.status !== true) {
        console.log(
          `Employee ${user.email} is not active (status: ${user.status})`
        );
        return res.status(403).json({
          message:
            "Your account is not active. Please contact an administrator.",
        });
      }

      if (user.company_reg_num) {
        const companyActive = await checkCompanyStatus(user.company_reg_num);
        if (!companyActive) {
          console.log(
            `No active company admin found for company_reg_num: ${user.company_reg_num}`
          );
          return res.status(403).json({
            message:
              "Your company account is not active. Please contact an administrator.",
          });
        }
      }
    }

    // Fetch subscription fields for company admins (roleid 1) and employees
    let subscription_tier = "none";
    let subscription_status = "inactive";
    let trial_ends_at = null;

    if (user.company_reg_num) {
      try {
        const { pool } = await import("../../config/database.js");
        const subClient = await pool.connect();
        try {
          const subResult = await subClient.query(
            `SELECT subscription_tier, subscription_status, trial_ends_at
             FROM usertable
             WHERE company_reg_num = $1 AND roleid = 1
             LIMIT 1`,
            [user.company_reg_num]
          );
          if (subResult.rows[0]) {
            subscription_tier   = subResult.rows[0].subscription_tier;
            subscription_status = subResult.rows[0].subscription_status;
            trial_ends_at       = subResult.rows[0].trial_ends_at;
          }
        } finally {
          subClient.release();
        }
      } catch (subErr) {
        console.error("Failed to fetch subscription for JWT:", subErr);
      }
    }

    // Block login if the company's plan is below the minimum required for this role.
    // roleid 1 (company admin) and 7 (super admin) are always allowed.
    if (user.roleid !== 1 && user.roleid !== 7) {
      const roleName = ROLEID_NAME_MAP[user.roleid];
      const minimumPlan = roleName ? ROLE_PLAN_MAP[roleName] : null;
      if (minimumPlan) {
        const tierRank = PLAN_RANK[subscription_tier] ?? 0;
        const requiredRank = PLAN_RANK[minimumPlan] ?? 99;
        if (tierRank < requiredRank) {
          return res.status(403).json({
            message: `Your role requires the ${minimumPlan} plan or above. Please contact your company administrator.`,
          });
        }
      }
    }

    const token = jwt.sign(
      {
        userid: user.userid,
        name: user.name,
        surname: user.surname,
        email: user.email,
        roleid: user.roleid,
        table: user.table,
        company_reg_num: user.company_reg_num,
        subscription_tier,
        subscription_status,
        trial_ends_at,
      },
      secretKey,
      { expiresIn: "2h" }
    );

    req.session.user = {
      userid: user.userid,
      name: user.name,
      surname: user.surname,
      email: user.email,
      roleid: user.roleid,
      table: user.table,
      company_reg_num: user.company_reg_num,
      subscription_tier,
      subscription_status,
      trial_ends_at,
    };
    console.log("User stored in session:", req.session.user);

    const { roleid } = user;
    let redirectUrl = "/";
    if (roleid === 1) redirectUrl = "/Dashboard";
    else if (roleid === 2) redirectUrl = "/ControllerDashboard";
    else if (roleid === 3) redirectUrl = "/FDashboard";
    else if (roleid === 4) redirectUrl = "/DirectorDashboard";
    else if (roleid === 7) redirectUrl = "/AdminDashboard";
    else if (roleid === 8) redirectUrl = "/CreditorsDashboard";

    return res.json({
      message: "Login successful",
      redirectUrl,
      token,
      user: {
        userid: user.userid,
        name: user.name,
        surname: user.surname,
        roleid: user.roleid,
        company_reg_num: user.company_reg_num,
        subscription_tier,
        subscription_status,
        trial_ends_at,
      },
    });
  })(req, res, next);
};

const logout = (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.clearCookie("connect.sid");
      return res.status(200).json({ message: "Logged out successfully" });
    });
  } else {
    return res.status(200).json({ message: "Already logged out" });
  }
};

const getUserInfo = (req, res) => {
  console.log("User info endpoint hit");
  console.log("Current user session:", req.session);
  console.log("Session user:", req.session.user);
  console.log("Token user:", req.user);

  const user = req.user || req.session.user;
  if (!user) {
    return res.status(401).json({ error: "Please log in first" });
  }

  res.json({
    name: user.name,
    surname: user.surname,
    roleid: user.roleid,
    email: user.email,
    userid: user.userid,
  });
};

const getUserRole = (req, res) => {
  console.log("Checking user role from token or session");
  const user = req.user || req.session.user;
  if (!user) {
    return res.status(401).json({ error: "Please log in first" });
  }
  res.json({ roleid: user.roleid });
};

const checkEmail = async (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ error: "Email parameter is required" });
  }
  try {
    const exists = await checkEmailExists(email);
    return res.json({ exists });
  } catch (error) {
    return res.status(500).json({ error: "Server error" });
  }
};

const checkCompanyReg = async (req, res) => {
  const { company_reg_num } = req.query;
  if (!company_reg_num) {
    return res.status(400).json({ error: "company_reg_num parameter is required" });
  }
  try {
    const exists = await checkCompanyRegNumExists(company_reg_num);
    return res.json({ exists });
  } catch (error) {
    return res.status(500).json({ error: "Server error" });
  }
};

// const register = async (req, res) => {
//   const {
//     name,
//     surname,
//     email,
//     password,
//     companyname,
//     company_reg_num,
//     cell_num,
//     cell_num2,
//     vat_reg_num,
//     account_num,
//     name_of_acc,
//     bank,
//     branch,
//     branch_code,
//     address,
//     suburb,
//     swift_code,
//     cluster_box,
//   } = req.body;

//   try {
//     if (await checkEmailExists(email)) {
//       return res.status(400).json({ message: "Email already registered" });
//     }

//     if (await checkCompanyRegNumExists(company_reg_num)) {
//       return res
//         .status(400)
//         .json({ message: "Company registration number already exists" });
//     }

//     const user = await registerUser({
//       name,
//       surname,
//       email,
//       password,
//       companyname,
//       company_reg_num,
//       cell_num,
//       cell_num2,
//       vat_reg_num,
//       account_num,
//       name_of_acc,
//       bank,
//       branch,
//       branch_code,
//       address,
//       suburb,
//       swift_code,
//       cluster_box,
//     });

//     return res.status(201).json({
//       message: "Registration successful! Your account is pending approval.",
//       user,
//     });
//   } catch (error) {
//     if (error.code === "23505") {
//       if (error.constraint.includes("email")) {
//         return res.status(400).json({ message: "Email already registered" });
//       } else if (error.constraint.includes("company_reg_num")) {
//         return res
//           .status(400)
//           .json({ message: "Company registration number already exists" });
//       }
//     }
//     return res
//       .status(500)
//       .json({ message: "Server error during registration" });
//   }
// };
const register = async (req, res) => {
  const {
    name,
    surname,
    email,
    password,
    companyname,
    company_reg_num,
    cellnum,
    cell_num2,
    vat_reg_num,
    account_num,
    name_of_acc,
    bank,
    branch,
    branch_code,
    address,
    suburb,
    swift_code,
    cluster_box,
    requested_plan,
    trial_requested,
  } = req.body;

  try {
    if (await checkEmailExists(email)) {
      return res.status(400).json({ message: "Email already registered" });
    }

    if (await checkCompanyRegNumExists(company_reg_num)) {
      return res
        .status(400)
        .json({ message: "Company registration number already exists" });
    }

    const user = await registerUser({
      name,
      surname,
      email,
      password,
      companyname,
      company_reg_num,
      cellnum,
      cell_num2,
      vat_reg_num,
      account_num,
      name_of_acc,
      bank,
      branch,
      branch_code,
      address,
      suburb,
      swift_code,
      cluster_box,
      requested_plan,
      trial_requested: !!trial_requested,
    });

    return res.status(201).json({
      message: "Registration successful! Your account is pending approval.",
      user,
    });
  } catch (error) {
    if (error.code === "23505") {
      if (error.constraint.includes("email")) {
        return res.status(400).json({ message: "Email already registered" });
      } else if (error.constraint.includes("company_reg_num")) {
        return res
          .status(400)
          .json({ message: "Company registration number already exists" });
      }
    }
    return res
      .status(500)
      .json({ message: "Server error during registration" });
  }
};

export { login, logout, getUserInfo, getUserRole, checkEmail, checkCompanyReg, register };
