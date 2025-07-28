const WebSocket = require("ws");
const esp32Controller = require("./controllers/esp32Controller");

function setupWebSocket(server) {
    const wss = new WebSocket.Server({ server });
    const clients = [];

    wss.on("connection", (ws) => {
        clients.push(ws);
        esp32Controller.setWsClients(clients);

        ws.on("close", () => {
            const idx = clients.indexOf(ws);
            if (idx !== -1) clients.splice(idx, 1);
        });
    });

    console.log("WebSocket server started");
    return wss;
}

module.exports = setupWebSocket;
