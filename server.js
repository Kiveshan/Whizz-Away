import express from "express";
import cors from "cors";
import pg from "pg";
import bcrypt from "bcrypt";
import expressSession from "express-session";
import passport from "passport";
import LocalStrategy from "passport-local";
import crypto from "crypto";
import jwt from "jsonwebtoken";

const app = express();
const PORT = 5000;

// Generate a secure, random secret key
const secretKey = crypto.randomBytes(64).toString('hex');
console.log("Generated secret key:", secretKey); // Log the secret key (for debugging)

// Middleware setup
app.use(cors({ 
  credentials: true, 
  origin: "http://localhost:3000",
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Session middleware (kept for backward compatibility)
app.use(expressSession({
  secret: secretKey,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === "production", // Set to true if using HTTPS
    httpOnly: true, 
    maxAge: 3600000 // Session expiration (1 hour)
  }
}));

// Add session debugging middleware
app.use((req, res, next) => {
  console.log('Session Middleware Check:');
  console.log('- Session ID:', req.session.id);
  console.log('- Session Cookie:', req.headers.cookie);
  console.log('- Session User:', req.session.user);
  next();
});

app.use(passport.initialize());
app.use(passport.session());

// Database client setup (connecting only when needed)
const client = new pg.Client({
  user: process.env.RDS_USERNAME || "postgres",
  host: process.env.RDS_HOSTNAME || "localhost",
  database: process.env.RDS_DB_NAME || "Whizz30March",
  password: process.env.RDS_PASSWORD || "123456",
  port: process.env.RDS_PORT || 5433,
  ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : false
});

// Function to connect to the database
async function connectDb() {
  try {
    await client.connect();
    console.log("✅ Database Connected Successfully");
  } catch (err) {
    console.error("Database connection error:", err);
    process.exit(1); // Terminate the process if the connection fails
  }
}

// Simple test endpoint to verify the server is running
app.get("/test-connection", (req, res) => {
  console.log("Test connection endpoint hit");
  res.json({ status: "ok", message: "Server is running" });
});

// Add test session endpoint
app.get("/test-session", (req, res) => {
  console.log("Test session endpoint hit");
  console.log("Session:", req.session);
  console.log("Session User:", req.session.user);
  
  if (!req.session.user) {
    return res.json({ 
      status: "error", 
      message: "No user in session",
      sessionExists: !!req.session,
      sessionId: req.session.id
    });
  }
  
  res.json({ 
    status: "success", 
    message: "User found in session", 
    user: {
      name: req.session.user.name,
      surname: req.session.user.surname,
      roleid: req.session.user.roleid
    }
  });
});

// Add simple session test routes
app.get("/set-session-test", (req, res) => {
  // Set a simple value in the session
  req.session.testValue = "This is a test value";
  req.session.timestamp = new Date().toISOString();
  
  // Force save the session
  req.session.save(err => {
    if (err) {
      console.error("Error saving session:", err);
      return res.status(500).json({ error: "Failed to save session" });
    }
    
    res.json({ 
      message: "Test value set in session", 
      sessionId: req.session.id,
      testValue: req.session.testValue,
      timestamp: req.session.timestamp
    });
  });
});

app.get("/check-session-test", (req, res) => {
  res.json({
    sessionId: req.session.id,
    testValue: req.session.testValue,
    timestamp: req.session.timestamp
  });
});

// Passport Local Strategy for Authentication
passport.use(new LocalStrategy(
  { usernameField: "email" }, 
  async (email, password, done) => {
    try {
      let result = await client.query("SELECT * FROM usertable WHERE email = $1", [email]);
      
      if (result.rows.length === 0) {
        result = await client.query("SELECT * FROM m5_employee WHERE email = $1", [email]);
        if (result.rows.length === 0) {
          console.log("No user found in both tables with email:", email);
          return done(null, false, { message: "Invalid email or password" });
        }
      }

      const user = result.rows[0];
      console.log("Fetched user:", user);

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        console.log("Password mismatch for user:", email);
        return done(null, false, { message: "Invalid email or password" });
      }

      user.table = result.fields[0].table;
      return done(null, user);
    } catch (err) {
      console.error("Error during authentication:", err);
      return done(err);
    }
  }
));

passport.serializeUser((user, done) => {
  console.log("Serializing user:", user);
  done(null, { 
    userid: user.userid, 
    name: user.name, 
    surname: user.surname, 
    table: user.table, 
    roleid: user.roleid,
    email: user.email
  });
});

passport.deserializeUser(async (sessionUser, done) => {
  try {
    console.log("Deserializing user:", sessionUser);
    const { userid, table } = sessionUser;
    let result;

    if (table === "usertable") {
      result = await client.query("SELECT * FROM usertable WHERE userid = $1", [userid]);
    } else if (table === "m5_employee") {
      result = await client.query("SELECT * FROM m5_employee WHERE userid = $1", [userid]);
    }

    if (!result || result.rows.length === 0) {
      console.log("User session not found in database");
      return done(null, false);
    }
    
    console.log("Session user fetched:", result.rows[0]);
    done(null, result.rows[0]);
  } catch (err) {
    console.error("Error deserializing user:", err);
    done(err);
  }
});

app.post("/register", async (req, res) => {
  const { name, surname, email, password, companyname, company_reg_num } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await client.query(
      "INSERT INTO usertable (name, surname, email, password, companyname, company_reg_num, dateofreg) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *",
      [name, surname, email, hashedPassword, companyname, company_reg_num]
    );

    res.json({ message: "User registered successfully", user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});




// Updated login route to return a comprehensive token
app.post("/login", async (req, res, next) => {
  passport.authenticate("local", async (err, user, info) => {
    if (err) {
      console.error("Authentication error:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
    if (!user) {
      return res.status(401).json({ message: info?.message || "Invalid email or password" });
    }
    
    // Check if user has a roleid
    if (!user.roleid) {
      return res.status(403).json({ message: "Access denied. No role assigned." });
    }

    // Create a comprehensive token with all necessary user data
    const token = jwt.sign({ 
      userid: user.userid, 
      name: user.name,
      surname: user.surname,
      email: user.email,
      roleid: user.roleid,
      table: user.table
    }, secretKey, { expiresIn: '1h' });
    
    // Also store in session for backward compatibility
    req.session.user = {
      userid: user.userid,
      name: user.name,
      surname: user.surname,
      email: user.email,
      roleid: user.roleid,
      table: user.table
    };
    
    console.log("User authenticated:", user.name, user.surname);
    console.log("Token generated for user");
    
    const { roleid } = user;
    let redirectUrl = "/";

    if (roleid === 1) redirectUrl = "/Dashboard";
    else if (roleid === 2) redirectUrl = "/ControllerDashboard";
    else if (roleid === 3) redirectUrl = "/FDashboard";
    else if (roleid === 4) redirectUrl = "/DirectorDashboard";
    else if (roleid === 7) redirectUrl = "/AdminDashboard";

    return res.json({ 
      message: "Login successful", 
      redirectUrl, 
      token,
      user: {
        userid: user.userid,
        name: user.name,
        surname: user.surname,
        roleid: user.roleid
      }
    });
  })(req, res, next);
});

// User info route for session verification
app.get("/user-info", (req, res) => {
  console.log("Current user session:", req.session.user);
  if (!req.session.user) {
    return res.status(401).json({ error: "Please log in first" });
  }
  res.json({ 
    name: req.session.user.name, 
    surname: req.session.user.surname,
    roleid: req.session.user.roleid
  });
});

// Token verification middleware
const verifyToken = (req, res, next) => {
  // Get the token from the Authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    console.log('No Authorization header');
    // Try to get from query string for testing
    if (req.query.token) {
      req.headers.authorization = `Bearer ${req.query.token}`;
    } else {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'No token provided'
      });
    }
  }
  
  const token = req.headers.authorization.split(' ')[1]; // Format: "Bearer TOKEN"
  
  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'No token provided'
    });
  }
  
  try {
    // Verify the token
    const decoded = jwt.verify(token, secretKey);
    console.log('Token verified:', decoded);
    
    // Add the user data to the request
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token verification failed:', err);
    return res.status(403).json({ 
      error: 'Invalid token',
      message: 'Failed to authenticate token'
    });
  }
};

