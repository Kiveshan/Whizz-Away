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

    if (user.roleid === 5 || user.roleid === 6) {
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

    const token = jwt.sign(
      {
        userid: user.userid,
        name: user.name,
        surname: user.surname,
        email: user.email,
        roleid: user.roleid,
        table: user.table,
        company_reg_num: user.company_reg_num,
      },
      secretKey,
      { expiresIn: "12h" }
    );

    req.session.user = {
      userid: user.userid,
      name: user.name,
      surname: user.surname,
      email: user.email,
      roleid: user.roleid,
      table: user.table,
      company_reg_num: user.company_reg_num,
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

export { login, logout, getUserInfo, getUserRole, checkEmail, register };
