const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const parkingRoutes = require("./routes/parking");
const esp32Routes = require("./routes/esp32Routes");
const connectDB = require("./config/db");
const http = require("http");
const setupWebSocket = require("./websocket");

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
app.use("/api/esp32", esp32Routes);

// Route test server
app.get("/", (req, res) => {
    res.send("Server is running!");
});

// Kết nối MongoDB
connectDB();

// Tạo http server và websocket
const server = http.createServer(app);
setupWebSocket(server);

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
