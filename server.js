import express from "express"
import cors from "cors"
import pg from "pg"
import bcrypt from "bcrypt"
import expressSession from "express-session"
import passport from "passport"
import LocalStrategy from "passport-local"
import crypto from "crypto"
import jwt from "jsonwebtoken"
import AWS from 'aws-sdk';
import multer from 'multer';
import multerS3 from 'multer-s3';
import dotenv from "dotenv";
import { S3Client } from '@aws-sdk/client-s3'
dotenv.config();

const app = express()
const PORT = 5000

// Generate a secure, random secret key
const secretKey = crypto.randomBytes(64).toString("hex")
console.log("Generated secret key:", secretKey) // Log the secret key (for debugging)

// Middleware setup
app.use(
  cors({
    credentials: true,
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
)

app.use(express.json())

// Session middleware (kept for backward compatibility)
app.use(
  expressSession({
    secret: secretKey,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // Set to true if using HTTPS
      httpOnly: true,
      maxAge: 3600000, // Session expiration (1 hour)
    },
  }),
)

// Add session debugging middleware
app.use((req, res, next) => {
  console.log("Session Middleware Check:")
  console.log("- Session ID:", req.session.id)
  console.log("- Session Cookie:", req.headers.cookie)
  console.log("- Session User:", req.session.user)
  next()
})

app.use(passport.initialize())
app.use(passport.session())

// Database client setup (connecting only when needed)
const client = new pg.Client({
  user: process.env.RDS_USERNAME || "postgres",
  host: process.env.RDS_HOSTNAME || "localhost",
  database: process.env.RDS_DB_NAME || "9April",
  password: process.env.RDS_PASSWORD || "123456",
  port: process.env.RDS_PORT || 5433,
  ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : false,
})

// Function to connect to the database
async function connectDb() {
  try {
    await client.connect()
    console.log("✅ Database Connected Successfully")
  } catch (err) {
    console.error("Database connection error:", err)
    process.exit(1) // Terminate the process if the connection fails
  }
}

// Simple test endpoint to verify the server is running
app.get("/test-connection", (req, res) => {
  console.log("Test connection endpoint hit")
  res.json({ status: "ok", message: "Server is running" })
})

// Add test session endpoint
app.get("/test-session", (req, res) => {
  console.log("Test session endpoint hit")
  console.log("Session:", req.session)
  console.log("Session User:", req.session.user)

  if (!req.session.user) {
    return res.json({
      status: "error",
      message: "No user in session",
      sessionExists: !!req.session,
      sessionId: req.session.id,
    })
  }

  res.json({
    status: "success",
    message: "User found in session",
    user: {
      name: req.session.user.name,
      surname: req.session.user.surname,
      roleid: req.session.user.roleid,
    },
  })
})

// Add simple session test routes
app.get("/set-session-test", (req, res) => {
  // Set a simple value in the session
  req.session.testValue = "This is a test value"
  req.session.timestamp = new Date().toISOString()

  // Force save the session
  req.session.save((err) => {
    if (err) {
      console.error("Error saving session:", err)
      return res.status(500).json({ error: "Failed to save session" })
    }

    res.json({
      message: "Test value set in session",
      sessionId: req.session.id,
      testValue: req.session.testValue,
      timestamp: req.session.timestamp,
    })
  })
})

app.get("/check-session-test", (req, res) => {
  res.json({
    sessionId: req.session.id,
    testValue: req.session.testValue,
    timestamp: req.session.timestamp,
  })
})

// Passport Local Strategy for Authentication
passport.use(
  new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
    try {
      let result = await client.query("SELECT * FROM usertable WHERE email = $1", [email])

      if (result.rows.length === 0) {
        result = await client.query("SELECT * FROM m5_employee WHERE email = $1", [email])
        if (result.rows.length === 0) {
          console.log("No user found in both tables with email:", email)
          return done(null, false, { message: "Invalid email or password" })
        }
      }

      const user = result.rows[0]
      console.log("Fetched user:", user)

      const passwordMatch = await bcrypt.compare(password, user.password)
      if (!passwordMatch) {
        console.log("Password mismatch for user:", email)
        return done(null, false, { message: "Invalid email or password" })
      }

      user.table = result.fields[0].table
      return done(null, user)
    } catch (err) {
      console.error("Error during authentication:", err)
      return done(err)
    }
  }),
)

passport.serializeUser((user, done) => {
  console.log("Serializing user:", user)
  done(null, {
    userid: user.userid,
    name: user.name,
    surname: user.surname,
    table: user.table,
    roleid: user.roleid,
    email: user.email,
  })
})

passport.deserializeUser(async (sessionUser, done) => {
  try {
    console.log("Deserializing user:", sessionUser)
    const { userid, table } = sessionUser
    let result

    if (table === "usertable") {
      result = await client.query("SELECT * FROM usertable WHERE userid = $1", [userid])
    } else if (table === "m5_employee") {
      result = await client.query("SELECT * FROM m5_employee WHERE userid = $1", [userid])
    }

    if (!result || result.rows.length === 0) {
      console.log("User session not found in database")
      return done(null, false)
    }

    console.log("Session user fetched:", result.rows[0])
    done(null, result.rows[0])
  } catch (err) {
    console.error("Error deserializing user:", err)
    done(err)
  }
})

