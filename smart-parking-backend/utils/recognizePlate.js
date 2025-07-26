const { spawn } = require("child_process");
const path = require("path");

async function recognizePlate(base64Image) {
    return new Promise((resolve, reject) => {
        const python = spawn("python3", [
            path.join(__dirname, "../recognize_plate.py"),
        ]);
        // Loại bỏ tiền tố data:image/jpeg;base64,
        const imgBuffer = Buffer.from(base64Image.split(",")[1], "base64");
        let plate = "";
        python.stdout.on("data", (data) => {
            plate += data.toString();
        });
        python.stderr.on("data", (data) => {
            console.error(`stderr: ${data}`);
        });
        python.on("close", (code) => {
            resolve(plate.trim());
        });
        python.stdin.write(imgBuffer);
        python.stdin.end();
    });
}

module.exports = recognizePlate;