// Admin verification middleware using token
const verifyAdminAccess = (req, res, next) => {
  console.log('Verifying admin access with token...');
  
  if (!req.user) {
    console.log('No user data in request');
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'You must be logged in to access this resource'
    });
  }
  
  // IMPORTANT: Using roleid 7 for admin
  const ADMIN_ROLE_ID = 7;
  
  console.log(`User has roleid ${req.user.roleid}`);
  if (req.user.roleid !== ADMIN_ROLE_ID) {
    console.log(`User has roleid ${req.user.roleid}, which is not admin`);
    return res.status(403).json({ 
      error: 'Unauthorized',
      message: 'You do not have permission to access this resource' 
    });
  }
  
  console.log('Admin access verified');
  next();
};

// Admin verification endpoint
app.get("/admin/verify", verifyToken, (req, res) => {
  console.log("Admin verify endpoint hit");
  
  // IMPORTANT: Using roleid 7 for admin
  const ADMIN_ROLE_ID = 7;
  const isAdmin = req.user.roleid === ADMIN_ROLE_ID;
  
  console.log(`User roleid: ${req.user.roleid}, isAdmin: ${isAdmin}`);
  res.json({ isAdmin });
});

// Get pending users - updated to use token verification
app.get("/admin/pending-users", verifyToken, verifyAdminAccess, async (req, res) => {
  try {
    console.log("Fetching pending users...");
    const result = await client.query(
      "SELECT userid, name, surname, email, companyname, roleid, status, dateofreg FROM usertable WHERE roleid is NULL"
    );
    
    console.log(`Found ${result.rows.length} pending users`);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching pending users:", err);
    res.status(500).json({ error: "Failed to fetch pending users" });
  }
});

