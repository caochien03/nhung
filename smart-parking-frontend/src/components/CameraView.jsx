import React, {
    useRef,
    useEffect,
    useState,
    forwardRef,
    useImperativeHandle,
} from "react";

const CameraView = forwardRef(function CameraView(
    { title, cameraIndex = 0, onPlateDetected },
    ref
) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [licensePlate, setLicensePlate] = useState("[Biển số]");
    const [isLoading, setIsLoading] = useState(false);
    const [cameras, setCameras] = useState([]);
    const [selectedCamera, setSelectedCamera] = useState(null);
    const [error, setError] = useState("");

    // Liệt kê tất cả camera
    useEffect(() => {
        const listCameras = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(
                    (device) => device.kind === "videoinput"
                );
                setCameras(videoDevices);

                // Chọn camera theo index
                if (videoDevices[cameraIndex]) {
                    setSelectedCamera(videoDevices[cameraIndex]);
                } else if (videoDevices.length > 0) {
                    setSelectedCamera(videoDevices[0]);
                }
            } catch (err) {
                console.error("Lỗi khi liệt kê camera:", err);
                setError("Không thể liệt kê camera");
            }
        };

        listCameras();
    }, [cameraIndex]);

    // Khởi động camera
    useEffect(() => {
        if (!selectedCamera) return;

        const startCamera = async () => {
            try {
                setError("");
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        deviceId: { exact: selectedCamera.deviceId },
                    },
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Lỗi khi truy cập camera:", err);
                setError(
                    `Không thể truy cập camera: ${
                        selectedCamera.label || `Camera ${cameraIndex}`
                    }`
                );
            }
        };

        startCamera();
    }, [selectedCamera, cameraIndex]);

    const handleCameraChange = (deviceId) => {
        const camera = cameras.find((cam) => cam.deviceId === deviceId);
        setSelectedCamera(camera);
    };

    const captureImage = () => {
        if (videoRef.current && canvasRef.current) {
            const canvas = canvasRef.current;
            const context = canvas.getContext("2d");
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            context.drawImage(videoRef.current, 0, 0);

            // Chuyển ảnh thành base64 và gửi lên backend
            const imageData = canvas.toDataURL("image/jpeg");
            sendToBackend(imageData);
        }
    };

    // Hàm tự động chụp ảnh khi nhận signal WebSocket
    const autoCaptureFromWS = async (uid, cameraIndex) => {
        if (videoRef.current && canvasRef.current) {
            const canvas = canvasRef.current;
            const context = canvas.getContext("2d");
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            context.drawImage(videoRef.current, 0, 0);
            const imageData = canvas.toDataURL("image/jpeg");
            setIsLoading(true);
            try {
                // Gửi ảnh + UID lên backend
                const response = await fetch(
                    "http://localhost:8080/api/esp32/auto-capture",
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            uid,
                            cameraIndex,
                            imageData,
                        }),
                    }
                );
                const result = await response.json();

                // Xử lý các loại response khác nhau
                if (result.action === "OUT_SECURITY_ALERT") {
                    // Cảnh báo bảo mật - biển số không khớp
                    setLicensePlate(
                        `🚨 CẢNH BÁO: Biển số không khớp!\n` +
                            `Vào: ${result.entryPlate}\n` +
                            `Ra: ${result.exitPlate}\n` +
                            `Độ giống: ${result.similarity}`
                    );
                } else if (result.action === "OUT") {
                    // Xe ra thành công - hiển thị thông tin tính tiền
                    setLicensePlate(
                        `✅ Xe ra thành công!\n` +
                            `Biển số: ${result.exitPlate}\n` +
                            `Thời gian đỗ: ${result.parkingDuration}\n` +
                            `Tính phí theo: ${result.billingHours}\n` +
                            `Phí: ${result.fee}`
                    );
                } else if (result.action === "OUT_ERROR") {
                    // Không tìm thấy record vào
                    setLicensePlate(
                        `❌ Lỗi: ${result.error}\n` +
                            `Biển số: ${
                                result.licensePlate || "Không nhận diện được"
                            }`
                    );
                } else {
                    // Xe vào hoặc trường hợp khác
                    setLicensePlate(
                        result.licensePlate ||
                            result.exitPlate ||
                            "Không nhận diện được"
                    );
                }

                // Gọi callback để cập nhật App.jsx nếu có
                if (onPlateDetected) {
                    // Chỉ gửi object cho camera RA (cameraIndex = 2), camera VÀO vẫn gửi string
                    if (cameraIndex === 2) {
                        // Camera RA - gửi object để tách thông tin
                        let callbackData = {};
                        if (result.action === "OUT_SECURITY_ALERT") {
                            callbackData = {
                                licensePlate: result.exitPlate,
                                status: "🚨 CẢNH BÁO: Biển số không khớp!",
                                details: `Vào: ${result.entryPlate} | Ra: ${result.exitPlate} | Độ giống: ${result.similarity}`,
                                parkingDuration: null,
                                fee: null,
                            };
                        } else if (result.action === "OUT") {
                            callbackData = {
                                licensePlate: result.exitPlate,
                                status: "✅ Xe ra thành công!",
                                details: `Tính phí theo: ${result.billingHours}`,
                                parkingDuration: result.parkingDuration,
                                fee: result.fee,
                            };
                        } else if (result.action === "OUT_ERROR") {
                            callbackData = {
                                licensePlate:
                                    result.licensePlate ||
                                    "Không nhận diện được",
                                status: "❌ Lỗi: " + result.error,
                                details: null,
                                parkingDuration: null,
                                fee: null,
                            };
                        } else {
                            callbackData = {
                                licensePlate:
                                    result.licensePlate ||
                                    result.exitPlate ||
                                    "",
                                status: null,
                                details: null,
                                parkingDuration: null,
                                fee: null,
                            };
                        }
                        onPlateDetected(callbackData);
                    } else {
                        // Camera VÀO - gửi string như cũ
                        onPlateDetected(
                            result.licensePlate || result.exitPlate || ""
                        );
                    }
                }
            } catch {
                setLicensePlate("Lỗi gửi tự động!");
            } finally {
                setIsLoading(false);
            }
        }
    };

    useImperativeHandle(ref, () => ({
        autoCaptureFromWS,
    }));

    const sendToBackend = async (imageData) => {
        setIsLoading(true);
        try {
            // Chỉ gửi ảnh để nhận diện, không lưu DB
            const response = await fetch("http://localhost:8080/api/parking", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image: imageData }),
            });
            const result = await response.json();
            const detectedPlate = result.licensePlate || "Không nhận diện được";
            setLicensePlate(detectedPlate);
            // Truyền biển số lên component cha
            if (onPlateDetected) {
                onPlateDetected(detectedPlate);
            }
        } catch (err) {
            console.error("Lỗi khi gửi ảnh:", err);
            setLicensePlate("Lỗi kết nối");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            style={{ border: "1px solid #ccc", padding: 12, marginBottom: 16 }}
        >
            <h3 style={{ textAlign: "center" }}>{title}</h3>

            {/* Dropdown chọn camera */}
            {cameras.length > 1 && (
                <select
                    value={selectedCamera?.deviceId || ""}
                    onChange={(e) => handleCameraChange(e.target.value)}
                    style={{
                        width: "100%",
                        marginBottom: 8,
                        padding: 4,
                        border: "1px solid #ccc",
                        borderRadius: 4,
                    }}
                >
                    {cameras.map((camera, index) => (
                        <option key={camera.deviceId} value={camera.deviceId}>
                            {camera.label || `Camera ${index}`}
                        </option>
                    ))}
                </select>
            )}

            {/* Hiển thị lỗi */}
            {error && (
                <div
                    style={{
                        color: "red",
                        fontSize: 12,
                        marginBottom: 8,
                        textAlign: "center",
                        background: "#ffe6e6",
                        padding: 4,
                        borderRadius: 4,
                    }}
                >
                    {error}
                </div>
            )}

            <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{ width: "100%", height: 180, background: "#000" }}
            />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            <button
                onClick={captureImage}
                disabled={isLoading || !!error}
                style={{
                    width: "100%",
                    marginTop: 8,
                    padding: 8,
                    background: isLoading || error ? "#ccc" : "#007bff",
                    color: "white",
                    border: "none",
                    borderRadius: 4,
                    cursor: isLoading || error ? "not-allowed" : "pointer",
                }}
            >
                {isLoading ? "Đang xử lý..." : "Chụp ảnh"}
            </button>
            <div
                style={{
                    minHeight: 60,
                    border: "1px solid #aaa",
                    background: "#fff",
                    textAlign: "center",
                    padding: "8px",
                    fontSize: "14px",
                    whiteSpace: "pre-line", // Cho phép xuống dòng với \n
                    lineHeight: "1.4",
                }}
            >
                <span style={{ color: "#333" }}>{licensePlate}</span>
            </div>
        </div>
    );
});

export default CameraView;
