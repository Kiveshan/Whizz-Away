import express from "express"
import cors from "cors"
import pkg from "pg"
const { Pool, types } = pkg
import bcrypt from "bcrypt"
import expressSession from "express-session"
import passport from "passport"
import { Strategy as LocalStrategy } from "passport-local"
import crypto from "crypto"
import jwt from "jsonwebtoken"
import path from "path"
import { fileURLToPath } from "url"
import puppeteer from "puppeteer"
import cron from 'node-cron';



const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 5000

// Generate a secure, random secret key
const secretKey = crypto.randomBytes(64).toString("hex")
console.log("Generated secret key:", secretKey)

// Middleware setup
app.use(
  cors({
    credentials: true,
    origin: ["http://localhost:3000", "http://localhost:5000", "http://127.0.0.1:3000", "http://127.0.0.1:5000"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(
  expressSession({
    secret: secretKey,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 3600000,
    },
  }),
)

app.use(passport.initialize())
app.use(passport.session())

// Database client setup - single configuration for Whizz-Away database
const dbConfig = {
  user: process.env.PGUSER || "postgres",
  host: process.env.PGHOST || "localhost",
  database: process.env.PGDATABASE || "Whizz-Away-V2",
  password: process.env.PGPASSWORD || "123456",
  port: process.env.PGPORT || 5432,
  ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : false,
}

let pool = null


// Function to connect to the database
async function connectDb() {
  try {
    console.log("Connecting to database with configuration:", {
      host: dbConfig.host,
      database: dbConfig.database,
      port: dbConfig.port,
      user: dbConfig.user,
    })

    pool = new Pool(dbConfig)

    // Test the connection
    const client = await pool.connect()
    const result = await client.query("SELECT NOW()")
    client.release()

    console.log(`✅ Database Connected Successfully to ${dbConfig.database}`)
    console.log(`Database server time:`, result.rows[0].now)

    return
  } catch (err) {
    console.error(`Failed to connect to database:`, err.message)
    console.error("Please check your database configuration and ensure PostgreSQL is running")

    // Don't exit the process, allow the server to start anyway
    // This way API endpoints that don't require DB can still work
    console.log("Starting server without database connection...")
  }
}

// Helper function to execute database queries
async function query(text, params) {
  if (!pool) {
    throw new Error("Database connection not established")
  }

  try {
    const start = Date.now()
    const res = await pool.query(text, params)
    const duration = Date.now() - start
    console.log("Executed query", { text, duration, rows: res.rowCount })
    return res
  } catch (error) {
    console.error("Error executing query", { text, error })
    throw error
  }
}

// Passport Local Strategy for Authentication
passport.use(
  new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
    try {
      if (!pool) {
        return done(new Error("Database connection not established"), false)
      }

      let result = await pool.query("SELECT * FROM usertable WHERE email = $1", [email])

      if (result.rows.length === 0) {
        result = await pool.query("SELECT * FROM m5_employee WHERE email = $1", [email])
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
  done(null, { userid: user.userid, name: user.name, surname: user.surname, table: user.table })
})

passport.deserializeUser(async (sessionUser, done) => {
  try {
    if (!pool) {
      return done(new Error("Database connection not established"), false)
    }

    const { userid, table } = sessionUser
    let result

    if (table === "usertable") {
      result = await pool.query("SELECT * FROM usertable WHERE userid = $1", [userid])
    } else if (table === "m5_employee") {
      result = await pool.query("SELECT * FROM m5_employee WHERE userid = $1", [userid])
    }

    if (!result || result.rows.length === 0) {
      console.log("User session not found in database")
      return done(null, false)
    }

    console.log("Session user fetched:", result.rows[0])
    done(null, result.rows[0])
  } catch (err) {
    done(err)
  }
})

// ===== API ROUTES =====

// Health check route
app.get("/api/health", (req, res) => {
  const dbStatus = pool ? "connected" : "disconnected"
  res.json({
    status: "OK",
    message: "Whizz-Away API is running",
    database: dbStatus,
    databaseName: dbConfig.database,
  })
})

// Login route to authenticate and set the session
app.post("/login", async (req, res, next) => {
  if (!pool) {
    return res.status(503).json({
      message: "Database connection not established. Please try again later.",
    })
  }

  passport.authenticate("local", async (err, user, info) => {
    if (err) {
      return res.status(500).json({ message: "Internal server error" })
    }
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    // Check if user has a roleid
    if (!user.roleid) {
      return res.status(403).json({ message: "Access denied. No role assigned." })
    }

    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ message: "Internal server error" })
      }

      req.session.user = user // Store user session manually
      console.log("User stored in session:", req.session.user)

      const token = jwt.sign({ userid: user.userid, roleid: user.roleid }, secretKey, { expiresIn: "1h" })
      const { roleid } = user
      let redirectUrl = "/"

      if (roleid === 1) redirectUrl = "/Dashboard"
      else if (roleid === 2) redirectUrl = "/ControllerDashboard"
      else if (roleid === 3) redirectUrl = "/FDashboard"
      else if (roleid === 4) redirectUrl = "/DirectorDashboard"

      return res.json({ message: "Login successful", redirectUrl, token })
    })
  })(req, res, next)
})

