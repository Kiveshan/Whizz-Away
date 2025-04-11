// import express from "express"
// import cors from "cors"
// import pg from "pg"
// import bcrypt from "bcrypt"
// import expressSession from "express-session"
// import passport from "passport"
// import LocalStrategy from "passport-local"
// import crypto from "crypto"
// import jwt from "jsonwebtoken"

// const app = express()
// const PORT = 5000

// // Generate a secure, random secret key
// const secretKey = crypto.randomBytes(64).toString("hex")
// console.log("Generated secret key:", secretKey) // Log the secret key (for debugging)

// // Middleware setup
// app.use(
//   cors({
//     credentials: true,
//     origin: "http://localhost:3000",
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//   }),
// )

// app.use(express.json())

// // Session middleware (kept for backward compatibility)
// app.use(
//   expressSession({
//     secret: secretKey,
//     resave: false,
//     saveUninitialized: false,
//     cookie: {
//       secure: process.env.NODE_ENV === "production", // Set to true if using HTTPS
//       httpOnly: true,
//       maxAge: 3600000, // Session expiration (1 hour)
//     },
//   }),
// )

// // Add session debugging middleware
// app.use((req, res, next) => {
//   console.log("Session Middleware Check:")
//   console.log("- Session ID:", req.session.id)
//   console.log("- Session Cookie:", req.headers.cookie)
//   console.log("- Session User:", req.session.user)
//   next()
// })

// app.use(passport.initialize())
// app.use(passport.session())

// // Database client setup (connecting only when needed)
// const client = new pg.Client({
//   user: process.env.RDS_USERNAME || "postgres",
//   host: process.env.RDS_HOSTNAME || "localhost",
//   database: process.env.RDS_DB_NAME || "whizz-away",
//   password: process.env.RDS_PASSWORD || "123456",
//   port: process.env.RDS_PORT || 5434,
//   ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : false,
// })

// // Function to connect to the database
// async function connectDb() {
//   try {
//     await client.connect()
//     console.log("✅ Database Connected Successfully")
//   } catch (err) {
//     console.error("Database connection error:", err)
//     process.exit(1) // Terminate the process if the connection fails
//   }
// }

// // Simple test endpoint to verify the server is running
// app.get("/test-connection", (req, res) => {
//   console.log("Test connection endpoint hit")
//   res.json({ status: "ok", message: "Server is running" })
// })

// // Add test session endpoint
// app.get("/test-session", (req, res) => {
//   console.log("Test session endpoint hit")
//   console.log("Session:", req.session)
//   console.log("Session User:", req.session.user)

//   if (!req.session.user) {
//     return res.json({
//       status: "error",
//       message: "No user in session",
//       sessionExists: !!req.session,
//       sessionId: req.session.id,
//     })
//   }

//   res.json({
//     status: "success",
//     message: "User found in session",
//     user: {
//       name: req.session.user.name,
//       surname: req.session.user.surname,
//       roleid: req.session.user.roleid,
//     },
//   })
// })

// // Add simple session test routes
// app.get("/set-session-test", (req, res) => {
//   // Set a simple value in the session
//   req.session.testValue = "This is a test value"
//   req.session.timestamp = new Date().toISOString()

//   // Force save the session
//   req.session.save((err) => {
//     if (err) {
//       console.error("Error saving session:", err)
//       return res.status(500).json({ error: "Failed to save session" })
//     }

//     res.json({
//       message: "Test value set in session",
//       sessionId: req.session.id,
//       testValue: req.session.testValue,
//       timestamp: req.session.timestamp,
//     })
//   })
// })

// app.get("/check-session-test", (req, res) => {
//   res.json({
//     sessionId: req.session.id,
//     testValue: req.session.testValue,
//     timestamp: req.session.timestamp,
//   })
// })

// // Passport Local Strategy for Authentication
// passport.use(
//   new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
//     try {
//       let result = await client.query("SELECT * FROM usertable WHERE email = $1", [email])

//       if (result.rows.length === 0) {
//         result = await client.query("SELECT * FROM m5_employee WHERE email = $1", [email])
//         if (result.rows.length === 0) {
//           console.log("No user found in both tables with email:", email)
//           return done(null, false, { message: "Invalid email or password" })
//         }
//       }

//       const user = result.rows[0]
//       console.log("Fetched user:", user)

//       const passwordMatch = await bcrypt.compare(password, user.password)
//       if (!passwordMatch) {
//         console.log("Password mismatch for user:", email)
//         return done(null, false, { message: "Invalid email or password" })
//       }

//       user.table = result.fields[0].table
//       return done(null, user)
//     } catch (err) {
//       console.error("Error during authentication:", err)
//       return done(err)
//     }
//   }),
// )

// passport.serializeUser((user, done) => {
//   console.log("Serializing user:", user)
//   done(null, {
//     userid: user.userid,
//     name: user.name,
//     surname: user.surname,
//     table: user.table,
//     roleid: user.roleid,
//     email: user.email,
//   })
// })

// passport.deserializeUser(async (sessionUser, done) => {
//   try {
//     console.log("Deserializing user:", sessionUser)
//     const { userid, table } = sessionUser
//     let result

//     if (table === "usertable") {
//       result = await client.query("SELECT * FROM usertable WHERE userid = $1", [userid])
//     } else if (table === "m5_employee") {
//       result = await client.query("SELECT * FROM m5_employee WHERE userid = $1", [userid])
//     }

//     if (!result || result.rows.length === 0) {
//       console.log("User session not found in database")
//       return done(null, false)
//     }

//     console.log("Session user fetched:", result.rows[0])
//     done(null, result.rows[0])
//   } catch (err) {
//     console.error("Error deserializing user:", err)
//     done(err)
//   }
// })

// // Enhanced registration endpoint with validation
// // Endpoint to check if email already exists
// app.get("/check-email", async (req, res) => {
//   const { email } = req.query;

//   if (!email) {
//     return res.status(400).json({ error: "Email parameter is required" });
//   }

//   try {
//     // Check in usertable (excluding rejected users)
//     let result = await client.query("SELECT email FROM usertable WHERE email = $1", [email]);

//     if (result.rows.length > 0) {
//       return res.json({ exists: true });
//     }

//     // Check in m5_employee table if it exists
//     try {
//       result = await client.query("SELECT email FROM m5_employee WHERE email = $1", [email]);
//       if (result.rows.length > 0) {
//         return res.json({ exists: true });
//       }
//     } catch (err) {
//       // If table doesn't exist or other error, continue
//       console.log("Note: m5_employee table check failed, continuing...");
//     }


//     return res.json({ exists: false });
//   } catch (error) {
//     console.error("Error checking email:", error);
//     return res.status(500).json({ error: "Server error" });
//   }
// });

// // Registration endpoint
// app.post("/register", async (req, res) => {
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
//     // Check if email already exists in usertable (excluding rejected users)
//     let result = await client.query("SELECT email FROM usertable WHERE email = $1", [email]);

//     if (result.rows.length > 0) {
//       return res.status(400).json({ message: "Email already registered" });
//     }

//     // Check if email exists in m5_employee table
//     try {
//       result = await client.query("SELECT email FROM m5_employee WHERE email = $1", [email]);
//       if (result.rows.length > 0) {
//         return res.status(400).json({ message: "Email already registered" });
//       }
//     } catch (err) {
//       // If table doesn't exist or other error, continue
//       console.log("Note: m5_employee table check failed, continuing...");
//     }

//     // Check if company registration number already exists (excluding rejected users)
//     result = await client.query(
//       "SELECT company_reg_num FROM usertable WHERE company_reg_num = $1 AND status != 'rejected'", 
//       [company_reg_num]
//     );

//     if (result.rows.length > 0) {
//       return res.status(400).json({ message: "Company registration number already exists" });
//     }

//     // Hash password
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // Insert new user
//     const insertResult = await client.query(
//       `INSERT INTO usertable (
//         name, 
//         surname, 
//         email, 
//         password, 
//         companyname, 
//         company_reg_num, 
//         dateofreg, 
//         status, 
//         cell_num, 
//         cell_num2, 
//         vat_reg_num, 
//         account_num, 
//         name_of_acc, 
//         bank, 
//         branch, 
//         branch_code, 
//         address, 
//         suburb, 
//         swift_code,
//         cluster_box
//       ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, 'pending', $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING *`,
//       [
//         name,
//         surname,
//         email,
//         hashedPassword,
//         companyname,
//         company_reg_num,
//         cell_num,
//         cell_num2 || null,
//         vat_reg_num || null,
//         account_num,
//         name_of_acc,
//         bank,
//         branch,
//         branch_code,
//         address,
//         suburb,
//         swift_code || null,
//         cluster_box || null,
//       ]
//     );