// Enhanced registration endpoint with validation
// Endpoint to check if email already exists
app.get("/check-email", async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: "Email parameter is required" });
  }

  try {
    // Check in usertable (excluding rejected users)
    let result = await client.query("SELECT email FROM usertable WHERE email = $1", [email]);

    if (result.rows.length > 0) {
      return res.json({ exists: true });
    }

    // Check in m5_employee table if it exists
    try {
      result = await client.query("SELECT email FROM m5_employee WHERE email = $1", [email]);
      if (result.rows.length > 0) {
        return res.json({ exists: true });
      }
    } catch (err) {
      // If table doesn't exist or other error, continue
      console.log("Note: m5_employee table check failed, continuing...");
    }

    // Check any other tables where emails might be stored
    // For example:
    // result = await client.query("SELECT email FROM other_table WHERE email = $1", [email]);
    // if (result.rows.length > 0) {
    //   return res.json({ exists: true });
    // }

    return res.json({ exists: false });
  } catch (error) {
    console.error("Error checking email:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

// Registration endpoint
app.post("/register", async (req, res) => {
  const {
    name,
    surname,
    email,
    password,
    companyname,
    company_reg_num,
    cell_num,
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
    // Check if email already exists in usertable (excluding rejected users)
    let result = await client.query("SELECT email FROM usertable WHERE email = $1", [email]);

    if (result.rows.length > 0) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Check if email exists in m5_employee table
    try {
      result = await client.query("SELECT email FROM m5_employee WHERE email = $1", [email]);
      if (result.rows.length > 0) {
        return res.status(400).json({ message: "Email already registered" });
      }
    } catch (err) {
      // If table doesn't exist or other error, continue
      console.log("Note: m5_employee table check failed, continuing...");
    }

    // Check if company registration number already exists (excluding rejected users)
    result = await client.query(
      "SELECT company_reg_num FROM usertable WHERE company_reg_num = $1 AND status != 'rejected'", 
      [company_reg_num]
    );

    if (result.rows.length > 0) {
      return res.status(400).json({ message: "Company registration number already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const insertResult = await client.query(
      `INSERT INTO usertable (
        name, 
        surname, 
        email, 
        password, 
        companyname, 
        company_reg_num, 
        dateofreg, 
        status, 
        cell_num, 
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
        cluster_box
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, 'pending', $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING *`,
      [
        name,
        surname,
        email,
        hashedPassword,
        companyname,
        company_reg_num,
        cell_num,
        cell_num2 || null,
        vat_reg_num || null,
        account_num,
        name_of_acc,
        bank,
        branch,
        branch_code,
        address,
        suburb,
        swift_code || null,
        cluster_box || null,
      ]
    );

    // Return success response without sensitive data
    const user = insertResult.rows[0];
    delete user.password;

    return res.status(201).json({
      message: "Registration successful! Your account is pending approval.",
      user,
    });
  } catch (error) {
    console.error("Registration error:", error);
    
    // Check for specific PostgreSQL error codes
    if (error.code === '23505') { // Unique violation
      if (error.constraint.includes('email')) {
        return res.status(400).json({ message: "Email already registered" });
      } else if (error.constraint.includes('company_reg_num')) {
        return res.status(400).json({ message: "Company registration number already exists" });
      }
    }
    
    return res.status(500).json({ message: "Server error during registration" });
  }
});
// app.post("/register", async (req, res) => {
//   const {
//     name,
//     surname,
//     email,
//     password,
//     companyname,
//     company_reg_num,
//     cluster_box,
//     street,
//     cell_num,
//     cell_num2,
//     vat_reg_num,
//     account_num,
//     name_of_acc,
//     bank,
//     branch,
//     branch_code
//   } = req.body;

//   try {
//     const hashedPassword = await bcrypt.hash(password, 10);

//     const query = `
//       INSERT INTO usertable (
//         name, surname, email, password, companyname, company_reg_num,
//         dateofreg, cluster_box, street, cell_num, cell_num2,
//         vat_reg_num, account_num, name_of_acc, bank, branch, branch_code
//       )
//       VALUES (
//         $1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9, $10,
//         $11, $12, $13, $14, $15, $16
//       )
//       RETURNING *;
//     `;

//     const values = [
//       name, surname, email, hashedPassword, companyname, company_reg_num,
//       cluster_box, street, cell_num, cell_num2,
//       vat_reg_num, account_num, name_of_acc, bank, branch, branch_code
//     ];

//     const result = await client.query(query, values);

//     res.json({ message: "User registered successfully", user: result.rows[0] });
//   } catch (err) {
//     console.error("Registration error:", err);
//     res.status(500).json({ error: err.message });
//   }
// });



// Updated login route to return a comprehensive token
// app.post("/login", async (req, res, next) => {
//   passport.authenticate("local", async (err, user, info) => {
//     if (err) {
//       console.error("Authentication error:", err);
//       return res.status(500).json({ message: "Internal server error" });
//     }
//     if (!user) {
//       return res.status(401).json({ message: info?.message || "Invalid email or password" });
//     }

//     // Check if user has a roleid
//     if (!user.roleid) {
//       return res.status(403).json({ message: "Access denied. No role assigned." });
//     }

//     // Create a comprehensive token with all necessary user data
//     const token = jwt.sign({
//       userid: user.userid,
//       name: user.name,
//       surname: user.surname,
//       email: user.email,
//       roleid: user.roleid,
//       table: user.table
//     }, secretKey, { expiresIn: '1h' });

//     // Also store in session for backward compatibility
//     req.session.user = {
//       userid: user.userid,
//       name: user.name,
//       surname: user.surname,
//       email: user.email,
//       roleid: user.roleid,
//       table: user.table
//     };

//     console.log("User authenticated:", user.name, user.surname);
//     console.log("Token generated for user");

//     const { roleid } = user;
//     let redirectUrl = "/";

//     if (roleid === 1) redirectUrl = "/Dashboard";
//     else if (roleid === 2) redirectUrl = "/ControllerDashboard";
//     else if (roleid === 3) redirectUrl = "/FDashboard";
//     else if (roleid === 4) redirectUrl = "/DirectorDashboard";
//     else if (roleid === 7) redirectUrl = "/AdminDashboard";

//     return res.json({
//       message: "Login successful",
//       redirectUrl,
//       token,
//       user: {
//         userid: user.userid,
//         name: user.name,
//         surname: user.surname,
//         roleid: user.roleid
//       }
//     });
//   })(req, res, next);
// });

// Updated login route with company status check
// Updated login route with company status check - FIXED for boolean status
// Updated login status check to handle both TEXT and BOOLEAN status types
// app.post("/login", async (req, res, next) => {
//   passport.authenticate("local", async (err, user, info) => {
//     if (err) {
//       console.error("Authentication error:", err)
//       return res.status(500).json({ message: "Internal server error" })
//     }
//     if (!user) {
//       return res.status(401).json({ message: info?.message || "Invalid email or password" })
//     }

//     // Check if user has a roleid
//     if (!user.roleid) {
//       return res.status(403).json({ message: "Access denied. No role assigned." })
//     }

//     // Skip status checks for admins (roleid 7)
//     if (user.roleid !== 7) {
//       // Check status based on which table the user is from
//       if (user.table === "usertable" && user.status !== "active") {
//         // For usertable, status is TEXT, so we check for 'active'
//         console.log(`User ${user.email} is not active (status: ${user.status})`)
//         return res.status(403).json({ message: "Your account is not active. Please contact an administrator." })
//       } else if (user.table === "m5_employee" && user.status !== true) {
//         // For m5_employee, status is BOOLEAN, so we check for true
//         console.log(`Employee ${user.email} is not active (status: ${user.status})`)
//         return res.status(403).json({ message: "Your account is not active. Please contact an administrator." })
//       }

//       // Check if user's company is deactivated
//       try {
//         // For both usertable and m5_employee, check if their company admin is active
//         if (user.company_reg_num) {
//           const companyCheck = await client.query(
//             "SELECT * FROM usertable WHERE company_reg_num = $1 AND roleid = 1 AND status = 'active'",
//             [user.company_reg_num],
//           )

//           if (companyCheck.rows.length === 0) {
//             console.log(`No active company admin found for company_reg_num: ${user.company_reg_num}`)
//             return res
//               .status(403)
//               .json({ message: "Your company account is not active. Please contact an administrator." })
//           }
//         }
//       } catch (error) {
//         console.error("Error checking company status:", error)
//         // Continue with login even if company check fails
//       }
//     }

//     // Rest of the login code remains the same...
//     const token = jwt.sign(
//       {
//         userid: user.userid,
//         name: user.name,
//         surname: user.surname,
//         email: user.email,
//         roleid: user.roleid,
//         table: user.table,
//         company_reg_num: user.company_reg_num,
//       },
//       secretKey,
//       { expiresIn: "1h" },
//     )

//     // Also store in session for backward compatibility
//     req.session.user = {
//       userid: user.userid,
//       name: user.name,
//       surname: user.surname,
//       email: user.email,
//       roleid: user.roleid,
//       table: user.table,
//       company_reg_num: user.company_reg_num,
//     }

//     console.log("User authenticated:", user.name, user.surname)
//     console.log("Token generated for user")

//     const { roleid } = user
//     let redirectUrl = "/"

//     if (roleid === 1) redirectUrl = "/Dashboard"
//     else if (roleid === 2) redirectUrl = "/ControllerDashboard"
//     else if (roleid === 3) redirectUrl = "/FDashboard"
//     else if (roleid === 4) redirectUrl = "/DirectorDashboard"
//     else if (roleid === 7) redirectUrl = "/AdminDashboard"

//     return res.json({
//       message: "Login successful",
//       redirectUrl,
//       token,
//       user: {
//         userid: user.userid,
//         name: user.name,
//         surname: user.surname,
//         roleid: user.roleid,
//         company_reg_num: user.company_reg_num,
//       },
//     })
//   })(req, res, next)
// })
app.post("/login", async (req, res, next) => {
  passport.authenticate("local", async (err, user, info) => {
    if (err) {
      console.error("Authentication error:", err)
      return res.status(500).json({ message: "Internal server error" })
    }
    if (!user) {
      return res.status(401).json({ message: info?.message || "Invalid email or password" })
    }

    // Check for rejected status first
    if (user.status === "rejected") {
      console.log(`User ${user.email} was rejected (status: ${user.status})`)
      return res.status(403).json({ message: "Your account was rejected. Please contact our admin"})
    }

    // Check for pending status
    if (user.status === "pending") {
      console.log(`User ${user.email} is pending approval (status: ${user.status})`)
      return res.status(403).json({ message: "Your account is pending approval." })
    }

    // Check if user has a roleid (for active users)
    if (!user.roleid) {
      return res.status(403).json({ message: "Access denied. Please contact an administrator." })
    }

    // Skip status checks for admins (roleid 7)
    if (user.roleid !== 7) {
      // Check status based on which table the user is from
      if (user.table === "usertable" && user.status !== "active") {
        // For other non-active statuses
        console.log(`User ${user.email} is not active (status: ${user.status})`)
        return res.status(403).json({ message: "Your account is not active. Please contact an administrator." })
      } else if (user.table === "m5_employee" && user.status !== true) {
        // For m5_employee, status is BOOLEAN, so we check for true
        console.log(`Employee ${user.email} is not active (status: ${user.status})`)
        return res.status(403).json({ message: "Your account is not active. Please contact an administrator." })
      }

      // Check if user's company is deactivated
      try {
        // For both usertable and m5_employee, check if their company admin is active
        if (user.company_reg_num) {
          const companyCheck = await client.query(
            "SELECT * FROM usertable WHERE company_reg_num = $1 AND roleid = 1 AND status = 'active'",
            [user.company_reg_num],
          )

          if (companyCheck.rows.length === 0) {
            console.log(`No active company admin found for company_reg_num: ${user.company_reg_num}`)
            return res
              .status(403)
              .json({ message: "Your company account is not active. Please contact an administrator." })
          }
        }
      } catch (error) {
        console.error("Error checking company status:", error)
        // Continue with login even if company check fails
      }
    }

    // Rest of the login code remains the same...
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
      { expiresIn: "1h" },
    )

    // Also store in session for backward compatibility
    req.session.user = {
      userid: user.userid,
      name: user.name,
      surname: user.surname,
      email: user.email,
      roleid: user.roleid,
      table: user.table,
      company_reg_num: user.company_reg_num,
    }

    console.log("User authenticated:", user.name, user.surname)
    console.log("Token generated for user")

    const { roleid } = user
    let redirectUrl = "/"

    if (roleid === 1) redirectUrl = "/Dashboard"
    else if (roleid === 2) redirectUrl = "/ControllerDashboard"
    else if (roleid === 3) redirectUrl = "/FDashboard"
    else if (roleid === 4) redirectUrl = "/DirectorDashboard"
    else if (roleid === 7) redirectUrl = "/AdminDashboard"

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
    })
  })(req, res, next)
})

// Logout endpoint
app.post("/logout", (req, res) => {
  // Clear the session
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err)
        return res.status(500).json({ message: "Failed to logout" })
      }

      // Clear the session cookie
      res.clearCookie("connect.sid")

      return res.status(200).json({ message: "Logged out successfully" })
    })
  } else {
    return res.status(200).json({ message: "Already logged out" })
  }
})



