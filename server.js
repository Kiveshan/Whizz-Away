import express from "express"
import cors from "cors"
import pg from "pg"
import bcrypt from "bcrypt"
import expressSession from "express-session"
import passport from "passport"
import LocalStrategy from "passport-local"
import crypto from "crypto"
import jwt from "jsonwebtoken"

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
      SELECT e.*, r.rolename 
      FROM m5_employee e
      JOIN roles r ON e.roleid = r.roleid
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
    const query = "SELECT * FROM m5_employee WHERE userid = $1"
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

// Create new employee
app.post("/api/employees", verifyToken, async (req, res) => {
  try {
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
    } = req.body

    // Get subei_reg_num (company_reg_num) from the logged-in user via token
    const subei_reg_num = req.user.company_reg_num

    if (!subei_reg_num) {
      return res.status(400).json({ error: "Missing company registration number from token." })
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10)

    const result = await client.query(
      `INSERT INTO m5_employee (
        name, surname, telephonenum, cellnum, employeenum, roleid, email, password, 
        base_salary, subei_reg_num, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        name,
        surname,
        telephonenum,
        cellnum,
        employeenum,
        roleid,
        email,
        hashedPassword,
        base_salary,
        subei_reg_num,
        true,
      ],
    )

    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error("Error creating employee:", err)
    res.status(500).json({ error: "Failed to create employee" })
  }
})


// Create new subcontractor employee
app.post("/api/employees", verifyToken, async (req, res) => {
  try {
    // Removed role check
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
      companyname,
      location,
      truckregnum,
      contact_person,
      subei_reg_num,
      no_of_trucks,
    } = req.body

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10)

    const result = await client.query(
      `INSERT INTO m5_employee (
        name, surname, telephonenum, cellnum, employeenum, roleid, email, password, 
        base_salary, companyname, location, truckregnum, contact_person, 
        subei_reg_num, no_of_trucks, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
      [
        name,
        surname,
        telephonenum,
        cellnum,
        employeenum,
        roleid,
        email,
        hashedPassword,
        base_salary,
        companyname,
        location,
        truckregnum,
        contact_person,
        subei_reg_num,
        no_of_trucks,
        true,
      ],
    )

    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error("Error creating employee:", err)
    res.status(500).json({ error: "Failed to create employee" })
  }
})

// Update employee
// app.put("/api/employees/:id", verifyToken, async (req, res) => {
//   try {
//     const { id } = req.params

//     // Removed role check
//     // Check if employee exists
//     const checkResult = await client.query("SELECT * FROM m5_employee WHERE userid = $1", [id])

//     if (checkResult.rows.length === 0) {
//       return res.status(404).json({ message: "Employee not found" })
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
//       "employeenum",
//       "roleid",
//       "email",
//       "base_salary",
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

//     // Add the employee ID as the last parameter
//     queryParams.push(id)

//     const updateQuery = `
//       UPDATE m5_employee 
//       SET ${updateFields.join(", ")} 
//       WHERE userid = $${paramCounter} 
//       RETURNING *
//     `

//     const result = await client.query(updateQuery, queryParams)

//     res.json(result.rows[0])
//   } catch (err) {
//     console.error(`Error updating employee ${req.params.id}:`, err)
//     res.status(500).json({ error: "Failed to update employee" })
//   }
// })
// Update employee
app.put("/api/employees/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if employee exists
    const checkResult = await client.query("SELECT * FROM m5_employee WHERE userid = $1", [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Build the update query dynamically
    const updateFields = [];
    const queryParams = [];
    let paramCounter = 1;

    const updateableFields = [
      "name",
      "surname",
      "telephonenum",
      "cellnum",
      "employeenum",
      "roleid",
      "email",
      "base_salary",
      "companyname",
      "location",
      "truckregnum",
      "contact_person",
      "no_of_trucks",
      "company_reg_num"
    ];

    // Hash password if provided
    if (req.body.password) {
      updateableFields.push("password");
      req.body.password = await bcrypt.hash(req.body.password, 10);
    }

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

    queryParams.push(id);

    const updateQuery = `
      UPDATE m5_employee 
      SET ${updateFields.join(", ")} 
      WHERE userid = $${paramCounter} 
      RETURNING *
    `;

    await client.query(updateQuery, queryParams);

    // Fetch updated employee WITH rolename
    const employeeWithRole = await client.query(
      `SELECT e.*, r.rolename 
       FROM m5_employee e 
       JOIN roles r ON e.roleid = r.roleid 
       WHERE e.userid = $1`,
      [id]
    );

    res.json(employeeWithRole.rows[0]);
  } catch (err) {
    console.error(`Error updating employee ${req.params.id}:`, err);
    res.status(500).json({ error: "Failed to update employee" });
  }
});


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

