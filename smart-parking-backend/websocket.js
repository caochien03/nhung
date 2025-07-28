const WebSocket = require("ws");

function setupWebSocket(server) {
    const wss = new WebSocket.Server({ server });

    console.log("WebSocket server started");

    wss.on("connection", (ws) => {
        console.log("Client connected to WebSocket");

        ws.on("message", (message) => {
            try {
                const data = JSON.parse(message);
                console.log("Received WebSocket message:", data);

                // Broadcast message to all connected clients
                wss.clients.forEach((client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(
                            JSON.stringify({
                                type: "auto_capture",
                                cameraIndex: data.cameraIndex,
                                uid: data.uid,
                            })
                        );
                    }
                });
            } catch (error) {
                console.error("Error parsing WebSocket message:", error);
            }
        });

        ws.on("close", () => {
            console.log("Client disconnected from WebSocket");
        });
    });

    return wss;
}

module.exports = setupWebSocket;
