const { spawn } = require("child_process");
const path = require("path");

async function recognizePlate(base64Image) {
    return new Promise((resolve, reject) => {
        const python = spawn("python3", [
            path.join(__dirname, "../recognize_plate_paddle_optimized.py"),
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
            const result = plate.trim();
            // Tách kết quả và thời gian xử lý
            const parts = result.split("|");
            const plateText = parts[0] || "";
            const processingTime = parts[1] || "0ms";

            console.log(`Processing time (optimized): ${processingTime}`);
            resolve(plateText);
        });
        python.stdin.write(imgBuffer);
        python.stdin.end();
    });
}

module.exports = recognizePlate;