// Update client
app.put("/api/clients/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params

    // Removed role check
    // Check if client exists
    const checkResult = await client.query("SELECT * FROM m5_client WHERE m5clientkey = $1", [id])

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: "Client not found" })
    }

    // Build the update query dynamically based on provided fields
    const updateFields = []
    const queryParams = []
    let paramCounter = 1

    const updateableFields = [
      "client",
      "representative",
      "companyaddress",
      "suburb",
      "postalcode",
      "email",
      "companyregnum",
      "cellnum",
      "vatregno",
      "city",
      "streetaddress",
      "payment_type",
      "company_reg_num"
    ]

    // Build the SET clause
    for (const field of updateableFields) {
      if (req.body[field] !== undefined) {
        updateFields.push(`${field} = $${paramCounter}`)
        queryParams.push(req.body[field])
        paramCounter++
      }
    }

    // If no fields to update, return early
    if (updateFields.length === 0) {
      return res.status(400).json({ message: "No fields to update" })
    }

    // Add the client ID as the last parameter
    queryParams.push(id)

    const updateQuery = `
      UPDATE m5_client 
      SET ${updateFields.join(", ")} 
      WHERE m5clientkey = $${paramCounter} 
      RETURNING *
    `

    const result = await client.query(updateQuery, queryParams)

    res.json(result.rows[0])
  } catch (err) {
    console.error(`Error updating client ${req.params.id}:`, err)
    res.status(500).json({ error: "Failed to update client" })
  }
})

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

// Create new truck
app.post("/api/trucks", verifyToken, async (req, res) => {
  try {
    // Removed role check
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
    } = req.body

    const result = await client.query(
      `INSERT INTO m5_trucks (
        truckregnum, trailersize, truckpurchasedate, year, model,
        purchase_price, current_evaluation, vin_num, is_subcontractor
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        truckregnum,
        trailersize,
        truckpurchasedate,
        year,
        model,
        purchase_price,
        current_evaluation,
        vin_num,
        is_subcontractor
      ],
    )

    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error("Error creating truck:", err)
    res.status(500).json({ error: "Failed to create truck" })
  }
})

// Update truck
app.put("/api/trucks/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params

    // Removed role check
    // Check if truck exists
    const checkResult = await client.query("SELECT * FROM m5_trucks WHERE m5truckskey = $1", [id])

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: "Truck not found" })
    }

    // Build the update query dynamically based on provided fields
    const updateFields = []
    const queryParams = []
    let paramCounter = 1

    const updateableFields = [
      "truckregnum",
      "trailersize",
      "truckpurchasedate",
      "year",
      "model",
      "purchase_price",
      "current_evaluation",
      "vin_num",
      "is_subcontractor",
      "company_reg_num"
    ]

    // Build the SET clause
    for (const field of updateableFields) {
      if (req.body[field] !== undefined) {
        updateFields.push(`${field} = $${paramCounter}`)
        queryParams.push(req.body[field])
        paramCounter++
      }
    }

    // If no fields to update, return early
    if (updateFields.length === 0) {
      return res.status(400).json({ message: "No fields to update" })
    }

    // Add the truck ID as the last parameter
    queryParams.push(id)

    const updateQuery = `
      UPDATE m5_trucks 
      SET ${updateFields.join(", ")} 
      WHERE m5truckskey = $${paramCounter} 
      RETURNING *
    `

    const result = await client.query(updateQuery, queryParams)

    res.json(result.rows[0])
  } catch (err) {
    console.error(`Error updating truck ${req.params.id}:`, err)
    res.status(500).json({ error: "Failed to update truck" })
  }
})

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
    // Removed role check
    const { startingpoint, destination, rate } = req.body

    const result = await client.query(
      `INSERT INTO m5_driver_rate (startingpoint, destination, rate)
       VALUES ($1, $2, $3) RETURNING *`,
      [startingpoint, destination, rate],
    )

    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error("Error creating driver rate:", err)
    res.status(500).json({ error: "Failed to create driver rate" })
  }
})

// Update driver rate
app.put("/api/driver-rates/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params

    // Removed role check
    // Check if driver rate exists
    const checkResult = await client.query("SELECT * FROM m5_driver_rate WHERE m5ratekey = $1", [id])

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: "Driver rate not found" })
    }

    // Build the update query dynamically based on provided fields
    const updateFields = []
    const queryParams = []
    let paramCounter = 1

    const updateableFields = ["startingpoint", "destination", "rate", "driverid"]

    // Build the SET clause
    for (const field of updateableFields) {
      if (req.body[field] !== undefined) {
        updateFields.push(`${field} = $${paramCounter}`)
        queryParams.push(req.body[field])
        paramCounter++
      }
    }

    // If no fields to update, return early
    if (updateFields.length === 0) {
      return res.status(400).json({ message: "No fields to update" })
    }

    // Add the rate ID as the last parameter
    queryParams.push(id)

    const updateQuery = `
      UPDATE m5_driver_rate 
      SET ${updateFields.join(", ")} 
      WHERE m5ratekey = $${paramCounter} 
      RETURNING *
    `

    const result = await client.query(updateQuery, queryParams)

    res.json(result.rows[0])
  } catch (err) {
    console.error(`Error updating driver rate ${req.params.id}:`, err)
    res.status(500).json({ error: "Failed to update driver rate" })
  }
})

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
    // Removed role check
    const {
      name,
      surname,
      telephonenum,
      cellnum,
      email,
      password,
      companyname,
      location,
      truckregnum,
      contact_person,
      company_reg_num,
      no_of_trucks,
    } = req.body

    // Hash the password
    const hashedPassword = await bcrypt.hash(password || "defaultpassword", 10)

    const result = await client.query(
      `INSERT INTO m5_employee (
        name, surname, telephonenum, cellnum, email, password, 
        companyname, location, truckregnum, contact_person, 
        company_reg_num, no_of_trucks, roleid, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [
        name,
        surname,
        telephonenum,
        cellnum,
        email,
        hashedPassword,
        companyname,
        location,
        truckregnum,
        contact_person,
        company_reg_num,
        no_of_trucks,
        4,
        true, // roleid 4 for subcontractors
      ],
    )

    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error("Error creating subcontractor:", err)
    res.status(500).json({ error: "Failed to create subcontractor" })
  }
})