// Token verification middleware
const verifyToken = (req, res, next) => {
  // Get the token from the Authorization header
  const authHeader = req.headers.authorization

  if (!authHeader) {
    console.log("No Authorization header")
    // Try to get from query string for testing
    if (req.query.token) {
      req.headers.authorization = `Bearer ${req.query.token}`
    } else {
      return res.status(401).json({
        error: "Authentication required",
        message: "No token provided",
      })
    }
  }

  const token = req.headers.authorization.split(" ")[1] // Format: "Bearer TOKEN"

  if (!token) {
    console.log("No token provided")
    return res.status(401).json({
      error: "Authentication required",
      message: "No token provided",
    })
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, secretKey)
    console.log("Token verified:", decoded)

    // Add the user data to the request
    req.user = decoded
    next()
  } catch (err) {
    console.error("Token verification failed:", err)
    return res.status(403).json({
      error: "Invalid token",
      message: "Failed to authenticate token",
    })
  }
}

// Updated user-info endpoint to work with token-based authentication
app.get("/user-info", verifyToken, (req, res) => {
  // The user data is now available from the token verification
  const { name, surname, roleid, email, userid } = req.user

  res.json({
    name,
    surname,
    roleid,
    email,
    userid,
  })
})

// Admin verification middleware using token
const verifyAdminAccess = (req, res, next) => {
  console.log("Verifying admin access with token...")

  if (!req.user) {
    console.log("No user data in request")
    return res.status(401).json({
      error: "Authentication required",
      message: "You must be logged in to access this resource",
    })
  }

  // IMPORTANT: Using roleid 7 for admin
  const ADMIN_ROLE_ID = 7

  console.log(`User has roleid ${req.user.roleid}`)
  if (req.user.roleid !== ADMIN_ROLE_ID) {
    console.log(`User has roleid ${req.user.roleid}, which is not admin`)
    return res.status(403).json({
      error: "Unauthorized",
      message: "You do not have permission to access this resource",
    })
  }

  console.log("Admin access verified")
  next()
}

// Admin verification endpoint
app.get("/admin/verify", verifyToken, (req, res) => {
  console.log("Admin verify endpoint hit")

  // IMPORTANT: Using roleid 7 for admin
  const ADMIN_ROLE_ID = 7
  const isAdmin = req.user.roleid === ADMIN_ROLE_ID

  console.log(`User roleid: ${req.user.roleid}, isAdmin: ${isAdmin}`)
  res.json({ isAdmin })
})

// Get pending users - updated to use token verification
app.get("/admin/pending-users", verifyToken, verifyAdminAccess, async (req, res) => {
  try {
    console.log("Fetching pending users...")
    const result = await client.query(
      "SELECT userid, name, surname, email, companyname, roleid, status, dateofreg FROM usertable WHERE status = 'pending'",
    )

    console.log(`Found ${result.rows.length} pending users`)
    res.json(result.rows)
  } catch (err) {
    console.error("Error fetching pending users:", err)
    res.status(500).json({ error: "Failed to fetch pending users" })
  }
})

// Approve user - updated to use token verification
app.post("/admin/approve-user", verifyToken, verifyAdminAccess, async (req, res) => {
  try {
    const { userid, roleid } = req.body
    console.log(`Approving user ${userid} with roleid ${roleid}`)

    if (!userid || !roleid) {
      return res.status(400).json({ error: "User ID and role ID are required" })
    }

    await client.query("UPDATE usertable SET status = 'active', roleid = $1 WHERE userid = $2", [roleid, userid])

    console.log(`User ${userid} approved successfully`)
    res.json({ message: "User approved successfully" })
  } catch (err) {
    console.error("Error approving user:", err)
    res.status(500).json({ error: "Failed to approve user" })
  }
})

// Reject user - updated to use token verification
app.post("/admin/reject-user", verifyToken, verifyAdminAccess, async (req, res) => {
  try {
    const { userid } = req.body
    console.log(`Rejecting user ${userid}`)

    if (!userid) {
      return res.status(400).json({ error: "User ID is required" })
    }

    await client.query("UPDATE usertable SET status = 'rejected' WHERE userid = $1", [userid])

    console.log(`User ${userid} rejected successfully`)
    res.json({ message: "User rejected successfully" })
  } catch (err) {
    console.error("Error rejecting user:", err)
    res.status(500).json({ error: "Failed to reject user" })
  }
})

// Get companies - updated to use token verification
app.get("/admin/companies", verifyToken, verifyAdminAccess, async (req, res) => {
  try {
    console.log("Fetching companies...")
    // This query assumes you have a companies table and a way to count users per company
    const result = await client.query(`
      SELECT c.companyid, c.name, c.status, c.created_at,
      (SELECT COUNT(*) FROM usertable u WHERE u.company = c.name) as user_count
      FROM companies c
      ORDER BY c.name ASC
    `)

    console.log(`Found ${result.rows.length} companies`)
    res.json(result.rows)
  } catch (err) {
    console.error("Error fetching companies:", err)
    res.status(500).json({ error: "Failed to fetch companies" })
  }
})

// Toggle company status - updated to use token verification
app.post("/admin/toggle-company-status", verifyToken, verifyAdminAccess, async (req, res) => {
  try {
    const { companyid, status } = req.body
    console.log(`Toggling company ${companyid} status to ${status}`)

    if (!companyid || !status) {
      return res.status(400).json({ error: "Company ID and status are required" })
    }

    // Update company status
    await client.query("UPDATE companies SET status = $1 WHERE companyid = $2", [status, companyid])

    // If disabling a company, also update all users from that company
    if (status === "disabled") {
      await client.query(
        `
        UPDATE usertable 
        SET status = 'disabled' 
        WHERE company = (SELECT name FROM companies WHERE companyid = $1)
      `,
        [companyid],
      )
    }

    console.log(`Company ${companyid} ${status === "active" ? "enabled" : "disabled"} successfully`)
    res.json({ message: `Company ${status === "active" ? "enabled" : "disabled"} successfully` })
  } catch (err) {
    console.error("Error toggling company status:", err)
    res.status(500).json({ error: "Failed to toggle company status" })
  }
})