//     // Return success response without sensitive data
//     const user = insertResult.rows[0];
//     delete user.password;

//     return res.status(201).json({
//       message: "Registration successful! Your account is pending approval.",
//       user,
//     });
//   } catch (error) {
//     console.error("Registration error:", error);
    
//     // Check for specific PostgreSQL error codes
//     if (error.code === '23505') { // Unique violation
//       if (error.constraint.includes('email')) {
//         return res.status(400).json({ message: "Email already registered" });
//       } else if (error.constraint.includes('company_reg_num')) {
//         return res.status(400).json({ message: "Company registration number already exists" });
//       }
//     }
    
//     return res.status(500).json({ message: "Server error during registration" });
//   }
// });

// app.post("/login", async (req, res, next) => {
//   passport.authenticate("local", async (err, user, info) => {
//     if (err) {
//       console.error("Authentication error:", err)
//       return res.status(500).json({ message: "Internal server error" })
//     }
//     if (!user) {
//       return res.status(401).json({ message: info?.message || "Invalid email or password" })
//     }

//     // Check for rejected status first
//     if (user.status === "rejected") {
//       console.log(`User ${user.email} was rejected (status: ${user.status})`)
//       return res.status(403).json({ message: "Your account was rejected. Please contact our admin"})
//     }

//     // Check for pending status
//     if (user.status === "pending") {
//       console.log(`User ${user.email} is pending approval (status: ${user.status})`)
//       return res.status(403).json({ message: "Your account is pending approval." })
//     }

//     // Check if user has a roleid (for active users)
//     if (!user.roleid) {
//       return res.status(403).json({ message: "Access denied. Please contact an administrator." })
//     }

//     // Skip status checks for admins (roleid 7)
//     if (user.roleid !== 7) {
//       // Check status based on which table the user is from
//       if (user.table === "usertable" && user.status !== "active") {
//         // For other non-active statuses
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

// // Logout endpoint
// app.post("/logout", (req, res) => {
//   // Clear the session
//   if (req.session) {
//     req.session.destroy((err) => {
//       if (err) {
//         console.error("Error destroying session:", err)
//         return res.status(500).json({ message: "Failed to logout" })
//       }

//       // Clear the session cookie
//       res.clearCookie("connect.sid")

//       return res.status(200).json({ message: "Logged out successfully" })
//     })
//   } else {
//     return res.status(200).json({ message: "Already logged out" })
//   }
// })



// // Token verification middleware
// const verifyToken = (req, res, next) => {
//   // Get the token from the Authorization header
//   const authHeader = req.headers.authorization

//   if (!authHeader) {
//     console.log("No Authorization header")
//     // Try to get from query string for testing
//     if (req.query.token) {
//       req.headers.authorization = `Bearer ${req.query.token}`
//     } else {
//       return res.status(401).json({
//         error: "Authentication required",
//         message: "No token provided",
//       })
//     }
//   }

//   const token = req.headers.authorization.split(" ")[1] // Format: "Bearer TOKEN"

//   if (!token) {
//     console.log("No token provided")
//     return res.status(401).json({
//       error: "Authentication required",
//       message: "No token provided",
//     })
//   }

//   try {
//     // Verify the token
//     const decoded = jwt.verify(token, secretKey)
//     console.log("Token verified:", decoded)

//     // Add the user data to the request
//     req.user = decoded
//     next()
//   } catch (err) {
//     console.error("Token verification failed:", err)
//     return res.status(403).json({
//       error: "Invalid token",
//       message: "Failed to authenticate token",
//     })
//   }
// }

// // Updated user-info endpoint to work with token-based authentication
// app.get("/user-info", verifyToken, (req, res) => {
//   // The user data is now available from the token verification
//   const { name, surname, roleid, email, userid } = req.user

//   res.json({
//     name,
//     surname,
//     roleid,
//     email,
//     userid,
//   })
// })

// // Admin verification middleware using token
// const verifyAdminAccess = (req, res, next) => {
//   console.log("Verifying admin access with token...")

//   if (!req.user) {
//     console.log("No user data in request")
//     return res.status(401).json({
//       error: "Authentication required",
//       message: "You must be logged in to access this resource",
//     })
//   }

//   // IMPORTANT: Using roleid 7 for admin
//   const ADMIN_ROLE_ID = 7

//   console.log(`User has roleid ${req.user.roleid}`)
//   if (req.user.roleid !== ADMIN_ROLE_ID) {
//     console.log(`User has roleid ${req.user.roleid}, which is not admin`)
//     return res.status(403).json({
//       error: "Unauthorized",
//       message: "You do not have permission to access this resource",
//     })
//   }

//   console.log("Admin access verified")
//   next()
// }

// // Admin verification endpoint
// app.get("/admin/verify", verifyToken, (req, res) => {
//   console.log("Admin verify endpoint hit")

//   // IMPORTANT: Using roleid 7 for admin
//   const ADMIN_ROLE_ID = 7
//   const isAdmin = req.user.roleid === ADMIN_ROLE_ID

//   console.log(`User roleid: ${req.user.roleid}, isAdmin: ${isAdmin}`)
//   res.json({ isAdmin })
// })

// // Get pending users - updated to use token verification
// app.get("/admin/pending-users", verifyToken, verifyAdminAccess, async (req, res) => {
//   try {
//     console.log("Fetching pending users...")
//     const result = await client.query(
//       "SELECT userid, name, surname, email, companyname, roleid, status, dateofreg FROM usertable WHERE status = 'pending'",
//     )

//     console.log(`Found ${result.rows.length} pending users`)
//     res.json(result.rows)
//   } catch (err) {
//     console.error("Error fetching pending users:", err)
//     res.status(500).json({ error: "Failed to fetch pending users" })
//   }
// })

// // Approve user - updated to use token verification
// app.post("/admin/approve-user", verifyToken, verifyAdminAccess, async (req, res) => {
//   try {
//     const { userid, roleid } = req.body
//     console.log(`Approving user ${userid} with roleid ${roleid}`)

//     if (!userid || !roleid) {
//       return res.status(400).json({ error: "User ID and role ID are required" })
//     }

//     await client.query("UPDATE usertable SET status = 'active', roleid = $1 WHERE userid = $2", [roleid, userid])

//     console.log(`User ${userid} approved successfully`)
//     res.json({ message: "User approved successfully" })
//   } catch (err) {
//     console.error("Error approving user:", err)
//     res.status(500).json({ error: "Failed to approve user" })
//   }
// })

// // Reject user - updated to use token verification
// app.post("/admin/reject-user", verifyToken, verifyAdminAccess, async (req, res) => {
//   try {
//     const { userid } = req.body
//     console.log(`Rejecting user ${userid}`)

//     if (!userid) {
//       return res.status(400).json({ error: "User ID is required" })
//     }

//     await client.query("UPDATE usertable SET status = 'rejected' WHERE userid = $1", [userid])

//     console.log(`User ${userid} rejected successfully`)
//     res.json({ message: "User rejected successfully" })
//   } catch (err) {
//     console.error("Error rejecting user:", err)
//     res.status(500).json({ error: "Failed to reject user" })
//   }
// })

// // Get companies - updated to use token verification
// app.get("/admin/companies", verifyToken, verifyAdminAccess, async (req, res) => {
//   try {
//     console.log("Fetching companies...")
//     // This query assumes you have a companies table and a way to count users per company
//     const result = await client.query(`
//       SELECT c.companyid, c.name, c.status, c.created_at,
//       (SELECT COUNT(*) FROM usertable u WHERE u.company = c.name) as user_count
//       FROM companies c
//       ORDER BY c.name ASC
//     `)

//     console.log(`Found ${result.rows.length} companies`)
//     res.json(result.rows)
//   } catch (err) {
//     console.error("Error fetching companies:", err)
//     res.status(500).json({ error: "Failed to fetch companies" })
//   }
// })

// // Toggle company status - updated to use token verification
// app.post("/admin/toggle-company-status", verifyToken, verifyAdminAccess, async (req, res) => {
//   try {
//     const { companyid, status } = req.body
//     console.log(`Toggling company ${companyid} status to ${status}`)

