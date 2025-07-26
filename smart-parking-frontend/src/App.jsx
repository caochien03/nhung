import React, { useState, useEffect } from "react";
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
                    title="CAMERA VÀO"
                    cameraIndex={1}
                    onPlateDetected={setCameraInPlate}
                />
            </div>
            <div className="column">
                <CameraView
                    title="CAMERA RA"
                    cameraIndex={2}
                    onPlateDetected={setCameraOutPlate}
                />
            </div>
            <div className="column">
                <ParkingInfo
                    vehicleCount={vehicleCount}
                    lastIn={lastIn}
                    lastOut={lastOut}
                    parkingDuration={parkingDuration}
                    totalMoney={totalMoney}
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