// For backward compatibility - these endpoints use the /api prefix
// Get users pending approval - updated to use token verification
app.get("/api/admin/pending-users", verifyToken, async (req, res) => {
  console.log("API endpoint for pending users hit")
  // Check if user is authenticated and is an admin
  if (req.user.roleid !== 7) {
    console.log("Access denied - user is not admin")
    return res.status(403).json({ message: "Access denied" })
  }

  try {
    // Query for users with pending status
    const result = await client.query("SELECT * FROM usertable WHERE status = 'pending' OR status IS NULL")

    console.log(`Found ${result.rows.length} pending users`)
    res.json(result.rows)
  } catch (err) {
    console.error("Error fetching pending users:", err)
    res.status(500).json({ message: "Server error" })
  }
})

// Update user status (approve/reject) - updated to use token verification
app.post("/api/admin/user-status", verifyToken, async (req, res) => {
  console.log("API endpoint for user status update hit")
  // Check if user is authenticated and is an admin
  if (req.user.roleid !== 7) {
    console.log("Access denied - user is not admin")
    return res.status(403).json({ message: "Access denied" })
  }

  const { userid, action, roleid } = req.body
  console.log(`Updating user ${userid} with action ${action}`)

  try {
    if (action === "approve") {
      // Approve user by setting roleid to 1
      await client.query("UPDATE usertable SET roleid = $1, status = 'active', approved_at = NOW() WHERE userid = $2", [
        roleid,
        userid,
      ])

      console.log(`User ${userid} approved successfully`)
      res.json({ message: "User approved successfully" })
    } else if (action === "reject") {
      // Reject user by setting a rejected flag or deleting
      await client.query("UPDATE usertable SET status = 'rejected', rejected_at = NOW() WHERE userid = $1", [userid])

      console.log(`User ${userid} rejected successfully`)
      res.json({ message: "User rejected successfully" })
    } else {
      console.log(`Invalid action: ${action}`)
      res.status(400).json({ message: "Invalid action" })
    }
  } catch (err) {
    console.error("Error updating user status:", err)
    res.status(500).json({ message: "Server error" })
  }
})

// Get all companies - updated to use token verification
app.get("/api/admin/companies", verifyToken, async (req, res) => {
  console.log("API endpoint for companies hit")
  // Check if user is authenticated and is an admin
  if (req.user.roleid !== 7) {
    console.log("Access denied - user is not admin")
    return res.status(403).json({ message: "Access denied" })
  }

  try {
    // Query for all companies
    const result = await client.query(`
      SELECT c.companyid as id, c.name, c.status, c.created_at,
      (SELECT COUNT(*) FROM usertable u WHERE u.company = c.name) as user_count
      FROM companies c
      ORDER BY c.name ASC
    `)

    console.log(`Found ${result.rows.length} companies`)
    res.json(result.rows)
  } catch (err) {
    console.error("Error fetching companies:", err)
    res.status(500).json({ message: "Server error" })
  }
})

// Update company status - updated to use token verification
app.post("/api/admin/company-status", verifyToken, async (req, res) => {
  console.log("API endpoint for company status update hit")
  // Check if user is authenticated and is an admin
  if (req.user.roleid !== 7) {
    console.log("Access denied - user is not admin")
    return res.status(403).json({ message: "Access denied" })
  }

  const { companyId, status } = req.body
  console.log(`Updating company ${companyId} status to ${status}`)

  try {
    // Update company status
    await client.query("UPDATE companies SET status = $1, updated_at = NOW() WHERE companyid = $2", [status, companyId])

    // If disabling a company, also update all users from that company
    if (status === "disabled") {
      await client.query(
        `
        UPDATE usertable 
        SET status = 'disabled' 
        WHERE company = (SELECT name FROM companies WHERE companyid = $1)
      `,
        [companyId],
      )
    }

    console.log(`Company ${companyId} ${status === "active" ? "enabled" : "disabled"} successfully`)
    res.json({ message: `Company ${status === "active" ? "enabled" : "disabled"} successfully` })
  } catch (err) {
    console.error("Error updating company status:", err)
    res.status(500).json({ message: "Server error" })
  }
})

// ---------------Company -------------------- //

// Get all companies with their status for admin
// app.get("/api/admin/company-list", verifyToken, async (req, res) => {
//   try {
//     // Only admins (roleid 7) can view all companies
//     if (req.user.roleid !== 7) {
//       return res.status(403).json({ message: "You don't have permission to view all companies" })
//     }

//     // Get all company admins (roleid 1)
//     const result = await client.query(`
//       SELECT 
//         u.userid, 
//         u.name, 
//         u.surname, 
//         u.email, 
//         u.companyname, 
//         u.company_reg_num, 
//         u.status, 
//         u.dateofreg,
//         (SELECT COUNT(*) FROM usertable WHERE company_reg_num = u.company_reg_num) as user_count,
//         (SELECT COUNT(*) FROM m5_employee WHERE company_reg_num = u.company_reg_num) as employee_count
//       FROM 
//         usertable u
//       WHERE 
//         u.roleid = 1
//       ORDER BY 
//         u.companyname ASC
//     `)

//     res.json(result.rows)
//   } catch (err) {
//     console.error("Error fetching companies:", err)
//     res.status(500).json({ error: "Failed to fetch companies" })
//   }
// })
app.get("/api/admin/company-list", verifyToken, async (req, res) => {
  try {
    // Only admins (roleid 7) can view all companies
    if (req.user.roleid !== 7) {
      return res.status(403).json({ message: "You don't have permission to view all companies" })
    }

    // Get all company admins (roleid 1)
    const result = await client.query(`
      SELECT 
        u.userid, 
        u.name, 
        u.surname, 
        u.email, 
        u.companyname, 
        u.company_reg_num, 
        u.status, 
        u.dateofreg,
        (SELECT COUNT(*) FROM usertable WHERE company_reg_num = u.company_reg_num) + 
        (SELECT COUNT(*) FROM m5_employee WHERE company_reg_num = u.company_reg_num) as total_count
      FROM 
        usertable u
      WHERE 
        u.roleid = 1
      ORDER BY 
        u.companyname ASC
    `)

    res.json(result.rows)
  } catch (err) {
    console.error("Error fetching companies:", err)
    res.status(500).json({ error: "Failed to fetch companies" })
  }
})


// Get company information for a specific company_reg_num
app.get("/api/company/:company_reg_num", verifyToken, async (req, res) => {
  try {
    const { company_reg_num } = req.params

    // Check if the requesting user has permission to view this company
    // Only admins (roleid 7) or company admins (roleid 1) of the same company can view
    if (req.user.roleid !== 7 && !(req.user.roleid === 1 && req.user.company_reg_num === company_reg_num)) {
      return res.status(403).json({ message: "You don't have permission to view this company" })
    }

    // Get company admin info
    const companyAdminResult = await client.query(
      "SELECT userid, name, surname, email, companyname, company_reg_num, status, dateofreg FROM usertable WHERE company_reg_num = $1 AND roleid = 1",
      [company_reg_num],
    )

    if (companyAdminResult.rows.length === 0) {
      return res.status(404).json({ message: "Company not found" })
    }

    const companyAdmin = companyAdminResult.rows[0]

    // Get all users from this company
    const usersResult = await client.query(
      "SELECT userid, name, surname, email, roleid, status FROM usertable WHERE company_reg_num = $1 AND roleid != 1",
      [company_reg_num],
    )

    // Get all employees from this company
    const employeesResult = await client.query(
      "SELECT userid, name, surname, email, roleid, status FROM m5_employee WHERE company_reg_num = $1",
      [company_reg_num],
    )

    res.json({
      company: {
        name: companyAdmin.companyname,
        reg_num: companyAdmin.company_reg_num,
        status: companyAdmin.status,
        registration_date: companyAdmin.dateofreg,
      },
      admin: {
        userid: companyAdmin.userid,
        name: companyAdmin.name,
        surname: companyAdmin.surname,
        email: companyAdmin.email,
      },
      users: usersResult.rows,
      employees: employeesResult.rows,
    })
  } catch (err) {
    console.error("Error fetching company information:", err)
    res.status(500).json({ error: "Failed to fetch company information" })
  }
})

