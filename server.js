import cors from "cors";
import express from "express";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = 5000;

app.use(cors({ credentials: true, origin: "http://localhost:3000" }));
app.use(express.json());

const pool = new pg.Pool({
    user: "postgres",
    host: "localhost",
    database: "Transport",
    password: "123456",
    port: 5432,
});

// Function to test database connection
async function connectDb() {
    try {
        const client = await pool.connect(); // Get a client from the pool
        console.log("✅ Database Connected Successfully");
        client.release(); // Release the client back to the pool
    } catch (error) {
        console.error("❌ Failed to connect to the database:", error);
        process.exit(1); // Exit if the database connection fails
    }
}

// Define routes
app.get('/api/driver-rate', async (req, res) => {
    const { startingPoint, destination } = req.query;

    try {
        const result = await pool.query(
            'SELECT rate FROM m5_driver_rate WHERE LOWER(startingpoint) = LOWER($1) AND LOWER(destination) = LOWER($2)',
            [startingPoint, destination]
        );

        if (result.rows.length > 0) {
            res.json({ rate: result.rows[0].rate });
        } else {
            res.status(404).json({ message: 'Rate not found' });
        }
    } catch (error) {
        console.error('Error executing query', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Start the server after ensuring the DB connection works
connectDb().then(() => {
    app.listen(port, () => {
        console.log(`🚀 Server running on port ${port}`);
    });
}).catch(error => {
    console.error("❌ Server startup failed due to DB connection issue:", error);
});