//     if (!companyid || !status) {
//       return res.status(400).json({ error: "Company ID and status are required" })
//     }

//     // Update company status
//     await client.query("UPDATE companies SET status = $1 WHERE companyid = $2", [status, companyid])

//     // If disabling a company, also update all users from that company
//     if (status === "disabled") {
//       await client.query(
//         `
//         UPDATE usertable 
//         SET status = 'disabled' 
//         WHERE company = (SELECT name FROM companies WHERE companyid = $1)
//       `,
//         [companyid],
//       )
//     }

//     console.log(`Company ${companyid} ${status === "active" ? "enabled" : "disabled"} successfully`)
//     res.json({ message: `Company ${status === "active" ? "enabled" : "disabled"} successfully` })
//   } catch (err) {
//     console.error("Error toggling company status:", err)
//     res.status(500).json({ error: "Failed to toggle company status" })
//   }
// })

// // For backward compatibility - these endpoints use the /api prefix
// // Get users pending approval - updated to use token verification
// app.get("/api/admin/pending-users", verifyToken, async (req, res) => {
//   console.log("API endpoint for pending users hit")
//   // Check if user is authenticated and is an admin
//   if (req.user.roleid !== 7) {
//     console.log("Access denied - user is not admin")
//     return res.status(403).json({ message: "Access denied" })
//   }

//   try {
//     // Query for users with pending status
//     const result = await client.query("SELECT * FROM usertable WHERE status = 'pending' OR status IS NULL")

//     console.log(`Found ${result.rows.length} pending users`)
//     res.json(result.rows)
//   } catch (err) {
//     console.error("Error fetching pending users:", err)
//     res.status(500).json({ message: "Server error" })
//   }
// })

// // Update user status (approve/reject) - updated to use token verification
// app.post("/api/admin/user-status", verifyToken, async (req, res) => {
//   console.log("API endpoint for user status update hit")
//   // Check if user is authenticated and is an admin
//   if (req.user.roleid !== 7) {
//     console.log("Access denied - user is not admin")
//     return res.status(403).json({ message: "Access denied" })
//   }

//   const { userid, action, roleid } = req.body
//   console.log(`Updating user ${userid} with action ${action}`)

//   try {
//     if (action === "approve") {
//       // Approve user by setting roleid to 1
//       await client.query("UPDATE usertable SET roleid = $1, status = 'active', approved_at = NOW() WHERE userid = $2", [
//         roleid,
//         userid,
//       ])

//       console.log(`User ${userid} approved successfully`)
//       res.json({ message: "User approved successfully" })
//     } else if (action === "reject") {
//       // Reject user by setting a rejected flag or deleting
//       await client.query("UPDATE usertable SET status = 'rejected', rejected_at = NOW() WHERE userid = $1", [userid])

//       console.log(`User ${userid} rejected successfully`)
//       res.json({ message: "User rejected successfully" })
//     } else {
//       console.log(`Invalid action: ${action}`)
//       res.status(400).json({ message: "Invalid action" })
//     }
//   } catch (err) {
//     console.error("Error updating user status:", err)
//     res.status(500).json({ message: "Server error" })
//   }
// })

// // Get all companies - updated to use token verification
// app.get("/api/admin/companies", verifyToken, async (req, res) => {
//   console.log("API endpoint for companies hit")
//   // Check if user is authenticated and is an admin
//   if (req.user.roleid !== 7) {
//     console.log("Access denied - user is not admin")
//     return res.status(403).json({ message: "Access denied" })
//   }

//   try {
//     // Query for all companies
//     const result = await client.query(`
//       SELECT c.companyid as id, c.name, c.status, c.created_at,
//       (SELECT COUNT(*) FROM usertable u WHERE u.company = c.name) as user_count
//       FROM companies c
//       ORDER BY c.name ASC
//     `)

//     console.log(`Found ${result.rows.length} companies`)
//     res.json(result.rows)
//   } catch (err) {
//     console.error("Error fetching companies:", err)
//     res.status(500).json({ message: "Server error" })
//   }
// })

// // Update company status - updated to use token verification
// app.post("/api/admin/company-status", verifyToken, async (req, res) => {
//   console.log("API endpoint for company status update hit")
//   // Check if user is authenticated and is an admin
//   if (req.user.roleid !== 7) {
//     console.log("Access denied - user is not admin")
//     return res.status(403).json({ message: "Access denied" })
//   }

//   const { companyId, status } = req.body
//   console.log(`Updating company ${companyId} status to ${status}`)

//   try {
//     // Update company status
//     await client.query("UPDATE companies SET status = $1, updated_at = NOW() WHERE companyid = $2", [status, companyId])

//     // If disabling a company, also update all users from that company
//     if (status === "disabled") {
//       await client.query(
//         `
//         UPDATE usertable 
//         SET status = 'disabled' 
//         WHERE company = (SELECT name FROM companies WHERE companyid = $1)
//       `,
//         [companyId],
//       )
//     }

//     console.log(`Company ${companyId} ${status === "active" ? "enabled" : "disabled"} successfully`)
//     res.json({ message: `Company ${status === "active" ? "enabled" : "disabled"} successfully` })
//   } catch (err) {
//     console.error("Error updating company status:", err)
//     res.status(500).json({ message: "Server error" })
//   }
// })

// // ---------------Company -------------------- //


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
//         (SELECT COUNT(*) FROM usertable WHERE company_reg_num = u.company_reg_num) + 
//         (SELECT COUNT(*) FROM m5_employee WHERE company_reg_num = u.company_reg_num) as total_count
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


// // Get company information for a specific company_reg_num
// app.get("/api/company/:company_reg_num", verifyToken, async (req, res) => {
//   try {
//     const { company_reg_num } = req.params

//     // Check if the requesting user has permission to view this company
//     // Only admins (roleid 7) or company admins (roleid 1) of the same company can view
//     if (req.user.roleid !== 7 && !(req.user.roleid === 1 && req.user.company_reg_num === company_reg_num)) {
//       return res.status(403).json({ message: "You don't have permission to view this company" })
//     }

//     // Get company admin info
//     const companyAdminResult = await client.query(
//       "SELECT userid, name, surname, email, companyname, company_reg_num, status, dateofreg FROM usertable WHERE company_reg_num = $1 AND roleid = 1",
//       [company_reg_num],
//     )

//     if (companyAdminResult.rows.length === 0) {
//       return res.status(404).json({ message: "Company not found" })
//     }

//     const companyAdmin = companyAdminResult.rows[0]

//     // Get all users from this company
//     const usersResult = await client.query(
//       "SELECT userid, name, surname, email, roleid, status FROM usertable WHERE company_reg_num = $1 AND roleid != 1",
//       [company_reg_num],
//     )

//     // Get all employees from this company
//     const employeesResult = await client.query(
//       "SELECT userid, name, surname, email, roleid, status FROM m5_employee WHERE company_reg_num = $1",
//       [company_reg_num],
//     )

//     res.json({
//       company: {
//         name: companyAdmin.companyname,
//         reg_num: companyAdmin.company_reg_num,
//         status: companyAdmin.status,
//         registration_date: companyAdmin.dateofreg,
//       },
//       admin: {
//         userid: companyAdmin.userid,
//         name: companyAdmin.name,
//         surname: companyAdmin.surname,
//         email: companyAdmin.email,
//       },
//       users: usersResult.rows,
//       employees: employeesResult.rows,
//     })
//   } catch (err) {
//     console.error("Error fetching company information:", err)
//     res.status(500).json({ error: "Failed to fetch company information" })
//   }
// })

// // Deactivate a company and all its users
// app.post("/api/company/deactivate", verifyToken, async (req, res) => {
//   try {
//     const { company_reg_num } = req.body

//     if (!company_reg_num) {
//       return res.status(400).json({ error: "Company registration number is required" })
//     }

//     // Only admins (roleid 7) can deactivate companies
//     if (req.user.roleid !== 7) {
//       return res.status(403).json({ message: "You don't have permission to deactivate companies" })
//     }

//     // Start a transaction
//     await client.query("BEGIN")

//     // Deactivate the company admin
//     const companyAdminResult = await client.query(
//       "UPDATE usertable SET status = 'inactive' WHERE company_reg_num = $1 AND roleid = 1 RETURNING *",
//       [company_reg_num],
//     )