// Deactivate a company and all its users
app.post("/api/company/deactivate", verifyToken, async (req, res) => {
  try {
    const { company_reg_num } = req.body

    if (!company_reg_num) {
      return res.status(400).json({ error: "Company registration number is required" })
    }

    // Only admins (roleid 7) can deactivate companies
    if (req.user.roleid !== 7) {
      return res.status(403).json({ message: "You don't have permission to deactivate companies" })
    }

    // Start a transaction
    await client.query("BEGIN")

    // Deactivate the company admin
    const companyAdminResult = await client.query(
      "UPDATE usertable SET status = 'inactive' WHERE company_reg_num = $1 AND roleid = 1 RETURNING *",
      [company_reg_num],
    )

    if (companyAdminResult.rows.length === 0) {
      await client.query("ROLLBACK")
      return res.status(404).json({ message: "Company not found" })
    }

    // Deactivate all users from this company
    await client.query("UPDATE usertable SET status = 'inactive' WHERE company_reg_num = $1", [company_reg_num])

    // Deactivate all employees from this company
    await client.query("UPDATE m5_employee SET status = FALSE WHERE company_reg_num = $1", [company_reg_num])

    // Commit the transaction
    await client.query("COMMIT")

    res.json({
      message: "Company and all associated users have been deactivated",
      company: companyAdminResult.rows[0].companyname,
    })
  } catch (err) {
    await client.query("ROLLBACK")
    console.error("Error deactivating company:", err)
    res.status(500).json({ error: "Failed to deactivate company" })
  }
})

// Reactivate a company and all its users
app.post("/api/company/reactivate", verifyToken, async (req, res) => {
  try {
    const { company_reg_num } = req.body

    if (!company_reg_num) {
      return res.status(400).json({ error: "Company registration number is required" })
    }

    // Only admins (roleid 7) can reactivate companies
    if (req.user.roleid !== 7) {
      return res.status(403).json({ message: "You don't have permission to reactivate companies" })
    }

    // Start a transaction
    await client.query("BEGIN")

    // Reactivate the company admin
    const companyAdminResult = await client.query(
      "UPDATE usertable SET status = 'active' WHERE company_reg_num = $1 AND roleid = 1 RETURNING *",
      [company_reg_num],
    )

    if (companyAdminResult.rows.length === 0) {
      await client.query("ROLLBACK")
      return res.status(404).json({ message: "Company not found" })
    }

    // Reactivate all users from this company
    await client.query("UPDATE usertable SET status = 'active' WHERE company_reg_num = $1", [company_reg_num])

    // Reactivate all employees from this company
    await client.query("UPDATE m5_employee SET status = TRUE WHERE company_reg_num = $1", [company_reg_num])

    // Commit the transaction
    await client.query("COMMIT")

    res.json({
      message: "Company and all associated users have been reactivated",
      company: companyAdminResult.rows[0].companyname,
    })
  } catch (err) {
    await client.query("ROLLBACK")
    console.error("Error reactivating company:", err)
    res.status(500).json({ error: "Failed to reactivate company" })
  }
})

// ------------------------------------------Module 0 Ends here---------------------------------- //

// ------------------------------------------Module 5 Starts here---------------------------------- //  

// ---- Employee Management Routes ---- //

// Get all employees
app.get("/api/employees", verifyToken, async (req, res) => {
  try {
    const query = `
      SELECT
        e.*,
        r.rolename,
        w.total_deductions
      FROM m5_employee e
      JOIN roles r
        ON e.roleid = r.roleid
      LEFT JOIN wages w
        ON e.userid = w.employeeid
      WHERE e.roleid != 6
      ORDER BY e.userid
    `;

    const result = await client.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching employees:", err);
    res.status(500).json({ error: "Failed to fetch employees" });
  }
});



// Get employee by ID
app.get("/api/employees/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params

    // Simplified query without role checks
    // const query = "SELECT * FROM m5_employee WHERE userid = $1"
    const query = "SELECT * FROM m5_employee WHERE userid = $1 AND roleid != 6 ";
    const result = await client.query(query, [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Employee not found" })
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error(`Error fetching employee ${req.params.id}:`, err)
    res.status(500).json({ error: "Failed to fetch employee" })
  }
})


// ----- AWS S3 and Multer-S3 Setup for Employee Uploads ----- //


// Create an S3 client using AWS SDK v3
const s3Client2 = new S3Client({
  region: process.env.AWS_REGION, 
  credentials: {
    accessKeyId: process.env.Employee_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.Employee_AWS_SECRET_ACCESS_KEY,
  },
});

// Configure multer to upload files to S3 using multer-s3-v3.
const upload = multer({
  storage: multerS3({
    s3: s3Client2, // Use the AWS SDK v3 client
    bucket: process.env.Employee_AWS_BUCKET_NAME, // e.g., 'sherwyn-whizz-away'
    // Do not include ACL if your bucket enforces no ACLs.
    key: (req, file, cb) => {
      // Extract employee number and name from the request body.
      // Ensure these fields are sent as part of your form data.
      const employeeNum = req.body.employeenum || "unknown";
      const employeeName = req.body.name || "unknown";
    
      // Optionally sanitize the employee name (remove spaces, etc.)
      const sanitizedEmployeeName = employeeName.trim().replace(/\s+/g, "_");
    
      // Create the folder name using employeenum and the sanitized name.
      const folderName = `${employeeNum}_${sanitizedEmployeeName}`;
    
      // Generate a unique file name for the uploaded file.
      const uniqueFileName = `${Date.now()}_${file.originalname}`;
    
      // Build the complete key (folder path + file name).
      const key = `Employees/${folderName}/${uniqueFileName}`;
    
      console.log("Uploading to S3 key:", key);
      cb(null, key);
    }
    
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB file size limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      return cb(null, true);
    }
    return cb(new Error("Only PDFs are allowed"), false);
  },
});

// ----- Employee Route for Creating a New Employee ----- //

// Updated with deducions in m5_employee table

//updated 02 May
app.post(
  "/api/employees",
  verifyToken,
  upload.array("documents", 3),
  async (req, res) => {
    try {
      console.log("req.files:", req.files);
      console.log("req.body:", req.body);

      const {
        name,
        surname,
        telephonenum,
        cellnum,
        employeenum,
        roleid,
        email,
        password,
        base_salary,
        deduction_income_tax,
        deduction_other_deductions,
        deduction_uif,
        deduction_bonus,
        deduction_savings,
        deduction_loan,
        deduction_damage,
        loan_amount,
      } = req.body;

      if (!password) {
        return res.status(400).json({ error: "Password is required" });
      }

      const company_reg_num = req.user.company_reg_num;
      if (!company_reg_num) {
        return res.status(400).json({ error: "Missing company registration number." });
      }

      const urls = (req.files || []).map((f) => f.location);
      while (urls.length < 3) urls.push(null);

      await client.query("BEGIN");

      const hashedPassword = await bcrypt.hash(password, 10);

      const insertEmployeeQuery = `
        INSERT INTO m5_employee (
          name, surname, telephonenum, cellnum, employeenum,
          roleid, email, password, base_salary, company_reg_num, status,
          document_url1, document_url2, document_url3,
          deduction_income_tax, deduction_other_deductions, deduction_uif,
          deduction_bonus, deduction_savings, deduction_loan, deduction_damage,
          loan_amount, income_tax_rate, deduction_date
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true,
          $11, $12, $13,
          $14, $15, $16, $17, $18, $19, $20,
          $21, 0, $22
        ) RETURNING *
      `;

      const insertValues = [
        name,
        surname,
        telephonenum,
        cellnum,
        employeenum,
        roleid,
        email,
        hashedPassword,
        base_salary,
        company_reg_num,
        urls[0],
        urls[1],
        urls[2],
        deduction_income_tax || 0,
        deduction_other_deductions || 0,
        deduction_uif || 0,
        deduction_bonus || 0,
        deduction_savings || 0,
        deduction_loan || 0,
        deduction_damage || 0,
        loan_amount || 0,
        new Date(), // 🆕 deduction_date
      ];

      const result = await client.query(insertEmployeeQuery, insertValues);

      await client.query("COMMIT");
      return res.status(201).json(result.rows[0]);
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Error in /api/employees:", err);
      return res.status(500).json({ error: "Failed to create employee" });
    }
  }
);


