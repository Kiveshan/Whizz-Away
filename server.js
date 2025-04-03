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
app.use(cors({ credentials: true, origin: "http://localhost:3000" })); // Allow CORS for your frontend
app.use(express.json());
app.use(expressSession({
  secret: secretKey,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === "production", // Set to true if using HTTPS
    httpOnly: true, 
    maxAge: 3600000 // Session expiration (1 hour)
  },
}));

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
  done(null, { userid: user.userid, name: user.name, surname: user.surname, table: user.table });
});

passport.deserializeUser(async (sessionUser, done) => {
  try {
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
    done(err);
  }
});

// Login route to authenticate and set the session
app.post("/login", async (req, res, next) => {
  passport.authenticate("local", async (err, user, info) => {
    if (err) {
      return res.status(500).json({ message: "Internal server error" });
    }
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    
    // Check if user has a roleid
    if (!user.roleid) {
      return res.status(403).json({ message: "Access denied. No role assigned." });
    }

    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ message: "Internal server error" });
      }

      req.session.user = user; // Store user session manually
      console.log("User stored in session:", req.session.user);

      const token = jwt.sign({ userid: user.userid, roleid: user.roleid }, secretKey, { expiresIn: '1h' });
      const { roleid } = user;
      let redirectUrl = "/";

      if (roleid === 1) redirectUrl = "/Dashboard";
      else if (roleid === 2) redirectUrl = "/ControllerDashboard";
      else if (roleid === 3) redirectUrl = "/FDashboard";
      else if (roleid === 4) redirectUrl = "/DirectorDashboard";

      return res.json({ message: "Login successful", redirectUrl, token });
    });
  })(req, res, next);
});


// User info route for session verification
app.get("/user-info", (req, res) => {
  console.log("Current user session:", req.session.user);
  if (!req.session.user) {
    return res.status(401).json({ error: "Please log in first" });
  }
  res.json({ name: req.session.user.name, surname: req.session.user.surname });
});

// Start the server
app.listen(PORT, async () => {
  await connectDb();
  console.log(`🚀 Server running on port ${PORT}`);
});