// User info route for session verification
app.get("/user-info", (req, res) => {
  console.log("Current user session:", req.session.user)
  if (!req.session.user) {
    return res.status(401).json({ error: "Please log in first" })
  }
  res.json({ name: req.session.user.name, surname: req.session.user.surname })
})

// === INVOICES ROUTES ===

// GET all completed instructions for invoices
app.get("/api/invoices/completed", async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({
        success: false,
        message: "Database connection not established. Please try again later.",
      })
    }

    console.log("Received request for completed invoices with query:", req.query)

    // Filter by year, month, type, and clientId if provided
    const { year, month, type, clientId } = req.query

    // Updated query to join with invoice table and get invoice data
    let queryText = `
   SELECT 
    m1.m1key, 
    m1.task as instruction_no, 
    s.shipmenttype as shipment_type, 
    m1.fileref as file_no, 
    m1.status,
    i.ikey,
    i.date as date
  FROM 
    public.m1_controller m1
  LEFT JOIN 
    public.shipment s ON m1.shipment_type = s.shipkey
  LEFT JOIN
    public.invoice i ON m1.m1key = i.m1key

`

    const queryParams = []
    let paramIndex = 1

    // Add client filter if provided
    if (clientId) {
      queryText += ` WHERE m1.client = $${paramIndex}`
      queryParams.push(clientId)
      paramIndex++
    }

    // Add type filter if provided and not "All"
    if (type && type !== "All") {
      queryText += ` AND s.shipmenttype = $${paramIndex}`
      queryParams.push(type)
      paramIndex++
    }

    // Handle date filtering - now with separate conditions for year and month
    if (year && month) {
      // Both year and month provided
      queryText += ` AND EXTRACT(YEAR FROM m1.pickupdate) = $${paramIndex} 
                    AND EXTRACT(MONTH FROM m1.pickupdate) = $${paramIndex + 1}`
      queryParams.push(year, month)
      paramIndex += 2
    } else if (year) {
      // Only year provided
      queryText += ` AND EXTRACT(YEAR FROM m1.pickupdate) = $${paramIndex}`
      queryParams.push(year)
      paramIndex++
    } else if (month) {
      // Only month provided
      queryText += ` AND EXTRACT(MONTH FROM m1.pickupdate) = $${paramIndex}`
      queryParams.push(month)
      paramIndex++
    }

    queryText += ` ORDER BY m1.pickupdate DESC`

    console.log("Executing query:", queryText, "with params:", queryParams)

    const result = await query(queryText, queryParams)
    console.log(`Query returned ${result.rows.length} rows`)

    res.json({
      success: true,
      data: result.rows,
    })
  } catch (error) {
    console.error("Error fetching completed instructions:", error)
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    })
  }
})