// Updated 2 May
app.put(
  "/api/employees/:id",
  verifyToken,
  upload.array("documents", 3),
  async (req, res) => {
    const id = req.params.id;

    const {
      name,
      surname,
      telephonenum,
      cellnum,
      employeenum,
      roleid,
      email,
      password,
      base_salary,
      deduction_income_tax,
      deduction_other_deductions,
      deduction_uif,
      deduction_bonus,
      deduction_savings,
      deduction_loan,
      deduction_damage,
      loan_amount,
    } = req.body;

    const urls = (req.files || []).map((f) => f.location);
    while (urls.length < 3) urls.push(null);

    try {
      await client.query("BEGIN");

      let hashedPassword;
      if (password) {
        hashedPassword = await bcrypt.hash(password, 10);
      } else {
        const { rows } = await client.query(
          "SELECT password FROM m5_employee WHERE userid = $1",
          [id]
        );
        if (rows.length === 0) {
          throw new Error("Employee not found");
        }
        hashedPassword = rows[0].password;
      }

      const updateEmpQuery = `
        UPDATE m5_employee SET
          name                = $1,
          surname             = $2,
          telephonenum        = $3,
          cellnum             = $4,
          employeenum         = $5,
          roleid              = $6,
          email               = $7,
          password            = $8,
          base_salary         = $9,
          document_url1       = $10,
          document_url2       = $11,
          document_url3       = $12,
          deduction_income_tax        = $13,
          deduction_other_deductions  = $14,
          deduction_uif               = $15,
          deduction_bonus             = $16,
          deduction_savings           = $17,
          deduction_loan              = $18,
          deduction_damage            = $19,
          loan_amount                 = $20,
          deduction_date              = $21
        WHERE userid = $22
        RETURNING *
      `;

      const updateEmpValues = [
        name,
        surname,
        telephonenum,
        cellnum,
        employeenum,
        roleid,
        email,
        hashedPassword,
        base_salary,
        urls[0],
        urls[1],
        urls[2],
        parseFloat(deduction_income_tax || 0),
        parseFloat(deduction_other_deductions || 0),
        parseFloat(deduction_uif || 0),
        parseFloat(deduction_bonus || 0),
        parseFloat(deduction_savings || 0),
        parseFloat(deduction_loan || 0),
        parseFloat(deduction_damage || 0),
        parseFloat(loan_amount || 0),
        new Date(), // 🆕 update deduction_date
        id,
      ];

      const result = await client.query(updateEmpQuery, updateEmpValues);

      await client.query("COMMIT");
      res.json(result.rows[0]);
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Error updating employee:", err);
      res.status(500).json({ error: err.message || "Failed to update employee" });
    }
  }
);



// Toggle employee status (enable/disable)
app.put("/api/employees/:id/toggle-status", verifyToken, async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    // Removed role check
    // Check if employee exists
    const checkResult = await client.query("SELECT * FROM m5_employee WHERE userid = $1", [id])

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: "Employee not found" })
    }

    // Update the status
    const updateResult = await client.query("UPDATE m5_employee SET status = $1 WHERE userid = $2 RETURNING *", [
      status,
      id,
    ])

    res.json(updateResult.rows[0])
  } catch (err) {
    console.error(`Error toggling employee ${req.params.id} status:`, err)
    res.status(500).json({ error: "Failed to toggle employee status" })
  }
})

// ---- Client Management Routes ---- //

// Get all clients
app.get("/api/clients", verifyToken, async (req, res) => {
  try {
    // Simplified query without role checks
    const query = "SELECT * FROM m5_client ORDER BY m5clientkey"
    
    const result = await client.query(query)
    res.json(result.rows)
  } catch (err) {
    console.error("Error fetching clients:", err)
    res.status(500).json({ error: "Failed to fetch clients" })
  }
})

// Get client by ID
app.get("/api/clients/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params

    // Simplified query without role checks
    const query = "SELECT * FROM m5_client WHERE m5clientkey = $1"
    const result = await client.query(query, [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Client not found" })
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error(`Error fetching client ${req.params.id}:`, err)
    res.status(500).json({ error: "Failed to fetch client" })
  }
})

// Create new client
app.post("/api/clients", verifyToken, async (req, res) => {
  try {
    // Renamed the variable to avoid conflict with the database client
    const {
      client: clientName,  // Renamed to clientName
      representative,
      companyaddress,
      suburb,
      postalcode,
      email,
      client_reg_num,
      cellnum,
      vatregno,
      city,
      streetaddress,
    } = req.body
    
    const result = await client.query(
      `INSERT INTO m5_client (
        client, representative, companyaddress, suburb, postalcode, 
        email, client_reg_num, cellnum, vatregno, city, streetaddress
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        clientName,  // Use the renamed variable
        representative,
        companyaddress,
        suburb,
        postalcode,
        email,
        client_reg_num,
        cellnum,
        vatregno,
        city,
        streetaddress,
      ]
    )

    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error("Error creating client:", err)
    res.status(500).json({ error: "Failed to create client" })
  }
})

app.put("/api/clients/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params
    const {
      client: clientName,
      representative,
      companyaddress,
      suburb,
      postalcode,
      email,
      client_reg_num,
      cellnum,
      vatregno,
      city,
      streetaddress,
    } = req.body

    const query = `
      UPDATE m5_client
      SET client = $1, representative = $2, companyaddress = $3, suburb = $4,
          postalcode = $5, email = $6, client_reg_num = $7, cellnum = $8,
          vatregno = $9, city = $10, streetaddress = $11
      WHERE m5clientkey = $12
      RETURNING *`
      
    const values = [
      clientName, representative, companyaddress, suburb, postalcode, email,
      client_reg_num, cellnum, vatregno, city, streetaddress, id,
    ]

    const result = await client.query(query, values)

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Client not found" })
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error(`Error updating client ${req.params.id}:`, err)
    res.status(500).json({ error: "Failed to update client" })
  }
})


// Update client
// app.put("/api/clients/:id", verifyToken, async (req, res) => {
//   try {
//     const { id } = req.params

//     // Removed role check
//     // Check if client exists
//     const checkResult = await client.query("SELECT * FROM m5_client WHERE m5clientkey = $1", [id])

//     if (checkResult.rows.length === 0) {
//       return res.status(404).json({ message: "Client not found" })
//     }

//     // Build the update query dynamically based on provided fields
//     const updateFields = []
//     const queryParams = []
//     let paramCounter = 1

//     const updateableFields = [
//       "client",
//       "representative",
//       "companyaddress",
//       "suburb",
//       "postalcode",
//       "email",
//       "companyregnum",
//       "cellnum",
//       "vatregno",
//       "city",
//       "streetaddress",
//       "payment_type",
//       "company_reg_num"
//     ]

//     // Build the SET clause
//     for (const field of updateableFields) {
//       if (req.body[field] !== undefined) {
//         updateFields.push(`${field} = $${paramCounter}`)
//         queryParams.push(req.body[field])
//         paramCounter++
//       }
//     }

//     // If no fields to update, return early
//     if (updateFields.length === 0) {
//       return res.status(400).json({ message: "No fields to update" })
//     }

//     // Add the client ID as the last parameter
//     queryParams.push(id)

//     const updateQuery = `
//       UPDATE m5_client 
//       SET ${updateFields.join(", ")} 
//       WHERE m5clientkey = $${paramCounter} 
//       RETURNING *
//     `

//     const result = await client.query(updateQuery, queryParams)

//     res.json(result.rows[0])
//   } catch (err) {
//     console.error(`Error updating client ${req.params.id}:`, err)
//     res.status(500).json({ error: "Failed to update client" })
//   }
// })

// Delete client
app.delete("/api/clients/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params

    // Removed role check
    // Check if client exists
    const checkResult = await client.query("SELECT * FROM m5_client WHERE m5clientkey = $1", [id])

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: "Client not found" })
    }

    // Delete the client
    await client.query("DELETE FROM m5_client WHERE m5clientkey = $1", [id])

    res.json({ message: "Client deleted successfully" })
  } catch (err) {
    console.error(`Error deleting client ${req.params.id}:`, err)
    res.status(500).json({ error: "Failed to delete client" })
  }
})

// ---- Truck Management Routes ---- //