//     if (companyAdminResult.rows.length === 0) {
//       await client.query("ROLLBACK")
//       return res.status(404).json({ message: "Company not found" })
//     }

//     // Deactivate all users from this company
//     await client.query("UPDATE usertable SET status = 'inactive' WHERE company_reg_num = $1", [company_reg_num])

//     // Deactivate all employees from this company
//     await client.query("UPDATE m5_employee SET status = FALSE WHERE company_reg_num = $1", [company_reg_num])

//     // Commit the transaction
//     await client.query("COMMIT")

//     res.json({
//       message: "Company and all associated users have been deactivated",
//       company: companyAdminResult.rows[0].companyname,
//     })
//   } catch (err) {
//     await client.query("ROLLBACK")
//     console.error("Error deactivating company:", err)
//     res.status(500).json({ error: "Failed to deactivate company" })
//   }
// })

// // Reactivate a company and all its users
// app.post("/api/company/reactivate", verifyToken, async (req, res) => {
//   try {
//     const { company_reg_num } = req.body

//     if (!company_reg_num) {
//       return res.status(400).json({ error: "Company registration number is required" })
//     }

//     // Only admins (roleid 7) can reactivate companies
//     if (req.user.roleid !== 7) {
//       return res.status(403).json({ message: "You don't have permission to reactivate companies" })
//     }

//     // Start a transaction
//     await client.query("BEGIN")

//     // Reactivate the company admin
//     const companyAdminResult = await client.query(
//       "UPDATE usertable SET status = 'active' WHERE company_reg_num = $1 AND roleid = 1 RETURNING *",
//       [company_reg_num],
//     )

//     if (companyAdminResult.rows.length === 0) {
//       await client.query("ROLLBACK")
//       return res.status(404).json({ message: "Company not found" })
//     }

//     // Reactivate all users from this company
//     await client.query("UPDATE usertable SET status = 'active' WHERE company_reg_num = $1", [company_reg_num])

//     // Reactivate all employees from this company
//     await client.query("UPDATE m5_employee SET status = TRUE WHERE company_reg_num = $1", [company_reg_num])

//     // Commit the transaction
//     await client.query("COMMIT")

//     res.json({
//       message: "Company and all associated users have been reactivated",
//       company: companyAdminResult.rows[0].companyname,
//     })
//   } catch (err) {
//     await client.query("ROLLBACK")
//     console.error("Error reactivating company:", err)
//     res.status(500).json({ error: "Failed to reactivate company" })
//   }
// })

// // ------------------------------------------Module 0 Ends here---------------------------------- //



// // Start the server
// app.listen(PORT, async () => {
//   await connectDb()
//   console.log(`🚀 Server running on port ${PORT}`)
// })


import express from "express"
import cors from "cors"
import bcrypt from "bcrypt"
import expressSession from "express-session"
import passport from "passport"
import { Strategy as LocalStrategy } from "passport-local"
import crypto from "crypto"
import jwt from "jsonwebtoken"
import bodyParser from "body-parser"
import path from "path"
import { fileURLToPath } from "url"
import dotenv from "dotenv"
import fs from "fs"
import pkg from "pg"
const { Pool } = pkg

// Load environment variables
dotenv.config()

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 5000

// Generate a secure, random secret key
const secretKey = crypto.randomBytes(64).toString("hex")
console.log("Generated secret key:", secretKey) // Log the secret key (for debugging)

// Create a PostgreSQL connection pool
const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: Number.parseInt(process.env.POSTGRES_PORT),
  // Add connection timeout
  connectionTimeoutMillis: 5000,
  // Add idle timeout
  idleTimeoutMillis: 30000,
  // Max clients in pool
  max: 20,
})

// Log connection status
console.log("Database connection configured with:", {
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  port: process.env.POSTGRES_PORT,
  // Not logging password for security reasons
})

// Add error handler for the pool
pool.on("error", (err) => {
  console.error("Unexpected database error:", err.message)
})

// Test database connection function
const testConnection = async () => {
  let client
  try {
    client = await pool.connect()
    const result = await client.query("SELECT NOW()")
    return {
      success: true,
      time: result.rows[0].now,
      message: "Database connected successfully",
    }
  } catch (error) {
    console.error("Database connection test failed:", error.message)
    return {
      success: false,
      error: error.message,
      message: "Database connection failed",
    }
  } finally {
    if (client) client.release()
  }
}

// Try to connect to the database once at startup
;(async () => {
  try {
    const result = await testConnection()
    if (result.success) {
      console.log("Database connected successfully at:", result.time)
    } else {
      console.error("Database connection failed:", result.error)
      console.log("To fix this, please check your database configuration and restart the server.")
    }
  } catch (error) {
    console.error("Error during initial database connection test:", error)
  }
})()

