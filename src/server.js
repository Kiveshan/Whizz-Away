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
  secret: secretKey,  // Use the generated secret key
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

// Database client setup (connecting only when needed)
const client = new pg.Client({
  user: process.env.RDS_USERNAME || "postgres",
  host: process.env.RDS_HOSTNAME || "localhost",
  database: process.env.RDS_DB_NAME || "Whizz22March",
  password: process.env.RDS_PASSWORD || "123456",
  port: process.env.RDS_PORT || 5433,
  ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : false
});

// Function to connect to the database
async function connectDb() {
  await client.connect();
  console.log("✅ Database Connected Successfully");
}

// Passport Local Strategy for Authentication
passport.use(new LocalStrategy(
    { usernameField: "email" }, // Tell Passport to use "email" instead of "username"
    async (email, password, done) => {
      try {
        const result = await client.query("SELECT * FROM usertable WHERE email = $1", [email]);
  
        if (result.rows.length === 0) {
          console.log("No user found with email:", email);
          return done(null, false, { message: "Invalid email or password" });
        }
  
        const user = result.rows[0];
        console.log("Fetched user:", user);
  
        const passwordMatch = await bcrypt.compare(password, user.password);
  
        if (!passwordMatch) {
          console.log("Password mismatch for user:", email);
          return done(null, false, { message: "Invalid email or password" });
        }
  
        return done(null, user);
      } catch (err) {
        console.error("Error during authentication:", err);
        return done(err);
      }
    }
  ));
  

// Serialize and deserialize user to store user ID in session
passport.serializeUser((user, done) => {
  done(null, user.userid);
});

passport.deserializeUser(async (userid, done) => {
  try {
    const result = await client.query("SELECT * FROM usertable WHERE userid = $1", [userid]);
    done(null, result.rows[0]);
  } catch (err) {
    done(err);
  }
});

// Register User
app.post("/register", async (req, res) => {
  const { name, surname, email, password, companyname, roleid } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await client.query(
      "INSERT INTO usertable (name, surname, email, password, companyname, dateofreg, roleid, status) VALUES ($1, $2, $3, $4, $5, NOW(), $6, 'active') RETURNING *",
      [name, surname, email, hashedPassword, companyname, roleid]
    );

    res.json({ message: "User registered successfully", user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/login", async (req, res, next) => {
    passport.authenticate("local", async (err, user, info) => {
      if (err) {
        return res.status(500).json({ message: "Internal server error" });
      }
  
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
  
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Internal server error" });
        }
  
        // Generate JWT token
        const token = jwt.sign({ userid: user.userid, roleid: user.roleid }, secretKey, { expiresIn: '1h' });
  
        const { roleid } = user;
        let redirectUrl = "/dashboard";
        if (roleid === 1) {
          redirectUrl = "/Dashboard";
        } else if (roleid === 2) {
          redirectUrl = "/Controller_Dashboard";
        } else if (roleid === 3) {
          redirectUrl = "/FDashboard";
        } else if (roleid === 4) {
            redirectUrl = "/Dashboard";
          }
        
  
        return res.json({ message: "Login successful", redirectUrl, token });
      });
    })(req, res, next);
  });

// Logout User and Destroy Session
app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).send("Error logging out.");
    }
    res.redirect("/login");
  });
});

// Example of a Protected Route: Fetch User Info (Requires Session Authentication)
app.get("/user-info", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Please log in first" });
  }

  res.json({ user: req.user });
});

// Start the server
app.listen(PORT, async () => {
  await connectDb();  // Ensure the database is connected before starting the server
  console.log(`🚀 Server running on port ${PORT}`);
});
