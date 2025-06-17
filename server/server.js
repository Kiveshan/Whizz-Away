import express from "express";
import cors from "cors";
import expressSession from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import {
  findUserByEmail,
  comparePassword,
  findUserById,
} from "./models/userModel.js";
import { requestLogger, sessionDebugger } from "./middleware/sessionDebug.js";
import { secretKey } from "./config/secrets.js";
import routes from "./routes/index.js";
import "./utils/statementGenerator.js"; // Added to start cron job
import fs from "fs";
import multer from "multer";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Enhanced CORS configuration
app.use(
  cors({
    credentials: true,
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cache-Control"],
    exposedHeaders: ["Authorization"],
  })
);

// Middleware

app.use(requestLogger);
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  expressSession({
    secret: secretKey,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 3600000,
      sameSite: "lax",
    },
  })
);
app.use(sessionDebugger);
app.use(passport.initialize());
app.use(passport.session());

// Set up uploads directory and static serving
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

// Set up multer for file uploads (though we'll override this in S3 routes)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});

// Passport Local Strategy for Authentication
passport.use(
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        const user = await findUserByEmail(email);
        if (!user) {
          console.log("No user found in both tables with email:", email);
          return done(null, false, { message: "Invalid email or password" });
        }
        console.log("Fetched user:", user);
        const passwordMatch = await comparePassword(password, user.password);
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
  )
);

passport.serializeUser((user, done) => {
  console.log("Serializing user:", user);
  done(null, {
    userid: user.userid,
    name: user.name,
    surname: user.surname,
    roleid: user.roleid,
    table: user.table,
    email: user.email,
  });
});

passport.deserializeUser(async (sessionUser, done) => {
  try {
    console.log("Deserializing user:", sessionUser);
    const { userid, table } = sessionUser;
    const user = await findUserById(userid, table);
    if (!user) {
      console.log("User session not found in database");
      return done(null, false);
    }
    console.log("Session user fetched:", user);
    done(null, user);
  } catch (err) {
    console.error("Error deserializing user:", err);
    done(err);
  }
});

// Routes
app.use("/", routes);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
