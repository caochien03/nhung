const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const parkingRoutes = require("./routes/parking");
const connectDB = require("./config/db");

const app = express();
const PORT = 8080;

// Middleware
app.use(
    cors({
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);
app.use(bodyParser.json({ limit: "10mb" }));

// Routes
app.use("/api/parking", parkingRoutes);

// Route test server
app.get("/", (req, res) => {
    res.send("Server is running!");
});

// Kết nối MongoDB
connectDB();

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