// GET specific instruction details for invoice
app.get("/api/invoices/:id", async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({
        success: false,
        message: "Database connection not established. Please try again later.",
      })
    }

    console.log("Received request for invoice details with ID:", req.params.id)

    const { id } = req.params
    console.log(id)

    // Updated query to include invoice data
    const queryText = `
            SELECT 
        m1.m1key,
        m1.task as instruction_no,
        s.shipmenttype as shipment_type,
        m1.fileref as file_no,
        c.companyname as client_name,
        c.companyaddress as client_address,
        c.cellnum as client_telephone,
        c.email as client_email,
        c.vatregno as client_vat,
        c.suburb as client_suburb,
        m1.pickup,
        m1.dropoff,
        m1.pickupdate,
        m1.description,
        m1.total_cost,  
        m1.rate,
        m1.vat,
        m1.rateweight,
        m1.booking_ref,
        m1.vessel_name,
	      i.invoice_num,
	      i.doc_num,
        i.date,
		    ut.cluster_box,
		    ut.vat_reg_num,
		    ut.address,
		    ut.suburb,
        ut.branch_code,
        ut.bank,
        ut.name_of_acc,
        ut.account_num,
        COALESCE(ut.cell_num, ut.cell_num2) AS phonenumber,
        COALESCE(m1.num_six_meters, 0) + COALESCE(m1.num_twelve_meters, 0) + COALESCE(m1.num_abnormal, 0) as num_containers
      FROM 
        invoice i
		  INNER JOIN
	public.m1_controller m1 ON i.m1key = m1.m1key
      LEFT JOIN 
        public.shipment s ON m1.shipment_type = s.shipkey
      LEFT JOIN 
        public.m5_client c ON i.clientid = c.m5clientkey
      INNER JOIN
		  usertable ut ON i.companyid = ut.userid
      WHERE 
        i.ikey = $1
    `

    const result = await query(queryText, [id])

    console.log(`Query returned ${result.rows.length} rows for invoice ID ${id}`)

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Instruction not found",
      })
    }

  

    // Get container details if available
    const containerQuery = `
     SELECT 
        containernum as container_number, 
        weight
      FROM 
        public.container c
		 INNER JOIN
		 invoice i ON i.m1key = c.m1key
		 WHERE
        i.ikey = $1
    `

    const containerResult = await query(containerQuery, [id])
    console.log(`Container query returned ${containerResult.rows.length} rows for invoice ID ${id}`)

    // If no containers in database, create dummy data based on num_containers
    let containers = containerResult.rows
    if (containers.length === 0 && result.rows[0].num_containers > 0) {
      console.log(`Creating ${result.rows[0].num_containers} dummy containers for invoice ID ${id}`)
      containers = Array.from({ length: result.rows[0].num_containers }, (_, i) => ({
        container_number: `CONT${String(i + 1).padStart(6, "0")}`,
        weight: `${Math.floor(Math.random() * 5000) + 10000} kg`,
      }))
    }

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        containers,
      },
    })
  } catch (error) {
    console.error("Error fetching instruction for invoice:", error)
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    })
  }
})


// GET clients (simplified - no invoice counts)
app.get("/api/clients", async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({
        success: false,
        message: "Database connection not established. Please try again later.",
      })
    }

    console.log("Received request for clients list")

    // Simplified query without invoice counting
    const queryText = `
      SELECT 
        c.m5clientkey,
        c.companyname,
        c.representative,
        c.email
      FROM 
        public.m5_client c
      ORDER BY 
        c.companyname
    `

    const result = await query(queryText, [])
    console.log(`Query returned ${result.rows.length} clients`)

    res.json({
      success: true,
      data: result.rows,
    })
  } catch (error) {
    console.error("Error fetching clients:", error)
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    })
  }
})

// Generate PDF with Puppeteer
app.post("/api/generate-pdf", async (req, res) => {
  try {
    console.log("Received request to generate PDF")

    const { invoiceHtml, filename } = req.body

    if (!invoiceHtml) {
      return res.status(400).json({
        success: false,
        message: "Invoice HTML content is required",
      })
    }

    // Launch a headless browser
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    })

    // Create a new page
    const page = await browser.newPage()

    // Set the content of the page to the invoice HTML
    await page.setContent(invoiceHtml, {
      waitUntil: "networkidle0",
    })

    // Add custom styles for better PDF rendering
    await page.addStyleTag({
      content: `
        @page {
          margin: 15mm;
          size: A4;
        }
        body {
          font-family: Arial, sans-serif;
          color: #000;
          margin: 0;
          padding: 0;
        }
        table { page-break-inside: auto; }
        tr { page-break-inside: avoid; page-break-after: auto; }
        thead { display: table-header-group; }
        tfoot { display: table-footer-group; }
      `,
    })

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "15mm",
        right: "15mm",
        bottom: "15mm",
        left: "15mm",
      },
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: `
        <div style="width: 100%; font-size: 10px; text-align: right; padding-right: 15mm; color: #444;">
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `,
      footerHeight: 30,
    })

    // Close the browser
    await browser.close()

    // Set response headers
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `attachment; filename="${filename || "invoice.pdf"}"}`)

    // Send the PDF buffer
    res.send(pdfBuffer)
  } catch (error) {
    console.error("Error generating PDF:", error)
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    })
  }
})