// Approve user - updated to use token verification
app.post("/admin/approve-user", verifyToken, verifyAdminAccess, async (req, res) => {
  try {
    const { userid, roleid } = req.body;
    console.log(`Approving user ${userid} with roleid ${roleid}`);

    if (!userid || !roleid) {
      return res.status(400).json({ error: "User ID and role ID are required" });
    }

    await client.query(
      "UPDATE usertable SET status = 'active', roleid = $1 WHERE userid = $2",
      [roleid, userid]
    );
    
    console.log(`User ${userid} approved successfully`);
    res.json({ message: "User approved successfully" });
  } catch (err) {
    console.error("Error approving user:", err);
    res.status(500).json({ error: "Failed to approve user" });
  }
});

// Reject user - updated to use token verification
app.post("/admin/reject-user", verifyToken, verifyAdminAccess, async (req, res) => {
  try {
    const { userid } = req.body;
    console.log(`Rejecting user ${userid}`);

    if (!userid) {
      return res.status(400).json({ error: "User ID is required" });
    }

    await client.query(
      "UPDATE usertable SET status = 'rejected' WHERE userid = $1",
      [userid]
    );
    
    console.log(`User ${userid} rejected successfully`);
    res.json({ message: "User rejected successfully" });
  } catch (err) {
    console.error("Error rejecting user:", err);
    res.status(500).json({ error: "Failed to reject user" });
  }
});

// Get companies - updated to use token verification
app.get("/admin/companies", verifyToken, verifyAdminAccess, async (req, res) => {
  try {
    console.log("Fetching companies...");
    // This query assumes you have a companies table and a way to count users per company
    const result = await client.query(`
      SELECT c.companyid, c.name, c.status, c.created_at,
      (SELECT COUNT(*) FROM usertable u WHERE u.company = c.name) as user_count
      FROM companies c
      ORDER BY c.name ASC
    `);
    
    console.log(`Found ${result.rows.length} companies`);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching companies:", err);
    res.status(500).json({ error: "Failed to fetch companies" });
  }
});

// Toggle company status - updated to use token verification
app.post("/admin/toggle-company-status", verifyToken, verifyAdminAccess, async (req, res) => {
  try {
    const { companyid, status } = req.body;
    console.log(`Toggling company ${companyid} status to ${status}`);

    if (!companyid || !status) {
      return res.status(400).json({ error: "Company ID and status are required" });
    }

    // Update company status
    await client.query(
      "UPDATE companies SET status = $1 WHERE companyid = $2",
      [status, companyid]
    );

    // If disabling a company, also update all users from that company
    if (status === "disabled") {
      await client.query(
        `
        UPDATE usertable 
        SET status = 'disabled' 
        WHERE company = (SELECT name FROM companies WHERE companyid = $1)
      `,
        [companyid]
      );
    }
    
    console.log(`Company ${companyid} ${status === "active" ? "enabled" : "disabled"} successfully`);
    res.json({ message: `Company ${status === "active" ? "enabled" : "disabled"} successfully` });
  } catch (err) {
    console.error("Error toggling company status:", err);
    res.status(500).json({ error: "Failed to toggle company status" });
  }
});