// Enhanced CORS configuration
app.use(
  cors({
    credentials: true,
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Authorization"],
  }),
)

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`)
  if (req.method !== "OPTIONS") {
    console.log(
      "Headers:",
      JSON.stringify(
        {
          "content-type": req.headers["content-type"],
          authorization: req.headers.authorization ? "Bearer [REDACTED]" : "none",
        },
        null,
        2,
      ),
    )
  }
  next()
})

app.use(express.json())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// Session middleware
app.use(
  expressSession({
    secret: secretKey,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // Set to true if using HTTPS
      httpOnly: true,
      maxAge: 3600000, // Session expiration (1 hour)
      sameSite: "lax", // Added to ensure cookies are sent with cross-site requests
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

// Simple test endpoint to verify the server is running
app.get("/test-connection", async (req, res) => {
  console.log("Test connection endpoint hit")

  // Test database connection
  const dbTest = await testConnection()

  res.json({
    status: "ok",
    message: "Server is running",
    database: dbTest,
  })
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
    let client
    try {
      client = await pool.connect()
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
    } finally {
      if (client) client.release()
    }
  }),
)

passport.serializeUser((user, done) => {
  console.log("Serializing user:", user)
  done(null, {
    userid: user.userid,
    name: user.name,
    surname: user.surname,
    roleid: user.roleid, // Make sure roleid is included here
    table: user.table,
    email: user.email,
  })
})

passport.deserializeUser(async (sessionUser, done) => {
  let client
  try {
    console.log("Deserializing user:", sessionUser)
    const { userid, table } = sessionUser
    let result

    client = await pool.connect()

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
  } finally {
    if (client) client.release()
  }
})

// Enhanced token verification middleware
const verifyToken = (req, res, next) => {
  // Get the token from the Authorization header
  const authHeader = req.headers.authorization

  // List of endpoints that can be accessed without authentication
  const publicEndpoints = [
    "/api/clients",
    "/api/shipment-types",
    "/api/check-auth",
    "/test-connection",
    "/check-email",
    "/api/instructions",
    "/api/client-instruction-stats",
  ]

  // Check if this is a public endpoint or matches a pattern like /api/instruction/123
  const isPublicEndpoint =
    publicEndpoints.some((endpoint) => req.url === endpoint || req.url.startsWith(`${endpoint}?`)) ||
    req.url.match(/^\/api\/instruction\/\d+$/) ||
    req.url.match(/^\/api\/containers\/\d+$/)

  if (!authHeader) {
    console.log("No Authorization header for:", req.url)

    // If this is a public endpoint, allow access without token
    if (isPublicEndpoint) {
      console.log("Allowing unauthenticated access to public endpoint:", req.url)
      req.user = null // Set user to null to indicate unauthenticated request
      return next()
    }

    // For development: allow API access without auth during development
    if (
      (req.url === "/api/client-instruction-stats" ||
        req.url.startsWith("/api/instructions") ||
        req.url.match(/^\/api\/instruction\/\d+$/) ||
        req.url.match(/^\/api\/containers\/\d+$/)) &&
      process.env.NODE_ENV !== "production"
    ) {
      console.log("DEV MODE: Allowing unauthenticated access to:", req.url)
      req.user = {
        name: "Development",
        surname: "User",
        roleid: 1,
        userid: 0,
        email: "dev@example.com",
      }
      return next()
    }

    // For development: allow client-instruction-stats without auth during development
    if (req.url === "/api/client-instruction-stats" && process.env.NODE_ENV !== "production") {
      console.log("DEV MODE: Allowing unauthenticated access to:", req.url)
      req.user = {
        name: "Development",
        surname: "User",
        roleid: 1,
        userid: 0,
        email: "dev@example.com",
      }
      return next()
    }

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

  // If we have an authorization header, verify the token
  if (req.headers.authorization) {
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
      console.log("Token verified for user:", decoded.name, decoded.email)

      // Add the user data to the request
      req.user = decoded
      next()
    } catch (err) {
      console.error("Token verification failed:", err)

      // For development: allow access even with invalid token
      if (process.env.NODE_ENV !== "production" && isPublicEndpoint) {
        console.log("DEV MODE: Allowing access with invalid token for public endpoint")
        req.user = null
        return next()
      }

      return res.status(403).json({
        error: "Invalid token",
        message: "Failed to authenticate token",
      })
    }
  }
}

// Login route to authenticate and set the session
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
      return res.status(403).json({ message: "Your account was rejected. Please contact our admin" })
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
        const client = await pool.connect()
        // For both usertable and m5_employee, check if their company admin is active
        if (user.company_reg_num) {
          const companyCheck = await client.query(
            "SELECT * FROM usertable WHERE company_reg_num = $1 AND roleid = 1 AND status = 'active'",
            [user.company_reg_num],
          )

          if (companyCheck.rows.length === 0) {
            console.log(`No active company admin found for company_reg_num: ${user.company_reg_num}`)
            client.release()
            return res
              .status(403)
              .json({ message: "Your company account is not active. Please contact an administrator." })
          }
        }
        client.release()
      } catch (error) {
        console.error("Error checking company status:", error)
        // Continue with login even if company check fails
      }
    }

    // Generate JWT token
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

    // Store user session manually
    req.session.user = {
      userid: user.userid,
      name: user.name,
      surname: user.surname,
      email: user.email,
      roleid: user.roleid,
      table: user.table,
      company_reg_num: user.company_reg_num,
    }
    console.log("User stored in session:", req.session.user)

    const { roleid } = user
    let redirectUrl = "/"

    if (roleid === 1) redirectUrl = "/Dashboard"
    else if (roleid === 2) redirectUrl = "/ControllerDashboard"
    else if (roleid === 3) redirectUrl = "/FDashboard"
    else if (roleid === 4) redirectUrl = "/DirectorDashboard"
    else if (roleid === 7) redirectUrl = "/AdminDashboard"

    // Include roleid in the response
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

// User info route for session verification
app.get("/user-info", verifyToken, (req, res) => {
  console.log("User info endpoint hit")
  console.log("Current user session:", req.session)
  console.log("Session user:", req.session.user)
  console.log("Token user:", req.user)

  // Try to get user from token or session
  const user = req.user || req.session.user

  if (!user) {
    return res.status(401).json({ error: "Please log in first" })
  }

  res.json({
    name: user.name,
    surname: user.surname,
    roleid: user.roleid,
    email: user.email,
    userid: user.userid,
  })
})

// Get user role endpoint - alternative approach
app.get("/api/user-role", verifyToken, (req, res) => {
  console.log("Checking user role from token or session")

  // Try to get user from token or session
  const user = req.user || req.session.user

  if (!user) {
    return res.status(401).json({ error: "Please log in first" })
  }

  res.json({ roleid: user.roleid })
})

// Test endpoint
app.get("/api/test", (req, res) => {
  res.json({
    message: "API is working!",
    databaseConnected: true,
  })
})

// Enhanced registration endpoint with validation
// Endpoint to check if email already exists
app.get("/check-email", async (req, res) => {
  const { email } = req.query
  let client

  if (!email) {
    return res.status(400).json({ error: "Email parameter is required" })
  }

  try {
    client = await pool.connect()

    // Check in usertable (excluding rejected users)
    let result = await client.query("SELECT email FROM usertable WHERE email = $1", [email])

    if (result.rows.length > 0) {
      return res.json({ exists: true })
    }

    // Check in m5_employee table if it exists
    try {
      result = await client.query("SELECT email FROM m5_employee WHERE email = $1", [email])
      if (result.rows.length > 0) {
        return res.json({ exists: true })
      }
    } catch (err) {
      // If table doesn't exist or other error, continue
      console.log("Note: m5_employee table check failed, continuing...")
    }

    return res.json({ exists: false })
  } catch (error) {
    console.error("Error checking email:", error)
    return res.status(500).json({ error: "Server error" })
  } finally {
    if (client) client.release()
  }
})

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
  } = req.body

  let client

  try {
    client = await pool.connect()

    // Check if email already exists in usertable (excluding rejected users)
    let result = await client.query("SELECT email FROM usertable WHERE email = $1", [email])

    if (result.rows.length > 0) {
      return res.status(400).json({ message: "Email already registered" })
    }

    // Check if email exists in m5_employee table
    try {
      result = await client.query("SELECT email FROM m5_employee WHERE email = $1", [email])
      if (result.rows.length > 0) {
        return res.status(400).json({ message: "Email already registered" })
      }
    } catch (err) {
      // If table doesn't exist or other error, continue
      console.log("Note: m5_employee table check failed, continuing...")
    }

    // Check if company registration number already exists (excluding rejected users)
    result = await client.query(
      "SELECT company_reg_num FROM usertable WHERE company_reg_num = $1 AND status != 'rejected'",
      [company_reg_num],
    )

    if (result.rows.length > 0) {
      return res.status(400).json({ message: "Company registration number already exists" })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

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
      ],
    )

    // Return success response without sensitive data
    const user = insertResult.rows[0]
    delete user.password

    return res.status(201).json({
      message: "Registration successful! Your account is pending approval.",
      user,
    })
  } catch (error) {
    console.error("Registration error:", error)

    // Check for specific PostgreSQL error codes
    if (error.code === "23505") {
      // Unique violation
      if (error.constraint.includes("email")) {
        return res.status(400).json({ message: "Email already registered" })
      } else if (error.constraint.includes("company_reg_num")) {
        return res.status(400).json({ message: "Company registration number already exists" })
      }
    }

    return res.status(500).json({ message: "Server error during registration" })
  } finally {
    if (client) client.release()
  }
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
  let client
  try {
    console.log("Fetching pending users...")
    client = await pool.connect()
    const result = await client.query(
      "SELECT userid, name, surname, email, companyname, roleid, status, dateofreg FROM usertable WHERE status = 'pending'",
    )

    console.log(`Found ${result.rows.length} pending users`)
    res.json(result.rows)
  } catch (err) {
    console.error("Error fetching pending users:", err)
    res.status(500).json({ error: "Failed to fetch pending users" })
  } finally {
    if (client) client.release()
  }
})

// Approve user - updated to use token verification
app.post("/admin/approve-user", verifyToken, verifyAdminAccess, async (req, res) => {
  let client
  try {
    const { userid, roleid } = req.body
    console.log(`Approving user ${userid} with roleid ${roleid}`)

    if (!userid || !roleid) {
      return res.status(400).json({ error: "User ID and role ID are required" })
    }

    client = await pool.connect()
    await client.query("UPDATE usertable SET status = 'active', roleid = $1 WHERE userid = $2", [roleid, userid])

    console.log(`User ${userid} approved successfully`)
    res.json({ message: "User approved successfully" })
  } catch (err) {
    console.error("Error approving user:", err)
    res.status(500).json({ error: "Failed to approve user" })
  } finally {
    if (client) client.release()
  }
})

// Reject user - updated to use token verification
app.post("/admin/reject-user", verifyToken, verifyAdminAccess, async (req, res) => {
  let client
  try {
    const { userid } = req.body
    console.log(`Rejecting user ${userid}`)

    if (!userid) {
      return res.status(400).json({ error: "User ID is required" })
    }

    client = await pool.connect()
    await client.query("UPDATE usertable SET status = 'rejected' WHERE userid = $1", [userid])

    console.log(`User ${userid} rejected successfully`)
    res.json({ message: "User rejected successfully" })
  } catch (err) {
    console.error("Error rejecting user:", err)
    res.status(500).json({ error: "Failed to reject user" })
  } finally {
    if (client) client.release()
  }
})

// For backward compatibility - these endpoints use the /api prefix
// Get users pending approval - updated to use token verification
app.get("/api/admin/pending-users", verifyToken, async (req, res) => {
  let client
  console.log("API endpoint for pending users hit")
  // Check if user is authenticated and is an admin
  if (req.user.roleid !== 7) {
    console.log("Access denied - user is not admin")
    return res.status(403).json({ message: "Access denied" })
  }

  try {
    // Query for users with pending status
    client = await pool.connect()
    const result = await client.query("SELECT * FROM usertable WHERE status = 'pending' OR status IS NULL")

    console.log(`Found ${result.rows.length} pending users`)
    res.json(result.rows)
  } catch (err) {
    console.error("Error fetching pending users:", err)
    res.status(500).json({ message: "Server error" })
  } finally {
    if (client) client.release()
  }
})

// Update user status (approve/reject) - updated to use token verification
app.post("/api/admin/user-status", verifyToken, async (req, res) => {
  let client
  console.log("API endpoint for user status update hit")
  // Check if user is authenticated and is an admin
  if (req.user.roleid !== 7) {
    console.log("Access denied - user is not admin")
    return res.status(403).json({ message: "Access denied" })
  }

  const { userid, action, roleid } = req.body
  console.log(`Updating user ${userid} with action ${action}`)

  try {
    client = await pool.connect()
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
  } finally {
    if (client) client.release()
  }
})

// ---------------Company -------------------- //

app.get("/api/admin/company-list", verifyToken, async (req, res) => {
  let client
  try {
    // Only admins (roleid 7) can view all companies
    if (req.user.roleid !== 7) {
      return res.status(403).json({ message: "You don't have permission to view all companies" })
    }

    // Get all company admins (roleid 1)
    client = await pool.connect()
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
  } finally {
    if (client) client.release()
  }
})

// Get company information for a specific company_reg_num
app.get("/api/company/:company_reg_num", verifyToken, async (req, res) => {
  let client
  try {
    const { company_reg_num } = req.params

    // Check if the requesting user has permission to view this company
    // Only admins (roleid 7) or company admins (roleid 1) of the same company can view
    if (req.user.roleid !== 7 && !(req.user.roleid === 1 && req.user.company_reg_num === company_reg_num)) {
      return res.status(403).json({ message: "You don't have permission to view this company" })
    }

    // Get company admin info
    client = await pool.connect()
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
  } finally {
    if (client) client.release()
  }
})

// Deactivate a company and all its users
app.post("/api/company/deactivate", verifyToken, async (req, res) => {
  let client
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
    client = await pool.connect()
    await client.query("BEGIN")

    try {
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
      throw err
    }
  } catch (err) {
    console.error("Error deactivating company:", err)
    res.status(500).json({ error: "Failed to deactivate company" })
  } finally {
    if (client) client.release()
  }
})

// Reactivate a company and all its users
app.post("/api/company/reactivate", verifyToken, async (req, res) => {
  let client
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
    client = await pool.connect()
    await client.query("BEGIN")

    try {
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
      throw err
    }
  } catch (err) {
    console.error("Error reactivating company:", err)
    res.status(500).json({ error: "Failed to reactivate company" })
  } finally {
    if (client) client.release()
  }
})

// ------------------------------------------Module 0 Ends here---------------------------------- //

// ------------------- API ENDPOINTS FROM SERVER2.JS ------------------- //

// Get all clients
app.get("/api/clients", async (req, res) => {
  let client
  try {
    console.log("Fetching clients from database...")

    client = await pool.connect()

    const query = `
      SELECT m5clientkey, companyname, representative, cellnum, email
      FROM public.m5_client
      ORDER BY companyname
    `
    const result = await client.query(query)
    console.log(`Found ${result.rows.length} clients`)
    res.json(result.rows)
  } catch (error) {
    console.error("Error fetching clients:", error)
    res.status(500).json({ error: error.message })
  } finally {
    if (client) client.release()
  }
})

// Get all shipment types
app.get("/api/shipment-types", async (req, res) => {
  let client
  try {
    console.log("Fetching shipment types from database...")

    client = await pool.connect()

    const query = `
      SELECT shipkey, shipmenttype
      FROM public.shipment
      ORDER BY shipkey
    `
    const result = await client.query(query)
    console.log(`Found ${result.rows.length} shipment types`)
    res.json(result.rows)
  } catch (error) {
    console.error("Error fetching shipment types:", error)
    res.status(500).json({ error: error.message })
  } finally {
    if (client) client.release()
  }
})

// API endpoint to get client instruction statistics
app.get("/api/client-instruction-stats", verifyToken, async (req, res) => {
  let client
  try {
    console.log("Fetching client instruction statistics from database...")
    console.log(
      "User making request:",
      req.user ? `${req.user.name} ${req.user.surname} (Role ID: ${req.user.roleid})` : "Unauthenticated",
    )

    client = await pool.connect()

    // Debug query to check actual status values in the database
    const statusCheckQuery = `
      SELECT DISTINCT status FROM public.m1_controller
    `
    const statusResult = await client.query(statusCheckQuery)
    console.log(
      "Available status values in database:",
      statusResult.rows.map((row) => row.status),
    )

    // Updated query to include all clients and count all status types
    const query = `
      SELECT 
        c.m5clientkey,
        c.companyname,
        c.representative,
        c.email,
        MAX(m.pickupdate) as latest_date,
        SUM(CASE WHEN m.status = 'New' THEN 1 ELSE 0 END) as new_count,
        SUM(CASE WHEN m.status = 'In progress' THEN 1 ELSE 0 END) as in_progress_count,
        SUM(CASE WHEN m.status = 'Completed' THEN 1 ELSE 0 END) as completed_count
      FROM 
        public.m5_client c
      LEFT JOIN 
        public.m1_controller m ON c.m5clientkey = m.client
      GROUP BY 
        c.m5clientkey, c.companyname, c.representative, c.email
      ORDER BY 
        c.companyname
    `

    const result = await client.query(query)
    console.log("Client stats query result count:", result.rows.length)
    res.json(result.rows)
  } catch (error) {
    console.error("Error fetching client statistics:", error)
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
    })
  } finally {
    if (client) client.release()
  }
})

// API endpoint to check if there are any new instructions
app.get("/api/has-new-instructions", verifyToken, async (req, res) => {
  let client
  try {
    console.log("Checking for new instructions...")

    client = await pool.connect()

    const query = `
      SELECT EXISTS(
        SELECT 1 FROM public.m1_controller WHERE status = 'New'
      ) as has_new
    `

    const result = await client.query(query)
    console.log(`Has new instructions: ${result.rows[0].has_new}`)
    res.json({ hasNew: result.rows[0].has_new })
  } catch (error) {
    console.error("Error checking for new instructions:", error)
    res.status(500).json({ error: error.message })
  } finally {
    if (client) client.release()
  }
})

// API endpoint to get instructions for a specific client
app.get("/api/instructions", verifyToken, async (req, res) => {
  let client
  try {
    const { clientId } = req.query
    console.log(`Fetching instructions for client ID: ${clientId || "all"}`)
    console.log(
      "User making request:",
      req.user ? `${req.user.name} ${req.user.surname} (Role ID: ${req.user.roleid})` : "Unauthenticated",
    )

    client = await pool.connect()

    // Updated query to join with shipment table to get the shipment type text
    let query = `
      SELECT 
        m.m1key,
        m.fileref as fileno,
        m.shipment_type,
        s.shipmenttype as type_text,
        m.status,
        m.pickupdate,
        m.client,
        c.companyname
      FROM 
        public.m1_controller m
      JOIN 
        public.m5_client c ON m.client = c.m5clientkey
      LEFT JOIN
        public.shipment s ON m.shipment_type = s.shipkey
    `

    const queryParams = []

    if (clientId) {
      query += ` WHERE m.client = $1`
      queryParams.push(clientId)
    }

    query += ` ORDER BY m.pickupdate DESC`

    const result = await client.query(query, queryParams)
    console.log(`Found ${result.rows.length} instructions`)
    res.json(result.rows)
  } catch (error) {
    console.error("Error fetching instructions:", error)
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
    })
  } finally {
    if (client) client.release()
  }
})

// API endpoint to get a single instruction by ID
app.get("/api/instruction/:id", verifyToken, async (req, res) => {
  let client
  try {
    const instructionId = req.params.id

    console.log(`Fetching instruction with ID: ${instructionId}`)

    client = await pool.connect()

    // Query to get instruction details with client and shipment type information
    const query = `
      SELECT 
        m.*,
        c.companyname,
        c.representative,
        c.cellnum,
        c.email,
        s.shipmenttype
      FROM 
        public.m1_controller m
      JOIN 
        public.m5_client c ON m.client = c.m5clientkey
      JOIN
        public.shipment s ON m.shipment_type = s.shipkey
      WHERE 
        m.m1key = $1
    `

    const result = await client.query(query, [instructionId])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Instruction not found" })
    }

    console.log(`Found instruction with ID: ${instructionId}`)
    res.json(result.rows[0])
  } catch (error) {
    console.error("Error fetching instruction:", error)
    res.status(500).json({ error: error.message })
  } finally {
    if (client) client.release()
  }
})

// API endpoint to update an instruction
app.put("/api/instruction/:id", verifyToken, async (req, res) => {
  let client
  try {
    const instructionId = req.params.id
    const updatedData = req.body

    console.log(`Updating instruction with ID: ${instructionId}`)
    console.log("Update data received:", {
      ...updatedData,
      description: updatedData.description ? updatedData.description.substring(0, 20) + "..." : null,
      total_cost: updatedData.total_cost, // Log total_cost explicitly
      weight: updatedData.weight, // Log weight explicitly
      booking_ref: updatedData.booking_ref, // Log new shipping fields
      vessel_name: updatedData.vessel_name,
      voyage_num: updatedData.voyage_num,
      imo_num: updatedData.imo_num,
      flag_reg: updatedData.flag_reg,
    })

    client = await pool.connect()

    // Start transaction
    await client.query("BEGIN")

    try {
      // IMPORTANT: Explicitly check if the shipping fields exist in the request
      // If they don't exist, set them to empty strings
      const bookingRef = updatedData.booking_ref !== undefined ? updatedData.booking_ref : ""
      const vesselName = updatedData.vessel_name !== undefined ? updatedData.vessel_name : ""
      const voyageNum = updatedData.voyage_num !== undefined ? updatedData.voyage_num : ""
      const imoNum = updatedData.imo_num !== undefined ? updatedData.imo_num : ""
      const flagReg = updatedData.flag_reg !== undefined ? updatedData.flag_reg : ""

      // Log the shipping fields to verify they're being set correctly
      console.log("Shipping fields:", {
        bookingRef,
        vesselName,
        voyageNum,
        imoNum,
        flagReg,
      })

      // Update the instruction - FIXED QUERY with proper field names and handling
      const query = `
        UPDATE public.m1_controller
        SET 
          client = $1,
          task = $2,
          shipment_type = $3,
          pickup = $4,
          dropoff = $5,
          hazardous = $6,
          surchages = $7,
          pickuptime = $8,
          pickupdate = $9,
          stackdate = $10,
          deadline = $11,
          fileref = $12,
          rateweight = $13,
          rate = $14,
          description = $15,
          vat = $16,
          num_six_meters = $17,
          num_twelve_meters = $18,
          num_abnormal = $19,
          total_cost = $20,
          weight = $21,
          status = $22,
          booking_ref = $23,
          vessel_name = $24,
          voyage_num = $25,
          imo_num = $26,
          flag_reg = $27
        WHERE m1key = $28
        RETURNING *
      `

      // Create values array with all fields
      const values = [
        updatedData.client,
        updatedData.task,
        updatedData.shipment_type,
        updatedData.pickup,
        updatedData.dropoff,
        updatedData.hazardous,
        updatedData.surchages,
        updatedData.pickuptime,
        updatedData.pickupdate,
        updatedData.stackdate,
        updatedData.deadline,
        updatedData.fileref,
        updatedData.rateweight,
        updatedData.rate,
        updatedData.description,
        updatedData.vat || 15,
        updatedData.num_six_meters || 0,
        updatedData.num_twelve_meters || 0,
        updatedData.num_abnormal || 0,
        updatedData.total_cost, // Add total_cost field
        updatedData.weight, // Add weight field
        updatedData.status || "In progress",
        bookingRef, // Use the explicitly checked variables
        vesselName,
        voyageNum,
        imoNum,
        flagReg,
        instructionId,
      ]

      // Log the values for debugging
      console.log("SQL values for update:", values)

      const result = await client.query(query, values)

      if (result.rows.length === 0) {
        await client.query("ROLLBACK")
        return res.status(404).json({ error: "Instruction not found" })
      }

      // Commit transaction
      await client.query("COMMIT")

      console.log(`Updated instruction with ID: ${instructionId}`)
      console.log("Updated data:", {
        total_cost: result.rows[0].total_cost,
        weight: result.rows[0].weight,
        booking_ref: result.rows[0].booking_ref,
        vessel_name: result.rows[0].vessel_name,
        voyage_num: result.rows[0].voyage_num,
        imo_num: result.rows[0].imo_num,
        flag_reg: result.rows[0].flag_reg,
      })

      res.json({ success: true, data: result.rows[0] })
    } catch (error) {
      await client.query("ROLLBACK")
      console.error("SQL error during update:", error)
      throw error
    }
  } catch (error) {
    console.error("Error updating instruction:", error)
    res.status(500).json({ error: error.message })
  } finally {
    if (client) client.release()
  }
})

// API endpoint to get containers for a specific instruction
app.get("/api/containers/:instructionId", verifyToken, async (req, res) => {
  let client
  try {
    const instructionId = req.params.instructionId
    console.log(`Fetching containers for instruction ID: ${instructionId}`)

    client = await pool.connect()

    // Query to get containers for the instruction
    const query = `
      SELECT containerkey, containernum, weight, m1key
      FROM public.container
      WHERE m1key = $1
    `

    const result = await client.query(query, [instructionId])
    console.log(`Found ${result.rows.length} containers for instruction ID: ${instructionId}`)

    // If no containers found, return empty array instead of 404
    res.json(result.rows)
  } catch (error) {
    console.error("Error fetching containers:", error)
    res.status(500).json({ error: error.message })
  } finally {
    if (client) client.release()
  }
})

// API endpoint to update/add containers for a specific instruction
app.post("/api/containers/:instructionId", verifyToken, async (req, res) => {
  let client
  try {
    const instructionId = req.params.instructionId
    const containerData = req.body

    if (!Array.isArray(containerData)) {
      return res.status(400).json({ error: "Container data must be an array" })
    }

    console.log(`Updating containers for instruction ID: ${instructionId}`)
    console.log("Container data received:", JSON.stringify(containerData, null, 2))

    client = await pool.connect()

    // Start transaction
    await client.query("BEGIN")

    try {
      // First, delete all existing containers for this instruction
      const deleteQuery = `
        DELETE FROM public.container
        WHERE m1key = $1
      `
      const deleteResult = await client.query(deleteQuery, [instructionId])
      console.log(`Deleted ${deleteResult.rowCount} existing containers for instruction ID: ${instructionId}`)

      // Then, insert the new containers
      const insertResults = []
      for (const container of containerData) {
        // IMPORTANT FIX: Check for both possible property names (containernum and containerNum)
        // This handles differences between client and server naming conventions
        const containerNum = container.containernum || container.containerNum || ""

        // Parse weight as float if it exists
        const weight =
          container.weight !== null && container.weight !== undefined ? Number.parseFloat(container.weight) : null

        // Log each container being inserted
        console.log(`Inserting container: containerNum=${containerNum}, weight=${weight}, m1key=${instructionId}`)

        const insertQuery = `
          INSERT INTO public.container (containernum, weight, m1key)
          VALUES ($1, $2, $3)
          RETURNING *
        `
        const values = [containerNum, weight, instructionId]

        try {
          const result = await client.query(insertQuery, values)
          console.log(`Inserted container with ID: ${result.rows[0].containerkey}`)
          insertResults.push(result.rows[0])
        } catch (insertError) {
          console.error(`Error inserting container: ${insertError.message}`)
          throw insertError
        }
      }

      // Commit transaction
      await client.query("COMMIT")
      console.log(`Successfully inserted ${insertResults.length} containers for instruction ID: ${instructionId}`)

      // Verify the containers were inserted
      const verifyQuery = `
        SELECT COUNT(*) FROM public.container WHERE m1key = $1
      `
      const verifyResult = await client.query(verifyQuery, [instructionId])
      console.log(
        `Verification: ${verifyResult.rows[0].count} containers now exist for instruction ID: ${instructionId}`,
      )

      res.json({ success: true, data: insertResults })
    } catch (error) {
      await client.query("ROLLBACK")
      console.error("SQL error during container update:", error)
      throw error
    }
  } catch (error) {
    console.error("Error updating containers:", error)
    res.status(500).json({ error: error.message })
  } finally {
    if (client) client.release()
  }
})

// Save controller data and container data
app.post("/api/save-instruction", verifyToken, async (req, res) => {
  let client
  try {
    const { controllerData, containerData } = req.body
    console.log("Received instruction data:", {
      controllerData: {
        ...controllerData,
        description: "...", // Truncate for logging
        total_cost: controllerData.total_cost, // Log total_cost explicitly
        weight: controllerData.weight, // Log weight explicitly
        booking_ref: controllerData.booking_ref, // Log shipping fields
        vessel_name: controllerData.vessel_name,
        voyage_num: controllerData.voyage_num,
        imo_num: controllerData.imo_num,
        flag_reg: controllerData.flag_reg,
      },
      containerCount: containerData.length,
    })

    client = await pool.connect()

    // Start transaction
    await client.query("BEGIN")

    try {
      // Insert data into m1_controller table with updated fields
      const controllerQuery = `
        INSERT INTO public.m1_controller (
          client, task, shipment_type, pickup, dropoff, 
          hazardous, surchages, pickuptime, pickupdate, 
          stackdate, deadline, fileref, rateweight, 
          rate, description, status, vat,
          num_six_meters, num_twelve_meters, num_abnormal,
          weight, total_cost, booking_ref, vessel_name, 
          voyage_num, imo_num, flag_reg
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
        ) RETURNING m1key
      `

      const controllerValues = [
        controllerData.clientId,
        controllerData.task,
        controllerData.shipmentTypeId,
        controllerData.pickup,
        controllerData.dropoff,
        controllerData.hazardous,
        controllerData.surcharges,
        controllerData.pickupTime,
        controllerData.pickupDate,
        controllerData.stackDate,
        controllerData.deadline,
        controllerData.fileRef,
        controllerData.rateWeight,
        controllerData.rate,
        controllerData.description,
        "New", // Changed from "In progress" to "New"
        controllerData.vat || 15,
        controllerData.num_six_meters || 0,
        controllerData.num_twelve_meters || 0,
        controllerData.num_abnormal || 0,
        controllerData.weight, // Add weight field
        controllerData.total_cost, // Add total_cost field
        controllerData.booking_ref || "", // Add shipping fields
        controllerData.vessel_name || "",
        controllerData.voyage_num || "",
        controllerData.imo_num || "",
        controllerData.flag_reg || "",
      ]

      console.log("Controller values for SQL:", controllerValues)

      const controllerResult = await client.query(controllerQuery, controllerValues)
      const m1key = controllerResult.rows[0].m1key
      console.log(`Created controller record with m1key: ${m1key}`)

      // Insert container data
      for (const container of containerData) {
        const containerQuery = `
          INSERT INTO public.container (
            containernum, weight, m1key
          ) VALUES (
            $1, $2, $3
          )
        `

        const containerValues = [container.containerNum, container.weight, m1key]

        await client.query(containerQuery, containerValues)
      }
      console.log(`Added ${containerData.length} container records`)

      // Commit transaction
      await client.query("COMMIT")

      res.json({ success: true, m1key })
    } catch (error) {
      // Rollback transaction on error
      await client.query("ROLLBACK")
      console.error("Error saving instruction:", error)
      res.status(500).json({ error: error.message })
    }
  } catch (error) {
    console.error("Error in save-instruction endpoint:", error)
    res.status(500).json({ error: error.message })
  } finally {
    if (client) client.release()
  }
})

// API test endpoint
app.get("/api-test/run-all", async (req, res) => {
  let client
  try {
    console.log("Running all API tests...")

    // Test database connection
    const dbTest = await testConnection()

    // Test endpoints
    const tests = [
      { name: "Database Connection", success: dbTest.success, message: dbTest.message },
      { name: "API Test Endpoint", success: true, message: "API test endpoint is working" },
    ]

    // Test clients endpoint
    try {
      client = await pool.connect()
      const clientsResult = await client.query("SELECT COUNT(*) FROM public.m5_client")
      tests.push({
        name: "Clients Endpoint",
        success: true,
        message: `Found ${clientsResult.rows[0].count} clients in database`,
      })
    } catch (error) {
      tests.push({
        name: "Clients Endpoint",
        success: false,
        message: `Error: ${error.message}`,
      })
    }

    // Test shipment types endpoint
    try {
      const shipmentResult = await client.query("SELECT COUNT(*) FROM public.shipment")
      tests.push({
        name: "Shipment Types Endpoint",
        success: true,
        message: `Found ${shipmentResult.rows[0].count} shipment types in database`,
      })
    } catch (error) {
      tests.push({
        name: "Shipment Types Endpoint",
        success: false,
        message: `Error: ${error.message}`,
      })
    }

    // Test instructions endpoint
    try {
      const instructionsResult = await client.query("SELECT COUNT(*) FROM public.m1_controller")
      tests.push({
        name: "Instructions Endpoint",
        success: true,
        message: `Found ${instructionsResult.rows[0].count} instructions in database`,
      })
    } catch (error) {
      tests.push({
        name: "Instructions Endpoint",
        success: false,
        message: `Error: ${error.message}`,
      })
    }

    // Calculate overall success
    const allSuccess = tests.every((test) => test.success)

    res.json({
      success: allSuccess,
      message: allSuccess ? "All tests passed successfully" : "Some tests failed",
      tests: tests,
    })
  } catch (error) {
    console.error("Error running API tests:", error)
    res.status(500).json({
      success: false,
      message: "Error running API tests",
      error: error.message,
    })
  } finally {
    if (client) client.release()
  }
})

// Add a debug endpoint to check token validity
app.get("/api/check-auth", verifyToken, (req, res) => {
  console.log("Auth check endpoint hit")
  res.json({
    authenticated: true,
    user: {
      userid: req.user ? req.user.userid : null,
      name: req.user ? req.user.name : "Guest",
      surname: req.user ? req.user.surname : "User",
      email: req.user ? req.user.email : null,
      roleid: req.user ? req.user.roleid : null,
    },
  })
})

// Check if build directory exists before trying to serve static files
const buildPath = path.join(__dirname, "build")
if (fs.existsSync(buildPath)) {
  console.log("Build directory found, serving static files from:", buildPath)
  // Serve static files from the React app
  app.use(express.static(buildPath))

  // The "catchall" handler: for any request that doesn't
  // match one above, send back React's index.html file.
  app.get("*", (req, res) => {
    res.sendFile(path.join(buildPath, "index.html"))
  })
} else {
  console.log("Build directory not found at:", buildPath)
  console.log("Only API endpoints will be available")

  // Add a fallback route for non-API routes
  app.get("*", (req, res) => {
    // Check if this is an API request
    if (req.url.startsWith("/api/")) {
      return res.status(404).json({ error: "API endpoint not found" })
    }

    // For non-API requests, return a simple HTML page
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Logistics API Server</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            h1 { color: #333; }
            .container { max-width: 800px; margin: 0 auto; }
            .note { background-color: #f8f9fa; padding: 15px; border-left: 4px solid #007bff; margin-bottom: 20px; }
            code { background-color: #f1f1f1; padding: 2px 5px; border-radius: 3px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Logistics API Server</h1>
            <div class="note">
              <p>The server is running in API-only mode. The React build directory was not found.</p>
              <p>API endpoints are available at <code>/api/...</code></p>
            </div>
            <p>Available endpoints:</p>
            <ul>
              <li><code>/api/clients</code> - Get all clients</li>
              <li><code>/api/shipment-types</code> - Get all shipment types</li>
              <li><code>/api/instructions</code> - Get all instructions</li>
              <li><code>/api/client-instruction-stats</code> - Get client instruction statistics</li>
              <li><code>/test-connection</code> - Test database connection</li>
            </ul>
          </div>
        </body>
      </html>
    `)
  })
}

// Start the server
app.listen(PORT, async () => {
  try {
    // Test database connection on startup
    const dbTest = await testConnection()
    if (dbTest.success) {
      console.log(`✅ Database Connected Successfully at ${dbTest.time}`)
    } else {
      console.error(`❌ Database Connection Failed: ${dbTest.error}`)
    }
    console.log(`🚀 Server running on port ${PORT}`)
    console.log(`API endpoints available at http://localhost:${PORT}/api/`)
  } catch (err) {
    console.error("Server startup error:", err)
  }
})

// Export the app for testing purposes
export default app