// Add this function to your server.js file

/**
 * Generates statements for invoice groups that don't have statements yet
 */

// Function to generate statements for all clients
async function generateMonthlyStatements() {
  console.log('Starting monthly statement generation process...');
  
  const today = new Date(); // 2025-04-11
  const currentMonth = today.getMonth(); // 3 (April)
  const currentYear = today.getFullYear(); // 2025
  
  const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1; // 2 (March)
  const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear; // 2025
  
  const startDate = new Date(previousYear, previousMonth, 1, 12, 0, 0); // Set to noon
  const endDate = new Date(previousYear, previousMonth + 1, 0, 12, 0, 0); // Set to noon
  
  const formattedStartDate = startDate.toISOString().split('T')[0]; // '2025-03-01'
  const formattedEndDate = endDate.toISOString().split('T')[0]; // '2025-03-31'
  
  console.log(`Today: ${today.toISOString().split('T')[0]}`);
  console.log(`Current Month: ${currentMonth}, Current Year: ${currentYear}`);
  console.log(`Previous Month: ${previousMonth}, Previous Year: ${previousYear}`);
  console.log(`Generating statements for invoices confirmed between ${formattedStartDate} and ${formattedEndDate}`);

  let dbClient;
  try {
    dbClient = await pool.connect();
    await dbClient.query('BEGIN');

    const clientsResult = await query('SELECT m5clientkey FROM m5_client', []);
    const clients = clientsResult.rows;

    for (const client of clients) {
      const clientId = client.m5clientkey;

      const invoicesQuery = `
        SELECT 
          SUM(m1.total_cost) as total_amount,
          i.groupid as invoice_group_id
        FROM invoice i
        JOIN m1_controller m1 ON i.m1key = m1.m1key
        WHERE i.clientid = $1 AND i.date BETWEEN $2 AND $3
        GROUP BY i.groupid
      `;
      const invoicesResult = await dbClient.query(invoicesQuery, [clientId, formattedStartDate, formattedEndDate]);
      const invoices = invoicesResult.rows;

      if (invoices.length === 0) {
        console.log(`Client ${clientId}: No confirmed invoices found between ${formattedStartDate} and ${formattedEndDate}, skipping`);
        continue;
      }

      for (const invoice of invoices) {
        const totalAmount = invoice.total_amount;
        const invoice_group_id = invoice.invoice_group_id;

        const existingStatement = await dbClient.query(
          'SELECT statement_key FROM statements WHERE groupid = $1 AND clientid = $2',
          [invoice_group_id, clientId]
        );

        if (existingStatement.rows.length > 0) {
          console.log(`Client ${clientId}: Statement #${existingStatement.rows[0].statement_key} already exists for group ${invoice_group_id}, skipping`);
          continue;
        }

        const agingQuery = `
          SELECT aging_key, current, "30days", "60days", "90days"
          FROM aging_analysis
          WHERE clientid = $1
          ORDER BY aging_key DESC
          LIMIT 1
        `;
        const agingResult = await dbClient.query(agingQuery, [clientId]);
        let newCurrent, new30days, new60days, new90days;

        if (agingResult.rows.length > 0) {
          const previousAging = agingResult.rows[0];
          newCurrent = Math.max(parseFloat(totalAmount) || 0, 0);
          new30days = Math.max(parseFloat(previousAging.current) || 0, 0);
          new60days = Math.max(parseFloat(previousAging["30days"]) || 0, 0);
          new90days = Math.max(
            (parseFloat(previousAging["60days"]) || 0) + (parseFloat(previousAging["90days"]) || 0),
            0
          );
        } else {
          newCurrent = Math.max(parseFloat(totalAmount) || 0, 0);
          new30days = 0;
          new60days = 0;
          new90days = 0;
        }

        const insertAgingQuery = `
          INSERT INTO aging_analysis (clientid, current, "30days", "60days", "90days")
          VALUES ($1, $2, $3, $4, $5)
          RETURNING aging_key
        `;
        const agingValues = [clientId, newCurrent, new30days, new60days, new90days];
        const agingInsertResult = await dbClient.query(insertAgingQuery, agingValues);
        const newAgingId = agingInsertResult.rows[0].aging_key;

        const insertStatementQuery = `
          INSERT INTO statements (groupid, generation_date, clientid, agingid)
          VALUES ($1, CURRENT_DATE, $2, $3)
          RETURNING statement_key
        `;
        const statementResult = await dbClient.query(insertStatementQuery, [invoice_group_id, clientId, newAgingId]);
        const newStatementId = statementResult.rows[0].statement_key;

        console.log(`Generated statement #${newStatementId} for group ${invoice_group_id}`);
      }

      await dbClient.query('COMMIT');
    }
  } catch (error) {
    console.error('Error in statement generation:', error);
    if (dbClient) {
      await dbClient.query('ROLLBACK');
    }
  } finally {
    if (dbClient) {
      dbClient.release();
    }
    console.log('Monthly statement generation process completed.');
  }
}
// GET statements for a specific client
app.get("/api/statements/:clientId", async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({
        success: false,
        message: "Database connection not established. Please try again later.",
      });
    }

    const { clientId } = req.params;
    const { year, month } = req.query;

    console.log(`Fetching statements for client ${clientId} with query:`, req.query);

    let queryText = `
      SELECT 
        statement_key,
        generation_date
      FROM 
        statements
      WHERE 
        clientid = $1
    `;
    const queryParams = [clientId];
    let paramIndex = 2;

    if (year) {
      queryText += ` AND EXTRACT(YEAR FROM generation_date) = $${paramIndex}`;
      queryParams.push(year);
      paramIndex++;
    }
    if (month) {
      queryText += ` AND EXTRACT(MONTH FROM generation_date) = $${paramIndex}`;
      queryParams.push(month);
      paramIndex++;
    }

    queryText += ` ORDER BY generation_date DESC`;

    const result = await query(queryText, queryParams);
    console.log(`Query returned ${result.rows.length} statements for client ${clientId}`);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error(`Error fetching statements for client ${clientId}:`, error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
});


