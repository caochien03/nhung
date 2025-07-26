import React, { useRef, useEffect, useState } from "react";

function CameraView({ title, cameraIndex = 0, onPlateDetected }) {
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
                    minHeight: 32,
                    border: "1px solid #aaa",
                    background: "#fff",
                    textAlign: "center",
                    lineHeight: "32px",
                }}
            >
                <span style={{ color: "#333" }}>{licensePlate}</span>
            </div>
        </div>
    );
}

export default CameraView;