// For backward compatibility - these endpoints use the /api prefix
// Get users pending approval - updated to use token verification
app.get("/api/admin/pending-users", verifyToken, async (req, res) => {
  console.log("API endpoint for pending users hit");
  // Check if user is authenticated and is an admin
  if (req.user.roleid !== 7) {
    console.log("Access denied - user is not admin");
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    // Query for users with pending status
    const result = await client.query(
      "SELECT * FROM usertable WHERE status = 'pending' OR status IS NULL"
    );
    
    console.log(`Found ${result.rows.length} pending users`);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching pending users:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update user status (approve/reject) - updated to use token verification
app.post("/api/admin/user-status", verifyToken, async (req, res) => {
  console.log("API endpoint for user status update hit");
  // Check if user is authenticated and is an admin
  if (req.user.roleid !== 7) {
    console.log("Access denied - user is not admin");
    return res.status(403).json({ message: "Access denied" });
  }

  const { userid, action, roleid } = req.body;
  console.log(`Updating user ${userid} with action ${action}`);

  try {
    if (action === "approve") {
      // Approve user by setting roleid to 1
      await client.query(
        "UPDATE usertable SET roleid = $1, status = 'active', approved_at = NOW() WHERE userid = $2",
        [roleid, userid]
      );
      
      console.log(`User ${userid} approved successfully`);
      res.json({ message: "User approved successfully" });
    } else if (action === "reject") {
      // Reject user by setting a rejected flag or deleting
      await client.query(
        "UPDATE usertable SET status = 'rejected', rejected_at = NOW() WHERE userid = $1",
        [userid]
      );
      
      console.log(`User ${userid} rejected successfully`);
      res.json({ message: "User rejected successfully" });
    } else {
      console.log(`Invalid action: ${action}`);
      res.status(400).json({ message: "Invalid action" });
    }
  } catch (err) {
    console.error("Error updating user status:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all companies - updated to use token verification
app.get("/api/admin/companies", verifyToken, async (req, res) => {
  console.log("API endpoint for companies hit");
  // Check if user is authenticated and is an admin
  if (req.user.roleid !== 7) {
    console.log("Access denied - user is not admin");
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    // Query for all companies
    const result = await client.query(`
      SELECT c.companyid as id, c.name, c.status, c.created_at,
      (SELECT COUNT(*) FROM usertable u WHERE u.company = c.name) as user_count
      FROM companies c
      ORDER BY c.name ASC
    `);
    
    console.log(`Found ${result.rows.length} companies`);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching companies:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update company status - updated to use token verification
app.post("/api/admin/company-status", verifyToken, async (req, res) => {
  console.log("API endpoint for company status update hit");
  // Check if user is authenticated and is an admin
  if (req.user.roleid !== 7) {
    console.log("Access denied - user is not admin");
    return res.status(403).json({ message: "Access denied" });
  }

  const { companyId, status } = req.body;
  console.log(`Updating company ${companyId} status to ${status}`);

  try {
    // Update company status
    await client.query(
      "UPDATE companies SET status = $1, updated_at = NOW() WHERE companyid = $2",
      [status, companyId]
    );

    // If disabling a company, also update all users from that company
    if (status === "disabled") {
      await client.query(
        `
        UPDATE usertable 
        SET status = 'disabled' 
        WHERE company = (SELECT name FROM companies WHERE companyid = $1)
      `,
        [companyId]
      );
    }
    
    console.log(`Company ${companyId} ${status === "active" ? "enabled" : "disabled"} successfully`);
    res.json({ message: `Company ${status === "active" ? "enabled" : "disabled"} successfully` });
  } catch (err) {
    console.error("Error updating company status:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Start the server
app.listen(PORT, async () => {
  await connectDb();
  console.log(`🚀 Server running on port ${PORT}`);
});