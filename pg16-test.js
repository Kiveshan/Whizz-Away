// Load environment variables
require("dotenv").config()

// Import the pg module
const { Client } = require("pg")

console.log("Testing PostgreSQL 16 connection...")
console.log("Connection parameters:", {
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  port: process.env.POSTGRES_PORT,
})

// Create a new client with explicit PostgreSQL 16 settings
const client = new Client({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT,
  // Add specific settings for PostgreSQL 16
  ssl: false,
  keepAlive: true,
  connectionTimeoutMillis: 10000,
})

// Connect to the database
client
  .connect()
  .then(() => {
    console.log("Connected to PostgreSQL 16 successfully!")
    return client.query("SELECT version()")
  })
  .then((res) => {
    console.log("PostgreSQL version:", res.rows[0].version)
    return client.end()
  })
  .then(() => {
    console.log("Connection closed successfully")
  })
  .catch((err) => {
    console.error("Error connecting to PostgreSQL 16:", err.message)
    console.log("\nPOSTGRESQL 16 TROUBLESHOOTING STEPS:")
    console.log("1. Verify PostgreSQL 16 service is running:")
    console.log('   - Windows: Check Services for "postgresql-x64-16" service')
    console.log('   - Run: pg_ctl status -D "C:\\Program Files\\PostgreSQL\\16\\data"')
    console.log("2. Check if PostgreSQL 16 is listening on port 5432:")
    console.log("   - Run: netstat -an | findstr 5432")
    console.log("3. Try connecting with psql command:")
    console.log('   - Run: "C:\\Program Files\\PostgreSQL\\16\\bin\\psql" -U postgres -h 127.0.0.1')
    console.log("4. Check if the database exists:")
    console.log(
      '   - Run: "C:\\Program Files\\PostgreSQL\\16\\bin\\psql" -U postgres -c "SELECT datname FROM pg_database;"',
    )
    console.log("5. Create the database if it doesn't exist:")
    console.log(
      '   - Run: "C:\\Program Files\\PostgreSQL\\16\\bin\\psql" -U postgres -c "CREATE DATABASE \\"whiz-away-21-03-2025\\";"',
    )
  })