// Get all trucks
app.get("/api/trucks", verifyToken, async (req, res) => {
  try {
    // Simplified query without role checks
    const query = "SELECT * FROM m5_trucks ORDER BY m5truckskey"
    
    const result = await client.query(query)
    res.json(result.rows)
  } catch (err) {
    console.error("Error fetching trucks:", err)
    res.status(500).json({ error: "Failed to fetch trucks" })
  }
})

// Get truck by ID
app.get("/api/trucks/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params

    // Simplified query without role checks
    const query = "SELECT * FROM m5_trucks WHERE m5truckskey = $1"
    const result = await client.query(query, [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Truck not found" })
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error(`Error fetching truck ${req.params.id}:`, err)
    res.status(500).json({ error: "Failed to fetch truck" })
  }
})
// Create the v3 S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION, // e.g., 'us-east-1' or 'af-south-1'
  credentials: {
    accessKeyId: process.env.Trucks_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.Trucks_AWS_SECRET_ACCESS_KEY,
  },
});

// Configure multer to use multer-s3-v3 with the v3 S3 client
const upload2 = multer({
  storage: multerS3({
    s3: s3Client, // using the v3 client from @aws-sdk/client-s3
    bucket: process.env.Trucks_AWS_BUCKET_NAME, // your bucket name
    key: (req, file, cb) => {
      // In the form data, ensure 'truckregnum' is provided.
      const truckregnum = req.body.truckregnum || 'default';
      const uniqueName = `${Date.now()}_${file.originalname}`;
      // Files are stored under a folder named after truckregnum.
      cb(null, `Trucks/${truckregnum}/${uniqueName}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // e.g., 10 MB limit
  fileFilter: (req, file, cb) => {
    // Allow only PDF files.
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type, only PDF documents are allowed!'), false);
    }
  },
});

// Use the correct upload instance (upload2) in your route:
app.post('/api/trucks', verifyToken, upload2.array('documents', 3), async (req, res) => {
  try {
    // Destructure truck details from the request body.
    const {
      truckregnum,
      trailersize,
      truckpurchasedate,
      year,
      model,
      purchase_price,
      current_evaluation,
      vin_num,
      is_subcontractor,
    } = req.body;

    // Map the uploaded files to their S3 URLs.
    const fileUrls = req.files && req.files.length
      ? req.files.map(file => file.location)
      : [];

    // Map URLs to their corresponding database columns.
    const document_url1 = fileUrls[0] || null;
    const document_url2 = fileUrls[1] || null;
    const document_url3 = fileUrls[2] || null;

    // Insert truck and document details in the database.
    const result = await client.query(
      `INSERT INTO m5_trucks (
         truckregnum,
         trailersize,
         truckpurchasedate,
         year,
         model,
         purchase_price,
         current_evaluation,
         vin_num,
         is_subcontractor,
         document_url1,
         document_url2,
         document_url3
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        truckregnum,
        trailersize,
        truckpurchasedate,
        year,
        model,
        purchase_price,
        current_evaluation,
        vin_num,
        is_subcontractor,
        document_url1,
        document_url2,
        document_url3,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating truck:", err);
    res.status(500).json({ error: "Failed to create truck" });
  }
});


// Update existing truck
app.put("/api/trucks/:id", verifyToken, upload2.array('documents', 3), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      truckregnum,
      trailersize,
      truckpurchasedate,
      year,
      model,
      purchase_price,
      current_evaluation,
      vin_num,
      is_subcontractor
    } = req.body;

    // If new documents are provided, process them.
    let fileUrls = [];
    if (req.files && req.files.length) {
      fileUrls = req.files.map(file => file.location);
      // Optionally merge these newly uploaded file URLs with any already stored.
    }

    const query = `
      UPDATE m5_trucks SET
        truckregnum = $1,
        trailersize = $2,
        truckpurchasedate = $3,
        year = $4,
        model = $5,
        purchase_price = $6,
        current_evaluation = $7,
        vin_num = $8,
        is_subcontractor = $9
      WHERE m5truckskey = $10
      RETURNING *`;

    const values = [
      truckregnum,
      trailersize,
      truckpurchasedate,
      year,
      model,
      purchase_price,
      current_evaluation,
      vin_num,
      is_subcontractor,
      id
    ];

    const result = await client.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Truck not found" });
    }

    let truck = result.rows[0];
    truck.documents = fileUrls; // update as needed – you may want to merge with previous docs.

    res.json(truck);
  } catch (err) {
    console.error("Error updating truck:", err);
    res.status(500).json({ error: "Failed to update truck" });
  }
});


// Delete truck
app.delete("/api/trucks/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params

    // Removed role check
    // Check if truck exists
    const checkResult = await client.query("SELECT * FROM m5_trucks WHERE m5truckskey = $1", [id])

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: "Truck not found" })
    }

    // Delete the truck
    await client.query("DELETE FROM m5_trucks WHERE m5truckskey = $1", [id])

    res.json({ message: "Truck deleted successfully" })
  } catch (err) {
    console.error(`Error deleting truck ${req.params.id}:`, err)
    res.status(500).json({ error: "Failed to delete truck" })
  }
})

// ---- Driver Rate Management Routes ---- //

// Get all driver rates
app.get("/api/driver-rates", verifyToken, async (req, res) => {
  try {
    // Simplified query without role checks
    const query = `
      SELECT dr.*, e.name, e.surname 
      FROM m5_driver_rate dr
      LEFT JOIN m5_employee e ON dr.driverid = e.userid
      ORDER BY dr.m5ratekey
    `
    
    const result = await client.query(query)
    res.json(result.rows)
  } catch (err) {
    console.error("Error fetching driver rates:", err)
    res.status(500).json({ error: "Failed to fetch driver rates" })
  }
})

// app.put("/api/driver-rates/:id", verifyToken, async (req, res) => {
//   try {
//     const { id } = req.params
//     const { startingpoint, destination, driver_rate, subie_rate } = req.body

//     const query = `
//       UPDATE m5_driver_rate
//       SET startingpoint = $1,
//           destination = $2,
//           driver_rate = $3,
//           subie_rate = $4
//       WHERE m5ratekey = $5
//       RETURNING *`
      
//     const values = [startingpoint, destination, driver_rate, subie_rate, id]

//     const result = await client.query(query, values)

//     if (result.rowCount === 0) {
//       return res.status(404).json({ error: "Driver rate not found" })
//     }

//     res.json(result.rows[0])
//   } catch (err) {
//     console.error(`Error updating driver rate ${req.params.id}:`, err)
//     res.status(500).json({ error: "Failed to update driver rate" })
//   }
// })


// Get driver rate by ID
app.get("/api/driver-rates/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params

    // Simplified query without role checks
    const query = `
      SELECT dr.*, e.name, e.surname 
      FROM m5_driver_rate dr
      LEFT JOIN m5_employee e ON dr.driverid = e.userid
      WHERE dr.m5ratekey = $1
    `
    const result = await client.query(query, [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Driver rate not found" })
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error(`Error fetching driver rate ${req.params.id}:`, err)
    res.status(500).json({ error: "Failed to fetch driver rate" })
  }
})

