import React, { useState, useEffect, useRef } from "react";
import CameraView from "./components/CameraView";
import ParkingInfo from "./components/ParkingInfo";
import ControlPanel from "./components/ControlPanel";
import "./App.css";

function App() {
    const [vehicleCount, setVehicleCount] = useState(0);
    const [lastIn, setLastIn] = useState("");
    const [lastOut, setLastOut] = useState("");
    const [parkingDuration, setParkingDuration] = useState("");
    const [totalMoney, setTotalMoney] = useState(0);
    const [mode, setMode] = useState("auto");
    const [cameraInPlate, setCameraInPlate] = useState("[Biển số]");
    const [cameraOutPlate, setCameraOutPlate] = useState("[Biển số]");

    // State mới để lưu thông tin tách biệt
    const [exitStatus, setExitStatus] = useState("");
    const [exitDetails, setExitDetails] = useState("");
    const [currentParkingDuration, setCurrentParkingDuration] = useState("");
    const [currentFee, setCurrentFee] = useState("");

    // Hàm xử lý callback từ camera RA
    const handleCameraOutData = (data) => {
        if (typeof data === "object" && data !== null) {
            // Dữ liệu mới (object)
            setCameraOutPlate(data.licensePlate || "[Biển số]");
            setExitStatus(data.status || "");
            setExitDetails(data.details || "");
            setCurrentParkingDuration(data.parkingDuration || "");
            setCurrentFee(data.fee || "");

            // Cập nhật dòng RA real-time với thông tin đầy đủ
            if (data.status && data.status.includes("✅")) {
                // Xe ra thành công - cập nhật thông tin đầy đủ
                setLastOut(
                    data.exitInfo ||
                        `${data.licensePlate} - ${
                            data.timeOutFormatted ||
                            new Date().toLocaleTimeString("vi-VN", {
                                hour12: false,
                            })
                        }`
                );

                // Cập nhật dòng VÀO với thông tin từ backend nếu có
                if (data.entryInfo) {
                    setLastIn(data.entryInfo);
                }

                // Cập nhật tổng tiền
                if (data.feeNumber) {
                    setTotalMoney((prev) => prev + data.feeNumber);
                } else if (data.fee) {
                    const feeNumber =
                        parseInt(data.fee.replace(/[^\d]/g, "")) || 0;
                    setTotalMoney((prev) => prev + feeNumber);
                }
            } else if (data.status) {
                // Có trạng thái khác (cảnh báo, lỗi)
                const timeStr =
                    data.timeOutFormatted ||
                    new Date().toLocaleTimeString("vi-VN", { hour12: false });
                setLastOut(
                    `${data.licensePlate} - ${timeStr} (${data.status
                        .substring(2)
                        .trim()})`
                );

                // Vẫn cập nhật thông tin vào nếu có
                if (data.entryInfo) {
                    setLastIn(data.entryInfo);
                }
            }
        } else {
            // Dữ liệu cũ (string) - để tương thích
            setCameraOutPlate(data || "[Biển số]");
        }
    };

    // Hàm xử lý callback từ camera VÀO
    const handleCameraInData = (data) => {
        if (typeof data === "string") {
            setCameraInPlate(data || "[Biển số]");

            // Cập nhật dòng VÀO real-time
            if (data && data !== "[Biển số]" && data !== "") {
                const now = new Date();
                const timeStr = now.toLocaleTimeString("vi-VN", {
                    hour12: false,
                });
                setLastIn(`${data} - ${timeStr}`);

                // Tăng số xe
                setVehicleCount((prev) => prev + 1);
            }
        }
    };

    // Tham chiếu tới CameraView để gọi hàm chụp ảnh tự động
    const cameraInRef = useRef();
    const cameraOutRef = useRef();

    // WebSocket tự động chụp ảnh khi nhận signal
    useEffect(() => {
        const ws = new window.WebSocket("ws://localhost:8080"); // Đổi thành localhost
        ws.onopen = () => {
            console.log("WebSocket connected");
        };
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === "auto_capture") {
                // Chọn camera phù hợp
                if (data.cameraIndex === 1 && cameraInRef.current) {
                    cameraInRef.current.autoCaptureFromWS(
                        data.uid,
                        data.cameraIndex
                    );
                } else if (data.cameraIndex === 2 && cameraOutRef.current) {
                    cameraOutRef.current.autoCaptureFromWS(
                        data.uid,
                        data.cameraIndex
                    );
                }
            }
        };
        ws.onclose = () => {
            console.log("WebSocket disconnected");
        };
        return () => ws.close();
    }, []);

    // Load dữ liệu ban đầu từ backend
    useEffect(() => {
        loadParkingData();
    }, []);

    const loadParkingData = async () => {
        try {
            const response = await fetch("http://localhost:8080/api/parking");
            const data = await response.json();

            // Tính toán số xe hiện tại (xe vào - xe ra)
            const currentVehicles = data.filter(
                (record) => !record.timeOut
            ).length;
            setVehicleCount(currentVehicles);

            // Lấy thông tin xe vào/ra gần nhất
            const sortedData = data.sort(
                (a, b) => new Date(b.timeIn) - new Date(a.timeIn)
            );
            if (sortedData.length > 0) {
                const latest = sortedData[0];
                if (latest.timeOut) {
                    setLastOut(
                        `${latest.licensePlate} - ${new Date(
                            latest.timeOut
                        ).toLocaleTimeString()}`
                    );
                    // Tính thời gian gửi xe
                    const timeIn = new Date(latest.timeIn);
                    const timeOut = new Date(latest.timeOut);
                    const duration = timeOut - timeIn;
                    const hours = Math.floor(duration / (1000 * 60 * 60));
                    const minutes = Math.floor(
                        (duration % (1000 * 60 * 60)) / (1000 * 60)
                    );
                    setParkingDuration(`${hours}h ${minutes}m`);
                } else {
                    setLastIn(
                        `${latest.licensePlate} - ${new Date(
                            latest.timeIn
                        ).toLocaleTimeString()}`
                    );
                    setParkingDuration(""); // Xóa thời gian gửi xe khi xe chưa ra
                }
            }

            // Tính tổng tiền
            const total = data.reduce(
                (sum, record) => sum + (record.fee || 0),
                0
            );
            setTotalMoney(total);
        } catch (error) {
            console.error("Lỗi khi tải dữ liệu:", error);
        }
    };

    const handleModeChange = (newMode) => {
        setMode(newMode);
    };

    const handleVehicleAction = async (action, manualPlate = "") => {
        const plate =
            manualPlate || (action === "in" ? cameraInPlate : cameraOutPlate);

        if (plate === "[Biển số]" && mode === "auto") {
            alert(
                "Chưa nhận diện được biển số! Vui lòng chuyển sang chế độ thủ công."
            );
            return;
        }

        try {
            const response = await fetch("http://localhost:8080/api/parking", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    licensePlate: plate,
                    action: action,
                    rfid: "", // Có thể thêm RFID sau
                }),
            });

            if (response.ok) {
                // Cập nhật thông tin hiển thị
                const now = new Date().toLocaleTimeString();
                if (action === "in") {
                    setLastIn(`${plate} - ${now}`);
                    setVehicleCount((prev) => prev + 1);
                    setParkingDuration(""); // Xóa thời gian gửi xe khi xe vào
                } else {
                    setLastOut(`${plate} - ${now}`);
                    setVehicleCount((prev) => Math.max(0, prev - 1));

                    // Tính thời gian gửi xe cho xe vừa ra
                    // Tìm thời gian vào của xe này
                    const response = await fetch(
                        "http://localhost:8080/api/parking"
                    );
                    const data = await response.json();
                    const vehicleRecord = data.find(
                        (record) =>
                            record.licensePlate === plate && record.timeOut
                    );
                    if (vehicleRecord) {
                        const timeIn = new Date(vehicleRecord.timeIn);
                        const timeOut = new Date(vehicleRecord.timeOut);
                        const duration = timeOut - timeIn;
                        const hours = Math.floor(duration / (1000 * 60 * 60));
                        const minutes = Math.floor(
                            (duration % (1000 * 60 * 60)) / (1000 * 60)
                        );
                        setParkingDuration(`${hours}h ${minutes}m`);
                    }
                }

                // Reload dữ liệu để cập nhật tiền
                setTimeout(loadParkingData, 1000);

                alert(
                    `Xe ${plate} đã ${
                        action === "in" ? "vào" : "ra"
                    } thành công!`
                );
            } else {
                alert("Có lỗi xảy ra!");
            }
        } catch (error) {
            console.error("Lỗi khi gửi dữ liệu:", error);
            alert("Lỗi kết nối server!");
        }
    };

    const handleExit = () => {
        setVehicleCount(0);
        setLastIn("");
        setLastOut("");
        setParkingDuration("");
        setTotalMoney(0);
        setCameraInPlate("[Biển số]");
        setCameraOutPlate("[Biển số]");
        alert("Đã reset hệ thống!");
    };

    return (
        <div className="container">
            <div className="column">
                <CameraView
                    ref={cameraInRef}
                    title="CAMERA VÀO"
                    cameraIndex={1}
                    onPlateDetected={handleCameraInData}
                />
            </div>
            <div className="column">
                <CameraView
                    ref={cameraOutRef}
                    title="CAMERA RA"
                    cameraIndex={2}
                    onPlateDetected={handleCameraOutData}
                />
            </div>
            <div className="column">
                <ParkingInfo
                    vehicleCount={vehicleCount}
                    lastIn={lastIn}
                    lastOut={lastOut}
                    parkingDuration={parkingDuration}
                    totalMoney={totalMoney}
                    cameraInPlate={cameraInPlate}
                    cameraOutPlate={cameraOutPlate}
                    exitStatus={exitStatus}
                    exitDetails={exitDetails}
                    currentParkingDuration={currentParkingDuration}
                    currentFee={currentFee}
                />
                <ControlPanel
                    onModeChange={handleModeChange}
                    onVehicleAction={handleVehicleAction}
                    onExit={handleExit}
                />
            </div>
        </div>
    );
}

export default App;
