const axios = require("axios");

async function recognizePlate(base64Image) {
    try {
        const response = await axios.post(
            "http://localhost:8000/recognize",
            {
                image: base64Image,
            },
            {
                timeout: 10000, // 10 giây timeout
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );

        if (response.data.success) {
            console.log(
                `Processing time (FastAPI): ${response.data.processingTime}`
            );
            console.log("Debug info:", response.data.debug);
            return response.data.licensePlate;
        } else {
            console.error("OCR Service error:", response.data.error);
            return "Lỗi xử lý";
        }
    } catch (error) {
        if (error.code === "ECONNREFUSED") {
            console.error(
                "Không thể kết nối đến OCR Service. Hãy chạy: python3 ocr_service.py"
            );
            return "Lỗi kết nối OCR Service";
        } else if (error.code === "ECONNABORTED") {
            console.error("OCR Service timeout");
            return "Timeout";
        } else {
            console.error("Error calling OCR service:", error.message);
            return "Lỗi kết nối";
        }
    }
}

module.exports = recognizePlate;