app.get("/api/statement/:statementId", async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({
        success: false,
        message: "Database connection not established. Please try again later.",
      });
    }

    const { statementId } = req.params;
    console.log(`Fetching statement details for statement ${statementId}`);

    const queryText = `
      SELECT 
        s.statement_key,
        s.groupid,
        s.generation_date,
        s.clientid,
        c.companyname AS client_name,
        c.representative AS client_representative,
        c.email AS client_email,
        c.cellnum AS client_phone,
        c.companyaddress AS client_address,
        a.current,
        a."30days",
        a."60days",
        a."90days",
        i.ikey,
        i.date AS invoice_date,
        m1.total_cost AS invoice_amount,
        m1.task AS invoice_task,
        i.invoice_num
      FROM 
        statements s
      JOIN 
        m5_client c ON s.clientid = c.m5clientkey
      JOIN 
        aging_analysis a ON s.agingid = a.aging_key
      LEFT JOIN 
        invoice i ON i.groupid = s.groupid
      LEFT JOIN 
        m1_controller m1 ON i.m1key = m1.m1key
      WHERE 
        s.statement_key = $1
    `;
    const result = await query(queryText, [statementId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Statement not found",
      });
    }

    // Group data for frontend
    const statementData = {
      statement_key: result.rows[0].statement_key,
      groupid: result.rows[0].groupid,
      generation_date: result.rows[0].generation_date,
      client: {
        name: result.rows[0].client_name,
        representative: result.rows[0].client_representative,
        email: result.rows[0].client_email,
        phone: result.rows[0].client_phone,
        address: result.rows[0].client_address,
      },
      aging: {
        current: parseFloat(result.rows[0].current || 0),
        "30days": parseFloat(result.rows[0]["30days"] || 0),
        "60days": parseFloat(result.rows[0]["60days"] || 0),
        "90days": parseFloat(result.rows[0]["90days"] || 0),
      },
      invoices: result.rows
        .filter(row => row.ikey !== null) // Filter out rows with no invoice
        .map(row => ({
          ikey: row.ikey,
          date: row.invoice_date,
          amount: parseFloat(row.invoice_amount || 0),
          task: row.invoice_task,
          invoice_num: row.invoice_num,
        })),
    };

    console.log(`Fetched statement ${statementId} with ${statementData.invoices.length} invoices`);
    res.json({
      success: true,
      data: statementData,
    });
  } catch (error) {
    console.error(`Error fetching statement ${statementId}:`, error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
});
// Schedule the statement generation to run on the 2nd day of each month at 1:00 AM
cron.schedule('0 1 1 * *', async () => {
  console.log('Running scheduled statement generation task');
  await generateMonthlyStatements();
});