// Add new driver rate
app.post("/api/driver-rates", verifyToken, async (req, res) => {
  try {
    const {
      startingpoint,
      destination,
      driver_six_meter_rate,
      driver_twelve_meter_rate,
      subie_six_meter_rate,
      subie_twelve_meter_rate
    } = req.body;

    const result = await client.query(
      `INSERT INTO m5_driver_rate (
        startingpoint, destination,
        driver_six_meter_rate, driver_twelve_meter_rate,
        subie_six_meter_rate, subie_twelve_meter_rate
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [startingpoint, destination, driver_six_meter_rate, driver_twelve_meter_rate, subie_six_meter_rate, subie_twelve_meter_rate]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating driver rate:", err);
    res.status(500).json({ error: "Failed to create driver rate" });
  }
});


// Update driver rate
app.put("/api/driver-rates/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if driver rate exists
    const checkResult = await client.query("SELECT * FROM m5_driver_rate WHERE m5ratekey = $1", [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: "Driver rate not found" });
    }

    // Fields that can be updated
    const updateableFields = [
      "startingpoint",
      "destination",
      "driver_six_meter_rate",
      "driver_twelve_meter_rate",
      "subie_six_meter_rate",
      "subie_twelve_meter_rate"
    ];

    const updateFields = [];
    const queryParams = [];
    let paramCounter = 1;

    for (const field of updateableFields) {
      if (req.body[field] !== undefined) {
        updateFields.push(`${field} = $${paramCounter}`);
        queryParams.push(req.body[field]);
        paramCounter++;
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    // Add updated_at timestamp
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    // Add id for WHERE clause
    queryParams.push(id);

    const updateQuery = `
      UPDATE m5_driver_rate 
      SET ${updateFields.join(", ")} 
      WHERE m5ratekey = $${paramCounter} 
      RETURNING *
    `;

    const result = await client.query(updateQuery, queryParams);

    res.json(result.rows[0]);
  } catch (err) {
    console.error(`Error updating driver rate ${req.params.id}:`, err);
    res.status(500).json({ error: "Failed to update driver rate" });
  }
});

// Delete driver rate
app.delete("/api/driver-rates/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params

    // Removed role check
    // Check if driver rate exists
    const checkResult = await client.query("SELECT * FROM m5_driver_rate WHERE m5ratekey = $1", [id])

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: "Driver rate not found" })
    }

    // Delete the driver rate
    await client.query("DELETE FROM m5_driver_rate WHERE m5ratekey = $1", [id])

    res.json({ message: "Driver rate deleted successfully" })
  } catch (err) {
    console.error(`Error deleting driver rate ${req.params.id}:`, err)
    res.status(500).json({ error: "Failed to delete driver rate" })
  }
})

// ---- Subcontractor Management Routes ---- //

// Get all subcontractors
app.get("/api/subcontractors", verifyToken, async (req, res) => {
  try {
    // Simplified query without role checks
    const query = "SELECT * FROM m5_employee WHERE roleid = 6 ORDER BY userid" // Assuming roleid 4 is for subcontractors
    
    const result = await client.query(query)
    res.json(result.rows)
  } catch (err) {
    console.error("Error fetching subcontractors:", err)
    res.status(500).json({ error: "Failed to fetch subcontractors" })
  }
})

// Get subcontractor by ID
app.get("/api/subcontractors/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params

    // Simplified query without role checks
    const query = "SELECT * FROM m5_employee WHERE userid = $1 AND roleid = 6"
    const result = await client.query(query, [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Subcontractor not found" })
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error(`Error fetching subcontractor ${req.params.id}:`, err)
    res.status(500).json({ error: "Failed to fetch subcontractor" })
  }
})

// Create new subcontractor
app.post("/api/subcontractors", verifyToken, async (req, res) => {
  try {
    console.log("➡️ Incoming request body:", req.body);

    const {
      cellnum,
      email,
      companyname,
      location,
      truckregnum,
      contact_person,
      subei_reg_num,
      no_of_trucks,
      subdrivername
    } = req.body;

    // Server-side validation
    if (!companyname || !location || !contact_person || !cellnum || !email) {
      return res.status(400).json({ error: 'Please fill in all the required fields.' });
    }

    console.log("🔍 Raw subdrivername value:", subdrivername);

    // Convert to array if necessary
    const subdriverArray = Array.isArray(subdrivername)
      ? subdrivername
      : typeof subdrivername === "string"
      ? subdrivername.split(",").map(name => name.trim()).filter(Boolean) // Filter out empty values
      : [];

    if (subdriverArray.length === 0) {
      return res.status(400).json({ error: 'At least one driver name is required.' });
    }

    console.log("✅ Final subdriverArray for insertion:", subdriverArray);

    const insertQuery = `
      INSERT INTO m5_employee (
        cellnum, email, companyname, location, truckregnum,
        contact_person, subei_reg_num, no_of_trucks, 
        roleid, status, subdrivername
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;

    const values = [
      cellnum,
      email,
      companyname,
      location,
      truckregnum,
      contact_person,
      subei_reg_num,
      no_of_trucks,
      6,            // roleid for subcontractor
      true,         // status
      subdriverArray
    ];

    console.log("📦 Insert values:", values);

    const result = await client.query(insertQuery, values);

    console.log("✅ Insert result:", result.rows[0]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("❌ Insert error:", error.message);
    res.status(500).json({ error: "Failed to insert subcontractor" });
  }
});

// Update subcontractor

app.put("/api/subcontractors/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const {
    cellnum, email, companyname, location, truckregnum,
    contact_person, subei_reg_num, no_of_trucks, subdrivername
  } = req.body;

  try {
    console.log("🔍 Raw subdrivername value in PUT:", subdrivername);

    // Convert subdrivername to array format - same as in POST endpoint
    const subdriverArray = Array.isArray(subdrivername)
      ? subdrivername
      : typeof subdrivername === "string"
      ? subdrivername.split(",").map(name => name.trim()).filter(Boolean)
      : [];

    console.log("✅ Final subdriverArray for update:", subdriverArray);

    const updateQuery = `
      UPDATE m5_employee SET
        cellnum = $1,
        email = $2,
        companyname = $3,
        location = $4,
        truckregnum = $5,
        contact_person = $6,
        subei_reg_num = $7,
        no_of_trucks = $8,
        subdrivername = $9
      WHERE userid = $10
      RETURNING *;
    `;
    const values = [
      cellnum, email, companyname, location, truckregnum,
      contact_person, subei_reg_num, no_of_trucks, subdriverArray, id
    ];

    console.log("📦 Update values:", values);

    const result = await client.query(updateQuery, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Subcontractor not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Update error:", error.message);
    res.status(500).json({ error: "Failed to update subcontractor: " + error.message });
  }
});



// app.put("/api/subcontractors/:id", verifyToken, async (req, res) => {
//   try {
//     const { id } = req.params

//     // Removed role check
//     // Check if subcontractor exists
//     const checkResult = await client.query("SELECT * FROM m5_employee WHERE userid = $1 AND roleid = 6", [id])

//     if (checkResult.rows.length === 0) {
//       return res.status(404).json({ message: "Subcontractor not found" })
//     }

//     // Build the update query dynamically based on provided fields
//     const updateFields = []
//     const queryParams = []
//     let paramCounter = 1

//     const updateableFields = [
//       "name",
//       "surname",
//       "telephonenum",
//       "cellnum",
//       "email",
//       "companyname",
//       "location",
//       "truckregnum",
//       "contact_person",
//       "no_of_trucks",
//       "company_reg_num"
//     ]

//     // Add password to updateable fields if provided
//     if (req.body.password) {
//       updateableFields.push("password")
//       req.body.password = await bcrypt.hash(req.body.password, 10)
//     }

//     // Build the SET clause
//     for (const field of updateableFields) {
//       if (req.body[field] !== undefined) {
//         updateFields.push(`${field} = $${paramCounter}`)
//         queryParams.push(req.body[field])
//         paramCounter++
//       }
//     }

//     // If no fields to update, return early
//     if (updateFields.length === 0) {
//       return res.status(400).json({ message: "No fields to update" })
//     }

//     // Add the subcontractor ID as the last parameter
//     queryParams.push(id)

//     const updateQuery = `
//       UPDATE m5_employee 
//       SET ${updateFields.join(", ")} 
//       WHERE userid = $${paramCounter} AND roleid = 6
//       RETURNING *
//     `

//     const result = await client.query(updateQuery, queryParams)

//     res.json(result.rows[0])
//   } catch (err) {
//     console.error(`Error updating subcontractor ${req.params.id}:`, err)
//     res.status(500).json({ error: "Failed to update subcontractor" })
//   }
// })

// Toggle subcontractor status (enable/disable)
app.put("/api/subcontractors/:id/toggle-status", verifyToken, async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    // Removed role check
    // Check if subcontractor exists
    const checkResult = await client.query("SELECT * FROM m5_employee WHERE userid = $1 AND roleid = 6", [id])

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: "Subcontractor not found" })
    }

    // Update the status
    const updateResult = await client.query(
      "UPDATE m5_employee SET status = $1 WHERE userid = $2 AND roleid =6  RETURNING *",
      [status, id],
    )

    res.json(updateResult.rows[0])
  } catch (err) {
    console.error(`Error toggling subcontractor ${req.params.id} status:`, err)
    res.status(500).json({ error: "Failed to toggle subcontractor status" })
  }
})

// ------------------------------------------Module 5 Ends here---------------------------------- //


// Start the server
app.listen(PORT, async () => {
  await connectDb()
  console.log(`🚀 Server running on port ${PORT}`)
})