// Update subcontractor
app.put("/api/subcontractors/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params

    // Removed role check
    // Check if subcontractor exists
    const checkResult = await client.query("SELECT * FROM m5_employee WHERE userid = $1 AND roleid = 4", [id])

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: "Subcontractor not found" })
    }

    // Build the update query dynamically based on provided fields
    const updateFields = []
    const queryParams = []
    let paramCounter = 1

    const updateableFields = [
      "name",
      "surname",
      "telephonenum",
      "cellnum",
      "email",
      "companyname",
      "location",
      "truckregnum",
      "contact_person",
      "no_of_trucks",
      "company_reg_num"
    ]

    // Add password to updateable fields if provided
    if (req.body.password) {
      updateableFields.push("password")
      req.body.password = await bcrypt.hash(req.body.password, 10)
    }

    // Build the SET clause
    for (const field of updateableFields) {
      if (req.body[field] !== undefined) {
        updateFields.push(`${field} = $${paramCounter}`)
        queryParams.push(req.body[field])
        paramCounter++
      }
    }

    // If no fields to update, return early
    if (updateFields.length === 0) {
      return res.status(400).json({ message: "No fields to update" })
    }

    // Add the subcontractor ID as the last parameter
    queryParams.push(id)

    const updateQuery = `
      UPDATE m5_employee 
      SET ${updateFields.join(", ")} 
      WHERE userid = $${paramCounter} AND roleid = 4
      RETURNING *
    `

    const result = await client.query(updateQuery, queryParams)

    res.json(result.rows[0])
  } catch (err) {
    console.error(`Error updating subcontractor ${req.params.id}:`, err)
    res.status(500).json({ error: "Failed to update subcontractor" })
  }
})

// Toggle subcontractor status (enable/disable)
app.put("/api/subcontractors/:id/toggle-status", verifyToken, async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    // Removed role check
    // Check if subcontractor exists
    const checkResult = await client.query("SELECT * FROM m5_employee WHERE userid = $1 AND roleid = 4", [id])

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: "Subcontractor not found" })
    }

    // Update the status
    const updateResult = await client.query(
      "UPDATE m5_employee SET status = $1 WHERE userid = $2 AND roleid = 4 RETURNING *",
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