import fs from "fs" // Add for local debugging




app.get("/api/statement/:statementId/pdf", async (req, res) => {
  let browser;
  try {
    if (!pool) {
      return res.status(503).json({ success: false, message: "Database connection not established." });
    }

    const { statementId } = req.params;
    console.log(`Generating PDF for statement ${statementId}`);

    // Cache check
    const cacheDir = './pdf_cache';
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);
    const cachePath = `${cacheDir}/statement_${statementId}.pdf`;
    if (fs.existsSync(cachePath)) {
      console.log(`Serving cached PDF for statement ${statementId}`);
      const pdfBuffer = fs.readFileSync(cachePath);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="statement_${statementId}.pdf"`,
        'Content-Length': pdfBuffer.length,
      });
      return res.status(200).end(pdfBuffer, 'binary');
    }

    // Fetch statement data
    const queryText = `
      SELECT 
        s.statement_key,
        s.groupid,
        s.generation_date,
        s.clientid,
        c.companyname AS client_name,
        c.representative AS client_representative,
        c.email AS client_email,
        c.cellnum AS client_phone,
        c.companyaddress AS client_address,
        a.current,
        a."30days",
        a."60days",
        a."90days",
        i.ikey,
        i.date AS invoice_date,
        m1.total_cost AS invoice_amount,
        m1.task AS invoice_task,
        i.invoice_num
      FROM 
        statements s
      JOIN 
        m5_client c ON s.clientid = c.m5clientkey
      JOIN 
        aging_analysis a ON s.agingid = a.aging_key
      LEFT JOIN 
        invoice i ON i.groupid = s.groupid
      LEFT JOIN 
        m1_controller m1 ON i.m1key = m1.m1key
      WHERE 
        s.statement_key = $1
    `;
    const result = await query(queryText, [statementId]);
    console.log(`Query returned ${result.rows.length} rows`);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Statement not found" });
    }

    // Structure data
    const statementData = {
      statement_key: result.rows[0].statement_key,
      groupid: result.rows[0].groupid,
      generation_date: result.rows[0].generation_date,
      client: {
        name: result.rows[0].client_name,
        representative: result.rows[0].client_representative,
        email: result.rows[0].client_email,
        phone: result.rows[0].client_phone,
        address: result.rows[0].client_address,
      },
      aging: {
        current: parseFloat(result.rows[0].current || 0),
        "30days": parseFloat(result.rows[0]["30days"] || 0),
        "60days": parseFloat(result.rows[0]["60days"] || 0),
        "90days": parseFloat(result.rows[0]["90days"] || 0),
      },
      invoices: result.rows
        .filter(row => row.ikey !== null)
        .map(row => ({
          ikey: row.ikey,
          date: row.invoice_date,
          amount: parseFloat(row.invoice_amount || 0),
          task: row.invoice_task,
          invoice_num: row.invoice_num,
        })),
    };

    const invoicedAmount = statementData.invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const openingBalance = 0;
    const amountPaid = 0;
    const balanceDue = invoicedAmount;

    // HTML with Age Analysis heading
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
          .statement-paper { width: 190mm; margin: 10mm auto; }
          .statement-header1 h1 { font-size: 24px; text-align: center; }
          .statement-info-section { display: flex; justify-content: space-between; margin-bottom: 10mm; }
          .client-info div { margin-bottom: 5px; }
          .to-label { font-weight: bold; }
          .statement-title h2 { font-size: 20px; }
          .statement-date { margin: 5px 0; }
          .summary-table { width: 100%; border-collapse: collapse; }
          .summary-table td { padding: 5px; }
          .summary-label { font-weight: bold; }
          .summary-value { text-align: right; }
          .statement-divider { border-top: 1px solid #ccc; margin: 10mm 0; }
          .transactions-table { width: 100%; border-collapse: collapse; }
          .transactions-table th, .transactions-table td { border: 1px solid #ccc; padding: 5px; }
          .transactions-table th { background: #f5f5f5; }
          .balance-due-summary { display: flex; justify-content: space-between; margin: 10mm 0; font-weight: bold; }
          .age-analysis-section { margin-top: 10mm; }
          .age-analysis-header { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
          .age-analysis-table { width: 100%; border-collapse: collapse; }
          .age-analysis-table th, .age-analysis-table td { border: 1px solid #ccc; padding: 5px; }
          .age-analysis-table th { background: #f5f5f5; }
          @page { size: A4; margin: 10mm; }
        </style>
      </head>
      <body>
        <div class="statement-paper">
          <div class="statement-header1">
            <h1>Transport and Logistics</h1>
          </div>
          <div class="statement-info-section">
            <div class="client-info">
              <div class="to-label">To</div>
              <div class="client-name">${statementData.client.representative}</div>
              <div class="client-email">${statementData.client.email}</div>
              <div class="client-phone">${statementData.client.phone}</div>
              <div class="client-address">${statementData.client.address}</div>
            </div>
            <div class="statement-title">
              <h2>Statement of Accounts</h2>
              <div class="statement-date">${new Date(statementData.generation_date).toLocaleDateString()}</div>
              <h3>Account Summary</h3>
              <table class="summary-table">
                <tbody>
                  <tr><td class="summary-label">Opening Balance</td><td class="summary-value">R${openingBalance.toFixed(2)}</td></tr>
                  <tr><td class="summary-label">Invoiced Amount</td><td class="summary-value">R${invoicedAmount.toFixed(2)}</td></tr>
                  <tr><td class="summary-label">Amount Paid</td><td class="summary-value">R${amountPaid.toFixed(2)}</td></tr>
                  <tr><td class="summary-label">Balance Due:</td><td class="summary-value">R${balanceDue.toFixed(2)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="statement-divider"></div>
          <div class="transactions-section">
            <table class="transactions-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Transactions</th>
                  <th>Details</th>
                  <th>Amount</th>
                  <th>Payments</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${new Date(statementData.generation_date).toLocaleDateString()}</td>
                  <td>Opening Balance</td>
                  <td></td>
                  <td>R0</td>
                  <td></td>
                  <td>R0</td>
                </tr>
                ${statementData.invoices.map(invoice => `
                  <tr>
                    <td>${new Date(invoice.date).toLocaleDateString()}</td>
                    <td>Invoice</td>
                    <td>${invoice.task || invoice.invoice_num || `Invoice #${invoice.ikey}`}</td>
                    <td>R${invoice.amount.toFixed(2)}</td>
                    <td></td>
                    <td>R${statementData.invoices
                      .slice(0, statementData.invoices.indexOf(invoice) + 1)
                      .reduce((sum, inv) => sum + inv.amount, 0).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div class="balance-due-summary">
            <div class="balance-due-label">Balance Due</div>
            <div class="balance-due-amount">R${balanceDue.toFixed(2)}</div>
          </div>
          <div class="age-analysis-section">
            <div class="age-analysis-header">Age Analysis</div>
            <div class="age-analysis-content">
              <table class="age-analysis-table">
                <thead>
                  <tr>
                    <th>Current</th>
                    <th>30 Days</th>
                    <th>60 Days</th>
                    <th>90 Days</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>R${statementData.aging.current.toFixed(2)}</td>
                    <td>R${statementData.aging["30days"].toFixed(2)}</td>
                    <td>R${statementData.aging["60days"].toFixed(2)}</td>
                    <td>R${statementData.aging["90days"].toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Launch Puppeteer
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"],
    });
    const page = await browser.newPage();

    await page.setContent(htmlContent, { waitUntil: "domcontentloaded" });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
    });

    // Cache PDF
    fs.writeFileSync(cachePath, pdfBuffer);
    console.log(`Cached PDF to ${cachePath}`);

    // Debug
    const debugPath = `./debug_statement_${statementId}.pdf`;
    fs.writeFileSync(debugPath, pdfBuffer);
    console.log(`Saved debug PDF to ${debugPath}`);
    console.log(`PDF buffer size: ${pdfBuffer.length} bytes`);

    // Send response
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="statement_${statementId}.pdf"`,
      'Content-Length': pdfBuffer.length,
      'Cache-Control': 'no-cache',
    });
    res.status(200).end(pdfBuffer, 'binary');
  } catch (error) {
    console.error(`Error generating PDF for statement ${statementId}:`, error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (browser) {
      await browser.close().catch(err => console.error("Error closing browser:", err));
    }
  }
});




// GET all instructions for a specific client
app.get("/api/client-instructions/:clientId", async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({
        success: false,
        message: "Database connection not established. Please try again later.",
      })
    }

    const { clientId } = req.params
    const { year, month, type } = req.query

    console.log(`Fetching instructions for client ${clientId} with filters:`, req.query)

    // Build the query with proper joins to get instruction data with invoice information
    let queryText = `
      SELECT 
        m1.m1key, 
        m1.task as instruction_no, 
        s.shipmenttype as shipment_type, 
        m1.fileref as file_no, 
        m1.status,
        m1.pickupdate,
        m1.total_cost,
        i.ikey,
        i.invoice_num,
        i.date as invoice_date,
        i.groupid as invoice_group_id,
        (SELECT statement_key FROM statements WHERE groupid = i.groupid LIMIT 1) as statement_id
      FROM 
        public.m1_controller m1
      LEFT JOIN 
        public.shipment s ON m1.shipment_type = s.shipkey
      LEFT JOIN
        public.invoice i ON m1.m1key = i.m1key
      WHERE 
        m1.client = $1
        AND m1.status = 'Completed'
    `

    const queryParams = [clientId]
    let paramIndex = 2

    // Add type filter if provided and not "All"
    if (type && type !== "All") {
      queryText += ` AND s.shipmenttype = $${paramIndex}`
      queryParams.push(type)
      paramIndex++
    }

    // Handle date filtering - with separate conditions for year and month
    if (year) {
      queryText += ` AND EXTRACT(YEAR FROM m1.pickupdate) = $${paramIndex}`
      queryParams.push(year)
      paramIndex++
    }
    
    if (month) {
      queryText += ` AND EXTRACT(MONTH FROM m1.pickupdate) = $${paramIndex}`
      queryParams.push(month)
      paramIndex++
    }

    // Order by pickup date descending (newest first)
    queryText += ` ORDER BY m1.pickupdate DESC`

    console.log("Executing query:", queryText, "with params:", queryParams)

    const result = await query(queryText, queryParams)
    console.log(`Query returned ${result.rows.length} instructions for client ${clientId}`)

    // Process the results to format dates and add additional information
    const formattedResults = result.rows.map(row => ({
      ...row,
      pickupdate: row.pickupdate ? new Date(row.pickupdate).toISOString().split('T')[0] : null,
      invoice_date: row.invoice_date ? new Date(row.invoice_date).toISOString().split('T')[0] : null,
      has_invoice: !!row.ikey,
      has_statement: !!row.statement_id,
      total_cost: parseFloat(row.total_cost || 0).toFixed(2)
    }))

    res.json({
      success: true,
      data: formattedResults,
    })
  } catch (error) {
    console.error(`Error fetching instructions for client ${req.params.clientId}:`, error)
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    })
  }
})




// Add a catch-all route for debugging
app.use((req, res, next) => {
  console.log(`Unhandled request: ${req.method} ${req.url}`)
  next()
})

// Start the server
async function startServer() {
  await connectDb()
  types.setTypeParser(types.builtins.NUMERIC, (value) => parseFloat(value));
  types.setTypeParser(types.builtins.FLOAT8, (value) => parseFloat(value));
  await generateMonthlyStatements()
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`)
    console.log(`API available at http://localhost:${PORT}/api/health`)
  })
}

startServer().catch((err) => {
  console.error("Failed to start server:", err)
})

export default app

